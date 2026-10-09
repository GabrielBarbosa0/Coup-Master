(function initializeAutomatedActions(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupAutomatedActions = api;
})(typeof window !== 'undefined' ? window : null, function createAutomatedActionsModule() {
    function create(Rules, Model, services) {
        if (!Rules || !Model || !services) {
            throw new Error('Regras, modelo e serviços são obrigatórios para criar o fluxo de ações.');
        }

        const { ACTIONS, PHASES, ROLES, SETTINGS } = Rules;
        const {
            getPlayers,
            getAlivePlayers,
            getPlayer,
            getActiveUid,
            getActionTargets,
            getResponseUids,
            getBlockClaimsForPlayer
        } = Model;
        const {
            normalizeState,
            ensureMatchStats,
            playerHasHiddenRole,
            bumpGrudge,
            addLog,
            beginAnimationTransition,
            endTurn,
            scheduleLoss,
            beginExchange,
            beginExamine,
            canPendingActionContinue
        } = services;
        const onActionDeclared = services.onActionDeclared || (() => {});
        const onBlockDeclared = services.onBlockDeclared || (() => {});
        const onBlockAccepted = services.onBlockAccepted || (() => {});
        const onActionResolved = services.onActionResolved || (() => {});
        const createPendingActionMetadata = services.createPendingActionMetadata || (() => ({}));

        function validateTurnAction(state, uid, actionType, targetUid) {
            if (state.status !== 'active' || state.phase !== PHASES.TURN) throw new Error('Aguarde a etapa atual terminar.');
            if (getActiveUid(state) !== uid) throw new Error('Não é o seu turno.');

            const player = getPlayer(state, uid);
            const action = Rules.getAction(actionType);
            if (!player || player.eliminated) throw new Error('Jogador indisponivel.');
            if (!action) throw new Error('Ação inválida.');
            if (!Rules.isActionAvailable(state, actionType)) throw new Error('Personagem ausente nesta partida.');
            if (player.coins >= SETTINGS.mandatoryCoupCoins && actionType !== ACTIONS.COUP) {
                throw new Error(`Com ${SETTINGS.mandatoryCoupCoins} moedas ou mais, o Golpe de Estado é obrigatório.`);
            }
            if (player.coins < action.cost) throw new Error('Moedas insuficientes.');

            if (action.requiresTarget) {
                const target = getPlayer(state, targetUid);
                if (!target || !getActionTargets(state, uid, actionType).some((candidate) => candidate.uid === targetUid)) {
                    throw new Error('Escolha um alvo válido.');
                }
            }
        }

        function performAction(state, uid, actionType, targetUid = null, now = Date.now()) {
            normalizeState(state);
            validateTurnAction(state, uid, actionType, targetUid);
            const action = Rules.getAction(actionType);
            const actor = getPlayer(state, uid);
            const actorStats = ensureMatchStats(state, uid);

            if (action.cost > 0) actor.coins -= action.cost;
            actorStats.actions += 1;
            const isBluff = Boolean(action.claim && !playerHasHiddenRole(actor, action.claim));
            if (isBluff) actorStats.bluffs += 1;
            onActionDeclared({ state, actor, actorStats, action, actionType, isBluff });
            if (targetUid) bumpGrudge(state, targetUid, uid, 1);

            state.pendingAction = {
                id: `rank-action-${state.turnNumber}-${now}`,
                type: actionType,
                actorUid: uid,
                targetUid: targetUid || null,
                claim: action.claim || null,
                claimConfirmed: !action.challengeable,
                passes: {},
                block: null,
                ...createPendingActionMetadata({ state, actor, action, actionType }),
                createdAt: now
            };

            addLog(
                state,
                `${actor.name} escolheu ${action.label}${targetUid ? ` contra ${getPlayer(state, targetUid).name}` : ''}.`,
                'action',
                now
            );

            if (action.cost > 0) {
                beginAnimationTransition(state, { type: 'start-action' }, now);
            } else {
                continuePendingAction(state, now);
            }

            state.updatedAt = now;
            return state;
        }

        function passResponse(state, uid, now = Date.now()) {
            normalizeState(state);
            if (![PHASES.RESPONSE, PHASES.BLOCK_CHALLENGE].includes(state.phase)) {
                throw new Error('Não há resposta pendente.');
            }

            const pending = state.pendingAction;
            if (!pending) throw new Error('Ação pendente não encontrada.');
            const excludedUid = state.phase === PHASES.BLOCK_CHALLENGE ? pending.block?.uid : pending.actorUid;
            const eligible = state.phase === PHASES.RESPONSE
                ? getResponseUids(state)
                : getAlivePlayers(state).map((player) => player.uid).filter((playerUid) => playerUid !== excludedUid);
            if (!eligible.includes(uid)) throw new Error('Você não pode responder agora.');

            pending.passes = pending.passes || {};
            if (pending.passes[uid]) throw new Error('Sua resposta já foi registrada.');
            pending.passes[uid] = true;
            addLog(state, `${getPlayer(state, uid).name} passou.`, 'response', now);

            if (eligible.every((playerUid) => pending.passes[playerUid])) {
                if (state.phase === PHASES.BLOCK_CHALLENGE) acceptBlock(state, now);
                else executePendingAction(state, now);
            }
            state.updatedAt = now;
            return state;
        }

        function challengeAction(state, challengerUid, now = Date.now()) {
            normalizeState(state);
            const pending = state.pendingAction;
            if (state.phase !== PHASES.RESPONSE || !pending?.claim || pending.claimConfirmed) {
                throw new Error('Esta ação não pode ser contestada agora.');
            }
            const challenger = getPlayer(state, challengerUid);
            if (challengerUid === pending.actorUid || !challenger || challenger.eliminated || pending.passes?.[challengerUid]) {
                throw new Error('Contestação inválida.');
            }

            const actor = getPlayer(state, pending.actorUid);
            ensureMatchStats(state, challengerUid).challenges += 1;
            addLog(state, `${challenger.name} contestou ${actor.name}.`, 'challenge', now);
            beginChallengeReveal(state, actor.uid, challengerUid, pending.claim, false, now);
            return state;
        }

        function continuePendingAction(state, now = Date.now()) {
            const action = Rules.getAction(state.pendingAction?.type);
            if (!action) return endTurn(state, now);
            if (!action.challengeable && action.blockClaims.length === 0) {
                executePendingAction(state, now);
            } else {
                state.phase = PHASES.RESPONSE;
                state.deadline = now + SETTINGS.responseSeconds * 1000;
                state.updatedAt = now;
            }
            return state;
        }

        function beginChallengeReveal(state, playerUid, challengerUid, claim, isBlock, now) {
            state.pendingAction.challenge = {
                playerUid,
                challengerUid,
                claim,
                isBlock,
                revealAfter: now + SETTINGS.challengeReadSeconds * 1000
            };
            state.phase = PHASES.CHALLENGE_REVEAL;
            state.deadline = now + SETTINGS.selectionSeconds * 1000;
            state.updatedAt = now;
        }

        function declareBlock(state, blockerUid, claim, now = Date.now()) {
            normalizeState(state);
            const pending = state.pendingAction;
            const legalClaims = getBlockClaimsForPlayer(state, blockerUid);
            const blocker = getPlayer(state, blockerUid);
            if (state.phase !== PHASES.RESPONSE || !pending || !blocker || blocker.eliminated
                || pending.passes?.[blockerUid] || !legalClaims.includes(claim)) {
                throw new Error('Este bloqueio não é permitido.');
            }

            pending.block = { uid: blockerUid, claim };
            onBlockDeclared({ state, blocker, claim, pending });
            pending.passes = {};
            state.phase = PHASES.BLOCK_CHALLENGE;
            state.deadline = now + SETTINGS.responseSeconds * 1000;
            addLog(state, `${blocker.name} bloqueou com ${Rules.getRole(claim).label}.`, 'block', now);
            state.updatedAt = now;
            return state;
        }

        function challengeBlock(state, challengerUid, now = Date.now()) {
            normalizeState(state);
            const pending = state.pendingAction;
            const block = pending?.block;
            if (state.phase !== PHASES.BLOCK_CHALLENGE || !block) throw new Error('Não há bloqueio para contestar.');
            const challenger = getPlayer(state, challengerUid);
            if (challengerUid === block.uid || !challenger || challenger.eliminated || pending.passes?.[challengerUid]) {
                throw new Error('Contestação inválida.');
            }

            const blocker = getPlayer(state, block.uid);
            ensureMatchStats(state, challengerUid).challenges += 1;
            addLog(state, `${challenger.name} contestou o bloqueio de ${blocker.name}.`, 'challenge', now);
            beginChallengeReveal(state, blocker.uid, challengerUid, block.claim, true, now);
            return state;
        }

        function acceptBlock(state, now = Date.now()) {
            const pending = state.pendingAction;
            const blocker = getPlayer(state, pending?.block?.uid);
            const protectedPlayer = getPlayer(state, pending?.targetUid);
            if (pending?.type === ACTIONS.STEAL && pending.block?.claim === ROLES.CAPTAIN
                && blocker && protectedPlayer && blocker.uid !== protectedPlayer.uid) {
                if (blocker.ai) {
                    blocker.favors = blocker.favors || {};
                    blocker.favors[protectedPlayer.uid] = Math.max(
                        0,
                        (Number(blocker.favors[protectedPlayer.uid]) || 0) - 1
                    );
                }
                if (protectedPlayer.ai) {
                    protectedPlayer.favors = protectedPlayer.favors || {};
                    protectedPlayer.favors[blocker.uid] = Math.min(
                        3,
                        Math.max(0, Number(protectedPlayer.favors[blocker.uid]) || 0) + 1
                    );
                }
            }
            if (blocker) {
                const stats = ensureMatchStats(state, blocker.uid);
                stats.blockedActions += 1;
                onBlockAccepted({ state, blocker, stats, pending });
                addLog(state, `O bloqueio de ${blocker.name} foi aceito.`, 'block', now);
            }
            endTurn(state, now);
        }

        function executePendingAction(state, now = Date.now()) {
            const pending = state.pendingAction;
            if (!pending) return state;
            if (!canPendingActionContinue(state)) {
                addLog(state, 'A ação foi encerrada porque o alvo não está mais disponível.', 'action-result', now);
                endTurn(state, now);
                return state;
            }
            const actor = getPlayer(state, pending.actorUid);
            const target = pending.targetUid ? getPlayer(state, pending.targetUid) : null;

            switch (pending.type) {
                case ACTIONS.INCOME:
                    actor.coins += 1;
                    endTurn(state, now);
                    break;
                case ACTIONS.FOREIGN_AID:
                    actor.coins += 2;
                    endTurn(state, now);
                    break;
                case ACTIONS.TAX:
                    actor.coins += 3;
                    onActionResolved({ state, actor, target, pending });
                    endTurn(state, now);
                    break;
                case ACTIONS.STEAL: {
                    const amount = Math.min(2, target.coins);
                    target.coins -= amount;
                    actor.coins += amount;
                    if (amount > 0) {
                        const stats = ensureMatchStats(state, actor.uid);
                        stats.steals += 1;
                        stats.coinsStolen += amount;
                    }
                    addLog(state, `${actor.name} roubou ${amount} moeda(s) de ${target.name}.`, 'action-result', now);
                    endTurn(state, now);
                    break;
                }
                case ACTIONS.COUP:
                case ACTIONS.ASSASSINATE: {
                    const stats = ensureMatchStats(state, actor.uid);
                    if (pending.type === ACTIONS.COUP) stats.coups += 1;
                    if (pending.type === ACTIONS.ASSASSINATE) stats.assassinations += 1;
                    onActionResolved({ state, actor, target, pending, stats });
                    scheduleLoss(
                        state,
                        target.uid,
                        pending.type === ACTIONS.COUP ? 'Vítima de Golpe de Estado.' : 'Vítima de assassinato.',
                        'end-turn',
                        now
                    );
                    break;
                }
                case ACTIONS.EXCHANGE_AMBASSADOR:
                case ACTIONS.EXCHANGE_INQUISITOR:
                    beginExchange(state, actor.uid, pending.type, now);
                    break;
                case ACTIONS.EXAMINE:
                    beginExamine(state, actor.uid, target.uid, now);
                    break;
                default:
                    endTurn(state, now);
            }
            state.updatedAt = now;
            return state;
        }

        return Object.freeze({
            validateTurnAction,
            performAction,
            passResponse,
            challengeAction,
            continuePendingAction,
            beginChallengeReveal,
            declareBlock,
            challengeBlock,
            acceptBlock,
            executePendingAction
        });
    }

    return Object.freeze({ create });
});
