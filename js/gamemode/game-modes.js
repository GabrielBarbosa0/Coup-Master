(function initializeGameModes(globalScope) {
    const CASUAL = 'casual';
    const RANKED = 'ranked';

    function normalize(mode) {
        return mode === RANKED ? RANKED : CASUAL;
    }

    function fromRoom(roomData) {
        return normalize(roomData?.mode || roomData?.gameState?.mode);
    }

    function isRanked(mode) {
        return normalize(mode) === RANKED;
    }

    function canAccessRanked(user) {
        return Boolean(user && !user.isAnonymous);
    }

    function getLabel(mode) {
        return isRanked(mode) ? 'Ranqueado' : 'Casual';
    }

    globalScope.CoupGameModes = Object.freeze({
        CASUAL,
        RANKED,
        normalize,
        fromRoom,
        isRanked,
        canAccessRanked,
        getLabel
    });
})(window);
