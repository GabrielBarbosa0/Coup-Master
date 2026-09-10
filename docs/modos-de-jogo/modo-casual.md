# Coup Master - Modo Casual

Documento de design e regras de funcionamento para o **Modo Casual** do Coup Master, a mesa livre e sandbox do projeto.

Este modo representa a experiência mais próxima de uma mesa física: o sistema sincroniza cartas, moedas, chat, baralho, cemitério, asilo e efeitos visuais em tempo real, mas os próprios jogadores continuam responsáveis por declarar ações, resolver blefes, contestar, bloquear e aplicar as consequências combinadas.

## Sumário

- [1. Visão Geral](#1-visão-geral)
- [2. Objetivo do Modo](#2-objetivo-do-modo)
- [3. Diferença Para os Modos Automatizados](#3-diferença-para-os-modos-automatizados)
- [4. Entrada e Sala](#4-entrada-e-sala)
- [5. Papel do Host](#5-papel-do-host)
- [6. Jogadores, Slots e Reconexão](#6-jogadores-slots-e-reconexão)
- [7. Estado da Mesa](#7-estado-da-mesa)
- [8. Baralho, Variantes e DLCs](#8-baralho-variantes-e-dlcs)
- [9. Fluxo Manual da Partida](#9-fluxo-manual-da-partida)
- [10. Cartas, Cemitério e Baralho](#10-cartas-cemitério-e-baralho)
- [11. Asilo e Reforma](#11-asilo-e-reforma)
- [12. Sorteador de Regras Alternativas](#12-sorteador-de-regras-alternativas)
- [13. Chat, Espectador e Ações Rápidas](#13-chat-espectador-e-ações-rápidas)
- [14. Áudio, Modais e Feedback Visual](#14-áudio-modais-e-feedback-visual)
- [15. Controles de Compatibilidade](#15-controles-de-compatibilidade)
- [16. Limitações Atuais](#16-limitações-atuais)
- [17. Próximos Passos Recomendados](#17-próximos-passos-recomendados)

## 1. Visão Geral

O Modo Casual é a mesa livre do Coup Master.

Ele não tenta automatizar completamente as regras do jogo. Em vez disso, oferece uma superfície compartilhada onde os jogadores podem:

- criar ou entrar em uma sala por código;
- manipular cartas manualmente;
- ajustar moedas;
- configurar o baralho;
- usar cartas promocionais, expansões e variantes;
- conversar pelo chat;
- testar regras alternativas;
- jogar com até 8 slots;
- reproduzir uma experiência de mesa física em tempo real.

O sistema atua como tabuleiro digital sincronizado. A autoridade das regras ainda é social: os jogadores decidem se uma ação é válida, quem pode contestar, qual carta deve ser revelada e quando uma consequência deve ser aplicada.

## 2. Objetivo do Modo

O objetivo padrão é o mesmo de Coup: ser o último jogador com influências vivas.

No casual, porém, o objetivo pode variar conforme a mesa. Como o modo é sandbox, ele também serve para:

- jogar Coup clássico;
- testar expansões;
- testar cartas promocionais;
- simular regras criadas pelo projeto;
- gravar demonstrações;
- validar UX, áudio e animações;
- reproduzir situações específicas de partida.

O modo casual não gera pontuação ranqueada, vitórias oficiais, derrotas oficiais, conquistas ranqueadas ou histórico competitivo.

## 3. Diferença Para os Modos Automatizados

O casual é diferente do Modo Ranqueado e da Sala Personalizada.

### Modo Casual

- Usa `index.html`.
- Usa `salas/{roomCode}/gameState`.
- Permite login Google ou visitante anônimo.
- Suporta até 8 slots.
- Possui host com controles administrativos.
- Permite configurar o baralho.
- Permite mover cartas livremente.
- Não possui motor de turnos obrigatório.
- Não valida ações automaticamente.
- Não registra resultado competitivo.

### Modo Ranqueado

- Usa `ranked/ranked-waiting.html` e `ranked/ranked.html`.
- Usa `rankedState`.
- Exige conta Google.
- Suporta até 6 jogadores.
- Simula matchmaking com bots IA.
- Automatiza ações, bloqueios, contestações, perdas de influência e resultado.
- Pode registrar estatísticas ranqueadas beta.

### Sala Personalizada

- Usa `personalized/personalized-waiting.html` e `personalized/personalized.html`.
- Usa `personalizedState`.
- Exige conta Google.
- Suporta até 6 jogadores.
- É automatizada como o ranqueado, mas permite sala com amigos e bots.
- Não gera pontos ranqueados.

## 4. Entrada e Sala

O jogador acessa o casual pelo lobby.

Ao criar sala no modo casual, o lobby cria um registro em:

```text
salas/{roomCode}
```

O tabuleiro é aberto em:

```text
index.html?room={codigo}
```

Salas antigas sem campo `mode` são tratadas como casuais para preservar compatibilidade com versões anteriores.

### Código da sala

O código da sala é o principal identificador social do modo casual.

Ele pode ser usado para:

- entrar pela tela do lobby;
- compartilhar a sala com amigos;
- copiar rapidamente pelo tabuleiro;
- gerar QR Code no modal de compartilhamento.

## 5. Papel do Host

O host é o criador da sala e fica salvo em:

```text
salas/{roomCode}/hostUID
```

No casual, o host funciona como organizador da mesa.

### Permissões do host

O host pode:

- configurar o baralho;
- aplicar presets de deck;
- resetar a mesa;
- adicionar bots para teste;
- remover jogadores ou bots;
- controlar algumas opções administrativas;
- organizar a partida antes e durante o jogo.

### Restrições

O host não é uma autoridade segura por si só.

Como o projeto ainda usa validação majoritariamente client-side, permissões visuais de host não devem ser tratadas como segurança definitiva. A segurança real precisa ser reforçada nas Firebase Security Rules e, futuramente, em lógica autoritativa se o projeto exigir partidas competitivas confiáveis.

## 6. Jogadores, Slots e Reconexão

O casual suporta até 8 slots de jogador.

Cada slot pode conter:

- jogador Google;
- visitante anônimo;
- bot usado para teste;
- estado vazio aguardando jogador.

### Reconexão

O UID real do jogador é usado para tentar recolocar a pessoa no mesmo slot ao recarregar a página ou voltar para a sala.

Isso evita que o mesmo jogador ocupe múltiplos espaços após queda, reload ou troca temporária de tela.

### Responsividade

Em telas menores, a interface reduz a quantidade de slots visíveis conforme a ocupação real da sala, evitando que espaços vazios quebrem o layout ou criem scroll desnecessário.

## 7. Estado da Mesa

O estado principal do casual vive em:

```text
salas/{roomCode}/gameState
```

Esse estado guarda:

- `players`: jogadores, mãos, moedas, religião e metadados;
- `deck`: cartas ainda no baralho;
- `freeCards`: cartas no cemitério/área livre;
- `deckConfig`: composição configurada pelo host;
- `asylumScore`: moedas acumuladas no asilo;
- `alternativeRuleDraw`: último sorteio sincronizado de regras alternativas;
- `lastSFX`: último efeito sonoro sincronizado;
- dados auxiliares de chat, espectador, tutorial e interface.

### Invariantes importantes

Uma carta deve existir em apenas um lugar:

- `deck`;
- `freeCards`;
- `players[n].hand`.

Carta no deck:

```text
owner = null
visible = false
location = "deck"
```

Carta na mão:

```text
owner = pid
visible = false
location = "player-{pid}"
```

Carta no cemitério/free area:

```text
owner = null
visible = true
location = "free"
```

Moedas de jogador e moedas do asilo não devem ficar negativas.

## 8. Baralho, Variantes e DLCs

O casual é o modo com maior liberdade de composição de baralho.

Ele pode usar:

- cartas base;
- cartas promocionais;
- cartas de DLCs;
- Reforma;
- Inquisição;
- variações criadas para laboratório e testes de design.

### Configuração do baralho

O host pode abrir as configurações da sala e ajustar quantidades de cartas.

A composição é salva em `deckConfig`.

Presets ficam centralizados em:

```text
js/gamemode/casual/deck-presets.js
```

### Guias de regras

Os guias visuais de ações, personagens e regras alternativas são controlados por:

```text
js/gamemode/casual/rules-guides.js
```

O guia tenta detectar o baralho atual e exibir imagens de referência compatíveis com a configuração da mesa.

### Sorteio de regras alternativas

O host pode usar o sorteador de regras alternativas para diversificar a partida.

As regras disponíveis ficam documentadas em:

```text
docs/regras-alternativas.md
```

Esse sorteador fica na toolbar do tabuleiro casual e permite escolher de 1 a 5 regras. Quando o host confirma, o resultado é salvo em:

```text
salas/{roomCode}/gameState/alternativeRuleDraw
```

Todos os jogadores recebem o mesmo evento, veem uma animação de sorteio e depois visualizam:

- título de cada regra;
- descrição de como a regra funciona;
- quantidade sorteada;
- novo botão para o host sortear novamente.

O sorteador não aplica regras automaticamente. Ele apenas define um acordo de mesa para os jogadores seguirem manualmente.

## 9. Fluxo Manual da Partida

O casual não impõe uma máquina de estados oficial.

Um fluxo típico de mesa é:

1. host cria a sala;
2. jogadores entram pelo código;
3. host configura o deck;
4. jogadores compram suas cartas iniciais;
5. jogadores ajustam moedas iniciais;
6. mesa decide ordem de turno;
7. jogadores declaram ações por voz, chat ou acordo externo;
8. cartas e moedas são movidas manualmente;
9. cartas mortas são enviadas ao cemitério;
10. último jogador vivo vence.

O sistema não impede ações fora de turno, não força custo de moedas e não resolve contestação automaticamente.

Esse comportamento é intencional: ele preserva a flexibilidade de uma mesa livre.

## 10. Cartas, Cemitério e Baralho

As cartas podem ser manipuladas por clique, duplo clique, arraste e modais.

### Comprar cartas

O jogador pode comprar do baralho para sua mão.

Ao comprar, o estado da carta muda de `deck` para `players[n].hand`.

### Devolver cartas

Ao devolver uma carta ao baralho, a carta deve sair da mão ou área livre e voltar para `deck`, sem manter dono.

### Cemitério e área livre

O cemitério/free area guarda cartas reveladas, descartadas ou usadas como referência visual.

No casual, o cemitério também funciona como espaço de organização manual, já que o modo não diferencia rigidamente todos os tipos de descarte.

### Preview de carta

O clique direito ou ação equivalente pode abrir um preview ampliado da carta, sem alterar a lógica da partida.

O preview é controlado por:

```text
js/gamemode/casual/card-preview.js
```

## 11. Asilo e Reforma

O Asilo é usado principalmente para regras da expansão Reforma e variações do Coup Master.

Ele possui:

- imagem própria no centro da mesa;
- contador de moedas;
- botões de incremento e decremento;
- duplo clique para sacar moedas;
- tooltip contextual;
- integração com `updateAsylumScore` e `withdrawAsylumCoins`.

O controle visual e os handlers do asilo ficam em:

```text
js/gamemode/casual/asylum-controls.js
```

## 12. Sorteador de Regras Alternativas

O sorteador de regras alternativas existe para mesas que querem variar a experiência sem precisar escolher manualmente uma regra antes de começar.

### Permissões

Apenas o host pode iniciar um sorteio.

Jogadores que não são host veem o resultado quando um sorteio acontece, mas não podem disparar um novo sorteio.

### Quantidade

O host pode sortear:

- 1 regra;
- 2 regras;
- 3 regras.
- 4 regras;
- 5 regras.

As regras sorteadas não se repetem dentro do mesmo sorteio.

### Sincronização

O resultado é sincronizado no `gameState`.

Isso garante que todos os jogadores vejam:

- a mesma animação;
- o mesmo conjunto de regras;
- o mesmo texto de referência.

### Natureza sandbox

O sorteador não altera cartas, moedas, turnos, bloqueios ou permissões.

Como o casual é uma mesa livre, cabe aos jogadores aplicar as regras sorteadas durante a partida.

## 13. Chat, Espectador e Ações Rápidas

### Chat

O chat casual é sincronizado em tempo real e fica separado da lógica de cartas.

Ele permite comunicação básica da sala e alertas de novas mensagens.

Arquivo principal:

```text
js/gamemode/casual/chat-service.js
```

### Modo espectador

Jogadores eliminados ou sem cartas podem solicitar visão da mão de outro jogador.

Esse fluxo é visual e social. Ele não bloqueia tecnicamente ações fora da permissão, por isso não deve ser tratado como segurança forte.

Arquivo principal:

```text
js/gamemode/casual/spectator-service.js
```

### Ações rápidas

O casual possui atalhos para perfil rápido, estatísticas e pequenas ações auxiliares.

Arquivo principal:

```text
js/gamemode/casual/quick-actions.js
```

## 14. Áudio, Modais e Feedback Visual

O casual possui camada própria de áudio e feedback.

### Áudio

O áudio casual controla:

- música de fundo;
- volume local;
- efeitos sonoros;
- sincronização de SFX entre jogadores;
- sons de compra, shuffle, moedas, impacto e interações.

Arquivo principal:

```text
js/gamemode/casual/audio-service.js
```

### Modais

Modais comuns são padronizados por:

```text
js/gamemode/casual/modal-service.js
```

Esse serviço evita que cada funcionalidade recrie sua própria abertura, fechamento e consulta de modal.

### Efeitos visuais

Efeitos de cartas, leques, tilt e destaque visual ficam concentrados em:

```text
js/gamemode/casual/visual-effects.js
```

Esse módulo é uma área sensível porque pequenos ajustes de CSS/transform podem afetar arraste, hover, preview, cemitério e responsividade.

## 15. Controles de Compatibilidade

O casual mantém suporte a duas formas principais de arraste:

- drag/drop legado HTML5;
- fallback por Pointer Events para melhorar uso em touch e compatibilidade.

O modo de compatibilidade fica nas configurações locais do casual e tende a ser mais previsível em dispositivos móveis.

Arquivos relacionados:

```text
js/gamemode/casual/settings-service.js
js/gamemode/casual/drag-drop.js
```

O objetivo é permitir que mouse, touch e telas responsivas continuem utilizáveis sem remover o fluxo legado.

## 16. Limitações Atuais

O casual é flexível, mas essa flexibilidade traz limites técnicos.

### Regras não são autoritativas

O sistema não valida completamente:

- turno correto;
- ação permitida;
- custo de moeda;
- personagem declarado;
- bloqueio válido;
- contestação;
- vencedor oficial.

Isso é aceitável para mesa livre, mas não serve para ranking competitivo confiável.

### Estado global ainda é sensível

Mesmo com a modularização, o casual ainda depende de integrações globais entre:

- `gameState.js`;
- `board-renderer.js`;
- módulos de renderização;
- handlers recriados após `renderAll()`;
- Firebase listeners.

Alterações amplas podem quebrar interações aparentemente distantes.

### Permissões Firebase ainda precisam evoluir

Algumas proteções client-side dependem de UI e não devem ser consideradas segurança definitiva.

O ideal é versionar regras Firebase e endurecer permissões conforme o projeto amadurecer.

### Operações de moeda poderiam usar transação

Algumas alterações de score ainda usam leitura e escrita simples.

Para evitar conflitos em partidas com muitos jogadores, o ideal é migrar operações críticas para transações.

## 17. Próximos Passos Recomendados

Melhorias recomendadas para o Modo Casual:

- versionar Firebase Security Rules;
- reduzir dependências globais restantes entre `gameState.js` e renderizadores;
- revisar operações de moedas para usar transações;
- reforçar testes manuais de drag/drop em mobile;
- documentar melhor presets de baralho e DLCs;
- criar checklist de QA para cartas, cemitério, asilo, chat e espectador;
- separar ainda mais regras sociais, UI e sincronização Firebase;
- avaliar suporte futuro a controle/gamepad;
- estudar integração futura de física de cartas apenas após estabilizar UX básica.

O casual deve continuar sendo o laboratório vivo do Coup Master: livre o suficiente para testar ideias novas, mas organizado o bastante para não comprometer manutenção e estabilidade.
