(function initializeRankedModifiers(root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.CoupRankedModifiers = api;
    }
})(typeof window !== 'undefined' ? window : globalThis, function createRankedModifiers() {
    const VERSION = 1;
    const DEFAULT_DRAW_COUNT = 5;
    const MAX_ELIMINATION_RULES = 2;
    const selectionCache = new Map();

    function deepFreeze(value) {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
        Object.values(value).forEach(deepFreeze);
        return Object.freeze(value);
    }

    const RULES = deepFreeze({
        'justica-lenta': {
            id: 'justica-lenta',
            category: 'economy',
            effects: { coupCost: 10, mandatoryCoupCoins: 15 }
        },
        'falso-duque': {
            id: 'falso-duque',
            category: 'setup',
            effects: { deckOverrides: { duque: 1 } }
        },
        'sangue-frio': {
            id: 'sangue-frio',
            category: 'elimination',
            effects: { successfulAssassinationReward: 2 }
        },
        recompensa: {
            id: 'recompensa',
            category: 'elimination',
            effects: { richTargetMinimumCoins: 8, eliminationReward: 2 }
        },
        espolio: {
            id: 'espolio',
            category: 'elimination',
            effects: { distributeEliminatedPlayerCoins: true }
        },
        'herdeiro-do-trono': {
            id: 'herdeiro-do-trono',
            category: 'elimination',
            effects: { eliminationReward: 3 }
        },
        'ultima-palavra': {
            id: 'ultima-palavra',
            category: 'elimination',
            effects: { finalCoinLoss: 2 }
        },
        'favor-da-coroa': {
            id: 'favor-da-coroa',
            category: 'defense',
            effects: { paidBlockCost: 3, cannotBlock: ['coup'] }
        },
        'panico-economico': {
            id: 'panico-economico',
            category: 'economy',
            effects: { thresholdCoins: 9, rewardAllAlive: 1 }
        },
        'conselho-de-emergencia': {
            id: 'conselho-de-emergencia',
            category: 'economy',
            effects: { thresholdCoins: 10, rewardAllAlive: 2 }
        },
        'golpe-declarado': {
            id: 'golpe-declarado',
            category: 'declared-finisher',
            effects: { action: 'coup', requiresLastInfluenceGuess: true }
        },
        'assassino-declarado': {
            id: 'assassino-declarado',
            category: 'declared-finisher',
            effects: { action: 'assassinate', requiresLastInfluenceGuess: true }
        }
    });

    const RULE_IDS = Object.freeze(Object.keys(RULES));
    const ELIMINATION_RULE_IDS = Object.freeze([
        'sangue-frio',
        'recompensa',
        'espolio',
        'herdeiro-do-trono',
        'ultima-palavra'
    ]);

    const EXCLUSIVE_GROUPS = deepFreeze([
        {
            id: 'declared-finisher',
            max: 1,
            ruleIds: ['golpe-declarado', 'assassino-declarado']
        },
        {
            id: 'economic-threshold',
            max: 1,
            ruleIds: ['panico-economico', 'conselho-de-emergencia']
        },
        {
            id: 'elimination-reward',
            max: 1,
            ruleIds: ['sangue-frio', 'recompensa', 'herdeiro-do-trono']
        }
    ]);

    function normalizeSeed(seed) {
        if (Number.isFinite(seed)) return Number(seed) >>> 0;

        const text = String(seed ?? 'coup-master-ranked-modifiers');
        let hash = 2166136261;
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function createSeededRandom(seed) {
        let state = normalizeSeed(seed);
        return function random() {
            state += 0x6D2B79F5;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }

    function uniqueKnownRuleIds(ruleIds = RULE_IDS) {
        const seen = new Set();
        return Array.from(ruleIds).filter((ruleId) => {
            if (!RULES[ruleId] || seen.has(ruleId)) return false;
            seen.add(ruleId);
            return true;
        });
    }

    function shuffle(ruleIds, random) {
        const shuffled = ruleIds.slice();
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const target = Math.floor(random() * (index + 1));
            [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
        }
        return shuffled;
    }

    function getSelectionIssues(ruleIds, options = {}) {
        const expectedCount = options.expectedCount === undefined
            ? DEFAULT_DRAW_COUNT
            : options.expectedCount;
        const ids = Array.isArray(ruleIds) ? ruleIds : [];
        const issues = [];
        const seen = new Set();

        if (!Array.isArray(ruleIds)) {
            issues.push({ code: 'invalid-selection' });
        }

        ids.forEach((ruleId) => {
            if (!RULES[ruleId]) issues.push({ code: 'unknown-rule', ruleIds: [ruleId] });
            if (seen.has(ruleId)) issues.push({ code: 'duplicate-rule', ruleIds: [ruleId] });
            seen.add(ruleId);
        });

        if (Number.isInteger(expectedCount) && ids.length !== expectedCount) {
            issues.push({ code: 'unexpected-count', expected: expectedCount, actual: ids.length });
        }

        EXCLUSIVE_GROUPS.forEach((group) => {
            const selected = group.ruleIds.filter((ruleId) => seen.has(ruleId));
            if (selected.length > group.max) {
                issues.push({ code: 'exclusive-group', groupId: group.id, ruleIds: selected });
            }
        });

        const selectedEliminationRules = ELIMINATION_RULE_IDS.filter((ruleId) => seen.has(ruleId));
        if (selectedEliminationRules.length > MAX_ELIMINATION_RULES) {
            issues.push({
                code: 'elimination-limit',
                max: MAX_ELIMINATION_RULES,
                ruleIds: selectedEliminationRules
            });
        }

        return issues;
    }

    function isValidSelection(ruleIds, options = {}) {
        return getSelectionIssues(ruleIds, options).length === 0;
    }

    function canAddRule(selectedRuleIds, candidateId) {
        if (!RULES[candidateId] || selectedRuleIds.includes(candidateId)) return false;
        return isValidSelection([...selectedRuleIds, candidateId], { expectedCount: null });
    }

    function collectSelections(candidates, count, selected = [], startIndex = 0, results = []) {
        if (selected.length === count) {
            results.push(selected.slice());
            return results;
        }
        if (selected.length + (candidates.length - startIndex) < count) return results;

        for (let index = startIndex; index < candidates.length; index += 1) {
            const candidateId = candidates[index];
            if (!canAddRule(selected, candidateId)) continue;
            selected.push(candidateId);
            collectSelections(candidates, count, selected, index + 1, results);
            selected.pop();
        }

        return results;
    }

    function getCompatibleSelections(pool, count) {
        const cacheKey = `${count}:${pool.join('|')}`;
        if (!selectionCache.has(cacheKey)) {
            selectionCache.set(cacheKey, collectSelections(pool, count));
        }
        return selectionCache.get(cacheKey);
    }

    function drawRuleIds(options = {}) {
        const count = options.count ?? DEFAULT_DRAW_COUNT;
        if (!Number.isInteger(count) || count < 1) {
            throw new TypeError('Modifier draw count must be a positive integer.');
        }

        const pool = uniqueKnownRuleIds(options.poolIds || RULE_IDS);
        const random = createSeededRandom(options.seed ?? Date.now());
        const selections = getCompatibleSelections(pool, count);

        if (selections.length === 0) {
            throw new RangeError(`Unable to draw ${count} compatible ranked modifiers from this pool.`);
        }

        const selected = selections[Math.floor(random() * selections.length)];
        return shuffle(selected, random);
    }

    function createRuleDraw(options = {}) {
        const seed = normalizeSeed(options.seed ?? Date.now());
        const ruleIds = drawRuleIds({ ...options, seed });
        return deepFreeze({ version: VERSION, seed, ruleIds });
    }

    return deepFreeze({
        VERSION,
        DEFAULT_DRAW_COUNT,
        MAX_ELIMINATION_RULES,
        RULES,
        RULE_IDS,
        ELIMINATION_RULE_IDS,
        EXCLUSIVE_GROUPS,
        normalizeSeed,
        getSelectionIssues,
        isValidSelection,
        canAddRule,
        drawRuleIds,
        createRuleDraw
    });
});
