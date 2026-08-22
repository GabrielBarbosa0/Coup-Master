# Coup Master - Sala Personalizada

Documento de design e regras para a **Sala Personalizada** do Coup Master, um modo automatizado derivado da base ranqueada, mas voltado para partidas controladas com amigos, bots IA e testes de mesa.

Este modo existe para separar a experiência social/customizável da experiência ranqueada. Ele usa regras automatizadas, mas não gera pontos, vitórias, derrotas ou conquistas do modo ranqueado.

## Sumário

- [1. Visão Geral](#1-visão-geral)
- [2. Objetivo do Modo](#2-objetivo-do-modo)
- [3. Diferença Para o Ranqueado](#3-diferença-para-o-ranqueado)
- [4. Entrada e Convite](#4-entrada-e-convite)
- [5. Papel do Criador da Sala](#5-papel-do-criador-da-sala)
- [6. Jogadores e Bots IA](#6-jogadores-e-bots-ia)
- [7. Setup da Partida](#7-setup-da-partida)
- [8. Baralho e Regras de Mesa](#8-baralho-e-regras-de-mesa)
- [9. Fluxo de Turno](#9-fluxo-de-turno)
- [10. Ações e Bloqueios](#10-ações-e-bloqueios)
- [11. Contestações](#11-contestações)
- [12. Temporizadores e Fallbacks](#12-temporizadores-e-fallbacks)
- [13. Resultado da Partida](#13-resultado-da-partida)
- [14. Limitações Atuais](#14-limitações-atuais)
- [15. Próximos Passos Recomendados](#15-próximos-passos-recomendados)

## 1. Visão Geral

A Sala Personalizada é uma versão controlável do fluxo automatizado usado no ranqueado.

Ela foi criada como um modo separado para permitir partidas com amigos, bots e testes sem alterar o comportamento do Modo Ranqueado.

Na prática, ela funciona como uma sala automatizada de Coup Master:

- o sistema controla turnos;
- o sistema valida ações;
- o sistema resolve contestações e bloqueios;
- o sistema distribui cartas;
- o sistema detecta eliminação;
- o sistema encerra a partida quando sobra apenas um jogador.

A diferença principal é que a sala possui um criador com permissões de organização durante a espera.

## 2. Objetivo do Modo

O objetivo da partida é ser o último jogador com influência viva.

Cada participante começa com 2 influências ocultas e 2 moedas.

Quando perde uma influência, o jogador revela uma de suas cartas. Quando não possui mais influências ocultas, é eliminado.

A partida termina quando resta apenas 1 jogador vivo.

## 3. Diferença Para o Ranqueado

A Sala Personalizada usa a mesma base automatizada do ranqueado, mas tem outra finalidade.

### Sala Personalizada

- Usa `mode = "personalized"`.
- Usa `personalizedState`.
- Permite convidar amigos.
- Permite adicionar bots manualmente.
- Permite remover jogadores ou bots durante a espera.
- Possui criador da sala salvo em `hostUID`.
- Não gera estatísticas ranqueadas.
- Não grava resultado em `rankedResults`.
- Não altera `rankedStats`.

### Modo Ranqueado

- Usa `mode = "ranked"`.
- Usa `rankedState`.
- Não possui host.
- Não possui controles administrativos.
- Preenche a sala por matchmaking simulado com bots IA.
- Pode registrar resultado e estatísticas ranqueadas.

## 4. Entrada e Convite

A Sala Personalizada é criada pelo lobby.

O jogador precisa estar autenticado com conta Google.

Visitantes anônimos não podem criar nem entrar na Sala Personalizada.

Ao criar uma Sala Personalizada, o lobby salva:

- código da sala;
- `mode = "personalized"`;
- `hostUID` com o UID do criador;
- estado da sala em `salas/{roomCode}/personalizedState`.

A tela de espera é `personalized/personalized-waiting.html`.

Quando a partida começa, a mesa ativa é `personalized/personalized.html`.

### QR Code e código da sala

A sala de espera exibe o código da sala e QR Code de convite.

O QR Code aponta para:

```text
personalized/personalized-waiting.html?room={codigo}
```

## 5. Papel do Criador da Sala

O criador da sala funciona como organizador da espera.

Ele não controla as regras internas da partida, mas pode gerenciar quem permanece na sala antes do início.

### Permissões do criador

Durante a espera, o criador pode:

- adicionar bots IA;
- remover bots IA;
- remover jogadores humanos;
- iniciar a partida quando todos estiverem prontos.

### Restrições

O criador não pode:

- remover a si mesmo pelo modal de remoção;
- remover jogadores depois que a partida começou;
- alterar resultado final;
- editar pontuação ranqueada;
- transformar a partida em ranqueada.

Para sair da própria sala, o criador deve usar o botão de sair.

## 6. Jogadores e Bots IA

A Sala Personalizada aceita até 6 participantes.

Os participantes podem ser:

- jogadores humanos convidados;
- bots IA adicionados manualmente pelo criador.

### Adição de bots

O criador pode abrir o modal **Adicionar bot**.

Nesse modal, ele pode:

- definir nome do bot;
- sortear nome aleatório;
- escolher personalidade manualmente;
- deixar o sistema gerar personalidade automaticamente.

Bots entram prontos por padrão.

### Remoção de jogadores e bots

Durante a espera, o criador pode abrir o modal de remoção e confirmar a expulsão de um jogador ou bot.

Quando alguém é removido:

- o participante sai de `personalizedState.players`;
- o log registra a remoção;
- a contagem de prontidão é recalculada;
- a interface toca o som de impacto usado para expulsão.

## 7. Setup da Partida

Quando todos os participantes estão prontos, a sala agenda uma contagem de 5 segundos.

Após a contagem, o motor:

1. cria o baralho;
2. define a ordem dos jogadores;
3. sorteia visualmente quem começa;
4. distribui 2 influências para cada jogador;
5. entrega 2 moedas para cada jogador;
6. inicia a fase de turno.

### Quantidade mínima

A partida pode começar com pelo menos 2 jogadores.

### Quantidade máxima

A sala suporta até 6 jogadores.

## 8. Baralho e Regras de Mesa

A Sala Personalizada usa o baralho automatizado base:

- Duque;
- Capitão;
- Assassino;
- Condessa;
- Embaixador;
- Inquisidor.

Cada personagem possui 5 cópias.

Total:

- 6 personagens;
- 5 cópias por personagem;
- 30 cartas.

### Distribuição inicial

Assim como no ranqueado, o motor evita entregar Embaixador como influência inicial.

Embaixadores permanecem no baralho e podem aparecer depois por compra, troca ou efeitos posteriores.

## 9. Fluxo de Turno

O jogador ativo escolhe uma ação disponível.

O sistema valida:

- se o jogador está vivo;
- se é o turno correto;
- se o alvo é válido;
- se o jogador possui moedas suficientes;
- se Golpe de Estado é obrigatório.

Depois da ação, o sistema pode abrir janelas para resposta, bloqueio, contestação ou escolha obrigatória.

Quando a ação termina, o turno passa para o próximo jogador vivo.

## 10. Ações e Bloqueios

### Ações gerais

#### Renda

Receba 1 moeda.

Não pode ser bloqueada ou contestada.

#### Ajuda Externa

Receba 2 moedas.

Pode ser bloqueada por qualquer jogador que declare Duque.

#### Golpe de Estado

Pague 7 moedas e escolha um alvo para perder 1 influência.

Não pode ser bloqueado ou contestado.

Com 10 moedas ou mais, o Golpe de Estado é obrigatório.

### Ações de personagem

#### Duque - Taxar

Declare Duque e receba 3 moedas.

Pode ser contestado.

#### Capitão - Extorquir

Declare Capitão e roube até 2 moedas de um alvo.

Pode ser contestado.

Pode ser bloqueado com Capitão por qualquer jogador.

Também pode ser bloqueado pelo alvo com Embaixador ou Inquisidor.

#### Assassino - Assassinar

Declare Assassino, pague 3 moedas e escolha um alvo.

Se a ação resolver, o alvo perde 1 influência.

Pode ser contestado.

Pode ser bloqueado pelo alvo com Condessa.

#### Embaixador - Trocar

Declare Embaixador e reorganize suas influências com cartas compradas do baralho.

Pode ser contestado.

#### Inquisidor - Trocar

Declare Inquisidor e usa o fluxo automatizado de troca.

Pode ser contestado.

#### Inquisidor - Investigar

Declare Inquisidor e escolha um alvo.

O jogador ativo vê uma influência oculta aleatória do alvo e decide se força a troca.

Pode ser contestado.

## 11. Contestações

Ações de personagem e bloqueios podem ser contestados.

### Se o contestado provar a carta

1. A carta declarada é comprovada.
2. A carta comprovada é trocada por uma nova carta do baralho.
3. O desafiante perde 1 influência.
4. A ação ou bloqueio continua.

### Se o contestado estiver blefando

1. O blefe é revelado.
2. O jogador contestado perde 1 influência.
3. A ação blefada é cancelada ou o bloqueio blefado falha.

## 12. Temporizadores e Fallbacks

A Sala Personalizada usa temporizadores para não travar a partida.

Tempos atuais:

- Contagem de início: 5 segundos.
- Sorteio inicial: 5 segundos.
- Turno: 40 segundos.
- Resposta, bloqueio ou contestação: 15 segundos.
- Escolhas obrigatórias: 20 segundos.

Se o tempo acabar:

- turno sem ação vira Renda, exceto quando Golpe de Estado é obrigatório;
- resposta sem decisão vira passe;
- bloqueio sem contestação é aceito;
- perda de influência escolhe uma carta oculta disponível;
- troca escolhe cartas automaticamente;
- investigação termina sem forçar troca.

## 13. Resultado da Partida

Ao final, a sala mostra o resultado da partida.

O modal de resultado pode exibir:

- vencedor;
- participantes;
- pontuação de desempenho da partida;
- estatísticas internas da partida;
- opção de voltar ao lobby;
- opção de reiniciar a sala.

### Importante

A pontuação exibida no resultado da Sala Personalizada é apenas resumo da partida.

Ela não deve gerar pontos ranqueados.

Ela não deve alterar:

- `rankedStats`;
- `rankedResults`;
- vitórias ranqueadas;
- derrotas ranqueadas;
- conquistas ranqueadas;
- leaderboard futuro.

## 14. Limitações Atuais

A Sala Personalizada ainda é um clone inicial do ranqueado.

Limitações atuais:

- ainda reutiliza muitos ids/classes `rank*` na interface;
- ainda usa a mesma folha visual do ranqueado;
- ainda possui regras iguais às do ranqueado;
- ainda não possui configuração própria de baralho;
- ainda não possui seleção avançada de personalidade por preset;
- ainda não possui controle detalhado de slots;
- ainda não possui painel dedicado de administração.

Essa separação, mesmo inicial, é importante porque permite evoluir a Sala Personalizada sem mexer diretamente no Modo Ranqueado.

## 15. Próximos Passos Recomendados

### Curto prazo

- Melhorar o texto da sala para diferenciar melhor de ranqueado.
- Revisar se o botão de adicionar bot deve ficar disponível apenas para o criador.
- Adicionar feedback visual mais claro para o jogador removido.
- Mostrar quem é o criador da sala.
- Garantir que resultado personalizado nunca grave em `rankedStats` ou `rankedResults`.

### Médio prazo

- Criar presets de personalidade de bots.
- Permitir remover ou trocar bots antes da partida.
- Adicionar configurações simples de partida.
- Adicionar opção de número máximo de jogadores.
- Criar histórico local ou social separado do ranqueado.

### Longo prazo

- Permitir baralhos customizados.
- Permitir regras alternativas.
- Permitir salvar modelos de sala.
- Criar convites mais completos para amigos.
- Separar visualmente a identidade da Sala Personalizada da identidade do Ranqueado.
- Transformar a Sala Personalizada em ambiente oficial para testes de modos novos.
