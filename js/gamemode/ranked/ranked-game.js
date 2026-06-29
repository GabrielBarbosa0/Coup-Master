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
        }, () => {
            Renderer.setConnectionStatus('Sem conexao', false);
        });

        db.ref(`salas/${roomCode}/chatMessages`).limitToLast(60).on('value', (snapshot) => {
            const messages = [];
            snapshot.forEach((child) => messages.push(child.val()));
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

