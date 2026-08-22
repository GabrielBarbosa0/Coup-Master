# Coup Master - Modo Ranqueado

Documento de design e regras para o **Modo Ranqueado** do Coup Master, um modo automatizado com conta Google, mesa de 6 jogadores, matchmaking simulado com bots IA e registro de estatísticas do jogador.

Este modo representa a base competitiva do projeto, mas ainda está em fase beta. A experiência já simula uma partida ranqueada completa, porém a pontuação ainda depende de validação client-side e não deve ser tratada como rating competitivo definitivo.

## Sumário

- [1. Visão Geral](#1-visão-geral)
- [2. Objetivo do Modo](#2-objetivo-do-modo)
- [3. Diferença Para a Sala Personalizada](#3-diferença-para-a-sala-personalizada)
- [4. Entrada e Matchmaking](#4-entrada-e-matchmaking)
- [5. Setup da Partida](#5-setup-da-partida)
- [6. Baralho Ranqueado](#6-baralho-ranqueado)
- [7. Fluxo de Turno](#7-fluxo-de-turno)
- [8. Ações Gerais](#8-ações-gerais)
- [9. Ações de Personagem](#9-ações-de-personagem)
- [10. Bloqueios](#10-bloqueios)
- [11. Contestações](#11-contestações)
- [12. Trocas e Investigação](#12-trocas-e-investigação)
- [13. Bots IA](#13-bots-ia)
- [14. Temporizadores e Fallbacks](#14-temporizadores-e-fallbacks)
- [15. Resultado e Pontuação](#15-resultado-e-pontuação)
- [16. Limitações Competitivas Atuais](#16-limitações-competitivas-atuais)
- [17. Próximos Passos Recomendados](#17-próximos-passos-recomendados)

## 1. Visão Geral

O Modo Ranqueado é uma mesa automatizada de Coup Master com regras controladas pelo sistema.

Diferente do modo casual, os jogadores não arrastam cartas livremente para resolver a partida por conta própria. O motor ranqueado controla turnos, ações disponíveis, custos, alvos, contestações, bloqueios, perdas de influência, trocas, investigação, eliminação e resultado.

No estado atual, o modo funciona como um ranqueado beta com bots IA. A sala de espera simula matchmaking: o jogador entra, aguarda alguns segundos, bots entram até preencher a mesa e a partida começa quando todos estão prontos.

## 2. Objetivo do Modo

O objetivo é ser o último jogador com influência viva.

Cada participante começa com 2 influências ocultas e 2 moedas. Ao perder uma influência, o jogador revela uma carta. Quando não possui mais influências ocultas, é eliminado.

A partida termina quando resta apenas 1 jogador vivo.

## 3. Diferença Para a Sala Personalizada

O Modo Ranqueado e a Sala Personalizada usam uma base parecida, mas têm propostas diferentes.

### Modo Ranqueado

- Usa `mode = "ranked"`.
- Usa `rankedState`.
- Exige conta Google.
- Não possui host ou administrador.
- Não permite configurar bots manualmente.
- Simula matchmaking automático com bots IA.
- Persiste resultados em `rankedResults`.
- Atualiza estatísticas do jogador em `rankedStats`.

### Sala Personalizada

- Usa `mode = "personalized"`.
- Usa `personalizedState`.
- Permite sala com amigos e bots.
- O criador pode remover jogadores durante a espera.
- Não gera pontos ranqueados.
- Não deve alterar vitórias, derrotas, conquistas ou estatísticas do ranqueado.

## 4. Entrada e Matchmaking

O jogador acessa o ranqueado pelo lobby usando conta Google.

Visitantes anônimos não podem criar nem entrar em salas ranqueadas.

Ao criar ou entrar em uma sala ranqueada, o jogador vai primeiro para `ranked/ranked-waiting.html`.

### Matchmaking simulado

O matchmaking atual é uma simulação local/client-side usando bots IA.

O sistema preenche a mesa até 6 jogadores:

- 1 jogador real;
- até 5 bots IA;
- todos os bots aparecem marcados como IA.

Os bots entram em intervalos aleatórios de 1 a 2 segundos para criar uma sensação mais orgânica.

Assim que um bot entra, ele recebe seu próprio tempo aleatório para confirmar prontidão. Isso significa que bots podem ficar prontos enquanto outros bots ainda estão entrando na sala, simulando melhor o comportamento humano em uma espera real.

A ordem de prontidão não segue a ordem visual dos slots: cada bot confirma em um momento próprio.

Quando um bot confirma prontidão, ele não desmarca pronto automaticamente.

### Prontidão

O jogador real ainda precisa clicar em **Estou pronto**.

A partida só agenda o início quando:

- a mesa está cheia;
- todos os bots estão prontos;
- o jogador real está pronto.

Depois disso, o sistema inicia uma contagem de 5 segundos antes de começar a partida.

## 5. Setup da Partida

Quando todos estão prontos e a contagem termina, o motor:

1. cria o baralho ranqueado;
2. define a ordem dos jogadores;
3. sorteia visualmente quem começa;
4. distribui 2 influências para cada jogador;
5. entrega 2 moedas para cada jogador;
6. muda a partida para a fase de turno.

### Sorteio de primeiro jogador

Antes do primeiro turno, existe uma fase visual de sorteio.

O sistema destaca os candidatos e revela quem será o primeiro jogador apenas no fim da animação.

## 6. Baralho Ranqueado

O baralho ranqueado usa 6 personagens:

- Duque;
- Capitão;
- Assassino;
- Condessa;
- Embaixador;
- Inquisidor.

Cada personagem possui 5 cópias.

Total do baralho:

- 6 personagens;
- 5 cópias de cada;
- 30 cartas.

### Regra de distribuição inicial

Na distribuição inicial, o motor evita entregar Embaixador como influência inicial.

Embaixadores continuam existindo no baralho e podem aparecer depois por compra, troca ou outros efeitos posteriores.

## 7. Fluxo de Turno

Durante o turno, o jogador ativo escolhe uma ação.

Dependendo da ação, o sistema pode abrir uma janela para:

- contestar a declaração;
- declarar bloqueio;
- contestar o bloqueio;
- escolher influência perdida;
- escolher cartas em uma troca;
- concluir uma investigação.

Quando a ação termina, o turno passa para o próximo jogador vivo.

## 8. Ações Gerais

### Renda

Receba 1 moeda.

Não pode ser bloqueada.

Não pode ser contestada.

### Ajuda Externa

Receba 2 moedas.

Não exige personagem.

Pode ser bloqueada por qualquer jogador que declare Duque.

### Golpe de Estado

Pague 7 moedas e escolha um alvo para perder 1 influência.

Não pode ser bloqueado.

Não pode ser contestado.

### Golpe Obrigatório

Se o jogador possui 10 moedas ou mais, ele é obrigado a usar Golpe de Estado.

Nesse caso, o motor bloqueia outras ações.

## 9. Ações de Personagem

### Duque - Taxar

Declare Duque e receba 3 moedas.

Pode ser contestado.

Não pode ser bloqueado.

### Capitão - Extorquir

Declare Capitão e escolha um alvo.

Roube até 2 moedas do alvo.

Pode ser contestado.

Pode ser bloqueado com Capitão por qualquer jogador.

Também pode ser bloqueado pelo alvo com Embaixador ou Inquisidor.

### Assassino - Assassinar

Declare Assassino, pague 3 moedas e escolha um alvo.

Se a ação for bem-sucedida, o alvo perde 1 influência.

Pode ser contestado.

Pode ser bloqueado pelo alvo com Condessa.

### Embaixador - Trocar

Declare Embaixador.

Compre 2 cartas do baralho, combine com suas influências ocultas e escolha quais influências manter.

Depois disso, as cartas não escolhidas voltam para o baralho e são embaralhadas.

Pode ser contestado.

Não pode ser bloqueado.

### Inquisidor - Trocar

Declare Inquisidor.

No estado atual do motor, a troca do Inquisidor usa o mesmo fluxo de troca do Embaixador.

Pode ser contestado.

Não pode ser bloqueado.

### Inquisidor - Investigar

Declare Inquisidor e escolha um alvo.

O sistema revela ao jogador ativo uma influência oculta aleatória do alvo.

O jogador ativo pode decidir se força ou não a troca daquela influência.

Pode ser contestado.

Não pode ser bloqueado.

## 10. Bloqueios

Bloqueios são respostas contra ações específicas.

### Ajuda Externa

Pode ser bloqueada por qualquer jogador que declare Duque.

### Extorsão

Pode ser bloqueada por qualquer jogador que declare Capitão.

O alvo da Extorsão também pode declarar:

- Capitão;
- Embaixador;
- Inquisidor.

### Assassinato

Pode ser bloqueado apenas pelo alvo do Assassinato.

O alvo pode declarar Condessa.

### Golpe de Estado

Não pode ser bloqueado.

## 11. Contestações

Ações de personagem e bloqueios podem ser contestados.

Quando um jogador contesta, o sistema verifica se o jogador contestado possui a influência declarada.

### Contestação incorreta

Se o jogador contestado realmente possui a carta declarada:

1. ele prova a influência;
2. a carta comprovada é trocada por uma nova carta do baralho;
3. o desafiante perde 1 influência;
4. a ação ou bloqueio continua conforme o caso.

### Contestação correta

Se o jogador contestado não possui a carta declarada:

1. o blefe é revelado;
2. o jogador contestado perde 1 influência;
3. a ação blefada é cancelada ou o bloqueio blefado falha, conforme o contexto.

## 12. Trocas e Investigação

### Troca

Na troca, o jogador combina suas influências ocultas com cartas compradas do baralho.

Ele deve manter a mesma quantidade de influências ocultas que tinha antes da troca.

Cartas não escolhidas voltam para o baralho.

### Investigação

Na investigação, o Inquisidor olha uma carta oculta aleatória do alvo.

Depois disso, o jogador ativo decide se mantém a carta do alvo ou força uma troca.

Se a troca for forçada, a carta investigada volta ao baralho e o alvo recebe uma nova carta.

## 13. Bots IA

Bots IA são usados no ranqueado atual para simular uma fila competitiva e permitir partidas solo contra adversários automatizados.

Cada bot possui:

- nome sorteado;
- foto padrão de robô;
- `ai = true`;
- `connected = true`;
- personalidade própria;
- histórico de ressentimento contra jogadores que o prejudicaram.

### Personalidade

A personalidade do bot usa três atributos de 0 a 100.

#### Vingança

Aumenta a chance do bot mirar jogadores que o prejudicaram.

#### Honestidade

Quanto maior a honestidade, menor a chance do bot blefar.

#### Ceticismo

Quanto maior o ceticismo, maior a chance do bot contestar declarações e bloqueios.

Também altera a tolerância do bot a riscos, como aceitar Ajuda Externa quando acredita que existe Duque na mesa.

### Decisões automáticas

Os bots tomam decisões por transação durante:

- turno;
- resposta a ação;
- contestação de bloqueio;
- escolha de influência perdida;
- troca;
- investigação.

As decisões possuem pequenos atrasos para evitar que o fluxo avance instantaneamente.

## 14. Temporizadores e Fallbacks

O ranqueado usa temporizadores para impedir que a partida fique travada.

### Tempos atuais

- Contagem de início: 5 segundos.
- Sorteio inicial: 5 segundos.
- Turno: 40 segundos.
- Resposta, bloqueio ou contestação: 15 segundos.
- Escolhas obrigatórias: 20 segundos.

### Fallbacks

Se o tempo acabar:

- turno sem ação vira Renda, exceto quando Golpe de Estado é obrigatório;
- resposta sem decisão vira passe;
- bloqueio sem contestação é aceito;
- perda de influência escolhe uma carta oculta disponível;
- troca escolhe cartas automaticamente;
- investigação é concluída sem forçar troca.

## 15. Resultado e Pontuação

Ao final da partida, o sistema registra o resultado e calcula uma pontuação de desempenho.

O resultado considera:

- vitória ou derrota;
- ações realizadas;
- blefes;
- blefes revelados;
- bloqueios aceitos;
- contestações vencidas;
- contestações perdidas;
- golpes de estado;
- assassinatos;
- roubos;
- moedas roubadas;
- influências preservadas;
- eliminação.

### Dados persistidos

O ranqueado grava:

- `rankedResults/{resultKey}`: resultado da partida;
- `rankedStats/{uid}`: estatísticas acumuladas do jogador;
- `rankedStats/{uid}/countedRooms/{resultKey}`: controle para evitar contagem duplicada.

Esses dados alimentam o perfil ranqueado exibido no lobby.

### Sala Personalizada não pontua

Partidas da Sala Personalizada não devem gravar em `rankedStats` nem em `rankedResults`.

## 16. Limitações Competitivas Atuais

O ranqueado atual ainda não deve ser considerado competitivo real.

Principais limitações:

- as influências secretas ficam no Firebase Realtime Database e podem ser inspecionadas por cliente modificado;
- as transições são feitas por clientes conectados, não por servidor autoritativo;
- as estatísticas são persistidas pelo próprio cliente;
- ainda não existe leaderboard mundial confiável;
- ainda não existe matchmaking público real entre jogadores humanos;
- os bots IA são experimentais e ainda podem precisar de balanceamento.

As transações reduzem conflitos acidentais, mas não substituem validação autoritativa.

## 17. Próximos Passos Recomendados

### Curto prazo

- Refinar comportamento dos bots por personalidade.
- Ajustar textos da sala de espera para deixar claro que o ranqueado atual usa bots IA.
- Melhorar feedback visual de progresso do matchmaking.
- Revisar se o Inquisidor deve ter troca diferente do Embaixador no ranqueado.
- Validar se a regra de evitar Embaixador na mão inicial deve permanecer.

### Médio prazo

- Versionar regras do Firebase.
- Separar ranking beta de ranking competitivo real.
- Criar histórico de partidas no perfil.
- Adicionar conquistas específicas do ranqueado.
- Criar critérios mínimos para uma partida contar como válida.

### Longo prazo

- Mover validação de regras para backend autoritativo.
- Proteger influências secretas fora do cliente.
- Criar matchmaking público real.
- Criar leaderboard confiável.
- Implementar temporadas, ligas ou divisões.
- Separar claramente Ranqueado com Bots, Ranqueado Humano e Sala Personalizada.
