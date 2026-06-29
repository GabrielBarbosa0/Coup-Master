(function initializeRankedEngine(root, factory) {
    const rules = root?.CoupRankedRules
        || (typeof require === 'function' ? require('./ranked-rules.js') : null);
    const api = factory(rules);

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupRankedEngine = api;
})(typeof window !== 'undefined' ? window : null, function createRankedEngine(Rules) {
    if (!Rules) throw new Error('CoupRankedRules precisa ser carregado antes do motor ranqueado.');

    const { ACTIONS, PHASES, SETTINGS } = Rules;

    function createState(now = Date.now()) {
        return {
            schemaVersion: 1,
            status: PHASES.WAITING,
            phase: PHASES.WAITING,
            createdAt: now,
            updatedAt: now,
            players: {},
            turnOrder: [],
            turnIndex: 0,
            turnNumber: 0,
            deck: [],
            discard: [],
            log: [],
            deadline: null,
            pendingAction: null,
            pendingLoss: null,
            pendingExchange: null,
            pendingExamine: null,
            winnerUid: null
        };
    }

    function normalizeState(state) {
        if (!state || typeof state !== 'object') return state;
        state.players = state.players || {};
        state.turnOrder = Array.isArray(state.turnOrder) ? state.turnOrder : [];
        state.deck = Array.isArray(state.deck) ? state.deck : [];
        state.discard = Array.isArray(state.discard) ? state.discard : [];
        state.log = Array.isArray(state.log) ? state.log : [];
        Object.values(state.players).forEach((player) => {
            player.influences = Array.isArray(player.influences) ? player.influences : [];
            player.coins = Number.isFinite(Number(player.coins)) ? Number(player.coins) : SETTINGS.startingCoins;
            player.eliminated = Boolean(player.eliminated);
        });
        return state;
    }

    function addLog(state, message, type = 'info', now = Date.now()) {
        normalizeState(state);
        const entry = {
            id: `rank-log-${now}-${state.log?.length || 0}`,
            message,
            type,
            timestamp: now,
            turn: state.turnNumber || 0
        };
        state.log = [...(state.log || []), entry];
    }

    function getPlayers(state) {
        return Object.values(state.players || {}).sort((left, right) => left.seat - right.seat);
    }

    function getAlivePlayers(state) {
        return getPlayers(state).filter((player) => !player.eliminated && countInfluences(player) > 0);
    }

    function countInfluences(player) {
        return (player?.influences || []).filter((card) => !card.revealed).length;
    }

    function getPlayer(state, uid) {
        return state.players?.[uid] || null;
    }

    function getActiveUid(state) {
        return state.turnOrder?.[state.turnIndex] || null;
    }

    function nextFreeSeat(state) {
        const occupied = new Set(getPlayers(state).map((player) => player.seat));
        for (let seat = 1; seat <= SETTINGS.maxPlayers; seat += 1) {
            if (!occupied.has(seat)) return seat;
        }
        return null;
    }

    function joinPlayer(state, user, now = Date.now()) {
        normalizeState(state);
        if (!user?.uid) throw new Error('Usuario invalido.');
        const existing = getPlayer(state, user.uid);

        if (existing) {
            existing.connected = true;
            existing.name = user.name || existing.name;
            existing.photo = user.photo || existing.photo;
            state.updatedAt = now;
            return state;
        }

        if (state.status !== PHASES.WAITING) throw new Error('A partida ranqueada ja comecou.');
        pruneDisconnectedWaitingPlayers(state, user.uid, now);
        const seat = nextFreeSeat(state);
        if (!seat) throw new Error('A sala ranqueada esta cheia.');

        state.players[user.uid] = {
            uid: user.uid,
            name: user.name || 'Jogador',
            photo: user.photo || '',
            seat,
            connected: true,
            ready: false,
            coins: SETTINGS.startingCoins,
            influences: [],
            eliminated: false,
            joinedAt: now
        };
        addLog(state, `${state.players[user.uid].name} entrou na sala.`, 'system', now);
        state.updatedAt = now;
        return state;
    }

    function setConnected(state, uid, connected, now = Date.now()) {
        normalizeState(state);
        const player = getPlayer(state, uid);
        if (!player) return state;
        player.connected = Boolean(connected);
        state.updatedAt = now;
        return state;
    }

    function leaveWaitingRoom(state, uid, now = Date.now()) {
        normalizeState(state);
        if (state.status !== PHASES.WAITING || !state.players?.[uid]) return state;
        const name = state.players[uid].name;
        delete state.players[uid];
        addLog(state, `${name} saiu da sala.`, 'system', now);
        state.updatedAt = now;
        return state;
    }

    function toggleReady(state, uid, now = Date.now(), random = Math.random) {
        normalizeState(state);
        if (state.status !== PHASES.WAITING) throw new Error('A partida ja comecou.');
        const player = getPlayer(state, uid);
        if (!player) throw new Error('Jogador nao encontrado.');
        pruneDisconnectedWaitingPlayers(state, uid, now);
        player.ready = !player.ready;
        addLog(state, `${player.name} ${player.ready ? 'esta pronto' : 'cancelou a prontidao'}.`, 'system', now);
        state.updatedAt = now;
        maybeStart(state, now, random);
        return state;
    }

    function pruneDisconnectedWaitingPlayers(state, preservedUid, now) {
        if (state.status !== PHASES.WAITING) return;
        Object.values(state.players || {}).forEach((player) => {
            if (player.uid !== preservedUid && player.connected === false) {
                delete state.players[player.uid];
                addLog(state, `${player.name} deixou a sala antes do inicio.`, 'system', now);
            }
        });
    }

    function maybeStart(state, now = Date.now(), random = Math.random) {
        normalizeState(state);
        const players = getPlayers(state);
        if (players.length < SETTINGS.minPlayers || players.some((player) => !player.ready)) return false;

        state.deck = Rules.createDeck(random);
        state.discard = [];
        state.turnOrder = players.map((player) => player.uid);
        state.turnIndex = 0;
        state.turnNumber = 1;
        state.winnerUid = null;

        players.forEach((player) => {
            player.coins = SETTINGS.startingCoins;
            player.eliminated = false;
            player.ready = false;
            player.influences = [];
            for (let index = 0; index < SETTINGS.startingInfluences; index += 1) {
                const card = state.deck.pop();
                player.influences.push({ ...card, revealed: false });
            }
        });

        state.status = 'active';
        state.phase = PHASES.TURN;
        state.deadline = now + SETTINGS.turnSeconds * 1000;
        state.pendingAction = null;
        state.pendingLoss = null;
        state.pendingExchange = null;
        state.pendingExamine = null;
        addLog(state, 'A partida ranqueada comecou.', 'important', now);
        state.updatedAt = now;
        return true;
    }

    function validateTurnAction(state, uid, actionType, targetUid) {
        if (state.status !== 'active' || state.phase !== PHASES.TURN) throw new Error('Aguarde a etapa atual terminar.');
        if (getActiveUid(state) !== uid) throw new Error('Nao e o seu turno.');

        const player = getPlayer(state, uid);
        const action = Rules.getAction(actionType);
        if (!player || player.eliminated) throw new Error('Jogador indisponivel.');
        if (!action) throw new Error('Acao invalida.');
        if (player.coins >= SETTINGS.mandatoryCoupCoins && actionType !== ACTIONS.COUP) {
            throw new Error(`Com ${SETTINGS.mandatoryCoupCoins} moedas ou mais, o Golpe de Estado e obrigatorio.`);
        }
        if (player.coins < action.cost) throw new Error('Moedas insuficientes.');

        if (action.requiresTarget) {
            const target = getPlayer(state, targetUid);
            if (!target || target.uid === uid || target.eliminated || countInfluences(target) === 0) {
                throw new Error('Escolha um alvo valido.');
            }
        }
    }

    function performAction(state, uid, actionType, targetUid = null, now = Date.now()) {
        normalizeState(state);
        validateTurnAction(state, uid, actionType, targetUid);
        const action = Rules.getAction(actionType);
        const actor = getPlayer(state, uid);

        if (action.cost > 0) actor.coins -= action.cost;

        state.pendingAction = {
            id: `rank-action-${state.turnNumber}-${now}`,
            type: actionType,
            actorUid: uid,
            targetUid: targetUid || null,
            claim: action.claim || null,
            claimConfirmed: !action.challengeable,
            passes: {},
            block: null,
            createdAt: now
        };

        addLog(
            state,
            `${actor.name} escolheu ${action.label}${targetUid ? ` contra ${getPlayer(state, targetUid).name}` : ''}.`,
            'action',
            now
        );

        if (!action.challengeable && action.blockClaims.length === 0) {
            executePendingAction(state, now);
        } else {
            state.phase = PHASES.RESPONSE;
            state.deadline = now + SETTINGS.responseSeconds * 1000;
        }

        state.updatedAt = now;
        return state;
    }

    function getResponseUids(state) {
        const action = state.pendingAction;
        if (!action) return [];
        return getAlivePlayers(state)
            .filter((player) => player.uid !== action.actorUid)
            .map((player) => player.uid);
    }

    function getBlockClaimsForPlayer(state, uid) {
        const pending = state.pendingAction;
        const action = pending ? Rules.getAction(pending.type) : null;
        if (!pending || !action || state.phase !== PHASES.RESPONSE || uid === pending.actorUid) return [];
        if (action.blockScope === 'target' && pending.targetUid !== uid) return [];
        return action.blockClaims.slice();
    }

    function passResponse(state, uid, now = Date.now()) {
        normalizeState(state);
        if (![PHASES.RESPONSE, PHASES.BLOCK_CHALLENGE].includes(state.phase)) {
            throw new Error('Nao ha resposta pendente.');
        }

        const pending = state.pendingAction;
        if (!pending) throw new Error('Acao pendente nao encontrada.');
        const excludedUid = state.phase === PHASES.BLOCK_CHALLENGE ? pending.block?.uid : pending.actorUid;
        const eligible = getAlivePlayers(state).map((player) => player.uid).filter((playerUid) => playerUid !== excludedUid);
        if (!eligible.includes(uid)) throw new Error('Voce nao pode responder agora.');

        pending.passes = pending.passes || {};
        if (pending.passes[uid]) throw new Error('Sua resposta ja foi registrada.');
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
            throw new Error('Esta acao nao pode ser contestada agora.');
        }
        const challenger = getPlayer(state, challengerUid);
        if (challengerUid === pending.actorUid || !challenger || challenger.eliminated || pending.passes?.[challengerUid]) {
            throw new Error('Contestacao invalida.');
        }

        const actor = getPlayer(state, pending.actorUid);
        const truthfulCard = actor.influences.find((card) => !card.revealed && card.role === pending.claim);
        addLog(state, `${getPlayer(state, challengerUid).name} contestou ${actor.name}.`, 'challenge', now);

        if (truthfulCard) {
            replaceProvenInfluence(state, actor.uid, truthfulCard.id);
            pending.claimConfirmed = true;
            scheduleLoss(state, challengerUid, 'Contestacao incorreta.', 'resume-action', now);
            addLog(state, `${actor.name} provou ter ${Rules.getRole(pending.claim).label}.`, 'challenge-result', now);
        } else {
            scheduleLoss(state, actor.uid, 'Blefe contestado.', 'cancel-action', now);
            addLog(state, `${actor.name} nao tinha ${Rules.getRole(pending.claim).label}.`, 'challenge-result', now);
        }
        return state;
    }

    function declareBlock(state, blockerUid, claim, now = Date.now()) {
        normalizeState(state);
        const pending = state.pendingAction;
        const legalClaims = getBlockClaimsForPlayer(state, blockerUid);
        const blocker = getPlayer(state, blockerUid);
        if (state.phase !== PHASES.RESPONSE || !pending || !blocker || blocker.eliminated
            || pending.passes?.[blockerUid] || !legalClaims.includes(claim)) {
            throw new Error('Este bloqueio nao e permitido.');
        }

        pending.block = { uid: blockerUid, claim };
        pending.passes = {};
        state.phase = PHASES.BLOCK_CHALLENGE;
        state.deadline = now + SETTINGS.responseSeconds * 1000;
        addLog(
            state,
            `${getPlayer(state, blockerUid).name} bloqueou com ${Rules.getRole(claim).label}.`,
            'block',
            now
        );
        state.updatedAt = now;
        return state;
    }

    function challengeBlock(state, challengerUid, now = Date.now()) {
        normalizeState(state);
        const pending = state.pendingAction;
        const block = pending?.block;
        if (state.phase !== PHASES.BLOCK_CHALLENGE || !block) throw new Error('Nao ha bloqueio para contestar.');
        const challenger = getPlayer(state, challengerUid);
        if (challengerUid === block.uid || !challenger || challenger.eliminated || pending.passes?.[challengerUid]) {
            throw new Error('Contestacao invalida.');
        }

        const blocker = getPlayer(state, block.uid);
        const truthfulCard = blocker.influences.find((card) => !card.revealed && card.role === block.claim);
        addLog(state, `${getPlayer(state, challengerUid).name} contestou o bloqueio de ${blocker.name}.`, 'challenge', now);

        if (truthfulCard) {
            replaceProvenInfluence(state, blocker.uid, truthfulCard.id);
            scheduleLoss(state, challengerUid, 'Contestacao incorreta do bloqueio.', 'accept-block', now);
            addLog(state, `${blocker.name} provou o bloqueio.`, 'challenge-result', now);
        } else {
            scheduleLoss(state, blocker.uid, 'Bloqueio blefado.', 'execute-action', now);
            addLog(state, `${blocker.name} blefou o bloqueio.`, 'challenge-result', now);
        }
        return state;
    }

    function replaceProvenInfluence(state, uid, cardId) {
        const player = getPlayer(state, uid);
        const index = player.influences.findIndex((card) => card.id === cardId && !card.revealed);
        if (index < 0 || state.deck.length === 0) return;
        const provenCard = player.influences[index];
        const replacement = state.deck.pop();
        player.influences[index] = { ...replacement, revealed: false };
        state.deck = Rules.shuffle([...state.deck, { id: provenCard.id, role: provenCard.role }]);
    }

    function scheduleLoss(state, playerUid, reason, continuation, now = Date.now()) {
        state.pendingLoss = { playerUid, count: 1, reason, continuation };
        state.phase = PHASES.INFLUENCE_LOSS;
        state.deadline = now + SETTINGS.selectionSeconds * 1000;
        state.updatedAt = now;
    }

    function loseInfluence(state, uid, cardId, now = Date.now()) {
        normalizeState(state);
        const pendingLoss = state.pendingLoss;
        if (state.phase !== PHASES.INFLUENCE_LOSS || pendingLoss?.playerUid !== uid) {
            throw new Error('Voce nao precisa perder uma influencia agora.');
        }

        const player = getPlayer(state, uid);
        const card = player?.influences.find((influence) => influence.id === cardId && !influence.revealed);
        if (!card) throw new Error('Escolha uma influencia valida.');

        card.revealed = true;
        state.discard.push({ id: card.id, role: card.role });
        pendingLoss.count -= 1;
        addLog(state, `${player.name} perdeu ${Rules.getRole(card.role).label}.`, 'loss', now);

        if (countInfluences(player) === 0) {
            player.eliminated = true;
            addLog(state, `${player.name} foi eliminado.`, 'elimination', now);
        }

        if (finishIfWinner(state, now)) return state;
        if (pendingLoss.count > 0) return state;

        const continuation = pendingLoss.continuation;
        state.pendingLoss = null;
        continueAfterLoss(state, continuation, now);
        state.updatedAt = now;
        return state;
    }

    function continueAfterLoss(state, continuation, now) {
        if (continuation === 'resume-action') {
            state.phase = PHASES.RESPONSE;
            state.pendingAction.passes = {};
            state.deadline = now + SETTINGS.responseSeconds * 1000;
            return;
        }
        if (continuation === 'execute-action') {
            executePendingAction(state, now);
            return;
        }
        if (continuation === 'accept-block' || continuation === 'cancel-action' || continuation === 'end-turn') {
            endTurn(state, now);
        }
    }

    function acceptBlock(state, now = Date.now()) {
        const blocker = getPlayer(state, state.pendingAction?.block?.uid);
        if (blocker) addLog(state, `O bloqueio de ${blocker.name} foi aceito.`, 'block', now);
        endTurn(state, now);
    }

    function executePendingAction(state, now = Date.now()) {
        const pending = state.pendingAction;
        if (!pending) return state;
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
                endTurn(state, now);
                break;
            case ACTIONS.STEAL: {
                const amount = Math.min(2, target.coins);
                target.coins -= amount;
                actor.coins += amount;
                addLog(state, `${actor.name} roubou ${amount} moeda(s) de ${target.name}.`, 'action-result', now);
                endTurn(state, now);
                break;
            }
            case ACTIONS.COUP:
            case ACTIONS.ASSASSINATE:
                scheduleLoss(
                    state,
                    target.uid,
                    pending.type === ACTIONS.COUP ? 'Vitima de Golpe de Estado.' : 'Vitima de assassinato.',
                    'end-turn',
                    now
                );
                break;
            case ACTIONS.EXCHANGE_AMBASSADOR:
            case ACTIONS.EXCHANGE_INQUISITOR:
                beginExchange(state, actor.uid, now);
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

    function beginExchange(state, uid, now) {
        const player = getPlayer(state, uid);
        const hidden = player.influences.filter((card) => !card.revealed);
        const revealed = player.influences.filter((card) => card.revealed);
        const drawn = state.deck.splice(Math.max(0, state.deck.length - 2), 2).map((card) => ({ ...card, revealed: false }));
        player.influences = revealed;
        state.pendingExchange = { playerUid: uid, keepCount: hidden.length, options: [...hidden, ...drawn] };
        state.phase = PHASES.EXCHANGE;
        state.deadline = now + SETTINGS.selectionSeconds * 1000;
    }

    function completeExchange(state, uid, keepIds, now = Date.now()) {
        normalizeState(state);
        const pending = state.pendingExchange;
        if (state.phase !== PHASES.EXCHANGE || pending?.playerUid !== uid) throw new Error('Nao ha troca pendente.');
        const uniqueIds = [...new Set(keepIds || [])];
        if (uniqueIds.length !== pending.keepCount) throw new Error(`Escolha ${pending.keepCount} influencia(s).`);
        if (uniqueIds.some((id) => !pending.options.some((card) => card.id === id))) throw new Error('Escolha de troca invalida.');

        const player = getPlayer(state, uid);
        const kept = pending.options.filter((card) => uniqueIds.includes(card.id));
        const returned = pending.options.filter((card) => !uniqueIds.includes(card.id)).map(({ id, role }) => ({ id, role }));
        player.influences.push(...kept.map((card) => ({ ...card, revealed: false })));
        state.deck = Rules.shuffle([...state.deck, ...returned]);
        state.pendingExchange = null;
        addLog(state, `${player.name} concluiu a troca.`, 'action-result', now);
        endTurn(state, now);
        return state;
    }

    function beginExamine(state, actorUid, targetUid, now) {
        const target = getPlayer(state, targetUid);
        const hidden = target.influences.filter((card) => !card.revealed);
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
        if (state.phase !== PHASES.EXAMINE || pending?.actorUid !== uid) throw new Error('Nao ha investigacao pendente.');

        if (replace && state.deck.length > 0) {
            const target = getPlayer(state, pending.targetUid);
            const index = target.influences.findIndex((card) => card.id === pending.cardId && !card.revealed);
            if (index >= 0) {
                const oldCard = target.influences[index];
                const replacement = state.deck.pop();
                target.influences[index] = { ...replacement, revealed: false };
                state.deck = Rules.shuffle([...state.deck, { id: oldCard.id, role: oldCard.role }]);
            }
        }

        addLog(state, `${getPlayer(state, uid).name} concluiu a investigacao.`, 'action-result', now);
        state.pendingExamine = null;
        endTurn(state, now);
        return state;
    }

    function endTurn(state, now = Date.now()) {
        state.pendingAction = null;
        state.pendingLoss = null;
        state.pendingExchange = null;
        state.pendingExamine = null;
        if (finishIfWinner(state, now)) return state;

        let nextIndex = state.turnIndex;
        for (let attempts = 0; attempts < state.turnOrder.length; attempts += 1) {
            nextIndex = (nextIndex + 1) % state.turnOrder.length;
            const candidate = getPlayer(state, state.turnOrder[nextIndex]);
            if (candidate && !candidate.eliminated && countInfluences(candidate) > 0) break;
        }
        state.turnIndex = nextIndex;
        state.turnNumber += 1;
        state.phase = PHASES.TURN;
        state.deadline = now + SETTINGS.turnSeconds * 1000;
        state.updatedAt = now;
        addLog(state, `Turno de ${getPlayer(state, getActiveUid(state)).name}.`, 'turn', now);
        return state;
    }

    function finishIfWinner(state, now = Date.now()) {
        if (state.status !== 'active') return state.status === PHASES.FINISHED;
        const alive = getAlivePlayers(state);
        if (alive.length !== 1) return false;
        state.status = PHASES.FINISHED;
        state.phase = PHASES.FINISHED;
        state.winnerUid = alive[0].uid;
        state.deadline = null;
        state.pendingAction = null;
        state.pendingLoss = null;
        state.pendingExchange = null;
        state.pendingExamine = null;
        addLog(state, `${alive[0].name} venceu a partida ranqueada.`, 'winner', now);
        state.updatedAt = now;
        return true;
    }

    function advanceExpired(state, now = Date.now()) {
        normalizeState(state);
        if (!state.deadline || now < state.deadline || state.status !== 'active') return false;

        if (state.phase === PHASES.TURN) {
            const activeUid = getActiveUid(state);
            const activePlayer = getPlayer(state, activeUid);
            if (activePlayer.coins >= SETTINGS.mandatoryCoupCoins) {
                const target = getAlivePlayers(state).find((player) => player.uid !== activeUid);
                performAction(state, activeUid, ACTIONS.COUP, target.uid, now);
            } else {
                performAction(state, activeUid, ACTIONS.INCOME, null, now);
            }
        } else if (state.phase === PHASES.RESPONSE) {
            executePendingAction(state, now);
        } else if (state.phase === PHASES.BLOCK_CHALLENGE) {
            acceptBlock(state, now);
        } else if (state.phase === PHASES.INFLUENCE_LOSS) {
            const player = getPlayer(state, state.pendingLoss?.playerUid);
            const card = player?.influences?.find((influence) => !influence.revealed);
            if (card) loseInfluence(state, player.uid, card.id, now);
            else endTurn(state, now);
        } else if (state.phase === PHASES.EXCHANGE) {
            completeExchange(
                state,
                state.pendingExchange.playerUid,
                state.pendingExchange.options.slice(0, state.pendingExchange.keepCount).map((card) => card.id),
                now
            );
        } else if (state.phase === PHASES.EXAMINE) {
            completeExamine(state, state.pendingExamine.actorUid, false, now);
        }
        return true;
    }

    return Object.freeze({
        createState,
        normalizeState,
        joinPlayer,
        setConnected,
        leaveWaitingRoom,
        toggleReady,
        maybeStart,
        performAction,
        passResponse,
        challengeAction,
        declareBlock,
        challengeBlock,
        loseInfluence,
        completeExchange,
        completeExamine,
        advanceExpired,
        getPlayers,
        getAlivePlayers,
        getPlayer,
        getActiveUid,
        getBlockClaimsForPlayer,
        countInfluences
    });
});


