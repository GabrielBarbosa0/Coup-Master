(function initializeLanguageService(root) {
    const STORAGE_KEY = 'coupMasterLanguage';
    const DEFAULT_LANGUAGE = 'pt-BR';
    const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US'];
    const LANGUAGE_VERSION = 'i18n-v4';
    const scriptUrl = document.currentScript?.src || '';
    const languageBaseUrl = scriptUrl ? new URL('../../lang/', scriptUrl).href : 'lang/';

    const dictionaries = {};
    const loadingDictionaries = {};
    const translatedNodes = new Set();
    let documentTitleTranslation = null;

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

        return undefined;
    }

    function interpolate(template, params = {}) {
        return String(template).replace(/\{(\w+)\}/g, (match, key) => (
            params[key] === undefined || params[key] === null ? match : String(params[key])
        ));
    }

    function translate(path, params = {}, fallback = path) {
        const value = getValue(path);
        return interpolate(value === undefined ? fallback : value, params);
    }

    function getTranslationStore(node) {
        if (!node.__coupI18n) {
            Object.defineProperty(node, '__coupI18n', {
                value: {},
                configurable: true
            });
        }
        return node.__coupI18n;
    }

    function rememberTranslation(node, slot, attributeName, fallback) {
        const attributeValue = node.getAttribute?.(attributeName);
        const store = getTranslationStore(node);

        if (attributeValue && !store[slot]) {
            store[slot] = {
                key: attributeValue,
                fallback: fallback ?? ''
            };
        }

        if (attributeValue) node.removeAttribute(attributeName);
        if (store[slot]) translatedNodes.add(node);

        return store[slot];
    }

    function getFirstTextNode(node) {
        return Array.from(node.childNodes).find((child) => child.nodeType === Node.TEXT_NODE);
    }

    function findTranslationNodes(scope, selector) {
        const nodes = [];
        if (scope.matches?.(selector)) nodes.push(scope);
        scope.querySelectorAll?.(selector).forEach((node) => nodes.push(node));
        return nodes;
    }

    function registerTranslationNodes(scope = document) {
        findTranslationNodes(scope, '[data-i18n]').forEach((node) => {
            rememberTranslation(node, 'text', 'data-i18n', node.textContent);
        });

        findTranslationNodes(scope, '[data-i18n-label]').forEach((node) => {
            const textNode = getFirstTextNode(node);
            rememberTranslation(node, 'label', 'data-i18n-label', textNode?.textContent?.trim() || node.textContent);
        });

        [
            ['placeholder', 'data-i18n-placeholder', 'placeholder'],
            ['title', 'data-i18n-title', 'title'],
            ['ariaLabel', 'data-i18n-aria-label', 'aria-label'],
            ['alt', 'data-i18n-alt', 'alt'],
            ['value', 'data-i18n-value', 'value'],
            ['content', 'data-i18n-content', 'content']
        ].forEach(([slot, attributeName, targetAttribute]) => {
            findTranslationNodes(scope, `[${attributeName}]`).forEach((node) => {
                rememberTranslation(node, slot, attributeName, node.getAttribute(targetAttribute));
            });
        });

        const titleKey = document.documentElement.getAttribute('data-i18n-title');
        if (titleKey && !documentTitleTranslation) {
            documentTitleTranslation = {
                key: titleKey,
                fallback: document.title
            };
        }
        document.documentElement.removeAttribute('data-i18n-title');
    }

    function isNodeInScope(node, scope) {
        if (!node.isConnected) return false;
        if (scope === document) return true;
        return scope === node || Boolean(scope.contains?.(node));
    }

    function applyNodeTranslation(node, refs) {
        if (refs.text) {
            node.textContent = translate(refs.text.key, {}, refs.text.fallback);
        }

        if (refs.label) {
            const label = `${translate(refs.label.key, {}, refs.label.fallback)} `;
            const textNode = getFirstTextNode(node);
            if (textNode) {
                textNode.textContent = label;
            } else {
                node.prepend(document.createTextNode(label));
            }
        }

        [
            ['placeholder', 'placeholder'],
            ['title', 'title'],
            ['ariaLabel', 'aria-label'],
            ['alt', 'alt'],
            ['value', 'value'],
            ['content', 'content']
        ].forEach(([slot, targetAttribute]) => {
            if (!refs[slot]) return;
            if (node === document.documentElement && targetAttribute === 'title') {
                node.removeAttribute('title');
                return;
            }
            node.setAttribute(targetAttribute, translate(refs[slot].key, {}, refs[slot].fallback));
        });
    }

    function applyTranslations(scope = document) {
        if (!scope) return;
        registerTranslationNodes(scope);
        document.documentElement.lang = currentLanguage;
        if (document.body) document.body.dataset.language = currentLanguage;

        translatedNodes.forEach((node) => {
            if (!isNodeInScope(node, scope)) return;
            applyNodeTranslation(node, node.__coupI18n);
        });

        if (documentTitleTranslation && scope === document) {
            document.title = translate(documentTitleTranslation.key, {}, documentTitleTranslation.fallback);
        }
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
