(function initializeRankedRenderer(root) {
    const Rules = root.CoupRankedRules;
    const Engine = root.CoupRankedEngine;
    const { ACTIONS, PHASES } = Rules;

    let controller = null;
    let state = null;
    let currentUid = null;
    let roomCode = '';
    let selectedAction = null;
    let exchangeSelection = new Set();
    let exchangeKey = '';
    let chatMessages = [];

    const quickMessages = [
        'Sou o Duque', 'Sou o Capitao', 'Sou a Condessa', 'Taxar', 'Extorquir',
        'Assassinar', 'Trocar', 'Investigar', 'Contesto', 'Bloqueio'
    ];

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function init(options) {
        controller = options.controller;
        currentUid = options.currentUid;
        roomCode = options.roomCode;
        bindStaticEvents();
        renderRoomCode();
        setupChat();
    }

    function bindStaticEvents() {
        document.getElementById('leaveRankBtn')?.addEventListener('click', () => controller.leaveRoom());
        document.getElementById('rankRoomCode')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(roomCode);
                document.getElementById('rankRoomCode').textContent = 'Codigo copiado';
                window.setTimeout(renderRoomCode, 1000);
            } catch (error) {
                showError('Nao foi possivel copiar o codigo da sala.');
            }
        });
        document.getElementById('rankRulesBtn')?.addEventListener('click', () => {
            document.getElementById('rankRulesModal').hidden = false;
        });
        document.querySelector('[data-close-rank-modal]')?.addEventListener('click', () => {
            document.getElementById('rankRulesModal').hidden = true;
        });
        document.getElementById('rankFullscreenBtn')?.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
            else document.exitFullscreen?.();
        });
        document.getElementById('rankErrorConfirm')?.addEventListener('click', () => {
            document.getElementById('rankErrorModal').hidden = true;
        });
    }

    function renderRoomCode() {
        const codeButton = document.getElementById('rankRoomCode');
        if (codeButton) codeButton.textContent = `Sala: ${roomCode || '----'}`;
    }

    function setConnectionStatus(message, connected = true) {
        const status = document.getElementById('rankConnectionStatus');
        if (!status) return;
        status.textContent = message;
        status.style.color = connected ? 'var(--rank-success)' : 'var(--rank-danger)';
    }

    function hideLoading() {
        document.getElementById('rankLoading')?.classList.add('hidden');
    }

    function showError(message) {
        const text = document.getElementById('rankErrorText');
        if (text) text.textContent = message;
        document.getElementById('rankErrorModal').hidden = false;
    }

    function render(nextState) {
        state = nextState;
        if (!state) return;
        hideLoading();
        renderPlayers();
        renderPhase();
        renderHand();
        renderLog();
        updateClock();
    }

    function renderPlayers() {
        const container = document.getElementById('rankPlayers');
        container.replaceChildren();
        const bySeat = new Map(Engine.getPlayers(state).map((player) => [player.seat, player]));
        const activeUid = Engine.getActiveUid(state);

        for (let seat = 1; seat <= Rules.SETTINGS.maxPlayers; seat += 1) {
            const player = bySeat.get(seat);
            if (!player) {
                const empty = element('article', 'rank-player-slot is-empty');
                const emptyText = element('div');
                emptyText.append(element('strong', '', `Lugar ${seat}`), element('div', 'rank-player-state', 'Aguardando jogador'));
                empty.append(emptyText);
                container.append(empty);
                continue;
            }

            const slot = element('article', 'rank-player-slot');
            if (player.uid === currentUid) slot.classList.add('is-self');
            if (player.uid === activeUid && state.status === 'active') slot.classList.add('is-active');
            if (player.eliminated) slot.classList.add('is-eliminated');

            const header = element('div', 'rank-player-header');
            const avatar = element('img', 'rank-player-avatar');
            avatar.src = player.photo || 'assets/img/icons/ghost.svg';
            avatar.alt = '';
            avatar.referrerPolicy = 'no-referrer';

            const identity = element('div');
            identity.append(
                element('div', 'rank-player-name', player.name),
                element('div', 'rank-player-state', getPlayerStateLabel(player, activeUid))
            );
            const coins = element('div', 'rank-coin-count', `${player.coins} $`);
            header.append(avatar, identity, coins);

            const hand = element('div', 'rank-opponent-hand');
            (player.influences || []).forEach((card) => {
                hand.append(createCard(card, player.uid === currentUid || card.revealed));
            });
            slot.append(header, hand);
            container.append(slot);
        }
    }

    function getPlayerStateLabel(player, activeUid) {
        if (player.eliminated) return 'Eliminado';
        if (state.status === PHASES.WAITING) return player.ready ? 'Pronto' : 'Preparando-se';
        if (player.uid === activeUid) return 'Em jogo';
        return player.connected ? 'Online' : 'Reconectando';
    }

    function createCard(card, reveal, options = {}) {
        const wrapper = element(options.button ? 'button' : 'div', 'rank-card');
        if (options.button) wrapper.type = 'button';
        if (card.revealed) wrapper.classList.add('is-revealed');
        if (options.selected) wrapper.classList.add('is-selected');
        const image = element('img');
        const role = Rules.getRole(card.role);
        image.src = reveal && role ? role.image : 'assets/img/cards/base/back.png';
        image.alt = reveal && role ? role.label : 'Influencia oculta';
        wrapper.append(image);
        return wrapper;
    }

    function renderPhase() {
        const title = document.getElementById('rankPhaseTitle');
        const description = document.getElementById('rankPhaseDescription');
        const interaction = document.getElementById('rankInteraction');
        interaction.replaceChildren();
        selectedAction = state.phase === PHASES.TURN ? selectedAction : null;

        if (state.status === PHASES.WAITING) {
            title.textContent = 'Aguardando jogadores';
            description.textContent = 'A partida comeca automaticamente quando houver pelo menos dois jogadores e todos estiverem prontos.';
            renderWaiting(interaction);
            return;
        }

        if (state.status === PHASES.FINISHED) {
            const winner = Engine.getPlayer(state, state.winnerUid);
            title.textContent = winner ? `${winner.name} venceu` : 'Partida encerrada';
            description.textContent = 'O resultado foi definido pelo fluxo automatico da partida.';
            const back = element('button', 'rank-primary-btn', 'Voltar ao lobby');
            back.type = 'button';
            back.addEventListener('click', () => controller.leaveRoom());
            interaction.append(back);
            return;
        }

        const activePlayer = Engine.getPlayer(state, Engine.getActiveUid(state));
        if (state.phase === PHASES.TURN) {
            title.textContent = `Turno de ${activePlayer?.name || 'jogador'}`;
            description.textContent = activePlayer?.uid === currentUid
                ? 'Escolha uma acao. O sistema aplicara custos, janelas de resposta e efeitos.'
                : 'Aguardando o jogador da vez escolher uma acao.';
            renderTurn(interaction, activePlayer);
        } else if (state.phase === PHASES.RESPONSE) {
            title.textContent = 'Janela de resposta';
            description.textContent = describePendingAction();
            renderActionResponse(interaction);
        } else if (state.phase === PHASES.BLOCK_CHALLENGE) {
            title.textContent = 'Bloqueio declarado';
            description.textContent = describePendingBlock();
            renderBlockChallenge(interaction);
        } else if (state.phase === PHASES.INFLUENCE_LOSS) {
            title.textContent = 'Perda de influencia';
            description.textContent = state.pendingLoss?.reason || 'Uma influencia deve ser revelada.';
            renderInfluenceLoss(interaction);
        } else if (state.phase === PHASES.EXCHANGE) {
            title.textContent = 'Troca de influencias';
            description.textContent = 'Escolha as influencias que permanecerao na sua mao.';
            renderExchange(interaction);
        } else if (state.phase === PHASES.EXAMINE) {
            title.textContent = 'Investigacao do Inquisidor';
            description.textContent = 'O Inquisidor decide se a influencia examinada permanece ou volta ao baralho.';
            renderExamine(interaction);
        }
    }

    function renderWaiting(container) {
        const list = element('div', 'rank-waiting-list');
        Engine.getPlayers(state).forEach((player) => {
            const chip = element('span', `rank-ready-chip${player.ready ? ' is-ready' : ''}`, `${player.name}: ${player.ready ? 'pronto' : 'aguardando'}`);
            list.append(chip);
        });
        const self = Engine.getPlayer(state, currentUid);
        const ready = element('button', self?.ready ? 'rank-secondary-btn' : 'rank-primary-btn', self?.ready ? 'Cancelar prontidao' : 'Estou pronto');
        ready.type = 'button';
        ready.addEventListener('click', () => controller.toggleReady());
        container.append(list, ready);
    }

    function renderTurn(container, activePlayer) {
        if (activePlayer?.uid !== currentUid) {
            container.append(element('p', 'rank-phase-description', 'As opcoes aparecerao quando chegar a sua vez.'));
            return;
        }

        if (selectedAction) {
            const action = Rules.getAction(selectedAction);
            container.append(element('h2', 'rank-interaction-title', `Escolha o alvo de ${action.label}`));
            const targets = element('div', 'rank-target-list');
            Engine.getAlivePlayers(state).filter((player) => player.uid !== currentUid).forEach((player) => {
                const button = element('button', 'rank-target-btn', `${player.name} - ${player.coins} moeda(s)`);
                button.type = 'button';
                button.addEventListener('click', () => {
                    controller.performAction(selectedAction, player.uid);
                    selectedAction = null;
                });
                targets.append(button);
            });
            const cancel = element('button', 'rank-secondary-btn', 'Cancelar');
            cancel.type = 'button';
            cancel.addEventListener('click', () => {
                selectedAction = null;
                renderPhase();
            });
            container.append(targets, cancel);
            return;
        }

        const grid = element('div', 'rank-actions-grid');
        Object.values(ACTIONS).forEach((actionType) => {
            const action = Rules.getAction(actionType);
            const button = element('button', 'rank-action-btn');
            button.type = 'button';
            button.append(document.createTextNode(action.label), element('small', '', action.description));
            const self = Engine.getPlayer(state, currentUid);
            const forcedCoup = self.coins >= Rules.SETTINGS.mandatoryCoupCoins;
            button.disabled = self.coins < action.cost || (forcedCoup && actionType !== ACTIONS.COUP);
            button.addEventListener('click', () => {
                if (action.requiresTarget) {
                    selectedAction = actionType;
                    renderPhase();
                } else {
                    controller.performAction(actionType, null);
                }
            });
            grid.append(button);
        });
        container.append(grid);
    }

    function describePendingAction() {
        const pending = state.pendingAction;
        const action = Rules.getAction(pending?.type);
        const actor = Engine.getPlayer(state, pending?.actorUid);
        const target = Engine.getPlayer(state, pending?.targetUid);
        if (!pending || !action || !actor) return 'Aguardando respostas.';
        const claim = pending.claim ? ` declarando ${Rules.getRole(pending.claim).label}` : '';
        return `${actor.name} escolheu ${action.label}${claim}${target ? ` contra ${target.name}` : ''}.`;
    }

    function describePendingBlock() {
        const block = state.pendingAction?.block;
        const blocker = Engine.getPlayer(state, block?.uid);
        return block && blocker
            ? `${blocker.name} declarou ${Rules.getRole(block.claim).label} para bloquear. O bloqueio pode ser contestado.`
            : 'Aguardando a resolucao do bloqueio.';
    }

    function canCurrentPlayerRespond(excludedUid) {
        const self = Engine.getPlayer(state, currentUid);
        return Boolean(self && !self.eliminated && self.uid !== excludedUid && !state.pendingAction?.passes?.[self.uid]);
    }

    function renderActionResponse(container) {
        const pending = state.pendingAction;
        if (!canCurrentPlayerRespond(pending.actorUid)) {
            container.append(element('p', 'rank-phase-description', 'Sua resposta foi registrada. Aguardando os demais jogadores.'));
            return;
        }

        const actions = element('div', 'rank-response-actions');
        if (pending.claim && !pending.claimConfirmed) {
            const challenge = element('button', 'rank-danger-btn', 'Contestar');
            challenge.type = 'button';
            challenge.addEventListener('click', () => controller.challengeAction());
            actions.append(challenge);
        }
        Engine.getBlockClaimsForPlayer(state, currentUid).forEach((role) => {
            const block = element('button', 'rank-secondary-btn', `Bloquear: ${Rules.getRole(role).label}`);
            block.type = 'button';
            block.addEventListener('click', () => controller.declareBlock(role));
            actions.append(block);
        });
        const pass = element('button', 'rank-primary-btn', 'Passar');
        pass.type = 'button';
        pass.addEventListener('click', () => controller.passResponse());
        actions.append(pass);
        container.append(actions);
    }

    function renderBlockChallenge(container) {
        const blockerUid = state.pendingAction?.block?.uid;
        if (!canCurrentPlayerRespond(blockerUid)) {
            container.append(element('p', 'rank-phase-description', 'Aguardando a resposta dos outros jogadores.'));
            return;
        }
        const actions = element('div', 'rank-response-actions');
        const challenge = element('button', 'rank-danger-btn', 'Contestar bloqueio');
        challenge.type = 'button';
        challenge.addEventListener('click', () => controller.challengeBlock());
        const pass = element('button', 'rank-primary-btn', 'Aceitar bloqueio');
        pass.type = 'button';
        pass.addEventListener('click', () => controller.passResponse());
        actions.append(challenge, pass);
        container.append(actions);
    }

    function renderInfluenceLoss(container) {
        if (state.pendingLoss?.playerUid !== currentUid) {
            const player = Engine.getPlayer(state, state.pendingLoss?.playerUid);
            container.append(element('p', 'rank-phase-description', `Aguardando ${player?.name || 'o jogador'} escolher uma influencia.`));
            return;
        }
        container.append(element('h2', 'rank-interaction-title', 'Escolha a influencia que sera revelada'));
        const cards = element('div', 'rank-choice-cards');
        Engine.getPlayer(state, currentUid).influences.filter((card) => !card.revealed).forEach((card) => {
            const button = createCard(card, true, { button: true });
            button.addEventListener('click', () => controller.loseInfluence(card.id));
            cards.append(button);
        });
        container.append(cards);
    }

    function renderExchange(container) {
        const pending = state.pendingExchange;
        if (pending?.playerUid !== currentUid) {
            container.append(element('p', 'rank-phase-description', 'Aguardando o jogador concluir a troca.'));
            return;
        }
        const nextKey = pending.options.map((card) => card.id).join('|');
        if (nextKey !== exchangeKey) {
            exchangeKey = nextKey;
            exchangeSelection = new Set();
        }
        const cards = element('div', 'rank-choice-cards');
        pending.options.forEach((card) => {
            const button = createCard(card, true, { button: true, selected: exchangeSelection.has(card.id) });
            button.addEventListener('click', () => {
                if (exchangeSelection.has(card.id)) exchangeSelection.delete(card.id);
                else if (exchangeSelection.size < pending.keepCount) exchangeSelection.add(card.id);
                renderPhase();
            });
            cards.append(button);
        });
        const confirm = element('button', 'rank-primary-btn', `Confirmar ${exchangeSelection.size}/${pending.keepCount}`);
        confirm.type = 'button';
        confirm.disabled = exchangeSelection.size !== pending.keepCount;
        confirm.addEventListener('click', () => controller.completeExchange([...exchangeSelection]));
        container.append(cards, confirm);
    }

    function renderExamine(container) {
        const pending = state.pendingExamine;
        if (pending?.actorUid !== currentUid) {
            container.append(element('p', 'rank-phase-description', 'Aguardando a decisao do Inquisidor.'));
            return;
        }
        const card = { id: pending.cardId, role: pending.role, revealed: false };
        const cards = element('div', 'rank-choice-cards');
        cards.append(createCard(card, true));
        const actions = element('div', 'rank-response-actions');
        const keep = element('button', 'rank-primary-btn', 'Manter influencia');
        keep.type = 'button';
        keep.addEventListener('click', () => controller.completeExamine(false));
        const replace = element('button', 'rank-secondary-btn', 'Trocar pelo baralho');
        replace.type = 'button';
        replace.addEventListener('click', () => controller.completeExamine(true));
        actions.append(keep, replace);
        container.append(cards, actions);
    }

    function renderHand() {
        const hand = document.getElementById('rankHand');
        hand.replaceChildren();
        const self = Engine.getPlayer(state, currentUid);
        if (!self || state.status === PHASES.WAITING) return;
        hand.append(element('h2', '', 'Suas influencias'));
        const cards = element('div', 'rank-hand-cards');
        (self.influences || []).forEach((card) => cards.append(createCard(card, true)));
        hand.append(cards);
    }

    function renderLog() {
        const log = document.getElementById('rankLog');
        log.replaceChildren();
        (state.log || []).slice().reverse().forEach((entry) => {
            const item = element('div', `rank-log-entry is-${entry.type || 'info'}`, entry.message);
            log.append(item);
        });
        document.getElementById('rankTurnNumber').textContent = `Turno ${state.turnNumber || 0}`;
    }

    function updateClock(now = Date.now()) {
        const timer = document.getElementById('rankTimer');
        if (!timer) return;
        if (!state?.deadline) {
            timer.textContent = '--';
            timer.classList.remove('is-urgent');
            return;
        }
        const seconds = Math.max(0, Math.ceil((state.deadline - now) / 1000));
        timer.textContent = String(seconds).padStart(2, '0');
        timer.classList.toggle('is-urgent', seconds <= 5);
    }

    function setupChat() {
        const chatBtn = document.getElementById('chatBtn');
        const modal = document.getElementById('chatModal');
        const input = document.getElementById('chatInput');
        chatBtn?.addEventListener('click', () => {
            modal.style.display = 'flex';
            chatBtn.classList.add('is-chat-open');
            window.setTimeout(() => input?.focus(), 50);
        });
        document.getElementById('closeChatBtn')?.addEventListener('click', () => {
            modal.style.display = 'none';
            chatBtn.classList.remove('is-chat-open');
        });
        document.getElementById('chatForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const message = input.value.trim();
            if (!message) return;
            controller.sendChat(message);
            input.value = '';
        });
        const quickContainer = document.getElementById('chatQuickMessages');
        quickMessages.forEach((message) => {
            const button = element('button', 'chat-quick-btn', message);
            button.type = 'button';
            button.addEventListener('click', () => controller.sendChat(message, true));
            quickContainer.append(button);
        });
    }

    function renderChat(messages) {
        chatMessages = messages.slice(-60);
        const list = document.getElementById('chatMessagesList');
        list.replaceChildren();
        if (chatMessages.length === 0) {
            list.append(element('p', 'chat-empty-message', 'Nenhuma mensagem ainda.'));
            return;
        }
        chatMessages.forEach((message) => {
            const item = element('article', `chat-message${message.quick ? ' is-quick' : ''}`);
            item.append(
                element('div', 'chat-message-meta', message.name || 'Jogador'),
                element('p', 'chat-message-text', message.text || '')
            );
            list.append(item);
        });
        list.scrollTop = list.scrollHeight;
    }

    root.CoupRankedRenderer = Object.freeze({
        init,
        render,
        renderChat,
        updateClock,
        setConnectionStatus,
        hideLoading,
        showError
    });
})(window);

