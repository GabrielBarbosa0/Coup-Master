# Coup Master - Roadmap E Dividas Tecnicas

Documento de planejamento do estado atual do projeto e dos proximos passos recomendados.

Atualizado em: 2026-07-12.

## 1. Resumo Executivo

O Coup Master ja passou da fase de "site jogavel" e entrou em uma fase de produto beta com jogo, conta, lobby, PWA, modo casual, modo ranqueado, bots IA experimentais, estatisticas, conquistas iniciais, classificacao mundial e uma camada audiovisual mais madura no ranqueado.

O estado atual e saudavel para beta experimental, mas ainda nao e um jogo competitivo plenamente confiavel. O principal motivo e arquitetural: o app continua sendo estatico, com logica e persistencia executadas diretamente no cliente via Firebase Realtime Database. Isso e excelente para velocidade de desenvolvimento, mas exige cuidado com seguranca, consistencia, testes e regras do banco.

O proximo passo mais importante nao e trocar de stack. E consolidar o que ja existe:

- proteger melhor o estado no Firebase;
- corrigir inconsistencias pequenas de HTML, assets, SEO e documentacao;
- reduzir risco de concorrencia no modo casual;
- organizar audio, assets e creditos;
- modularizar aos poucos os arquivos maiores;
- melhorar feedback visual e fluxo de partida no ranqueado.

## 2. Estado Atual Do Projeto

### 2.1 Produto

O projeto possui:

- login com Google e visitante anonimo;
- lobby com criacao e entrada em salas;
- modo casual sandbox para ate 8 jogadores;
- modo ranqueado beta para ate 6 jogadores;
- sala de espera ranqueada com prontidao, convite e bots IA;
- motor ranqueado automatizado para turnos, acoes, contestacoes, bloqueios e perda de influencia;
- perfil/estatisticas ranqueadas em beta;
- classificacao mundial ranqueada;
- PWA com manifesto, service worker e cache de shell/assets locais;
- paginas publicas de privacidade e termos;
- camada audiovisual mais completa no ranqueado.

### 2.2 Arquitetura

O app continua propositalmente simples:

- HTML, CSS e JavaScript vanilla;
- Firebase Auth e Realtime Database via CDN;
- sem build step;
- sem bundler;
- sem framework frontend;
- sem `package.json`;
- deploy compativel com GitHub Pages.

Essa escolha ainda faz sentido para o projeto. O custo e que a ordem de scripts, variaveis globais e arquivos grandes viram contratos implicitos.

### 2.3 Pontos Mais Fortes

- O modo casual e flexivel e permite mesa manual com expansoes e regras sociais.
- O modo ranqueado ja tem um motor de regras separado e testavel.
- As mutacoes principais do ranqueado passam por transacoes no Firebase.
- O projeto tem documentacao tecnica extensa em `docs/TDD.md`.
- O PWA ja existe e cobre o shell principal.
- A experiencia audiovisual do ranqueado melhorou bastante com sons contextuais, fade de camadas de suspense e reducao temporaria da BGM.

## 3. Dividas Tecnicas Prioritarias

### P0 - Seguranca E Confianca Competitiva

Estas dividas bloqueiam qualquer tentativa de tratar ranking como competitivo serio.

1. **Firebase Security Rules nao versionadas**

   Hoje as regras estao documentadas no README, mas nao existe `database.rules.json`, `firebase.json` ou `.firebaserc` versionados. Isso cria risco de divergencia entre documentacao e producao.

   Impacto:

   - dificil auditar permissoes reais;
   - dificil revisar mudancas de seguranca;
   - dificil testar regras localmente;
   - risco de regras amplas continuarem em producao sem perceber.

2. **Escrita ampla em salas**

   A regra documentada `.write: "auth != null"` no nivel de `salas/$roomCode` e permissiva demais. Mesmo que a UI esconda controles, um cliente malicioso pode tentar escrever estado invalido se as rules reais permitirem.

   Impacto:

   - controles de host nao sao seguranca real;
   - rankedState e gameState podem ser alterados fora do fluxo esperado;
   - ranking e estatisticas podem ser manipulados.

