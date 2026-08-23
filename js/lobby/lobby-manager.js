// =======================================================
// === ELEMENTOS DO DOM (REFERÊNCIAS) ===
// =======================================================
const logoutBtn = document.getElementById('logout-btn');
const userInfoDiv = document.getElementById('user-info');
const userNameSpan = document.getElementById('user-name');
const userPhotoImg = document.getElementById('user-photo');
const roomActionsDiv = document.getElementById('room-actions');
const roomCodeInput = document.getElementById('room-code-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const rankedModeInput = document.getElementById('ranked-mode-input');
const personalizedModeInput = document.getElementById('personalized-mode-input');
const rankedModeNote = document.getElementById('ranked-mode-note');
const playerStatsModal = document.getElementById('playerStatsModal');
const closePlayerStatsModalBtn = document.getElementById('closePlayerStatsModalBtn');
const playerStatsLoading = document.getElementById('playerStatsLoading');
const playerStatsBody = document.getElementById('playerStatsBody');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeLeaderboardModalBtn = document.getElementById('closeLeaderboardModalBtn');
const leaderboardLoading = document.getElementById('leaderboardLoading');
const leaderboardList = document.getElementById('leaderboardList');

let currentLobbyUser = null;
let lastRenderedStats = null;
let lastLeaderboardEntries = null;

function t(key, params) {
    return window.CoupLanguage?.t(key, params) || key;
}

function waitForLanguage() {
    return window.CoupLanguage?.ready || Promise.resolve();
}

function getModeLabel(mode) {
    const normalizedMode = CoupGameModes.normalize(mode);
    if (CoupGameModes.isRanked(normalizedMode)) return t('lobby.ranked');
    if (CoupGameModes.isPersonalized(normalizedMode)) return t('lobby.personalized');
    return t('lobby.casual');
}

// =======================================================
// === SISTEMA DE TRATAMENTO DE ERROS (MODAL) ===
// =======================================================

/**
 * Exibe mensagens de erro em um modal customizado.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
function showError(message) {
    hideLoader();
    const modal = document.getElementById('errorModal');
    const text = document.getElementById('errorModalText');
    if (modal && text) {
        text.innerText = message;
        modal.style.display = 'flex';
    }
}

function setLoaderMessage(message) {
    const loaderMessage = document.getElementById('loader-message');
    if (loaderMessage) loaderMessage.textContent = message;
}

function showLoader(message) {
    const loader = document.getElementById('font-loader');
    if (message) setLoaderMessage(message);
    if (loader) {
        loader.classList.remove('hidden');
        loader.style.display = 'flex';
    }
}

function hideLoader() {
    const loader = document.getElementById('font-loader');
    if (loader) loader.style.display = 'none';
}

function waitForFonts() {
    if (document.fonts) return document.fonts.ready.catch(() => null);
    return new Promise(resolve => setTimeout(resolve, 1000));
}

function getSelectedGameMode() {
    const selectedMode = document.querySelector('input[name="game-mode"]:checked');
    return CoupGameModes.normalize(selectedMode?.value);
}

function isAnonymousSession() {
    return sessionStorage.getItem('currentIsAnonymous') === 'true';
}

function requiresGoogleAccount(mode) {
    return CoupGameModes.isAutomated(mode);
}

function setRankedModeAvailability(user) {
    const canAccessRanked = CoupGameModes.canAccessRanked(user);

    [rankedModeInput, personalizedModeInput].forEach((input) => {
        if (!input) return;
        input.disabled = !canAccessRanked;

        if (!canAccessRanked && input.checked) {
            const casualModeInput = document.querySelector('input[name="game-mode"][value="casual"]');
            if (casualModeInput) casualModeInput.checked = true;
        }
    });

    if (rankedModeNote) {
        rankedModeNote.hidden = false;
        rankedModeNote.textContent = canAccessRanked
            ? t('lobby.rankedNoteAvailable')
            : t('lobby.rankedNoteLocked');
    }
}

function openRoom(code, mode) {
    const normalizedMode = CoupGameModes.normalize(mode);
    sessionStorage.setItem('currentRoomMode', normalizedMode);
    const destination = CoupGameModes.isRanked(normalizedMode)
        ? 'ranked/ranked-waiting.html'
        : CoupGameModes.isPersonalized(normalizedMode)
            ? 'personalized/personalized-waiting.html'
            : 'index.html';
    showLoader(CoupGameModes.isAutomated(normalizedMode)
        ? t('lobby.automatedRoomLoading', { mode: getModeLabel(normalizedMode).toLowerCase() })
        : t('lobby.roomLoading'));
    window.location.href = `${destination}?room=${code}`;
}

function readRoomMode(code) {
    return db.ref(`salas/${code}/mode`).once('value').then((modeSnapshot) => {
        if (modeSnapshot.exists()) return CoupGameModes.normalize(modeSnapshot.val());

        return db.ref(`salas/${code}/gameState`).once('value').then((stateSnapshot) => {
            if (!stateSnapshot.exists()) return null;
            return CoupGameModes.fromRoom({ gameState: stateSnapshot.val() });
        });
    });
}

// Configuração do evento de fechamento do modal de erro
const closeErrorBtn = document.getElementById('closeErrorModalBtn');
if (closeErrorBtn) {
    closeErrorBtn.onclick = () => {
        const modal = document.getElementById('errorModal');
        if (modal) modal.style.display = 'none';
    };
}

// =======================================================
// === FUNÇÕES DE AUTENTICAÇÃO (FIREBASE AUTH) ===
// =======================================================

/**
 * Realiza o Logout do usuário atual.
 */
if (logoutBtn) {
    logoutBtn.onclick = () => {
        showLoader(t('lobby.returningLogin'));
        auth.signOut().finally(() => {
            window.location.href = 'login.html';
        });
    };
}

function getUserDisplayData(user) {
    let safeName = user.displayName;

    if (!safeName && user.email) {
        safeName = user.email.split('@')[0];
    } else if (!safeName && user.isAnonymous) {
        safeName = t('login.visitorName');
    } else if (!safeName) {
        safeName = t('login.visitorName');
    }

    const safePhoto = user.photoURL || "assets/img/icons/ghost.svg";

    return { safeName, safePhoto };
}

function persistUserSession(user) {
    const { safeName, safePhoto } = getUserDisplayData(user);

    sessionStorage.setItem('currentUID', user.uid);
    sessionStorage.setItem('currentName', safeName);
    sessionStorage.setItem('currentPhoto', safePhoto);
    sessionStorage.setItem('currentIsAnonymous', user.isAnonymous ? 'true' : 'false');

    return { safeName, safePhoto };
}

function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return '0%';
    return `${Math.round(number * 100)}%`;
}

