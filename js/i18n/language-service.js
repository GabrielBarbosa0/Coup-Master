(function initializeLanguageService(root) {
    const STORAGE_KEY = 'coupMasterLanguage';
    const DEFAULT_LANGUAGE = 'pt-BR';
    const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US'];
    const LANGUAGE_VERSION = 'i18n-v3';
    const scriptUrl = document.currentScript?.src || '';
    const languageBaseUrl = scriptUrl ? new URL('../../lang/', scriptUrl).href : 'lang/';

    const dictionaries = {};
    const loadingDictionaries = {};

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

    let currentLanguage = normalizeLanguage(getStoredLanguage() || root.navigator?.language || DEFAULT_LANGUAGE);

    function getLanguageUrl(language) {
        return `${languageBaseUrl}${language}.json?v=${LANGUAGE_VERSION}`;
    }

    async function loadDictionary(language) {
        const normalizedLanguage = normalizeLanguage(language);
        if (dictionaries[normalizedLanguage]) return dictionaries[normalizedLanguage];
        if (loadingDictionaries[normalizedLanguage]) return loadingDictionaries[normalizedLanguage];

        loadingDictionaries[normalizedLanguage] = fetch(getLanguageUrl(normalizedLanguage))
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Language file ${normalizedLanguage} returned ${response.status}`);
                }
                return response.json();
            })
            .then((dictionary) => {
                dictionaries[normalizedLanguage] = dictionary || {};
                return dictionaries[normalizedLanguage];
            })
            .catch((error) => {
                console.warn(`CoupLanguage: could not load ${normalizedLanguage}.`, error);
                dictionaries[normalizedLanguage] = {};
                return dictionaries[normalizedLanguage];
            })
            .finally(() => {
                delete loadingDictionaries[normalizedLanguage];
            });

        return loadingDictionaries[normalizedLanguage];
    }

    async function ensureLanguage(language = currentLanguage) {
        await loadDictionary(DEFAULT_LANGUAGE);
        if (language !== DEFAULT_LANGUAGE) await loadDictionary(language);
        return dictionaries[language] || dictionaries[DEFAULT_LANGUAGE] || {};
    }

    function getNestedValue(dictionary, path) {
        const keys = String(path || '').split('.');
        let value = dictionary;
        for (const key of keys) {
            value = value?.[key];
        }
        return value;
    }

    function getValue(path, language = currentLanguage) {
        const currentValue = getNestedValue(dictionaries[language], path);
        if (currentValue !== undefined) return currentValue;

        const fallbackValue = getNestedValue(dictionaries[DEFAULT_LANGUAGE], path);
        if (fallbackValue !== undefined) return fallbackValue;

        return path;
    }

    function interpolate(template, params = {}) {
        return String(template).replace(/\{(\w+)\}/g, (match, key) => (
            params[key] === undefined || params[key] === null ? match : String(params[key])
        ));
    }

    function translate(path, params = {}) {
        return interpolate(getValue(path), params);
    }

    function applyTranslations(scope = document) {
        if (!scope) return;
        document.documentElement.lang = currentLanguage;
        if (document.body) document.body.dataset.language = currentLanguage;

        scope.querySelectorAll?.('[data-i18n]').forEach((node) => {
            node.textContent = translate(node.dataset.i18n);
        });

        scope.querySelectorAll?.('[data-i18n-label]').forEach((node) => {
            const label = `${translate(node.dataset.i18nLabel)} `;
            const textNode = Array.from(node.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
            if (textNode) {
                textNode.textContent = label;
            } else {
                node.prepend(document.createTextNode(label));
            }
        });

        scope.querySelectorAll?.('[data-i18n-placeholder]').forEach((node) => {
            node.setAttribute('placeholder', translate(node.dataset.i18nPlaceholder));
        });

        scope.querySelectorAll?.('[data-i18n-title]').forEach((node) => {
            if (node === document.documentElement) {
                node.removeAttribute('title');
                return;
            }
            node.setAttribute('title', translate(node.dataset.i18nTitle));
        });

        scope.querySelectorAll?.('[data-i18n-aria-label]').forEach((node) => {
            node.setAttribute('aria-label', translate(node.dataset.i18nAriaLabel));
        });

        scope.querySelectorAll?.('[data-i18n-alt]').forEach((node) => {
            node.setAttribute('alt', translate(node.dataset.i18nAlt));
        });

        scope.querySelectorAll?.('[data-i18n-value]').forEach((node) => {
            node.setAttribute('value', translate(node.dataset.i18nValue));
        });

        scope.querySelectorAll?.('[data-i18n-content]').forEach((node) => {
            node.setAttribute('content', translate(node.dataset.i18nContent));
        });

        const titleKey = document.documentElement.dataset.i18nTitle;
        if (titleKey) document.title = translate(titleKey);
        delete document.documentElement.dataset.i18nPending;

        document.querySelectorAll?.('[data-language-select]').forEach((select) => {
            select.value = currentLanguage;
        });
    }

    async function setLanguage(language) {
        const nextLanguage = normalizeLanguage(language);
        currentLanguage = nextLanguage;

        try {
            root.localStorage?.setItem(STORAGE_KEY, currentLanguage);
        } catch (error) {
            // Prefer keeping the UI responsive even when storage is unavailable.
        }

        await ensureLanguage(currentLanguage);
        applyTranslations();
        root.dispatchEvent?.(new CustomEvent('coup:languagechange', {
            detail: { language: currentLanguage }
        }));
        return currentLanguage;
    }

    function bindLanguageSelectors() {
        document.querySelectorAll('[data-language-select]').forEach((select) => {
            select.value = currentLanguage;
            select.addEventListener('change', () => {
                setLanguage(select.value);
            });
        });
    }

    async function init() {
        bindLanguageSelectors();
        await ensureLanguage(currentLanguage);
        applyTranslations();
        root.dispatchEvent?.(new CustomEvent('coup:languagechange', {
            detail: { language: currentLanguage }
        }));
    }

    const ready = new Promise((resolve) => {
        const start = () => init().finally(resolve);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start, { once: true });
        } else {
            start();
        }
    });

    root.CoupLanguage = Object.freeze({
        getLanguage: () => currentLanguage,
        setLanguage,
        applyTranslations,
        ready,
        t: translate
    });
})(window);