3. **Estatisticas ranqueadas ainda sao client-side**

   `rankedStats/{uid}` e `rankedResults/{resultKey}` sao escritos por clientes autenticados. Isso serve para beta, historico local e validacao de produto, mas ainda nao e antifraude.

   Impacto:

   - classificacao mundial nao deve ser tratada como ranking competitivo confiavel;
   - resultados podem ser forjados por cliente modificado;
   - backend autoritativo ou Cloud Functions sera necessario no futuro.

4. **Limpeza de salas roda no cliente**

   `cleanupOldRooms()` remove salas antigas quando alguem abre o lobby. Isso e pratico no plano gratuito, mas depende de permissoes sensiveis.

   Impacto:

   - se as rules forem permissivas, usuarios podem remover dados demais;
   - limpeza depende de alguem abrir o lobby;
   - nao ha auditoria centralizada.

### P1 - Consistencia De Estado E Concorrencia

1. **Moedas do casual ainda usam `once` + `set`**

   `updateScore`, `updateAsylumScore` e parte de `withdrawAsylumCoins` ainda nao sao atomicos. Dois clientes alterando moedas ao mesmo tempo podem sobrescrever resultado.

   Impacto:

   - saldo pode ficar incorreto em mesa ativa;
   - asilo pode ser sacado ou atualizado com corrida de dados;
   - jogadores precisam corrigir manualmente.

2. **Validacao de dados antes de escrita ainda e limitada**

   O cliente escreve objetos complexos no Firebase. O modo ranqueado e mais estruturado, mas ainda nao ha schema formal ou validacao forte em rules.

   Impacto:

   - risco de estado parcial;
   - risco de dados antigos/incompletos quebrarem renderizacao;
   - migrações futuras ficam mais dificeis.

3. **Renderizacao completa no casual**

   `renderAll()` recria grandes partes do DOM a cada snapshot.

   Impacto:

   - custo maior em mobile;
   - listeners sao recriados com frequencia;
   - bugs visuais podem aparecer quando elementos somem sob o cursor;
   - refatoracoes pequenas exigem cuidado.

### P1 - XSS, Dados Externos E HTML Dinamico

1. **Uso de `innerHTML` com dados de jogador**

   O ponto mais sensivel conhecido e a lista de alvos do espectador no casual, que monta HTML com `p.name` e `p.photo`.

   Impacto:

   - dados vindos do Firebase/Auth devem ser tratados como externos;
   - ideal e construir DOM com `createElement`, `textContent` e `src` validado.

2. **Logs de producao sem flag**

   Existem muitos `console.log`, `console.warn` e `console.error` operacionais.

   Impacto:

   - util no beta;
   - ruidoso em producao;
   - ideal seria uma flag de debug.

### P1 - Manutencao E Arquivos Grandes

1. **`board-renderer.js` concentra responsabilidades demais**

   O arquivo mistura:

   - renderizacao de jogadores;
   - renderizacao de cartas;
   - drag/drop;
   - modais;
   - audio;
   - efeitos visuais;
   - presets;
   - chat;
   - configuracoes.

   Impacto:

   - alto risco de regressao;
   - dificil testar partes isoladas;
   - dificil revisar PRs grandes.

2. **`gameState.js` mistura conexao, mutacoes e UI**

   O arquivo conecta sala, gerencia Firebase, aplica mutacoes, toca sons e chama funcoes do renderer.

   Impacto:

   - acoplamento alto;
   - dificil extrair testes;
   - mudancas de fluxo de sala ficam perigosas.

3. **`ranked-renderer.js` tambem cresceu**

   O ranqueado ja esta melhor separado que o casual, mas o renderer agora acumula UI, chat, audio, perfil, resultados, preview de carta e camadas sonoras.

   Impacto:

   - deve ser dividido antes de crescer muito mais;
   - audio poderia virar `ranked-audio.js` ou `audio-service.js`.

### P2 - Assets, Audio E Performance