function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function statNumberValue(value) {
    if (typeof value === 'string') {
        const match = value.match(/-?\d+(\.\d+)?/);
        return match ? Number(match[0]) : 0;
    }

    return numberValue(value);
}

function getDefaultRankedStats(user) {
    const { safeName, safePhoto } = getUserDisplayData(user || {});
    return {
        uid: user?.uid || '',
        name: safeName,
        photo: safePhoto,
        games: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        currentWinStreak: 0,
        bestWinStreak: 0,
        rankScore: 0,
        challengeAccuracy: 0,
        actions: 0,
        successfulChallenges: 0,
        failedChallenges: 0,
        challenges: 0,
        assassinations: 0,
        coups: 0,
        steals: 0,
        coinsStolen: 0,
        comebackWins: 0,
        finalInfluenceWins: 0,
        perfectWins: 0,
        perfectBluffWins: 0,
        doubleContessaWins: 0,
        condessaBlocks: 0,
        successfulBlocks: 0,
        falseCondessaBluffs: 0,
        contestedAssassinsWon: 0,
        ambassadorExchanges: 0,
        inquisitorInspections: 0,
        dukeTaxes: 0,
        foreignAidBlocks: 0,
        taxBluffs: 0,
        captainBlocks: 0,
        ambassadorBlocks: 0,
        forcedCoups: 0,
        winsAsFirstPlayer: 0,
        winsAgainstFivePlayers: 0,
        winsWithNoCoins: 0,
        fastestWins: 0,
        longestGamesWon: 0,
        revengeWins: 0,
        flawlessChallenges: 0,
        allRolesClaimedWins: 0,
        bluffs: 0,
        honestGames: 0,
        countedRooms: {}
    };
}

