const googleLoginBtn = document.getElementById('google-login-btn');
const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
const installPwaBtn = document.getElementById('installPwaBtn');
let deferredInstallPrompt = null;

function isPwaInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updateInstallButtonVisibility() {
    if (!installPwaBtn) return;
    installPwaBtn.hidden = isPwaInstalled() || !deferredInstallPrompt;
}

function showError(message) {
    const modal = document.getElementById('errorModal');
    const text = document.getElementById('errorModalText');
    if (modal && text) {
        text.innerText = message;
        modal.style.display = 'flex';
    }
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
}

const closeErrorBtn = document.getElementById('closeErrorModalBtn');
if (closeErrorBtn) {
    closeErrorBtn.onclick = () => {
        const modal = document.getElementById('errorModal');
        if (modal) modal.style.display = 'none';
    };
}

if (googleLoginBtn) {
    googleLoginBtn.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            showError("Erro ao fazer login com Google: " + error.message);
        });
    };
}

if (anonymousLoginBtn) {
    anonymousLoginBtn.onclick = () => {
        auth.signInAnonymously().catch(error => {
            showError("Erro ao entrar como visitante: " + error.message);
        });
    };
}

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallButtonVisibility();
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallButtonVisibility();
});

if (installPwaBtn) {
    installPwaBtn.onclick = async () => {
        if (!deferredInstallPrompt) {
            updateInstallButtonVisibility();
            return;
        }

        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        updateInstallButtonVisibility();
    };
}

auth.onAuthStateChanged(user => {
    if (!user) {
        sessionStorage.removeItem('currentUID');
        sessionStorage.removeItem('currentName');
        sessionStorage.removeItem('currentPhoto');
        sessionStorage.removeItem('currentIsAnonymous');
        return;
    }

    persistUserSession(user);
    window.location.href = 'lobby.html';
});

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById('font-loader');
    updateInstallButtonVisibility();

    const hideLoader = () => {
        if (loader) loader.style.display = 'none';
    };

    if (document.fonts) {
        document.fonts.ready.then(hideLoader);
    } else {
        setTimeout(hideLoader, 1000);
    }

    setTimeout(hideLoader, 3000);
});
