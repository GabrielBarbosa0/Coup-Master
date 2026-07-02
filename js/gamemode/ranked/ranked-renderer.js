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
    let matchResultsModalDismissed = false;
    let matchResultsKey = '';
    let rankCardTooltipEl = null;
    let cardInteractionsBound = false;
    let rankProfileLoadKey = 0;

    const botNameIdeas = [
        'Augusto', 'Berenice', 'Cassandra', 'Dario', 'Eloisa', 'Fausto',
        'Gael', 'Helena', 'Icaro', 'Jandira', 'Livia', 'Mauro',
        'Nadia', 'Otavio', 'Pilar', 'Quintino', 'Rafaela', 'Silas',
        'Tarsila', 'Ulisses', 'Valentina', 'Xavier', 'Yara', 'Zeca',
        'Duque Cinzento', 'Capitão Falso', 'Condessa Fria', 'Inquisidor Mudo',
        'Baronesa Vesper', 'Lorde Sombra', 'Dama Fortuna', 'Arauto Azul',
        'Marquês Oculto', 'Visconde Sete', 'Oráculo da Corte', 'Máscara Rubra',
        'Corvo Real', 'Duelista Nobre', 'Escriba Cego', 'General de Seda'
    ];

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function profileNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function profilePercent(value) {
        const number = profileNumber(value);
        const percent = number > 0 && number <= 1 ? number * 100 : number;
        return `${Math.round(percent)}%`;
    }

    function setProfileText(id, value) {
        const node = document.getElementById(id);
        if (node) node.textContent = value;
    }

    function getProfileDatabase() {
        if (root.db) return root.db;
        if (typeof db !== 'undefined') return db;
        return null;
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
                if (codeButton) codeButton.textContent = 'Código copiado';
                window.setTimeout(() => {
                    codeButton?.classList.remove('is-copied');
                    renderRoomCode();
                }, 1000);
            } catch (error) {
                showError('Não foi possível copiar o código da sala.');
            }
        });
        document.getElementById('rankRoomQr')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(getRankedInviteUrl());
                playRankSfx('pop');
            } catch (error) {
                showError('Não foi possível copiar o convite da sala.');
            }
        });
        bindModal('rankCharacterActionsBtn', 'rankActionsModal', '#closeRankActionsBtn', resetActionsGuide);
        bindModal('rankSettingsBtn', 'rankSettingsModal', '#closeRankSettingsBtn');
        bindModal('openRankFeedbackBtn', 'rankFeedbackModal', '#closeRankFeedbackBtn');
        bindRankPlayerProfileModal();
        bindRankPanel('openRankLogBtn', 'rankLogModal', '#closeRankLogBtn');
        bindAddAiModal();
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
        setupRankCardInteractions();
    }

    function getRankCardTooltipElement() {
        if (!rankCardTooltipEl) {
            rankCardTooltipEl = element('div', 'card-tooltip rank-card-tooltip');
            rankCardTooltipEl.id = 'rankCardTooltip';
            document.body.appendChild(rankCardTooltipEl);
        }

        return rankCardTooltipEl;
    }

    function positionRankCardTooltip(event) {
        const tooltip = getRankCardTooltipElement();
        const offset = 14;
        const rect = tooltip.getBoundingClientRect();
        let left = event.clientX + offset;
        let top = event.clientY + offset;

        if (left + rect.width > window.innerWidth - 8) {
            left = event.clientX - rect.width - offset;
        }

        if (top + rect.height > window.innerHeight - 8) {
            top = event.clientY - rect.height - offset;
        }

        tooltip.style.left = `${Math.max(8, left)}px`;
        tooltip.style.top = `${Math.max(8, top)}px`;
    }

    function showRankCardTooltip(event, label) {
        if (!label) return;
        const tooltip = getRankCardTooltipElement();
        tooltip.textContent = label;
        tooltip.classList.add('is-visible');
        positionRankCardTooltip(event);
    }

    function hideRankCardTooltip() {
        rankCardTooltipEl?.classList.remove('is-visible');
    }

    function attachRankCardTooltip(cardElement, label) {
        if (!cardElement || !label) return;
        cardElement.dataset.cardLabel = label;
        cardElement.setAttribute('aria-label', label);

        cardElement.addEventListener('mouseenter', (event) => showRankCardTooltip(event, label));
        cardElement.addEventListener('mousemove', (event) => {
            if (rankCardTooltipEl?.classList.contains('is-visible')) {
                positionRankCardTooltip(event);
            }
        });
        cardElement.addEventListener('mouseleave', hideRankCardTooltip);
        cardElement.addEventListener('blur', hideRankCardTooltip);
    }

    function setupRankCardInteractions() {
        if (cardInteractionsBound) return;
        cardInteractionsBound = true;

        document.addEventListener('contextmenu', (event) => {
            if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
            const cardElement = event.target.closest('.rank-card');
            if (!cardElement) return;

            event.preventDefault();
            hideRankCardTooltip();
            openRankCardPreviewModal({
                label: cardElement.dataset.cardLabel || 'Carta oculta',
                image: cardElement.dataset.previewImage || 'assets/img/cards/base/back.png',
                hidden: cardElement.dataset.previewHidden === 'true'
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') hideRankCardPreviewModal();
        });
    }

    function getRankCardPreviewModal() {
        let modal = document.getElementById('rankCardPreviewModal');
        if (modal) return modal;

        modal = element('div', 'modal-overlay rank-card-preview-modal');
        modal.id = 'rankCardPreviewModal';
        modal.style.display = 'none';

        const content = element('div', 'modal-actions-and-rules rank-card-preview-content');
        const close = element('button', 'close-btn');
        close.id = 'closeRankCardPreviewBtn';
        close.type = 'button';
        close.textContent = '×';
        close.setAttribute('aria-label', 'Fechar visualização da carta');

        const flip = element('div', 'flip-card flip-horizontal-left');
        flip.id = 'rankPreviewFlipCard';
        flip.setAttribute('role', 'button');
        flip.tabIndex = 0;
        flip.setAttribute('aria-label', 'Virar carta ampliada');

        const inner = element('div', 'flip-card-inner');
        const front = element('div', 'flip-card-front');
        front.id = 'rankPreviewFront';
        const back = element('div', 'flip-card-back');
        back.id = 'rankPreviewBack';
        back.style.backgroundImage = "url('assets/img/cards/base/back.png')";
        inner.append(front, back);
        flip.append(inner);
        content.append(close, flip);
        modal.append(content);
        document.body.appendChild(modal);

        close.addEventListener('click', () => {
            playRankSfx('click');
            hideRankCardPreviewModal();
        });
        modal.addEventListener('click', (event) => {
            if (event.target === modal) hideRankCardPreviewModal();
        });
        flip.addEventListener('click', () => toggleRankCardPreviewFlip());
        flip.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            toggleRankCardPreviewFlip();
        });

        return modal;
    }

    function openRankCardPreviewModal({ label, image, hidden }) {
        const modal = getRankCardPreviewModal();
        const front = modal.querySelector('#rankPreviewFront');
        const inner = modal.querySelector('#rankPreviewFlipCard .flip-card-inner');
        const flip = modal.querySelector('#rankPreviewFlipCard');
        const previewImage = hidden ? 'assets/img/cards/base/back.png' : image;

        front.style.backgroundImage = `url('${previewImage}')`;
        flip?.setAttribute('aria-label', hidden ? 'Carta oculta ampliada' : `${label || 'Carta'} ampliada`);
        if (inner) inner.style.transform = 'rotateY(0deg)';
        modal.style.display = 'flex';
        playRankSfx('card-slide');
    }

    function hideRankCardPreviewModal() {
        const modal = document.getElementById('rankCardPreviewModal');
        if (modal) modal.style.display = 'none';
    }

    function toggleRankCardPreviewFlip() {
        const inner = document.querySelector('#rankPreviewFlipCard .flip-card-inner');
        if (!inner) return;
        const isFlipped = inner.style.transform === 'rotateY(180deg)';
        inner.style.transform = isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)';
        playRankSfx('card-slide');
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

    function bindRankPanel(openId, panelId, closeSelector) {
        const panel = document.getElementById(panelId);
        document.getElementById(openId)?.addEventListener('click', () => {
            playRankSfx('click');
            openRankPanel(panel);
        });
        panel?.querySelector(closeSelector)?.addEventListener('click', () => {
            playRankSfx('click');
            closeRankPanel(panel);
        });
    }

    function isRankPanelOverlayMode() {
        return window.matchMedia('(max-width: 980px)').matches;
    }

    function openRankPanel(panel) {
        if (!panel) return;
        panel.classList.add('is-panel-open');
    }

    function closeRankPanel(panel) {
        if (!panel) return;
        panel.classList.remove('is-panel-open');
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

    function bindRankPlayerProfileModal() {
        const modal = document.getElementById('rankPlayerProfileModal');
        const closeButton = document.getElementById('closeRankPlayerProfileBtn');
        closeButton?.addEventListener('click', () => {
            playRankSfx('click');
            hideModal(modal);
        });
        modal?.addEventListener('click', (event) => {
            if (event.target !== modal) return;
            hideModal(modal);
        });
    }

    function setRankPlayerProfileLoading(player) {
        const avatar = document.getElementById('rankPlayerProfileAvatar');
        const loading = document.getElementById('rankPlayerProfileLoading');
        const statsGrid = document.getElementById('rankPlayerProfileStats');
        const name = player?.name || 'Jogador';

        if (avatar) {
            avatar.src = player?.photo || 'assets/img/icons/ghost.svg';
            avatar.alt = `Perfil de ${name}`;
        }

        setProfileText('rankPlayerProfileTitle', 'Perfil do jogador');
        setProfileText('rankPlayerProfileName', name);
        setProfileText('rankPlayerProfileStatus', 'Carregando estatísticas...');

        if (loading) {
            loading.hidden = false;
            loading.textContent = 'Carregando estatísticas...';
        }
        if (statsGrid) statsGrid.hidden = true;
    }

    function renderRankPlayerProfile(player, stats, options = {}) {
        const name = stats?.name || player?.name || 'Jogador';
        const photo = stats?.photo || player?.photo || 'assets/img/icons/ghost.svg';
        const games = profileNumber(stats?.games);
        const wins = profileNumber(stats?.wins);
        const losses = profileNumber(stats?.losses);
        const rankScore = profileNumber(stats?.rankScore ?? stats?.score ?? stats?.points);
        const status = options.status || (games
            ? `${games} jogo(s) ranqueado(s) registrados.`
            : 'Sem partidas ranqueadas registradas ainda.');
        const avatar = document.getElementById('rankPlayerProfileAvatar');
        const loading = document.getElementById('rankPlayerProfileLoading');
        const statsGrid = document.getElementById('rankPlayerProfileStats');

        if (avatar) {
            avatar.src = photo;
            avatar.alt = `Perfil de ${name}`;
        }

        setProfileText('rankPlayerProfileName', name);
        setProfileText('rankPlayerProfileStatus', status);
        setProfileText('rankPlayerProfileGames', games);
        setProfileText('rankPlayerProfileWins', wins);
        setProfileText('rankPlayerProfileLosses', losses);
        setProfileText('rankPlayerProfileWinRate', profilePercent(stats?.winRate));
        setProfileText('rankPlayerProfileScore', `${rankScore} pts`);

        if (loading) loading.hidden = true;
        if (statsGrid) statsGrid.hidden = false;
    }

    function openRankPlayerProfile(player) {
        const modal = document.getElementById('rankPlayerProfileModal');
        if (!modal || !player) return;
        const loadKey = ++rankProfileLoadKey;
        setRankPlayerProfileLoading(player);
        showModal(modal);
        playRankSfx('click');

        if (!player.uid || player.ai) {
            renderRankPlayerProfile(player, null, {
                status: player.ai
                    ? 'Jogadores IA ainda não possuem perfil ranqueado persistido.'
                    : 'Este jogador ainda não possui perfil ranqueado vinculado.'
            });
            return;
        }

        const database = getProfileDatabase();
        if (!database) {
            renderRankPlayerProfile(player, null, {
                status: 'Não foi possível acessar as estatísticas agora.'
            });
            return;
        }

        database.ref(`rankedStats/${player.uid}`).once('value')
            .then((snapshot) => {
                if (loadKey !== rankProfileLoadKey) return;
                renderRankPlayerProfile(player, snapshot.val());
            })
            .catch(() => {
                if (loadKey !== rankProfileLoadKey) return;
                renderRankPlayerProfile(player, null, {
                    status: 'Não foi possível carregar estatísticas.'
                });
            });
    }

    function bindAddAiModal() {
        const modal = document.getElementById('rankAddAiModal');
        const form = document.getElementById('rankAddAiForm');
        const nameInput = document.getElementById('rankAiName');
        const randomButton = document.getElementById('rankRandomAiNameBtn');
        const customToggle = document.getElementById('rankChooseAiPersonality');

        document.getElementById('openRankAddAiBtn')?.addEventListener('click', () => {
            playRankSfx('click');
            fillRandomAiName();
            syncAiPersonalityFields();
            showModal(modal);
        });
        document.getElementById('closeRankAddAiBtn')?.addEventListener('click', () => {
            playRankSfx('click');
            hideModal(modal);
        });
        document.getElementById('closeRankAddAiBtnSecondary')?.addEventListener('click', () => {
            playRankSfx('click');
            hideModal(modal);
        });
        randomButton?.addEventListener('click', fillRandomAiName);
        customToggle?.addEventListener('change', syncAiPersonalityFields);

        ['rankAiVengefulness', 'rankAiHonesty', 'rankAiSkepticism'].forEach((inputId) => {
            document.getElementById(inputId)?.addEventListener('input', syncAiPersonalityValues);
        });

        form?.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = String(nameInput?.value || '').trim();
            if (!name) {
                showError('Informe um nome para o jogador IA.');
                return;
            }

            const choosePersonality = Boolean(customToggle?.checked);
            controller.addAiPlayer({
                name,
                personality: choosePersonality ? {
                    vengefulness: readRangeValue('rankAiVengefulness'),
                    honesty: readRangeValue('rankAiHonesty'),
                    skepticism: readRangeValue('rankAiSkepticism')
                } : null
            }).then(() => {
                playRankSfx('pop');
                form.reset();
                syncAiPersonalityFields();
                hideModal(modal);
            }).catch((error) => showError(error.message || 'Não foi possível adicionar o jogador IA.'));
        });
    }

    function fillRandomAiName() {
        const input = document.getElementById('rankAiName');
        if (!input) return;
        const usedNames = new Set(Engine.getPlayers(state || {}).map((player) => player.name.toLocaleLowerCase('pt-BR')));
        const available = botNameIdeas.filter((name) => !usedNames.has(name.toLocaleLowerCase('pt-BR')));
        const names = available.length ? available : botNameIdeas;
        input.value = names[Math.floor(Math.random() * names.length)] || 'Bot';
    }

    function readRangeValue(id) {
        return Math.max(0, Math.min(100, Number(document.getElementById(id)?.value || 50)));
    }

    function syncAiPersonalityFields() {
        const enabled = Boolean(document.getElementById('rankChooseAiPersonality')?.checked);
        const fields = document.getElementById('rankAiPersonalityFields');
        if (fields) {
            fields.classList.toggle('is-disabled', !enabled);
            fields.setAttribute('aria-disabled', String(!enabled));
            fields.querySelectorAll('input').forEach((input) => {
                input.disabled = !enabled;
            });
        }
        syncAiPersonalityValues();
    }

    function syncAiPersonalityValues() {
        setText('rankAiVengefulnessValue', `${readRangeValue('rankAiVengefulness')}%`);
        setText('rankAiHonestyValue', `${readRangeValue('rankAiHonesty')}%`);
        setText('rankAiSkepticismValue', `${readRangeValue('rankAiSkepticism')}%`);
    }

    function setText(id, text) {
        const node = document.getElementById(id);
        if (node) node.textContent = text;
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
        renderStarterDrawOverlay();
        renderMatchResultsModal();
        if (viewMode === 'game') renderLog();
        updateClock();
    }

    function renderPlayers() {
        const container = document.getElementById('rankPlayers');
        container.replaceChildren();
        container.classList.toggle('is-waiting-view', state.status === PHASES.WAITING);
        const bySeat = new Map(Engine.getPlayers(state).map((player) => [player.seat, player]));
        const activeUid = Engine.getActiveUid(state);
        const drawCandidates = new Set(state.starterDraw?.candidates || []);
        const drawWinnerUid = state.starterDraw?.winnerUid || null;

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
            slot.style.setProperty('--draw-seat', seat);
            if (player.uid === currentUid) slot.classList.add('is-self');
            if (player.uid === activeUid && state.status === 'active') slot.classList.add('is-active');
            if (state.phase === PHASES.STARTER_DRAW && drawCandidates.has(player.uid)) slot.classList.add('is-draw-candidate');
            if (state.phase === PHASES.STARTER_DRAW && player.uid === drawWinnerUid) slot.classList.add('is-draw-winner');
            if (player.eliminated) slot.classList.add('is-eliminated');

            const header = element('div', 'rank-player-header');
            const avatar = element('img', 'rank-player-avatar');
            avatar.src = player.photo || 'assets/img/icons/ghost.svg';
            avatar.alt = `Perfil de ${player.name || 'Jogador'}`;
            avatar.title = 'Ver perfil do jogador';
            avatar.referrerPolicy = 'no-referrer';
            avatar.tabIndex = 0;
            avatar.addEventListener('click', (event) => {
                event.stopPropagation();
                openRankPlayerProfile(player);
            });
            avatar.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                openRankPlayerProfile(player);
            });

            const identity = element('div');
            identity.append(
                element('div', `rank-player-name${player.ai ? ' is-ai' : ''}`, player.name),
                element('div', 'rank-player-state', getPlayerStateLabel(player, activeUid))
            );
            header.append(avatar, identity);

            if (state.status === PHASES.WAITING) {
                slot.append(header);
            } else {
                header.append(createCoinCounter(player.coins));

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
        if (player.ai && state.status === PHASES.WAITING) return player.ready ? 'IA pronta' : 'IA preparando-se';
        if (state.status === PHASES.WAITING) return player.ready ? 'Pronto' : 'Preparando-se';
        if (state.phase === PHASES.STARTER_DRAW && player.uid === state.starterDraw?.winnerUid) return 'Sorteado';
        if (state.phase === PHASES.STARTER_DRAW) return 'No sorteio';
        if (player.uid === activeUid) return 'Em jogo';
        return player.connected ? 'Online' : 'Reconectando';
    }

    function createCoinCounter(coinsValue) {
        const value = Number(coinsValue || 0);
        const counter = element('div', 'rank-coin-count');
        counter.setAttribute('aria-label', `${value} moeda${value === 1 ? '' : 's'}`);
        counter.append(
            element('span', 'rank-coin-icon'),
            element('span', 'rank-coin-value', String(value))
        );
        return counter;
    }

    function createCard(card, reveal, options = {}) {
        const wrapper = element(options.button ? 'button' : 'div', 'rank-card');
        if (options.button) wrapper.type = 'button';
        if (card.revealed) wrapper.classList.add('is-revealed');
        if (options.selected) wrapper.classList.add('is-selected');
        const image = element('img');
        const role = Rules.getRole(card.role);
        const isVisible = Boolean(reveal && role);
        const label = isVisible ? role.label : 'Carta oculta';
        const previewImage = isVisible ? role.image : 'assets/img/cards/base/back.png';
        image.src = previewImage;
        image.alt = label;
        wrapper.dataset.cardId = card.id || '';
        wrapper.dataset.previewImage = previewImage;
        wrapper.dataset.previewHidden = isVisible ? 'false' : 'true';
        attachRankCardTooltip(wrapper, label);
        wrapper.append(image);
        return wrapper;
    }

    function renderPhase() {
        const title = document.getElementById('rankPhaseTitle');
        const description = document.getElementById('rankPhaseDescription');
        const interaction = document.getElementById('rankInteraction');
        if (!title || !description || !interaction) return;
        const stage = title.closest('.rank-stage');
        stage?.classList.remove('is-centered-stage', 'is-finished-stage', 'is-response-stage');
        interaction.replaceChildren();
        selectedAction = state.phase === PHASES.TURN ? selectedAction : null;

        if (state.status === PHASES.WAITING) {
            stage?.classList.add('is-centered-stage');
            setPhaseText(
                state.deadline ? 'Iniciando' : 'Prepare sua entrada',
                state.deadline ? 'Tudo pronto.' : 'Convide pela sala e marque pronto.'
            );
            renderWaiting(interaction);
            return;
        }

        if (state.status === PHASES.FINISHED) {
            stage?.classList.add('is-centered-stage', 'is-finished-stage');
            setPhaseText('Partida encerrada');
            const viewResults = element('button', 'rank-primary-btn', 'Ver resultado');
            viewResults.type = 'button';
            viewResults.addEventListener('click', () => {
                playRankSfx('click');
                matchResultsModalDismissed = false;
                renderMatchResultsModal(true);
            });
            interaction.append(viewResults);
            return;
        }

        if (state.phase === PHASES.STARTER_DRAW) {
            stage?.classList.add('is-centered-stage');
            setPhaseText('Sorteio inicial');
            return;
        }

        const activePlayer = Engine.getPlayer(state, Engine.getActiveUid(state));
        if (state.phase === PHASES.TURN) {
            if (activePlayer?.uid !== currentUid) {
                stage?.classList.add('is-centered-stage');
            }
            setPhaseText(
                activePlayer?.uid === currentUid ? 'Sua vez' : `Vez de ${activePlayer?.name || 'jogador'}`,
                describeTurnPhase(activePlayer)
            );
            renderTurn(interaction, activePlayer);
        } else if (state.phase === PHASES.RESPONSE) {
            stage?.classList.add(canCurrentPlayerRespond(state.pendingAction?.actorUid) ? 'is-response-stage' : 'is-centered-stage');
            setPhaseText('Responder', describePendingAction());
            renderActionResponse(interaction);
        } else if (state.phase === PHASES.BLOCK_CHALLENGE) {
            stage?.classList.add(canCurrentPlayerRespond(state.pendingAction?.block?.uid) ? 'is-response-stage' : 'is-centered-stage');
            setPhaseText('Bloqueio', describePendingBlock());
            renderBlockChallenge(interaction);
        } else if (state.phase === PHASES.INFLUENCE_LOSS) {
            stage?.classList.add('is-centered-stage');
            setPhaseText(
                state.pendingLoss?.playerUid === currentUid ? 'Revele uma carta' : 'Perda de influência',
                describeInfluenceLoss()
            );
            renderInfluenceLoss(interaction);
        } else if (state.phase === PHASES.EXCHANGE) {
            stage?.classList.add('is-centered-stage');
            setPhaseText(
                state.pendingExchange?.playerUid === currentUid ? 'Escolha cartas' : 'Troca',
                describeExchangePhase()
            );
            renderExchange(interaction);
        } else if (state.phase === PHASES.EXAMINE) {
            stage?.classList.add('is-centered-stage');
            setPhaseText(
                state.pendingExamine?.actorUid === currentUid ? 'Investigar' : 'Investigação',
                describeExaminePhase()
            );
            renderExamine(interaction);
        }

        function setPhaseText(titleText, descriptionText = '') {
            title.textContent = titleText;
            description.textContent = descriptionText;
            description.hidden = !descriptionText;
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
        const ready = element('button', self?.ready ? 'rank-secondary-btn' : 'rank-primary-btn', self?.ready ? 'Cancelar prontidão' : 'Estou pronto');
        ready.type = 'button';
        ready.addEventListener('click', () => controller.toggleReady());

        const addAi = element('button', 'rank-secondary-btn', 'Adicionar jogador IA');
        addAi.id = 'openRankAddAiBtn';
        addAi.type = 'button';
        addAi.disabled = players.length >= Rules.SETTINGS.maxPlayers;
        addAi.addEventListener('click', () => {
            playRankSfx('click');
            fillRandomAiName();
            syncAiPersonalityFields();
            showModal(document.getElementById('rankAddAiModal'));
        });

        container.append(summary, ready, addAi);
    }

    function getReadyCountdownText(now = Date.now()) {
        if (!state?.deadline || state.status !== PHASES.WAITING) return 'Aguardando confirmação';
        const seconds = Math.max(0, Math.ceil((state.deadline - now) / 1000));
        return `Iniciando em ${seconds}s`;
    }

    function renderStarterDraw(container, starter) {
        const candidates = state.starterDraw?.candidates || state.turnOrder || [];
        const panel = element('div', 'rank-starter-draw');
        panel.append(element('p', 'rank-starter-title', 'Sorteador em andamento'));

        const list = element('div', 'rank-starter-list');
        candidates.forEach((uid, index) => {
            const player = Engine.getPlayer(state, uid);
            if (!player) return;
            const chip = element('div', 'rank-starter-chip');
            chip.style.setProperty('--draw-index', index);
            if (uid === starter?.uid) chip.classList.add('is-selected');

            const avatar = element('img');
            avatar.src = player.photo || 'assets/img/icons/ghost.svg';
            avatar.alt = '';
            avatar.referrerPolicy = 'no-referrer';
            chip.append(avatar, element('span', '', player.name));
            list.append(chip);
        });

        const result = element(
            'strong',
            'rank-starter-result',
            starter ? `${starter.name} abre a partida` : 'Escolhendo jogador...'
        );
        panel.append(list, result);
        container.append(panel);
    }

    function renderStarterDrawOverlay() {
        const existing = document.getElementById('rankStarterDrawOverlay');
        if (state.phase !== PHASES.STARTER_DRAW || state.status !== 'active') {
            existing?.remove();
            return;
        }

        const starter = Engine.getPlayer(state, state.starterDraw?.winnerUid || Engine.getActiveUid(state));
        const candidates = state.starterDraw?.candidates || state.turnOrder || [];
        const overlay = existing || element('div', 'rank-starter-overlay');
        overlay.id = 'rankStarterDrawOverlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-live', 'polite');
        overlay.replaceChildren();

        const panel = element('section', 'rank-starter-overlay-panel');
        panel.append(
            element('span', 'rank-kicker', 'Sorteio inicial'),
            element('h2', '', 'Quem começa?'),
            element('p', 'rank-phase-description', 'A mesa está sorteando aleatoriamente o primeiro turno.')
        );

        const list = element('div', 'rank-starter-overlay-list');
        candidates.forEach((uid, index) => {
            const player = Engine.getPlayer(state, uid);
            if (!player) return;
            const chip = element('div', 'rank-starter-overlay-chip');
            chip.style.setProperty('--draw-index', index);
            if (player.uid === starter?.uid) chip.classList.add('is-winner');

            const avatar = element('img');
            avatar.src = player.photo || 'assets/img/icons/ghost.svg';
            avatar.alt = '';
            avatar.referrerPolicy = 'no-referrer';
            chip.append(avatar, element('span', '', player.name));
            list.append(chip);
        });

        panel.append(list);
        panel.append(element(
            'strong',
            'rank-starter-overlay-result',
            starter ? `${starter.name} começa.` : 'Escolhendo jogador...'
        ));
        overlay.append(panel);
        if (!existing) document.body.append(overlay);
    }

    function renderMatchResultsModal(forceOpen = false) {
        const existing = document.getElementById('rankMatchResultsModal');
        if (state.status !== PHASES.FINISHED) {
            existing?.remove();
            matchResultsModalDismissed = false;
            matchResultsKey = '';
            return;
        }

        const nextKey = `${roomCode}:${state.winnerUid || 'finished'}:${state.finishedAt || state.turn || ''}`;
        if (nextKey !== matchResultsKey) {
            matchResultsKey = nextKey;
            matchResultsModalDismissed = false;
        }

        const overlay = existing || createMatchResultsModal();
        const body = overlay.querySelector('#rankMatchResultsBody');
        const winner = Engine.getPlayer(state, state.winnerUid);
        if (!body) return;

        body.replaceChildren();
        const heading = element('div', 'rank-results-modal-heading');
        heading.append(
            element('span', 'rank-kicker', 'Resultado final'),
            element('h2', '', winner ? `${winner.name} venceu` : 'Partida encerrada')
        );
        heading.querySelector('h2').id = 'rankMatchResultsTitle';
        body.append(heading);
        renderMatchResults(body);

        if (forceOpen || !matchResultsModalDismissed) showModal(overlay);
        else hideModal(overlay);
    }

    function createMatchResultsModal() {
        const overlay = element('div', 'rank-modal-overlay rank-results-overlay');
        overlay.id = 'rankMatchResultsModal';
        overlay.hidden = true;

        const modal = element('section', 'rank-modal rank-results-modal');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'rankMatchResultsTitle');

        const close = element('button', 'rank-close-btn', '×');
        close.type = 'button';
        close.setAttribute('aria-label', 'Fechar resultado');
        close.addEventListener('click', () => {
            playRankSfx('click');
            matchResultsModalDismissed = true;
            hideModal(overlay);
        });

        const body = element('div', 'rank-results-scroll');
        body.id = 'rankMatchResultsBody';

        modal.append(close, body);
        overlay.append(modal);
        document.body.append(overlay);
        return overlay;
    }

    function renderMatchResults(container) {
        const result = Engine.buildMatchResults(state);
        const players = Object.values(result.players || {})
            .sort((left, right) => Number(right.performanceScore || 0) - Number(left.performanceScore || 0));
        const best = players[0] || null;

        const panel = element('section', 'rank-match-results');
        if (best) {
            const hero = element('div', 'rank-match-mvp');
            const avatar = element('img');
            avatar.src = best.photo || 'assets/img/icons/ghost.svg';
            avatar.alt = '';
            avatar.referrerPolicy = 'no-referrer';
            hero.append(
                avatar,
                element('span', 'rank-kicker', 'Melhor jogador da partida'),
                element('strong', '', best.name),
                element('em', '', formatSignedPoints(best.performanceScore))
            );
            panel.append(hero);
        }

        const list = element('div', 'rank-match-scoreboard');
        players.forEach((player, index) => {
            const row = element('article', 'rank-match-score-row');
            if (player.won) row.classList.add('is-winner');
            if (index === 0) row.classList.add('is-mvp');

            const details = element('details', 'rank-match-breakdown');
            const summary = element('summary', '', 'Ver pontos');
            const breakdown = element('ul');
            const items = player.performanceBreakdown || [];
            if (items.length) {
                items.forEach((item) => {
                    const li = element('li');
                    li.append(element('span', '', item.label), element('strong', '', formatSignedPoints(item.points)));
                    breakdown.append(li);
                });
            } else {
                breakdown.append(element('li', '', 'Sem eventos pontuados.'));
            }
            details.append(summary, breakdown);

            row.append(
                element('span', 'rank-match-position', `${index + 1}`),
                element('strong', 'rank-match-player-name', player.name),
                element('span', 'rank-match-player-result', player.won ? 'Vencedor' : player.eliminated ? 'Eliminado' : 'Sobreviveu'),
                element('strong', `rank-match-points ${player.performanceScore >= 0 ? 'is-positive' : 'is-negative'}`, formatSignedPoints(player.performanceScore)),
                details
            );
            list.append(row);
        });
        panel.append(list);

        const actions = element('div', 'rank-match-result-actions');
        const restart = element('button', 'rank-primary-btn', 'Reiniciar partida');
        restart.type = 'button';
        restart.addEventListener('click', () => {
            playRankSfx('click');
            controller.restartMatch();
        });

        const back = element('button', 'rank-secondary-btn', 'Voltar ao lobby');
        back.type = 'button';
        back.addEventListener('click', () => controller.leaveRoom());
        actions.append(restart, back);
        panel.append(actions);
        container.append(panel);
    }

    function formatSignedPoints(value) {
        const points = Number(value || 0);
        return `${points > 0 ? '+' : ''}${points} pts`;
    }

    function describeTurnPhase(activePlayer) {
        if (!activePlayer) return 'Aguardando a mesa definir o próximo jogador.';
        if (activePlayer.uid === currentUid) {
            const self = Engine.getPlayer(state, currentUid);
            if (self?.coins >= Rules.SETTINGS.mandatoryCoupCoins) {
                return 'Você tem 10 moedas ou mais e precisa aplicar um Golpe de Estado.';
            }
            return 'Escolha uma ação. O sistema aplica custos, abre as janelas de resposta e resolve a rodada automaticamente.';
        }
        return `${activePlayer.name} está escolhendo a próxima ação da rodada.`;
    }

    function describeInfluenceLoss() {
        const loss = state.pendingLoss;
        const player = Engine.getPlayer(state, loss?.playerUid);
        if (!loss || !player) return '';
        const reason = loss.reason ? `${loss.reason}. ` : '';
        if (player.uid === currentUid) {
            return `${reason}Escolha a influência que será revelada para continuar a partida.`;
        }
        return `${player.name} precisa revelar uma influência para a partida continuar.`;
    }

    function describeExchangePhase() {
        const exchange = state.pendingExchange;
        const player = Engine.getPlayer(state, exchange?.playerUid);
        if (!exchange || !player) return '';
        if (player.uid === currentUid) {
            return `Escolha ${exchange.keepCount} carta(s) para devolver ao baralho e concluir a troca.`;
        }
        return `${player.name} está reorganizando as cartas da mão.`;
    }

    function describeExaminePhase() {
        const examine = state.pendingExamine;
        const actor = Engine.getPlayer(state, examine?.actorUid);
        const target = Engine.getPlayer(state, examine?.targetUid);
        if (!examine || !actor) return '';
        if (actor.uid === currentUid) {
            return target
                ? `Escolha uma influência de ${target.name} para investigar.`
                : 'Escolha a influência que será investigada.';
        }
        return `${actor.name} está investigando uma influência${target ? ` de ${target.name}` : ''}.`;
    }

    function renderTurn(container, activePlayer) {
        if (activePlayer?.uid !== currentUid) {
            return;
        }

        if (selectedAction) {
            const action = Rules.getAction(selectedAction);
            container.append(element('h2', 'rank-interaction-title', 'Escolha o alvo'));
            const targets = element('div', 'rank-target-list');
            Engine.getAlivePlayers(state).filter((player) => player.uid !== currentUid).forEach((player) => {
                const button = element('button', 'rank-target-btn', player.name);
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
            button.textContent = action.label;
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
        if (!pending || !action || !actor) return '';
        const claim = pending.claim ? ` declarando ${Rules.getRole(pending.claim).label}` : '';
        const targetText = target ? `\ncontra ${target.name}` : '';
        return `${actor.name} escolheu ${action.label}${claim}${targetText}.`;
    }

    function describePendingBlock() {
        const block = state.pendingAction?.block;
        const blocker = Engine.getPlayer(state, block?.uid);
        const role = Rules.getRole(block?.claim);
        return block && blocker
            ? `${blocker.name} bloqueou declarando ${role?.label || 'uma influência'}.\nVocê pode contestar o bloqueio ou aceitar a resolução.`
            : '';
    }

    function canCurrentPlayerRespond(excludedUid) {
        const self = Engine.getPlayer(state, currentUid);
        return Boolean(self && !self.eliminated && self.uid !== excludedUid && !state.pendingAction?.passes?.[self.uid]);
    }

    function renderActionResponse(container) {
        const pending = state.pendingAction;
        if (!canCurrentPlayerRespond(pending.actorUid)) {
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
            return;
        }
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
            return;
        }
        const card = { id: pending.cardId, role: pending.role, revealed: false };
        const cards = element('div', 'rank-choice-cards');
        cards.append(createCard(card, true));
        const actions = element('div', 'rank-response-actions');
        const keep = element('button', 'rank-primary-btn', 'Manter influência');
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
        }).catch(() => showError('Não foi possível copiar o registro oficial.'));
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
            openRankPanel(modal);
            chatBtn.classList.remove('chat-btn-has-unread');
            chatBtn.classList.add('is-chat-open');
            lastSeenChatMessageKey = getLastChatMessageKey();
            window.setTimeout(() => input?.focus(), 50);
        });
        document.getElementById('closeChatBtn')?.addEventListener('click', () => {
            if (!modal) return;
            closeRankPanel(modal);
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
        const bgmGuard = bgm && root.CoupAudioGuard
            ? root.CoupAudioGuard.createBackgroundAudioGuard(bgm, { button: musicBtn })
            : null;

        root.rankSfxVolume = effectsVolume;
        if (bgm) {
            bgm.volume = musicVolume;
            if (bgmGuard) {
                bgmGuard.play();
            } else {
                bgm.play()
                    .then(() => musicBtn?.classList.remove('muted'))
                    .catch(() => musicBtn?.classList.add('muted'));
            }
        }
        if (musicBtn && bgm) {
            musicBtn.addEventListener('click', () => {
                playRankSfx('click');
                if (bgmGuard) {
                    bgmGuard.toggle();
                    return;
                }

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
                    if (bgmGuard) {
                        bgmGuard.setVolume(value);
                        if (value > 0) bgmGuard.play();
                    } else {
                        bgm.volume = value;
                        if (value > 0) bgm.play().catch(() => null);
                    }
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
        const chatPanel = document.getElementById('chatModal');
        if (!chatPanel) return false;
        return !isRankPanelOverlayMode() || chatPanel.classList.contains('is-panel-open');
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