function getPlayStyle(stats) {
    if (!numberValue(stats.games)) return t('lobby.noRankedHistory');

    const aggressive = numberValue(stats.coups) + numberValue(stats.assassinations);
    const tactical = numberValue(stats.steals);
    const challenger = numberValue(stats.challenges);
    const bluff = numberValue(stats.bluffs);

    const styles = [
        { label: t('lobby.aggressiveExecutor'), value: aggressive },
        { label: t('lobby.tacticalOpportunist'), value: tactical },
        { label: t('lobby.bluffHunter'), value: challenger },
        { label: t('lobby.bluffMaster'), value: bluff }
    ].sort((left, right) => right.value - left.value);

    if (styles[0].value <= 0) return t('lobby.carefulStrategist');
    return styles[0].label;
}

function getAchievements(stats) {
    const achievement = (key, unlocked) => ({
        title: t(`lobby.achievements.${key}.title`),
        description: t(`lobby.achievements.${key}.description`),
        unlocked
    });

    return [
        achievement('firstWin', numberValue(stats.wins) >= 1),
        achievement('courtEntry', numberValue(stats.games) >= 1),
        achievement('knownName', numberValue(stats.games) >= 5),
        achievement('intrigueVeteran', numberValue(stats.games) >= 25),
        achievement('tableLegend', numberValue(stats.games) >= 100),
        achievement('honestPlayer', numberValue(stats.honestGames) >= 1),
        achievement('unlikelySaint', numberValue(stats.honestGames) >= 5),
        achievement('cleverLiar', numberValue(stats.bluffs) >= 10),
        achievement('lieGod', numberValue(stats.bluffs) >= 50),
        achievement('perfectBluff', numberValue(stats.perfectBluffWins) >= 1),
        achievement('royalStreak', numberValue(stats.bestWinStreak) >= 3),
        achievement('marchingDynasty', numberValue(stats.bestWinStreak) >= 5),
        achievement('undefeatedCrown', numberValue(stats.bestWinStreak) >= 10),
        achievement('comeback', numberValue(stats.comebackWins) >= 1),
        achievement('lastInfluence', numberValue(stats.finalInfluenceWins) >= 1),
        achievement('flawlessWin', numberValue(stats.perfectWins) >= 1),
        achievement('heavyHand', numberValue(stats.coups) >= 10),
        achievement('takenThrone', numberValue(stats.coups) >= 25),
        achievement('officialRegicide', numberValue(stats.coups) >= 50),
        achievement('courtShadow', numberValue(stats.assassinations) >= 10),
        achievement('ruthlessAssassin', numberValue(stats.assassinations) >= 25),
        achievement('noWitnesses', numberValue(stats.assassinations) >= 50),
        achievement('contestedBlade', numberValue(stats.contestedAssassinsWon) >= 1),
        achievement('portlessCaptain', numberValue(stats.steals) >= 10),
        achievement('lootedTreasury', numberValue(stats.coinsStolen) >= 25),
        achievement('bluffHunterAchievement', numberValue(stats.successfulChallenges) >= 10),
        achievement('inquisitorEyes', numberValue(stats.successfulChallenges) >= 25),
        achievement('preciseAccuser', numberValue(stats.challenges) >= 10 && numberValue(stats.challengeAccuracy) >= 0.7),
        achievement('falseProphet', numberValue(stats.failedChallenges) >= 10),
        achievement('twoContessas', numberValue(stats.doubleContessaWins) >= 1),
        achievement('contessaWall', numberValue(stats.condessaBlocks) >= 10),
        achievement('fakeContessa', numberValue(stats.falseCondessaBluffs) >= 1),
        achievement('tirelessAmbassador', numberValue(stats.ambassadorExchanges) >= 10),
        achievement('attentiveInquisitor', numberValue(stats.inquisitorInspections) >= 10),
        achievement('movingCourt', numberValue(stats.actions) >= 100),
        achievement('nobleScore', numberValue(stats.rankScore) >= 500),
        achievement('declaredDuke', numberValue(stats.dukeTaxes) >= 25),
        achievement('closedGates', numberValue(stats.foreignAidBlocks) >= 10),
        achievement('imaginaryDuke', numberValue(stats.taxBluffs) >= 10),
        achievement('captainPatrol', numberValue(stats.captainBlocks) >= 10),
        achievement('alertDiplomat', numberValue(stats.ambassadorBlocks) >= 10),
        achievement('heavySevenCoins', numberValue(stats.forcedCoups) >= 5),
        achievement('firstVoice', numberValue(stats.winsAsFirstPlayer) >= 1),
        achievement('fullTableThrone', numberValue(stats.winsAgainstFivePlayers) >= 1),
        achievement('noCoinsNoFear', numberValue(stats.winsWithNoCoins) >= 1),
        achievement('lightningCoup', numberValue(stats.fastestWins) >= 1),
        achievement('courtMarathon', numberValue(stats.longestGamesWon) >= 1),
        achievement('coldRevenge', numberValue(stats.revengeWins) >= 1),
        achievement('perfectJudgment', numberValue(stats.flawlessChallenges) >= 1),
        achievement('courtMasks', numberValue(stats.allRolesClaimedWins) >= 1)
    ];
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function renderAchievements(stats) {
    const list = document.getElementById('statsAchievements');
    if (!list) return;
    list.innerHTML = '';

    const achievements = getAchievements(stats);
    const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
    setText('statsAchievementsCount', `${unlockedCount}/${achievements.length}`);

    achievements.forEach((achievement) => {
        const badge = document.createElement('div');
        badge.className = `achievement-badge${achievement.unlocked ? ' is-unlocked' : ''}`;

        const title = document.createElement('strong');
        title.textContent = achievement.title;

        const description = document.createElement('small');
        description.textContent = achievement.description;

        badge.append(title, description);
        list.append(badge);
    });
}

function renderPlayerStats(stats) {
    const merged = { ...getDefaultRankedStats(currentLobbyUser), ...(stats || {}) };
    lastRenderedStats = merged;
    const photo = document.getElementById('statsPlayerPhoto');
    const title = document.getElementById('playerStatsTitle');
    const subtitle = document.getElementById('playerStatsSubtitle');

    if (photo) photo.src = merged.photo || 'assets/img/icons/ghost.svg';
    if (title) title.textContent = merged.name || t('lobby.statsFallback');
    if (subtitle) {
        subtitle.textContent = numberValue(merged.games)
            ? t('lobby.gamesRegistered', { count: numberValue(merged.games) })
            : t('lobby.noRankedMatches');
    }

    setText('statsGames', numberValue(merged.games));
    setText('statsWins', numberValue(merged.wins));
    setText('statsLosses', numberValue(merged.losses));
    setText('statsWinRate', formatPercent(merged.winRate));
    setText('statsCurrentStreak', numberValue(merged.currentWinStreak));
    setText('statsBestStreak', numberValue(merged.bestWinStreak));
    setText('statsPlayStyle', getPlayStyle(merged));
    setText('statsRankScore', `${numberValue(merged.rankScore)} pts`);
    setText('statsChallengeAccuracy', formatPercent(merged.challengeAccuracy));
    setText('statsSuccessfulChallenges', numberValue(merged.successfulChallenges));
    setText('statsAssassinations', numberValue(merged.assassinations));
    setText('statsCoups', numberValue(merged.coups));
    setText('statsSteals', numberValue(merged.steals));
    setText('statsBluffs', numberValue(merged.bluffs));
    renderAchievements(merged);
}

function firstStatValue(source, keys, fallback = 0) {
    if (!source) return fallback;

    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null) return source[key];
    }

    return fallback;
}

