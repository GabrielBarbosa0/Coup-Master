const assert = require('node:assert/strict');
const test = require('node:test');
const Transfers = require('./ranked-coin-transfers.js');

function state(balances) {
    return {
        players: Object.fromEntries(Object.entries(balances).map(([uid, coins], index) => [
            uid,
            { uid, seat: index + 1, coins }
        ]))
    };
}

function stateWithAction(balances, pendingAction) {
    return { ...state(balances), pendingAction };
}

test('leva renda, ajuda externa e taxa do tesouro ao jogador', () => {
    [1, 2, 3].forEach((amount) => {
        const transfers = Transfers.planTransfers(state({ u1: 2 }), state({ u1: 2 + amount }));
        assert.deepEqual(transfers, [{
            from: { kind: 'treasury' },
            to: { kind: 'player', uid: 'u1' },
            amount
        }]);
    });
});

test('leva custos do jogador ao tesouro', () => {
    const transfers = Transfers.planTransfers(state({ u1: 10 }), state({ u1: 3 }));
    assert.deepEqual(transfers, [{
        from: { kind: 'player', uid: 'u1' },
        to: { kind: 'treasury' },
        amount: 7,
        coins: Array(7).fill('silver')
    }]);
});

test('representa o golpe com duas moedas de prata e uma de ouro', () => {
    const previous = state({ u1: 10 });
    const next = stateWithAction({ u1: 3 }, { id: 'action-1', type: 'coup', actorUid: 'u1' });
    const [payment] = Transfers.planTransfers(previous, next);
    assert.equal(payment.amount, 7);
    assert.deepEqual(payment.coins, ['silver', 'silver', 'gold']);
});

test('mantem o assassinato inteiramente em prata', () => {
    const previous = state({ u1: 5 });
    const next = stateWithAction({ u1: 2 }, { id: 'action-2', type: 'assassinate', actorUid: 'u1' });
    const [payment] = Transfers.planTransfers(previous, next);
    assert.deepEqual(payment.coins, ['silver', 'silver', 'silver']);
});

test('move moedas roubadas diretamente entre jogadores', () => {
    const transfers = Transfers.planTransfers(state({ thief: 2, target: 4 }), state({ thief: 4, target: 2 }));
    assert.deepEqual(transfers, [{
        from: { kind: 'player', uid: 'target' },
        to: { kind: 'player', uid: 'thief' },
        amount: 2
    }]);
});

test('ignora jogadores novos e saldos inalterados', () => {
    assert.deepEqual(Transfers.planTransfers(state({ u1: 2 }), state({ u1: 2, u2: 2 })), []);
});