1. **Trilha sonora muito pesada**

   `assets/sounds/soundtrack/bgm.mp3` e grande para um app estatico.

   Impacto:

   - carregamento inicial pesado;
   - pior experiencia mobile;
   - cache maior no PWA.

2. **Creditos/licencas de audio nao estao centralizados**

   O projeto agora usa varios efeitos sonoros. Falta um inventario de fonte, licenca, autor e data.

   Impacto:

   - risco juridico no futuro;
   - dificil substituir assets;
   - dificil auditar uso comercial.

3. **Formato e compressao dos sons**

   O projeto usa MP3. Pode ser suficiente agora, mas vale avaliar compressao, duracao e talvez `.ogg` para navegadores modernos.

   Impacto:

   - peso acumulado;
   - latencia de primeira execucao;
   - PWA mais pesado.

### P2 - HTML, SEO E Documentacao

1. **Caminhos de assets/SEO inconsistentes**

   Exemplos conhecidos:

   - `index.html` ainda aponta `og:image` para caminho incorreto;
   - `sitemap.xml` referencia `/img/...`, mas assets reais estao em `assets/img/...`.

2. **HTML invalido no lobby**

   O `font-loader` aparece depois do `</body>` em `lobby.html`.

3. **README pode ficar atrasado**

   Historicamente o README ja citou nomes antigos de arquivos. Como o projeto evolui rapido, a documentacao precisa de revisao recorrente.

4. **Roadmap antigo espalhado**

   Existem ideias em README, GDD, TDD e conversas. Este documento deve virar a referencia de planejamento, enquanto TDD continua sendo a referencia tecnica detalhada.

### P2 - UX E Clareza De Mesa

1. **Feedback visual de acoes ainda pode melhorar**

   O ranqueado esta mais sonoro, mas ainda depende bastante de leitura de log.

   Oportunidades:

   - destacar jogador ativo;
   - destacar alvo da acao;
   - microbanner de acao recente;
   - animacao de moeda entrando/saindo;
   - animacao de perda de influencia;
   - pulso no timer de resposta;
   - destaque de bloqueio/contestacao.

2. **Final de partida pode ser mais recompensador**

   O modal de resultados existe, mas pode virar um momento mais forte.

   Oportunidades:

   - melhor jogador da partida;
   - conquistas desbloqueadas;
   - motivo dos pontos;
   - progresso no ranking;
   - resumo copiavel;
   - rematch mais evidente.

3. **Tutorial/treino ainda nao existe**

   Com bots IA e motor ranqueado, um modo treino ficou natural.

   Oportunidades:

   - ensinar acoes basicas;
   - ensinar contestacao;
   - ensinar bloqueio;
   - explicar blefe e perda de influencia;
   - permitir partida guiada contra IA.

## 4. Roadmap Recomendado

### Fase 0 - Consolidar O Trabalho Atual

Objetivo: fechar a rodada recente de sons, pequenos fixes e documentacao.

Tarefas:

- Revisar manualmente o modo ranqueado com 2 jogadores e IA.
- Confirmar sons de vitoria, derrota, bloqueio, contestacao, moedas, assassinato, golpe, investigacao e perda de influencia.
- Confirmar que BGM nao reinicia quando camadas de suspense entram.
- Confirmar que chat, configuracoes, preview de carta e modal de IA ficaram sem sons redundantes.
- Confirmar tooltip do casual ao devolver a ultima carta ao deck.
- Adicionar todos os novos assets sonoros ao Git quando estiverem aprovados.
- Criar `docs/audio-assets.md` com fonte/licenca de cada som.

Resultado esperado:

- audiovisual ranqueado consolidado;
- pequenos bugs visuais recentes resolvidos;
- creditos de audio rastreaveis.

### Fase 1 - Hardening De Baixo Risco

Objetivo: reduzir risco sem mudar arquitetura.

Tarefas:

