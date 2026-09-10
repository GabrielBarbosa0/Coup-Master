# Plano de Lancamento Oficial do Coup Master

Atualizado em: 2026-09-10.

Este documento organiza o que precisa existir antes de divulgar o Coup Master oficialmente. A ideia central e lancar uma experiencia social, bonita e facil de entender, sem vender o modo ranqueado como pronto antes da hora.

## 1. Direcao Do Lancamento

### Objetivo

Lancar o Coup Master como um projeto indie, gratuito e sem fins lucrativos, focado em partidas online com amigos, expansoes, regras alternativas e uma mesa casual flexivel.

### Versao Recomendada Para O Lancamento

**Coup Master v1 deve vender a experiencia casual.**

O melhor recorte para o primeiro lancamento publico e:

- modo casual como experiencia principal;
- tutorial simples para ensinar o fluxo basico;
- guias de regras bem apresentados;
- sistema de regras alternativas funcionando e sincronizado;
- formulario de feedback discreto e escuro;
- landing page, SEO, favicon e imagens sociais revisados;
- trailer curto e primeiros cortes para redes sociais.

O modo ranqueado pode ficar oculto, marcado como beta fechado ou exibido como "em breve". Do jeito atual, ele ainda parece cru demais para ser o centro da divulgacao oficial.

## 2. Decisoes De Produto

### Modo Casual Como Mesa Principal

O modo casual deve ser tratado como a mesa oficial do lancamento. Ele ja tem a principal promessa do Coup Master: abrir uma sala, chamar amigos e jogar sem instalacao.

Prioridades:

- melhorar a sensacao visual da mesa;
- reduzir elementos que parecam prototipo;
- deixar os controles de moedas mais agradaveis;
- manter a simplicidade que ja funciona;
- garantir que tudo esteja confortavel no celular.

### Modo Ranqueado Fora Do Lancamento Principal

O ranqueado ainda precisa de polimento de interface, confianca tecnica e clareza de regras. Para o lancamento oficial, o ideal e:

- esconder o botao do ranqueado temporariamente; ou
- exibir como "Ranqueado em breve"; ou
- manter como beta, mas sem destaque na landing page.

O ranking nao deve ser vendido como competitivo de verdade enquanto os resultados ainda dependerem muito do cliente e enquanto a experiencia ainda parecer experimental.

### Aviso De Experiencia Inicial No Ranqueado E Personalizado

Se o modo ranqueado ou a Sala Personalizada continuarem acessiveis no lancamento, eles devem exibir um aviso claro antes da entrada na partida.

A ideia visual pode seguir uma linguagem de "area em obras":

- faixa ou cabecalho com amarelo e preto;
- icone de alerta;
- texto curto e direto;
- botao para continuar mesmo assim;
- botao para voltar ao lobby ou escolher modo casual;
- opcao de nao mostrar novamente apenas para a sessao atual, se fizer sentido.

Texto sugerido:

> Esta ainda e uma experiencia inicial. Voce pode encontrar bugs, travamentos, regras incompletas ou resultados que nao sejam computados corretamente. Para uma partida mais estavel, recomendamos jogar no modo casual.

Esse aviso deve aparecer especialmente quando:

- o jogador tenta entrar no ranqueado;
- o jogador tenta entrar na Sala Personalizada automatizada;
- uma partida beta pode afetar estatisticas, conquistas ou historico;
- bots, regras automatizadas ou matchmaking ainda estiverem em teste.

### Sala Personalizada Como Caminho Futuro

A Sala Personalizada pode virar, no futuro, o modo mais interessante para jogar com amigos usando regras automatizadas, bots e baralhos diferentes. Para o lancamento v1, ela pode ficar como recurso secundario ou beta, se estiver estavel.

## 3. Tutorial Do Jogo

### Tutorial Minimo Para Lancar

Criar um tutorial jogavel, preferencialmente com NPC, que ensine o jogador sem depender de texto demais.

Fluxo sugerido:

1. Entrar em uma mesa tutorial.
2. Mostrar as duas influencias do jogador.
3. Ensinar Renda.
4. Ensinar Ajuda Externa e bloqueio.
5. Ensinar uma acao de personagem, como Taxar.
6. Ensinar Assassinato ou Extorsao.
7. Ensinar contestacao.
8. Ensinar Golpe de Estado.
9. Terminar com convite para criar uma sala casual.

### Tutorial Com NPC

O NPC nao precisa ser uma IA completa. Ele pode ser um personagem guiado por roteiro, com falas curtas e acoes previsiveis.

Requisitos:

- destacar visualmente o botao ou carta que o jogador precisa usar;
- impedir que o jogador fique perdido;
- permitir pular tutorial;
- salvar `tutorialSeen` por usuario ou navegador;
- permitir abrir o tutorial novamente pelas configuracoes ou pelo guia.

### Tutorial Para Divulgacao

Criar tambem uma versao curta do tutorial em video:

- 30 a 60 segundos;
- mostrar mesa, blefe, contestacao e golpe;
- terminar com chamada para jogar no navegador.

## 4. Melhorias Na Mesa Casual

### Visual Geral

O modo casual ainda precisa parecer mais "mesa de jogo" e menos painel tecnico.

Checklist:

- revisar espacamentos entre slots, baralho, asilo e area central;
- melhorar contraste sem deixar a tela pesada demais;
- dar mais presenca ao baralho, descarte/asilo e area de cartas livres;
- padronizar bordas neon azuis, hover e estados ativos;
- revisar mobile em 407px de largura e desktop largo;
- garantir que modais nao escondam informacoes importantes da mesa.

### Contadores De Moedas

O controle atual de `-`, numero e `+` e funcional, mas visualmente simples demais. Ele deve continuar existindo ou ser substituido por algo que preserve a mesma clareza.

Opcoes:

**Opcao A - Polir O Controle Atual**

Manter os botoes `-` e `+`, mas redesenhar como um controle mais integrado ao slot do jogador.

Ideias:

- usar icones mais discretos;
- reduzir o amarelo forte;
- criar uma pequena peca visual de moeda no centro;
- alinhar melhor com avatar e nome;
- adicionar brilho/feedback ao alterar moedas;
- usar tooltip ou label acessivel.

Vantagem: mais seguro para lancar rapido.

Risco: continua menos imersivo.

**Opcao B - Tesouro Central Com Moedas Arrastaveis**

Criar um Tesouro Central visual no centro da mesa, onde moedas de prata podem ser arrastadas para jogadores, asilo ou banco.

Ideias:

- moedas com movimento parecido com cartas;
- animacao ao ganhar ou perder moedas;
- pilhas pequenas de moedas por jogador;
- arrastar do Tesouro para um jogador para adicionar;
- arrastar de um jogador para o Tesouro para devolver;
- toque/click como alternativa no mobile.

Vantagem: muito mais bonito e memoravel.

Risco: pode piorar a usabilidade se substituir completamente o controle simples.

**Opcao C - Modelo Hibrido Recomendado**

Manter o contador simples como fonte confiavel e criar o Tesouro Central como camada visual/interativa opcional.

Para o lancamento, esta parece a melhor escolha:

- o jogador ainda consegue corrigir moedas com facilidade;
- a mesa fica mais viva;
- o sistema nao depende 100% de drag and drop;
- no mobile da para usar toque sem perder precisao.

## 5. Regras Alternativas

### Objetivo

Transformar as regras alternativas em uma mecanica real da mesa, nao apenas uma imagem de guia.

### Fluxo Sugerido

1. O host abre o modal de regras alternativas.
2. O host seleciona ate 5 regras permitidas para a partida.
3. O jogo sorteia uma ou mais regras entre as selecionadas.
4. O resultado e salvo no estado da sala.
5. Todos os jogadores veem o mesmo resultado.
6. O texto do modal `modal-actions-and-rules` atualiza para refletir as regras sorteadas.

### Integracao Com O Lab

O `alternative-rules-translation-lab.html` ja serve como base para:

