(function initializeRankedRules(root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    if (root) root.CoupRankedRules = api;
})(typeof window !== 'undefined' ? window : null, function createRankedRules() {
    const ROLES = Object.freeze({
        DUKE: 'duque',
        CAPTAIN: 'capitao',
        ASSASSIN: 'assassino',
        CONTESSA: 'condessa',
        AMBASSADOR: 'embaixador',
        INQUISITOR: 'inquisidor'
    });

    const ROLE_DEFINITIONS = Object.freeze({
        [ROLES.DUKE]: { label: 'Duque', image: 'assets/img/cards/base/duque.png' },
        [ROLES.CAPTAIN]: { label: 'Capitao', image: 'assets/img/cards/base/capitao.png' },
        [ROLES.ASSASSIN]: { label: 'Assassino', image: 'assets/img/cards/base/assassino.png' },
        [ROLES.CONTESSA]: { label: 'Condessa', image: 'assets/img/cards/base/condessa.png' },
        [ROLES.AMBASSADOR]: { label: 'Embaixador', image: 'assets/img/cards/base/embaixador.png' },
        [ROLES.INQUISITOR]: { label: 'Inquisidor', image: 'assets/img/cards/base/inquisidor.png' }
    });

    const ACTIONS = Object.freeze({
        INCOME: 'income',
        FOREIGN_AID: 'foreign-aid',
        COUP: 'coup',
        TAX: 'tax',
        STEAL: 'steal',
        ASSASSINATE: 'assassinate',
        EXCHANGE_AMBASSADOR: 'exchange-ambassador',
        EXCHANGE_INQUISITOR: 'exchange-inquisitor',
        EXAMINE: 'examine'
    });

    const ACTION_DEFINITIONS = Object.freeze({
        [ACTIONS.INCOME]: {
            label: 'Renda', description: 'Receba 1 moeda.', requiresTarget: false,
            claim: null, cost: 0, challengeable: false, blockClaims: []
        },
        [ACTIONS.FOREIGN_AID]: {
            label: 'Ajuda externa', description: 'Receba 2 moedas.', requiresTarget: false,
            claim: null, cost: 0, challengeable: false, blockClaims: [ROLES.DUKE], blockScope: 'any'
        },
        [ACTIONS.COUP]: {
            label: 'Golpe de Estado', description: 'Pague 7 moedas para eliminar uma influencia.', requiresTarget: true,
            claim: null, cost: 7, challengeable: false, blockClaims: []
        },
        [ACTIONS.TAX]: {
            label: 'Taxar', description: 'Declare Duque e receba 3 moedas.', requiresTarget: false,
            claim: ROLES.DUKE, cost: 0, challengeable: true, blockClaims: []
        },
        [ACTIONS.STEAL]: {
            label: 'Extorquir', description: 'Declare Capitao e roube ate 2 moedas.', requiresTarget: true,
            claim: ROLES.CAPTAIN, cost: 0, challengeable: true,
            blockClaims: [ROLES.CAPTAIN, ROLES.AMBASSADOR, ROLES.INQUISITOR], blockScope: 'target'
        },
        [ACTIONS.ASSASSINATE]: {
            label: 'Assassinar', description: 'Declare Assassino e pague 3 moedas.', requiresTarget: true,
            claim: ROLES.ASSASSIN, cost: 3, challengeable: true,
            blockClaims: [ROLES.CONTESSA], blockScope: 'target'
        },
        [ACTIONS.EXCHANGE_AMBASSADOR]: {
            label: 'Trocar (Embaixador)', description: 'Declare Embaixador e reorganize sua mao.', requiresTarget: false,
            claim: ROLES.AMBASSADOR, cost: 0, challengeable: true, blockClaims: []
        },
        [ACTIONS.EXCHANGE_INQUISITOR]: {
            label: 'Trocar (Inquisidor)', description: 'Declare Inquisidor e reorganize sua mao.', requiresTarget: false,
            claim: ROLES.INQUISITOR, cost: 0, challengeable: true, blockClaims: []
        },
        [ACTIONS.EXAMINE]: {
            label: 'Investigar', description: 'Declare Inquisidor e examine uma influencia.', requiresTarget: true,
            claim: ROLES.INQUISITOR, cost: 0, challengeable: true, blockClaims: []
        }
    });

    const PHASES = Object.freeze({
        WAITING: 'waiting',
        TURN: 'turn',
        RESPONSE: 'response',
        BLOCK_CHALLENGE: 'block-challenge',
        INFLUENCE_LOSS: 'influence-loss',
        EXCHANGE: 'exchange',
        EXAMINE: 'examine',
        FINISHED: 'finished'
    });

    const SETTINGS = Object.freeze({
        minPlayers: 2,
        maxPlayers: 8,
        cardsPerRole: 5,
        startingCoins: 2,
        startingInfluences: 2,
        mandatoryCoupCoins: 10,
        responseSeconds: 15,
        turnSeconds: 45,
        selectionSeconds: 20
    });

    function getAction(actionType) {
        return ACTION_DEFINITIONS[actionType] || null;
    }

    function getRole(role) {
        return ROLE_DEFINITIONS[role] || null;
    }

    function createDeck(random = Math.random) {
        const deck = [];
        let cardNumber = 1;

        Object.keys(ROLE_DEFINITIONS).forEach((role) => {
            for (let index = 0; index < SETTINGS.cardsPerRole; index += 1) {
                deck.push({ id: `rank-card-${cardNumber}`, role });
                cardNumber += 1;
            }
        });

        return shuffle(deck, random);
    }

    function shuffle(items, random = Math.random) {
        const shuffled = items.slice();
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const target = Math.floor(random() * (index + 1));
            [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
        }
        return shuffled;
    }

    return Object.freeze({
        ROLES,
        ROLE_DEFINITIONS,
        ACTIONS,
        ACTION_DEFINITIONS,
        PHASES,
        SETTINGS,
        getAction,
        getRole,
        createDeck,
        shuffle
    });
});

