(function initializePersonalizedRules(root) {
    const api = root?.CoupAutomatedRules
        || (typeof require === 'function' ? require('../shared/automated-rules.js') : null);

    if (!api) throw new Error('CoupAutomatedRules precisa ser carregado antes das regras personalizadas.');

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupPersonalizedRules = api;
})(typeof window !== 'undefined' ? window : null);