function normalizeLeaderboardEntry(uid, stats) {
    const profileName = stats?.profile?.name || stats?.profile?.displayName;
    const name = firstStatValue(stats, ['name', 'displayName', 'playerName', 'nome'], profileName || t('lobby.playerFallback'));
    const games = statNumberValue(firstStatValue(stats, ['games', 'matches', 'played', 'jogos'], 0));
    const wins = statNumberValue(firstStatValue(stats, ['wins', 'victories', 'vitorias', 'vitórias'], 0));
    const losses = statNumberValue(firstStatValue(
        stats,
        ['losses', 'defeats', 'derrotas'],
        Math.max(0, games - wins)
    ));
    const rawWinRate = firstStatValue(stats, ['winRate', 'taxaVitoria', 'taxaDeVitoria'], games ? wins / games : 0);
    const winRateNumber = statNumberValue(rawWinRate);
    const winRate = winRateNumber > 1 ? winRateNumber / 100 : winRateNumber;
    const rankScore = statNumberValue(firstStatValue(stats, ['rankScore', 'score', 'points', 'pontos', 'rating'], 0));
    const bestWinStreak = statNumberValue(firstStatValue(
        stats,
        ['bestWinStreak', 'bestStreak', 'maiorSequencia', 'maiorSequência'],
        0
    ));

    return {
        uid,
        name,
        games,
        wins,
        losses,
        winRate,
        rankScore,
        bestWinStreak
    };
}

