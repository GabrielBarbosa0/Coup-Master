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
    let chatMessagesInitialized = false;
    let lastSeenChatMessageKey = '';
    let viewMode = 'game';

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
        viewMode = document.body?.dataset.rankView || 'game';
        bindStaticEvents();
        renderRoomCode();
        setupChat();
        setupAudioControls();
    }

    function bindStaticEvents() {
        document.getElementById('leaveRankBtn')?.addEventListener('click', () => controller.leaveRoom());
        document.getElementById('rankRoomCode')?.addEventListener('click', async () => {
            const codeButton = document.getElementById('rankRoomCode');
            try {
                await navigator.clipboard.writeText(roomCode);
                codeButton?.classList.add('is-copied');
                if (codeButton) codeButton.textContent = 'Codigo copiado';
                window.setTimeout(() => {
                    codeButton?.classList.remove('is-copied');
                    renderRoomCode();
                }, 1000);
            } catch (error) {
                showError('Nao foi possivel copiar o codigo da sala.');
            }
        });
        document.getElementById('rankRoomQr')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(getRankedInviteUrl());
                playRankSfx('pop');
            } catch (error) {
                showError('Nao foi possivel copiar o convite da sala.');
            }
        });
        bindModal('rankCharacterActionsBtn', 'rankActionsModal', '#closeRankActionsBtn', resetActionsGuide);
        bindModal('rankSettingsBtn', 'rankSettingsModal', '#closeRankSettingsBtn');
        bindModal('openRankFeedbackBtn', 'rankFeedbackModal', '#closeRankFeedbackBtn');
        setupActionsGuide();
        document.getElementById('copyRankLogBtn')?.addEventListener('click', copyOfficialLog);
        document.getElementById('rankFullscreenBtn')?.addEventListener('click', () => {
            playRankSfx('click');
            if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
            else document.exitFullscreen?.();
        });
        document.getElementById('rankErrorConfirm')?.addEventListener('click', () => {
            document.getElementById('rankErrorModal').hidden = true;
        });
    }

    function bindModal(openId, modalId, closeSelector, onOpen) {
        const modal = document.getElementById(modalId);
        document.getElementById(openId)?.addEventListener('click', () => {
            playRankSfx('click');
            if (typeof onOpen === 'function') onOpen();
            showModal(modal);
        });
        modal?.querySelector(closeSelector)?.addEventListener('click', () => {
            playRankSfx('click');
            hideModal(modal);
        });
    }

    function showModal(modal) {
        if (!modal) return;
        if (modal.hasAttribute('hidden')) modal.hidden = false;
        else modal.style.display = 'flex';
    }

    function hideModal(modal) {
        if (!modal) return;
        if (modal.hasAttribute('hidden')) modal.hidden = true;
        else modal.style.display = 'none';
    }

    function resetActionsGuide() {
        document.getElementById('rankActionsFlipCard')?.classList.remove('is-flipped');
    }

    function setupActionsGuide() {
        const flipCard = document.getElementById('rankActionsFlipCard');
        if (!flipCard) return;

        const flip = () => {
            playRankSfx('card-slide');
            flipCard.classList.toggle('is-flipped');
        };

        flipCard.addEventListener('click', flip);
        flipCard.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            flip();
        });
    }

    function renderRoomCode() {
        const codeButton = document.getElementById('rankRoomCode');
        if (codeButton) codeButton.textContent = `Sala: ${roomCode || '----'}`;
        renderRoomQr();
    }

    function getRankedInviteUrl() {
        const inviteUrl = new URL('ranked-waiting.html', root.location.href);
        inviteUrl.searchParams.set('room', roomCode || '');
        return inviteUrl.href;
    }

    function renderRoomQr() {
        const qrImage = document.getElementById('rankRoomQr');
        if (!qrImage || !roomCode) return;
        const data = encodeURIComponent(getRankedInviteUrl());
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=164x164&margin=8&data=${data}`;
        qrImage.title = 'Clique para copiar o convite da sala';
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
        if (viewMode === 'game') renderLog();
        updateClock();
    }

    function renderPlayers() {
        const container = document.getElementById('rankPlayers');
        container.replaceChildren();
        container.classList.toggle('is-waiting-view', state.status === PHASES.WAITING);
        const bySeat = new Map(Engine.getPlayers(state).map((player) => [player.seat, player]));
        const activeUid = Engine.getActiveUid(state);

        for (let seat = 1; seat <= Rules.SETTINGS.maxPlayers; seat += 1) {
            const player = bySeat.get(seat);
            if (!player) {
                const empty = element('article', 'rank-player-slot is-empty');
                const emptyText = element('div');
                emptyText.append(element('strong', '', `Lugar ${seat}`), element('div', 'rank-player-state', 'Disponivel'));
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
            header.append(avatar, identity);

            if (state.status === PHASES.WAITING) {
                slot.append(header);
            } else {
                const coins = element('div', 'rank-coin-count', `${player.coins} $`);
                header.append(coins);

                const hand = element('div', 'rank-opponent-hand');
                (player.influences || []).forEach((card) => {
                    hand.append(createCard(card, player.uid === currentUid || card.revealed));
                });
                slot.append(header, hand);
            }
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
        if (!title || !description || !interaction) return;
        interaction.replaceChildren();
        selectedAction = state.phase === PHASES.TURN ? selectedAction : null;

        if (state.status === PHASES.WAITING) {
            title.textContent = state.deadline ? 'Começando em instantes' : 'Prepare sua entrada';
            description.textContent = state.deadline
                ? 'Todos estao prontos. A mesa abre automaticamente ao fim da contagem.'
                : 'Convide pelo codigo da sala e confirme prontidao quando todos estiverem preparados.';
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
        const players = Engine.getPlayers(state);
        const readyCount = players.filter((player) => player.ready).length;
        const summary = element('div', 'rank-waiting-summary');
        summary.append(
            element('span', 'rank-waiting-counter', `${readyCount}/${Math.max(players.length, Rules.SETTINGS.minPlayers)} prontos`),
            element('span', 'rank-waiting-countdown', getReadyCountdownText())
        );

        const self = Engine.getPlayer(state, currentUid);
        const ready = element('button', self?.ready ? 'rank-secondary-btn' : 'rank-primary-btn', self?.ready ? 'Cancelar prontidao' : 'Estou pronto');
        ready.type = 'button';
        ready.addEventListener('click', () => controller.toggleReady());
        container.append(summary, ready);
    }

    function getReadyCountdownText(now = Date.now()) {
        if (!state?.deadline || state.status !== PHASES.WAITING) return 'Aguardando confirmação';
        const seconds = Math.max(0, Math.ceil((state.deadline - now) / 1000));
        return `Iniciando em ${seconds}s`;
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
            button.addEventListener('click', () => {
                playRankSfx('card-slide');
                controller.loseInfluence(card.id);
            });
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
        confirm.addEventListener('click', () => {
            playRankSfx('card-slide');
            controller.completeExchange([...exchangeSelection]);
        });
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

    function renderLog() {
        const log = document.getElementById('rankLog');
        if (!log) return;
        log.replaceChildren();
        (state.log || []).forEach((entry) => {
            const item = element('div', `rank-log-entry is-${entry.type || 'info'}`, entry.message);
            log.append(item);
        });
        const turnNumber = document.getElementById('rankTurnNumber');
        if (turnNumber) turnNumber.textContent = `Turno ${state.turnNumber || 0}`;
        log.scrollTop = log.scrollHeight;
    }

    function copyOfficialLog() {
        const button = document.getElementById('copyRankLogBtn');
        const lines = (state?.log || []).map((entry) => {
            const turn = entry.turn ? `Turno ${entry.turn}` : 'Turno 0';
            return `[${turn}] ${entry.message}`;
        });
        const text = [
            `Coup Master - registro ranqueado da sala ${roomCode}`,
            `Turno atual: ${state?.turnNumber || 0}`,
            '',
            ...lines
        ].join('\n');
        navigator.clipboard.writeText(text).then(() => {
            playRankSfx('pop');
            if (!button) return;
            button.textContent = 'Copiado';
            window.setTimeout(() => { button.textContent = 'Copiar log'; }, 1200);
        }).catch(() => showError('Nao foi possivel copiar o registro oficial.'));
    }

    function updateClock(now = Date.now()) {
        const timer = document.getElementById('rankTimer');
        const waitingCountdown = document.querySelector('.rank-waiting-countdown');
        if (waitingCountdown) {
            waitingCountdown.textContent = getReadyCountdownText(now);
        }
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
            if (!modal) return;
            modal.style.display = 'flex';
            chatBtn.classList.remove('chat-btn-has-unread');
            chatBtn.classList.add('is-chat-open');
            lastSeenChatMessageKey = getLastChatMessageKey();
            window.setTimeout(() => input?.focus(), 50);
        });
        document.getElementById('closeChatBtn')?.addEventListener('click', () => {
            if (!modal) return;
            modal.style.display = 'none';
            chatBtn.classList.remove('is-chat-open');
        });
        document.getElementById('chatForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const message = input.value.trim();
            if (!message) return;
            playRankSfx('click');
            controller.sendChat(message);
            input.value = '';
        });
        const quickContainer = document.getElementById('chatQuickMessages');
        if (!quickContainer) return;
        quickMessages.forEach((message) => {
            const button = element('button', 'chat-quick-btn', message);
            button.type = 'button';
            button.addEventListener('click', () => {
                playRankSfx('click');
                controller.sendChat(message, true);
            });
            quickContainer.append(button);
        });
    }

    function setupAudioControls() {
        const bgm = document.getElementById('rankBgmAudio');
        const musicBtn = document.getElementById('rankMusicBtn');
        const musicSlider = document.getElementById('rankVolumeSlider');
        const effectsSlider = document.getElementById('rankEffectsVolumeSlider');
        const savedMusic = Number(localStorage.getItem('rankMusicVolume'));
        const savedEffects = Number(localStorage.getItem('rankEffectsVolume'));
        const musicVolume = Number.isFinite(savedMusic) ? savedMusic : 0.1;
        const effectsVolume = Number.isFinite(savedEffects) ? savedEffects : 1;

        root.rankSfxVolume = effectsVolume;
        if (bgm) {
            bgm.volume = musicVolume;
            bgm.play()
                .then(() => musicBtn?.classList.remove('muted'))
                .catch(() => musicBtn?.classList.add('muted'));
        }
        if (musicBtn && bgm) {
            musicBtn.addEventListener('click', () => {
                playRankSfx('click');
                if (bgm.paused) {
                    bgm.play().then(() => musicBtn.classList.remove('muted')).catch(() => musicBtn.classList.add('muted'));
                } else {
                    bgm.pause();
                    musicBtn.classList.add('muted');
                }
            });
        }
        if (musicSlider) {
            musicSlider.value = musicVolume;
            musicSlider.addEventListener('input', (event) => {
                const value = normalizeVolume(event.target.value);
                if (bgm) {
                    bgm.volume = value;
                    if (value > 0) bgm.play().catch(() => null);
                }
                localStorage.setItem('rankMusicVolume', String(value));
            });
        }
        if (effectsSlider) {
            effectsSlider.value = effectsVolume;
            effectsSlider.addEventListener('input', (event) => {
                const value = normalizeVolume(event.target.value);
                root.rankSfxVolume = value;
                localStorage.setItem('rankEffectsVolume', String(value));
            });
        }
    }

    function normalizeVolume(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return 1;
        return Math.max(0, Math.min(1, number));
    }

    function playRankSfx(id) {
        const sound = document.getElementById(`rank-audio-${id}`);
        if (!sound) return;
        sound.volume = normalizeVolume(root.rankSfxVolume);
        sound.currentTime = 0;
        sound.play().catch(() => null);
    }

    function getChatMessageKey(message) {
        if (!message) return '';
        return String(message.id || message.timestamp || `${message.uid || ''}-${message.text || ''}`);
    }

    function getLastChatMessageKey() {
        return getChatMessageKey(chatMessages[chatMessages.length - 1]);
    }

    function isChatModalOpen() {
        return document.getElementById('chatModal')?.style.display === 'flex';
    }

    function updateChatUnreadState(latestMessage) {
        const latestKey = getChatMessageKey(latestMessage);
        const chatBtn = document.getElementById('chatBtn');

        if (!chatMessagesInitialized) {
            lastSeenChatMessageKey = latestKey;
            chatMessagesInitialized = true;
            return;
        }

        if (!latestKey || latestKey === lastSeenChatMessageKey) return;

        if (isChatModalOpen()) {
            lastSeenChatMessageKey = latestKey;
            chatBtn?.classList.remove('chat-btn-has-unread');
            return;
        }

        if (latestMessage?.uid !== currentUid) {
            chatBtn?.classList.add('chat-btn-has-unread');
            playRankSfx('pop');
        }

        lastSeenChatMessageKey = latestKey;
    }

    function renderChat(messages) {
        chatMessages = messages.slice(-60);
        const list = document.getElementById('chatMessagesList');
        if (!list) return;
        list.replaceChildren();
        updateChatUnreadState(chatMessages[chatMessages.length - 1]);
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

