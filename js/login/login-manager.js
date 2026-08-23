const googleLoginBtn = document.getElementById('google-login-btn');
const anonymousLoginBtn = document.getElementById('anonymous-login-btn');
const installPwaBtn = document.getElementById('installPwaBtn');
let deferredInstallPrompt = null;

function t(key, params) {
    return window.CoupLanguage?.t(key, params) || key;
}

function waitForLanguage() {
    return window.CoupLanguage?.ready || Promise.resolve();
}

function isPwaInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updateInstallButtonVisibility() {
    if (!installPwaBtn) return;
    installPwaBtn.hidden = isPwaInstalled() || !deferredInstallPrompt;
}

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
        showLoader(t('login.googleLoading'));
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            showError(t('login.googleError', { message: error.message }));
        });
    };
}

if (anonymousLoginBtn) {
    anonymousLoginBtn.onclick = () => {
        showLoader(t('login.guestLoading'));
        auth.signInAnonymously().catch(error => {
            showError(t('login.guestError', { message: error.message }));
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

auth.onAuthStateChanged(async user => {
    await waitForLanguage();

    if (!user) {
        sessionStorage.removeItem('currentUID');
        sessionStorage.removeItem('currentName');
        sessionStorage.removeItem('currentPhoto');
        sessionStorage.removeItem('currentIsAnonymous');
        waitForFonts().then(hideLoader);
        return;
    }

    persistUserSession(user);
    showLoader(t('login.lobbyLoading'));
    window.location.href = 'lobby.html';
});

document.addEventListener("DOMContentLoaded", async () => {
    await waitForLanguage();
    updateInstallButtonVisibility();
    setLoaderMessage(t('common.loadingResources'));
});