function renderLeaderboard(entries) {
    if (!leaderboardList) return;
    lastLeaderboardEntries = entries;
    leaderboardList.innerHTML = '';

    if (!entries.length) {
        const empty = document.createElement('li');
        empty.className = 'leaderboard-empty';
        empty.textContent = t('lobby.leaderboardEmpty');
        leaderboardList.appendChild(empty);
        leaderboardList.hidden = false;
        return;
    }

    entries.forEach((entry, index) => {
        const row = document.createElement('li');
        row.className = `leaderboard-row${index < 3 ? ' is-top' : ''}`;

        const rank = document.createElement('span');
        rank.className = 'leaderboard-rank';
        rank.textContent = String(index + 1);

        const player = document.createElement('div');
        player.className = 'leaderboard-player';

        const playerName = document.createElement('strong');
        playerName.textContent = entry.name || t('lobby.playerFallback');

        const playerSummary = document.createElement('small');
        playerSummary.textContent = t('lobby.gamesPlayed', { count: entry.games });

        player.append(playerName, playerSummary);

        const score = document.createElement('strong');
        score.className = 'leaderboard-score';
        score.textContent = `${entry.rankScore} pts`;

        const metrics = document.createElement('div');
        metrics.className = 'leaderboard-metrics';

        [
            [t('lobby.rateMetric'), formatPercent(entry.winRate)],
            [t('lobby.gamesMetric'), entry.games],
            [t('lobby.winsMetric'), entry.wins],
            [t('lobby.lossesMetric'), entry.losses],
            [t('lobby.bestStreakMetric'), entry.bestWinStreak]
        ].forEach(([label, value]) => {
            const metric = document.createElement('span');
            const metricLabel = document.createElement('em');
            const metricValue = document.createElement('strong');

            metricLabel.textContent = label;
            metricValue.textContent = String(value);
            metric.append(metricLabel, metricValue);
            metrics.appendChild(metric);
        });

        row.append(rank, player, score, metrics);
        leaderboardList.appendChild(row);
    });

    leaderboardList.hidden = false;
}

function fetchLeaderboardEntries() {
    return db.ref('rankedStats').once('value').then((snapshot) => {
        const entries = [];

        snapshot.forEach((child) => {
            const entry = normalizeLeaderboardEntry(child.key, child.val());
            if (entry.games > 0 || entry.rankScore > 0) entries.push(entry);
        });

        return entries
            .sort((a, b) => (
                b.rankScore - a.rankScore ||
                b.wins - a.wins ||
                b.games - a.games ||
                a.name.localeCompare(b.name)
            ))
            .slice(0, 50);
    });
}

function openPlayerStatsModal() {
    if (!playerStatsModal || !currentLobbyUser) return;
    playerStatsModal.style.display = 'flex';
    if (playerStatsLoading) {
        playerStatsLoading.hidden = false;
        playerStatsLoading.textContent = t('lobby.statsLoadingText');
    }
    if (playerStatsBody) playerStatsBody.hidden = true;

    db.ref(`rankedStats/${currentLobbyUser.uid}`).once('value')
        .then((snapshot) => {
            renderPlayerStats(snapshot.val());
            if (playerStatsLoading) playerStatsLoading.hidden = true;
            if (playerStatsBody) playerStatsBody.hidden = false;
        })
        .catch(() => {
            renderPlayerStats(null);
            if (playerStatsLoading) playerStatsLoading.textContent = t('lobby.statsLoadError');
            if (playerStatsBody) playerStatsBody.hidden = false;
        });
}

function closePlayerStatsModal() {
    if (playerStatsModal) playerStatsModal.style.display = 'none';
}

function openLeaderboardModal() {
    if (!leaderboardModal) return;

    leaderboardModal.style.display = 'flex';
    if (leaderboardLoading) {
        leaderboardLoading.hidden = false;
        leaderboardLoading.textContent = t('lobby.leaderboardLoading');
    }
    if (leaderboardList) {
        leaderboardList.hidden = true;
        leaderboardList.innerHTML = '';
    }

    fetchLeaderboardEntries()
        .then((entries) => {
            if (leaderboardLoading) leaderboardLoading.hidden = true;
            renderLeaderboard(entries);
        })
        .catch(() => {
            if (leaderboardLoading) {
                leaderboardLoading.hidden = false;
                leaderboardLoading.textContent = t('lobby.leaderboardLoadError');
            }
        });
}