- Corrigir `og:image` do `index.html`.
- Corrigir caminhos incorretos no `sitemap.xml`.
- Corrigir HTML invalido do `lobby.html`.
- Atualizar README para refletir estado real dos arquivos.
- Remover chamadas restantes de `playSound('click')` no casual ou adicionar `audio-click` se o som for desejado.
- Corrigir comportamento desejado do botao de espectador no casual.
- Sanitizar o modal de alvos do espectador sem `innerHTML` com dados externos.
- Trocar `updateScore`, `updateAsylumScore` e saque do asilo para transacoes.

Resultado esperado:

- menos bugs pequenos;
- menor risco de XSS;
- moedas do casual mais confiaveis;
- SEO e documentacao mais coerentes.

### Fase 2 - Firebase Rules E Ambiente De Validacao

Objetivo: tornar seguranca e regras auditaveis.

Tarefas:

- Criar `database.rules.json`.
- Criar `firebase.json` se o fluxo de emulator/deploy for adotado.
- Remover ou restringir escrita ampla em `salas/$roomCode`.
- Definir permissao especifica para:
  - criacao de sala;
  - entrada/reentrada em slot;
  - escrita do proprio jogador;
  - controles de host no casual;
  - rankedState;
  - rankedStats;
  - rankedResults;
- Criar testes basicos de rules no Firebase Emulator.
- Documentar fluxo local de emulator.

Resultado esperado:

- regras versionadas;
- revisao de seguranca possivel por diff;
- menos dependencia de checagem client-side.

### Fase 3 - Feedback Visual Do Ranqueado

Objetivo: fazer a partida parecer menos "log textual" e mais "mesa acontecendo".

Tarefas:

- Destacar ator e alvo da acao atual.
- Criar microbanner temporario para a ultima acao importante.
- Animar ganho/perda de moedas.
- Animar carta revelada/perdida.
- Melhorar dramatizacao de eliminacao.
- Dar feedback visual diferente para contestacao, bloqueio e bloqueio aceito.
- Reforcar estado de prazo curto no timer.

Resultado esperado:

- jogador entende a mesa olhando para o tabuleiro;
- menos dependencia do log;
- ranqueado com sensacao mais profissional.

### Fase 4 - Resultado Final E Progressao

Objetivo: transformar fim de partida em recompensa.

Tarefas:

- Melhorar painel de resultados.
- Exibir melhor jogador da partida.
- Explicar pontuacao de desempenho em linguagem clara.
- Exibir conquistas desbloqueadas.
- Mostrar progresso no ranking.
- Adicionar resumo copiavel da partida.
- Melhorar fluxo de rematch.

Resultado esperado:

- ciclo de partida mais satisfatorio;
- conquistas e estatisticas ficam mais visiveis;
- jogador tem motivo para jogar novamente.

### Fase 5 - Tutorial E Treino Contra IA

Objetivo: reduzir barreira de entrada.

Tarefas:

- Criar modo treino a partir do motor ranqueado.
- Criar roteiro guiado para:
  - renda;
  - ajuda externa;
  - taxar;
  - extorquir;
  - assassinar;
  - golpe;
  - contestar;
  - bloquear;
  - revelar influencia.
- Permitir partida simples contra IA.
- Adicionar dicas contextuais.

Resultado esperado:

- novos jogadores aprendem sem depender de explicacao externa;
- ranqueado fica menos intimidador.

### Fase 6 - Modularizacao Gradual

Objetivo: reduzir risco de manutencao sem reescrever tudo.

Ordem sugerida:

1. Extrair constantes de audio e ids de DOM.
2. Extrair `audio-service.js` para casual/ranqueado ou servicos separados.
3. Extrair partes do `ranked-renderer.js`:
   - chat;
   - audio;
   - perfil;
   - resultados;
   - preview de carta.
4. Extrair partes do `board-renderer.js`:
   - render de jogadores;
   - render de cartas;
   - drag/drop;
   - modais;
   - settings;
   - deck presets.
5. Separar mutacoes do casual em um modulo de acoes de estado.

Resultado esperado:

- arquivos menores;
- revisoes mais simples;
- testes mais viaveis;
- menor medo de mexer no jogo.

### Fase 7 - Matchmaking E Produto Online

