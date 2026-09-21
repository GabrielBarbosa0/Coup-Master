const assert = require('node:assert/strict');
const test = require('node:test');
const Transfers = require('./ranked-card-transfers.js');

function state({ status = 'active', phase = 'turn', deck = [], players = {}, exchange = null } = {}) {
    return { status, phase, deck, players, pendingExchange: exchange };
}

const card = (id) => ({ id, role: 'duke' });
const player = (uid, seat, ids) => ({ uid, seat, influences: ids.map(card) });

test('detecta a distribuicao inicial na ordem dos assentos', () => {
    const previous = state({ phase: 'starter-draw', deck: [] });
    const next = state({
        phase: 'dealing',
        deck: [],
        players: { u2: player('u2', 2, ['c', 'd']), u1: player('u1', 1, ['a', 'b']) }
    });
    const moves = Transfers.planTransfers(previous, next);
    assert.deepEqual(moves.map((move) => move.cardId), ['a', 'c', 'b', 'd']);
    assert.ok(moves.every((move) => move.from.kind === 'deck' && move.to.kind === 'player' && move.initialDeal));
});

test('detecta compras e devolucoes de uma troca', () => {
    const beforeDraw = state({
        deck: ['new-1', 'new-2'].map(card),
        players: { u1: player('u1', 1, ['old-1', 'old-2']) }
    });
    const choosing = state({
        deck: [],
        players: beforeDraw.players,
        exchange: { playerUid: 'u1', options: ['old-1', 'old-2', 'new-1', 'new-2'].map(card) }
    });
    assert.deepEqual(Transfers.planTransfers(beforeDraw, choosing).map((move) => move.cardId), ['new-1', 'new-2']);

    const confirmed = state({
        deck: ['old-1', 'new-2'].map(card),
        players: { u1: player('u1', 1, ['old-2', 'new-1']) }
    });
    const moves = Transfers.planTransfers(choosing, confirmed);
    assert.deepEqual(moves.filter((move) => move.to.kind === 'deck').map((move) => move.cardId).sort(), ['new-2', 'old-1']);
    assert.deepEqual(moves.filter((move) => move.to.kind === 'player').map((move) => move.cardId).sort(), ['new-1', 'old-2']);
});

test('detecta a devolucao comprovada e a carta substituta', () => {
    const previous = state({
        deck: [card('replacement')],
        players: { u1: player('u1', 1, ['proven', 'other']) }
    });
    const next = state({
        deck: [card('proven')],
        players: { u1: player('u1', 1, ['replacement', 'other']) }
    });
    const moves = Transfers.planTransfers(previous, next);
    assert.equal(moves.find((move) => move.cardId === 'proven').to.kind, 'deck');
    assert.equal(moves.find((move) => move.cardId === 'replacement').to.kind, 'player');
});