function closeLeaderboardModal() {
    if (leaderboardModal) leaderboardModal.style.display = 'none';
}

if (userPhotoImg) {
    userPhotoImg.addEventListener('click', openPlayerStatsModal);
    userPhotoImg.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPlayerStatsModal();
        }
    });
}

closePlayerStatsModalBtn?.addEventListener('click', closePlayerStatsModal);
playerStatsModal?.addEventListener('click', (event) => {
    if (event.target === playerStatsModal) closePlayerStatsModal();
});

leaderboardBtn?.addEventListener('click', openLeaderboardModal);
closeLeaderboardModalBtn?.addEventListener('click', closeLeaderboardModal);
leaderboardModal?.addEventListener('click', (event) => {
    if (event.target === leaderboardModal) closeLeaderboardModal();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLeaderboardModal();
});

/**
 * Observador de estado de autenticação.
 * Atualiza a UI e o sessionStorage sempre que o status do usuário muda.
 */
auth.onAuthStateChanged(async user => {
    await waitForLanguage();

    if (user) {
        currentLobbyUser = user;
        // Usuário está Logado: Ajusta visibilidade da interface
        if (userInfoDiv) userInfoDiv.style.display = 'block';
        if (roomActionsDiv) roomActionsDiv.style.display = 'block';

        const { safeName, safePhoto } = persistUserSession(user);

        // Renderiza dados do perfil
        if (userNameSpan) userNameSpan.textContent = safeName;
        if (userPhotoImg) userPhotoImg.src = safePhoto;

        setRankedModeAvailability(user);

        cleanupOldRooms();
        const pendingLobbyError = sessionStorage.getItem('lobbyError');
        if (pendingLobbyError) {
            sessionStorage.removeItem('lobbyError');
            showError(pendingLobbyError);
        } else {
            waitForFonts().then(hideLoader);
        }

    } else {
        currentLobbyUser = null;
        sessionStorage.removeItem('currentUID');
        sessionStorage.removeItem('currentName');
        sessionStorage.removeItem('currentPhoto');
        sessionStorage.removeItem('currentIsAnonymous');
        sessionStorage.removeItem('currentRoomMode');
        sessionStorage.removeItem('lobbyError');
        showLoader(t('lobby.returningLogin'));
        window.location.href = 'login.html';
    }
});

// =======================================================
// === GERENCIAMENTO DE SALAS (JOIN & CREATE) ===
// =======================================================

/**
 * Gera um código alfanumérico aleatório de 4 caracteres para a sala.
 */
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Lógica para entrar em uma sala existente.
 */
if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (code.length === 4) showLoader(t('lobby.verifyingRoom'));
    }, true);

    joinRoomBtn.onclick = () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (code.length !== 4) {
            showError(t('lobby.roomCodeLengthError'));
            return;
        }
        readRoomMode(code)
            .then((roomMode) => {
                if (roomMode) {
                    if (requiresGoogleAccount(roomMode) && isAnonymousSession()) {
                        showError(t('lobby.googleRequired', { mode: getModeLabel(roomMode) }));
                        return;
                    }

                    openRoom(code, roomMode);
                    return;
                }

                showError(t('lobby.roomNotFound', { code }));
            })
            .catch((error) => {
                console.error('Erro ao verificar sala:', error);
                showError(t('lobby.roomReadError'));
            });
    };
}

/**
 * Lógica para criar uma nova sala no banco de dados.
 */
