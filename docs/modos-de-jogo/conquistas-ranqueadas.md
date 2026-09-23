# Conquistas do Modo Ranqueado

Este documento registra os requisitos internos das conquistas do modo ranqueado. A fonte executável das condições é `js/gamemode/ranked/ranked-achievements.js`; a telemetria de cada partida é produzida por `js/gamemode/ranked/ranked-engine.js` e acumulada por `js/gamemode/ranked/ranked-game.js`.

Partidas personalizadas não progridem estas conquistas.

## Regras de contagem

- Uma conquista desbloqueada permanece desbloqueada. Isso também vale para requisitos variáveis, como pontuação ranqueada e precisão de contestações.
- Uma partida é contabilizada uma única vez por `resultKey`.
- Um blefe é contado quando o jogador declara um papel que não possui entre suas influências ocultas, mesmo que ninguém conteste.
- Uma contestação vencida é aquela em que o jogador contestado não consegue provar o papel declarado.
- Uma contestação perdida é aquela em que o jogador contestado prova o papel declarado.
- Uma ação só entra nos contadores específicos de execução quando chega à sua resolução. Uma declaração cancelada antes disso não conta como imposto, roubo, assassinato ou troca concluída.
- Para limites baseados em turnos, `N` representa a quantidade de jogadores que iniciou a partida.

## Participação e vitórias

| Conquista | Chave | Requisito exato |
| --- | --- | --- |
| Primeira vitória | `firstWin` | Vencer 1 partida ranqueada. |
| Entrada na corte | `courtEntry` | Concluir 1 partida ranqueada. |
| Nome nos salões | `knownName` | Concluir 5 partidas ranqueadas. |
| Veterano da intriga | `intrigueVeteran` | Concluir 25 partidas ranqueadas. |
| Lenda da mesa | `tableLegend` | Concluir 100 partidas ranqueadas. |
| Jogador honesto | `honestPlayer` | Concluir 1 partida sem declarar nenhum papel que não possuía. Não é necessário vencer. |
| Santo improvável | `unlikelySaint` | Vencer 5 partidas sem declarar nenhum papel que não possuía. |
| Sequência real | `royalStreak` | Alcançar 3 vitórias ranqueadas consecutivas. |
| Dinastia em marcha | `marchingDynasty` | Alcançar 5 vitórias ranqueadas consecutivas. |
| Coroa invicta | `undefeatedCrown` | Alcançar 10 vitórias ranqueadas consecutivas. |
| Virada de jogo | `comeback` | Vencer depois de perder pelo menos 1 influência durante a partida. |
| Última influência | `lastInfluence` | Vencer com exatamente 1 influência oculta restante. |
| Vitória impecável | `flawlessWin` | Vencer com as 2 influências iniciais ainda ocultas. |
| Primeira voz | `firstVoice` | Ser o jogador escolhido no sorteio inicial e vencer a partida. |
| Mesa cheia, trono meu | `fullTableThrone` | Vencer uma partida com 6 participantes, isto é, contra 5 oponentes. |
| Sem moedas, sem medo | `noCoinsNoFear` | Vencer terminando a partida com exatamente 0 moedas. |
| Golpe relâmpago | `lightningCoup` | Vencer até o turno `N x 3`, inclusive. Em uma mesa de 6 jogadores, o limite é o turno 18. |
| Maratona da corte | `courtMarathon` | Vencer no turno `N x 10` ou depois. Em uma mesa de 6 jogadores, começa no turno 60. |

## Blefes e contestações

| Conquista | Chave | Requisito exato |
| --- | --- | --- |
| Mentiroso astuto | `cleverLiar` | Acumular 10 declarações de papéis que não possuía. |
| Deus da mentira | `lieGod` | Acumular 50 declarações de papéis que não possuía. |
| Blefe perfeito | `perfectBluff` | Vencer uma partida tendo blefado pelo menos 1 vez e sem ter nenhum blefe descoberto. |
| Caçador de blefes | `bluffHunterAchievement` | Vencer 10 contestações. |
| Olhos de inquisidor | `inquisitorEyes` | Vencer 25 contestações. |
| Acusador preciso | `preciseAccuser` | Ter pelo menos 10 contestações e precisão acumulada igual ou superior a 70%. |
| Falso profeta | `falseProphet` | Perder 10 contestações. |
| Julgamento perfeito | `perfectJudgment` | Vencer uma partida depois de realizar pelo menos 1 contestação e sem errar nenhuma contestação naquela partida. |

