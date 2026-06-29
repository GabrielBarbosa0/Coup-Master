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
const rankedModeNote = document.getElementById('ranked-mode-note');

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

function setRankedModeAvailability(user) {
    const canAccessRanked = CoupGameModes.canAccessRanked(user);

    if (rankedModeInput) {
        rankedModeInput.disabled = !canAccessRanked;

        if (!canAccessRanked && rankedModeInput.checked) {
            const casualModeInput = document.querySelector('input[name="game-mode"][value="casual"]');
            if (casualModeInput) casualModeInput.checked = true;
        }
    }

    if (rankedModeNote) {
        rankedModeNote.hidden = false;
        rankedModeNote.textContent = canAccessRanked
            ? 'Ranqueado usa conta Google, baralho padrão e não permite bots.'
            : 'O modo ranqueado exige uma conta Google e não permite bots.';
    }
}

function openRoom(code, mode) {
    const normalizedMode = CoupGameModes.normalize(mode);
    sessionStorage.setItem('currentRoomMode', normalizedMode);
    showLoader(CoupGameModes.isRanked(normalizedMode) ? 'Carregando sala ranqueada...' : 'Carregando mesa...');
    const destination = CoupGameModes.isRanked(normalizedMode) ? 'ranked-waiting.html' : 'index.html';
    window.location.href = `${destination}?room=${code}`;
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
        showLoader('Retornando ao login...');
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
        safeName = "Visitante";
    } else if (!safeName) {
        safeName = "Visitante";
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

/**
 * Observador de estado de autenticação.
 * Atualiza a UI e o sessionStorage sempre que o status do usuário muda.
 */
auth.onAuthStateChanged(user => {
    if (user) {
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
        sessionStorage.removeItem('currentUID');
        sessionStorage.removeItem('currentName');
        sessionStorage.removeItem('currentPhoto');
        sessionStorage.removeItem('currentIsAnonymous');
        sessionStorage.removeItem('currentRoomMode');
        sessionStorage.removeItem('lobbyError');
        showLoader('Retornando ao login...');
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
        if (code.length === 4) showLoader('Verificando sala...');
    }, true);

    joinRoomBtn.onclick = () => {
        const code = roomCodeInput.value.trim().toUpperCase();
        if (code.length !== 4) {
            showError("O código da sala deve ter 4 caracteres.");
            return;
        }
        // Verifica existência da sala no Firebase antes de redirecionar
        db.ref(`salas/${code}`).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const roomMode = CoupGameModes.fromRoom(snapshot.val());

                if (CoupGameModes.isRanked(roomMode) && isAnonymousSession()) {
                    showError('O modo ranqueado exige login com uma conta Google.');
                    return;
                }

                openRoom(code, roomMode);
            } else {
                showError(`A sala "${code}" não existe.`);
            }
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

        if (CoupGameModes.isRanked(selectedMode) && isAnonymousSession()) {
            showError('Entre com uma conta Google para criar uma sala ranqueada.');
            return;
        }

        showLoader(CoupGameModes.isRanked(selectedMode) ? 'Criando sala ranqueada...' : 'Criando sala...');
        const newCode = generateRoomCode();
        const currentUID = sessionStorage.getItem('currentUID'); //

        db.ref(`salas/${newCode}`).once('value', (snapshot) => {
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
                showError("Erro ao criar sala: " + error.message);
            });
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
document.addEventListener("DOMContentLoaded", () => {
    setLoaderMessage('Carregando lobby...');
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

    roomsRef.once('value', (snapshot) => {
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
    });
}

