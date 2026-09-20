(function initializePersonalizedGame(root) {
    const Rules = root.CoupPersonalizedRules;
    const Engine = root.CoupPersonalizedEngine;
    const Renderer = root.CoupPersonalizedRenderer;
    const params = new URLSearchParams(root.location.search);
    const roomCode = (params.get('room') || '').trim().toUpperCase();
    const viewMode = document.body?.dataset.rankView || 'game';

    let currentUser = null;
    let personalizedState = null;
    let personalizedStateRef = null;
    let roomHostUid = null;
    let presenceDisconnect = null;
    let deadlineAdvancePending = false;
    let botActionPending = false;

    const BOT_DECISION_MIN_DELAY_MS = 3060;
    const BOT_DECISION_RANDOM_DELAY_MS = 1020;
    const BOT_RESPONSE_MIN_DELAY_MS = 1200;
    const BOT_RESPONSE_RANDOM_DELAY_MS = 1400;
    const BOT_RESPONSE_DEADLINE_BUFFER_MS = 650;

    function t(key, params = {}, fallback = '') {
        const translated = root.CoupLanguage?.t?.(key, params);
        return translated && translated !== key ? translated : fallback || key;
    }

    function redirectToLobby(message) {
        if (message) sessionStorage.setItem('lobbyError', message);
        root.location.href = new URL('lobby.html', document.baseURI).href;
    }

    function navigateToPersonalizedView(destination) {
        const targetUrl = new URL(destination, document.baseURI);
        targetUrl.searchParams.set('room', roomCode);
        root.location.href = targetUrl.href;
    }

    function redirectIfWrongView(state) {
        const shouldBeWaiting = state?.status === Rules.PHASES.WAITING;
        if (shouldBeWaiting && viewMode !== 'waiting') {
            navigateToPersonalizedView('personalized/personalized-waiting.html');
            return true;
        }
        if (!shouldBeWaiting && viewMode === 'waiting') {
            navigateToPersonalizedView('personalized/personalized.html');
            return true;
        }
        return false;
    }

    function getUserData(user) {
        return {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || t('ranked.playerFallback', {}, 'Jogador'),
            photo: user.photoURL || 'assets/img/icons/ghost.svg'
        };
    }

    function transaction(mutator, options = {}) {
        if (!personalizedStateRef) return Promise.reject(new Error(t('ranked.matchNotConnected', {}, 'Partida ainda não conectada.')));
        let mutationError = null;

        return personalizedStateRef.transaction((current) => {
            mutationError = null;
            if (!current) return;
            try {
                Engine.normalizeState(current);
                if (Date.now() < (current.revealPresentation?.endsAt || 0)) return;
                const revealSequence = Number(current.revealSequence) || 0;
                mutator(current);
                const reveals = (current.publicReveals || []).filter((event) => event.sequence > revealSequence);
                if (reveals.length) {
                    const timing = { durationMs: 1200, holdMs: 420, fadeInMs: 350, fadeOutMs: 450 };
                    const duration = reveals.length * (timing.durationMs + timing.holdMs + timing.fadeInMs + timing.fadeOutMs);
                    current.revealPresentation = {
                        timing,
                        id: `${current.matchId}:${current.revealSequence}`,
                        events: reveals,
                        endsAt: Date.now() + duration
                    };
                    if (current.deadline) current.deadline += duration;
                }
                current.updatedAt = Date.now();
                return current;
            } catch (error) {
                mutationError = error;
                return;
            }
        }, undefined, false).then((result) => {
            if (mutationError) throw mutationError;
            if (!result.committed) throw new Error(t('ranked.actionNotConfirmed', {}, 'A ação não foi confirmada. Tente novamente.'));
            return db.ref(`salas/${roomCode}/lastActivity`).set(Date.now());
        }).catch((error) => {
            if (!options.silent) {
                Renderer.showError(error.message || t('ranked.actionFailed', {}, 'Não foi possível concluir a ação.'));
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
        revealChallenge: (cardId) => transaction((state) => Engine.revealChallenge(state, currentUser.uid, cardId)),
        loseInfluence: (cardId) => transaction((state) => Engine.loseInfluence(state, currentUser.uid, cardId)),
        completeExchange: (cardIds) => transaction((state) => Engine.completeExchange(state, currentUser.uid, cardIds)),
        completeExamine: (replace) => transaction((state) => Engine.completeExamine(state, currentUser.uid, replace)),
        addAiPlayer: (options) => transaction((state) => Engine.addAiPlayer(state, options)),
        canRemovePlayer: (player) => Boolean(
            personalizedState?.status === Rules.PHASES.WAITING
            && roomHostUid
            && currentUser?.uid === roomHostUid
            && player?.uid
            && player.uid !== currentUser.uid
        ),
        removePlayer: (targetUid) => transaction((state) => (
            Engine.removeWaitingPlayer(state, currentUser.uid, targetUid, { hostUid: roomHostUid })
        )),
        restartMatch,
        sendChat,
        leaveRoom
    };

    function joinPersonalizedRoom(user) {
        const roomRef = db.ref(`salas/${roomCode}`);
        return roomRef.once('value').then((snapshot) => {
            if (!snapshot.exists()) throw new Error(t('ranked.roomDoesNotExist', {}, 'A sala informada não existe.'));
            const room = snapshot.val();
            if (!root.CoupGameModes.isPersonalized(root.CoupGameModes.fromRoom(room))) {
                throw new Error(t('personalizedGame.wrongRoomMode', {}, 'Esta sala não pertence ao modo Sala Personalizada.'));
            }

            roomHostUid = room.hostUID || null;

            personalizedStateRef = roomRef.child('personalizedState');
            let joinError = null;
            return personalizedStateRef.transaction((current) => {
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
                if (!result.committed) throw new Error(t('personalizedGame.joinFailed', {}, 'Não foi possível entrar na sala personalizada.'));
                sessionStorage.setItem('currentRoomMode', root.CoupGameModes.PERSONALIZED);
                setupRealtimeListeners();
                setupPresence();
                db.ref(`salas/${roomCode}/lastActivity`).set(Date.now());
            });
        });
    }

    function setupRealtimeListeners() {
        personalizedStateRef.on('value', (snapshot) => {
            personalizedState = snapshot.val();
            if (!personalizedState?.players?.[currentUser.uid]) {
                redirectToLobby(t('personalizedGame.noLongerInRoom', {}, 'Você não faz mais parte desta sala personalizada.'));
                return;
            }
            if (redirectIfWrongView(personalizedState)) return;
            Renderer.render(personalizedState);
            Renderer.setConnectionStatus(t('ranked.connected', {}, 'Sincronizado'));
        }, () => {
            Renderer.setConnectionStatus(t('ranked.noConnection', {}, 'Sem conexão'), false);
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
        const connectedRef = personalizedStateRef.child(`players/${currentUser.uid}/connected`);
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

    function restartMatch() {
        return transaction((state) => Engine.restartMatch(state))
            .then(() => navigateToPersonalizedView('personalized/personalized-waiting.html'))
            .catch(() => null);
    }

    function leaveRoom() {
        const finishNavigation = () => {
            presenceDisconnect?.cancel();
            root.location.href = new URL('lobby.html', document.baseURI).href;
        };

        if (!personalizedStateRef || !personalizedState || personalizedState.status !== Rules.PHASES.WAITING) {
            if (personalizedStateRef && currentUser) {
                personalizedStateRef.child(`players/${currentUser.uid}/connected`).set(false).finally(finishNavigation);
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

    function isHandKnownByOpponent(state, player) {
        const hidden = hiddenInfluences(player);
        if (!hidden.length) return false;
        if (hidden.length > 1 && new Set(hidden.map((card) => card.role)).size < hidden.length) return false;
        return Object.entries(player.investigationExposure || {}).some(([observerUid, exposure]) => {
            const observer = Engine.getPlayer(state, observerUid);
            return observer && !observer.eliminated && hidden.every((card) => exposure?.[card.id] === card.role);
        });
    }

    function getKnownRoleCount(state, role) {
        const discarded = (state.discard || []).filter((card) => card.role === role).length;
        const revealed = Engine.getPlayers(state).reduce((total, player) => (
            total + (player.influences || []).filter((card) => card.revealed && card.role === role).length
        ), 0);
        return discarded + revealed;
    }

    function shouldClaimRole(state, player, role, multiplier = 1) {
        if (hasRole(player, role)) return Math.random() > 0.08;
        if (isHandKnownByOpponent(state, player)) return false;
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
        const candidates = Engine.getActionTargets(state, bot.uid, purpose === 'steal' ? Rules.ACTIONS.STEAL : null);
        if (!candidates.length) return null;
        return candidates
            .map((target) => ({ target, score: getTargetScore(bot, target, purpose) }))
            .sort((left, right) => right.score - left.score)[0].target;
    }

    function chooseProfitableBluff(state, bot, stealTarget, attackTarget) {
        if (isHandKnownByOpponent(state, bot)) return null;
        const { honesty } = getPersonality(bot);
        const caution = hiddenInfluences(bot).length === 1 ? 0.85 : 1;
        if (Math.random() >= 0.65 * ((1 - honesty) ** 0.85) * caution) return null;
        const { ACTIONS } = Rules;
        const candidates = [
            { type: ACTIONS.TAX, targetUid: null, weight: 3 },
            ...(stealTarget ? [{ type: ACTIONS.STEAL, targetUid: stealTarget.uid, weight: 3 }] : []),
            ...(bot.coins >= 3 && attackTarget ? [{
                type: ACTIONS.ASSASSINATE, targetUid: attackTarget.uid,
                weight: hiddenInfluences(attackTarget).length === 1 ? 4 : 2
            }] : [])
        ].filter((action) => Rules.isActionAvailable(state, action.type)
            && !hasRole(bot, Rules.getAction(action.type).claim));
        let draw = Math.random() * candidates.reduce((sum, action) => sum + action.weight, 0);
        for (const action of candidates) {
            draw -= action.weight;
            if (draw < 0) return { type: action.type, targetUid: action.targetUid };
        }
        return null;
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

        // Consider a profitable lie before a held Duke monopolizes every turn.
        const bluff = chooseProfitableBluff(state, bot, stealTarget, attackTarget);
        if (bluff) return bluff;
        if (shouldClaimRole(state, bot, ROLES.DUKE, 1.2)) return { type: ACTIONS.TAX, targetUid: null };

        if (stealTarget && shouldClaimRole(state, bot, ROLES.CAPTAIN)) {
            return { type: ACTIONS.STEAL, targetUid: stealTarget.uid };
        }

        if (bot.coins >= 3 && attackTarget && shouldClaimRole(state, bot, ROLES.ASSASSIN, 0.85)) {
            return { type: ACTIONS.ASSASSINATE, targetUid: attackTarget.uid };
        }

        if (Rules.isActionAvailable(state, ACTIONS.EXAMINE) && shouldClaimRole(state, bot, ROLES.INQUISITOR, 0.7) && attackTarget && Math.random() < 0.45) {
            return { type: ACTIONS.EXAMINE, targetUid: attackTarget.uid };
        }

        if (Rules.isActionAvailable(state, ACTIONS.EXCHANGE_AMBASSADOR) && shouldClaimRole(state, bot, ROLES.AMBASSADOR, 0.7)) {
            return { type: ACTIONS.EXCHANGE_AMBASSADOR, targetUid: null };
        }

        if (Rules.isActionAvailable(state, ACTIONS.EXCHANGE_INQUISITOR) && shouldClaimRole(state, bot, ROLES.INQUISITOR, 0.55)) {
            return { type: ACTIONS.EXCHANGE_INQUISITOR, targetUid: null };
        }

        const knownDukes = getKnownRoleCount(state, ROLES.DUKE);
        const { skepticism } = getPersonality(bot);
        if (knownDukes >= Rules.SETTINGS.cardsPerRole || Math.random() > (0.32 + skepticism * 0.22)) {
            return { type: ACTIONS.FOREIGN_AID, targetUid: null };
        }

        return { type: ACTIONS.INCOME, targetUid: null };
    }

    function shouldStayOutOfConflict(state, bot) {
        const pending = state.pendingAction;
        return Boolean(pending?.targetUid && pending.targetUid !== bot.uid && pending.actorUid !== bot.uid);
    }

    function getFavorStrength(state, bot) {
        return Math.min(3, Math.max(0, Number(bot.favors?.[state.pendingAction?.targetUid]) || 0));
    }

    function shouldChallengeClaim(state, bot, claim, actorUid, isSelfTarget = false) {
        if (!claim || !actorUid) return false;
        if (shouldStayOutOfConflict(state, bot)) {
            // Do not undermine somebody else's defense; helping the target is rare and risky.
            if (state.phase === Rules.PHASES.BLOCK_CHALLENGE) return false;
            const caution = Engine.countInfluences(bot) === 1 ? 0.25 : 1;
            return Math.random() < (0.015 + getFavorStrength(state, bot) * 0.04) * caution;
        }
        const facingAssassination = state.phase === Rules.PHASES.RESPONSE
            && state.pendingAction?.type === Rules.ACTIONS.ASSASSINATE
            && state.pendingAction.targetUid === bot.uid && actorUid === state.pendingAction.actorUid;
        if (facingAssassination && hiddenInfluences(bot).length > 1) {
            if (hasRole(bot, Rules.ROLES.CONTESSA)) return false;
            // Count physical cards once: discard and revealed hands reference the same losses.
            const known = new Set([
                ...(state.discard || []),
                ...Engine.getPlayers(state).flatMap((player) => (player.influences || [])
                    .filter((card) => card.revealed || player.uid === bot.uid))
            ].filter((card) => card.role === claim).map((card) => card.id));
            if (known.size >= Rules.SETTINGS.cardsPerRole) return true;
            const { skepticism } = getPersonality(bot);
            const publicStats = state.matchStats?.[actorUid] || {};
            const exposedBluffs = Math.min(3, Math.max(0, Number(publicStats.provenBluffs) || 0));
            const successfulAttacks = Math.min(4, Math.max(0, Number(publicStats.assassinations) || 0));
            const chance = (0.03 + skepticism * 0.07 + exposedBluffs * 0.025)
                / (1 + successfulAttacks * 0.25);
            return Math.random() < chance;
        }
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
        if (isHandKnownByOpponent(state, bot)) {
            return claims.find((claim) => hasRole(bot, claim)) || null;
        }
        if (shouldStayOutOfConflict(state, bot)) {
            if (state.pendingAction.type !== Rules.ACTIONS.STEAL || !claims.includes(Rules.ROLES.CAPTAIN)) return null;
            const favors = getFavorStrength(state, bot);
            const ownedCaptain = hasRole(bot, Rules.ROLES.CAPTAIN);
            const { honesty } = getPersonality(bot);
            const caution = Engine.countInfluences(bot) === 1 ? 0.35 : 1;
            const chance = ownedCaptain
                ? Math.min(0.7, 0.06 + favors * 0.24)
                : (0.005 + favors * 0.035) * (1 - honesty);
            return Math.random() < chance * caution ? Rules.ROLES.CAPTAIN : null;
        }
        const owned = claims.find((role) => hasRole(bot, role));
        const facingAssassination = state.pendingAction?.type === Rules.ACTIONS.ASSASSINATE
            && state.pendingAction.targetUid === bot.uid;
        if (facingAssassination && owned === Rules.ROLES.CONTESSA) return owned;
        if (owned && Math.random() > 0.08) return owned;
        const { honesty } = getPersonality(bot);
        if (facingAssassination && hiddenInfluences(bot).length > 1) {
            const attackerStats = state.matchStats?.[state.pendingAction.actorUid] || {};
            const challenges = Math.min(8, Math.max(0, Number(attackerStats.challenges) || 0));
            const chance = 0.18 * ((1 - honesty) ** 0.9) / (1 + challenges * 0.3);
            return Math.random() < chance ? Rules.ROLES.CONTESSA : null;
        }
        const defenseWeight = facingAssassination && hiddenInfluences(bot).length === 1 ? 0.9 : 0.7;
        const bluffChance = ((1 - honesty) ** 0.9) * defenseWeight;
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

    function chooseRandomResponder(players) {
        if (!players.length) return null;
        return players[Math.floor(Math.random() * players.length)];
    }

    function getBotDecisionDelay(state, now = Date.now()) {
        if (state.phase === Rules.PHASES.CHALLENGE_REVEAL) {
            return Math.max(0, state.pendingAction.challenge.revealAfter - now);
        }
        if ([Rules.PHASES.RESPONSE, Rules.PHASES.BLOCK_CHALLENGE].includes(state.phase)) {
            const randomizedDelay = BOT_RESPONSE_MIN_DELAY_MS
                + Math.floor(Math.random() * BOT_RESPONSE_RANDOM_DELAY_MS);
            const availableTime = Number(state.deadline || 0) - now - BOT_RESPONSE_DEADLINE_BUFFER_MS;
            return Math.max(100, Math.min(randomizedDelay, availableTime));
        }
        return BOT_DECISION_MIN_DELAY_MS + Math.floor(Math.random() * BOT_DECISION_RANDOM_DELAY_MS);
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
            const responseUids = Engine.getResponseUids(state);
            const bots = Engine.getAlivePlayers(state).filter((player) => (
                player.ai && responseUids.includes(player.uid)
            ));
            const bot = chooseRandomResponder(bots);
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
            const bot = chooseRandomResponder(bots);
            if (!bot) return false;
            if (shouldChallengeClaim(state, bot, pending.block.claim, blockerUid, pending.actorUid === bot.uid)) {
                Engine.challengeBlock(state, bot.uid, now);
            } else {
                Engine.passResponse(state, bot.uid, now);
            }
            return true;
        }

        if (state.phase === Rules.PHASES.CHALLENGE_REVEAL) {
            const challenge = state.pendingAction?.challenge;
            const bot = Engine.getPlayer(state, challenge?.playerUid);
            if (!bot?.ai || now < challenge.revealAfter) return false;
            const card = bot.influences.find((item) => !item.revealed && item.role === challenge.claim) || chooseInfluenceToLose(bot);
            if (!card) return false;
            Engine.revealChallenge(state, bot.uid, card.id, now);
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
        if (Date.now() < (state.revealPresentation?.endsAt || 0)) return false;
        if (state.phase === Rules.PHASES.TURN) return Boolean(Engine.getPlayer(state, Engine.getActiveUid(state))?.ai);
        if (state.phase === Rules.PHASES.RESPONSE) {
            const responseUids = Engine.getResponseUids(state);
            return Engine.getAlivePlayers(state).some((player) => (
                player.ai && responseUids.includes(player.uid)
            ));
        }
        if (state.phase === Rules.PHASES.BLOCK_CHALLENGE) {
            const pending = state.pendingAction;
            const blockerUid = pending?.block?.uid;
            return Engine.getAlivePlayers(state).some((player) => (
                player.ai && player.uid !== blockerUid && !pending?.passes?.[player.uid]
            ));
        }
        if (state.phase === Rules.PHASES.CHALLENGE_REVEAL) return Boolean(Engine.getPlayer(state, state.pendingAction?.challenge?.playerUid)?.ai);
        if (state.phase === Rules.PHASES.INFLUENCE_LOSS) return Boolean(Engine.getPlayer(state, state.pendingLoss?.playerUid)?.ai);
        if (state.phase === Rules.PHASES.EXCHANGE) return Boolean(Engine.getPlayer(state, state.pendingExchange?.playerUid)?.ai);
        if (state.phase === Rules.PHASES.EXAMINE) return Boolean(Engine.getPlayer(state, state.pendingExamine?.actorUid)?.ai);
        return false;
    }

    function startBotDriver() {
        root.setInterval(() => {
            if (!hasPendingBotDecision(personalizedState) || botActionPending) return;
            botActionPending = true;
            const delay = getBotDecisionDelay(personalizedState);
            root.setTimeout(() => {
                transaction((state) => {
                    if (!applyNextBotDecision(state, Date.now())) {
                        throw new Error(t('ranked.noPendingAiAction', {}, 'Nenhuma ação de IA pendente.'));
                    }
                    return state;
                }, { silent: true }).catch(() => null).finally(() => {
                    botActionPending = false;
                });
            }, delay);
        }, 900);
    }

    function startTimers() {
        root.setInterval(() => {
            Renderer.updateClock(Date.now());
            if (!personalizedState?.deadline || Date.now() < personalizedState.deadline || deadlineAdvancePending) return;
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
            redirectToLobby(t('personalizedGame.invalidRoomCode', {}, 'Código de sala personalizada inválido.'));
            return;
        }

        auth.onAuthStateChanged((user) => {
            if (!user) {
                root.location.href = 'login.html';
                return;
            }
            currentUser = user;
            Renderer.init({ controller, currentUid: user.uid, roomCode });
            joinPersonalizedRoom(user).catch((error) => redirectToLobby(error.message));
        });
        startTimers();
        startBotDriver();
    }

    boot();
})(window);

