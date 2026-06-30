(function initializeRankedGame(root) {
    const Rules = root.CoupRankedRules;
    const Engine = root.CoupRankedEngine;
    const Renderer = root.CoupRankedRenderer;
    const params = new URLSearchParams(root.location.search);
    const roomCode = (params.get('room') || '').trim().toUpperCase();
    const viewMode = document.body?.dataset.rankView || 'game';

    let currentUser = null;
    let rankedState = null;
    let rankedStateRef = null;
    let presenceDisconnect = null;
    let deadlineAdvancePending = false;
    let statsCommitPending = false;

    function redirectToLobby(message) {
        if (message) sessionStorage.setItem('lobbyError', message);
        root.location.href = 'lobby.html';
    }

    function navigateToRankedView(destination) {
        root.location.href = `${destination}?room=${encodeURIComponent(roomCode)}`;
    }

    function redirectIfWrongView(state) {
        const shouldBeWaiting = state?.status === Rules.PHASES.WAITING;
        if (shouldBeWaiting && viewMode !== 'waiting') {
            navigateToRankedView('ranked-waiting.html');
            return true;
        }
        if (!shouldBeWaiting && viewMode === 'waiting') {
            navigateToRankedView('ranked.html');
            return true;
        }
        return false;
    }

    function getUserData(user) {
        return {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Jogador',
            photo: user.photoURL || 'assets/img/icons/ghost.svg'
        };
    }

    function transaction(mutator, options = {}) {
        if (!rankedStateRef) return Promise.reject(new Error('Partida ainda nao conectada.'));
        let mutationError = null;

        return rankedStateRef.transaction((current) => {
            mutationError = null;
            if (!current) return;
            try {
                Engine.normalizeState(current);
                mutator(current);
                current.updatedAt = Date.now();
                return current;
            } catch (error) {
                mutationError = error;
                return;
            }
        }).then((result) => {
            if (mutationError) throw mutationError;
            if (!result.committed) throw new Error('A acao nao foi confirmada. Tente novamente.');
            return db.ref(`salas/${roomCode}/lastActivity`).set(Date.now());
        }).catch((error) => {
            if (!options.silent) {
                Renderer.showError(error.message || 'Nao foi possivel concluir a acao.');
            }
            throw error;
        });
    }

    const controller = {
        toggleReady: () => transaction((state) => Engine.toggleReady(state, currentUser.uid)),
        performAction: (actionType, targetUid) => transaction((state) => Engine.performAction(state, currentUser.uid, actionType, targetUid)),
        passResponse: () => transaction((state) => Engine.passResponse(state, currentUser.uid)),
        challengeAction: () => transaction((state) => Engine.challengeAction(state, currentUser.uid)),
        declareBlock: (role) => transaction((state) => Engine.declareBlock(state, currentUser.uid, role)),
        challengeBlock: () => transaction((state) => Engine.challengeBlock(state, currentUser.uid)),
        loseInfluence: (cardId) => transaction((state) => Engine.loseInfluence(state, currentUser.uid, cardId)),
        completeExchange: (cardIds) => transaction((state) => Engine.completeExchange(state, currentUser.uid, cardIds)),
        completeExamine: (replace) => transaction((state) => Engine.completeExamine(state, currentUser.uid, replace)),
        sendChat,
        leaveRoom
    };

    function joinRankedRoom(user) {
        const roomRef = db.ref(`salas/${roomCode}`);
        return roomRef.once('value').then((snapshot) => {
            if (!snapshot.exists()) throw new Error('A sala informada nao existe.');
            const room = snapshot.val();
            if (!root.CoupGameModes.isRanked(root.CoupGameModes.fromRoom(room))) {
                throw new Error('Esta sala pertence ao modo casual.');
            }

            rankedStateRef = roomRef.child('rankedState');
            let joinError = null;
            return rankedStateRef.transaction((current) => {
                joinError = null;
                const state = current || Engine.createState();
                try {
                    Engine.joinPlayer(state, getUserData(user));
                    return state;
                } catch (error) {
                    joinError = error;
                    return;
                }
            }).then((result) => {
                if (joinError) throw joinError;
                if (!result.committed) throw new Error('Nao foi possivel entrar na partida ranqueada.');
                sessionStorage.setItem('currentRoomMode', root.CoupGameModes.RANKED);
                setupRealtimeListeners();
                setupPresence();
                db.ref(`salas/${roomCode}/lastActivity`).set(Date.now());
            });
        });
    }

    function setupRealtimeListeners() {
        rankedStateRef.on('value', (snapshot) => {
            rankedState = snapshot.val();
            if (!rankedState?.players?.[currentUser.uid]) {
                redirectToLobby('Voce nao faz mais parte desta sala ranqueada.');
                return;
            }
            if (redirectIfWrongView(rankedState)) return;
            Renderer.render(rankedState);
            Renderer.setConnectionStatus('Sincronizado');
            if (rankedState.status === Rules.PHASES.FINISHED) {
                persistRankedMatchResults(rankedState);
            }
        }, () => {
            Renderer.setConnectionStatus('Sem conexao', false);
        });

        db.ref(`salas/${roomCode}/chatMessages`).limitToLast(60).on('value', (snapshot) => {
            const messages = [];
            snapshot.forEach((child) => {
                const message = child.val();
                if (message?.text) messages.push({ ...message, id: message.id || child.key });
            });
            Renderer.renderChat(messages);
        });
    }

    function setupPresence() {
        const connectedRef = rankedStateRef.child(`players/${currentUser.uid}/connected`);
        presenceDisconnect = connectedRef.onDisconnect();
        presenceDisconnect.set(false);
        connectedRef.set(true);
    }

    function sendChat(text, quick = false) {
        const safeText = String(text || '').trim().slice(0, 180);
        if (!safeText) return Promise.resolve();
        return db.ref(`salas/${roomCode}/chatMessages`).push({
            uid: currentUser.uid,
            name: getUserData(currentUser).name,
            text: safeText,
            quick: Boolean(quick),
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).catch((error) => Renderer.showError(error.message));
    }

    function calculateWilsonLowerBound(wins, games) {
        if (!games) return 0;
        const z = 1.96;
        const ratio = wins / games;
        const denominator = 1 + ((z * z) / games);
        const center = ratio + ((z * z) / (2 * games));
        const margin = z * Math.sqrt((ratio * (1 - ratio) + ((z * z) / (4 * games))) / games);
        return Math.max(0, (center - margin) / denominator);
    }

    function normalizeRankedStats(current, player, result, now) {
        const previous = current && typeof current === 'object' ? current : {};
        const countedRooms = previous.countedRooms && typeof previous.countedRooms === 'object'
            ? { ...previous.countedRooms }
            : {};

        if (countedRooms[roomCode]) {
            return {
                ...previous,
                name: player.name || previous.name || 'Jogador',
                photo: player.photo || previous.photo || 'assets/img/icons/ghost.svg',
                updatedAt: now
            };
        }

        const match = player.matchStats || {};
        const matchScore = Number(player.performanceScore || 0);
        const hadPreviousGames = Number(previous.games || 0) > 0;
        const games = Number(previous.games || 0) + 1;
        const wins = Number(previous.wins || 0) + (player.won ? 1 : 0);
        const losses = Number(previous.losses || 0) + (player.won ? 0 : 1);
        const currentWinStreak = player.won ? Number(previous.currentWinStreak || 0) + 1 : 0;
        const bestWinStreak = Math.max(Number(previous.bestWinStreak || 0), currentWinStreak);
        const successfulChallenges = Number(previous.successfulChallenges || 0) + Number(match.successfulChallenges || 0);
        const challenges = Number(previous.challenges || 0) + Number(match.challenges || 0);
        const winRate = games ? wins / games : 0;
        const challengeAccuracy = challenges ? successfulChallenges / challenges : 0;
        const wilsonScore = calculateWilsonLowerBound(wins, games);
        countedRooms[roomCode] = result.endedAt || now;

        return {
            schemaVersion: 1,
            uid: player.uid,
            name: player.name || previous.name || 'Jogador',
            photo: player.photo || previous.photo || 'assets/img/icons/ghost.svg',
            games,
            wins,
            losses,
            winRate,
            currentWinStreak,
            bestWinStreak,
            rankScore: Math.round(wilsonScore * 1000),
            confidenceLowerBound: wilsonScore,
            performancePoints: Number(previous.performancePoints || 0) + matchScore,
            bestMatchScore: hadPreviousGames ? Math.max(Number(previous.bestMatchScore || 0), matchScore) : matchScore,
            worstMatchScore: hadPreviousGames ? Math.min(Number(previous.worstMatchScore || 0), matchScore) : matchScore,
            actions: Number(previous.actions || 0) + Number(match.actions || 0),
            bluffs: Number(previous.bluffs || 0) + Number(match.bluffs || 0),
            provenBluffs: Number(previous.provenBluffs || 0) + Number(match.provenBluffs || 0),
            blockedActions: Number(previous.blockedActions || 0) + Number(match.blockedActions || 0),
            honestGames: Number(previous.honestGames || 0) + (Number(match.bluffs || 0) === 0 ? 1 : 0),
            challenges,
            successfulChallenges,
            failedChallenges: Number(previous.failedChallenges || 0) + Number(match.failedChallenges || 0),
            challengeAccuracy,
            coups: Number(previous.coups || 0) + Number(match.coups || 0),
            assassinations: Number(previous.assassinations || 0) + Number(match.assassinations || 0),
            steals: Number(previous.steals || 0) + Number(match.steals || 0),
            coinsStolen: Number(previous.coinsStolen || 0) + Number(match.coinsStolen || 0),
            lastRoomCode: roomCode,
            lastMatchAt: result.endedAt || now,
            countedRooms,
            updatedAt: now
        };
    }

    function updatePlayerRankedStats(player, result, now) {
        return db.ref(`rankedStats/${player.uid}`).transaction((current) => (
            normalizeRankedStats(current, player, result, now)
        ));
    }

    function updateCurrentUserRankedStats(result, now) {
        const player = result?.players?.[currentUser.uid];
        if (!player) return Promise.resolve(null);
        return updatePlayerRankedStats(player, result, now);
    }

    function persistRankedMatchResults(state) {
        if (statsCommitPending || !state.winnerUid) return;

        const now = Date.now();
        const result = {
            ...Engine.buildMatchResults(state, now),
            roomCode,
            committedBy: currentUser.uid,
            committedAt: now
        };

        statsCommitPending = true;
        db.ref(`rankedResults/${roomCode}`).transaction((current) => {
            return current || result;
        }).then((transactionResult) => {
            const savedResult = transactionResult.snapshot?.val?.() || result;
            return updateCurrentUserRankedStats(savedResult, now);
        }).catch((error) => {
            console.error('Erro ao persistir estatisticas ranqueadas:', error);
            return updateCurrentUserRankedStats(result, now).catch((statsError) => {
                console.error('Erro ao persistir estatisticas do jogador:', statsError);
            });
        }).finally(() => {
            statsCommitPending = false;
        });
    }

    function leaveRoom() {
        const finishNavigation = () => {
            presenceDisconnect?.cancel();
            root.location.href = 'lobby.html';
        };

        if (!rankedStateRef || !rankedState || rankedState.status !== Rules.PHASES.WAITING) {
            if (rankedStateRef && currentUser) {
                rankedStateRef.child(`players/${currentUser.uid}/connected`).set(false).finally(finishNavigation);
            } else finishNavigation();
            return;
        }

        transaction((state) => Engine.leaveWaitingRoom(state, currentUser.uid))
            .then(finishNavigation)
            .catch(() => null);
    }

    function startTimers() {
        root.setInterval(() => {
            Renderer.updateClock(Date.now());
            if (!rankedState?.deadline || Date.now() < rankedState.deadline || deadlineAdvancePending) return;
            deadlineAdvancePending = true;
            transaction((state) => Engine.advanceExpired(state, Date.now()), { silent: true })
                .catch(() => null)
                .finally(() => {
                    deadlineAdvancePending = false;
                });
        }, 500);
    }

    function boot() {
        if (!roomCode || roomCode.length !== 4) {
            redirectToLobby('Codigo de sala ranqueada invalido.');
            return;
        }

        auth.onAuthStateChanged((user) => {
            if (!user) {
                root.location.href = 'login.html';
                return;
            }
            if (user.isAnonymous) {
                redirectToLobby('O modo ranqueado exige login com uma conta Google.');
                return;
            }

            currentUser = user;
            Renderer.init({ controller, currentUid: user.uid, roomCode });
            joinRankedRoom(user).catch((error) => redirectToLobby(error.message));
        });
        startTimers();
    }

    boot();
})(window);

