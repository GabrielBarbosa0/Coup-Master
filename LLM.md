# Coup Master - Contexto para IAs

Este arquivo serve como ponto de retomada para IAs, agentes de codigo e ferramentas de pesquisa entenderem rapidamente o que e o Coup Master, qual e o objetivo do projeto e quais areas merecem atencao ao continuar o desenvolvimento.

## O que e o Coup Master

Coup Master e uma versao digital, online e em beta de um jogo social de blefe inspirado em Coup. O projeto adapta a experiencia de mesa para navegador, com salas multiplayer, cartas de influencia, moedas, acoes de personagem, contestacoes, bloqueios e eliminacao de jogadores.

A ideia central e permitir partidas rapidas em que os jogadores podem dizer a verdade ou blefar sobre as cartas que possuem. Outros jogadores podem contestar ou bloquear determinadas acoes. O jogo mistura deducao, leitura social, risco e controle de recursos.

## Objetivo do projeto

O objetivo do Coup Master e oferecer uma experiencia jogavel, moderna e acessivel no navegador, mantendo a sensacao de jogo de cartas fisico, mas com recursos digitais como:

- Criacao e entrada em salas online.
- Login por Google ou visitante anonimo.
- Modo casual com configuracoes flexiveis de baralho.
- Modo ranqueado com regras automatizadas.
- Sala personalizada baseada no fluxo automatizado.
- Interface visual com cartas, mesa, slots de jogadores, cimiterio/asilo e baralho.
- Guias dinamicos de regras e personagens.
- Suporte a portugues e possibilidade de expansao para outros idiomas.

## Modos de jogo

### Modo casual

O modo casual e a mesa mais flexivel. Ele permite configurar o baralho, adicionar ou remover cartas, testar variantes e jogar com mais liberdade. E nele que o projeto costuma receber experimentos visuais e mecanicos primeiro.

Caracteristicas importantes:

- Ate 8 slots de jogadores.
- Host com controles administrativos da sala.
- Baralho configuravel.
- Modal de regras dinamico.
- Sistema visual de cartas com animacoes e reorganizacao.
- Assets de cartas, guias, religiao, perfil de cartas e imagens auxiliares.

### Modo ranqueado

O modo ranqueado usa regras mais fixas e automatizadas. Ele deve ser mais previsivel, competitivo e padronizado.

Caracteristicas importantes:

- Ate 6 jogadores.
- Baralho padrao.
- Fluxo automatizado de turnos, acoes, bloqueios e contestacoes.
- Sem controles administrativos de host durante a partida.
- Estatisticas ranqueadas em beta.

### Sala personalizada

A Sala Personalizada reaproveita a base do modo ranqueado, mas com fluxo proprio. Ela deve permitir partidas mais controladas pelo criador, mantendo parte da automacao do ranqueado.

Caracteristicas importantes:

- Base visual e logica parecida com o ranqueado.
- Criador da sala pode remover jogadores ou bots na espera.
- Estado separado do ranqueado para evitar misturar fluxos.

## Tecnologias

O projeto e um app estatico em HTML, CSS e JavaScript vanilla. Nao ha framework, bundler ou etapa de build obrigatoria.

Tecnologias principais:

- HTML estatico.
- CSS modular por tela/modo.
- JavaScript vanilla no navegador.
- Firebase Authentication.
- Firebase Realtime Database.
- Assets locais em PNG, SVG, fontes e sons.

Como nao existe build step, qualquer alteracao precisa funcionar diretamente no navegador a partir dos arquivos estaticos.

## Conceitos principais do jogo

- Cada jogador possui influencias representadas por cartas.
- Moedas sao usadas para executar certas acoes, como assassinato ou golpe de estado.
- Jogadores podem declarar personagens mesmo sem possui-los.
- Outros jogadores podem contestar declaracoes.
- Algumas acoes podem ser bloqueadas por personagens especificos.
- Quando uma influencia e perdida, a carta e revelada ou movida para a area apropriada.
- O baralho, a mao dos jogadores e as areas livres precisam manter consistencia: uma carta nao deve existir em dois lugares ao mesmo tempo.

## Cartas e expansoes

O Coup Master trabalha com cartas base e cartas adicionais de expansoes ou variantes.

Grupos relevantes:

- Base: Duque, Capitao, Assassino, Condessa, Embaixador, Inquisidor.
- Promo/Sombras do Palácio: Bufao, Burocrata, Benfeitor, Burgues.
- DLC/Revolucao: Marionetista, Diplomata, Mercenario, Tesoureiro, Bispo, Vigilante.
- DLC/Lei e Desordem: Pistoleiro, Magnata, Estrategista, Xerife, Ladrao, Vigarista.

Os guias de regras podem mudar de acordo com as cartas ativas. Por isso, textos condicionais sao importantes para evitar que o jogador leia regras sobre cartas que nao estao presentes no baralho.

## Guias dinamicos

O projeto passou a usar um sistema de guias dinamicos para substituir imagens estaticas de regras. A ideia e manter a aparencia visual das cartas de guia, mas gerar os textos de forma flexivel conforme:

- Cartas presentes no baralho.
- Cartas removidas.
- Idioma selecionado.
- Paginas especificas de personagens, resumo de turno e expansoes.
- Opcoes como mostrar cartas removidas esmaecidas ou remover totalmente.
- Centralizacao das cartas restantes quando alguma carta e removida.

Esse sistema reduz a necessidade de criar muitas imagens PNG para cada combinacao de idioma, carta removida ou regra alternativa.

## Assets importantes

Tipos de assets usados pelo projeto:

- Cartas dos personagens.
- Versos de cartas.
- Guias de regras.
- Template limpo para guias dinamicos.
- Imagens circulares de perfil dos personagens.
- Icones SVG.
- Imagens de religiao/asilo.
- Fontes customizadas.
- Sons de interface e partida.

Ao remover ou renomear assets, e importante pesquisar referencias no codigo antes, especialmente em arquivos de renderizacao, pre-carregamento, service worker e guias.

## Diretrizes para continuar o desenvolvimento

- Preservar o modelo estatico do projeto, a menos que haja decisao explicita de mudar a arquitetura.
- Evitar dependencias novas sem necessidade real.
- Manter textos em portugues do Brasil.
- Ao mexer em tela de jogo, testar visualmente em desktop e mobile.
- Ao alterar JavaScript, verificar sintaxe dos arquivos modificados.
- Ao mexer em assets, conferir referencias com busca no projeto.
- Ao mudar comportamento importante, atualizar documentacao.
- Evitar alterar o ranqueado diretamente sem testar primeiro no casual, quando a mudanca for experimental.

## Areas que merecem pesquisa futura

- Melhorar responsividade da mesa em telas pequenas.
- Consolidar o sistema de guias dinamicos e exportacao de variações.
- Expandir suporte a idiomas sem duplicar assets.
- Refinar pre-carregamento de assets para evitar imagens carregando diante do jogador.
- Melhorar paridade entre modo casual, ranqueado e Sala Personalizada.
- Revisar regras automatizadas para reduzir inconsistencias client-side.
- Versionar regras de seguranca do Firebase.
- Fortalecer testes do motor ranqueado e personalizado.

## Resumo rapido para uma IA

Coup Master e um jogo online de blefe e cartas, feito em HTML, CSS e JavaScript puro, usando Firebase para autenticacao e multiplayer. O projeto tem modo casual configuravel, modo ranqueado automatizado e Sala Personalizada. Grande parte do trabalho recente envolve modernizar a interface, criar guias dinamicos de regras, melhorar assets, pre-carregar imagens e manter os textos de regras coerentes com o baralho ativo.
