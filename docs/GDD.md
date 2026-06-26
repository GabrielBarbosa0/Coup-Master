# GDD - Coup Master

Game Design Document adaptado para o projeto atual `Coup-Master`, a versao web 2D baseada em HTML, CSS, JavaScript vanilla, Firebase e manipulacao manual de cartas por drag and drop.

| Campo | Valor |
| --- | --- |
| Projeto | Coup Master |
| Documento | Game Design Document |
| Status | Beta web funcional |
| Plataforma alvo atual | Google Chrome desktop |
| Plataforma alvo atual | PWA instalavel via Chrome |
| Stack principal | HTML, CSS, JavaScript vanilla |
| Backend atual | Firebase Auth + Firebase Realtime Database |
| Interacao principal | Drag and drop 2D de cartas |
| Filosofia | Mesa digital sandbox para jogar Coup com amigos |

## 1. Visao

Coup Master e uma mesa digital multiplayer para jogar Coup online com amigos. O foco do projeto atual nao e simular uma mesa fisica 3D nem automatizar completamente as regras do jogo. O foco e entregar uma mesa 2D funcional, direta e sincronizada, onde jogadores conseguem entrar em uma sala, ver outros jogadores, mover cartas, controlar moedas, configurar o deck e conduzir uma partida manualmente.

A experiencia desejada e a de uma mesa online leve: facil de abrir, facil de compartilhar e suficientemente flexivel para permitir jogo base, cartas promocionais, DLCs, regras alternativas e combinacoes customizadas de baralho. O software deve apoiar o fluxo da mesa, mas nao substituir a negociacao social, os blefes, os desafios e as decisoes humanas.

O Coup Master 3D, de outro repositorio, serve como referencia de longo prazo para sensacao fisica, manipulacao mais natural de objetos e possiveis solucoes com Three.js. Entretanto, este GDD descreve o produto atual: uma versao web 2D mais arcaica, mas ja jogavel, que sera refatorada e fortalecida antes de qualquer migração visual profunda.

## 2. Posicionamento Do Produto

### 2.1 O Que Este Projeto E

- Uma mesa online de Coup em 2D.
- Uma aplicacao web estatica hospedavel em GitHub Pages.
- Um jogo sandbox multiplayer em tempo real.
- Uma experiencia feita primeiro para Google Chrome.
- Um projeto em transicao para uma base mais limpa, modular e ja preparado como PWA instalavel.

### 2.2 O Que Este Projeto Nao E

- Nao e a versao Coup Master 3D.
- Nao e uma simulacao fisica completa.
- Nao e um jogo com regras 100% automatizadas.
- Nao e um aplicativo mobile nativo.
- Nao tem suporte garantido para todos os navegadores.
- Nao tem, por enquanto, backend autoritativo proprio.
- Nao tem matchmaking, ranking, temporadas ou economia externa.

## 3. Pilares De Design

| Pilar | Direcao |
| --- | --- |
| Sandbox manual | O jogo facilita a mesa, mas os jogadores continuam conduzindo regras, blefes e resolucoes. |
| Clareza antes de espetaculo | A mesa precisa ser legivel, previsivel e facil de manipular. Efeitos visuais nao podem atrapalhar. |
| Drag and drop como nucleo | A manipulacao de cartas e o coracao da experiencia atual. |
| Chrome first | O alvo oficial atual e Google Chrome, onde o drag and drop HTML tem suporte mais consistente. |
| PWA como proxima camada | O app deve evoluir para instalacao e uso em janela standalone, sem virar app nativo. |
| Refatoracao progressiva | Antes de adicionar grandes sistemas, limpar HTML, CSS e JavaScript existentes. |
| Compatibilidade pragmatica | Outros navegadores sao desejaveis, mas nao bloqueiam o roadmap atual. |
| Inspiracao 3D, nao dependencia | Three.js pode inspirar ou fornecer solucoes futuras para interacao, mas nao e requisito imediato. |

## 4. Experiencia Atual Desejada

O jogador deve conseguir:

1. Abrir o lobby.
2. Fazer login com Google ou entrar como visitante.
3. Criar uma sala privada ou entrar por codigo.
4. Copiar/compartilhar o codigo da sala.
5. Ver os jogadores conectados.
6. Comprar cartas do deck.
7. Arrastar cartas entre maos, deck e area central.
8. Revelar cartas no cemiterio/area livre.
9. Devolver cartas ao deck.
10. Controlar moedas dos jogadores.
11. Controlar moedas do asilo.
12. Alternar religiao dos jogadores.
13. Consultar cartas de regras.
14. Configurar o baralho como host.
15. Adicionar bots para testes.
16. Remover jogadores como host.
17. Solicitar permissao para espectar a mao de outro jogador.
18. Usar controles visuais locais como musica, tela cheia, VHS, parallax, fundo animado e transparencia.

O fluxo ideal deve parecer rapido e leve. Jogadores nao devem precisar entender estrutura interna do Firebase ou comandos tecnicos para jogar.

## 5. Plataforma E Compatibilidade

### 5.1 Alvo Oficial Atual

O alvo oficial atual e:

- Google Chrome desktop.

Esse alvo e escolhido porque:

- O drag and drop HTML nativo funciona de forma mais previsivel.
- A API de clipboard tende a funcionar melhor.
- Fullscreen, audio e efeitos CSS sao mais estaveis.
- A futura instalacao PWA via Chrome reduz variacao de ambiente.

### 5.2 Navegadores Fora Do Alvo Principal

Navegadores como Samsung Internet, Safari iOS e alguns WebViews Android podem ter comportamentos divergentes em drag and drop. No estado atual, esses navegadores nao sao bloqueadores de release.

Problema conhecido:

- O drag and drop HTML pode falhar ou se comportar de modo diferente em mobile, especialmente no navegador mobile da Samsung.

Direcao:

- Documentar que a experiencia recomendada e Chrome.
- Melhorar touch no futuro sem comprometer a estabilidade no Chrome.
- Avaliar Pointer Events ou uma camada propria de drag no longo prazo.

### 5.3 PWA E Compatibilidade

Transformar o projeto em PWA e uma prioridade futura, mas e importante entender o papel real do PWA:

- PWA melhora instalacao, abertura em tela cheia/standalone, cache e sensacao de app.
- PWA nao corrige automaticamente incompatibilidades do motor do navegador.
- Instalado via Chrome, o app tende a rodar no ambiente do Chrome, o que ajuda a padronizar a experiencia.
- O PWA pode reduzir friccao para usuarios mobile, mas a interacao de toque ainda precisa ser desenhada e testada.

## 6. Estrutura Atual Do Jogo

### 6.1 Paginas

O produto atual tem duas paginas principais:

- `login.html`: autenticacao com Google ou visitante.
- `lobby.html`: perfil autenticado, criacao e entrada em salas.
- `index.html`: mesa de jogo.

Nao existe tela de sala de espera separada. Criar ou entrar em uma sala leva o usuario diretamente ao tabuleiro.

### 6.2 Jogadores

O jogo suporta ate 10 slots de jogador.

Cada slot exibe:

- nome;
- avatar;
- moedas;
- religiao;
- mao de cartas;
- indicador de jogador local;
- botao de remocao quando visto pelo host.

O jogador real e identificado pelo UID do Firebase Auth. Ao recarregar ou reentrar, o sistema tenta recolocar o usuario no mesmo slot.

### 6.3 Host

O criador da sala e o host permanente da sala.

O host pode:

- resetar a mesa;
- configurar deck;
- aplicar presets;
- adicionar bots;
- remover jogadores;
- liberar slots ocupados.

Jogadores comuns nao devem ver nem conseguir aplicar acoes administrativas. A UI atual oculta esses controles, mas o comportamento final precisa ser protegido tambem pelas regras do Firebase.

### 6.4 Bots

Bots sao slots artificiais para testes e preenchimento de mesa. Eles nao executam inteligencia artificial.

Um bot possui:

- `uid` artificial;
- nome `BOT N`;
- avatar de robo;
- mao vazia;
- 2 moedas iniciais;
- religiao definida pela paridade do slot.

## 7. Mesa, Cartas E Areas

### 7.1 Mesa 2D

A mesa atual e uma interface 2D com:

- grade dinamica de jogadores;
- area central de descarte/cemiterio;
- deck;
- asilo;
- controles superiores;
- modais de apoio;
- configuracoes visuais.

O layout deve privilegiar legibilidade em partidas grandes. Com ate 10 jogadores, a mesa precisa evitar sobreposicao e manter cartas reconheciveis.

### 7.2 Cartas

Cartas sao elementos DOM 2D (`div.card`) com imagem de fundo.

Cada carta tem:

- `id`;
- `type`;
- `color`;
- `owner`;
- `visible`;
- `location`.

Estados visuais:

- verso quando esta no deck;
- frente quando esta na area livre/cemiterio;
- frente para o dono da carta;
- frente para espectador autorizado;
- verso para outros jogadores.

### 7.3 Deck

O deck e uma area clicavel e arrastavel.

Comportamentos:

- clique no deck compra carta para o jogador local;
- arrastar deck para jogador compra carta para aquele jogador;
- arrastar deck para area livre revela a carta do topo;
- soltar carta sobre deck devolve e embaralha;
- contador mostra quantidade de cartas restantes.

### 7.4 Cemiterio / Area Livre

A area central funciona como cemiterio e area de cartas reveladas.

Comportamentos:

- cartas soltas ali ficam visiveis a todos;
- cartas do topo do deck podem ser queimadas/reveladas ali;
- cartas nessa area sao renderizadas como pequenas.

Observacao de design:

O nome "cemiterio" e "area livre" aparecem misturados no codigo. Em uma refatoracao, a linguagem da UI e do modelo deve ser padronizada.

### 7.5 Asilo

O asilo e representado por:

- imagem de carta/area;
- contador central de moedas;
- botoes de `+` e `-`;
- duplo clique para sacar tudo para o jogador local.

O asilo e uma mecanica de mesa, nao um objeto fisico separado.

### 7.6 Religiao

Cada jogador tem uma religiao:

- catolico;
- protestante.

O status e exibido por icone/badge. O jogador pode clicar no badge para alternar.

Existe configuracao local para ocultar religiao visualmente.

## 8. Interacoes Principais

### 8.1 Drag And Drop

O drag and drop e a tecnologia central do jogo atual.

Interacoes:

| Acao | Controle |
| --- | --- |
| Comprar carta para si | Clique no deck |
| Comprar carta para outro jogador | Arrastar deck para area do jogador |
| Mover carta para jogador | Arrastar carta para area do jogador |
| Revelar carta | Arrastar carta para area livre |
| Queimar carta do topo | Arrastar deck para area livre |
| Devolver carta ao deck | Soltar carta no deck |
| Devolver rapido ao deck | Duplo clique na carta |
| Copiar codigo da sala | Clique no header da sala |
| Abrir acoes rapidas | Clique no nome do jogador |
| Preview de carta | Botao direito em carta visivel |

### 8.2 Limitacoes Do Drag And Drop Atual

O drag and drop nativo de HTML e simples para desktop, mas tem problemas:

- comportamento inconsistente em navegadores mobile;
- suporte ruim ou parcial em alguns browsers;
- dificuldade de compatibilizar toque, scroll e arrasto;
- pouca previsibilidade para gestos complexos;
- dependencia de eventos `dragstart`, `dragover`, `drop` e `dataTransfer`.

Decisao atual:

- Manter foco em Chrome.
- Nao bloquear a refatoracao tentando resolver todos os navegadores agora.
- Considerar uma camada futura de Pointer Events ou uma solucao inspirada no Coup Master 3D para manipular cartas com mais controle.

### 8.3 Possivel Evolucao Com Three.js

O Coup Master 3D pode inspirar uma solucao futura para manipulacao de cartas, mas ha duas estrategias diferentes:

1. Migracao visual completa para 3D.
2. Uso pontual de tecnicas/camada de interacao para melhorar drag, hover e transformacoes.

Para este projeto, a opcao mais realista no medio prazo e a segunda: aprender com a versao 3D, mas manter o tabuleiro 2D ate a base estar limpa.

Possibilidades futuras:

- Criar uma camada de interacao por Pointer Events.
- Usar canvas/WebGL apenas para cartas, mantendo HUD em HTML.
- Prototipar uma area de mesa hibrida com Three.js para drag de cartas.
- Manter estado e regras atuais, trocando apenas a camada visual/interativa.

Nao objetivo imediato:

- Reescrever o projeto inteiro em Three.js antes de limpar HTML, CSS e JS existentes.

## 9. Regras E Automacao

### 9.1 Filosofia Sandbox

O jogo deve continuar manual. Ele nao precisa impedir toda jogada invalida.

O sistema deve automatizar apenas o que melhora a fluidez sem tirar controle da mesa:

