// =======================================================
// === DEFINIÇÕES E TIPOS DE CARTAS (rules.js) ===
// =======================================================

const MAX_PLAYERS = 8;

/**
 * LISTA MESTRE DE PERSONAGENS
 * Define todos os tipos de cartas disponíveis no jogo, incluindo expansões
 * como "Sombras do Palácio (Promo)", "A Revolução" e "Sombras do Asilo", com suas respectivas cores.
 */
const CARD_TYPES = [
  { type: 'duque', color: '#ff66c4' },
  { type: 'capitao', color: '#004aad' },
  { type: 'assassino', color: '#545454' },
  { type: 'embaixador', color: '#00bf63' },
  { type: 'condessa', color: '#0097b2' },
  { type: 'inquisidor', color: '#ff5757' },
  { type: 'benfeitor', color: '#00bf63' },
  { type: 'bufao', color: '#00bf63' },
  { type: 'burgues', color: '#ff66c4' },
  { type: 'burocrata', color: '#ff66c4' },
  { type: 'vigilante', color: '#f00262' },
  { type: 'mercenario', color: '#ff0000' },
  { type: 'bispo', color: '#0db4c3' },
  { type: 'tesoureiro', color: '#f9c700' },
  { type: 'diplomata', color: '#001aff' },
  { type: 'marionetista', color: '#4d047e' },

  // --- NOVAS CARTAS: SOMBRAS DO ASILO ---
  { type: 'pistoleiro', color: '#ff0000' },
  { type: 'magnata', color: '#733d0b' },
  { type: 'estrategista', color: '#3737dc' },
  { type: 'ladrao', color: '#047e4d' },
  { type: 'vigarista', color: '#ff8000' },
  { type: 'xerife', color: '#0b43fb' },
];

// =======================================================
// === SISTEMA DE GERAÇÃO DE BARALHO ===
// =======================================================

/**
 * CONFIGURAÇÃO PADRÃO DO DECK
 * Define a quantidade inicial de cada carta para uma partida padrão.
 * Personagens de expansão começam com valor zero (desativados).
 */
function createDefaultDeckConfig() {
  return {
    'duque': 5, 'capitao': 5, 'assassino': 5, 'embaixador': 5, 'condessa': 5,
    'inquisidor': 5, 'benfeitor': 0, 'bufao': 0, 'burgues': 0, 'burocrata': 0,
    'vigilante': 0, 'mercenario': 0, 'bispo': 0, 'tesoureiro': 0,
    'diplomata': 0, 'marionetista': 0, 'pistoleiro': 0, 'magnata': 0,
    'estrategista': 0, 'ladrao': 0, 'vigarista': 0, 'xerife': 0
  };
}

/**
 * CRIAR BARALHO
 * Gera um novo array de objetos de carta com base em uma configuração.
 * Atribui IDs únicos, cores e define a localização inicial como 'deck'.
 */
function createDeck(config) {
  let newDeck = [];
  let idCounter = 1;

  if (!config) {
    config = createDefaultDeckConfig();
  }

  for (const cardType in config) {
    const quantity = config[cardType];
    const cardInfo = CARD_TYPES.find(c => c.type === cardType);

    if (cardInfo && quantity > 0) {
      for (let i = 0; i < quantity; i++) {
        newDeck.push({
          id: 'c' + (idCounter++),
          type: cardInfo.type,
          color: cardInfo.color,
          owner: null,
          visible: false,
          location: 'deck'
        });
      }
    }
  }

  shuffle(newDeck); // Embaralha antes de retornar
  return newDeck;
}

/**
 * EMBARALHAMENTO (Fisher-Yates)
 * Algoritmo otimizado para randomizar a ordem dos elementos do baralho.
 */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// =======================================================
// === UTILITÁRIOS DE BUSCA E MANIPULAÇÃO ===
// =======================================================

/**
 * LOCALIZAR CARTA POR ID
 * Varre recursivamente o estado do jogo (Deck, Cemitério e Mãos)
 * para encontrar o objeto da carta correspondente ao ID.
 */
function findCardById(state, id) {
  if (!state || !id) return null;

  // Busca em áreas comuns
  let card = state.deck?.find(c => c.id === id);
  if (card) return card;

  card = state.freeCards?.find(c => c.id === id);
  if (card) return card;

  card = state.grave?.find(c => c.id === id);
  if (card) return card;

  // Busca na mão de cada jogador da sala
  for (let p = 1; p <= MAX_PLAYERS; p++) {
    card = state.players?.[p]?.hand?.find(c => c.id === id);
    if (card) return card;
  }

  return null;
}

/**
 * REMOVER CARTA DE SUA LOCALIZAÇÃO ATUAL
 * Filtra todos os arrays de cartas no estado para remover uma carta específica.
 * Essencial para processos de movimentação (Ex: tirar da mão e pôr no deck).
 */
function removeCardFromLocation(state, cardId) {
  if (!state || !cardId) return;

  // Limpa áreas centrais
  if (state.deck) state.deck = state.deck.filter(c => c.id !== cardId);
  if (state.freeCards) state.freeCards = state.freeCards.filter(c => c.id !== cardId);
  if (state.grave) state.grave = state.grave.filter(c => c.id !== cardId);

  // Limpa mãos dos jogadores
  if (state.players) {
    for (let p = 1; p <= MAX_PLAYERS; p++) {
      if (state.players[p]?.hand) {
        state.players[p].hand = state.players[p].hand.filter(c => c.id !== cardId);
      }
    }
  }
}
