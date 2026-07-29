# AGENTS.md

Guia para IAs e agentes de codigo trabalhando neste repositorio.

## Projeto

Coup Master e um app estatico de jogo multiplayer online em beta. Ele usa HTML, CSS e JavaScript vanilla no navegador, com Firebase Auth e Firebase Realtime Database via CDN. Nao ha build step, framework frontend, TypeScript, bundler ou `package.json`.

Pontos de entrada:

- `login.html`: autenticacao com Google ou visitante anonimo.
- `lobby.html`: perfil autenticado, criacao e entrada em salas.
- `index.html`: tabuleiro do modo casual.
- `ranked-waiting.html`: sala de espera/prontidao do modo ranqueado.
- `ranked.html`: mesa da partida ranqueada com regras automatizadas.
- `.nojekyll`: desativa o processamento Jekyll no GitHub Pages; mantenha esse arquivo para publicar o app como site estatico puro.

Scripts principais:

- `js/firebase/firebase.js`: inicializa Firebase e expoe `window.db` e `window.auth`.
- `js/login/login-manager.js`: login Google/anonimo e persistencia de sessao local.
- `js/gamemode/game-modes.js`: contrato compartilhado dos modos casual e ranqueado.
- `js/core/rules.js`: tipos de carta, criacao de deck e utilitarios.
- `js/core/gameState.js`: conexao com sala, mutacoes e listeners do Firebase.
- `js/lobby/lobby-manager.js`: lobby/salas/logout/limpeza.
- `js/gamemode/casual/audio-service.js`: audio casual, volume de efeitos, BGM e sincronizacao SFX.
- `js/gamemode/casual/card-preview.js`: preview ampliado de cartas e flip do modal.
- `js/gamemode/casual/modal-service.js`: helpers compartilhados para abrir, fechar e consultar modais.
- `js/gamemode/casual/chat-service.js`: chat em tempo real do modo casual, atalhos e alerta de mensagens.
- `js/gamemode/casual/board-status.js`: contadores do tabuleiro casual e copia do codigo da sala.
- `js/gamemode/casual/visual-effects.js`: efeito Balatro/tilt, leques de cartas e overlap visual.
- `js/gamemode/casual/admin-controls.js`: travas visuais e modais de host do modo casual.
- `js/gamemode/casual/spectator-service.js`: botao, modal e lista segura de alvos do modo espectador casual.
- `js/gamemode/casual/quick-actions.js`: perfil rapido, estatisticas ranqueadas e acoes rapidas do casual.
- `js/gamemode/casual/settings-service.js`: preferencias locais do casual, compatibilidade de arraste e visibilidade de religiao.
- `js/gamemode/casual/deck-presets.js`: presets de composicao do baralho casual e duelo.
- `js/gamemode/casual/drag-drop.js`: drag/drop legado HTML5, fallback Pointer Events e dropzones do casual.
- `js/gamemode/casual/render-cards.js`: renderizacao de cartas, frente/verso, tooltip e caminhos de assets.
- `js/gamemode/casual/render-players.js`: renderizacao dos slots, avatares, maos, moedas e badges do casual.
- `js/gamemode/casual/board-renderer.js`: renderizacao, DOM, modais, drag/drop e efeitos visuais.
- `js/gamemode/ranked/ranked-rules.js`: personagens, acoes e tempos oficiais do ranqueado.
- `js/gamemode/ranked/ranked-engine.js`: maquina de estados pura para turnos, contestacoes, bloqueios e eliminacoes.
- `js/gamemode/ranked/ranked-game.js`: autenticacao, transacoes, presenca e listeners Firebase do ranqueado.
- `js/gamemode/ranked/ranked-renderer.js`: interface e chat da tela ranqueada.
- `js/ui/ad-slots.js`: configuracao e renderizacao dos slots Google AdSense.

Leia `docs/TDD.md` antes de fazer mudancas estruturais.

## Regras de Trabalho

- Preserve o modelo estatico do projeto, a menos que o usuario peca explicitamente outra arquitetura.
- Nao introduza dependencias, bundlers ou frameworks sem necessidade clara.
- Nao renomeie ids em `index.html` ou `lobby.html` sem atualizar todos os usos em JS/CSS.
- Nao reverta mudancas existentes que voce nao fez.
- Mantenha textos em portugues do Brasil.
- Use UTF-8.
- Prefira mudancas pequenas e focadas. Este projeto tem muito estado global; alteracoes amplas quebram facil.

## Mensagens de Commit

Siga o estilo ja usado no historico do repositorio:

- Assunto no formato `tipo: titulo`, `tipo/escopo: titulo` ou `tipo(escopo): titulo`.
- Use tipos como `feat`, `fix`, `style`, `docs`, `refactor` e `ci`, escolhendo o mais especifico para a mudanca.
- Mantenha o titulo curto, tecnico e em portugues do Brasil.
- Quando houver varias mudancas, adicione corpo com bullets iniciados por `-`.
- Quando util, finalize com `Verificacoes:` e bullets dos comandos executados.

## Verificacao Minima

Depois de alterar JavaScript, rode:

```powershell
node --check js\firebase\firebase.js
node --check js\gamemode\game-modes.js
node --check js\core\rules.js
node --check js\core\gameState.js
node --check js\lobby\lobby-manager.js
node --check js\gamemode\casual\audio-service.js
node --check js\gamemode\casual\card-preview.js
node --check js\gamemode\casual\modal-service.js
node --check js\gamemode\casual\chat-service.js
node --check js\gamemode\casual\board-status.js
node --check js\gamemode\casual\visual-effects.js
node --check js\gamemode\casual\admin-controls.js
node --check js\gamemode\casual\spectator-service.js
node --check js\gamemode\casual\quick-actions.js
node --check js\gamemode\casual\settings-service.js
node --check js\gamemode\casual\deck-presets.js
node --check js\gamemode\casual\drag-drop.js
node --check js\gamemode\casual\render-cards.js
node --check js\gamemode\casual\render-players.js
node --check js\gamemode\casual\board-renderer.js
node --check js\gamemode\ranked\ranked-rules.js
node --check js\gamemode\ranked\ranked-engine.js
node --check js\gamemode\ranked\ranked-renderer.js
node --check js\gamemode\ranked\ranked-game.js
node js\gamemode\ranked\ranked-engine.test.js
```

Para testar localmente, use servidor estatico:

```powershell
python -m http.server 8000
```

Abra `http://localhost:8000/login.html`. Login Google local depende dos dominios autorizados no Firebase; login anonimo depende do provedor Anonimo ativo no Firebase Auth.

## Firebase

As chaves Web em `js/firebase/firebase.js` sao identificadores publicos. A seguranca real depende das Firebase Security Rules.

Cuidados:

- Nao trate checagens client-side de `isAdmin` como seguranca suficiente.
- Se mexer em permissoes, crie/versione regras Firebase em arquivo proprio.
- Evite operacoes destrutivas no banco de producao.
- `cleanupOldRooms()` remove salas inativas; cuidado ao testar regras de escrita.
- Dados de usuario vindos do Firebase/Auth devem ser tratados como externos.

## Monetizacao e AdSense

- O projeto possui um unico slot de anuncio ativo: banner responsivo na sala de espera ranqueada (`ranked-waiting.html`).
- A configuracao do publisher e do slot fica centralizada em `js/ui/ad-slots.js`.
- O estilo visual do slot fica em `css/ads.css`.
- `ranked-waiting.html` tambem carrega o snippet oficial do AdSense no `<head>` para verificacao/publicacao.
- Nao adicione anuncios dentro da mesa ativa, sobre cartas, botoes de acao, modais de decisao ou qualquer area que possa induzir clique acidental.
- Para GitHub Pages em repositorio de projeto (`/Coup-Master`), o AdSense valida o dominio raiz `gabrielbarbosa0.github.io`; mantenha o repositorio raiz publicado com o snippet de verificacao enquanto a revisao estiver pendente.

## Invariantes de Jogo

Preserve:

- 8 slots maximos no casual e 6 slots maximos no ranqueado.
- UID real reentra no mesmo slot.
- Carta existe em apenas um lugar: `deck`, `freeCards` ou `players[n].hand`.
- Carta no deck: `owner = null`, `visible = false`, `location = "deck"`.
- Carta na mao: `owner = pid`, `visible = false`, `location = "player-{pid}"`.
- Carta no cemiterio/free area: `owner = null`, `visible = true`, `location = "free"`.
- Scores nao devem ficar negativos.
- Host e determinado por `salas/{roomCode}/hostUID`.
- Sala sem `mode` e casual; sala ranqueada exige conta Google, baralho padrao e permite bots IA experimentais adicionados na sala de espera.
- O ranqueado nao possui host ou controles administrativos. Todos os clientes passam pelo mesmo motor de regras.
- O ranqueado agenda uma contagem de 5 segundos depois que todos estao prontos antes de iniciar a partida.
- `rankedStats/{uid}` e `rankedResults/{resultKey}` existem para perfil/estatisticas beta. As Firebase Security Rules precisam liberar esses caminhos, ou o lobby nao consegue exibir partidas, vitorias, derrotas e conquistas do ranqueado. Nao trate esses dados como rating confiavel enquanto influencias secretas e transicoes puderem ser lidas/escritas diretamente pelo cliente.

## Ao Adicionar Carta

Atualize todos:

- `CARD_TYPES` em `js/core/rules.js`.
- `createDefaultDeckConfig()`.
- Asset PNG em `assets/img/cards/...`.
- `getCardFolder()` em `js/gamemode/casual/render-cards.js`.
- Inputs do modal de deck em `index.html`.
- Presets em `js/gamemode/casual/deck-presets.js`.
- Grupos de `calculateRuleImages()`, se afetar guias.

## Ao Alterar UI do Tabuleiro

O arquivo `board-renderer.js` recria partes do DOM a cada `renderAll()`. Se adicionar listeners em elementos dinamicos, garanta que eles sejam recriados corretamente ou use delegacao.

Evite usar `innerHTML` com dados de jogador. Prefira `textContent` e criacao de elementos com `document.createElement`.

## Pontos Frágeis Conhecidos

- `board-renderer.js` concentra responsabilidades demais.
- `gameState.js` mistura mutacoes, conexao e algumas acoes de UI.
- `updateScore` e `updateAsylumScore` usam `once` + `set`; ideal e transacao.
- Algumas referencias de asset/SEO estao inconsistentes.
- Alguns handlers visuais estao duplicados.
- `playSound('click')` e chamado, mas nao ha `audio-click`.
- Security Rules estao documentadas no README, mas nao versionadas.

## Documentacao

- TDD detalhado: `docs/TDD.md`.
- README pode estar desatualizado em relacao a nomes de arquivos.
- Ao mudar comportamento importante, atualize `docs/TDD.md` e README quando aplicavel.