## Ações ofensivas

| Conquista | Chave | Requisito exato |
| --- | --- | --- |
| Mão pesada | `heavyHand` | Executar 10 Golpes de Estado. |
| Trono tomado | `takenThrone` | Executar 25 Golpes de Estado. |
| Regicida oficial | `officialRegicide` | Executar 50 Golpes de Estado. |
| Sombra na corte | `courtShadow` | Executar 10 assassinatos. |
| Assassino impiedoso | `ruthlessAssassin` | Executar 25 assassinatos. |
| Contrato sem testemunhas | `noWitnesses` | Executar 50 assassinatos. |
| Lâmina contestada | `contestedBlade` | Declarar Assassino, ser contestado e provar uma influência de Assassino. |
| Capitão sem porto | `portlessCaptain` | Concluir 10 roubos com pelo menos 1 moeda transferida em cada um. |
| Tesouro saqueado | `lootedTreasury` | Roubar um total acumulado de 25 moedas. |
| Sete moedas pesadas | `heavySevenCoins` | Executar 5 Golpes de Estado iniciados quando o jogador tinha 10 moedas ou mais, limite atual do golpe obrigatório. O nome da conquista é legado. |

## Personagens e bloqueios

| Conquista | Chave | Requisito exato |
| --- | --- | --- |
| Duas Condessas | `twoContessas` | Vencer com exatamente 2 influências ocultas, ambas Condessas. |
| Muralha da Condessa | `contessaWall` | Ter 10 bloqueios de assassinato com Condessa aceitos. |
| Condessa de mentira | `fakeContessa` | Ter um bloqueio com Condessa aceito sem possuir Condessa oculta. Um blefe descoberto não conta. |
| Embaixador incansável | `tirelessAmbassador` | Concluir 10 trocas usando a ação do Embaixador. |
| Inquisidor atento | `attentiveInquisitor` | Concluir 10 investigações de influência com Inquisidor. |
| Duque declarado | `declaredDuke` | Resolver a ação Taxar 25 vezes, recebendo as 3 moedas. |
| Portões fechados | `closedGates` | Ter 10 bloqueios de Ajuda Externa aceitos. |
| Duque imaginário | `imaginaryDuke` | Declarar Taxar sem possuir Duque 10 vezes. |
| Patrulha do Capitão | `captainPatrol` | Ter 10 bloqueios com Capitão aceitos. |
| Diplomata alerta | `alertDiplomat` | Ter 10 bloqueios com Embaixador aceitos. |
| Máscaras da corte | `courtMasks` | Vencer depois de declarar ao menos uma vez cada papel disponível naquela partida. Como Embaixador e Inquisidor são alternativos, somente o personagem escolhido para a partida é exigido. Declarações de ações e bloqueios contam. |

## Desempenho e situações especiais

| Conquista | Chave | Requisito exato |
| --- | --- | --- |
| Corte em movimento | `movingCourt` | Declarar 100 ações válidas no total. A ação conta ao ser iniciada, mesmo que seja posteriormente contestada ou bloqueada. |
| Pontuação nobre | `nobleScore` | Alcançar `rankScore` igual ou superior a 500. Depois de desbloqueada, permanece ativa mesmo se a pontuação cair. |
| Vingança servida fria | `coldRevenge` | Perder a primeira influência para um adversário, eliminar esse mesmo adversário e vencer a partida. A eliminação precisa ser atribuída diretamente à ação ou contestação do jogador. |

## Campos persistidos

O progresso acumulado fica em `rankedStats/{uid}`. O mapa `unlockedAchievements` preserva os desbloqueios permanentemente. As condições específicas de uma partida são calculadas em `matchStats` antes de serem adicionadas ao perfil.

Ao alterar qualquer requisito no código, este documento e os testes de `ranked-achievements.test.js` devem ser atualizados juntos.
