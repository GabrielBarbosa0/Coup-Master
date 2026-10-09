(function initializeRankedRules(root) {
    const api = root?.CoupAutomatedRules
        || (typeof require === 'function' ? require('../shared/automated-rules.js') : null);

    if (!api) throw new Error('CoupAutomatedRules precisa ser carregado antes das regras ranqueadas.');

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupRankedRules = api;
})(typeof window !== 'undefined' ? window : null);
