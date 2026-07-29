(function setupCasualChatService(root) {
  const CHAT_MESSAGE_MAX_LENGTH = 240;
  const QUICK_CHAT_MESSAGES = [
    'Contesto',
    'Bloqueio',
    'Sou o Duque',
    'Sou o Capitão',
    'Sou o Assassino',
    'Sou a Condessa',
    'Sou o Embaixador',
    'Sou o Inquisidor',
    'Taxar',
    'Extorquir',
    'Assassinar',
    'Trocar',
    'Investigar'
  ];

  let config = {};
  let chatMessages = [];
  let chatMessagesInitialized = false;
  let chatListenerReady = false;
  let chatListenerRoomCode = '';
  let lastSeenChatMessageKey = '';

  function getElement(id) {
    return document.getElementById(id);
  }

  function getState() {
    return config.getState?.() || {};
  }

  function getRoomCode() {
    return config.getRoomCode?.() || '';
  }

  function getCurrentUser() {
    return config.getCurrentUser?.() || null;
  }

  function getMyPlayerId() {
    return config.getMyPlayerId?.() || null;
  }

  function getDatabase() {
    if (config.getDatabase) return config.getDatabase();
    if (root.db) return root.db;
    return null;
  }

  function getFirebase() {
    if (config.getFirebase) return config.getFirebase();
    if (root.firebase) return root.firebase;
    return null;
  }

  function playSound(soundId) {
    const handler = config.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function formatChatTime(timestamp) {
    if (!timestamp) return '--:--';

    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getChatAuthorName() {
    const playerName = getState()?.players?.[getMyPlayerId()]?.name;
    return playerName || getCurrentUser()?.name || 'Jogador';
  }

  function getChatMessagesRef() {
    const database = getDatabase();
    const roomCode = getRoomCode();
    if (!database || !roomCode) return null;
    return database.ref(`salas/${roomCode}/chatMessages`);
  }

  function getChatMessageKey(message) {
    if (!message) return '';
    return String(message.id || message.createdAt || `${message.uid || message.actorUid || ''}-${message.text || ''}`);
  }

  function getLastChatMessageKey() {
    return getChatMessageKey(chatMessages[chatMessages.length - 1]);
  }

  function isOwnChatMessage(message) {
    const currentUser = getCurrentUser();
    return message?.uid === currentUser?.uid || message?.actorUid === currentUser?.uid;
  }

  function isChatModalOpen() {
    return Boolean(root.CoupModal?.isVisible('chatModal'));
  }

  function isModalVisible(modal) {
    return Boolean(root.CoupModal?.isVisible(modal));
  }

  function syncFloatingChatButtonVisibility() {
    const chatBtn = getElement('chatBtn');
    if (!chatBtn) return;

    const hasBlockingModalOpen = Array
      .from(document.querySelectorAll('.modal-overlay'))
      .some(modal => modal.id !== 'chatModal' && isModalVisible(modal));

    chatBtn.classList.toggle('is-hidden-by-modal', hasBlockingModalOpen);
  }

  function setupFloatingChatModalObserver() {
    if (document.body?.dataset.floatingChatObserverBound === 'true') {
      syncFloatingChatButtonVisibility();
      return;
    }

    document.body.dataset.floatingChatObserverBound = 'true';

    const observer = new MutationObserver(syncFloatingChatButtonVisibility);
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden']
      });
    });

    syncFloatingChatButtonVisibility();
  }

  function openChatModal() {
    const chatModal = getElement('chatModal');
    const chatBtn = getElement('chatBtn');
    const chatInput = getElement('chatInput');

    playSound('click');
    root.CoupModal?.open(chatModal);
    if (chatBtn) {
      chatBtn.classList.remove('chat-btn-has-unread');
      chatBtn.classList.add('is-chat-open');
    }
    lastSeenChatMessageKey = getLastChatMessageKey();
    root.setTimeout(() => chatInput?.focus(), 60);
  }

  function closeChatModal() {
    const chatModal = getElement('chatModal');
    const chatBtn = getElement('chatBtn');

    playSound('click');
    root.CoupModal?.close(chatModal);
    if (chatBtn) chatBtn.classList.remove('is-chat-open');
  }

  async function sendChatMessage({ text, type = 'text' }) {
    const cleanText = String(text || '').trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
    const currentUser = getCurrentUser();
    const roomCode = getRoomCode();
    const chatMessagesRef = getChatMessagesRef();
    const firebaseApi = getFirebase();

    if (!cleanText || !roomCode || !currentUser?.uid || !chatMessagesRef || !firebaseApi) return;

    const messageRef = chatMessagesRef.push();
    await messageRef.set({
      id: messageRef.key,
      type,
      text: cleanText,
      uid: currentUser.uid,
      actorUid: currentUser.uid,
      actorPid: getMyPlayerId() || null,
      displayName: getChatAuthorName(),
      createdAt: firebaseApi.database.ServerValue.TIMESTAMP
    });
  }

  function renderChatMessages() {
    const chatMessagesList = getElement('chatMessagesList');
    if (!chatMessagesList) return;

    chatMessagesList.innerHTML = '';
    if (chatMessages.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'chat-empty-message';
      empty.textContent = 'Nenhuma mensagem ainda.';
      chatMessagesList.append(empty);
      return;
    }

    chatMessages.forEach((message) => {
      const item = document.createElement('article');
      item.className = 'chat-message';
      if (isOwnChatMessage(message)) {
        item.classList.add('is-own');
      }
      if (message.type === 'quick') {
        item.classList.add('is-quick');
      }

      const meta = document.createElement('div');
      meta.className = 'chat-message-meta';
      meta.textContent = `${message.displayName || message.actorName || 'Jogador'} · ${formatChatTime(message.createdAt)}`;

      const text = document.createElement('p');
      text.className = 'chat-message-text';
      text.textContent = message.text || '';

      item.append(meta, text);
      chatMessagesList.append(item);
    });

    chatMessagesList.scrollTop = chatMessagesList.scrollHeight;
  }

  function setChatMessages(messages = []) {
    chatMessages = messages.slice(-60);
    renderChatMessages();

    const chatBtn = getElement('chatBtn');
    const latestMessage = chatMessages[chatMessages.length - 1];
    const latestKey = getChatMessageKey(latestMessage);

    if (!chatMessagesInitialized) {
      lastSeenChatMessageKey = latestKey;
      chatMessagesInitialized = true;
      return;
    }

    if (!latestKey || latestKey === lastSeenChatMessageKey) return;

    if (isChatModalOpen()) {
      lastSeenChatMessageKey = latestKey;
      chatBtn?.classList.remove('chat-btn-has-unread');
      return;
    }

    if (chatMessagesInitialized && !isOwnChatMessage(latestMessage)) {
      chatBtn?.classList.add('chat-btn-has-unread');
      playSound('pop');
    }

    lastSeenChatMessageKey = latestKey;
  }

  function bindChatControls() {
    const chatBtn = getElement('chatBtn');
    const closeChatBtn = getElement('closeChatBtn');
    const chatForm = getElement('chatForm');
    const chatInput = getElement('chatInput');
    const chatQuickMessages = getElement('chatQuickMessages');

    setupFloatingChatModalObserver();

    if (chatBtn && chatBtn.dataset.chatBound !== 'true') {
      chatBtn.dataset.chatBound = 'true';
      chatBtn.addEventListener('click', openChatModal);
    }

    if (closeChatBtn && closeChatBtn.dataset.chatBound !== 'true') {
      closeChatBtn.dataset.chatBound = 'true';
      closeChatBtn.addEventListener('click', closeChatModal);
    }

    if (chatForm && chatForm.dataset.chatBound !== 'true') {
      chatForm.dataset.chatBound = 'true';
      chatForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = chatInput?.value || '';
        if (!text.trim()) return;

        try {
          if (chatInput) chatInput.value = '';
          await sendChatMessage({ text, type: 'text' });
        } catch (error) {
          console.error('Erro ao enviar mensagem no chat:', error);
        }
      });
    }

    if (chatQuickMessages && chatQuickMessages.children.length === 0) {
      QUICK_CHAT_MESSAGES.forEach((message) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chat-quick-btn';
        button.textContent = message;
        button.addEventListener('click', () => {
          sendChatMessage({ text: message, type: 'quick' })
            .catch((error) => console.error('Erro ao enviar mensagem rápida:', error));
        });
        chatQuickMessages.append(button);
      });
    }

    renderChatMessages();
  }

  function bindChatListener() {
    const roomCode = getRoomCode();
    const chatMessagesRef = getChatMessagesRef();

    if (!roomCode || !chatMessagesRef) return;
    if (chatListenerReady && chatListenerRoomCode === roomCode) return;

    chatListenerReady = true;
    chatListenerRoomCode = roomCode;

    chatMessagesRef.limitToLast(60).on('value', (snapshot) => {
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        const message = childSnapshot.val();
        if (message?.text) {
          messages.push({ ...message, id: message.id || childSnapshot.key });
        }
      });
      messages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setChatMessages(messages);
    });
  }

  function setup(options = {}) {
    config = {
      ...config,
      ...options
    };

    bindChatControls();
    bindChatListener();
  }

  root.CoupChat = {
    setup,
    openChatModal,
    closeChatModal,
    sendChatMessage,
    renderChatMessages
  };

  root.setupRoomChat = setup;
})(window);