// [lobby.js]
if (createRoomBtn) {
    createRoomBtn.onclick = () => {
        const selectedMode = getSelectedGameMode();

        if (requiresGoogleAccount(selectedMode) && isAnonymousSession()) {
            showError(t('lobby.createGoogleRequired', { mode: getModeLabel(selectedMode).toLowerCase() }));
            return;
        }

        showLoader(CoupGameModes.isAutomated(selectedMode)
            ? t('lobby.creatingAutomatedRoom', { mode: getModeLabel(selectedMode).toLowerCase() })
            : t('lobby.creatingRoom'));
        const newCode = generateRoomCode();
        const currentUID = sessionStorage.getItem('currentUID'); //

        db.ref(`salas/${newCode}`).once('value').then((snapshot) => {
            if (snapshot.exists()) {
                createRoomBtn.onclick();
                return;
            }

            const initialData = {
                mode: selectedMode,
                gameState: {
                    status: 'waiting',
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                },
                lastActivity: Date.now()
            };

            if (!CoupGameModes.isRanked(selectedMode)) {
                initialData.hostUID = currentUID;
            }

            db.ref(`salas/${newCode}`).set(initialData).then(() => {
                openRoom(newCode, selectedMode);
            }).catch(error => {
                showError(t('lobby.createRoomError', { message: error.message }));
            });
        }).catch((error) => {
            console.error('Erro ao verificar código da nova sala:', error);
            showError(t('lobby.newCodeError'));
        });
    };
}

// =======================================================
// === COMPONENTES VISUAIS E UX (LOADER & FONTES) ===
// =======================================================

/**
 * Gerencia o "Font Loader" para garantir que as fontes customizadas 
 * estejam prontas antes de remover a tela de carregamento.
 */
document.addEventListener("DOMContentLoaded", async () => {
    await waitForLanguage();
    setLoaderMessage(t('lobby.loader'));
    return;

    const loader = document.getElementById('font-loader');

    const hideLoader = () => {
        if (loader) loader.style.display = 'none';
    };

    if (document.fonts) {
        document.fonts.ready.then(() => {
            console.log('Fontes carregadas!');
            hideLoader();
        });
    } else {
        setTimeout(hideLoader, 1000);
    }

    // Timeout de segurança caso o carregamento demore muito
    setTimeout(hideLoader, 3000);
});

window.addEventListener('coup:languagechange', () => {
    if (currentLobbyUser) setRankedModeAvailability(currentLobbyUser);
    if (playerStatsModal?.style.display === 'flex' && lastRenderedStats) {
        renderPlayerStats(lastRenderedStats);
    }
    if (leaderboardModal?.style.display === 'flex' && lastLeaderboardEntries) {
        renderLeaderboard(lastLeaderboardEntries);
    }
});

// =======================================================
// === MODAL DE COMUNIDADE (APOIO E TUTORIAIS) ===
// =======================================================

/**
 * Controla a exibição e o fechamento do modal de Comunidade.
 */
document.addEventListener("DOMContentLoaded", () => {
    const communityBtn = document.getElementById('communityBtn');
    const communityModal = document.getElementById('communityModal');
    const closeCommunityBtn = document.getElementById('closeCommunityBtn');

    if (communityBtn && communityModal) {
        // Abre o modal ao clicar no botão da comunidade
        communityBtn.onclick = () => {
            communityModal.style.display = 'flex';
        };

        // Fecha pelo botão X
        if (closeCommunityBtn) {
            closeCommunityBtn.onclick = () => {
                communityModal.style.display = 'none';
            };
        }

        // Fecha ao clicar fora do conteúdo (no fundo escuro)
        window.addEventListener('click', (e) => {
            if (e.target === communityModal) {
                communityModal.style.display = 'none';
            }
        });
    }
});

// =======================================================
// === SISTEMA DE MANUTENÇÃO (LIMPEZA DE SALAS) ===
// =======================================================

/**
 * SISTEMA DE AUTODESTRUIÇÃO (Beta v0.4)
 * Varre o banco de dados e remove salas sem atividade por mais de 24 horas.
 * Ajuda a economizar recursos no Firebase.
 */
function cleanupOldRooms() {
    const roomsRef = db.ref('salas');

    roomsRef.once('value').then((snapshot) => {
        if (!snapshot.exists()) return;

        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        snapshot.forEach((roomSnap) => {
            const data = roomSnap.val();
            const lastActivity = data.lastActivity || 0;

            // Se o tempo desde a última ação for maior que 24h, deleta a sala
            if (now - lastActivity > TWENTY_FOUR_HOURS) {
                console.log(`🧹 Limpeza: Removendo sala inativa ${roomSnap.key}`);
                roomSnap.ref.remove()
                    .catch(err => console.error("Erro ao deletar sala:", err));
            }
        });
    }).catch((error) => {
        console.warn('Limpeza de salas ignorada:', error?.message || error);
    });
}