- validar textos em portugues e ingles;
- testar paginacao;
- testar titulo, subtitulo e espacamento;
- preparar o conteudo para virar dado estruturado;
- reaproveitar o layout no modal real.

### Implementacao Recomendada

Criar uma fonte unica de dados para regras alternativas:

- `id`;
- nome em portugues;
- nome em ingles;
- texto em portugues;
- texto em ingles;
- categoria;
- nivel de impacto;
- incompatibilidades;
- quantidade maxima recomendada.

Depois, usar essa mesma fonte para:

- lab de traducao;
- modal de regras;
- sorteador do host;
- resumo mostrado aos jogadores;
- futura documentacao.

### Regras Alternativas E Presets

Alguns presets de baralho podem sugerir regras alternativas automaticamente.

Exemplos:

- Base classico: nenhuma regra alternativa.
- Jogo caotico: sortear 3 regras.
- Expansoes leves: sortear 1 ou 2 regras.
- Mesa experiente: permitir ate 5 regras.

## 6. Modal De Configuracoes

### Simplificar Para O Lancamento

O modal de configuracoes pode ficar mais limpo removendo controles que hoje parecem internos ou experimentais.

Acoes recomendadas:

- esconder `Bot de Teste`;
- esconder `Compatibilidade`, se o modo padrao ja estiver seguro;
- manter Musica;
- manter Efeitos;
- manter Idioma;
- manter Religiao, se continuar relevante;
- manter Configurar Baralho;
- revisar alinhamento do botao de fechar com o mesmo padrao dos outros modais.

### Controles Experimentais

Controles tecnicos podem continuar no codigo, mas escondidos por:

- flag de desenvolvimento;
- parametro na URL;
- atalho de debug;
- ou `display: none` ate serem necessarios.

## 7. Presets De Baralho

### Problema Atual

O sistema de presets funciona, mas ainda pode parecer tecnico ou pouco convidativo para novos jogadores.

### Melhorias Recomendadas

- exibir cards de preset com nome, descricao e quantidade de cartas;
- mostrar quais personagens entram em cada preset;
- destacar preset recomendado;
- separar presets oficiais, experimentais e testes;
- esconder "Modo Teste" do jogador comum;
- permitir salvar um preset customizado localmente;
- permitir duplicar um preset para editar;
- exibir aviso quando o preset cria combinacoes estranhas.

### Presets Sugeridos Para Lancamento

**Base**

Baralho classico com Duque, Assassino, Capitao, Condessa e Embaixador/Inquisidor conforme a escolha do projeto.

**Base + Promos**

Inclui personagens promocionais ja adaptados.

**Lei e Desordem**

Preset tematico com personagens da expansao do Coup Master.

**Caos Controlado**

Preset para testar regras alternativas e personagens mais imprevisiveis.

**Mesa Experimental**

Preset escondido ou marcado como beta, usado para cartas em teste.

## 8. Feedback E Comunidade

### Formulario De Feedback

O formulario proprio com FormSpark e um bom caminho para evitar o problema visual do Tally.

Checklist:

- manter formulario escuro;
- manter botao de fechar padronizado;
- validar envio em desktop e mobile;
- mostrar estado de carregamento;
- mostrar sucesso sem abrir uma pagina externa feia;
- salvar pagina, sala e jogador quando possivel;
- separar tipo "Bug" e "Sugestao de Carta".

### Canais De Comunidade

Antes de divulgar, decidir quais canais serao oficiais:

- YouTube;
- TikTok;
- Instagram;
- Discord ou grupo de comunidade;
- e-mail ou formulario para contato.

### Coleta De Feedback

Criar categorias para feedback:

- bug visual;
- bug de regra;
- problema no celular;
- sugestao de personagem;
- sugestao de regra alternativa;
- balanceamento;
- divulgacao/video.

## 9. Trailer E Conteudo De Divulgacao

### Trailer Principal

Criar um trailer curto, com 30 a 45 segundos.

Roteiro sugerido:

1. Abrir com uma mesa online e amigos entrando.
2. Mostrar cartas secretas.
3. Mostrar alguem taxando, roubando ou blefando.
4. Mostrar contestacao.
5. Mostrar uma eliminacao ou golpe.
6. Mostrar regras alternativas ou expansoes.
7. Fechar com "jogue no navegador" e o endereco do site.

Tom:

- rapido;
- divertido;
- com cortes de reacao;
- mais focado em momentos sociais do que em explicar todas as regras.

### Gameplays Para YouTube

Criar pelo menos 2 videos maiores:

- "Como jogar Coup Master";
- "Primeira gameplay com amigos";
- "Melhores blefes e traicoes";
- "Testando regras alternativas".

### Shorts, TikTok E Reels

Criar uma primeira leva de 10 a 20 cortes curtos.

Ideias:

- alguem mentindo descaradamente;
- contestacao que da errado;
- jogador tentando convencer todo mundo;
- golpe absurdo;
- final de partida inesperado;
- regra alternativa causando caos;
- meme com "eu juro que tenho Duque";
- antes/depois da mesa com expansoes.

### Capturas Necessarias

- video desktop da mesa cheia;
- video mobile;
- screenshot da landing page;
- screenshot da mesa casual;
- screenshot do modal de regras;
- screenshot do tutorial;
- screenshot do sorteio de regras alternativas;
- thumbnail com logo quadrado do Coup Master.

## 10. Landing Page, SEO E Identidade

### Landing Page

Antes do lancamento, revisar:

- primeira dobra com o nome Coup Master claro;
- botao principal para jogar;
- explicacao curta do que e o jogo;
- imagens reais da mesa;
- destaque para jogar com amigos;
- destaque para expansoes e regras alternativas;
- aviso claro se ranqueado estiver indisponivel;
- link para privacidade e termos.

### Favicon E Imagens Sociais

Confirmar:

- favicon das paginas usando `favicon-coup-master-circulo`;
- imagem de Google/social usando `favicon-coup-master`;
- proporcao quadrada nas imagens de preview;
- cache atualizado no service worker;
- metatags `og:image` e `twitter:image` coerentes.

### Descricao Curta

Texto base sugerido:

> Coup Master e uma mesa online gratuita para jogar Coup com amigos no navegador, com baralhos customizaveis, expansoes e regras alternativas.

### Cuidado Com Marca E Referencias

Como o projeto se inspira em Coup, Coup Rebellion, Coup Disney e outras referencias, o lancamento deve evitar:

- usar artes oficiais de terceiros;
- usar nomes de personagens protegidos;
- copiar textos oficiais de regras;
- sugerir afiliacao com editoras ou franquias;
- usar personagens Disney ou visual parecido.

O caminho mais seguro e tratar as mecanicas como inspiracao, mas criar nomes, artes, textos e identidade proprios do Coup Master.

## 11. Checklist Tecnico Antes Do Lancamento

### Estabilidade

- testar criacao de sala;
- testar entrada por codigo;
- testar saida e reconexao;
- testar host ausente;
- testar 2, 4, 6 e 8 jogadores;
- testar mobile com toque e arraste;
- testar desktop com mouse;
- testar navegadores principais;
- testar PWA instalado;
- testar refresh durante partida;
- testar sala antiga.

### Firebase E Dados

- revisar regras de seguranca do Firebase;
- garantir que usuarios nao consigam alterar dados sensiveis fora do fluxo esperado;
- preservar `rankedStats` e `rankedResults` em limpezas;
- limitar escritas destrutivas;
- revisar limpeza de salas antigas;
- criar backup antes da divulgacao oficial.

### Interface

- revisar todos os modais;
- padronizar botoes de fechar;
- padronizar botoes primarios e secundarios;
- criar aviso visual de experiencia inicial para ranqueado e Sala Personalizada;
- deixar claro quando estatisticas, conquistas ou resultados podem nao ser computados;
- garantir texto sem overflow;
- garantir que botoes sejam confortaveis no celular;
- revisar contraste;
- revisar estados de loading;
- revisar mensagens de erro;
- revisar foco de teclado nos modais.

### Performance

