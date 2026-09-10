(function initializeGameModes(globalScope) {
    const CASUAL = 'casual';
    const RANKED = 'ranked';
    const PERSONALIZED = 'personalized';

    function normalize(mode) {
        if (mode === RANKED) return RANKED;
        if (mode === PERSONALIZED) return PERSONALIZED;
        return CASUAL;
    }

    function fromRoom(roomData) {
        return normalize(roomData?.mode || roomData?.gameState?.mode);
    }

    function isRanked(mode) {
        return normalize(mode) === RANKED;
    }

    function isPersonalized(mode) {
        return normalize(mode) === PERSONALIZED;
    }

    function isAutomated(mode) {
        const normalized = normalize(mode);
        return normalized === RANKED || normalized === PERSONALIZED;
    }

    function canAccessRanked(user) {
        return Boolean(user && !user.isAnonymous);
    }

    function getLabel(mode) {
        const normalized = normalize(mode);
        const t = globalScope.CoupLanguage?.t;
        if (normalized === RANKED) return t?.('lobby.ranked') || 'Ranqueado';
        if (normalized === PERSONALIZED) return t?.('lobby.personalized') || 'Sala Personalizada';
        return t?.('lobby.casual') || 'Casual';
    }

    globalScope.CoupGameModes = Object.freeze({
        CASUAL,
        RANKED,
        PERSONALIZED,
        normalize,
        fromRoom,
        isRanked,
        isPersonalized,
        isAutomated,
        canAccessRanked,
        getLabel
    });
})(window);
