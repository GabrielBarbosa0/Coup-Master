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

    const { ACTIONS, PHASES, ROLES, SETTINGS } = Rules;
    const MATCHMAKING_BOT_JOIN_MIN_MS = 800;
    const MATCHMAKING_BOT_JOIN_SPAN_MS = 800;
    const MATCHMAKING_READY_MIN_MS = 1000;
    const MATCHMAKING_READY_SPAN_MS = 1000;
    const MATCHMAKING_BOT_NAMES = Object.freeze([
        'Augusto', 'Berenice', 'Cassandra', 'Dario', 'Eloisa', 'Fausto',
        'Gael', 'Helena', 'Icaro', 'Dama do Véu', 'Barão Âmbar', 'Mauro',
        'Nadia', 'Otavio', 'Pilar', 'Quintino', 'Rafaela', 'Silas',
        'Véu Carmesim', 'Ulisses', 'Valentina', 'Xavier', 'Lady Lótus', 'Zeca',
        'Duque Cinzento', 'Capitão Falso', 'Condessa Fria', 'Inquisidor Mudo',
        'Baronesa Vesper', 'Lorde Sombra', 'Dama Fortuna', 'Arauto Azul',
        'Marquês Oculto', 'Visconde Sete', 'Oráculo da Corte', 'Máscara Rubra',
        'Corvo Real', 'Duelista Nobre', 'Escriba Cego', 'General de Seda'
    ]);

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
            starterDraw: null,
            pendingAction: null,
            pendingLoss: null,
            pendingExchange: null,
            pendingExamine: null,
            matchStats: {},
            matchId: 0,
            readyCountdownStartedAt: null,
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
        state.starterDraw = state.starterDraw && typeof state.starterDraw === 'object' ? state.starterDraw : null;
        state.matchStats = state.matchStats && typeof state.matchStats === 'object' ? state.matchStats : {};
        state.matchId = Number.isFinite(Number(state.matchId)) ? Number(state.matchId) : 0;
        state.readyCountdownStartedAt = state.readyCountdownStartedAt || null;
        state.matchmaking = state.matchmaking && typeof state.matchmaking === 'object' ? state.matchmaking : null;
        if (state.matchmaking) {
            const targetPlayers = Number(state.matchmaking.targetPlayers);
            state.matchmaking.enabled = state.matchmaking.enabled !== false;
            state.matchmaking.targetPlayers = Number.isFinite(targetPlayers)
                ? Math.max(SETTINGS.minPlayers, Math.min(SETTINGS.maxPlayers, Math.round(targetPlayers)))
                : SETTINGS.maxPlayers;
            state.matchmaking.startedAt = Number(state.matchmaking.startedAt) || state.createdAt || Date.now();
            state.matchmaking.nextBotAt = state.matchmaking.nextBotAt || null;
            state.matchmaking.nextReadyAt = state.matchmaking.nextReadyAt || null;
            state.matchmaking.botReadyAt = state.matchmaking.botReadyAt && typeof state.matchmaking.botReadyAt === 'object'
                ? state.matchmaking.botReadyAt
                : {};
            state.matchmaking.filledAt = state.matchmaking.filledAt || null;
        }
        Object.values(state.players).forEach((player) => {
            player.influences = Array.isArray(player.influences) ? player.influences : [];
            player.coins = Number.isFinite(Number(player.coins)) ? Number(player.coins) : SETTINGS.startingCoins;
            player.eliminated = Boolean(player.eliminated);
            player.ai = Boolean(player.ai);
            if (player.ai) {
                player.connected = true;
                player.ready = player.ready !== false;
                player.grudges = player.grudges && typeof player.grudges === 'object' ? player.grudges : {};
                player.personality = normalizeBotPersonality(player.personality);
            }
        });
        return state;
    }

    function clampPercent(value, fallback = 50) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(0, Math.min(100, Math.round(number)));
    }

    function createRandomBotPersonality(random = Math.random) {
        const roll = () => Math.floor(random() * 101);
        return {
            vengefulness: roll(),
            honesty: roll(),
            skepticism: roll()
        };
    }

    function randomDelay(random, min, span) {
        return min + Math.floor(random() * span);
    }

    function randomItem(items, random = Math.random) {
        if (!items.length) return null;
        return items[Math.floor(random() * items.length)] || items[0];
    }

    function ensureMatchmaking(state, now = Date.now(), random = Math.random) {
        normalizeState(state);
        if (!state.matchmaking) {
            state.matchmaking = {
                enabled: true,
                targetPlayers: SETTINGS.maxPlayers,
                startedAt: now,
                nextBotAt: null,
                nextReadyAt: null,
                botReadyAt: {},
                filledAt: null
            };
        }
        state.matchmaking.enabled = true;
        state.matchmaking.targetPlayers = Math.max(
            SETTINGS.minPlayers,
            Math.min(SETTINGS.maxPlayers, Number(state.matchmaking.targetPlayers) || SETTINGS.maxPlayers)
        );
        state.matchmaking.startedAt = state.matchmaking.startedAt || now;
        return state.matchmaking;
    }

    function pickMatchmakingBotName(state, random = Math.random) {
        const usedNames = new Set(getPlayers(state).map((player) => (
            String(player.name || '').toLocaleLowerCase('pt-BR')
        )));
        const available = MATCHMAKING_BOT_NAMES.filter((name) => !usedNames.has(name.toLocaleLowerCase('pt-BR')));
        const names = available.length ? available : MATCHMAKING_BOT_NAMES;
        return names[Math.floor(random() * names.length)] || `Bot ${getPlayers(state).length + 1}`;
    }

    function scheduleBotReady(matchmaking, uid, now = Date.now(), random = Math.random) {
        matchmaking.botReadyAt = matchmaking.botReadyAt && typeof matchmaking.botReadyAt === 'object'
            ? matchmaking.botReadyAt
            : {};
        if (!matchmaking.botReadyAt[uid]) {
            matchmaking.botReadyAt[uid] = now + randomDelay(random, MATCHMAKING_READY_MIN_MS, MATCHMAKING_READY_SPAN_MS);
            return true;
        }
        return false;
    }

    function syncBotReadySchedule(state, matchmaking, now = Date.now(), random = Math.random) {
        let changed = false;
        const playersByUid = state.players || {};
        matchmaking.botReadyAt = matchmaking.botReadyAt && typeof matchmaking.botReadyAt === 'object'
            ? matchmaking.botReadyAt
            : {};

        Object.keys(matchmaking.botReadyAt).forEach((uid) => {
            const player = playersByUid[uid];
            if (!player || !player.ai || player.ready) {
                delete matchmaking.botReadyAt[uid];
                changed = true;
            }
        });

        getPlayers(state).forEach((player) => {
            if (player.ai && !player.ready && scheduleBotReady(matchmaking, player.uid, now, random)) {
                changed = true;
            }
        });

        return changed;
    }

    function pickDueReadyBot(state, matchmaking, now = Date.now(), random = Math.random) {
        const dueBots = getPlayers(state).filter((player) => (
            player.ai && !player.ready && Number(matchmaking.botReadyAt?.[player.uid] || 0) <= now
        ));
        return randomItem(dueBots, random);
    }

    function normalizeBotPersonality(personality, random = Math.random) {
        const source = personality && typeof personality === 'object'
            ? personality
            : createRandomBotPersonality(random);
        return {
            vengefulness: clampPercent(source.vengefulness),
            honesty: clampPercent(source.honesty),
            skepticism: clampPercent(source.skepticism)
        };
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

    function createPlayerMatchStats() {
        return {
            actions: 0,
            bluffs: 0,
            provenBluffs: 0,
            blockedActions: 0,
            challenges: 0,
            successfulChallenges: 0,
            failedChallenges: 0,
            coups: 0,
            assassinations: 0,
            steals: 0,
            coinsStolen: 0
        };
    }

    function ensureMatchStats(state, uid) {
        normalizeState(state);
        state.matchStats[uid] = {
            ...createPlayerMatchStats(),
            ...(state.matchStats[uid] || {})
        };
        return state.matchStats[uid];
    }

    function drawStartingInfluence(state) {
        for (let index = state.deck.length - 1; index >= 0; index -= 1) {
            if (state.deck[index]?.role !== Rules.ROLES.AMBASSADOR) {
                return state.deck.splice(index, 1)[0];
            }
        }
        throw new Error('Não há cartas iniciais válidas suficientes no baralho.');
    }

    function playerHasHiddenRole(player, role) {
        return Boolean(player?.influences?.some((card) => !card.revealed && card.role === role));
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
        if (!user?.uid) throw new Error('Usuário inválido.');
        const existing = getPlayer(state, user.uid);

        if (existing) {
            existing.connected = true;
            existing.name = user.name || existing.name;
            existing.photo = user.photo || existing.photo;
            updateReadyCountdown(state, now);
            state.updatedAt = now;
            return state;
        }

        if (state.status !== PHASES.WAITING) throw new Error('A partida ranqueada já começou.');
        pruneDisconnectedWaitingPlayers(state, user.uid, now);
        const seat = nextFreeSeat(state);
        if (!seat) throw new Error('A sala ranqueada está cheia.');

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
        updateReadyCountdown(state, now);
        state.updatedAt = now;
        return state;
    }

    function addAiPlayer(state, options = {}, now = Date.now(), random = Math.random) {
        normalizeState(state);
        if (state.status !== PHASES.WAITING) throw new Error('A partida ranqueada já começou.');
        const seat = nextFreeSeat(state);
        if (!seat) throw new Error('A sala ranqueada está cheia.');

        const rawName = String(options.name || '').trim();
        const name = rawName.slice(0, 24) || `Bot ${seat}`;
        const duplicated = getPlayers(state).some((player) => (
            player.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR')
        ));
        if (duplicated) throw new Error('Já existe um jogador com esse nome.');

        const uid = options.uid || `rank-bot-${now}-${Math.floor(random() * 100000)}`;
        state.players[uid] = {
            uid,
            name,
            photo: options.photo || 'assets/img/icons/robot.svg',
            seat,
            connected: true,
            ready: options.ready !== undefined ? Boolean(options.ready) : true,
            ai: true,
            personality: normalizeBotPersonality(options.personality, random),
            personalityHidden: !options.personality,
            grudges: {},
            coins: SETTINGS.startingCoins,
            influences: [],
            eliminated: false,
            joinedAt: now
        };
        addLog(state, `${name} entrou como jogador IA.`, 'system', now);
        updateReadyCountdown(state, now);
        state.updatedAt = now;
        return state;
    }

    function advanceMatchmaking(state, now = Date.now(), random = Math.random) {
        normalizeState(state);
        if (state.status !== PHASES.WAITING) return false;

        const players = getPlayers(state);
        const humanPlayers = players.filter((player) => !player.ai);
        if (!humanPlayers.length) return false;

        const matchmaking = ensureMatchmaking(state, now, random);
        if (!matchmaking.enabled) return false;

        const scheduleChanged = syncBotReadySchedule(state, matchmaking, now, random);
        const readyBot = pickDueReadyBot(state, matchmaking, now, random);
        if (readyBot) {
            readyBot.ready = true;
            delete matchmaking.botReadyAt[readyBot.uid];
            addLog(state, `${readyBot.name} confirmou prontidão.`, 'system', now);
            updateReadyCountdown(state, now);
            state.updatedAt = now;
            return true;
        }

        if (players.length < matchmaking.targetPlayers) {
            if (!matchmaking.nextBotAt) {
                matchmaking.nextBotAt = now + randomDelay(random, MATCHMAKING_BOT_JOIN_MIN_MS, MATCHMAKING_BOT_JOIN_SPAN_MS);
                state.updatedAt = now;
                return true;
            }
            if (now < matchmaking.nextBotAt) return false;

            const name = pickMatchmakingBotName(state, random);
            addAiPlayer(state, {
                name,
                ready: false,
                personality: createRandomBotPersonality(random)
            }, now, random);
            const bot = getPlayers(state).find((player) => player.name === name && player.ai && !player.ready);
            if (bot) scheduleBotReady(matchmaking, bot.uid, now, random);

            const filled = getPlayers(state).length >= matchmaking.targetPlayers;
            matchmaking.nextBotAt = filled
                ? null
                : now + randomDelay(random, MATCHMAKING_BOT_JOIN_MIN_MS, MATCHMAKING_BOT_JOIN_SPAN_MS);
            matchmaking.filledAt = filled ? now : null;
            addLog(state, `Matchmaking encontrou ${name}.`, 'system', now);
            updateReadyCountdown(state, now);
            state.updatedAt = now;
            return true;
        }

        matchmaking.filledAt = matchmaking.filledAt || now;
        matchmaking.nextBotAt = null;

        if (scheduleChanged) {
            state.updatedAt = now;
            return true;
        }

        const previousCountdown = state.readyCountdownStartedAt;
        const previousDeadline = state.deadline;
        updateReadyCountdown(state, now);
        if (previousCountdown !== state.readyCountdownStartedAt || previousDeadline !== state.deadline) {
            state.updatedAt = now;
            return true;
        }
        return false;
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
        updateReadyCountdown(state, now);
        state.updatedAt = now;
        return state;
    }

    function toggleReady(state, uid, now = Date.now(), random = Math.random) {
        normalizeState(state);
        if (state.status !== PHASES.WAITING) throw new Error('A partida já começou.');
        const player = getPlayer(state, uid);
        if (!player) throw new Error('Jogador não encontrado.');
        pruneDisconnectedWaitingPlayers(state, uid, now);
        player.ready = !player.ready;
        addLog(state, `${player.name} ${player.ready ? 'está pronto' : 'cancelou a prontidão'}.`, 'system', now);
        updateReadyCountdown(state, now);
        state.updatedAt = now;
        return state;
    }

    function pruneDisconnectedWaitingPlayers(state, preservedUid, now) {
        if (state.status !== PHASES.WAITING) return;
        let pruned = false;
        Object.values(state.players || {}).forEach((player) => {
            if (player.uid !== preservedUid && player.connected === false) {
                delete state.players[player.uid];
                pruned = true;
                addLog(state, `${player.name} deixou a sala antes do início.`, 'system', now);
            }
        });
        if (pruned) updateReadyCountdown(state, now);
    }

    function arePlayersReadyToStart(state) {
        const players = getPlayers(state);
        const matchmaking = state.matchmaking?.enabled ? state.matchmaking : null;
        const requiredPlayers = matchmaking
            ? Math.max(SETTINGS.minPlayers, Math.min(SETTINGS.maxPlayers, Number(matchmaking.targetPlayers) || SETTINGS.maxPlayers))
            : SETTINGS.minPlayers;
        return players.length >= requiredPlayers && players.every((player) => player.ready);
    }

    function updateReadyCountdown(state, now = Date.now()) {
        if (state.status !== PHASES.WAITING) return false;
        if (!arePlayersReadyToStart(state)) {
            state.readyCountdownStartedAt = null;
            state.deadline = null;
            return false;
        }

        if (!state.readyCountdownStartedAt) {
            state.readyCountdownStartedAt = now;
            state.deadline = now + SETTINGS.readyCountdownSeconds * 1000;
            addLog(state, `Todos estão prontos. A partida começa em ${SETTINGS.readyCountdownSeconds} segundos.`, 'system', now);
        }
        return true;
    }

    function maybeStart(state, now = Date.now(), random = Math.random) {
        normalizeState(state);
        const players = getPlayers(state);
        if (!arePlayersReadyToStart(state)) {
            updateReadyCountdown(state, now);
            return false;
        }
        if (!state.deadline || now < state.deadline) {
            updateReadyCountdown(state, now);
            return false;
        }

        const starterIndex = Math.max(0, Math.min(players.length - 1, Math.floor(random() * players.length)));
        const starterUid = players[starterIndex]?.uid || players[0]?.uid || null;

        state.deck = Rules.createDeck(random);
        state.discard = [];
        state.turnOrder = players.map((player) => player.uid);
        state.turnIndex = Math.max(0, state.turnOrder.indexOf(starterUid));
        state.turnNumber = 0;
        state.matchId = Number(state.matchId || 0) + 1;
        state.winnerUid = null;
        state.startedAt = now;
        state.finishedAt = null;
        state.matchStats = {};
        state.readyCountdownStartedAt = null;

        players.forEach((player) => {
            player.coins = SETTINGS.startingCoins;
            player.eliminated = false;
            player.ready = false;
            player.influences = [];
            ensureMatchStats(state, player.uid);
            for (let index = 0; index < SETTINGS.startingInfluences; index += 1) {
                const card = drawStartingInfluence(state);
                player.influences.push({ ...card, revealed: false });
            }
        });

        state.status = 'active';
        state.phase = PHASES.STARTER_DRAW;
        state.deadline = now + SETTINGS.starterDrawSeconds * 1000;
        state.starterDraw = {
            candidates: state.turnOrder.slice(),
            winnerUid: starterUid,
            startedAt: now,
            endsAt: state.deadline
        };
        state.pendingAction = null;
        state.pendingLoss = null;
        state.pendingExchange = null;
        state.pendingExamine = null;
        addLog(state, 'A partida ranqueada começou. Sorteando quem joga primeiro.', 'important', now);
        state.updatedAt = now;
        return true;
    }

    function restartMatch(state, now = Date.now()) {
        normalizeState(state);
        if (state.status !== PHASES.FINISHED) throw new Error('A partida ainda não foi finalizada.');

        getPlayers(state).forEach((player) => {
            player.connected = player.ai ? true : player.connected !== false;
            player.ready = Boolean(player.ai);
            player.coins = SETTINGS.startingCoins;
            player.influences = [];
            player.eliminated = false;
            if (player.ai) {
                player.grudges = {};
                player.personality = normalizeBotPersonality(player.personality);
            }
        });

        state.status = PHASES.WAITING;
        state.phase = PHASES.WAITING;
        state.turnOrder = [];
        state.turnIndex = 0;
        state.turnNumber = 0;
        state.deck = [];
        state.discard = [];
        state.log = [];
        state.deadline = null;
        state.starterDraw = null;
        state.pendingAction = null;
        state.pendingLoss = null;
        state.pendingExchange = null;
        state.pendingExamine = null;
        state.matchStats = {};
        state.readyCountdownStartedAt = null;
        state.winnerUid = null;
        state.startedAt = null;
        state.finishedAt = null;
        addLog(state, 'Sala reiniciada para uma nova partida.', 'system', now);
        updateReadyCountdown(state, now);
        state.updatedAt = now;
        return state;
    }

    function completeStarterDraw(state, now = Date.now()) {
        normalizeState(state);
        if (state.status !== 'active' || state.phase !== PHASES.STARTER_DRAW) return false;
        const starterUid = state.starterDraw?.winnerUid || getActiveUid(state);
        const starterIndex = state.turnOrder.indexOf(starterUid);
        if (starterIndex >= 0) state.turnIndex = starterIndex;
        state.turnNumber = 1;
        state.phase = PHASES.TURN;
        state.deadline = now + SETTINGS.turnSeconds * 1000;
        if (state.starterDraw) state.starterDraw.completedAt = now;
        addLog(state, `${getPlayer(state, getActiveUid(state))?.name || 'O jogador sorteado'} começa a partida.`, 'turn', now);
        state.updatedAt = now;
        return true;
    }

    function validateTurnAction(state, uid, actionType, targetUid) {
        if (state.status !== 'active' || state.phase !== PHASES.TURN) throw new Error('Aguarde a etapa atual terminar.');
        if (getActiveUid(state) !== uid) throw new Error('Não é o seu turno.');

        const player = getPlayer(state, uid);
        const action = Rules.getAction(actionType);
        if (!player || player.eliminated) throw new Error('Jogador indisponivel.');
        if (!action) throw new Error('Ação inválida.');
        if (player.coins >= SETTINGS.mandatoryCoupCoins && actionType !== ACTIONS.COUP) {
            throw new Error(`Com ${SETTINGS.mandatoryCoupCoins} moedas ou mais, o Golpe de Estado é obrigatório.`);
        }
        if (player.coins < action.cost) throw new Error('Moedas insuficientes.');

        if (action.requiresTarget) {
            const target = getPlayer(state, targetUid);
            if (!target || target.uid === uid || target.eliminated || countInfluences(target) === 0) {
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
        if (action.claim && !playerHasHiddenRole(actor, action.claim)) {
            actorStats.bluffs += 1;
        }
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

    function bumpGrudge(state, playerUid, offenderUid, amount = 1) {
        const player = getPlayer(state, playerUid);
        const offender = getPlayer(state, offenderUid);
        if (!player?.ai || !offender || playerUid === offenderUid) return;
        player.grudges = player.grudges && typeof player.grudges === 'object' ? player.grudges : {};
        player.grudges[offenderUid] = Math.max(0, Number(player.grudges[offenderUid] || 0) + amount);
    }

    function getResponseUids(state) {
        const pending = state.pendingAction;
        if (!pending || state.phase !== PHASES.RESPONSE) return [];
        return getAlivePlayers(state)
            .filter((player) => canPlayerRespondToAction(state, player.uid))
            .map((player) => player.uid);
    }

    function canPlayerRespondToAction(state, uid) {
        const pending = state.pendingAction;
        const player = getPlayer(state, uid);
        if (!pending || !player || player.eliminated || uid === pending.actorUid || pending.passes?.[uid]) return false;
        const canChallenge = Boolean(pending.claim && !pending.claimConfirmed);
        const canBlock = getBlockClaimsForPlayer(state, uid).length > 0;
        return canChallenge || canBlock;
    }

    function getBlockClaimsForPlayer(state, uid) {
        const pending = state.pendingAction;
        const action = pending ? Rules.getAction(pending.type) : null;
        if (!pending || !action || state.phase !== PHASES.RESPONSE || uid === pending.actorUid) return [];
        if (pending.type === ACTIONS.STEAL && pending.targetUid !== uid) {
            return action.blockClaims.includes(ROLES.CAPTAIN) ? [ROLES.CAPTAIN] : [];
        }
        if (action.blockScope === 'target' && pending.targetUid !== uid) return [];
        return action.blockClaims.slice();
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
        const truthfulCard = actor.influences.find((card) => !card.revealed && card.role === pending.claim);
        const challengerStats = ensureMatchStats(state, challengerUid);
        challengerStats.challenges += 1;
        addLog(state, `${getPlayer(state, challengerUid).name} contestou ${actor.name}.`, 'challenge', now);

        if (truthfulCard) {
            challengerStats.failedChallenges += 1;
            if (!isExchangeAction(pending.type)) {
                replaceProvenInfluence(state, actor.uid, truthfulCard.id);
            }
            pending.claimConfirmed = true;
            addLog(state, `${actor.name} provou ter ${Rules.getRole(pending.claim).label}.`, 'challenge-result', now);
            const lossPlan = getFailedActionChallengeLossPlan(state, challengerUid);
            scheduleLoss(state, challengerUid, lossPlan.reason, lossPlan.continuation, now, lossPlan.count);
        } else {
            challengerStats.successfulChallenges += 1;
            ensureMatchStats(state, actor.uid).provenBluffs += 1;
            addLog(state, `${actor.name} não tinha ${Rules.getRole(pending.claim).label}.`, 'challenge-result', now);
            scheduleLoss(state, actor.uid, 'Blefe contestado.', 'cancel-action', now);
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
            throw new Error('Este bloqueio não é permitido.');
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
        if (state.phase !== PHASES.BLOCK_CHALLENGE || !block) throw new Error('Não há bloqueio para contestar.');
        const challenger = getPlayer(state, challengerUid);
        if (challengerUid === block.uid || !challenger || challenger.eliminated || pending.passes?.[challengerUid]) {
            throw new Error('Contestação inválida.');
        }

        const blocker = getPlayer(state, block.uid);
        const truthfulCard = blocker.influences.find((card) => !card.revealed && card.role === block.claim);
        const challengerStats = ensureMatchStats(state, challengerUid);
        challengerStats.challenges += 1;
        addLog(state, `${getPlayer(state, challengerUid).name} contestou o bloqueio de ${blocker.name}.`, 'challenge', now);

        if (truthfulCard) {
            challengerStats.failedChallenges += 1;
            replaceProvenInfluence(state, blocker.uid, truthfulCard.id);
            addLog(state, `${blocker.name} provou o bloqueio.`, 'challenge-result', now);
            scheduleLoss(state, challengerUid, 'Contestação incorreta do bloqueio.', 'accept-block', now);
        } else {
            challengerStats.successfulChallenges += 1;
            ensureMatchStats(state, blocker.uid).provenBluffs += 1;
            const lossPlan = getBluffedBlockLossPlan(state, blocker.uid);
            addLog(state, `${blocker.name} blefou o bloqueio.`, 'challenge-result', now);
            scheduleLoss(state, blocker.uid, 'Bloqueio blefado.', lossPlan.continuation, now, lossPlan.count);
        }
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
            return { count: Math.min(2, Math.max(1, countInfluences(getPlayer(state, blockerUid)))), continuation: 'end-turn' };
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
    }

    function scheduleLoss(state, playerUid, reason, continuation, now = Date.now(), count = 1) {
        const offenderUid = state.pendingAction?.actorUid;
        if (offenderUid && offenderUid !== playerUid) bumpGrudge(state, playerUid, offenderUid, 2);
        state.pendingLoss = { playerUid, count: Math.max(1, Number(count) || 1), reason, continuation };
        state.phase = PHASES.INFLUENCE_LOSS;
        state.deadline = now + SETTINGS.selectionSeconds * 1000;
        state.updatedAt = now;
        resolveAutomaticLossIfForced(state, now);
    }

    function revealInfluenceForLoss(state, player, card, now) {
        card.revealed = true;
        state.discard.push({ id: card.id, role: card.role });
        addLog(state, `${player.name} perdeu ${Rules.getRole(card.role).label}.`, 'loss', now);

        if (countInfluences(player) === 0) {
            player.eliminated = true;
            addLog(state, `${player.name} foi eliminado.`, 'elimination', now);
        }
    }

    function resolveAutomaticLossIfForced(state, now = Date.now()) {
        const pendingLoss = state.pendingLoss;
        const player = getPlayer(state, pendingLoss?.playerUid);
        const hidden = player?.influences?.filter((card) => !card.revealed) || [];
        if (!pendingLoss || !player || hidden.length === 0 || hidden.length > pendingLoss.count) return false;

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
        if (pendingLoss.count > 0) return state;

        const continuation = pendingLoss.continuation;
        state.pendingLoss = null;
        continueAfterLoss(state, continuation, now);
        state.updatedAt = now;
        return state;
    }

    function continueAfterLoss(state, continuation, now) {
        if (continuation === 'resume-action') {
            if (!canPendingActionContinue(state)) {
                addLog(state, 'A ação foi encerrada porque o alvo não está mais disponível.', 'action-result', now);
                endTurn(state, now);
                return;
            }
            state.phase = PHASES.RESPONSE;
            state.pendingAction.passes = {};
            const hasBlockResponse = getAlivePlayers(state).some((player) => (
                player.uid !== state.pendingAction.actorUid && getBlockClaimsForPlayer(state, player.uid).length > 0
            ));
            if (!hasBlockResponse) {
                executePendingAction(state, now);
                return;
            }
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
        if (blocker) ensureMatchStats(state, blocker.uid).blockedActions += 1;
        if (blocker) addLog(state, `O bloqueio de ${blocker.name} foi aceito.`, 'block', now);
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
            case ACTIONS.ASSASSINATE:
                if (pending.type === ACTIONS.COUP) ensureMatchStats(state, actor.uid).coups += 1;
                if (pending.type === ACTIONS.ASSASSINATE) ensureMatchStats(state, actor.uid).assassinations += 1;
                scheduleLoss(
                    state,
                    target.uid,
                    pending.type === ACTIONS.COUP ? 'Vítima de Golpe de Estado.' : 'Vítima de assassinato.',
                    'end-turn',
                    now
                );
                break;
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

    function canPendingActionContinue(state) {
        const pending = state.pendingAction;
        const action = pending ? Rules.getAction(pending.type) : null;
        const actor = pending ? getPlayer(state, pending.actorUid) : null;
        if (!pending || !action || !actor || actor.eliminated || countInfluences(actor) === 0) return false;
        if (!action.requiresTarget) return true;
        const target = getPlayer(state, pending.targetUid);
        return Boolean(target && !target.eliminated && countInfluences(target) > 0);
    }

    function isExchangeAction(actionType) {
        return [ACTIONS.EXCHANGE_AMBASSADOR, ACTIONS.EXCHANGE_INQUISITOR].includes(actionType);
    }

    function getExchangeDrawCount(actionType) {
        return actionType === ACTIONS.EXCHANGE_INQUISITOR ? 1 : 2;
    }

    function beginExchange(state, uid, actionType, now) {
        const player = getPlayer(state, uid);
        const hidden = player.influences.filter((card) => !card.revealed);
        const revealed = player.influences.filter((card) => card.revealed);
        const drawCount = getExchangeDrawCount(actionType);
        const drawn = state.deck.splice(Math.max(0, state.deck.length - drawCount), drawCount).map((card) => ({ ...card, revealed: false }));
        player.influences = revealed;
        state.pendingExchange = { playerUid: uid, keepCount: hidden.length, options: [...hidden, ...drawn] };
        state.phase = PHASES.EXCHANGE;
        state.deadline = now + SETTINGS.selectionSeconds * 1000;
    }

    function completeExchange(state, uid, keepIds, now = Date.now()) {
        normalizeState(state);
        const pending = state.pendingExchange;
        if (state.phase !== PHASES.EXCHANGE || pending?.playerUid !== uid) throw new Error('Não há troca pendente.');
        const uniqueIds = [...new Set(keepIds || [])];
        if (uniqueIds.length !== pending.keepCount) throw new Error(`Escolha ${pending.keepCount} influência(s).`);
        if (uniqueIds.some((id) => !pending.options.some((card) => card.id === id))) throw new Error('Escolha de troca inválida.');

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
        if (state.phase !== PHASES.EXAMINE || pending?.actorUid !== uid) throw new Error('Não há investigação pendente.');

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

        addLog(state, `${getPlayer(state, uid).name} concluiu a investigação.`, 'action-result', now);
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
        state.finishedAt = now;
        state.deadline = null;
        state.pendingAction = null;
        state.pendingLoss = null;
        state.pendingExchange = null;
        state.pendingExamine = null;
        addLog(state, `${alive[0].name} venceu a partida ranqueada.`, 'winner', now);
        state.updatedAt = now;
        return true;
    }

    function buildMatchResults(state, now = Date.now()) {
        normalizeState(state);
        const winnerUid = state.winnerUid || null;
        const endedAt = state.finishedAt || now;
        const players = {};

        getPlayers(state).forEach((player) => {
            const stats = ensureMatchStats(state, player.uid);
            const performance = calculateMatchPerformance(state, player);
            players[player.uid] = {
                uid: player.uid,
                name: player.name || 'Jogador',
                photo: player.photo || '',
                seat: player.seat,
                won: player.uid === winnerUid,
                eliminated: Boolean(player.eliminated),
                matchStats: { ...stats },
                performanceScore: performance.total,
                performanceBreakdown: performance.breakdown
            };
        });

        return {
            schemaVersion: 1,
            matchId: Number(state.matchId || 0),
            winnerUid,
            playerCount: Object.keys(players).length,
            startedAt: state.startedAt || state.createdAt || endedAt,
            endedAt,
            turnNumber: state.turnNumber || 0,
            players
        };
    }

    function calculateMatchPerformance(state, player) {
        const stats = ensureMatchStats(state, player.uid);
        const hiddenInfluences = countInfluences(player);
        const breakdown = [];
        const add = (label, value) => {
            const points = Number(value || 0);
            if (points) breakdown.push({ label, points });
        };

        add(player.uid === state.winnerUid ? 'Vitória' : 'Derrota', player.uid === state.winnerUid ? 30 : -8);
        add('Ações executadas', stats.actions * 2);
        add('Golpes de Estado', stats.coups * 6);
        add('Assassinatos', stats.assassinations * 7);
        add('Roubos', stats.steals * 4);
        add('Moedas roubadas', stats.coinsStolen);
        add('Bloqueios aceitos', stats.blockedActions * 4);
        add('Desafios vencidos', stats.successfulChallenges * 8);
        add('Desafios perdidos', stats.failedChallenges * -6);
        add('Blefes revelados', stats.provenBluffs * -7);
        add('Influências preservadas', hiddenInfluences * 3);
        add('Eliminação', player.eliminated ? -5 : 0);

        return {
            total: breakdown.reduce((sum, item) => sum + item.points, 0),
            breakdown
        };
    }

    function advanceExpired(state, now = Date.now(), random = Math.random) {
        normalizeState(state);
        if (!state.deadline || now < state.deadline || ![PHASES.WAITING, 'active'].includes(state.status)) return false;

        if (state.status === PHASES.WAITING) {
            return maybeStart(state, now, random);
        }

        if (state.phase === PHASES.STARTER_DRAW) {
            return completeStarterDraw(state, now);
        }

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
        addAiPlayer,
        advanceMatchmaking,
        setConnected,
        leaveWaitingRoom,
        toggleReady,
        restartMatch,
        maybeStart,
        completeStarterDraw,
        calculateMatchPerformance,
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
        getResponseUids,
        getBlockClaimsForPlayer,
        countInfluences,
        buildMatchResults
    });
});


