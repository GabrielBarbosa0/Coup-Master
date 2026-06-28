const prototypeState = {
  deck: 18,
  graveyard: 8,
  asylum: 9
};

const initialPlayerCoins = new Map();
const drawnCardTypes = ['capitao', 'assassino', 'embaixador', 'condessa', 'duque', 'inquisidor'];
let toastTimer = null;

function updateStatus() {
  document.getElementById('deckCount').textContent = prototypeState.deck;
  document.getElementById('asylumValue').textContent = prototypeState.asylum;

  document.querySelector('[data-status="deck"]').textContent = prototypeState.deck;
  document.querySelector('[data-status="graveyard"]').textContent = prototypeState.graveyard;
  document.querySelector('[data-status="asylum"]').textContent = prototypeState.asylum;
}

function showToast(message) {
  const toast = document.getElementById('prototypeToast');
  toast.textContent = message;
  toast.hidden = false;

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function changeCounter(counter, amount) {
  const currentValue = Number(counter.textContent) || 0;
  counter.textContent = Math.max(0, currentValue + amount);
}

function resetPrototype() {
  prototypeState.deck = 18;
  prototypeState.graveyard = 8;
  prototypeState.asylum = 9;
  updateStatus();

  document.querySelectorAll('.player-seat').forEach((seat) => {
    const counter = seat.querySelector('.coin-value');
    counter.textContent = initialPlayerCoins.get(seat.dataset.player) || 2;
  });

  const localHand = document.querySelector('.player-seat.is-local .player-hand');
  while (localHand.children.length > 2) {
    localHand.lastElementChild.remove();
  }

  showToast('Mesa 2.0 restaurada para o estado inicial.');
}

function drawPrototypeCard() {
  if (prototypeState.deck <= 0) {
    showToast('O baralho está vazio.');
    return;
  }

  const type = drawnCardTypes[(18 - prototypeState.deck) % drawnCardTypes.length];
  const card = document.createElement('img');
  card.className = 'card';
  card.src = `../../assets/img/cards/base/${type}.png`;
  card.alt = type.charAt(0).toUpperCase() + type.slice(1);

  document.querySelector('.player-seat.is-local .player-hand').append(card);
  prototypeState.deck -= 1;
  updateStatus();
  showToast('Carta comprada pelo Visitante 1.');
}

function openChat() {
  document.getElementById('chatPanel').hidden = false;
  document.getElementById('openChatBtn').hidden = true;
  window.setTimeout(() => document.getElementById('chatInput').focus(), 30);
}

function closeChat() {
  document.getElementById('chatPanel').hidden = true;
  document.getElementById('openChatBtn').hidden = false;
}

function sendChatMessage(event) {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const messages = document.getElementById('chatMessages');
  messages.querySelector('.empty-chat')?.remove();

  const message = document.createElement('p');
  message.className = 'chat-message is-own';
  message.textContent = text;
  messages.append(message);
  messages.scrollTop = messages.scrollHeight;
  input.value = '';
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    showToast('Tela cheia não está disponível neste navegador.');
  }
}

document.querySelectorAll('.player-seat').forEach((seat) => {
  initialPlayerCoins.set(seat.dataset.player, Number(seat.querySelector('.coin-value').textContent));
});

document.addEventListener('click', (event) => {
  const coinButton = event.target.closest('[data-coin-action]');
  if (coinButton) {
    const amount = coinButton.dataset.coinAction === 'increase' ? 1 : -1;
    changeCounter(coinButton.closest('.coin-counter').querySelector('.coin-value'), amount);
    return;
  }

  const asylumButton = event.target.closest('[data-asylum-action]');
  if (asylumButton) {
    const amount = asylumButton.dataset.asylumAction === 'increase' ? 1 : -1;
    prototypeState.asylum = Math.max(0, prototypeState.asylum + amount);
    updateStatus();
    return;
  }

  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;

  const action = actionButton.dataset.action;
  if (action === 'reset-table') {
    resetPrototype();
  } else if (action === 'fullscreen') {
    toggleFullscreen();
  } else if (action === 'toggle-music') {
    const muted = actionButton.getAttribute('aria-pressed') !== 'true';
    actionButton.setAttribute('aria-pressed', String(muted));
    showToast(muted ? 'Música silenciada no protótipo.' : 'Música ativada no protótipo.');
  } else if (action === 'leave-room') {
    showToast('Saída desativada neste protótipo isolado.');
  } else {
    const labels = {
      feedback: 'Feedback',
      rules: 'Regras alternativas',
      spectator: 'Modo espectador',
      actions: 'Ações dos personagens',
      settings: 'Configurações'
    };
    showToast(`${labels[action]} será conectado aos modais existentes na integração.`);
  }
});

document.getElementById('deckPile').addEventListener('click', drawPrototypeCard);
document.getElementById('openChatBtn').addEventListener('click', openChat);
document.getElementById('closeChatBtn').addEventListener('click', closeChat);
document.getElementById('chatForm').addEventListener('submit', sendChatMessage);
document.getElementById('roomCodeBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('J92A');
    showToast('Código J92A copiado.');
  } catch (error) {
    showToast('Código da sala: J92A');
  }
});

updateStatus();
