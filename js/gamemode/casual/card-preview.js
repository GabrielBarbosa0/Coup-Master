(function setupCasualCardPreview(root) {
  let previewBound = false;
  let dependencies = {};

  function getPreviewElements() {
    const modal = document.getElementById('cardPreviewModal');
    const front = document.getElementById('previewFront');
    const flipCard = document.getElementById('previewFlipCard');
    const flipInner = flipCard?.querySelector('.flip-card-inner');
    const closeButton = document.getElementById('closePreviewBtn');

    return { modal, front, flipCard, flipInner, closeButton };
  }

  function close() {
    const { modal } = getPreviewElements();
    if (modal) modal.style.display = 'none';
  }

  function open(card) {
    if (!card?.type) return;

    const { modal, front, flipInner } = getPreviewElements();
    if (!modal || !front) return;

    const getCardFolder = dependencies.getCardFolder || (() => 'base');
    const folder = getCardFolder(card.type);
    const imageUrl = `./assets/img/cards/${folder}/${card.type.toLowerCase()}.png`;

    front.style.backgroundImage = `url('${imageUrl}')`;

    if (flipInner) flipInner.style.transform = 'rotateY(0deg)';
    modal.style.display = 'flex';
  }

  function flip() {
    const { flipInner } = getPreviewElements();
    if (!flipInner) return;

    const isFlipped = flipInner.style.transform === 'rotateY(180deg)';
    flipInner.style.transform = isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)';

    const playSound = dependencies.playSound || root.playSound;
    if (typeof playSound === 'function') playSound('card-slide');
  }

  function handleContextMenu(event) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') return;

    event.preventDefault();

    const cardElement = event.target.closest?.('.card');
    if (!cardElement) return;

    const getState = dependencies.getState || (() => root.localGameState);
    const findCardById = dependencies.findCardById || root.findCardById;
    const shouldShowBack = dependencies.shouldShowBack || (() => false);

    if (typeof findCardById !== 'function') return;

    const cardData = findCardById(getState(), cardElement.dataset.cardId);
    if (cardData && !shouldShowBack(cardData)) {
      open(cardData);
    }
  }

  function bindControls() {
    const { closeButton, flipCard } = getPreviewElements();

    if (closeButton) closeButton.onclick = close;
    if (flipCard) flipCard.onclick = flip;
  }

  function setup(options = {}) {
    dependencies = { ...dependencies, ...options };
    bindControls();

    if (!previewBound) {
      document.addEventListener('contextmenu', handleContextMenu);
      previewBound = true;
    }
  }

  root.CoupCardPreview = {
    setup,
    open,
    close,
    flip
  };
})(window);
