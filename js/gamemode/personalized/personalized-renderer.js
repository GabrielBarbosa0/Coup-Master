(function initializePersonalizedRenderer(root) {
    root.CoupAutomatedRenderer.create({
        mode: 'personalized',
        Rules: root.CoupPersonalizedRules,
        Engine: root.CoupPersonalizedEngine,
        globalName: 'CoupPersonalizedRenderer'
    });
})(window);
