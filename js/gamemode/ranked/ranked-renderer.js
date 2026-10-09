(function initializeRankedRenderer(root) {
    root.CoupAutomatedRenderer.create({
        mode: 'ranked',
        Rules: root.CoupRankedRules,
        Engine: root.CoupRankedEngine,
        globalName: 'CoupRankedRenderer'
    });
})(window);