- mover cartas;
- comprar;
- revelar;
- devolver ao deck;
- embaralhar;
- controlar moedas;
- resetar mesa;
- configurar deck;
- mostrar referencias de regras;
- sincronizar som e estado.

### 9.2 Acoes Rapidas

Acoes rapidas atuais:

- roubar;
- assassinar;
- golpe de estado;
- taxa do duque.

Essas acoes alteram moedas e disparam sons, mas nao resolvem perda de influencia, bloqueios ou desafios automaticamente.

Direcao:

- Manter acoes rapidas como atalhos opcionais.
- Evitar transformar o jogo em um sistema rigido de turnos neste momento.
- No futuro, separar "sandbox puro" de "modo assistido", se desejado.

## 10. Decks, DLCs E Configuracao

### 10.1 Cartas Suportadas

O projeto atual suporta:

- jogo base;
- cartas promocionais;
- DLC 1 / Revolucao;
- DLC 2 / Sombras do Asilo;
- cartas de religiao/asilo como elementos especiais.

### 10.2 Presets

Presets atuais:

- Base;
- Base + Promo;
- Base + DLC 1;
- Base + DLC 2;
- Duelo;
- Modo Teste;
- Todas;
- Zerar Tudo.

O host pode aplicar um preset e resetar a mesa com o novo deck.

### 10.3 Direcao De Design Para Decks

Configuracao de deck deve ser:

- clara;
- facil de resetar;
- segura contra valores invalidos;
- coerente com guias de regras exibidos;
- simples de extender com novas cartas.

Ponto de melhoria:

Hoje adicionar carta exige editar varios lugares. Uma refatoracao futura deve centralizar metadados de cartas em uma unica fonte.

## 11. Modo Espectador

O modo espectador permite que um jogador solicite permissao para ver a mao de outro jogador.

Fluxo:

1. Jogador abre modal de espectador.
2. Escolhe alvo.
3. O alvo recebe notificacao.
4. Alvo aceita ou recusa.
5. Se aceitar, o solicitante passa a ver as cartas do alvo.

Design desejado:

- O pedido deve ser claro e nao intrusivo demais.
- O alvo deve entender quem esta pedindo.
- O jogador assistido deve receber feedback visual.
- Permissoes devem ser removidas quando fizer sentido, como reset ou kick.

Ponto atual a alinhar:

- O README antigo sugeria mostrar botao de espectador apenas para jogador sem cartas.
- O codigo atual mostra o botao sempre.
- O GDD assume que a decisao de produto ainda esta em aberto. Para uma mesa sandbox, manter sempre visivel pode ser aceitavel, desde que o fluxo de permissao seja claro.

## 12. HUD E Interface

### 12.1 HUD Atual

Elementos principais:

- header com codigo da sala;
- contador do deck;
- controles superiores;
- botao de reset para host;
- botoes de musica, regras, espectador, fullscreen, informacoes e configuracoes;
- areas de jogadores;
- area central;
- modais.

### 12.2 Modais

Modais atuais:

- regras de personagens;
- regras alternativas;
- preview de carta;
- configuracao de deck;
- configuracoes gerais;
- reset;
- feedback/bug;
- pedido de espectador;
- aguardando espectador;
- remover jogador;
- sala cheia;
- tutorial;
- acoes rapidas;
- duelo.

Direcao de refatoracao:

- Reduzir estilos inline.
- Padronizar estrutura de modal.
- Criar classes reutilizaveis.
- Evitar duplicacao de botoes e layouts.
- Separar modais em componentes/funcoes.

### 12.3 Design Visual

A identidade atual usa:

- tema escuro;
- cartas com imagens;
- icones SVG;
- fonte Cinzel;
- fonte Tilda Script em titulos;
- fundo animado opcional;
- VHS/CRT opcional;
- parallax opcional;
- transparencia opcional.

Direcao:

- Preservar identidade visual.
- Reduzir CSS repetitivo.
- Evitar efeitos pesados como padrao em mobile.
- Garantir que texto e cartas sejam legiveis.

## 13. Audio

Audio atual:

- musica de fundo;
- efeitos de moeda;
- compra/movimento de carta;
- shuffle;
- impacto;
- entrada de jogador;
- acoes especiais.

Regras de design:

- Audio deve ser feedback, nao ruido.
- Musica deve iniciar baixa.
- Usuario deve conseguir mutar facilmente.
- Sons sincronizados devem representar eventos de mesa relevantes.

Pontos de melhoria:

- `playSound('click')` e chamado, mas nao existe audio `click`.
- Arquivo de musica e grande e deve ser otimizado.
- Efeitos devem respeitar futuras preferencias de volume de SFX.

## 14. PWA

### 14.1 Objetivo Do PWA

Transformar Coup Master em PWA tem como objetivo:

- permitir instalacao;
- abrir em janela standalone;
- melhorar cache de assets;
- reduzir aparencia de site comum;
- facilitar uso recorrente;
- padronizar experiencia quando instalado via Chrome;
- preparar uma experiencia mais proxima de app.

### 14.2 Escopo PWA Implementado

Componentes atuais:

- `manifest.webmanifest`;
- icones em tamanhos adequados;
- `theme_color`;
- `background_color`;
- `display: standalone`;
- `start_url` apontando para login;
- service worker;
- cache de shell principal;
- cache de assets criticos;
- fallback de navegacao para o lobby em cache.

### 14.3 O Que O PWA Nao Deve Prometer

O PWA nao deve prometer:

- multiplayer offline;
- funcionamento completo sem rede;
- compatibilidade automatica com todos os navegadores;
- correcao automatica do drag and drop mobile;
- substituicao de regras Firebase.

### 14.4 Estrategia Offline

Como o jogo depende do Firebase para multiplayer, offline completo nao e objetivo.

A implementacao atual usa:

- `js/pwa/pwa.js` para registrar o service worker;
- `sw.js` para cache versionado;
- network-first em navegacoes;
- stale-while-revalidate em assets locais;
- nenhuma interceptacao de requisicoes externas do Firebase.

Offline aceitavel:

- abrir shell do app;
- mostrar lobby/tela explicando falta de conexao;
- manter assets basicos em cache;
- recuperar rapidamente quando voltar a rede.

Nao offline:

- criar sala;
- entrar em sala;
- jogar partida sincronizada;
- autenticar se sessao nao estiver disponivel.

## 15. Roadmap De Refatoracao

### 15.1 Fase 1 - Higiene E Consistencia

Objetivo: reduzir problemas obvios sem mudar arquitetura.

Tarefas:

- Corrigir HTML invalido.
- Corrigir caminhos de assets e fontes.
- Corrigir SEO/sitemap/og:image.
- Remover referencias mortas como `grave-count` e `shuffleBtn` ou recriar elementos se forem desejados.
- Resolver audio `click`.
- Remover handlers duplicados.
- Atualizar README para nomes reais de arquivos.
- Documentar suporte oficial a Chrome.

### 15.2 Fase 2 - CSS E HTML Mais Limpos

Objetivo: reduzir repeticao e estilos inline.

Tarefas:

- Extrair estilos inline de modais para CSS.
- Padronizar botoes.
- Padronizar modais.
- Padronizar linhas de configuracao.
- Reduzir duplicacao entre estilos de lobby e jogo.
- Revisar responsividade.
- Criar convencoes de nome de classes.

### 15.3 Fase 3 - JavaScript Modular

Objetivo: quebrar `board-renderer.js` e `gameState.js` em responsabilidades menores.

Modulos candidatos:

- `state/room-service.js`;
- `state/game-actions.js`;
- `ui/render-players.js`;
- `ui/render-cards.js`;
- `ui/modals.js`;
- `ui/settings.js`;
- `ui/drag-drop.js`;
- `ui/deck-presets.js`;
- `ui/effects.js`;
- `audio/audio-service.js`;
- `constants/cards.js`;
- `constants/storage-keys.js`;

Direcao:

- Migrar aos poucos.
- Manter comportamento visual durante a transicao.
- Evitar refatoracao gigante sem checkpoints.

### 15.4 Fase 4 - Confiabilidade Firebase

Objetivo: tornar o multiplayer menos fragil.

Tarefas:

- Versionar `database.rules.json`.
- Criar `firebase.json` se o fluxo de emulador/deploy for adotado.
- Trocar alteracoes numericas por transacoes.
- Validar permissao de host no banco, nao so na UI.
- Revisar limpeza automatica de salas.
- Sanitizar dados de usuario em HTML.
- Criar testes de regras quando possivel.

### 15.5 Fase 5 - PWA

Objetivo: tornar o app instalavel e mais robusto para usuarios recorrentes.

Tarefas:

- Criar manifest. Concluido.
- Criar service worker. Concluido.
- Definir estrategia de cache. Concluido.
- Gerar icones corretos. Concluido com assets 192x192 e 512x512 existentes.
- Testar instalacao via Chrome desktop e Android.
- Definir tela/fallback offline dedicada, se necessario.
- Revisar paths para GitHub Pages.

### 15.6 Fase 6 - Interacao Avancada

Objetivo: melhorar drag/touch depois da base limpa.

Opcoes:

- Implementar drag proprio com Pointer Events.
- Adicionar suporte touch controlado.
- Avaliar camada hibrida canvas/WebGL para cartas.
- Prototipar uso pontual de Three.js para manipulacao.
- Comparar com implementacoes do Coup Master 3D.

Essa fase nao deve bloquear as fases anteriores.

## 16. Roadmap De Produto

### 16.1 Curto Prazo

- Estabilizar experiencia atual no Chrome.
- Melhorar documentacao.
- Limpar HTML/CSS repetitivo.
- Corrigir problemas conhecidos de assets.
- Melhorar fluxo de configuracao de deck.
- Melhorar feedback de erros.

### 16.2 Medio Prazo

- Modularizar JavaScript.
- Criar PWA.
- Melhorar seguranca Firebase.
- Melhorar responsividade.
- Melhorar modo espectador.
- Criar historico simples de eventos de mesa.
- Criar camada opcional de logs/debug.

### 16.3 Longo Prazo

- Avaliar interacao hibrida inspirada no Coup Master 3D.
- Melhorar suporte touch.
- Criar modo assistido opcional.
- Melhorar arquitetura de decks customizados.
- Permitir temas/cartas customizadas.
- Aproximar a experiencia 2D da sensacao fisica sem abandonar simplicidade.

## 17. Fora Do Escopo Atual

Nao implementar agora, exceto se for pedido explicitamente:

- migracao total para Three.js;
- fisica 3D;
- Rapier;
- camera orbit;
- moedas fisicas arrastaveis;
- chat em tempo real;
- ranking;
- matchmaking;
- temporadas;
- loja;
- monetizacao;
- bots inteligentes;
- automacao completa de regras;
- suporte oficial amplo a Safari/Samsung Internet;
- app nativo Android/iOS.

## 18. Metricas De Sucesso

### 18.1 Produto

- Jogador consegue criar sala e jogar sem orientacao tecnica.
- Host consegue configurar deck sem quebrar partida.
- Mesa com 6 a 10 jogadores continua legivel.
- Jogadores entendem onde comprar, mover e revelar cartas.
- PWA instalado abre direto no login.

### 18.2 Tecnicas

- JS passa em `node --check`.
- HTML nao tem marcacao invalida conhecida.
- CSS tem menos duplicacao e menos inline style.
- Mutacoes concorrentes de moedas nao perdem updates.
- Regras Firebase estao versionadas.
- Assets principais estao otimizados.

### 18.3 Compatibilidade

- Chrome desktop funciona como ambiente principal.
- Chrome Android/PWA vira alvo de teste futuro.
- Outros navegadores podem funcionar, mas nao definem o escopo atual.

## 19. Principios Para Futuras Decisoes

1. Se uma mudanca aumenta complexidade sem melhorar a mesa, adiar.
2. Se uma regra pode continuar manual sem prejudicar a experiencia, manter manual.
3. Se uma automacao remove liberdade da mesa, tornar opcional.
4. Se uma melhoria depende de reescrever tudo, procurar uma etapa incremental menor.
5. Se uma interacao quebra no Chrome, ela bloqueia release.
6. Se uma interacao quebra apenas em navegador fora do alvo, documentar e priorizar depois.
7. Se um dado vem de usuario, tratar como externo.
8. Se uma permissao e importante, proteger no Firebase, nao so na UI.

## 20. Conclusao

O Coup Master atual deve evoluir primeiro como uma mesa 2D solida, limpa e instalavel. A versao 3D continua sendo uma fonte valiosa de ideias, especialmente para manipulacao mais natural de cartas, mas a prioridade imediata e refatorar o produto existente: organizar HTML, reduzir CSS repetitivo, separar JavaScript em responsabilidades claras, fortalecer Firebase e preparar PWA.

O objetivo nao e esconder que esta versao e mais arcaica. O objetivo e transformar essa base em uma versao confiavel, simples de manter e boa o suficiente para partidas reais, antes de tentar unir mundos com Three.js ou uma camada visual mais ambiciosa.
