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
    let botActionPending = false;
    let matchmakingPending = false;

    const BOT_DECISION_MIN_DELAY_MS = 3600;
    const BOT_DECISION_RANDOM_DELAY_MS = 1200;
    const MATCHMAKING_TICK_MS = 650;

    function redirectToLobby(message) {
        if (message) sessionStorage.setItem('lobbyError', message);
        root.location.href = new URL('lobby.html', document.baseURI).href;
    }

    function navigateToRankedView(destination) {
        const targetUrl = new URL(destination, document.baseURI);
        targetUrl.searchParams.set('room', roomCode);
        root.location.href = targetUrl.href;
    }

    function redirectIfWrongView(state) {
        const shouldBeWaiting = state?.status === Rules.PHASES.WAITING;
        if (shouldBeWaiting && viewMode !== 'waiting') {
            navigateToRankedView('ranked/ranked-waiting.html');
            return true;
        }
        if (!shouldBeWaiting && viewMode === 'waiting') {
            navigateToRankedView('ranked/ranked.html');
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
        if (!rankedStateRef) return Promise.reject(new Error('Partida ainda não conectada.'));
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
            if (!result.committed) throw new Error('A ação não foi confirmada. Tente novamente.');
            return db.ref(`salas/${roomCode}/lastActivity`).set(Date.now());
        }).catch((error) => {
            if (!options.silent) {
                Renderer.showError(error.message || 'Não foi possível concluir a ação.');
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
        addAiPlayer: (options) => transaction((state) => Engine.addAiPlayer(state, options)),
        restartMatch,
        sendChat,
        leaveRoom
    };

    function joinRankedRoom(user) {
        const roomRef = db.ref(`salas/${roomCode}`);
        return roomRef.once('value').then((snapshot) => {
            if (!snapshot.exists()) throw new Error('A sala informada não existe.');
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
                if (!result.committed) throw new Error('Não foi possível entrar na partida ranqueada.');
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
                redirectToLobby('Você não faz mais parte desta sala ranqueada.');
                return;
            }
            if (redirectIfWrongView(rankedState)) return;
            Renderer.render(rankedState);
            Renderer.setConnectionStatus('Sincronizado');
            if (rankedState.status === Rules.PHASES.FINISHED) {
                persistRankedMatchResults(rankedState);
            }
        }, () => {
            Renderer.setConnectionStatus('Sem conexão', false);
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

        const resultKey = result.resultKey || `${roomCode}_${result.matchId || result.endedAt || now}`;

        if (countedRooms[resultKey] || (!result.matchId && countedRooms[roomCode])) {
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
        countedRooms[resultKey] = result.endedAt || now;

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
            resultKey: `${roomCode}_${state.matchId || state.finishedAt || now}`,
            committedBy: currentUser.uid,
            committedAt: now
        };

        statsCommitPending = true;
        db.ref(`rankedResults/${result.resultKey}`).transaction((current) => {
            return current || result;
        }).then((transactionResult) => {
            const savedResult = transactionResult.snapshot?.val?.() || result;
            return updateCurrentUserRankedStats(savedResult, now);
        }).catch((error) => {
            console.error('Erro ao persistir estatísticas ranqueadas:', error);
            return updateCurrentUserRankedStats(result, now).catch((statsError) => {
                console.error('Erro ao persistir estatísticas do jogador:', statsError);
            });
        }).finally(() => {
            statsCommitPending = false;
        });
    }

    function restartMatch() {
        return transaction((state) => Engine.restartMatch(state))
            .then(() => navigateToRankedView('ranked/ranked-waiting.html'))
            .catch(() => null);
    }

    function leaveRoom() {
        const finishNavigation = () => {
            presenceDisconnect?.cancel();
            root.location.href = new URL('lobby.html', document.baseURI).href;
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

    function getPersonality(player) {
        const personality = player?.personality || {};
        return {
            vengefulness: Math.max(0, Math.min(100, Number(personality.vengefulness ?? 50))) / 100,
            honesty: Math.max(0, Math.min(100, Number(personality.honesty ?? 50))) / 100,
            skepticism: Math.max(0, Math.min(100, Number(personality.skepticism ?? 50))) / 100
        };
    }

    function hiddenInfluences(player) {
        return (player?.influences || []).filter((card) => !card.revealed);
    }

    function hasRole(player, role) {
        return hiddenInfluences(player).some((card) => card.role === role);
    }

    function getKnownRoleCount(state, role) {
        const discarded = (state.discard || []).filter((card) => card.role === role).length;
        const revealed = Engine.getPlayers(state).reduce((total, player) => (
            total + (player.influences || []).filter((card) => card.revealed && card.role === role).length
        ), 0);
        return discarded + revealed;
    }

    function shouldClaimRole(player, role, multiplier = 1) {
        if (hasRole(player, role)) return Math.random() > 0.08;
        const { honesty } = getPersonality(player);
        const bluffChance = ((1 - honesty) ** 1.5) * 0.38 * multiplier;
        return Math.random() < bluffChance;
    }

    function getTargetScore(bot, target, purpose = 'default') {
        const { vengefulness, skepticism } = getPersonality(bot);
        const grudge = Number(bot.grudges?.[target.uid] || 0) * vengefulness * 4;
        const danger = hiddenInfluences(target).length * 3 + Number(target.coins || 0);
        const coinValue = purpose === 'steal' ? Number(target.coins || 0) * 3 : 0;
        const contessaRisk = purpose === 'assassinate' && skepticism < 0.5 ? -2 : 0;
        return danger + grudge + coinValue + contessaRisk + Math.random() * 2;
    }

    function chooseTarget(state, bot, purpose) {
        const candidates = Engine.getAlivePlayers(state).filter((player) => player.uid !== bot.uid);
        if (!candidates.length) return null;
        return candidates
            .map((target) => ({ target, score: getTargetScore(bot, target, purpose) }))
            .sort((left, right) => right.score - left.score)[0].target;
    }

    function chooseBotAction(state, bot) {
        const { ACTIONS, ROLES, SETTINGS } = Rules;
        const stealTarget = chooseTarget(state, bot, 'steal');
        const attackTarget = chooseTarget(state, bot, 'assassinate');

        if (bot.coins >= SETTINGS.mandatoryCoupCoins) {
            return { type: ACTIONS.COUP, targetUid: attackTarget?.uid || stealTarget?.uid || null };
        }

        if (bot.coins >= 7 && attackTarget && Math.random() < 0.48) {
            return { type: ACTIONS.COUP, targetUid: attackTarget.uid };
        }

        if (shouldClaimRole(bot, ROLES.DUKE, 1.2)) return { type: ACTIONS.TAX, targetUid: null };

        if (stealTarget?.coins > 0 && shouldClaimRole(bot, ROLES.CAPTAIN)) {
            return { type: ACTIONS.STEAL, targetUid: stealTarget.uid };
        }

        if (bot.coins >= 3 && attackTarget && shouldClaimRole(bot, ROLES.ASSASSIN, 0.85)) {
            return { type: ACTIONS.ASSASSINATE, targetUid: attackTarget.uid };
        }

        if (shouldClaimRole(bot, ROLES.INQUISITOR, 0.7) && attackTarget && Math.random() < 0.45) {
            return { type: ACTIONS.EXAMINE, targetUid: attackTarget.uid };
        }

        if (shouldClaimRole(bot, ROLES.AMBASSADOR, 0.7)) {
            return { type: ACTIONS.EXCHANGE_AMBASSADOR, targetUid: null };
        }

        if (shouldClaimRole(bot, ROLES.INQUISITOR, 0.55)) {
            return { type: ACTIONS.EXCHANGE_INQUISITOR, targetUid: null };
        }

        const knownDukes = getKnownRoleCount(state, ROLES.DUKE);
        const { skepticism } = getPersonality(bot);
        if (knownDukes >= Rules.SETTINGS.cardsPerRole || Math.random() > (0.32 + skepticism * 0.22)) {
            return { type: ACTIONS.FOREIGN_AID, targetUid: null };
        }

        return { type: ACTIONS.INCOME, targetUid: null };
    }

    function shouldChallengeClaim(state, bot, claim, actorUid, isSelfTarget = false) {
        if (!claim || !actorUid) return false;
        if (getKnownRoleCount(state, claim) >= Rules.SETTINGS.cardsPerRole) return true;
        const { skepticism } = getPersonality(bot);
        const actor = Engine.getPlayer(state, actorUid);
        const grudge = Number(bot.grudges?.[actorUid] || 0) * 0.025;
        const pressure = isSelfTarget ? 0.28 : 0.08;
        const actorIsRich = actor?.coins >= Rules.SETTINGS.mandatoryCoupCoins ? -0.08 : 0;
        const chance = (skepticism ** 2) * 0.42 + pressure + grudge + actorIsRich;
        return Math.random() < Math.max(0.02, Math.min(0.82, chance));
    }

    function chooseBotBlockClaim(state, bot) {
        const claims = Engine.getBlockClaimsForPlayer(state, bot.uid);
        if (!claims.length) return null;
        const owned = claims.find((role) => hasRole(bot, role));
        if (owned && Math.random() > 0.08) return owned;
        const { honesty } = getPersonality(bot);
        const bluffChance = ((1 - honesty) ** 1.5) * 0.28;
        return Math.random() < bluffChance ? claims[Math.floor(Math.random() * claims.length)] : null;
    }

    function chooseInfluenceToLose(player) {
        const roleValue = {
            [Rules.ROLES.AMBASSADOR]: 1,
            [Rules.ROLES.INQUISITOR]: 2,
            [Rules.ROLES.DUKE]: 3,
            [Rules.ROLES.CAPTAIN]: 4,
            [Rules.ROLES.ASSASSIN]: 4,
            [Rules.ROLES.CONTESSA]: 5
        };
        return hiddenInfluences(player)
            .map((card) => ({ card, value: roleValue[card.role] || 1 }))
            .sort((left, right) => left.value - right.value)[0]?.card || null;
    }

    function chooseExchangeCards(pending) {
        const roleValue = {
            [Rules.ROLES.CONTESSA]: 6,
            [Rules.ROLES.ASSASSIN]: 5,
            [Rules.ROLES.CAPTAIN]: 4,
            [Rules.ROLES.DUKE]: 4,
            [Rules.ROLES.INQUISITOR]: 3,
            [Rules.ROLES.AMBASSADOR]: 2
        };
        return (pending.options || [])
            .slice()
            .sort((left, right) => (roleValue[right.role] || 1) - (roleValue[left.role] || 1))
            .slice(0, pending.keepCount)
            .map((card) => card.id);
    }

    function applyNextBotDecision(state, now) {
        Engine.normalizeState(state);
        if (state.status !== 'active') return false;

        if (state.phase === Rules.PHASES.TURN) {
            const bot = Engine.getPlayer(state, Engine.getActiveUid(state));
            if (!bot?.ai || bot.eliminated) return false;
            const action = chooseBotAction(state, bot);
            if (!action?.type) return false;
            Engine.performAction(state, bot.uid, action.type, action.targetUid, now);
            return true;
        }

        if (state.phase === Rules.PHASES.RESPONSE) {
            const pending = state.pendingAction;
            const bots = Engine.getAlivePlayers(state).filter((player) => (
                player.ai && player.uid !== pending?.actorUid && !pending?.passes?.[player.uid]
            ));
            const bot = bots[0];
            if (!bot) return false;
            const blockClaim = chooseBotBlockClaim(state, bot);
            if (blockClaim) {
                Engine.declareBlock(state, bot.uid, blockClaim, now);
                return true;
            }
            const isSelfTarget = pending?.targetUid === bot.uid;
            if (pending?.claim && !pending.claimConfirmed && shouldChallengeClaim(state, bot, pending.claim, pending.actorUid, isSelfTarget)) {
                Engine.challengeAction(state, bot.uid, now);
                return true;
            }
            Engine.passResponse(state, bot.uid, now);
            return true;
        }

        if (state.phase === Rules.PHASES.BLOCK_CHALLENGE) {
            const pending = state.pendingAction;
            const blockerUid = pending?.block?.uid;
            const bots = Engine.getAlivePlayers(state).filter((player) => (
                player.ai && player.uid !== blockerUid && !pending?.passes?.[player.uid]
            ));
            const bot = bots[0];
            if (!bot) return false;
            if (shouldChallengeClaim(state, bot, pending.block.claim, blockerUid, pending.actorUid === bot.uid)) {
                Engine.challengeBlock(state, bot.uid, now);
            } else {
                Engine.passResponse(state, bot.uid, now);
            }
            return true;
        }

        if (state.phase === Rules.PHASES.INFLUENCE_LOSS) {
            const bot = Engine.getPlayer(state, state.pendingLoss?.playerUid);
            const card = bot?.ai ? chooseInfluenceToLose(bot) : null;
            if (!card) return false;
            Engine.loseInfluence(state, bot.uid, card.id, now);
            return true;
        }

        if (state.phase === Rules.PHASES.EXCHANGE) {
            const bot = Engine.getPlayer(state, state.pendingExchange?.playerUid);
            if (!bot?.ai) return false;
            Engine.completeExchange(state, bot.uid, chooseExchangeCards(state.pendingExchange), now);
            return true;
        }

        if (state.phase === Rules.PHASES.EXAMINE) {
            const bot = Engine.getPlayer(state, state.pendingExamine?.actorUid);
            if (!bot?.ai) return false;
            const { skepticism } = getPersonality(bot);
            const strongRole = [Rules.ROLES.ASSASSIN, Rules.ROLES.CAPTAIN, Rules.ROLES.DUKE].includes(state.pendingExamine.role);
            Engine.completeExamine(state, bot.uid, strongRole && Math.random() < 0.45 + skepticism * 0.35, now);
            return true;
        }

        return false;
    }

    function hasPendingBotDecision(state) {
        if (!state || state.status !== 'active') return false;
        if (state.phase === Rules.PHASES.TURN) return Boolean(Engine.getPlayer(state, Engine.getActiveUid(state))?.ai);
        if (state.phase === Rules.PHASES.RESPONSE) {
            const pending = state.pendingAction;
            return Engine.getAlivePlayers(state).some((player) => (
                player.ai && player.uid !== pending?.actorUid && !pending?.passes?.[player.uid]
            ));
        }
        if (state.phase === Rules.PHASES.BLOCK_CHALLENGE) {
            const pending = state.pendingAction;
            const blockerUid = pending?.block?.uid;
            return Engine.getAlivePlayers(state).some((player) => (
                player.ai && player.uid !== blockerUid && !pending?.passes?.[player.uid]
            ));
        }
        if (state.phase === Rules.PHASES.INFLUENCE_LOSS) return Boolean(Engine.getPlayer(state, state.pendingLoss?.playerUid)?.ai);
        if (state.phase === Rules.PHASES.EXCHANGE) return Boolean(Engine.getPlayer(state, state.pendingExchange?.playerUid)?.ai);
        if (state.phase === Rules.PHASES.EXAMINE) return Boolean(Engine.getPlayer(state, state.pendingExamine?.actorUid)?.ai);
        return false;
    }

    function startBotDriver() {
        root.setInterval(() => {
            if (!hasPendingBotDecision(rankedState) || botActionPending) return;
            botActionPending = true;
            root.setTimeout(() => {
                transaction((state) => {
                    if (!applyNextBotDecision(state, Date.now())) {
                        throw new Error('Nenhuma ação de IA pendente.');
                    }
                    return state;
                }, { silent: true }).catch(() => null).finally(() => {
                    botActionPending = false;
                });
            }, BOT_DECISION_MIN_DELAY_MS + Math.floor(Math.random() * BOT_DECISION_RANDOM_DELAY_MS));
        }, 900);
    }

    function startMatchmakingDriver() {
        root.setInterval(() => {
            if (viewMode !== 'waiting' || !rankedState || rankedState.status !== Rules.PHASES.WAITING || matchmakingPending) return;
            matchmakingPending = true;
            transaction((state) => {
                if (!Engine.advanceMatchmaking(state, Date.now())) {
                    throw new Error('Nenhum avanço de matchmaking pendente.');
                }
            }, { silent: true }).catch(() => null).finally(() => {
                matchmakingPending = false;
            });
        }, MATCHMAKING_TICK_MS);
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
            redirectToLobby('Código de sala ranqueada inválido.');
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
        startBotDriver();
        startMatchmakingDriver();
    }

    boot();
})(window);

