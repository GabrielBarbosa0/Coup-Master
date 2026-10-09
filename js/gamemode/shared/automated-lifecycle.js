(function initializeAutomatedLifecycle(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupAutomatedLifecycle = api;
})(typeof window !== 'undefined' ? window : null, function createAutomatedLifecycleModule() {
    function create(Rules, Model, Profile, options = {}) {
        if (!Rules || !Model || !Profile) {
            throw new Error('Regras, modelo e perfil são obrigatórios para criar o ciclo automatizado.');
        }

        const { PHASES, ROLES, SETTINGS } = Rules;
        const {
            getPlayers,
            getPlayer,
            getActiveUid,
            nextFreeSeat
        } = Model;
        const normalizeStateExtension = options.normalizeStateExtension || (() => {});
        const getRequiredPlayerCount = options.getRequiredPlayerCount
            || (() => SETTINGS.minPlayers);
        const prepareRestart = options.prepareRestart || (() => {});
        const resetPlayerForRestart = options.resetPlayerForRestart || defaultResetPlayerForRestart;
        const completeRestart = options.completeRestart || (() => {});
        const modeLabel = options.modeLabel || 'automatizada';
        const startMessage = options.startMessage || `A partida ${modeLabel} começou. Sorteando quem joga primeiro.`;
        const allowAiReadyOverride = options.allowAiReadyOverride !== false;

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
                pendingTransition: null,
                matchStats: {},
                hasPostDealCardDraw: false,
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
            if (typeof state.hasPostDealCardDraw !== 'boolean') {
                const publicProofExists = Array.isArray(state.publicReveals)
                    && state.publicReveals.some((event) => event?.kind === 'proof');
                const publicDrawActionExists = state.log.some((entry) => entry?.type === 'action-result'
                    && /concluiu (a troca|a investigação)/i.test(entry.message || ''));
                state.hasPostDealCardDraw = publicProofExists || publicDrawActionExists;
            }
            state.starterDraw = state.starterDraw && typeof state.starterDraw === 'object'
                ? state.starterDraw
                : null;
            state.pendingTransition = state.pendingTransition && typeof state.pendingTransition === 'object'
                ? state.pendingTransition
                : null;
            state.matchStats = state.matchStats && typeof state.matchStats === 'object' ? state.matchStats : {};
            state.matchId = Number.isFinite(Number(state.matchId)) ? Number(state.matchId) : 0;
            state.readyCountdownStartedAt = state.readyCountdownStartedAt || null;
            normalizeStateExtension(state);
            Object.values(state.players).forEach((player) => {
                player.influences = Array.isArray(player.influences) ? player.influences : [];
                player.investigationExposure = player.investigationExposure
                    && typeof player.investigationExposure === 'object'
                    && !Array.isArray(player.investigationExposure) ? player.investigationExposure : {};
                Object.entries(player.investigationExposure).forEach(([observerUid, exposure]) => {
                    if (exposure?.cardId && exposure?.role) {
                        player.investigationExposure[observerUid] = { [exposure.cardId]: exposure.role };
                    } else if (!exposure || typeof exposure !== 'object' || Array.isArray(exposure)) {
                        delete player.investigationExposure[observerUid];
                    }
                });
                player.coins = Number.isFinite(Number(player.coins))
                    ? Number(player.coins)
                    : SETTINGS.startingCoins;
                player.eliminated = Boolean(player.eliminated);
                player.ai = Boolean(player.ai);
                if (player.ai) {
                    player.connected = true;
                    player.ready = player.ready !== false;
                    player.grudges = player.grudges && typeof player.grudges === 'object' ? player.grudges : {};
                    player.favors = player.favors && typeof player.favors === 'object' && !Array.isArray(player.favors)
                        ? player.favors
                        : {};
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

        function drawStartingInfluence(state) {
            for (let index = state.deck.length - 1; index >= 0; index -= 1) {
                if (state.deck[index]?.role !== ROLES.AMBASSADOR) {
                    return state.deck.splice(index, 1)[0];
                }
            }
            throw new Error('Não há cartas iniciais válidas suficientes no baralho.');
        }

        function playerHasHiddenRole(player, role) {
            return Boolean(player?.influences?.some((card) => !card.revealed && card.role === role));
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

            if (state.status !== PHASES.WAITING) throw new Error(`A partida ${modeLabel} já começou.`);
            pruneDisconnectedWaitingPlayers(state, user.uid, now);
            const seat = nextFreeSeat(state);
            if (!seat) throw new Error(`A sala ${modeLabel} está cheia.`);

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

        function addAiPlayer(state, aiOptions = {}, now = Date.now(), random = Math.random) {
            normalizeState(state);
            if (state.status !== PHASES.WAITING) throw new Error(`A partida ${modeLabel} já começou.`);
            const seat = nextFreeSeat(state);
            if (!seat) throw new Error(`A sala ${modeLabel} está cheia.`);

            const rawName = String(aiOptions.name || '').trim();
            const name = rawName.slice(0, 24) || `Bot ${seat}`;
            const duplicated = getPlayers(state).some((player) => (
                player.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR')
            ));
            if (duplicated) throw new Error('Já existe um jogador com esse nome.');

            const uid = aiOptions.uid || `rank-bot-${now}-${Math.floor(random() * 100000)}`;
            const ready = allowAiReadyOverride && aiOptions.ready !== undefined
                ? Boolean(aiOptions.ready)
                : true;
            state.players[uid] = {
                uid,
                name,
                photo: aiOptions.photo || 'assets/img/icons/robot.svg',
                seat,
                connected: true,
                ready,
                ai: true,
                personality: normalizeBotPersonality(aiOptions.personality, random),
                personalityHidden: !aiOptions.personality,
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

        function toggleReady(state, uid, now = Date.now()) {
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
            const requiredPlayers = Math.max(
                SETTINGS.minPlayers,
                Math.min(SETTINGS.maxPlayers, Number(getRequiredPlayerCount(state, players)) || SETTINGS.minPlayers)
            );
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
                addLog(
                    state,
                    `Todos estão prontos. A partida começa em ${SETTINGS.readyCountdownSeconds} segundos.`,
                    'system',
                    now
                );
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

            state.exchangeRole = random() < 0.5 ? ROLES.AMBASSADOR : ROLES.INQUISITOR;
            state.deck = Rules.createDeck(random, state.exchangeRole);
            state.discard = [];
            state.turnOrder = players.map((player) => player.uid);
            state.turnIndex = Math.max(0, state.turnOrder.indexOf(starterUid));
            state.turnNumber = 0;
            state.matchId = Number(state.matchId || 0) + 1;
            state.winnerUid = null;
            state.startedAt = now;
            state.finishedAt = null;
            state.matchStats = {};
            state.hasPostDealCardDraw = false;
            state.readyCountdownStartedAt = null;

            players.forEach((player) => {
                player.coins = SETTINGS.startingCoins;
                player.eliminated = false;
                player.ready = false;
                player.influences = [];
                if (player.ai) player.favors = {};
                Profile.ensureMatchStats(state, player.uid);
                for (let index = 0; index < SETTINGS.startingInfluences; index += 1) {
                    const card = drawStartingInfluence(state);
                    player.influences.push({ ...card, revealed: false });
                }
            });

            state.status = 'active';
            addLog(state, `Personagem desta partida: ${Rules.getRole(state.exchangeRole).label}.`, 'important', now);
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
            addLog(state, startMessage, 'important', now);
            state.updatedAt = now;
            return true;
        }

        function restartMatch(state, now = Date.now()) {
            normalizeState(state);
            if (state.status !== PHASES.FINISHED) throw new Error('A partida ainda não foi finalizada.');

            prepareRestart(state, now, { getPlayers, normalizeBotPersonality });
            getPlayers(state).forEach((player) => {
                resetPlayerForRestart(player, { SETTINGS, normalizeBotPersonality });
            });

            state.status = PHASES.WAITING;
            state.phase = PHASES.WAITING;
            state.turnOrder = [];
            state.turnIndex = 0;
            state.turnNumber = 0;
            state.deck = [];
            state.discard = [];
            state.log = [];
            state.exchangeRole = null;
            state.deadline = null;
            state.starterDraw = null;
            state.pendingAction = null;
            state.pendingLoss = null;
            state.pendingExchange = null;
            state.pendingExamine = null;
            state.matchStats = {};
            state.hasPostDealCardDraw = false;
            state.readyCountdownStartedAt = null;
            state.winnerUid = null;
            state.startedAt = null;
            state.finishedAt = null;
            completeRestart(state, now);
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
            const cardCount = getPlayers(state)
                .reduce((total, player) => total + (player.influences?.length || 0), 0);
            const dealDuration = SETTINGS.dealCardDurationMs
                + Math.max(0, cardCount - 1) * SETTINGS.dealCardStaggerMs
                + SETTINGS.dealSettleMs;
            state.turnNumber = 0;
            state.phase = PHASES.DEALING;
            state.deadline = now + dealDuration;
            if (state.starterDraw) state.starterDraw.completedAt = now;
            addLog(state, 'Distribuindo as cartas da partida.', 'system', now);
            state.updatedAt = now;
            return true;
        }

        function completeInitialDeal(state, now = Date.now()) {
            normalizeState(state);
            if (state.status !== 'active' || state.phase !== PHASES.DEALING) return false;
            state.turnNumber = 1;
            state.phase = PHASES.TURN;
            state.deadline = now + SETTINGS.turnSeconds * 1000;
            addLog(
                state,
                `${getPlayer(state, getActiveUid(state))?.name || 'O jogador sorteado'} começa a partida.`,
                'turn',
                now
            );
            state.updatedAt = now;
            return true;
        }

        function bumpGrudge(state, playerUid, offenderUid, amount = 1) {
            const player = getPlayer(state, playerUid);
            const offender = getPlayer(state, offenderUid);
            if (!player?.ai || !offender || playerUid === offenderUid) return;
            player.grudges = player.grudges && typeof player.grudges === 'object' ? player.grudges : {};
            player.grudges[offenderUid] = Math.max(0, Number(player.grudges[offenderUid] || 0) + amount);
        }

        function defaultResetPlayerForRestart(player) {
            player.connected = player.ai ? true : player.connected !== false;
            player.ready = Boolean(player.ai);
            player.coins = SETTINGS.startingCoins;
            player.influences = [];
            player.eliminated = false;
            if (player.ai) {
                player.grudges = {};
                player.personality = normalizeBotPersonality(player.personality);
            }
        }

        return Object.freeze({
            createState,
            normalizeState,
            clampPercent,
            createRandomBotPersonality,
            normalizeBotPersonality,
            addLog,
            playerHasHiddenRole,
            joinPlayer,
            addAiPlayer,
            setConnected,
            leaveWaitingRoom,
            toggleReady,
            arePlayersReadyToStart,
            updateReadyCountdown,
            maybeStart,
            restartMatch,
            completeStarterDraw,
            completeInitialDeal,
            bumpGrudge
        });
    }

    return Object.freeze({ create });
});
