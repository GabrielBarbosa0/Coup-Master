(function initializeAutomatedCards(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupAutomatedCards = api;
})(typeof window !== 'undefined' ? window : null, function createAutomatedCardsModule() {
    function create(Rules, Model, services) {
        if (!Rules || !Model || !services) {
            throw new Error('Regras, modelo e serviços são obrigatórios para criar o fluxo de cartas.');
        }

        const { ACTIONS, PHASES, SETTINGS } = Rules;
        const {
            getAlivePlayers,
            countInfluences,
            getPlayer,
            getBlockClaimsForPlayer
        } = Model;
        const {
            normalizeState,
            ensureMatchStats,
            bumpGrudge,
            addLog,
            beginAnimationTransition,
            endTurn,
            finishIfWinner,
            getActionFlow
        } = services;
        const onChallengeProven = services.onChallengeProven || (() => {});
        const onInfluenceLost = services.onInfluenceLost || (() => {});
        const onPlayerEliminated = services.onPlayerEliminated || (() => {});
        const onExchangeCompleted = services.onExchangeCompleted || (() => {});
        const onExamineCompleted = services.onExamineCompleted || (() => {});
        const createChallengeLossMetadata = services.createChallengeLossMetadata || (() => ({}));
        const createScheduledLossMetadata = services.createScheduledLossMetadata || (() => ({}));

        function isExchangeAction(actionType) {
            return [ACTIONS.EXCHANGE_AMBASSADOR, ACTIONS.EXCHANGE_INQUISITOR].includes(actionType);
        }

        function revealChallenge(state, uid, cardId, now = Date.now()) {
            normalizeState(state);
            const pending = state.pendingAction;
            const challenge = pending?.challenge;
            if (state.phase !== PHASES.CHALLENGE_REVEAL || challenge?.playerUid !== uid) {
                throw new Error('Você não precisa responder a uma contestação agora.');
            }
            const actor = getPlayer(state, uid);
            const card = actor?.influences.find((item) => item.id === cardId && !item.revealed);
            if (!card) throw new Error('Escolha uma influência válida.');
            if (actor.ai && now < challenge.revealAfter) throw new Error('Aguarde a resposta à contestação.');
            const { challengerUid, claim, isBlock } = challenge;
            const challengerStats = ensureMatchStats(state, challengerUid);
            delete pending.challenge;

            if (card.role === claim) {
                recordPublicReveal(state, actor, card, 'proof');
                challengerStats.failedChallenges += 1;
                if (isBlock || !isExchangeAction(pending.type)) {
                    replaceProvenInfluence(state, actor.uid, card.id);
                }
                if (!isBlock) pending.claimConfirmed = true;
                onChallengeProven({ state, actor, pending, isBlock });
                addLog(
                    state,
                    isBlock
                        ? `${actor.name} provou o bloqueio.`
                        : `${actor.name} provou ter ${Rules.getRole(claim).label}.`,
                    'challenge-result',
                    now
                );
                const lossPlan = isBlock
                    ? { reason: 'Contestação incorreta do bloqueio.', continuation: 'accept-block', count: 1 }
                    : getFailedActionChallengeLossPlan(state, challengerUid);
                scheduleLoss(state, challengerUid, lossPlan.reason, lossPlan.continuation, now, lossPlan.count, true);
            } else {
                challengerStats.successfulChallenges += 1;
                ensureMatchStats(state, actor.uid).provenBluffs += 1;
                addLog(state, `${actor.name} cedeu à contestação.`, 'challenge-result', now);
                const lossPlan = isBlock
                    ? getBluffedBlockLossPlan(state, uid)
                    : { count: 1, continuation: 'cancel-action' };
                if (pending.actorUid !== uid) bumpGrudge(state, uid, pending.actorUid, 2);
                state.pendingLoss = {
                    playerUid: uid,
                    count: lossPlan.count,
                    continuation: lossPlan.continuation,
                    reason: 'Contestação aceita.',
                    ...createChallengeLossMetadata({ state, challengerUid, actor, pending }),
                    doubleAssassination: pending.type === ACTIONS.ASSASSINATE
                        && pending.targetUid === uid && lossPlan.count > 1
                };
                state.phase = PHASES.INFLUENCE_LOSS;
                loseInfluence(state, uid, card.id, now);
            }
            state.updatedAt = now;
            return state;
        }

        function getFailedActionChallengeLossPlan(state, challengerUid) {
            const pending = state.pendingAction;
            if (pending?.type === ACTIONS.ASSASSINATE && pending.targetUid === challengerUid) {
                return {
                    count: Math.min(2, Math.max(1, countInfluences(getPlayer(state, challengerUid)))),
                    continuation: 'end-turn',
                    reason: 'Contestação incorreta e vítima de assassinato.'
                };
            }
            return { count: 1, continuation: 'execute-action', reason: 'Contestação incorreta.' };
        }

        function getBluffedBlockLossPlan(state, blockerUid) {
            const pending = state.pendingAction;
            if ([ACTIONS.ASSASSINATE, ACTIONS.COUP].includes(pending?.type) && pending.targetUid === blockerUid) {
                return {
                    count: Math.min(2, Math.max(1, countInfluences(getPlayer(state, blockerUid)))),
                    continuation: 'end-turn'
                };
            }
            return { count: 1, continuation: 'execute-action' };
        }

        function replaceProvenInfluence(state, uid, cardId) {
            const player = getPlayer(state, uid);
            const index = player.influences.findIndex((card) => card.id === cardId && !card.revealed);
            if (index < 0 || state.deck.length === 0) return;
            const provenCard = player.influences[index];
            const replacement = state.deck.pop();
            player.influences[index] = { ...replacement, revealed: false };
            state.deck = Rules.shuffle([...state.deck, { id: provenCard.id, role: provenCard.role }]);
            state.hasPostDealCardDraw = true;
        }

        function scheduleLoss(
            state,
            playerUid,
            reason,
            continuation,
            now = Date.now(),
            count = 1,
            requireChoice = false
        ) {
            const offenderUid = state.pendingAction?.actorUid;
            if (offenderUid && offenderUid !== playerUid) bumpGrudge(state, playerUid, offenderUid, 2);
            const normalizedCount = Math.max(1, Number(count) || 1);
            state.pendingLoss = {
                playerUid,
                count: normalizedCount,
                reason,
                continuation,
                requireChoice,
                ...createScheduledLossMetadata({ state, playerUid, offenderUid }),
                doubleAssassination: state.pendingAction?.type === ACTIONS.ASSASSINATE
                    && state.pendingAction.targetUid === playerUid && normalizedCount > 1
            };
            state.phase = PHASES.INFLUENCE_LOSS;
            state.deadline = now + SETTINGS.selectionSeconds * 1000;
            state.updatedAt = now;
            resolveAutomaticLossIfForced(state, now);
        }

        function revealInfluenceForLoss(state, player, card, now) {
            const reason = state.pendingLoss?.reason;
            const doubleAssassination = Boolean(state.pendingLoss?.doubleAssassination);
            const assassinationSecondLoss = state.pendingAction?.type === ACTIONS.ASSASSINATE
                && state.pendingAction.targetUid === player.uid && state.pendingLoss?.count === 1
                && (reason === 'Contestação aceita.' || reason === 'Contestação incorreta e vítima de assassinato.');
            const kind = doubleAssassination ? 'doubleAssassination'
                : reason === 'Vítima de Golpe de Estado.' ? 'coup'
                    : reason === 'Vítima de assassinato.' || assassinationSecondLoss ? 'assassination'
                        : reason === 'Contestação aceita.' ? 'concession' : 'challengeLoss';
            recordPublicReveal(state, player, card, kind);
            card.revealed = true;
            onInfluenceLost({ state, player, card });
            state.discard.push({ id: card.id, role: card.role });
            addLog(state, `${player.name} perdeu ${Rules.getRole(card.role).label}.`, 'loss', now);

            if (countInfluences(player) === 0) {
                player.eliminated = true;
                onPlayerEliminated({ state, player, card });
                addLog(state, `${player.name} foi eliminado.`, 'elimination', now);
            }
        }

        function recordPublicReveal(state, player, card, kind) {
            state.revealSequence = (Number(state.revealSequence) || 0) + 1;
            state.publicReveals = [...(state.publicReveals || []), {
                sequence: state.revealSequence,
                playerUid: player.uid,
                playerName: player.name,
                role: card.role,
                cardId: card.id,
                kind
            }].slice(-12);
        }

        function resolveAutomaticLossIfForced(state, now = Date.now()) {
            const pendingLoss = state.pendingLoss;
            const player = getPlayer(state, pendingLoss?.playerUid);
            const hidden = player?.influences?.filter((card) => !card.revealed) || [];
            const onlyOneCardRemains = hidden.length === 1;
            if (!pendingLoss || !player || hidden.length === 0
                || (pendingLoss.requireChoice && !onlyOneCardRemains)
                || (!onlyOneCardRemains && hidden.length > pendingLoss.count)) return false;

            hidden.slice(0, pendingLoss.count).forEach((card) => {
                revealInfluenceForLoss(state, player, card, now);
                pendingLoss.count -= 1;
            });

            if (finishIfWinner(state, now)) return true;

            if (pendingLoss.count <= 0) {
                const continuation = pendingLoss.continuation;
                state.pendingLoss = null;
                continueAfterLoss(state, continuation, now);
                state.updatedAt = now;
            }
            return true;
        }

        function loseInfluence(state, uid, cardId, now = Date.now()) {
            normalizeState(state);
            const pendingLoss = state.pendingLoss;
            if (state.phase !== PHASES.INFLUENCE_LOSS || pendingLoss?.playerUid !== uid) {
                throw new Error('Você não precisa perder uma influência agora.');
            }

            const player = getPlayer(state, uid);
            const card = player?.influences.find((influence) => influence.id === cardId && !influence.revealed);
            if (!card) throw new Error('Escolha uma influência válida.');

            revealInfluenceForLoss(state, player, card, now);
            pendingLoss.count -= 1;

            if (finishIfWinner(state, now)) return state;
            if (resolveAutomaticLossIfForced(state, now)) return state;
            if (pendingLoss.count > 0) {
                state.deadline = now + SETTINGS.selectionSeconds * 1000;
                state.updatedAt = now;
                return state;
            }

            const continuation = pendingLoss.continuation;
            state.pendingLoss = null;
            continueAfterLoss(state, continuation, now);
            state.updatedAt = now;
            return state;
        }

        function continueAfterLoss(state, continuation, now) {
            const actionFlow = getActionFlow();
            if (continuation === 'resume-action') {
                if (!canPendingActionContinue(state)) {
                    addLog(state, 'A ação foi encerrada porque o alvo não está mais disponível.', 'action-result', now);
                    endTurn(state, now);
                    return;
                }
                state.phase = PHASES.RESPONSE;
                state.pendingAction.passes = {};
                const hasBlockResponse = getAlivePlayers(state).some((player) => (
                    player.uid !== state.pendingAction.actorUid
                    && getBlockClaimsForPlayer(state, player.uid).length > 0
                ));
                if (!hasBlockResponse) {
                    actionFlow.executePendingAction(state, now);
                    return;
                }
                state.deadline = now + SETTINGS.responseSeconds * 1000;
                return;
            }
            if (continuation === 'execute-action') {
                actionFlow.executePendingAction(state, now);
                return;
            }
            if (continuation === 'accept-block') {
                actionFlow.acceptBlock(state, now);
                return;
            }
            if (continuation === 'cancel-action' || continuation === 'end-turn') {
                endTurn(state, now);
            }
        }

        function canPendingActionContinue(state) {
            const pending = state.pendingAction;
            const action = pending ? Rules.getAction(pending.type) : null;
            const actor = pending ? getPlayer(state, pending.actorUid) : null;
            if (!pending || !action || !actor || actor.eliminated || countInfluences(actor) === 0) return false;
            if (!action.requiresTarget) return true;
            const target = getPlayer(state, pending.targetUid);
            if (pending.type === ACTIONS.STEAL) return Boolean(target);
            return Boolean(target && !target.eliminated && countInfluences(target) > 0);
        }

        function getExchangeDrawCount(actionType) {
            return actionType === ACTIONS.EXCHANGE_INQUISITOR ? 1 : 2;
        }

        function beginExchange(state, uid, actionType, now) {
            const player = getPlayer(state, uid);
            const hidden = player.influences.filter((card) => !card.revealed);
            const revealed = player.influences.filter((card) => card.revealed);
            const drawCount = getExchangeDrawCount(actionType);
            const drawn = state.deck
                .splice(Math.max(0, state.deck.length - drawCount), drawCount)
                .map((card) => ({ ...card, revealed: false }));
            if (drawn.length) state.hasPostDealCardDraw = true;
            player.influences = revealed;
            state.pendingExchange = { playerUid: uid, keepCount: hidden.length, options: [...hidden, ...drawn] };
            beginAnimationTransition(state, {
                type: 'resume-phase',
                phase: PHASES.EXCHANGE,
                timeoutMs: SETTINGS.selectionSeconds * 1000
            }, now);
        }

        function completeExchange(state, uid, keepIds, now = Date.now()) {
            normalizeState(state);
            const pending = state.pendingExchange;
            if (state.phase !== PHASES.EXCHANGE || pending?.playerUid !== uid) {
                throw new Error('Não há troca pendente.');
            }
            const uniqueIds = [...new Set(keepIds || [])];
            if (uniqueIds.length !== pending.keepCount) throw new Error(`Escolha ${pending.keepCount} influência(s).`);
            if (uniqueIds.some((id) => !pending.options.some((card) => card.id === id))) {
                throw new Error('Escolha de troca inválida.');
            }

            const player = getPlayer(state, uid);
            const kept = pending.options.filter((card) => uniqueIds.includes(card.id));
            const returned = pending.options
                .filter((card) => !uniqueIds.includes(card.id))
                .map(({ id, role }) => ({ id, role }));
            player.influences.push(...kept.map((card) => ({ ...card, revealed: false })));
            state.deck = Rules.shuffle([...state.deck, ...returned]);
            state.pendingExchange = null;
            onExchangeCompleted({ state, uid, player });
            addLog(state, `${player.name} concluiu a troca.`, 'action-result', now);
            endTurn(state, now);
            return state;
        }

        function beginExamine(state, actorUid, targetUid, now) {
            const target = getPlayer(state, targetUid);
            if (!target || target.eliminated || countInfluences(target) === 0) {
                addLog(state, 'A investigação foi encerrada porque o alvo não está mais disponível.', 'action-result', now);
                endTurn(state, now);
                return;
            }
            const hidden = target.influences.filter((card) => !card.revealed);
            if (!hidden.length) {
                addLog(state, 'A investigação foi encerrada porque o alvo não tem influências ocultas.', 'action-result', now);
                endTurn(state, now);
                return;
            }
            const examined = hidden[Math.floor(Math.random() * hidden.length)];
            state.pendingExamine = {
                actorUid,
                targetUid,
                cardId: examined.id,
                role: examined.role
            };
            state.phase = PHASES.EXAMINE;
            state.deadline = now + SETTINGS.selectionSeconds * 1000;
        }

        function completeExamine(state, uid, replace, now = Date.now()) {
            normalizeState(state);
            const pending = state.pendingExamine;
            if (state.phase !== PHASES.EXAMINE || pending?.actorUid !== uid) {
                throw new Error('Não há investigação pendente.');
            }

            const target = getPlayer(state, pending.targetUid);
            target.investigationExposure = target.investigationExposure || {};

            if (replace && state.deck.length > 0) {
                const index = target.influences.findIndex((card) => card.id === pending.cardId && !card.revealed);
                if (index >= 0) {
                    const oldCard = target.influences[index];
                    const replacement = state.deck.pop();
                    target.influences[index] = { ...replacement, revealed: false };
                    state.deck = Rules.shuffle([...state.deck, { id: oldCard.id, role: oldCard.role }]);
                    state.hasPostDealCardDraw = true;
                }
                Object.entries(target.investigationExposure).forEach(([observerUid, exposure]) => {
                    delete exposure[pending.cardId];
                    if (!Object.keys(exposure).length) delete target.investigationExposure[observerUid];
                });
            } else {
                target.investigationExposure[uid] = target.investigationExposure[uid] || {};
                target.investigationExposure[uid][pending.cardId] = pending.role;
            }

            addLog(state, `${getPlayer(state, uid).name} concluiu a investigação.`, 'action-result', now);
            onExamineCompleted({ state, uid, target });
            state.pendingExamine = null;
            endTurn(state, now);
            return state;
        }

        return Object.freeze({
            revealChallenge,
            getFailedActionChallengeLossPlan,
            getBluffedBlockLossPlan,
            replaceProvenInfluence,
            scheduleLoss,
            revealInfluenceForLoss,
            recordPublicReveal,
            resolveAutomaticLossIfForced,
            loseInfluence,
            continueAfterLoss,
            canPendingActionContinue,
            isExchangeAction,
            getExchangeDrawCount,
            beginExchange,
            completeExchange,
            beginExamine,
            completeExamine
        });
    }

    return Object.freeze({ create });
});
