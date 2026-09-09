(function setInitialCoupLanguage(root) {
    const OFFICIAL_ORIGIN = 'https://coupmaster.com.br';
    const LEGACY_HOSTNAME = 'gabrielbarbosa0.github.io';
    const STORAGE_KEY = 'coupMasterLanguage';
    const DEFAULT_LANGUAGE = 'pt-BR';
    const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US'];

    if (root.location?.hostname === LEGACY_HOSTNAME) {
        const officialPath = root.location.pathname.replace(/^\/Coup-Master\/?/i, '/') || '/';
        root.location.replace(`${OFFICIAL_ORIGIN}${officialPath}${root.location.search}${root.location.hash}`);
        return;
    }

    function normalizeLanguage(language) {
        if (SUPPORTED_LANGUAGES.includes(language)) return language;
        const shortCode = String(language || '').toLowerCase().slice(0, 2);
        if (shortCode === 'en') return 'en-US';
        if (shortCode === 'pt') return 'pt-BR';
        return DEFAULT_LANGUAGE;
    }

    function getStoredLanguage() {
        try {
            return root.localStorage?.getItem(STORAGE_KEY);
        } catch (error) {
            return null;
        }
    }

    const language = normalizeLanguage(getStoredLanguage() || root.navigator?.language || DEFAULT_LANGUAGE);
    document.documentElement.lang = language;
    document.documentElement.dataset.loadingLanguage = language;
    if (language !== DEFAULT_LANGUAGE) {
        document.documentElement.dataset.i18nPending = 'true';
    }
})(window);
