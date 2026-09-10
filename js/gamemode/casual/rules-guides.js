(function setupCasualRulesGuides(root) {
  const RULE_DRAW_MIN = 1;
  const RULE_DRAW_MAX = 5;
  const RULE_DRAW_BUTTON_ENABLED = false;
  const RULE_DRAW_ANIMATION_MS = 1700;
  const RULE_DRAW_TICK_MS = 95;

  const ALT_RULE_PAGE_IDS = [
    ['justica-lenta', 'falso-duque', 'assassino-declarado', 'sangue-frio', 'ladrao-de-tumulos'],
    ['ultima-palavra', 'recompensa', 'espolio', 'votos-do-senado', 'mercado-negro', 'golpe-magno'],
    ['soberania-absoluta', 'contrabando', 'panico-economico', 'camara', 'corrupcao'],
    ['o-trio-falso', 'figura-publica', 'chantagem', 'imprensa', 'favor-da-coroa'],
    ['inversao-de-poder', 'espionagem', 'sorte-do-destino', 'conselho-de-emergencia', 'herdeiro-do-trono', 'golpe-declarado']
  ];

  const ALT_RULE_PAGE_STYLES = [
    { titleSize: 9, ruleSize: 4.52, ruleGap: 3.7, blockWidth: 100, blockOffset: 0 },
    { titleSize: 9, ruleSize: 4.25, ruleGap: 4, blockWidth: 100, blockOffset: 0 },
    { titleSize: 9, ruleSize: 4.42, ruleGap: 3.3, blockWidth: 100, blockOffset: 0 },
    { titleSize: 9, ruleSize: 4.42, ruleGap: 4.4, blockWidth: 100, blockOffset: 0 },
    { titleSize: 9, ruleSize: 4.25, ruleGap: 2.6, blockWidth: 100, blockOffset: 0 }
  ];

  const ALT_RULE_COPY = {
    pt: {
      title: 'Regras Alternativas',
      intro: 'Selecione até 5 regras alternativas para uma partida mais imprevisível',
      rules: {
        'justica-lenta': {
          title: 'Justiça Lenta',
          description: 'Os golpes só podem ser dados com 10 moedas, ao invés de 7, sendo obrigatório com 15 moedas.'
        },
        'falso-duque': {
          title: 'Falso Duque',
          description: 'Haverá apenas 1 Duque no baralho.'
        },
        'assassino-declarado': {
          title: 'Assassino Declarado',
          description: 'Para o assassinato ter sucesso, o assassino deve adivinhar a última influência do alvo. Se errar, perde as moedas e o alvo compra uma nova carta.'
        },
        'sangue-frio': {
          title: 'Sangue Frio',
          description: 'Após um assassinato bem-sucedido, o assassino ganha 2 moedas de recompensa.'
        },
        'ladrao-de-tumulos': {
          title: 'Ladrão de Túmulos',
          description: 'Poderá pagar 4 moedas para trocar uma carta da mão com uma revelada na mesa.'
        },
        'ultima-palavra': {
          title: 'Última Palavra',
          description: 'Quando for eliminado, você pode escolher um jogador para perder 2 moedas imediatamente.'
        },
        recompensa: {
          title: 'Recompensa',
          description: 'Elimine um jogador com mais de 7 moedas e ganhe 2 moedas de recompensa por golpe, contestação, assassinato ou execução bruta.'
        },
        espolio: {
          title: 'Espólio',
          description: 'Quando alguém é eliminado, suas moedas são divididas entre os jogadores restantes em partes iguais. Caso sobre, devolva para o banco.'
        },
        'votos-do-senado': {
          title: 'Votos do Senado',
          description: 'Golpes de Estado precisam de aprovação da maioria dos jogadores vivos.'
        },
        'mercado-negro': {
          title: 'Mercado Negro',
          description: 'Poderá pagar 2 moedas para trocar uma carta da mão com uma do baralho.'
        },
        'golpe-magno': {
          title: 'Golpe Magno',
          description: 'Quando um jogador atingir 15 moedas, todos perdem 1 influência.'
        },
        'soberania-absoluta': {
          title: 'Soberania Absoluta',
          description: 'Se possuir 2 Condessas, você pode bloquear qualquer ação contra si. Pode blefar, mas se for contestado e mentir, será eliminado. Se conseguir, deve trocar ambas as cartas.'
        },
        contrabando: {
          title: 'Contrabando',
          description: 'Você pode sacrificar uma influência sua para ganhar 10 moedas automaticamente.'
        },
        'panico-economico': {
          title: 'Pânico Econômico',
          description: 'Quando alguém acumular mais de 8 moedas, todos os jogadores recebem 1 moeda automaticamente.'
        },
        camara: {
          title: 'Câmara',
          description: 'Todos vão receber 4 influências, e escolhem duas para ficar e duas para colocar no baralho.'
        },
        corrupcao: {
          title: 'Corrupção',
          description: 'No início do jogo, receba duas cartas e selecione uma para manter e outra para descartar. Em seguida, sua segunda carta será sorteada aleatoriamente.'
        },
        'o-trio-falso': {
          title: 'O Trio Falso',
          description: 'Em vez de 2 cartas, começa com 3, porém com 2 vidas apenas.'
        },
        'figura-publica': {
          title: 'Figura Pública',
          description: 'Um personagem é revelado na mesa, só existirá ele no jogo e o uso dele é público, todos podem usar.'
        },
        chantagem: {
          title: 'Chantagem',
          description: 'Ao gastar 7 moedas você poderá roubar uma influência de um jogador e pegar para você, porém você deverá dar uma de suas cartas para ele. Pode ser bloqueado pelo Embaixador, Inquisidor e Bufão.'
        },
        imprensa: {
          title: 'Imprensa',
          description: 'Gaste 4 moedas para revelar uma carta de outro jogador para todos à sua escolha, porém o jogador afetado ganha 2 moedas.'
        },
        'favor-da-coroa': {
          title: 'Favor da Coroa',
          description: 'Quando for alvo de uma ação, você pode pagar 3 moedas para bloqueá-la. Exceto Golpe de Estado.'
        },
        'inversao-de-poder': {
          title: 'Inversão de Poder',
          description: 'Pague 3 moedas e mude a direção dos turnos.'
        },
        espionagem: {
          title: 'Espionagem',
          description: 'Uma vez por turno, você pode pagar 2 moedas para olhar secretamente uma influência de qualquer jogador.'
        },
        'sorte-do-destino': {
          title: 'Sorte do Destino',
          description: 'Sempre que um jogador perder uma influência, ele compra uma carta do topo do baralho. Pode ficar com ela ou devolvê-la ao fundo do baralho.'
        },
        'conselho-de-emergencia': {
          title: 'Conselho de Emergência',
          description: 'Quando um jogador atingir 10 moedas, todos os jogadores vivos recebem 2 moedas.'
        },
        'herdeiro-do-trono': {
          title: 'Herdeiro do Trono',
          description: 'Quando um jogador for eliminado, o responsável pela eliminação recebe imediatamente 3 moedas.'
        },
        'golpe-declarado': {
          title: 'Golpe Declarado',
          description: 'Para o Golpe de Estado ter sucesso, o jogador deve adivinhar a última influência do alvo. Se errar, perde as moedas e o alvo compra uma nova carta.'
        }
      }
    },
    en: {
      title: 'Alternative Rules',
      intro: 'Select up to 5 alternative rules for a more unpredictable match',
      rules: {
        'justica-lenta': {
          title: 'Slow Justice',
          description: 'Coups can only be made with 10 coins instead of 7, and become mandatory with 15 coins.'
        },
        'falso-duque': {
          title: 'False Duke',
          description: 'There will be only 1 Duke in the deck.'
        },
        'assassino-declarado': {
          title: 'Declared Assassin',
          description: "For an assassination to succeed, the Assassin must guess the target's last influence. If they are wrong, they lose the coins and the target draws a new card."
        },
        'sangue-frio': {
          title: 'Cold Blood',
          description: 'After a successful assassination, the Assassin gains a 2-coin reward.'
        },
        'ladrao-de-tumulos': {
          title: 'Grave Robber',
          description: 'You may pay 4 coins to exchange a card from your hand with a revealed card on the table.'
        },
        'ultima-palavra': {
          title: 'Last Word',
          description: 'When eliminated, you may choose a player to lose 2 coins immediately.'
        },
        recompensa: {
          title: 'Reward',
          description: 'Eliminate a player with more than 7 coins and gain a 2-coin reward through coup, challenge, assassination, or brutal execution.'
        },
        espolio: {
          title: 'Spoils',
          description: 'When someone is eliminated, their coins are divided equally among the remaining players. If any coins remain, return them to the bank.'
        },
        'votos-do-senado': {
          title: 'Senate Votes',
          description: 'Coups require approval from the majority of living players.'
        },
        'mercado-negro': {
          title: 'Black Market',
          description: 'You may pay 2 coins to exchange a card from your hand with one from the deck.'
        },
        'golpe-magno': {
          title: 'Grand Coup',
          description: 'When a player reaches 15 coins, everyone loses 1 influence.'
        },
        'soberania-absoluta': {
          title: 'Absolute Sovereignty',
          description: 'If you have 2 Contessas, you may block any action against yourself. You may bluff, but if challenged while lying, you are eliminated. If you prove it, you must exchange both cards.'
        },
        contrabando: {
          title: 'Smuggling',
          description: 'You may sacrifice one of your own influences to gain 10 coins automatically.'
        },
        'panico-economico': {
          title: 'Economic Panic',
          description: 'When someone accumulates more than 8 coins, all players automatically receive 1 coin.'
        },
        camara: {
          title: 'Chamber',
          description: 'Everyone receives 4 influences and chooses two to keep and two to return to the deck.'
        },
        corrupcao: {
          title: 'Corruption',
          description: 'At the start of the game, receive two cards and choose one to keep and one to discard. Then your second card is drawn randomly.'
        },
        'o-trio-falso': {
          title: 'The False Trio',
          description: 'Instead of starting with 2 cards, each player starts with 3, but still has only 2 lives.'
        },
        'figura-publica': {
          title: 'Public Figure',
          description: 'A character is revealed on the table. Only that character exists in the game and its use is public, so everyone may use it.'
        },
        chantagem: {
          title: 'Blackmail',
          description: 'By spending 7 coins, you may steal an influence from another player and take it for yourself, but you must give that player one of your cards. It can be blocked by the Ambassador, Inquisitor, and Jester.'
        },
        imprensa: {
          title: 'Press',
          description: 'Spend 4 coins to reveal a card from another player of your choice to everyone, but the affected player gains 2 coins.'
        },
        'favor-da-coroa': {
          title: "Crown's Favor",
          description: 'When targeted by an action, you may pay 3 coins to block it. This does not block a Coup.'
        },
        'inversao-de-poder': {
          title: 'Power Shift',
          description: 'Pay 3 coins and change the direction of turns.'
        },
        espionagem: {
          title: 'Espionage',
          description: "Once per turn, you may pay 2 coins to secretly look at any player's influence."
        },
        'sorte-do-destino': {
          title: 'Luck of Fate',
          description: 'Whenever a player loses an influence, they draw a card from the top of the deck. They may keep it or return it to the bottom of the deck.'
        },
        'conselho-de-emergencia': {
          title: 'Emergency Council',
          description: 'When a player reaches 10 coins, all living players receive 2 coins.'
        },
        'herdeiro-do-trono': {
          title: 'Heir to the Throne',
          description: 'When a player is eliminated, the player responsible for the elimination immediately receives 3 coins.'
        },
        'golpe-declarado': {
          title: 'Declared Coup',
          description: "For a Coup to succeed, the player must guess the target's last influence. If they are wrong, they lose the coins and the target draws a new card."
        }
      }
    }
  };

  const CARD_GROUPS = {
    base: ['duque', 'capitao', 'assassino', 'condessa', 'embaixador', 'inquisidor'],
    promo: ['bufao', 'burocrata', 'benfeitor', 'burgues'],
    dlc1: ['marionetista', 'diplomata', 'mercenario', 'tesoureiro', 'bispo', 'vigilante'],
    dlc2: ['pistoleiro', 'magnata', 'estrategista', 'ladrao', 'vigarista', 'xerife']
  };

  const CARD_META = {
    duque: { folder: 'base', color: '#ff66c4', pt: 'Duque', en: 'Duke' },
    capitao: { folder: 'base', color: '#075dc3', pt: 'Capitão', en: 'Captain' },
    assassino: { folder: 'base', color: '#626262', pt: 'Assassino', en: 'Assassin' },
    condessa: { folder: 'base', color: '#11a7b9', pt: 'Condessa', en: 'Contessa' },
    embaixador: { folder: 'base', color: '#0dbf70', pt: 'Embaixador', en: 'Ambassador' },
    inquisidor: { folder: 'base', color: '#ff5757', pt: 'Inquisidor', en: 'Inquisitor' },
    bufao: { folder: 'promo', color: '#0dbf70', pt: 'Bufão', en: 'Jester' },
    burocrata: { folder: 'promo', color: '#ff66c4', pt: 'Burocrata', en: 'Bureaucrat' },
    benfeitor: { folder: 'promo', color: '#0dbf70', pt: 'Benfeitor', en: 'Benefactor' },
    burgues: { folder: 'promo', color: '#ff66c4', pt: 'Burguês', en: 'Bourgeois' },
    marionetista: { folder: 'dlc1', color: '#b947ff', pt: 'Marionetista', en: 'Puppeteer' },
    diplomata: { folder: 'dlc1', color: '#1a77d2', pt: 'Diplomata', en: 'Diplomat' },
    mercenario: { folder: 'dlc1', color: '#e1272f', pt: 'Mercenário', en: 'Mercenary' },
    bispo: { folder: 'dlc1', color: '#c7212f', pt: 'Bispo', en: 'Bishop' },
    tesoureiro: { folder: 'dlc1', color: '#d99a16', pt: 'Tesoureiro', en: 'Treasurer' },
    vigilante: { folder: 'dlc1', color: '#ff0054', pt: 'Vigilante', en: 'Vigilante' },
    pistoleiro: { folder: 'dlc2', color: '#e1272f', pt: 'Pistoleiro', en: 'Gunslinger' },
    magnata: { folder: 'dlc2', color: '#ff9900', pt: 'Magnata', en: 'Tycoon' },
    estrategista: { folder: 'dlc2', color: '#27aee4', pt: 'Estrategista', en: 'Strategist' },
    ladrao: { folder: 'dlc2', color: '#2a6b48', pt: 'Ladrão', en: 'Thief' },
    vigarista: { folder: 'dlc2', color: '#f17a21', pt: 'Vigarista', en: 'Swindler' },
    xerife: { folder: 'dlc2', color: '#075dc3', pt: 'Xerife', en: 'Sheriff' }
  };

  const ABILITY_LABELS = [
    'Taxar', 'Extorquir', 'Assassinar', 'Persuasão', 'Trocar', 'Investigar',
    'Desordem', 'Cooperação', 'Redistribuição', 'Dividendos', 'Puxar Fios',
    'Negociar', 'Interceder', 'Execução Bruta', 'Expurgar', 'Tributação',
    'Vingança', 'Cabeça a Prêmio', 'Suborno', 'Manobra', 'Roubo',
    'Fortuna Arriscada', 'Procurado', 'Renda', 'Ajuda Externa',
    'Golpe de Estado', 'Ação de um Personagem', 'Contestação',
    'Tax', 'Steal', 'Assassinate', 'Persuasion', 'Exchange', 'Investigate',
    'Disorder', 'Cooperation', 'Redistribution', 'Dividends', 'Pull Strings',
    'Negotiate', 'Intercede', 'Brutal Execution', 'Purge', 'Taxation',
    'Revenge', 'Bounty', 'Bribe', 'Maneuver', 'Robbery', 'Risky Fortune',
    'Wanted', 'Income', 'Foreign Aid', 'Coup', 'Character Action', 'Challenge'
  ];

  const GUIDE_COPY = {
    pt: {
      page: 'Página',
      titles: {
        characters: 'Ações de Personagens',
        backActions: 'Resumo de Turno',
        promo: 'Sombras do Palácio',
        revolution: 'A Revolução',
        dlc2: 'Lei e Desordem'
      },
      actions: {
        duke: (taxationBlock) => taxationBlock
          ? 'Taxar: Pegue 3 moedas do tesouro central. Bloqueia Tributação do Tesoureiro contra si.'
          : 'Taxar: Pegue 3 moedas do tesouro central. Não pode ser bloqueado.',
        captain: (blockers) => `Extorquir: Pegue 2 moedas de um oponente. ${blockers ? `Pode ser bloqueado pelo ${blockers}.` : 'Sem bloqueios ativos neste baralho.'}`,
        assassin: (blockers) => `Assassinar: Pague 3 moedas. Escolha um oponente que perderá uma influência. ${blockers ? `Pode ser bloqueado ${blockers}.` : 'Sem bloqueios ativos neste baralho.'}`,
        contessa: 'Persuasão: Bloqueia qualquer Assassinato direcionado a você. Não pode ser bloqueado.',
        ambassador: (expandedRules) => expandedRules
          ? 'Trocar: Pegue 2 cartas e em seguida devolva 2 cartas para o baralho. Bloqueia Extorsão direcionada a você.'
          : 'Trocar: Pegue 2 cartas e em seguida devolva 2 cartas ao baralho. Não pode ser bloqueado. Bloqueia Extorsão direcionada a você.',
        inquisitor: (bishop) => bishop
          ? 'Trocar: Compre 1 carta e em seguida devolva 1 carta para o baralho. Investigar: Escolha um jogador; olhe uma de suas cartas. Force, ou não a troca. Pode ser bloqueado pelo Bispo. Bloqueia Extorsão direcionada a você.'
          : 'Trocar: Compre 1 carta e em seguida devolva 1 carta para o baralho. Não pode ser bloqueado. Investigar: Escolha um jogador; olhe uma de suas cartas. Force, ou não a troca. Não pode ser bloqueado. Bloqueia Extorsão direcionada a você.',
        foreignAid: (blockers) => `Ajuda Externa: Pegue 2 moedas do Tesouro Central. ${blockers ? `Pode ser bloqueada pelo ${blockers}.` : 'Nenhuma carta ativa bloqueia esta ação.'}`,
        coup: 'Golpe de Estado: Pague 7 moedas e escolha um oponente; ele perderá uma de suas influências. Não pode ser bloqueado ou contestado.',
        income: 'Renda: Pegue 1 moeda do Tesouro Central. Não pode ser bloqueado ou contestado.',
        turnIntro: 'No seu turno você deve realizar uma das seguintes ações.',
        characterAction: 'Ação de um Personagem: Declare um personagem. Você pode dizer a verdade ou blefar.',
        coinPressure: 'Se você possuir 10+ moedas,\ndeverá dar um Golpe de Estado.',
        bufao: 'Desordem: Pegue 1 carta do Baralho e 1 carta de um adversário (escolhida por ele). Escolha uma delas para trocar por uma de suas influências e devolva a outra ao seu local de origem. Pode bloquear Extorsão e Desordem. Ao bloquear Desordem, sua influência não é tomada, mas o jogador ativo ainda pega 1 carta do Baralho e pode realizar a troca normalmente.',
        burocrata: 'Cooperação: Pegue 3 moedas do Tesouro Central e entregue 1 moeda para um adversário. Pode bloquear Ajuda Externa.',
        benfeitor: 'Redistribuição: Pegue 3 moedas do jogador com mais moedas e entregue-as ao jogador com menos moedas. Em caso de empate, o jogador ativo escolhe o alvo. Qualquer jogador que declarar Benfeitor pode bloquear a Redistribuição, impedindo que qualquer moeda seja redistribuída.',
        burgues: 'Dividendos: Pegue 4 moedas. Outros jogadores podem declarar que possuem um Burguês. Após a resolução das contestações, o jogador ativo paga 1 moeda para cada declarante que não foi contestado com sucesso.',
        marionetista: 'Puxar Fios: Pague 3 moedas e escolha um jogador; você decide a próxima ação dele, exceto Golpe de Estado. O efeito termina após essa ação ou se o Marionetista morrer.',
        diplomata: 'Negociar: Pague 2 moedas, escolha dois jogadores (incluindo você, se desejar). Até seu próximo turno, eles não podem usar ações ofensivas um contra o outro. Não pode ser bloqueado. Interceder: Bloqueia Execução Bruta contra si',
        mercenario: 'Execução Bruta: Pague 5 moedas para eliminar qualquer carta. Pode ser bloqueado pelo Diplomata',
        bispo: 'Expurgar: Pague 2 moedas e escolha um jogador. Ele deve revelar uma influência e colocá-la permanentemente no cemitério. Em seguida, compra uma nova carta do baralho. Bloqueia ações do Inquisidor contra si.',
        tesoureiro: 'Tributação: Ganhe 2 moedas; todos os outros jogadores pagam 1 moeda ao banco. Pode ser bloqueado pelo Duque',
        vigilante: 'Vingança: Escolha um jogador que tenha usado uma ação ofensiva contra você desde seu último turno. Ele deve lhe pagar 2 moedas. Se não puder, revela uma de suas influências e permanece com ela revelada no cemitério até que seja trocada.',
        pistoleiro: 'Cabeça a Prêmio: Pague 2 moedas e escolha um alvo. Outro jogador pode pagar 2 moedas para fazer o alvo perder 1 influência. Pode ser bloqueado pelo Xerife.',
        magnata: 'Suborno: Troque uma de suas cartas com o baralho. Você pode pagar X moedas para comprar X cartas extras, escolha uma e devolva o restante ao baralho.',
        estrategista: 'Manobra: Receba 2 moedas e troque uma de suas cartas com outro jogador.',
        ladrao: 'Roubo: Pegue 1 moeda de cada jogador. Outros Ladrões bloqueiam o roubo contra si.',
        vigarista: 'Fortuna Arriscada: Dobre suas moedas (máx.5) Se for contestado e perder, entregue todas as suas moedas ao desafiante.',
        xerife: 'Procurado: Pague 1 moeda e escolha um jogador. Até seu próximo turno, habilidades ofensivas usadas por ele que custem moedas custam 2 moedas adicionais. Bloqueia Cabeça a Prêmio contra qualquer jogador incluindo você.'
      }
    },
    en: {
      page: 'Page',
      titles: {
        characters: 'Character Actions',
        backActions: 'Turn Summary',
        promo: 'Palace Shadows',
        revolution: 'The Revolution',
        dlc2: 'Law and Disorder'
      },
      actions: {
        duke: (taxationBlock) => taxationBlock
          ? "Tax: Take 3 coins from the central treasury. Blocks the Treasurer's Taxation against yourself."
          : 'Tax: Take 3 coins from the central treasury. Cannot be blocked.',
        captain: (blockers) => `Steal: Take 2 coins from an opponent. ${blockers ? `Can be blocked by ${blockers}.` : 'No active blockers in this deck.'}`,
        assassin: (blockers) => `Assassinate: Pay 3 coins. Choose an opponent who will lose one influence. ${blockers ? `Can be blocked by ${blockers}.` : 'No active blockers in this deck.'}`,
        contessa: 'Persuasion: Blocks any Assassination targeting you. Cannot be blocked.',
        ambassador: (expandedRules) => expandedRules
          ? 'Exchange: Draw 2 cards and then return 2 cards to the deck. Blocks Steal targeting you.'
          : 'Exchange: Draw 2 cards and then return 2 cards to the deck. Cannot be blocked. Blocks Steal targeting you.',
        inquisitor: (bishop) => bishop
          ? 'Exchange: Draw 1 card and then return 1 card to the deck. Investigate: Choose a player; look at one of their cards. Force the exchange, or not. Can be blocked by the Bishop. Blocks Steal targeting you.'
          : 'Exchange: Draw 1 card and then return 1 card to the deck. Cannot be blocked. Investigate: Choose a player; look at one of their cards. Force the exchange, or not. Cannot be blocked. Blocks Steal targeting you.',
        foreignAid: (blockers) => `Foreign Aid: Take 2 coins from the central treasury. ${blockers ? `Can be blocked by ${blockers}.` : 'No active card blocks this action.'}`,
        coup: 'Coup: Pay 7 coins and choose an opponent; they will lose one of their influences. Cannot be blocked or challenged.',
        income: 'Income: Take 1 coin from the central treasury. Cannot be blocked or challenged.',
        turnIntro: 'On your turn you must perform one of the following actions.',
        characterAction: 'Character Action: Declare a character. You may tell the truth or bluff.',
        coinPressure: 'If you have 10+ coins,\nyou must perform a Coup.',
        bufao: 'Disorder: Take 1 card from the deck and 1 card from an opponent (chosen by them). Choose one of them to exchange for one of your influences and return the other to its place of origin. Can block Steal and Disorder. When blocking Disorder, your influence is not taken, but the active player still takes 1 card from the deck and may perform the exchange normally.',
        burocrata: 'Cooperation: Take 3 coins from the central treasury and give 1 coin to an opponent. Can block Foreign Aid.',
        benfeitor: 'Redistribution: Take 3 coins from the player with the most coins and give them to the player with the fewest coins. In case of a tie, the active player chooses the target. Any player declaring Benefactor can block Redistribution, preventing any coins from being redistributed.',
        burgues: 'Dividends: Take 4 coins. Other players may declare that they have a Bourgeois. After challenges are resolved, the active player pays 1 coin to each claimant who was not successfully challenged.',
        marionetista: 'Pull Strings: Pay 3 coins and choose a player; you decide their next action, except Coup. The effect ends after that action or if the Puppeteer dies.',
        diplomata: 'Negotiate: Pay 2 coins, choose two players (including yourself, if desired). Until your next turn, they cannot use offensive actions against each other. Cannot be blocked. Intercede: Blocks Brutal Execution against yourself',
        mercenario: 'Brutal Execution: Pay 5 coins to eliminate any card. Can be blocked by the Diplomat',
        bispo: 'Purge: Pay 2 coins and choose a player. They must reveal an influence and place it permanently in the cemetery. Then they draw a new card from the deck. Blocks Inquisitor actions against yourself.',
        tesoureiro: 'Taxation: Gain 2 coins; all other players pay 1 coin to the bank. Can be blocked by the Duke',
        vigilante: 'Revenge: Choose a player who used an offensive action against you since your last turn. They must pay you 2 coins. If they cannot, they reveal one of their influences and keep it revealed in the cemetery until it is exchanged.',
        pistoleiro: 'Bounty: Pay 2 coins and choose a target. Another player may pay 2 coins to make the target lose 1 influence. Can be blocked by the Sheriff.',
        magnata: 'Bribe: Exchange one of your cards with the deck. You may pay X coins to draw X extra cards, choose one, and return the rest to the deck.',
        estrategista: 'Maneuver: Receive 2 coins and exchange one of your cards with another player.',
        ladrao: 'Robbery: Take 1 coin from each player. Other Thieves block the robbery against themselves.',
        vigarista: 'Risky Fortune: Double your coins (max. 5). If challenged and you lose, give all your coins to the challenger.',
        xerife: 'Wanted: Pay 1 coin and choose a player. Until your next turn, offensive abilities used by them that cost coins cost 2 additional coins. Blocks Bounty against any player including you.'
      }
    }
  };

  const GUIDE_PAGE_STYLES = {
    characters: { titleSize: 9, nameSize: 3.8, bodySize: 3.6, portraitSize: 15, listGap: 1.2, contentWidth: 100, listOffset: 0 },
    actions: { titleSize: 9, nameSize: 3.8, bodySize: 3.6, portraitSize: 15, turnIntroSize: 4, turnActionSize: 4.6, turnWarningSize: 4.8, listGap: 3.2, contentWidth: 90, listOffset: 1.5 },
    promo: { titleSize: 9, nameSize: 3.8, bodySize: 3.65, portraitSize: 15, listGap: 2, contentWidth: 100, listOffset: 0 },
    revolution: { titleSize: 9, nameSize: 3.6, bodySize: 3.15, portraitSize: 15, listGap: 2, contentWidth: 100, listOffset: 0 },
    dlc2: { titleSize: 9, nameSize: 3.8, bodySize: 3.6, portraitSize: 15, listGap: 2, contentWidth: 100, listOffset: 0 }
  };

  const GUIDE_PAGE_ORDER = ['characters', 'promo', 'revolution', 'dlc2', 'actions'];
  const SHOW_REMOVED_GUIDE_CARDS = true;
  const CENTER_REMAINING_GUIDE_CARDS = true;

  function t(key, params = {}, fallback = '') {
    const translated = root.CoupLanguage?.t?.(key, params);
    return translated && translated !== key ? translated : fallback || key;
  }

  const ALTERNATIVE_RULES = [
    {
      id: 'justica-lenta',
      title: 'Justiça Lenta',
      description: 'Golpes de Estado só podem ser dados com 10 moedas, em vez de 7. O Golpe de Estado passa a ser obrigatório com 15 moedas.'
    },
    {
      id: 'falso-duque',
      title: 'Falso Duque',
      description: 'Haverá apenas 1 Duque no baralho.'
    },
    {
      id: 'assassino-declarado',
      title: 'Assassino Declarado',
      description: 'Para o Assassinato ter sucesso, o Assassino deve adivinhar a última influência do alvo. Se errar, perde as moedas e o alvo compra uma nova carta.'
    },
    {
      id: 'sangue-frio',
      title: 'Sangue Frio',
      description: 'Após um Assassinato bem-sucedido, o Assassino ganha 2 moedas de recompensa.'
    },
    {
      id: 'ladrao-de-tumulos',
      title: 'Ladrão de Túmulos',
      description: 'Você pode pagar 4 moedas para trocar uma carta da mão com uma carta revelada na mesa.'
    },
    {
      id: 'ultima-palavra',
      title: 'Última Palavra',
      description: 'Quando for eliminado, você pode escolher um jogador para perder 2 moedas imediatamente.'
    },
    {
      id: 'recompensa',
      title: 'Recompensa',
      description: 'Elimine um jogador com mais de 7 moedas e ganhe 2 moedas de recompensa. Vale para Golpe de Estado, contestação, Assassinato ou Execução Bruta.'
    },
    {
      id: 'espolio',
      title: 'Espólio',
      description: 'Quando alguém é eliminado, suas moedas são divididas entre os jogadores restantes em partes iguais. Se sobrar, a sobra volta para o banco.'
    },
    {
      id: 'votos-do-senado',
      title: 'Votos do Senado',
      description: 'Golpes de Estado precisam de aprovação da maioria dos jogadores vivos.'
    },
    {
      id: 'mercado-negro',
      title: 'Mercado Negro',
      description: 'Você pode pagar 2 moedas para trocar uma carta da mão com uma carta do baralho.'
    },
    {
      id: 'golpe-magno',
      title: 'Golpe Magno',
      description: 'Quando um jogador atingir 15 moedas, todos perdem 1 influência.'
    },
    {
      id: 'soberania-absoluta',
      title: 'Soberania Absoluta',
      description: 'Se possuir 2 Condessas, você pode bloquear qualquer ação contra si. Pode blefar, mas se for contestado e mentir, será eliminado. Se provar, deve trocar ambas as cartas.'
    },
    {
      id: 'contrabando',
      title: 'Contrabando',
      description: 'Você pode sacrificar uma influência sua para ganhar 10 moedas automaticamente.'
    },
    {
      id: 'panico-economico',
      title: 'Pânico Econômico',
      description: 'Quando alguém acumular mais de 8 moedas, todos os jogadores recebem 1 moeda automaticamente.'
    },
    {
      id: 'camara',
      title: 'Câmara',
      description: 'Todos recebem 4 influências. Cada jogador escolhe 2 influências para ficar e devolve 2 para o baralho.'
    },
    {
      id: 'corrupcao',
      title: 'Corrupção',
      description: 'No início do jogo, receba 2 cartas e selecione 1 para manter e 1 para descartar. Em seguida, sua segunda carta será sorteada aleatoriamente.'
    },
    {
      id: 'o-trio-falso',
      title: 'O Trio Falso',
      description: 'Em vez de começar com 2 cartas, cada jogador começa com 3 cartas, porém continua tendo apenas 2 vidas.'
    },
    {
      id: 'figura-publica',
      title: 'Figura Pública',
      description: 'Um personagem é revelado na mesa. Só existirá esse personagem no jogo, e o uso dele é público: todos podem usar.'
    },
    {
      id: 'chantagem',
      title: 'Chantagem',
      description: 'Ao gastar 7 moedas, você pode roubar uma influência de outro jogador e ficar com ela. Você deve entregar uma de suas cartas para esse jogador. Pode ser bloqueada por Embaixador, Inquisidor ou Bufão.'
    },
    {
      id: 'imprensa',
      title: 'Imprensa',
      description: 'Gaste 4 moedas para revelar a todos uma carta de outro jogador à sua escolha. O jogador afetado ganha 2 moedas.'
    },
    {
      id: 'favor-da-coroa',
      title: 'Favor da Coroa',
      description: 'Quando for alvo de uma ação, você pode pagar 3 moedas para bloqueá-la. Não bloqueia Golpe de Estado.'
    },
    {
      id: 'inversao-de-poder',
      title: 'Inversão de Poder',
      description: 'Pague 3 moedas e mude a direção dos turnos.'
    },
    {
      id: 'espionagem',
      title: 'Espionagem',
      description: 'Uma vez por turno, você pode pagar 2 moedas para olhar secretamente uma influência de qualquer jogador.'
    },
    {
      id: 'sorte-do-destino',
      title: 'Sorte do Destino',
      description: 'Sempre que um jogador perder uma influência, ele compra uma carta do topo do baralho. Pode ficar com ela ou devolvê-la ao fundo do baralho.'
    },
    {
      id: 'conselho-de-emergencia',
      title: 'Conselho de Emergência',
      description: 'Quando um jogador atingir 10 moedas, todos os jogadores vivos recebem 2 moedas.'
    },
    {
      id: 'herdeiro-do-trono',
      title: 'Herdeiro do Trono',
      description: 'Quando um jogador for eliminado, o responsável pela eliminação recebe imediatamente 3 moedas.'
    },
    {
      id: 'golpe-declarado',
      title: 'Golpe Declarado',
      description: 'Para o Golpe de Estado ter sucesso, o jogador deve adivinhar a última influência do alvo. Se errar, perde as moedas e o alvo compra uma nova carta.'
    }
  ];

  let config = {};
  let currentGuidePages = [];
  let currentAltRulePages = [];
  let currentRuleIndex = 0;
  let currentAltIndex = 0;
  let selectedRuleDrawCount = 1;
  let lastRenderedDrawId = null;
  let ruleDrawAnimationTimer = null;
  let ruleDrawTickTimer = null;

  function getElement(id) {
    return document.getElementById(id);
  }

  function getDeckConfig() {
    return config.getDeckConfig?.() || {};
  }

  function getState() {
    return config.getState?.() || {};
  }

  function getRoomCode() {
    return config.getRoomCode?.() || root.roomCode || null;
  }

  function getDatabase() {
    return config.getDatabase?.() || root.db || null;
  }

  function getIsAdmin() {
    return Boolean(config.isAdmin?.());
  }

  function isRankedMode() {
    return Boolean(config.isRankedMode?.());
  }

  function playSound(soundId) {
    const handler = config.playSound || root.playSound;
    if (typeof handler === 'function') handler(soundId);
  }

  function showError(message) {
    const handler = config.showError || root.showError;
    if (typeof handler === 'function') {
      handler(message);
      return;
    }

    alert(message);
  }

  function clampRuleCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return RULE_DRAW_MIN;
    return Math.max(RULE_DRAW_MIN, Math.min(RULE_DRAW_MAX, Math.round(number)));
  }

  function getRuleById(ruleId) {
    return ALTERNATIVE_RULES.find((rule) => rule.id === ruleId) || null;
  }

  function pickRandomRules(count) {
    const availableRules = [...ALTERNATIVE_RULES];
    const selectedRules = [];
    const targetCount = clampRuleCount(count);

    while (selectedRules.length < targetCount && availableRules.length > 0) {
      const index = Math.floor(Math.random() * availableRules.length);
      selectedRules.push(availableRules.splice(index, 1)[0]);
    }

    return selectedRules;
  }

  function getResolvedDeckConfig(deckConfig = getDeckConfig()) {
    if (deckConfig && Object.keys(deckConfig).length > 0) return deckConfig;
    if (typeof root.createDefaultDeckConfig === 'function') return root.createDefaultDeckConfig();
    return {};
  }

  function getGuideLanguage() {
    const language = root.CoupLanguage?.getLanguage?.() || document.documentElement.lang || 'pt';
    return String(language).toLowerCase().startsWith('en') ? 'en' : 'pt';
  }

  function getGuideCopy() {
    return GUIDE_COPY[getGuideLanguage()] || GUIDE_COPY.pt;
  }

  function getAlternativeRuleCopy() {
    return ALT_RULE_COPY[getGuideLanguage()] || ALT_RULE_COPY.pt;
  }

  function getAlternativeRuleText(ruleOrId) {
    const ruleId = typeof ruleOrId === 'string' ? ruleOrId : ruleOrId?.id;
    const fallbackRule = typeof ruleOrId === 'string' ? getRuleById(ruleOrId) : ruleOrId;
    const localizedRule = getAlternativeRuleCopy().rules[ruleId] || ALT_RULE_COPY.pt.rules[ruleId] || fallbackRule || {};

    return {
      id: ruleId,
      title: localizedRule.title || fallbackRule?.title || ruleId,
      description: localizedRule.description || fallbackRule?.description || ''
    };
  }

  function hasCard(deckConfig, cardType) {
    return (getResolvedDeckConfig(deckConfig)[cardType] || 0) > 0;
  }

  function hasAnyCard(deckConfig, cardTypes) {
    return cardTypes.some((cardType) => hasCard(deckConfig, cardType));
  }

  function getCardName(cardType) {
    const language = getGuideLanguage();
    return CARD_META[cardType]?.[language] || CARD_META[cardType]?.pt || cardType;
  }

  function getCardPortrait(cardType) {
    const meta = CARD_META[cardType];
    return meta ? `assets/img/perfil-cards/${meta.folder}/${cardType}.png` : '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function formatStyleNumber(value, digits = 2) {
    return Number(value)
      .toFixed(digits)
      .replace(/\.?0+$/, '');
  }

  function getAlternativeRulePageStyle(pageIndex) {
    return ALT_RULE_PAGE_STYLES[pageIndex] || ALT_RULE_PAGE_STYLES[0];
  }

  function getAlternativeRuleStyleAttr(pageIndex) {
    const style = getAlternativeRulePageStyle(pageIndex);

    return [
      `--alt-guide-title-size: ${formatStyleNumber(style.titleSize)}cqw`,
      `--alt-guide-rule-size: ${formatStyleNumber(style.ruleSize)}cqw`,
      '--alt-guide-title-intro-gap: 4cqw',
      '--alt-guide-header-list-gap: 2.1cqw',
      `--alt-guide-rule-gap: ${formatStyleNumber(style.ruleGap, 1)}%`,
      `--alt-guide-rule-block-width: ${formatStyleNumber(style.blockWidth, 1)}%`,
      `--alt-guide-rule-block-offset: ${formatStyleNumber(style.blockOffset, 1)}%`
    ].join('; ');
  }

  function renderFormattedGuideText(value, color) {
    const labelColor = escapeHtml(color || '#111111');
    let html = escapeHtml(value).replace(/\n/g, '<br>');

    ABILITY_LABELS
      .slice()
      .sort((a, b) => b.length - a.length)
      .forEach((label) => {
        const escapedLabel = escapeHtml(label);
        const pattern = new RegExp(`(^|[\\s(])(${escapeRegExp(escapedLabel)}:)`, 'g');
        html = html.replace(
          pattern,
          `$1<span class="ability-label" style="color: ${labelColor}; text-transform: none !important; font-variant: normal !important; font-variant-caps: normal !important;">$2</span>`
        );
      });

    return html;
  }

  function resolveGuideAction(action, ...args) {
    return typeof action === 'function' ? action(...args) : action;
  }

  function formatGuideList(cardTypes, options = {}) {
    const language = getGuideLanguage();
    const connector = options.connector || (language === 'en' ? 'or' : 'ou');
    const names = cardTypes.map(getCardName);

    if (names.length <= 1) return names[0] || '';
    if (names.length === 2) return `${names[0]} ${connector} ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} ${connector} ${names[names.length - 1]}`;
  }

  function formatAssassinBlockers(deckConfig) {
    const language = getGuideLanguage();
    const blockers = [];

    if (hasCard(deckConfig, 'condessa')) blockers.push(language === 'en' ? 'the Contessa' : 'pela Condessa');
    if (hasCard(deckConfig, 'diplomata')) blockers.push(language === 'en' ? 'the Diplomat' : 'pelo Diplomata');

    if (blockers.length <= 1) return blockers[0] || '';
    return language === 'en'
      ? `${blockers.slice(0, -1).join(', ')} or ${blockers[blockers.length - 1]}`
      : `${blockers.slice(0, -1).join(', ')} ou ${blockers[blockers.length - 1]}`;
  }

  function getGuidePageStyle(pageType) {
    return GUIDE_PAGE_STYLES[pageType] || GUIDE_PAGE_STYLES.characters;
  }

  function getDynamicGuideStyleAttr(pageType) {
    const style = getGuidePageStyle(pageType);
    return [
      `--guide-title-size: ${style.titleSize}cqw`,
      `--guide-name-size: ${style.nameSize}cqw`,
      `--guide-body-size: ${style.bodySize}cqw`,
      `--guide-portrait-size: ${style.portraitSize}%`,
      `--guide-list-gap: ${style.listGap}%`,
      `--guide-content-width: ${style.contentWidth}%`,
      `--guide-list-offset: ${style.listOffset}%`,
      `--guide-turn-intro-size: ${style.turnIntroSize || style.bodySize}cqw`,
      `--guide-turn-action-size: ${style.turnActionSize || style.bodySize}cqw`,
      `--guide-turn-warning-size: ${style.turnWarningSize || style.bodySize}cqw`
    ].join('; ');
  }

  function createDynamicGuideEntry(deckConfig, cardType, text) {
    return {
      cardType,
      name: getCardName(cardType),
      image: getCardPortrait(cardType),
      color: CARD_META[cardType]?.color || '#111111',
      text,
      muted: !hasCard(deckConfig, cardType)
    };
  }

  function buildBaseGuideEntries(deckConfig, copy) {
    const extortionBlockers = CARD_GROUPS.base
      .concat(['bufao'])
      .filter((cardType) => ['capitao', 'embaixador', 'inquisidor', 'bufao'].includes(cardType) && hasCard(deckConfig, cardType));
    const foreignAidBlockers = ['duque', 'burocrata'].filter((cardType) => hasCard(deckConfig, cardType));
    const hasBishop = hasCard(deckConfig, 'bispo');
    const hasTreasurer = hasCard(deckConfig, 'tesoureiro');

    return [
      createDynamicGuideEntry(deckConfig, 'duque', resolveGuideAction(copy.actions.duke, hasTreasurer)),
      createDynamicGuideEntry(deckConfig, 'capitao', resolveGuideAction(copy.actions.captain, formatGuideList(extortionBlockers))),
      createDynamicGuideEntry(deckConfig, 'assassino', resolveGuideAction(copy.actions.assassin, formatAssassinBlockers(deckConfig))),
      createDynamicGuideEntry(deckConfig, 'condessa', copy.actions.contessa),
      createDynamicGuideEntry(deckConfig, 'embaixador', resolveGuideAction(copy.actions.ambassador, hasBishop)),
      createDynamicGuideEntry(deckConfig, 'inquisidor', resolveGuideAction(copy.actions.inquisitor, hasBishop))
    ];
  }

  function buildActionGuideEntries(deckConfig, copy) {
    const foreignAidBlockers = ['duque', 'burocrata'].filter((cardType) => hasCard(deckConfig, cardType));

    return [
      { label: copy.actions.income, color: '#111111' },
      { label: resolveGuideAction(copy.actions.foreignAid, formatGuideList(foreignAidBlockers)), color: '#111111' },
      { label: copy.actions.coup, color: '#111111' },
      { label: copy.actions.characterAction, color: '#111111' }
    ];
  }

  function buildGroupGuideEntries(deckConfig, copy, cardTypes) {
    return cardTypes.map((cardType) => createDynamicGuideEntry(deckConfig, cardType, copy.actions[cardType]));
  }

  function prepareDynamicGuidePage(page) {
    if (!page.entries) return page;

    const allEntries = page.entries;
    const visibleEntries = SHOW_REMOVED_GUIDE_CARDS
      ? allEntries
      : allEntries.filter((entry) => !entry.muted);
    const mutedEntries = allEntries.filter((entry) => entry.muted).length;

    return {
      ...page,
      entries: visibleEntries,
      hasHiddenEntries: mutedEntries > 0
    };
  }

  function buildDynamicGuidePageByType(pageType, deckConfig = getDeckConfig()) {
    const resolvedDeckConfig = getResolvedDeckConfig(deckConfig);
    const copy = getGuideCopy();
    const title = copy.titles[pageType] || copy.titles.characters;

    if (pageType === 'actions') {
      return {
        type: pageType,
        title: copy.titles.backActions,
        intro: copy.actions.turnIntro,
        actions: buildActionGuideEntries(resolvedDeckConfig, copy),
        warning: copy.actions.coinPressure
      };
    }

    if (pageType === 'characters') {
      return prepareDynamicGuidePage({
        type: pageType,
        title,
        entries: buildBaseGuideEntries(resolvedDeckConfig, copy)
      });
    }

    const groups = {
      promo: CARD_GROUPS.promo,
      revolution: CARD_GROUPS.dlc1,
      dlc2: CARD_GROUPS.dlc2
    };

    return prepareDynamicGuidePage({
      type: pageType,
      title,
      entries: buildGroupGuideEntries(resolvedDeckConfig, copy, groups[pageType] || [])
    });
  }

  function buildDynamicGuidePages(deckConfig = getDeckConfig()) {
    const resolvedDeckConfig = getResolvedDeckConfig(deckConfig);
    const pages = [];

    GUIDE_PAGE_ORDER.forEach((pageType) => {
      if (pageType === 'actions') return;
      if (pageType === 'promo' && !hasAnyCard(resolvedDeckConfig, CARD_GROUPS.promo)) return;
      if (pageType === 'revolution' && !hasAnyCard(resolvedDeckConfig, CARD_GROUPS.dlc1)) return;
      if (pageType === 'dlc2' && !hasAnyCard(resolvedDeckConfig, CARD_GROUPS.dlc2)) return;

      const page = buildDynamicGuidePageByType(pageType, resolvedDeckConfig);
      if (page.entries?.length > 0) pages.push(page);
    });

    pages.push(buildDynamicGuidePageByType('actions', resolvedDeckConfig));
    return pages;
  }

  function renderDynamicGuideEntry(entry) {
    const color = escapeHtml(entry.color);
    const mutedClass = entry.muted ? ' is-muted' : '';

    return `
      <section class="guide-entry${mutedClass}" style="--role-color: ${color};">
        <img class="guide-portrait" src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.name)}">
        <div class="guide-copy">
          <h3>${escapeHtml(entry.name)}</h3>
          <p>${renderFormattedGuideText(entry.text, entry.color)}</p>
        </div>
      </section>
    `;
  }

  function renderDynamicAction(action) {
    return `
      <p class="guide-turn-action" style="--role-color: ${escapeHtml(action.color)};">
        ${renderFormattedGuideText(action.label, action.color)}
      </p>
    `;
  }

  function renderDynamicGuidePage(page) {
    const preparedPage = prepareDynamicGuidePage(page);
    const isTurnSummary = preparedPage.type === 'actions';
    const centeredClass = CENTER_REMAINING_GUIDE_CARDS && preparedPage.hasHiddenEntries
      ? ' removed-layout-centered'
      : ' removed-layout-distributed';
    const classes = `guide-page ${isTurnSummary ? 'turn-summary' : 'character-summary'}${centeredClass}`;

    if (isTurnSummary) {
      return `
        <article class="${classes}" style="${getDynamicGuideStyleAttr(preparedPage.type)}">
          <div class="guide-inner">
            <h2 class="guide-title">${escapeHtml(preparedPage.title)}</h2>
            <p class="guide-intro">${escapeHtml(preparedPage.intro)}</p>
            <div class="guide-turn-list">
              ${(preparedPage.actions || []).map(renderDynamicAction).join('')}
            </div>
            <p class="guide-turn-warning">${escapeHtml(preparedPage.warning)}</p>
          </div>
        </article>
      `;
    }

    return `
      <article class="${classes}" style="${getDynamicGuideStyleAttr(preparedPage.type)}">
        <div class="guide-inner">
          <h2 class="guide-title">${escapeHtml(preparedPage.title)}</h2>
          <div class="guide-list">
            ${(preparedPage.entries || []).map(renderDynamicGuideEntry).join('')}
          </div>
        </div>
      </article>
    `;
  }

  function getFlipFaces(flipCard) {
    return {
      frontFace: flipCard?.querySelector('.flip-card-front') || null,
      backFace: flipCard?.querySelector('.flip-card-back') || null
    };
  }

  function resetDynamicGuideFlipCard(flipCard, pages) {
    if (!flipCard || pages.length === 0) return;

    const { frontFace, backFace } = getFlipFaces(flipCard);

    flipCard.classList.remove('is-flipped');
    if (frontFace) frontFace.innerHTML = renderDynamicGuidePage(pages[0]);
    if (backFace) backFace.innerHTML = renderDynamicGuidePage(pages.length > 1 ? pages[1] : pages[0]);
  }

  function advanceDynamicGuideFlipCard(flipCard, pages, currentIndex, onIndexChange) {
    if (!flipCard || pages.length === 0) return;

    playSound('card-slide');
    flipCard.classList.toggle('is-flipped');

    const nextCurrentIndex = (currentIndex + 1) % pages.length;
    onIndexChange(nextCurrentIndex);

    setTimeout(() => {
      const { frontFace, backFace } = getFlipFaces(flipCard);
      const nextPageIndex = (nextCurrentIndex + 1) % pages.length;
      const nextMarkup = renderDynamicGuidePage(pages[nextPageIndex]);

      if (flipCard.classList.contains('is-flipped')) {
        if (frontFace) frontFace.innerHTML = nextMarkup;
      } else if (backFace) {
        backFace.innerHTML = nextMarkup;
      }
    }, 500);
  }

  function buildAlternativeRuleGuidePages() {
    return ALT_RULE_PAGE_IDS.map((ruleIds, pageIndex) => ({
      pageIndex,
      rules: ruleIds.map(getAlternativeRuleText)
    }));
  }

  function renderAlternativeRule(rule) {
    return `
      <p class="alternative-rule-entry">
        <strong>${escapeHtml(rule.title)}:</strong>
        ${escapeHtml(rule.description)}
      </p>
    `;
  }

  function renderAlternativeRuleGuidePage(page) {
    const copy = getAlternativeRuleCopy();
    const pageIndex = page?.pageIndex || 0;
    const intro = pageIndex === 0
      ? `<p class="alternative-rules-intro">${escapeHtml(copy.intro)}</p>`
      : '';

    return `
      <article class="alternative-rules-page" data-page="${pageIndex + 1}" style="${getAlternativeRuleStyleAttr(pageIndex)}">
        <div class="alternative-rules-inner">
          <header class="alternative-rules-header">
            <h2 class="alternative-rules-title">${escapeHtml(copy.title)}</h2>
            ${intro}
          </header>
          <div class="alternative-rule-list">
            ${(page?.rules || []).map(renderAlternativeRule).join('')}
          </div>
        </div>
      </article>
    `;
  }

  function resetAlternativeRuleFlipCard(flipCard, pages) {
    if (!flipCard || pages.length === 0) return;

    const { frontFace, backFace } = getFlipFaces(flipCard);

    flipCard.classList.remove('is-flipped');
    if (frontFace) frontFace.innerHTML = renderAlternativeRuleGuidePage(pages[0]);
    if (backFace) backFace.innerHTML = renderAlternativeRuleGuidePage(pages.length > 1 ? pages[1] : pages[0]);
  }

  function advanceAlternativeRuleFlipCard(flipCard, pages, currentIndex, onIndexChange) {
    if (!flipCard || pages.length === 0) return;

    playSound('card-slide');
    flipCard.classList.toggle('is-flipped');

    const nextCurrentIndex = (currentIndex + 1) % pages.length;
    onIndexChange(nextCurrentIndex);

    setTimeout(() => {
      const { frontFace, backFace } = getFlipFaces(flipCard);
      const nextPageIndex = (nextCurrentIndex + 1) % pages.length;
      const nextMarkup = renderAlternativeRuleGuidePage(pages[nextPageIndex]);

      if (flipCard.classList.contains('is-flipped')) {
        if (frontFace) frontFace.innerHTML = nextMarkup;
      } else if (backFace) {
        backFace.innerHTML = nextMarkup;
      }
    }, 500);
  }

  function getCharacterFlipCard(infoModal) {
    return infoModal?.querySelector('.flip-card') || document.querySelector('.flip-card');
  }

  function bindCharacterGuides() {
    const characterActionsBtn = getElement('characterActionsBtn') || getElement('infoBtn');
    const infoModal = getElement('infoModal');
    const closeInfoBtn = getElement('closeModalBtn');

    if (!characterActionsBtn || !infoModal) return;

    characterActionsBtn.onclick = () => {
      const flipCard = getCharacterFlipCard(infoModal);

      playSound('click');
      currentGuidePages = buildDynamicGuidePages();
      currentRuleIndex = 0;
      root.CoupModal?.open(infoModal);
      resetDynamicGuideFlipCard(flipCard, currentGuidePages);
    };

    if (closeInfoBtn) {
      closeInfoBtn.onclick = () => {
        playSound('click');
        root.CoupModal?.close(infoModal);
      };
    }

    const flipCard = getCharacterFlipCard(infoModal);
    if (flipCard) {
      flipCard.onclick = () => {
        if (currentGuidePages.length === 0) {
          currentGuidePages = buildDynamicGuidePages();
        }

        advanceDynamicGuideFlipCard(flipCard, currentGuidePages, currentRuleIndex, (nextIndex) => {
          currentRuleIndex = nextIndex;
        });
      };
    }
  }

  function stopRuleDrawAnimation() {
    if (ruleDrawAnimationTimer) {
      clearTimeout(ruleDrawAnimationTimer);
      ruleDrawAnimationTimer = null;
    }

    if (ruleDrawTickTimer) {
      clearInterval(ruleDrawTickTimer);
      ruleDrawTickTimer = null;
    }
  }

  function getRuleDrawElements() {
    return {
      button: getElement('ruleDrawBtn'),
      modal: getElement('ruleDrawModal'),
      closeButton: getElement('closeRuleDrawBtn'),
      setup: getElement('ruleDrawSetup'),
      intro: getElement('ruleDrawIntro'),
      startButton: getElement('startRuleDrawBtn'),
      animation: getElement('ruleDrawAnimation'),
      rollingTitle: getElement('ruleDrawRollingTitle'),
      results: getElement('ruleDrawResults'),
      countButtons: Array.from(document.querySelectorAll('.rule-draw-count-btn'))
    };
  }

  function setSelectedRuleDrawCount(count) {
    selectedRuleDrawCount = clampRuleCount(count);
    getRuleDrawElements().countButtons.forEach((button) => {
      const isSelected = Number(button.dataset.ruleCount) === selectedRuleDrawCount;
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
    });
  }

  function createRuleResultCard(rule, index) {
    const localizedRule = getAlternativeRuleText(rule);
    const card = document.createElement('article');
    card.className = 'rule-draw-result-card';

    const number = document.createElement('span');
    number.className = 'rule-draw-result-number';
    number.textContent = String(index + 1).padStart(2, '0');

    const title = document.createElement('h3');
    title.textContent = localizedRule.title;

    const description = document.createElement('p');
    description.textContent = localizedRule.description;

    card.append(number, title, description);
    return card;
  }

  function renderRuleDrawResults(drawData) {
    const { results, animation } = getRuleDrawElements();
    if (!results) return;

    if (animation) {
      animation.hidden = true;
      animation.classList.remove('is-spinning');
    }

    results.innerHTML = '';
    const ruleIds = Array.isArray(drawData?.ruleIds) ? drawData.ruleIds : [];
    const rules = ruleIds.map(getRuleById).filter(Boolean);

    if (rules.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'rule-draw-empty';
      empty.textContent = 'Nenhum sorteio realizado nesta sala.';
      results.appendChild(empty);
      return;
    }

    const heading = document.createElement('p');
    heading.className = 'rule-draw-result-heading';
    heading.textContent = 'Regras sorteadas para esta partida';
    results.appendChild(heading);

    rules.forEach((rule, index) => {
      results.appendChild(createRuleResultCard(rule, index));
    });
  }

  function runRuleDrawAnimation(drawData) {
    const { modal, animation, rollingTitle, results } = getRuleDrawElements();
    const rules = Array.isArray(drawData?.ruleIds)
      ? drawData.ruleIds.map(getRuleById).filter(Boolean)
      : [];

    stopRuleDrawAnimation();
    if (!modal || !animation || !rollingTitle || rules.length === 0) {
      renderRuleDrawResults(drawData);
      return;
    }

    playSound('challenge-suspensful');
    root.CoupModal?.open(modal);
    animation.hidden = false;
    animation.classList.add('is-spinning');
    if (results) results.innerHTML = '';

    let tick = 0;
    ruleDrawTickTimer = setInterval(() => {
      const rollingRule = ALTERNATIVE_RULES[tick % ALTERNATIVE_RULES.length];
      rollingTitle.textContent = getAlternativeRuleText(rollingRule).title;
      tick += 1;
    }, RULE_DRAW_TICK_MS);

    ruleDrawAnimationTimer = setTimeout(() => {
      stopRuleDrawAnimation();
      playSound('conquest');
      renderRuleDrawResults(drawData);
    }, RULE_DRAW_ANIMATION_MS);
  }

  function publishRuleDraw() {
    if (!getIsAdmin()) {
      showError('Apenas o Host pode sortear regras alternativas.');
      return;
    }

    if (isRankedMode()) {
      showError('O sorteador de regras alternativas fica disponivel apenas no modo casual.');
      return;
    }

    const db = getDatabase();
    const roomCode = getRoomCode();
    if (!db || !roomCode) {
      showError('Nao foi possivel sincronizar o sorteio da sala.');
      return;
    }

    const selectedRules = pickRandomRules(selectedRuleDrawCount);
    const timestamp = Date.now();
    const drawData = {
      id: `${timestamp}-${Math.random().toString(16).slice(2)}`,
      ruleIds: selectedRules.map((rule) => rule.id),
      count: selectedRules.length,
      by: config.getCurrentUser?.()?.name || 'Host',
      timestamp
    };

    playSound('pop');
    db.ref(`salas/${roomCode}/lastActivity`).set(timestamp);
    db.ref(`salas/${roomCode}/gameState/alternativeRuleDraw`).set(drawData)
      .catch((error) => {
        console.error('Erro ao sortear regras alternativas:', error);
        showError('Nao foi possivel sortear regras alternativas.');
      });
  }

  function openRuleDrawModal() {
    const { modal } = getRuleDrawElements();
    if (!modal) return;

    playSound('click');
    renderRuleDrawControls();
    renderRuleDrawResults(getState().alternativeRuleDraw);
    root.CoupModal?.open(modal);
  }

  function closeRuleDrawModal() {
    stopRuleDrawAnimation();
    playSound('click');
    root.CoupModal?.close('ruleDrawModal');
  }

  function renderRuleDrawControls() {
    const { button, setup, intro, startButton } = getRuleDrawElements();
    const canDraw = getIsAdmin() && !isRankedMode();

    if (button) button.style.display = canDraw && RULE_DRAW_BUTTON_ENABLED ? 'inline-flex' : 'none';
    if (setup) setup.style.display = canDraw ? 'grid' : 'none';
    if (startButton) startButton.disabled = !canDraw;
    if (intro) {
      intro.textContent = canDraw
        ? t('casual.ruleDrawIntro', {}, 'Escolha até 5 regras alternativas para uma partida mais imprevisível. O resultado aparece para todos os jogadores.')
        : t('casual.hostCanDrawRules', {}, 'O Host pode sortear regras alternativas para diversificar a partida.');
    }
  }

  function renderAlternativeRuleDraw(options = {}) {
    if (typeof options.isAdmin === 'boolean') {
      config.isAdmin = () => options.isAdmin;
    }

    renderRuleDrawControls();

    const drawData = options.state?.alternativeRuleDraw || getState().alternativeRuleDraw;
    if (!drawData?.id || drawData.id === lastRenderedDrawId) return;

    lastRenderedDrawId = drawData.id;
    runRuleDrawAnimation(drawData);
  }

  function bindRuleDraw() {
    const {
      button,
      closeButton,
      startButton,
      countButtons
    } = getRuleDrawElements();

    if (button && button.dataset.ruleDrawBound !== 'true') {
      button.dataset.ruleDrawBound = 'true';
      button.addEventListener('click', openRuleDrawModal);
    }

    if (closeButton && closeButton.dataset.ruleDrawBound !== 'true') {
      closeButton.dataset.ruleDrawBound = 'true';
      closeButton.addEventListener('click', closeRuleDrawModal);
    }

    if (startButton && startButton.dataset.ruleDrawBound !== 'true') {
      startButton.dataset.ruleDrawBound = 'true';
      startButton.addEventListener('click', publishRuleDraw);
    }

    countButtons.forEach((button) => {
      if (button.dataset.ruleDrawBound === 'true') return;
      button.dataset.ruleDrawBound = 'true';
      button.addEventListener('click', () => {
        playSound('pop');
        setSelectedRuleDrawCount(button.dataset.ruleCount);
      });
    });

    setSelectedRuleDrawCount(selectedRuleDrawCount);
    renderRuleDrawControls();
  }

  function bindAlternativeRules() {
    const altRulesBtn = getElement('altRulesBtn');
    const altRulesModal = getElement('altRulesModal');
    const closeAltRulesBtn = getElement('closeAltRulesBtn');
    const altFlipCard = getElement('altRulesFlipCard');

    if (!altRulesBtn || !altRulesModal) return;

    altRulesBtn.onclick = () => {
      playSound('click');
      currentAltRulePages = buildAlternativeRuleGuidePages();
      currentAltIndex = 0;
      root.CoupModal?.open(altRulesModal);
      resetAlternativeRuleFlipCard(altFlipCard, currentAltRulePages);
    };

    if (closeAltRulesBtn) {
      closeAltRulesBtn.onclick = () => {
        playSound('click');
        root.CoupModal?.close(altRulesModal);
      };
    }

    if (altFlipCard) {
      altFlipCard.onclick = () => {
        if (currentAltRulePages.length === 0) {
          currentAltRulePages = buildAlternativeRuleGuidePages();
        }

        advanceAlternativeRuleFlipCard(altFlipCard, currentAltRulePages, currentAltIndex, (nextIndex) => {
          currentAltIndex = nextIndex;
        });
      };
    }
  }

  function setup(options = {}) {
    config = options;
    bindCharacterGuides();
    bindAlternativeRules();
    bindRuleDraw();
  }

  root.CoupRulesGuides = {
    setup,
    buildDynamicGuidePages,
    renderDynamicGuidePage,
    renderAlternativeRuleDraw
  };
})(window);
