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
    let previousSoundSnapshot = null;
    let playedConquestKeys = new Set();
    let rankBgmAudio = null;
    let rankBgmGuard = null;
    let rankMusicVolume = 0.1;
    let tensionLayerActive = false;
    let investigationLayerActive = false;
    let tensionFadeToken = 0;
    let investigationFadeToken = 0;
    let bgmFadeToken = 0;
    let rankCardTooltipEl = null;
    let cardInteractionsBound = false;
    let rankProfileLoadKey = 0;
    let sideStackResizeObserver = null;
    let languageEventsBound = false;

    const TENSION_FADE_IN_MS = 900;
    const TENSION_FADE_OUT_MS = 1400;
    const TENSION_BGM_DUCK_RATIO = 0.18;
    const BGM_INTRO_FADE_MS = 5000;
    const RANK_BGM_POSITION_KEY = 'rankBgmPosition';
    const DEFAULT_RANK_MUSIC_VOLUME = 0.1;
    const DEFAULT_RANK_SFX_VOLUME = 0.2;
    const RANK_BALATRO_HOVER = Object.freeze({
        tilt: 36,
        glowOffset: 23.4
    });

    const botNameIdeas = [
        'Augusto', 'Berenice', 'Cassandra', 'Dario', 'Eloisa', 'Fausto',
        'Gael', 'Helena', 'Icaro', 'Dama do Véu', 'Barão Âmbar', 'Mauro',
        'Nadia', 'Otavio', 'Pilar', 'Quintino', 'Rafaela', 'Silas',
        'Véu Carmesim', 'Ulisses', 'Valentina', 'Xavier', 'Lady Lótus', 'Zeca',
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

    function t(key, params = {}, fallback = '') {
        const translated = root.CoupLanguage?.t?.(key, params);
        return translated && translated !== key ? translated : fallback || key;
    }

    function roleLabel(role) {
        const roleData = Rules.getRole(role);
        return t(`ranked.roles.${role}`, {}, roleData?.label || role || t('ranked.anInfluence', {}, 'uma influência'));
    }

    function actionLabel(actionType) {
        const action = Rules.getAction(actionType);
        return t(`ranked.actions.${actionType}`, {}, action?.label || actionType || '');
    }

    const LOG_ACTION_KEYS = Object.freeze({
        'Renda': 'income',
        'Ajuda externa': 'foreign-aid',
        'Golpe de Estado': 'coup',
        'Taxar': 'tax',
        'Extorquir': 'steal',
        'Assassinar': 'assassinate',
        'Trocar (Embaixador)': 'exchange-ambassador',
        'Trocar (Inquisidor)': 'exchange-inquisitor',
        'Investigar': 'examine'
    });

    const LOG_ROLE_KEYS = Object.freeze({
        'Duque': 'duque',
        'Capitão': 'capitao',
        'Assassino': 'assassino',
        'Condessa': 'condessa',
        'Embaixador': 'embaixador',
        'Inquisidor': 'inquisidor'
    });

    function translateLoggedAction(label) {
        const actionKey = LOG_ACTION_KEYS[String(label || '').trim()];
        return actionKey ? actionLabel(actionKey) : label;
    }

    function translateLoggedRole(label) {
        const roleKey = LOG_ROLE_KEYS[String(label || '').trim()];
        return roleKey ? roleLabel(roleKey) : label;
    }

    function translateLogMessage(message) {
        const raw = String(message || '').trim();
        if (!raw) return '';

        const exactMessages = {
            'Sala reiniciada para uma nova partida.': 'rankedLog.roomReset',
            'A partida ranqueada começou. Sorteando quem joga primeiro.': 'rankedLog.rankedStarted',
            'A partida personalizada começou. Sorteando quem joga primeiro.': 'rankedLog.personalizedStarted',
            'A ação foi encerrada porque o alvo não está mais disponível.': 'rankedLog.actionTargetUnavailable',
            'A investigação foi encerrada porque o alvo não está mais disponível.': 'rankedLog.investigationTargetUnavailable',
            'A investigação foi encerrada porque o alvo não tem influências ocultas.': 'rankedLog.investigationNoHiddenInfluences'
        };
        if (exactMessages[raw]) return t(exactMessages[raw], {}, raw);

        let match = raw.match(/^Todos estão prontos\. A partida começa em (\d+) segundos\.$/);
        if (match) return t('rankedLog.allReady', { seconds: match[1] }, raw);

        match = raw.match(/^Matchmaking encontrou (.+)\.$/);
        if (match) return t('rankedLog.matchmakingFound', { name: match[1] }, raw);

        match = raw.match(/^(.+) entrou na sala\.$/);
        if (match) return t('rankedLog.playerJoined', { name: match[1] }, raw);

        match = raw.match(/^(.+) entrou como jogador IA\.$/);
        if (match) return t('rankedLog.aiJoined', { name: match[1] }, raw);

        match = raw.match(/^(.+) saiu da sala\.$/);
        if (match) return t('rankedLog.playerLeft', { name: match[1] }, raw);

        match = raw.match(/^(.+) foi removido da sala pelo criador\.$/);
        if (match) return t('rankedLog.playerRemovedByHost', { name: match[1] }, raw);

        match = raw.match(/^(.+) deixou a sala antes do início\.$/);
        if (match) return t('rankedLog.playerLeftBeforeStart', { name: match[1] }, raw);

        match = raw.match(/^(.+) está pronto\.$/);
        if (match) return t('rankedLog.playerReady', { name: match[1] }, raw);

        match = raw.match(/^(.+) cancelou a prontidão\.$/);
        if (match) return t('rankedLog.playerCanceledReady', { name: match[1] }, raw);

        match = raw.match(/^(.+) confirmou prontidão\.$/);
        if (match) return t('rankedLog.playerConfirmedReady', { name: match[1] }, raw);

        match = raw.match(/^(.+) começa a partida\.$/);
        if (match) return t('rankedLog.playerStarts', { name: match[1] }, raw);

        match = raw.match(/^Turno de (.+)\.$/);
        if (match) return t('rankedLog.playerTurn', { name: match[1] }, raw);

        match = raw.match(/^(.+) escolheu (.+) contra (.+)\.$/);
        if (match) return t('rankedLog.playerChoseActionAgainst', {
            name: match[1],
            action: translateLoggedAction(match[2]),
            target: match[3]
        }, raw);

        match = raw.match(/^(.+) escolheu (.+) declarando (.+)\.$/);
        if (match) return t('rankedLog.playerChoseClaimedAction', {
            name: match[1],
            action: translateLoggedAction(match[2]),
            role: translateLoggedRole(match[3])
        }, raw);

        match = raw.match(/^(.+) escolheu (.+)\.$/);
        if (match) return t('rankedLog.playerChoseAction', {
            name: match[1],
            action: translateLoggedAction(match[2])
        }, raw);

        match = raw.match(/^(.+) passou\.$/);
        if (match) return t('rankedLog.playerPassed', { name: match[1] }, raw);

        match = raw.match(/^(.+) contestou o bloqueio de (.+)\.$/);
        if (match) return t('rankedLog.playerChallengedBlock', { name: match[1], target: match[2] }, raw);

        match = raw.match(/^(.+) contestou (.+)\.$/);
        if (match) return t('rankedLog.playerChallenged', { name: match[1], target: match[2] }, raw);

        match = raw.match(/^(.+) bloqueou com (.+)\.$/);
        if (match) return t('rankedLog.playerBlockedWith', { name: match[1], role: translateLoggedRole(match[2]) }, raw);

        match = raw.match(/^(.+) provou ter (.+)\.$/);
        if (match) return t('rankedLog.playerProvedRole', { name: match[1], role: translateLoggedRole(match[2]) }, raw);

        match = raw.match(/^(.+) provou o bloqueio\.$/);
        if (match) return t('rankedLog.playerProvedBlock', { name: match[1] }, raw);

        match = raw.match(/^(.+) não tinha (.+)\.$/);
        if (match) return t('rankedLog.playerDidNotHaveRole', { name: match[1], role: translateLoggedRole(match[2]) }, raw);

        match = raw.match(/^(.+) blefou o bloqueio\.$/);
        if (match) return t('rankedLog.playerBluffedBlock', { name: match[1] }, raw);

        match = raw.match(/^(.+) perdeu (.+)\.$/);
        if (match) return t('rankedLog.playerLostRole', { name: match[1], role: translateLoggedRole(match[2]) }, raw);

        match = raw.match(/^(.+) foi eliminado\.$/);
        if (match) return t('rankedLog.playerEliminated', { name: match[1] }, raw);

        match = raw.match(/^O bloqueio de (.+) foi aceito\.$/);
        if (match) return t('rankedLog.blockAccepted', { name: match[1] }, raw);

        match = raw.match(/^(.+) roubou (\d+) moeda\(s\) de (.+)\.$/);
        if (match) return t('rankedLog.playerStoleCoins', { name: match[1], count: match[2], target: match[3] }, raw);

        match = raw.match(/^(.+) concluiu a troca\.$/);
        if (match) return t('rankedLog.playerCompletedExchange', { name: match[1] }, raw);

        match = raw.match(/^(.+) concluiu a investigação\.$/);
        if (match) return t('rankedLog.playerCompletedInvestigation', { name: match[1] }, raw);

        match = raw.match(/^(.+) venceu a partida ranqueada\.$/);
        if (match) return t('rankedLog.playerWonRanked', { name: match[1] }, raw);

        match = raw.match(/^(.+) venceu a partida personalizada\.$/);
        if (match) return t('rankedLog.playerWonPersonalized', { name: match[1] }, raw);

        return raw;
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
        setupSideStackSync();
        bindLanguageEvents();
    }

    function bindLanguageEvents() {
        if (languageEventsBound) return;
        languageEventsBound = true;
        root.CoupLanguage?.ready?.then(() => {
            root.CoupLanguage?.applyTranslations?.(document);
        });
        root.addEventListener?.('coup:languagechange', () => {
            renderRoomCode();
            renderChat(chatMessages);
            if (!state) return;
            renderPlayers();
            renderPhase();
            renderStarterDrawOverlay();
            renderMatchResultsModal();
            if (viewMode === 'game') renderLog();
            updateClock();
        });
    }

    function bindStaticEvents() {
        document.getElementById('leaveRankBtn')?.addEventListener('click', () => controller.leaveRoom());
        document.getElementById('rankRoomCode')?.addEventListener('click', async () => {
            const codeButton = document.getElementById('rankRoomCode');
            try {
                await navigator.clipboard.writeText(roomCode);
                codeButton?.classList.add('is-copied');
                if (codeButton) codeButton.textContent = t('ranked.roomCopied', {}, 'Código copiado');
                window.setTimeout(() => {
                    codeButton?.classList.remove('is-copied');
                    renderRoomCode();
                }, 1000);
            } catch (error) {
                showError(t('ranked.copyRoomCodeError', {}, 'Não foi possível copiar o código da sala.'));
            }
        });
        document.getElementById('rankRoomQr')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(getRankedInviteUrl());
                playRankSfx('pop');
            } catch (error) {
                showError(t('ranked.copyInviteError', {}, 'Não foi possível copiar o convite da sala.'));
            }
        });
        bindModal('rankCharacterActionsBtn', 'rankActionsModal', '#closeRankActionsBtn', resetActionsGuide);
        bindModal('rankSettingsBtn', 'rankSettingsModal', '#closeRankSettingsBtn', null, { silent: true });
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

    function attachRankCardBalatroEffect(cardElement) {
        if (!cardElement) return;
        cardElement.classList.add('rank-balatro-effect');

        cardElement.addEventListener('mousemove', (event) => {
            const rect = cardElement.getBoundingClientRect();
            const normalizedX = (event.clientX - rect.left) / rect.width - 0.5;
            const normalizedY = (event.clientY - rect.top) / rect.height - 0.5;
            const rotateX = normalizedY * -RANK_BALATRO_HOVER.tilt;
            const rotateY = normalizedX * RANK_BALATRO_HOVER.tilt;

            cardElement.style.setProperty('--rank-tilt-x', `${rotateX.toFixed(2)}deg`);
            cardElement.style.setProperty('--rank-tilt-y', `${rotateY.toFixed(2)}deg`);
            cardElement.style.setProperty('--rank-glow-x', `${(-normalizedX * RANK_BALATRO_HOVER.glowOffset).toFixed(2)}px`);
            cardElement.style.setProperty('--rank-glow-y', `${(-normalizedY * RANK_BALATRO_HOVER.glowOffset).toFixed(2)}px`);
            cardElement.classList.add('is-tilting');
        });

        cardElement.addEventListener('mouseleave', () => {
            cardElement.classList.remove('is-tilting');
            cardElement.style.removeProperty('--rank-tilt-x');
            cardElement.style.removeProperty('--rank-tilt-y');
            cardElement.style.removeProperty('--rank-glow-x');
            cardElement.style.removeProperty('--rank-glow-y');
        });
    }

    function setupRankCardInteractions() {
        if (cardInteractionsBound) return;
        cardInteractionsBound = true;

        document.addEventListener('dragstart', (event) => {
            if (!event.target.closest('.rank-card, img')) return;
            event.preventDefault();
        });

        document.addEventListener('contextmenu', (event) => {
            const cardElement = event.target.closest('.rank-card');
            const rankImage = event.target.closest('img');
            if (!cardElement && !rankImage) return;

            event.preventDefault();
            if (event.pointerType === 'touch' || event.pointerType === 'pen') return;
            if (!cardElement) return;

            hideRankCardTooltip();
            openRankCardPreviewModal({
                label: cardElement.dataset.cardLabel || t('ranked.hiddenCard', {}, 'Carta oculta'),
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
            close.setAttribute('aria-label', t('ranked.cardPreviewClose', {}, 'Fechar visualização da carta'));

        const flip = element('div', 'flip-card flip-horizontal-left');
        flip.id = 'rankPreviewFlipCard';
        flip.setAttribute('role', 'button');
        flip.tabIndex = 0;
            flip.setAttribute('aria-label', t('ranked.flipExpandedCard', {}, 'Virar carta ampliada'));

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
        flip?.setAttribute('aria-label', hidden
            ? t('ranked.hiddenExpandedCard', {}, 'Carta oculta ampliada')
            : t('ranked.expandedCard', { label: label || t('ranked.cardFallback', {}, 'Carta') }, `${label || 'Carta'} ampliada`));
        if (inner) inner.style.transform = 'rotateY(0deg)';
        modal.style.display = 'flex';
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

    function bindModal(openId, modalId, closeSelector, onOpen, options = {}) {
        const modal = document.getElementById(modalId);
        document.getElementById(openId)?.addEventListener('click', () => {
            if (!options.silent) playRankSfx('click');
            if (typeof onOpen === 'function') onOpen();
            showModal(modal);
        });
        modal?.querySelector(closeSelector)?.addEventListener('click', () => {
            if (!options.silent) playRankSfx('click');
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
        const name = player?.name || t('ranked.playerFallback', {}, 'Jogador');

        if (avatar) {
            avatar.src = player?.photo || 'assets/img/icons/ghost.svg';
            avatar.alt = t('ranked.profileOf', { name }, `Perfil de ${name}`);
        }

        setProfileText('rankPlayerProfileTitle', t('ranked.playerProfile', {}, 'Perfil do jogador'));
        setProfileText('rankPlayerProfileName', name);
        setProfileText('rankPlayerProfileStatus', t('ranked.loadingStats', {}, 'Carregando estatísticas...'));

        if (loading) {
            loading.hidden = false;
            loading.textContent = t('ranked.loadingStats', {}, 'Carregando estatísticas...');
        }
        if (statsGrid) statsGrid.hidden = true;
    }

    function renderRankPlayerProfile(player, stats, options = {}) {
        const name = stats?.name || player?.name || t('ranked.playerFallback', {}, 'Jogador');
        const photo = stats?.photo || player?.photo || 'assets/img/icons/ghost.svg';
        const games = profileNumber(stats?.games);
        const wins = profileNumber(stats?.wins);
        const losses = profileNumber(stats?.losses);
        const rankScore = profileNumber(stats?.rankScore ?? stats?.score ?? stats?.points);
        const status = options.status || (games
            ? t('lobby.gamesRegistered', { count: games }, `${games} jogo(s) ranqueado(s) registrados.`)
            : t('lobby.noRankedMatches', {}, 'Sem partidas ranqueadas registradas ainda.'));
        const avatar = document.getElementById('rankPlayerProfileAvatar');
        const loading = document.getElementById('rankPlayerProfileLoading');
        const statsGrid = document.getElementById('rankPlayerProfileStats');

        if (avatar) {
            avatar.src = photo;
            avatar.alt = t('ranked.profileOf', { name }, `Perfil de ${name}`);
        }

        setProfileText('rankPlayerProfileName', name);
        setProfileText('rankPlayerProfileStatus', status);
        setProfileText('rankPlayerProfileGames', games);
        setProfileText('rankPlayerProfileWins', wins);
        setProfileText('rankPlayerProfileLosses', losses);
        setProfileText('rankPlayerProfileWinRate', profilePercent(stats?.winRate));
        setProfileText('rankPlayerProfileScore', t('ranked.pointsValue', { points: rankScore }, `${rankScore} pts`));

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
                    ? t('ranked.aiProfileUnavailable', {}, 'Jogadores IA ainda não possuem perfil ranqueado persistido.')
                    : t('ranked.noLinkedProfile', {}, 'Este jogador ainda não possui perfil ranqueado vinculado.')
            });
            return;
        }

        const database = getProfileDatabase();
        if (!database) {
            renderRankPlayerProfile(player, null, {
                status: t('ranked.statsUnavailable', {}, 'Não foi possível acessar as estatísticas agora.')
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
                    status: t('lobby.statsLoadError', {}, 'Não foi possível carregar estatísticas.')
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
                showError(t('ranked.botNameRequired', {}, 'Informe um nome para o jogador IA.'));
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
            }).catch((error) => showError(error.message || t('ranked.addBotError', {}, 'Não foi possível adicionar o jogador IA.')));
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
        if (codeButton) codeButton.textContent = `${t('ranked.room', {}, 'Sala')}: ${roomCode || '----'}`;
        renderRoomQr();
    }

    function getRankedInviteUrl() {
        const inviteUrl = new URL('ranked/ranked-waiting.html', document.baseURI);
        inviteUrl.searchParams.set('room', roomCode || '');
        return inviteUrl.href;
    }

    function renderRoomQr() {
        const qrImage = document.getElementById('rankRoomQr');
        if (!qrImage || !roomCode) return;
        const data = encodeURIComponent(getRankedInviteUrl());
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=164x164&margin=8&data=${data}`;
        qrImage.title = t('ranked.copyInviteTitle', {}, 'Clique para copiar o convite da sala');
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
        const previousState = state;
        state = nextState;
        if (!state) return;
        hideLoading();
        playStateSfx(previousState, state);
        renderPlayers();
        renderPhase();
        renderStarterDrawOverlay();
        renderMatchResultsModal();
        if (viewMode === 'game') renderLog();
        updateClock();
        root.requestAnimationFrame?.(syncSideStackHeight);
    }

    function setupSideStackSync() {
        if (viewMode !== 'game') return;
        syncSideStackHeight();
        root.addEventListener?.('resize', syncSideStackHeight);
        const mainStack = document.querySelector('.rank-main-stack');
        if (!mainStack || typeof root.ResizeObserver !== 'function') return;
        sideStackResizeObserver?.disconnect();
        sideStackResizeObserver = new root.ResizeObserver(() => {
            root.requestAnimationFrame?.(syncSideStackHeight);
        });
        sideStackResizeObserver.observe(mainStack);
    }

    function syncSideStackHeight() {
        const sideStack = document.querySelector('.rank-side-stack');
        if (!sideStack) return;
        const isOverlayMode = root.matchMedia?.('(max-width: 980px)').matches;
        if (viewMode !== 'game' || isOverlayMode) {
            sideStack.style.removeProperty('--rank-side-stack-height');
            return;
        }
        const mainStack = document.querySelector('.rank-main-stack');
        const height = Math.ceil(mainStack?.getBoundingClientRect().height || 0);
        if (height > 0) {
            sideStack.style.setProperty('--rank-side-stack-height', `${height}px`);
        }
    }

    function renderPlayers() {
        const container = document.getElementById('rankPlayers');
        container.replaceChildren();
        container.classList.toggle('is-waiting-view', state.status === PHASES.WAITING);
        const bySeat = new Map(Engine.getPlayers(state).map((player) => [player.seat, player]));
        const activeUid = Engine.getActiveUid(state);
        const drawCandidates = new Set(state.starterDraw?.candidates || []);

        for (let seat = 1; seat <= Rules.SETTINGS.maxPlayers; seat += 1) {
            const player = bySeat.get(seat);
            if (!player) {
                const empty = element('article', 'rank-player-slot is-empty');
                const emptyText = element('div');
                emptyText.append(
                    element('strong', '', t('ranked.emptySeat', { seat }, `Lugar ${seat}`)),
                    element('div', 'rank-player-state', t('ranked.available', {}, 'Disponível'))
                );
                empty.append(emptyText);
                container.append(empty);
                continue;
            }

            const slot = element('article', 'rank-player-slot');
            slot.style.setProperty('--draw-seat', seat);
            if (player.uid === currentUid) slot.classList.add('is-self');
            if (player.uid === activeUid && state.status === 'active' && state.phase !== PHASES.STARTER_DRAW) slot.classList.add('is-active');
            if (state.phase === PHASES.STARTER_DRAW && drawCandidates.has(player.uid)) slot.classList.add('is-draw-candidate');
            if (player.eliminated) slot.classList.add('is-eliminated');

            const header = element('div', 'rank-player-header');
            const avatar = element('img', 'rank-player-avatar');
            if (player.ai) avatar.classList.add('is-ai-avatar');
            avatar.src = player.photo || 'assets/img/icons/ghost.svg';
            const playerName = player.name || t('ranked.playerFallback', {}, 'Jogador');
            avatar.alt = t('ranked.profileOf', { name: playerName }, `Perfil de ${playerName}`);
            avatar.title = t('ranked.viewPlayerProfile', {}, 'Ver perfil do jogador');
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
        if (player.eliminated) return t('ranked.eliminated', {}, 'Eliminado');
        if (player.ai && state.status === PHASES.WAITING) return player.ready ? t('ranked.aiReady', {}, 'IA pronta') : t('ranked.aiPreparing', {}, 'IA preparando-se');
        if (state.status === PHASES.WAITING) return player.ready ? t('ranked.ready', {}, 'Pronto') : t('ranked.preparing', {}, 'Preparando-se');
        if (state.phase === PHASES.STARTER_DRAW) return t('ranked.inStarterDraw', {}, 'No sorteio');
        if (player.uid === activeUid) return t('ranked.inGame', {}, 'Em jogo');
        return player.connected ? t('ranked.online', {}, 'Online') : t('ranked.reconnecting', {}, 'Reconectando');
    }

    function createCoinCounter(coinsValue) {
        const value = Number(coinsValue || 0);
        const counter = element('div', 'rank-coin-count');
        counter.setAttribute('aria-label', t('ranked.coinsLabel', { count: value }, `${value} moeda${value === 1 ? '' : 's'}`));
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
        const label = isVisible ? roleLabel(card.role) : t('ranked.hiddenCard', {}, 'Carta oculta');
        const previewImage = isVisible ? role.image : 'assets/img/cards/base/back.png';
        image.src = previewImage;
        image.alt = label;
        image.draggable = false;
        wrapper.dataset.cardId = card.id || '';
        wrapper.dataset.previewImage = previewImage;
        wrapper.dataset.previewHidden = isVisible ? 'false' : 'true';
        attachRankCardTooltip(wrapper, label);
        attachRankCardBalatroEffect(wrapper);
        wrapper.append(image);
        return wrapper;
    }

    function renderPhase() {
        const title = document.getElementById('rankPhaseTitle');
        const description = document.getElementById('rankPhaseDescription');
        const interaction = document.getElementById('rankInteraction');
        if (!title || !description || !interaction) return;
        const stage = title.closest('.rank-stage');
        stage?.classList.remove('is-centered-stage', 'is-finished-stage', 'is-response-stage', 'is-examine-stage', 'is-target-stage');
        interaction.replaceChildren();
        selectedAction = state.phase === PHASES.TURN ? selectedAction : null;

        if (state.status === PHASES.WAITING) {
            stage?.classList.add('is-centered-stage');
            setPhaseText(
                state.deadline ? t('ranked.starting', {}, 'Iniciando') : t('ranked.prepareTitle', {}, 'Prepare-se para a partida'),
                state.deadline ? t('ranked.allReady', {}, 'Tudo pronto.') : t('ranked.readyInstruction', {}, 'Aperte pronto para começar.')
            );
            renderWaiting(interaction);
            return;
        }

        if (state.status === PHASES.FINISHED) {
            stage?.classList.add('is-centered-stage', 'is-finished-stage');
            setPhaseText(t('ranked.matchFinished', {}, 'Partida encerrada'));
            const viewResults = element('button', 'rank-primary-btn', t('ranked.viewResult', {}, 'Ver resultado'));
            viewResults.type = 'button';
            viewResults.addEventListener('click', () => {
                playRankSfx('pop');
                matchResultsModalDismissed = false;
                renderMatchResultsModal(true);
            });
            interaction.append(viewResults);
            return;
        }

        if (state.phase === PHASES.STARTER_DRAW) {
            stage?.classList.add('is-centered-stage');
            setPhaseText(t('ranked.starterDraw', {}, 'Sorteio inicial'));
            return;
        }

        const activePlayer = Engine.getPlayer(state, Engine.getActiveUid(state));
        if (state.phase === PHASES.TURN) {
            if (activePlayer?.uid !== currentUid) {
                stage?.classList.add('is-centered-stage');
            }
            const choosingTarget = activePlayer?.uid === currentUid && selectedAction;
            if (choosingTarget) {
                stage?.classList.add('is-centered-stage', 'is-target-stage');
            }
            setPhaseText(
                choosingTarget
                    ? t('ranked.chooseTarget', {}, 'Escolha o alvo')
                    : activePlayer?.uid === currentUid
                        ? t('ranked.yourTurn', {}, 'Sua vez')
                        : t('ranked.playerTurn', { name: activePlayer?.name || t('ranked.playerFallbackLower', {}, 'jogador') }, `Vez de ${activePlayer?.name || 'jogador'}`),
                choosingTarget
                    ? [t('ranked.turnDescriptionLine1', {}, 'Escolha uma ação. O sistema aplica custos, abre as janelas de resposta'), t('ranked.turnDescriptionLine2', {}, 'e resolve a rodada automaticamente.')]
                    : describeTurnPhase(activePlayer)
            );
            renderTurn(interaction, activePlayer);
        } else if (state.phase === PHASES.RESPONSE) {
            stage?.classList.add(canCurrentPlayerRespond(state.pendingAction?.actorUid) ? 'is-response-stage' : 'is-centered-stage');
            setPhaseText(t('ranked.respond', {}, 'Responder'), describePendingAction());
            renderActionResponse(interaction);
        } else if (state.phase === PHASES.BLOCK_CHALLENGE) {
            stage?.classList.add(canCurrentPlayerRespond(state.pendingAction?.block?.uid) ? 'is-response-stage' : 'is-centered-stage');
            setPhaseText(t('ranked.block', {}, 'Bloqueio'), describePendingBlock());
            renderBlockChallenge(interaction);
        } else if (state.phase === PHASES.INFLUENCE_LOSS) {
            stage?.classList.add('is-centered-stage');
            setPhaseText(
                state.pendingLoss?.playerUid === currentUid ? t('ranked.revealCard', {}, 'Revele uma carta') : t('ranked.influenceLoss', {}, 'Perda de influência'),
                describeInfluenceLoss()
            );
            renderInfluenceLoss(interaction);
        } else if (state.phase === PHASES.EXCHANGE) {
            stage?.classList.add('is-centered-stage');
            setPhaseText(
                state.pendingExchange?.playerUid === currentUid ? t('ranked.chooseCards', {}, 'Escolha cartas') : t('ranked.exchange', {}, 'Troca'),
                describeExchangePhase()
            );
            renderExchange(interaction);
        } else if (state.phase === PHASES.EXAMINE) {
            stage?.classList.add('is-centered-stage', 'is-examine-stage');
            setPhaseText(
                state.pendingExamine?.actorUid === currentUid ? t('ranked.investigate', {}, 'Investigar') : t('ranked.investigation', {}, 'Investigação'),
                describeExaminePhase()
            );
            renderExamine(interaction);
        }

        function setPhaseText(titleText, descriptionText = '') {
            title.textContent = titleText;
            description.replaceChildren();
            const lines = Array.isArray(descriptionText) ? descriptionText : [descriptionText];
            lines.filter(Boolean).forEach((line, index) => {
                if (index > 0) description.append(document.createElement('br'));
                description.append(document.createTextNode(line));
            });
            description.hidden = !lines.some(Boolean);
        }
    }

    function renderWaiting(container) {
        const players = Engine.getPlayers(state);
        const readyCount = players.filter((player) => player.ready).length;
        const targetPlayers = state.matchmaking?.enabled
            ? Number(state.matchmaking.targetPlayers || Rules.SETTINGS.maxPlayers)
            : Rules.SETTINGS.maxPlayers;
        const safeTarget = Math.max(Rules.SETTINGS.minPlayers, Math.min(Rules.SETTINGS.maxPlayers, targetPlayers));
        const foundAllPlayers = players.length >= safeTarget;
        const allPlayersReady = foundAllPlayers && players.every((player) => player.ready);
        const statusText = !foundAllPlayers
            ? t('ranked.searchingAi', {}, 'Buscando oponentes IA...')
            : allPlayersReady
                ? getReadyCountdownText()
                : t('ranked.tableFound', {}, 'Mesa encontrada. Aguardando prontidão.');
        const foundCounter = element('span', 'rank-waiting-counter rank-waiting-found-counter', t('ranked.foundCounter', { count: players.length, target: safeTarget }, `${players.length}/${safeTarget} encontrados`));
        const summary = element('div', 'rank-waiting-summary');
        summary.append(
            foundCounter,
            element('span', 'rank-waiting-counter', t('ranked.readyCounter', { count: readyCount, target: safeTarget }, `${readyCount}/${safeTarget} prontos`)),
            element('span', 'rank-waiting-countdown', statusText)
        );

        const self = Engine.getPlayer(state, currentUid);
        const ready = element('button', self?.ready ? 'rank-secondary-btn' : 'rank-primary-btn', self?.ready ? t('ranked.cancelReady', {}, 'Cancelar prontidão') : t('ranked.imReady', {}, 'Estou pronto'));
        ready.type = 'button';
        ready.addEventListener('click', () => controller.toggleReady());

        container.append(summary, ready);
    }

    function getReadyCountdownText(now = Date.now()) {
        if (!state?.deadline || state.status !== PHASES.WAITING) return t('ranked.waitingConfirmation', {}, 'Aguardando confirmação');
        const seconds = Math.max(0, Math.ceil((state.deadline - now) / 1000));
        return t('ranked.startingIn', { seconds }, `Iniciando em ${seconds}s`);
    }

    function renderStarterDraw(container, starter) {
        const candidates = state.starterDraw?.candidates || state.turnOrder || [];
        const panel = element('div', 'rank-starter-draw');
        panel.append(element('p', 'rank-starter-title', t('ranked.drawInProgress', {}, 'Sorteador em andamento')));

        const list = element('div', 'rank-starter-list');
        candidates.forEach((uid, index) => {
            const player = Engine.getPlayer(state, uid);
            if (!player) return;
            const chip = element('div', 'rank-starter-chip');
            chip.style.setProperty('--draw-index', index);

            const avatar = element('img');
            if (player.ai) avatar.classList.add('is-ai-avatar');
            avatar.src = player.photo || 'assets/img/icons/ghost.svg';
            avatar.alt = '';
            avatar.referrerPolicy = 'no-referrer';
            chip.append(avatar, element('span', '', player.name));
            list.append(chip);
        });

        const result = element(
            'strong',
            'rank-starter-result',
            t('ranked.choosingPlayer', {}, 'Escolhendo jogador...')
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
            element('span', 'rank-kicker', t('ranked.starterDraw', {}, 'Sorteio inicial')),
            element('h2', '', t('ranked.whoStarts', {}, 'Quem começa?')),
            element('p', 'rank-phase-description', t('ranked.starterDrawDescription', {}, 'A mesa está sorteando aleatoriamente o primeiro turno.'))
        );

        const list = element('div', 'rank-starter-overlay-list');
        candidates.forEach((uid, index) => {
            const player = Engine.getPlayer(state, uid);
            if (!player) return;
            const chip = element('div', 'rank-starter-overlay-chip');
            chip.style.setProperty('--draw-index', index);
            if (player.uid === starter?.uid) chip.classList.add('is-winner');

            const avatar = element('img');
            if (player.ai) avatar.classList.add('is-ai-avatar');
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
            starter ? t('ranked.playerStarts', { name: starter.name }, `${starter.name} começa.`) : t('ranked.choosingPlayer', {}, 'Escolhendo jogador...')
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
            element('span', 'rank-kicker', t('ranked.finalResult', {}, 'Resultado final')),
            element('h2', '', winner ? t('ranked.playerWon', { name: winner.name }, `${winner.name} venceu`) : t('ranked.matchFinished', {}, 'Partida encerrada'))
        );
        heading.querySelector('h2').id = 'rankMatchResultsTitle';
        body.append(heading);
        renderMatchResults(body);
        playConquestSfxForResults();

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
        close.setAttribute('aria-label', t('ranked.closeResult', {}, 'Fechar resultado'));
        close.addEventListener('click', () => {
            playRankSfx('pop');
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
                element('span', 'rank-kicker', t('ranked.matchMvp', {}, 'Melhor jogador da partida')),
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
            const summary = element('summary', '', t('ranked.viewPoints', {}, 'Ver pontos'));
            const breakdown = element('ul');
            const items = player.performanceBreakdown || [];
            if (items.length) {
                items.forEach((item) => {
                    const li = element('li');
                    li.append(element('span', '', item.label), element('strong', '', formatSignedPoints(item.points)));
                    breakdown.append(li);
                });
            } else {
                breakdown.append(element('li', '', t('ranked.noScoreEvents', {}, 'Sem eventos pontuados.')));
            }
            details.append(summary, breakdown);

            row.append(
                element('span', 'rank-match-position', `${index + 1}`),
                element('strong', 'rank-match-player-name', player.name),
                element('span', 'rank-match-player-result', player.won ? t('ranked.winner', {}, 'Vencedor') : player.eliminated ? t('ranked.eliminated', {}, 'Eliminado') : t('ranked.survived', {}, 'Sobreviveu')),
                element('strong', `rank-match-points ${player.performanceScore >= 0 ? 'is-positive' : 'is-negative'}`, formatSignedPoints(player.performanceScore)),
                details
            );
            list.append(row);
        });
        panel.append(list);

        const actions = element('div', 'rank-match-result-actions');
        const restart = element('button', 'rank-primary-btn', t('ranked.restartMatch', {}, 'Reiniciar partida'));
        restart.type = 'button';
        restart.addEventListener('click', () => {
            playRankSfx('click');
            controller.restartMatch();
        });

        const back = element('button', 'rank-secondary-btn', t('ranked.backToLobby', {}, 'Voltar ao lobby'));
        back.type = 'button';
        back.addEventListener('click', () => controller.leaveRoom());
        actions.append(restart, back);
        panel.append(actions);
        container.append(panel);
    }

    function formatSignedPoints(value) {
        const points = Number(value || 0);
        return t('ranked.pointsValue', { points: `${points > 0 ? '+' : ''}${points}` }, `${points > 0 ? '+' : ''}${points} pts`);
    }

    function describeTurnPhase(activePlayer) {
        if (!activePlayer) return t('ranked.waitingNextPlayer', {}, 'Aguardando a mesa definir o próximo jogador.');
        if (activePlayer.uid === currentUid) {
            const self = Engine.getPlayer(state, currentUid);
            if (self?.coins >= Rules.SETTINGS.mandatoryCoupCoins) {
                return t('ranked.mandatoryCoup', {}, 'Você tem 10 moedas ou mais e precisa aplicar um Golpe de Estado.');
            }
            return `${t('ranked.turnDescriptionLine1', {}, 'Escolha uma ação. O sistema aplica custos, abre as janelas de resposta')} ${t('ranked.turnDescriptionLine2', {}, 'e resolve a rodada automaticamente.')}`;
        }
        return t('ranked.activeChoosing', { name: activePlayer.name }, `${activePlayer.name} está escolhendo a próxima ação da rodada.`);
    }

    function describeInfluenceLoss() {
        const loss = state.pendingLoss;
        const player = Engine.getPlayer(state, loss?.playerUid);
        if (!loss || !player) return '';
        const reason = loss.reason ? `${loss.reason}. ` : '';
        if (player.uid === currentUid) {
            return t('ranked.chooseInfluenceToReveal', { reason }, `${reason}Escolha a influência que será revelada para continuar a partida.`);
        }
        return t('ranked.playerMustReveal', { name: player.name }, `${player.name} precisa revelar uma influência para a partida continuar.`);
    }

    function describeExchangePhase() {
        const exchange = state.pendingExchange;
        const player = Engine.getPlayer(state, exchange?.playerUid);
        if (!exchange || !player) return '';
        if (player.uid === currentUid) {
            return t('ranked.chooseCardsToKeep', { count: exchange.keepCount }, `Escolha ${exchange.keepCount} carta(s) para manter na mão e concluir a troca.`);
        }
        return t('ranked.playerReorganizing', { name: player.name }, `${player.name} está reorganizando as cartas da mão.`);
    }

    function describeExaminePhase() {
        const examine = state.pendingExamine;
        const actor = Engine.getPlayer(state, examine?.actorUid);
        const target = Engine.getPlayer(state, examine?.targetUid);
        if (!examine || !actor) return '';
        if (actor.uid === currentUid) {
            return target
                ? t('ranked.chooseInfluenceFrom', { name: target.name }, `Escolha uma influência de ${target.name} para investigar.`)
                : t('ranked.chooseInfluenceInvestigated', {}, 'Escolha a influência que será investigada.');
        }
        return t('ranked.playerInvestigating', {
            actor: actor.name,
            target: target ? t('ranked.ofTarget', { name: target.name }, ` de ${target.name}`) : ''
        }, `${actor.name} está investigando uma influência${target ? ` de ${target.name}` : ''}.`);
    }

    function renderTurn(container, activePlayer) {
        if (activePlayer?.uid !== currentUid) {
            return;
        }

        if (selectedAction) {
            const targetPlayers = Engine.getAlivePlayers(state).filter((player) => player.uid !== currentUid);
            const targetCount = Math.min(targetPlayers.length, 5);
            const targets = element('div', `rank-target-list rank-target-list--count-${targetCount}`);
            targetPlayers.forEach((player) => {
                const button = element('button', 'rank-target-btn', player.name);
                button.type = 'button';
                button.addEventListener('click', () => {
                    controller.performAction(selectedAction, player.uid);
                    selectedAction = null;
                });
                targets.append(button);
            });
            const cancel = element('button', 'rank-secondary-btn rank-target-cancel', t('ranked.cancel', {}, 'Cancelar'));
            cancel.type = 'button';
            cancel.addEventListener('click', () => {
                selectedAction = null;
                renderPhase();
            });
            targets.append(cancel);
            container.append(targets);
            return;
        }

        const grid = element('div', 'rank-actions-grid');
        Object.values(ACTIONS).forEach((actionType) => {
            const action = Rules.getAction(actionType);
            const button = element('button', 'rank-action-btn');
            button.type = 'button';
            button.textContent = actionLabel(actionType);
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
        const claim = pending.claim ? t('ranked.actionClaim', { role: roleLabel(pending.claim) }, ` declarando ${roleLabel(pending.claim)}`) : '';
        const targetText = target ? t('ranked.actionTarget', { name: target.name }, `\ncontra ${target.name}`) : '';
        return t('ranked.pendingAction', {
            actor: actor.name,
            action: actionLabel(pending.type),
            claim,
            target: targetText
        }, `${actor.name} escolheu ${actionLabel(pending.type)}${claim}${targetText}.`);
    }

    function describePendingBlock() {
        const block = state.pendingAction?.block;
        const blocker = Engine.getPlayer(state, block?.uid);
        return block && blocker
            ? t('ranked.pendingBlock', {
                name: blocker.name,
                role: roleLabel(block.claim)
            }, `${blocker.name} bloqueou declarando ${roleLabel(block.claim)}.\nVocê pode contestar o bloqueio ou aceitar a resolução.`)
            : '';
    }

    function canCurrentPlayerRespond(excludedUid) {
        const self = Engine.getPlayer(state, currentUid);
        if (!self || self.eliminated || self.uid === excludedUid || state.pendingAction?.passes?.[self.uid]) return false;
        if (state.phase === PHASES.RESPONSE) {
            return Engine.getResponseUids(state).includes(currentUid);
        }
        return true;
    }

    function renderActionResponse(container) {
        const pending = state.pendingAction;
        if (!canCurrentPlayerRespond(pending.actorUid)) {
            return;
        }

        const actions = element('div', 'rank-response-actions');
        if (pending.claim && !pending.claimConfirmed) {
            const challenge = element('button', 'rank-danger-btn', t('ranked.challenge', {}, 'Contestar'));
            challenge.type = 'button';
            challenge.addEventListener('click', () => controller.challengeAction());
            actions.append(challenge);
        }
        Engine.getBlockClaimsForPlayer(state, currentUid).forEach((role) => {
            const block = element('button', 'rank-secondary-btn', t('ranked.blockWith', { role: roleLabel(role) }, `Bloquear: ${roleLabel(role)}`));
            block.type = 'button';
            block.addEventListener('click', () => controller.declareBlock(role));
            actions.append(block);
        });
        const pass = element('button', 'rank-primary-btn', t('ranked.pass', {}, 'Passar'));
        pass.type = 'button';
        pass.addEventListener('click', () => controller.passResponse());
        actions.append(pass);
        actions.classList.add(`rank-response-actions--count-${actions.children.length}`);
        container.append(actions);
    }

    function renderBlockChallenge(container) {
        const blockerUid = state.pendingAction?.block?.uid;
        if (!canCurrentPlayerRespond(blockerUid)) {
            return;
        }
        const actions = element('div', 'rank-response-actions');
        const challenge = element('button', 'rank-danger-btn', t('ranked.challengeBlock', {}, 'Contestar bloqueio'));
        challenge.type = 'button';
        challenge.addEventListener('click', () => controller.challengeBlock());
        const pass = element('button', 'rank-primary-btn', t('ranked.acceptBlock', {}, 'Aceitar bloqueio'));
        pass.type = 'button';
        pass.addEventListener('click', () => controller.passResponse());
        actions.append(challenge, pass);
        actions.classList.add(`rank-response-actions--count-${actions.children.length}`);
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
        const confirm = element('button', 'rank-primary-btn', t('ranked.confirmSelection', { selected: exchangeSelection.size, total: pending.keepCount }, `Confirmar ${exchangeSelection.size}/${pending.keepCount}`));
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
        const cards = element('div', 'rank-choice-cards rank-examine-cards');
        cards.append(createCard(card, true));
        const actions = element('div', 'rank-response-actions');
        const keep = element('button', 'rank-primary-btn', t('ranked.keepInfluence', {}, 'Manter influência'));
        keep.type = 'button';
        keep.addEventListener('click', () => controller.completeExamine(false));
        const replace = element('button', 'rank-secondary-btn', t('ranked.replaceWithDeck', {}, 'Trocar pelo baralho'));
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
            const item = element('div', `rank-log-entry is-${entry.type || 'info'}`, translateLogMessage(entry.message));
            log.append(item);
        });
        const turnNumber = document.getElementById('rankTurnNumber');
        if (turnNumber) turnNumber.textContent = t('ranked.turnNumber', { turn: state.turnNumber || 0 }, `Turno ${state.turnNumber || 0}`);
        log.scrollTop = log.scrollHeight;
    }

    function copyOfficialLog() {
        const button = document.getElementById('copyRankLogBtn');
        const lines = (state?.log || []).map((entry) => {
            const turn = entry.turn ? t('ranked.turnLog', { turn: entry.turn }, `Turno ${entry.turn}`) : t('ranked.turnLog', { turn: 0 }, 'Turno 0');
            return `[${turn}] ${translateLogMessage(entry.message)}`;
        });
        const text = [
            t('ranked.logHeader', { room: roomCode }, `Coup Master - registro ranqueado da sala ${roomCode}`),
            t('ranked.currentTurn', { turn: state?.turnNumber || 0 }, `Turno atual: ${state?.turnNumber || 0}`),
            '',
            ...lines
        ].join('\n');
        navigator.clipboard.writeText(text).then(() => {
            playRankSfx('pop');
            if (!button) return;
            button.textContent = t('ranked.copied', {}, 'Copiado');
            window.setTimeout(() => { button.textContent = t('ranked.copyLog', {}, 'Copiar log'); }, 1200);
        }).catch(() => showError(t('ranked.copyLogError', {}, 'Não foi possível copiar o registro oficial.')));
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
            controller.sendChat(message);
            input.value = '';
        });
    }

    function setupAudioControls() {
        const bgm = document.getElementById('rankBgmAudio');
        const musicBtn = document.getElementById('rankMusicBtn');
        const musicSlider = document.getElementById('rankVolumeSlider');
        const effectsSlider = document.getElementById('rankEffectsVolumeSlider');
        const musicVolume = readRankStoredVolume('rankMusicVolume', DEFAULT_RANK_MUSIC_VOLUME);
        const effectsVolume = readRankStoredVolume('rankEffectsVolume', DEFAULT_RANK_SFX_VOLUME);
        const bgmGuard = bgm && root.CoupAudioGuard
            ? root.CoupAudioGuard.createBackgroundAudioGuard(bgm, { button: musicBtn })
            : null;

        rankBgmAudio = bgm;
        rankBgmGuard = bgmGuard;
        rankMusicVolume = normalizeVolume(musicVolume);
        root.rankSfxVolume = normalizeVolume(effectsVolume, DEFAULT_RANK_SFX_VOLUME);
        if (bgm) {
            const restoredPosition = restoreRankBgmPosition(bgm);
            bgm.addEventListener('timeupdate', saveRankBgmPosition);
            setRankBgmVolume(0);
            resumeRankBgmPreservingPosition({
                fadeIn: true,
                randomStart: !restoredPosition
            })
                .then((played) => {
                    if (played) musicBtn?.classList.remove('muted');
                    else musicBtn?.classList.add('muted');
                });
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
                rankMusicVolume = value;
                if (bgm) {
                    setRankBgmVolume(isAnyRankAmbienceActive() ? getDuckedBgmVolume() : rankMusicVolume);
                    if (value > 0) {
                        resumeRankBgmPreservingPosition().catch(() => null);
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
                updateActiveAmbienceVolumes();
                localStorage.setItem('rankEffectsVolume', String(value));
            });
        }
    }

    function normalizeVolume(value, fallback = 1) {
        if (value === null || value === undefined || value === '') return fallback;
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(0, Math.min(1, number));
    }

    function readRankStoredVolume(key, fallback) {
        const storedValue = localStorage.getItem(key);
        return normalizeVolume(storedValue, fallback);
    }

    function playRankSfx(id) {
        const sound = document.getElementById(`rank-audio-${id}`);
        if (!sound) return;
        sound.volume = normalizeVolume(root.rankSfxVolume);
        sound.currentTime = 0;
        sound.play().catch(() => null);
    }

    function setRankBgmVolume(value) {
        const volume = normalizeVolume(value);
        if (rankBgmGuard) {
            rankBgmGuard.setVolume(volume);
        } else if (rankBgmAudio) {
            rankBgmAudio.volume = volume;
        }
    }

    function getDuckedBgmVolume() {
        return normalizeVolume(rankMusicVolume * TENSION_BGM_DUCK_RATIO);
    }

    function getAmbienceTargetVolume() {
        return normalizeVolume(root.rankSfxVolume) * 0.9;
    }

    function isAnyRankAmbienceActive() {
        return tensionLayerActive || investigationLayerActive;
    }

    function updateActiveAmbienceVolumes() {
        [
            ['tense-moment', tensionLayerActive],
            ['suspense-investigation', investigationLayerActive]
        ].forEach(([id, active]) => {
            const audio = active ? document.getElementById(`rank-audio-${id}`) : null;
            if (audio) audio.volume = getAmbienceTargetVolume();
        });
    }

    function saveRankBgmPosition() {
        if (!rankBgmAudio || !Number.isFinite(rankBgmAudio.currentTime)) return;
        sessionStorage.setItem(getRankBgmPositionKey(), String(rankBgmAudio.currentTime));
    }

    function restoreRankBgmPosition(audio) {
        const savedPosition = Number(sessionStorage.getItem(getRankBgmPositionKey()));
        if (!Number.isFinite(savedPosition) || savedPosition <= 0) return false;

        const applyPosition = () => {
            if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
                audio.currentTime = savedPosition;
                return;
            }
            audio.currentTime = savedPosition % audio.duration;
        };

        try {
            if (audio.readyState >= 1) applyPosition();
            else audio.addEventListener('loadedmetadata', applyPosition, { once: true });
        } catch (error) {
            // Alguns navegadores recusam seek antes dos metadados.
        }

        return true;
    }

    function getRankBgmPositionKey() {
        return `${RANK_BGM_POSITION_KEY}:${location.pathname}:${roomCode || 'room'}`;
    }

    function resumeRankBgmPreservingPosition(options = {}) {
        if (!rankBgmAudio || rankMusicVolume <= 0) return Promise.resolve(false);

        const currentPosition = Number(rankBgmAudio.currentTime || 0);
        const targetVolume = isAnyRankAmbienceActive() ? getDuckedBgmVolume() : rankMusicVolume;
        const restorePositionIfReset = () => {
            if (currentPosition > 0 && rankBgmAudio.currentTime < Math.max(0.1, currentPosition - 0.5)) {
                try {
                    rankBgmAudio.currentTime = currentPosition;
                } catch (error) {
                    // Falha de seek nao deve quebrar a mesa.
                }
            }
        };

        if (!rankBgmAudio.paused) {
            if (options.fadeIn) fadeAudioVolume(rankBgmAudio, targetVolume, BGM_INTRO_FADE_MS, 'bgm');
            return Promise.resolve(true);
        }

        const prepareStart = options.randomStart && root.CoupAudioGuard?.prepareRandomBackgroundStart
            ? root.CoupAudioGuard.prepareRandomBackgroundStart(rankBgmAudio)
            : Promise.resolve(false);

        return prepareStart.then(() => {
            const playPromise = rankBgmGuard
                ? rankBgmGuard.play()
                : rankBgmAudio.play().then(() => true).catch(() => false);

            return playPromise;
        }).then((played) => {
            if (played) {
                restorePositionIfReset();
                if (options.fadeIn) fadeAudioVolume(rankBgmAudio, targetVolume, BGM_INTRO_FADE_MS, 'bgm');
                else setRankBgmVolume(targetVolume);
            } else {
                setRankBgmVolume(targetVolume);
            }
            return played;
        });
    }

    function fadeAudioVolume(audio, toVolume, durationMs, tokenName, onDone) {
        if (!audio) return;
        const fromVolume = Number(audio.volume || 0);
        const targetVolume = normalizeVolume(toVolume);
        const start = performance.now();
        const token = incrementFadeToken(tokenName);

        function step(now) {
            const currentToken = getFadeToken(tokenName);
            if (token !== currentToken) return;

            const progress = durationMs <= 0 ? 1 : Math.min(1, (now - start) / durationMs);
            const eased = 1 - ((1 - progress) ** 3);
            const nextVolume = fromVolume + ((targetVolume - fromVolume) * eased);

            if (tokenName === 'bgm') setRankBgmVolume(nextVolume);
            else audio.volume = normalizeVolume(nextVolume);

            if (progress < 1) {
                requestAnimationFrame(step);
                return;
            }

            if (typeof onDone === 'function') onDone();
        }

        requestAnimationFrame(step);
    }

    function incrementFadeToken(tokenName) {
        if (tokenName === 'bgm') {
            bgmFadeToken += 1;
            return bgmFadeToken;
        }
        if (tokenName === 'investigation') {
            investigationFadeToken += 1;
            return investigationFadeToken;
        }
        tensionFadeToken += 1;
        return tensionFadeToken;
    }

    function getFadeToken(tokenName) {
        if (tokenName === 'bgm') return bgmFadeToken;
        if (tokenName === 'investigation') return investigationFadeToken;
        return tensionFadeToken;
    }

    function getAmbienceLayerActive(layerName) {
        return layerName === 'investigation' ? investigationLayerActive : tensionLayerActive;
    }

    function setAmbienceLayerActive(layerName, active) {
        if (layerName === 'investigation') {
            investigationLayerActive = active;
            return;
        }
        tensionLayerActive = active;
    }

    function fadeBgmForAmbience(durationMs) {
        if (!rankBgmAudio) return;
        fadeAudioVolume(
            rankBgmAudio,
            isAnyRankAmbienceActive() ? getDuckedBgmVolume() : rankMusicVolume,
            durationMs,
            'bgm'
        );
    }

    function startAmbienceLayer(audioId, layerName) {
        const audio = document.getElementById(`rank-audio-${audioId}`);
        if (!audio) return;

        if (getAmbienceLayerActive(layerName)) {
            if (audio.paused) audio.play().catch(() => null);
            return;
        }

        setAmbienceLayerActive(layerName, true);
        audio.loop = true;
        audio.volume = 0;
        if (audio.paused) audio.currentTime = 0;
        audio.play().catch(() => null);

        fadeAudioVolume(audio, getAmbienceTargetVolume(), TENSION_FADE_IN_MS, layerName);
        fadeBgmForAmbience(TENSION_FADE_IN_MS);
    }

    function stopAmbienceLayer(audioId, layerName) {
        const audio = document.getElementById(`rank-audio-${audioId}`);
        if (!audio || (!getAmbienceLayerActive(layerName) && audio.paused)) return;

        setAmbienceLayerActive(layerName, false);
        fadeAudioVolume(audio, 0, TENSION_FADE_OUT_MS, layerName, () => {
            if (getAmbienceLayerActive(layerName)) return;
            audio.pause();
            audio.currentTime = 0;
        });
        fadeBgmForAmbience(TENSION_FADE_OUT_MS);
    }

    function startTensionLayer() {
        startAmbienceLayer('tense-moment', 'tension');
    }

    function stopTensionLayer() {
        stopAmbienceLayer('tense-moment', 'tension');
    }

    function syncTensionLayer(nextState) {
        const shouldPlay = nextState?.phase === PHASES.INFLUENCE_LOSS && Boolean(nextState?.pendingLoss);
        if (shouldPlay) startTensionLayer();
        else stopTensionLayer();
    }

    function startInvestigationLayer() {
        startAmbienceLayer('suspense-investigation', 'investigation');
    }

    function stopInvestigationLayer() {
        stopAmbienceLayer('suspense-investigation', 'investigation');
    }

    function syncInvestigationLayer(nextState) {
        const shouldPlay = nextState?.phase === PHASES.EXAMINE && Boolean(nextState?.pendingExamine);
        if (shouldPlay) startInvestigationLayer();
        else stopInvestigationLayer();
    }

    function getLatestLog(stateValue, type) {
        const log = Array.isArray(stateValue?.log) ? stateValue.log : [];
        for (let index = log.length - 1; index >= 0; index -= 1) {
            if (log[index]?.type === type) return log[index];
        }
        return null;
    }

    function getLatestLogKey(stateValue, type) {
        const entry = getLatestLog(stateValue, type);
        if (!entry) return '';
        return String(entry.id || `${entry.timestamp || ''}:${entry.turn || ''}:${entry.message || ''}`);
    }

    function getSoundSnapshot(stateValue) {
        return {
            actionId: stateValue?.pendingAction?.id || '',
            actionType: stateValue?.pendingAction?.type || '',
            phase: stateValue?.phase || '',
            pendingLossKey: stateValue?.pendingLoss
                ? [
                    stateValue.pendingLoss.playerUid || '',
                    stateValue.pendingLoss.reason || '',
                    stateValue.pendingLoss.continuation || '',
                    stateValue.deadline || ''
                ].join('|')
                : '',
            pendingExamineKey: stateValue?.pendingExamine
                ? [
                    stateValue.pendingExamine.actorUid || '',
                    stateValue.pendingExamine.targetUid || '',
                    stateValue.pendingExamine.cardId || ''
                ].join('|')
                : '',
            pendingExchangeKey: stateValue?.pendingExchange
                ? [
                    stateValue.pendingExchange.playerUid || '',
                    (stateValue.pendingExchange.options || []).map((card) => card.id).join(','),
                    stateValue.pendingExchange.keepCount || ''
                ].join('|')
                : '',
            latestActionKey: getLatestLogKey(stateValue, 'action'),
            latestActionMessage: getLatestLog(stateValue, 'action')?.message || '',
            latestChallengeKey: getLatestLogKey(stateValue, 'challenge'),
            latestChallengeResultKey: getLatestLogKey(stateValue, 'challenge-result'),
            latestChallengeResultMessage: getLatestLog(stateValue, 'challenge-result')?.message || '',
            latestBlockKey: getLatestLogKey(stateValue, 'block'),
            latestLossKey: getLatestLogKey(stateValue, 'loss'),
            status: stateValue?.status || '',
            winnerUid: stateValue?.winnerUid || '',
            finishedAt: stateValue?.finishedAt || ''
        };
    }

    function playStateSfx(previousState, nextState) {
        const next = getSoundSnapshot(nextState);
        const previous = previousSoundSnapshot || getSoundSnapshot(previousState);
        previousSoundSnapshot = next;
        syncTensionLayer(nextState);
        syncInvestigationLayer(nextState);

        if (!previousState) return;

        if (next.status === PHASES.FINISHED && previous.status !== PHASES.FINISHED) {
            playRankSfx(next.winnerUid === currentUid ? 'victory' : 'defeat-dun');
        }

        if (next.latestChallengeKey && next.latestChallengeKey !== previous.latestChallengeKey) {
            playRankSfx('challenge-suspensful');
        }

        if (next.latestBlockKey && next.latestBlockKey !== previous.latestBlockKey) {
            playRankSfx('block-blades');
        }

        if (next.latestChallengeResultKey && next.latestChallengeResultKey !== previous.latestChallengeResultKey
            && next.latestChallengeResultMessage.includes('provou')) {
            playRankSfx('shuffle');
            playRankSfx('card-slide');
        }

        if (next.phase === PHASES.INFLUENCE_LOSS && next.pendingLossKey && next.pendingLossKey !== previous.pendingLossKey) {
            startTensionLayer();
        }

        if (next.phase === PHASES.EXCHANGE && next.pendingExchangeKey && next.pendingExchangeKey !== previous.pendingExchangeKey) {
            playRankSfx('card-slide');
        }

        if (next.actionId && next.actionId !== previous.actionId) {
            playActionStartSfx(next.actionType);
        }

        if (!next.actionId && next.latestActionKey && next.latestActionKey !== previous.latestActionKey) {
            playImmediateActionSfx(next.latestActionMessage);
        }

        playActionResolutionSfx(previousState, nextState);
        playDeckReturnSfx(previousState, nextState);
    }

    function playActionStartSfx(actionType) {
        if (actionType === ACTIONS.ASSASSINATE) {
            playRankSfx('ninja-star');
        }
    }

    function playActionResolutionSfx(previousState, nextState) {
        const previousAction = previousState?.pendingAction;
        const nextAction = nextState?.pendingAction;
        if (!previousAction || nextAction?.id === previousAction.id) return;

        const actorBefore = Engine.getPlayer(previousState, previousAction.actorUid);
        const actorAfter = Engine.getPlayer(nextState, previousAction.actorUid);
        const targetBefore = previousAction.targetUid ? Engine.getPlayer(previousState, previousAction.targetUid) : null;
        const targetAfter = previousAction.targetUid ? Engine.getPlayer(nextState, previousAction.targetUid) : null;

        if (didCoinActionResolve(previousAction.type, actorBefore, actorAfter, targetBefore, targetAfter)) {
            playRankSfx('coin');
        }

        if (previousAction.type === ACTIONS.COUP && targetBefore && targetAfter && countHiddenInfluences(targetAfter) < countHiddenInfluences(targetBefore)) {
            playRankSfx('unity-sword');
        }

        if (previousAction.type === ACTIONS.ASSASSINATE && targetBefore && targetAfter && countHiddenInfluences(targetAfter) < countHiddenInfluences(targetBefore)) {
            playRankSfx('knife');
        }
    }

    function playImmediateActionSfx(message) {
        if (message.includes('Renda')) {
            playRankSfx('coin');
        }
    }

    function playDeckReturnSfx(previousState, nextState) {
        if (previousState?.phase === PHASES.EXCHANGE && !nextState?.pendingExchange) {
            playRankSfx('shuffle');
        }

        const previousExamine = previousState?.pendingExamine;
        if (previousState?.phase !== PHASES.EXAMINE || !previousExamine || nextState?.pendingExamine) return;

        const targetAfter = Engine.getPlayer(nextState, previousExamine.targetUid);
        const examinedStillInHand = (targetAfter?.influences || []).some((card) => card.id === previousExamine.cardId);
        if (!examinedStillInHand) {
            playRankSfx('shuffle');
            playRankSfx('card-slide');
        }
    }

    function didCoinActionResolve(actionType, actorBefore, actorAfter, targetBefore, targetAfter) {
        if (!actorBefore || !actorAfter) return false;
        const actorCoinDelta = Number(actorAfter.coins || 0) - Number(actorBefore.coins || 0);

        if ([ACTIONS.INCOME, ACTIONS.FOREIGN_AID, ACTIONS.TAX].includes(actionType)) {
            return actorCoinDelta > 0;
        }

        if (actionType === ACTIONS.STEAL && targetBefore && targetAfter) {
            const targetCoinDelta = Number(targetAfter.coins || 0) - Number(targetBefore.coins || 0);
            return actorCoinDelta > 0 && targetCoinDelta < 0;
        }

        return false;
    }

    function countHiddenInfluences(player) {
        return (player?.influences || []).filter((card) => !card.revealed).length;
    }

    function playConquestSfxForResults() {
        if (state?.status !== PHASES.FINISHED) return;
        const result = Engine.buildMatchResults(state, Date.now())?.players?.[currentUid];
        if (!result?.won) return;

        const achievements = [
            Number(result.matchStats?.coups || 0) > 0,
            Number(result.matchStats?.assassinations || 0) > 0,
            Number(result.matchStats?.successfulChallenges || 0) > 0,
            Number(result.matchStats?.coinsStolen || 0) >= 4,
            Number(result.performanceScore || 0) >= 35
        ];
        const hasConquest = achievements.some(Boolean);
        const key = `${roomCode}:${state.matchId || state.finishedAt || state.winnerUid}:conquest`;

        if (hasConquest && !playedConquestKeys.has(key)) {
            playedConquestKeys.add(key);
            window.setTimeout(() => playRankSfx('conquest'), 900);
        }
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
            list.append(element('p', 'chat-empty-message', t('ranked.noMessages', {}, 'Nenhuma mensagem ainda.')));
            return;
        }
        chatMessages.forEach((message) => {
            const item = element('article', `chat-message${message.quick ? ' is-quick' : ''}`);
            item.append(
                element('div', 'chat-message-meta', message.name || t('ranked.playerFallback', {}, 'Jogador')),
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