- revisar peso das imagens;
- confirmar cache do service worker;
- confirmar versao de cache depois de trocar assets;
- testar carregamento em rede lenta;
- evitar que a mesa pisque ou recarregue elementos demais.

## 12. Checklist De Conteudo

Antes da divulgacao oficial, preparar:

- trailer principal;
- video curto de tutorial;
- 2 gameplays para YouTube;
- 10 a 20 cortes verticais;
- screenshots oficiais;
- miniaturas para YouTube;
- capa para redes sociais;
- texto curto para bio;
- post de lancamento;
- thread/post explicando como jogar;
- chamada para feedback;
- pagina ou secao com creditos.

## 13. Ordem Recomendada De Trabalho

### Fase 1 - Fechar Produto Do Lancamento

- decidir que o modo casual e o foco;
- esconder ou reduzir destaque do ranqueado;
- adicionar aviso beta no ranqueado e na Sala Personalizada, caso continuem acessiveis;
- simplificar configuracoes;
- melhorar presets de baralho;
- finalizar formulario de feedback;
- revisar favicon, SEO e imagens sociais.

### Fase 2 - Melhorar Experiencia Da Mesa

- redesenhar contadores de moedas;
- testar modelo hibrido com Tesouro Central;
- melhorar area central da mesa;
- revisar mobile;
- padronizar modais e botoes.

### Fase 3 - Ensinar O Jogo

- criar tutorial com NPC ou roteiro guiado;
- permitir pular e rever tutorial;
- criar video curto de tutorial;
- revisar textos de ajuda.

### Fase 4 - Regras Alternativas

- transformar regras alternativas em dados estruturados;
- conectar sorteio ao estado da sala;
- atualizar `modal-actions-and-rules` para todos os jogadores;
- testar portugues e ingles;
- testar combinacoes de 1 a 5 regras.

### Fase 5 - Conteudo E Divulgacao

- gravar trailer;
- gravar gameplays;
- editar cortes curtos;
- preparar posts;
- preparar thumbnails;
- organizar chamada para feedback.

### Fase 6 - Playtest Fechado

- chamar amigos para testar;
- gravar bugs e momentos bons;
- observar confusao de jogadores novos;
- medir se o tutorial resolve duvidas;
- ajustar mesa casual antes do anuncio publico.

### Fase 7 - Lancamento Publico

- publicar post principal;
- soltar trailer;
- publicar os primeiros cortes;
- acompanhar feedback nos primeiros dias;
- corrigir bugs criticos rapido;
- manter o ranqueado fora do centro ate estar pronto.

## 14. Definicao De Pronto Para Lancar

O Coup Master esta pronto para divulgar oficialmente quando:

- uma pessoa nova consegue criar sala e jogar sem voce explicar tudo ao vivo;
- a mesa casual parece intencional e agradavel;
- o controle de moedas continua simples, mas nao parece improvisado;
- o tutorial ensina o basico;
- o formulario de feedback funciona e combina visualmente com o jogo;
- as regras alternativas estao claras e sincronizadas;
- o ranqueado nao cria expectativa errada;
- ranqueado e Sala Personalizada exibem aviso beta claro se continuarem acessiveis;
- mobile esta aceitavel;
- trailer e primeiros cortes estao prontos;
- a landing page mostra o jogo real, nao so promessa.

## 15. Ideias Extras Para Considerar

- Criar um botao "Copiar convite" mais chamativo depois de criar sala.
- Mostrar um resumo da sala antes de entrar: modo, idioma, baralho e regras alternativas.
- Criar um pequeno historico visual de acoes recentes no casual.
- Criar animacoes leves para moeda recebida, carta comprada e carta descartada.
- Adicionar um modo espectador mais claro para quem so quer assistir.
- Criar uma tela "mesa cheia" mais elegante.
- Criar um aviso amigavel quando a sala expirar.
- Criar um modo "mesa rapida" com preset recomendado e sem configuracao manual.
- Criar um painel simples de creditos e contribuicoes.
- Separar cartas experimentais das cartas prontas para divulgacao.