Objetivo: deixar o ranqueado com cara de jogo online, nao apenas sala privada.

Tarefas:

- Criar botao "buscar partida".
- Criar fila simples no Firebase.
- Preencher com bots apos tempo limite.
- Permitir rematch.
- Separar partida casual, privada e ranqueada.
- Definir regras para abandono/conexao.

Resultado esperado:

- entrada no ranqueado mais direta;
- menos dependencia de convite manual;
- experiencia mais proxima de jogo online moderno.

### Fase 8 - Ranking Confiavel E Backend Autoritativo

Objetivo: tornar ranking competitivo de verdade.

Opcoes tecnicas:

- Cloud Functions;
- backend proprio pequeno;
- Firebase Functions quando o plano permitir;
- outro servico server-side simples para validacao.

Tarefas:

- Calcular resultado no servidor ou validar resultado final.
- Bloquear escrita livre em `rankedStats`.
- Permitir cliente apenas solicitar acao, nao definir estatistica.
- Garantir idempotencia de resultado.
- Proteger contra duplicidade de partida.
- Calcular ranking no servidor.
- Criar trilha de auditoria minima.

Resultado esperado:

- ranking menos manipulavel;
- estatisticas mais confiaveis;
- base para temporadas, premios e ranking publico real.

### Fase 9 - Performance, PWA E Assets

Objetivo: deixar o app mais leve e confiavel para usuarios recorrentes.

Tarefas:

- Comprimir `bgm.mp3` ou trocar por loop menor.
- Revisar tamanho dos VFX.
- Avaliar `.ogg` alem de `.mp3`.
- Revisar cache do service worker.
- Criar estrategia de atualizacao do PWA mais clara para usuario.
- Testar instalacao no Chrome desktop e Android.
- Revisar comportamento em Samsung Internet.
- Criar fallback offline mais amigavel.

Resultado esperado:

- carregamento mais leve;
- menos cache problemático;
- experiencia melhor em mobile.

## 5. Ordem Recomendada De Execucao

Minha sugestao de ordem pratica:

1. Consolidar sons e criar `docs/audio-assets.md`.
2. Corrigir transacoes de moedas/asilo no casual.
3. Sanitizar `innerHTML` com dados de jogador.
4. Corrigir SEO, sitemap e HTML invalido.
5. Versionar Firebase Rules.
6. Criar testes de rules/emulator.
7. Melhorar feedback visual do ranqueado.
8. Melhorar tela final e conquistas.
9. Criar modo treino contra IA.
10. Modularizar audio e renderers.
11. Criar matchmaking.
12. Migrar ranking para validacao autoritativa.

## 6. Decisoes Que Devem Ser Mantidas Por Enquanto

- Manter o app estatico.
- Nao adicionar framework sem necessidade clara.
- Nao adicionar bundler apenas por organizacao.
- Evoluir por mudancas pequenas e testaveis.
- Preservar modo casual como sandbox manual.
- Preservar modo ranqueado como fluxo automatizado separado.
- Tratar ranking atual como beta, nao competitivo definitivo.

## 7. Itens Que Nao Parecem Prioridade Agora

- Migracao total para React/Vue/Svelte.
- Migracao total para Three.js.
- Fisica 3D.
- Replay completo.
- Narracao dinamica com IA em tempo real.
- Marketplace de decks customizados.
- Rating competitivo com premios antes de backend autoritativo.

Esses itens podem ser interessantes no futuro, mas agora custariam mais do que entregam.

## 8. Checklist Curto Para A Proxima Rodada

Se a ideia for escolher uma frente pequena e de alto impacto, a melhor sequencia e:

- criar `docs/audio-assets.md`;
- corrigir moedas/asilo com transacoes;
- remover `innerHTML` inseguro no espectador;
- corrigir `og:image` e `sitemap.xml`;
- versionar `database.rules.json`;
- adicionar um primeiro microbanner visual no ranqueado para ultima acao.

Essa sequencia melhora seguranca, consistencia e percepcao de qualidade sem trocar a arquitetura do projeto.
