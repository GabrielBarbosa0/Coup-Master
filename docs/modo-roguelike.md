# Coup Master - Modo Roguelike

Proposta de design para um modo solo/duelo inspirado em estrutura de runs, progressão temporária e melhorias de cartas, mantendo a identidade de blefe, risco e leitura política do Coup Master.

## Sumário

- [1. Visão Geral](#1-visão-geral)
- [2. Objetivo do Modo](#2-objetivo-do-modo)
- [3. Loop Principal](#3-loop-principal)
- [4. Estrutura da Run](#4-estrutura-da-run)
- [5. Duelo Contra Bots](#5-duelo-contra-bots)
- [6. Baralho do Jogador](#6-baralho-do-jogador)
- [7. Melhorias de Cartas](#7-melhorias-de-cartas)
- [8. Exemplos de Cartas Melhoradas](#8-exemplos-de-cartas-melhoradas)
- [9. Recompensas Entre Partidas](#9-recompensas-entre-partidas)
- [10. Relíquias, Selos e Modificadores](#10-relíquias-selos-e-modificadores)
- [11. Inimigos, Elites e Chefes](#11-inimigos-elites-e-chefes)
- [12. Economia da Run](#12-economia-da-run)
- [13. Progressão Permanente](#13-progressão-permanente)
- [14. Balanceamento e Riscos](#14-balanceamento-e-riscos)
- [15. MVP Sugerido](#15-mvp-sugerido)

## 1. Visão Geral

O modo Roguelike seria uma campanha curta composta por duelos sucessivos contra bots.

Cada duelo funciona como uma partida compacta de Coup, mas ao vencer o jogador recebe recompensas temporárias para fortalecer seu baralho durante a run.

A ideia central é criar uma sensação parecida com jogos como Balatro: a cada vitória, o jogador escolhe melhorias, cria combinações e transforma cartas comuns em versões mais fortes, raras ou especializadas.

O modo não substitui o casual nem o ranqueado. Ele seria um terceiro modo, focado em experiência solo, testes de cartas, progressão e rejogabilidade.

## 2. Objetivo do Modo

O objetivo é vencer uma sequência de duelos até derrotar o chefe final da run.

Durante a run, o jogador melhora seu baralho, adapta sua estratégia e escolhe caminhos diferentes. Ao perder um duelo decisivo, a run termina.

### Pilares do modo

- Partidas rápidas contra bots.
- Progressão temporária dentro da run.
- Melhorias de cartas do baralho base.
- Escolhas entre risco, economia, controle e blefe.
- Rejogabilidade por combinações diferentes.
- Bots com personalidades e regras especiais.

## 3. Loop Principal

1. O jogador inicia uma run com um baralho base.
2. O mapa oferece duelos, eventos, lojas, elites e chefes.
3. O jogador escolhe um caminho.
4. Entra em duelo contra um bot.
5. Ao vencer, escolhe uma recompensa.
6. A recompensa melhora cartas, adiciona modificadores ou altera a economia.
7. O jogador continua até vencer o chefe final ou perder a run.

## 4. Estrutura da Run

Uma run pode ser dividida em atos.

### Ato 1 - Corte Local

Introduz bots simples, melhorias básicas e poucas cartas especiais.

### Ato 2 - Guerra de Influência

Adiciona bots com regras próprias, eventos mais fortes e punições maiores.

### Ato 3 - Conselho Final

Inclui elites mais perigosas e um chefe com mecânica exclusiva.

### Estrutura exemplo

- 3 duelos comuns.
- 1 evento.
- 1 loja.
- 1 duelo elite.
- 2 duelos comuns.
- 1 chefe.

Essa estrutura pode ser ajustada para runs curtas de 15 a 25 minutos.

## 5. Duelo Contra Bots

O duelo seria uma partida de Coup reduzida, normalmente entre jogador e bot.

### Formato básico

- Jogador começa com 2 influências.
- Bot começa com 2 influências.
- Ambos começam com 2 moedas.
- O baralho pode ser o baralho base ou uma versão modificada pela run.
- Vence quem eliminar as influências do adversário.

### Por que duelo?

O duelo facilita balanceamento, leitura de IA e duração curta.

Também permite criar bots temáticos com comportamento previsível o suficiente para o jogador aprender e contra-atacar.

### Possível variação futura

Runs avançadas poderiam ter duelos 1 contra 2, mesas com múltiplos bots ou chefes com mais de 2 influências.

## 6. Baralho do Jogador

O jogador começa com cartas padrão do Coup.

Durante a run, essas cartas podem receber atributos, raridades e efeitos adicionais.

### Modelo inicial

Cada tipo de carta pode existir em versões diferentes:

- comum;
- aprimorada;
- rara;
- épica;
- corrompida;
- lendária.

Exemplo:

- Duque comum: Taxar pega 3 moedas.
- Duque aprimorado: Taxar pega 4 moedas.
- Duque corrupto: Taxar pega 5 moedas, mas aumenta chance de contestação do bot.

### Identidade importante

Mesmo com melhorias, a carta ainda deve preservar sua fantasia original.

O Duque continua ligado a dinheiro e bloqueio de Ajuda Externa. O Embaixador continua ligado a troca e manipulação de cartas. O Assassino continua ligado a pressão ofensiva.

## 7. Melhorias de Cartas

Melhorias são alterações temporárias obtidas durante a run.

Elas podem afetar:

- valor de moedas recebidas;
- custo de ações;
- número de cartas compradas;
- número de cartas devolvidas;
- escopo de bloqueio;
- chance de bot contestar;
- punição por blefe;
- recompensa por provar influência;
- efeitos ao revelar carta;
- efeitos ao vencer contestação.

### Tipos de melhoria

#### Aumento numérico

Melhoria simples que aumenta valores.

Exemplo: Duque pega 4 moedas em vez de 3.

#### Redução de custo

Reduz o custo de uma ação.

Exemplo: Assassino custa 2 moedas em vez de 3.

#### Efeito adicional

Adiciona uma consequência à ação.

Exemplo: ao extorquir, o Capitão também ganha 1 moeda do tesouro se o alvo não puder pagar 2 moedas.

#### Efeito condicional

Ativa apenas em uma situação específica.

Exemplo: Condessa ganha 1 moeda quando bloqueia Assassinato com sucesso.

#### Efeito de risco

Fortalece a carta, mas cria desvantagem.

Exemplo: Duque pega 5 moedas, mas se for contestado e perder, perde todas as moedas.

## 8. Exemplos de Cartas Melhoradas

### Duque

#### Duque Fiscal

**Efeito:** Taxar pega 4 moedas.

**Função:** economia direta.

**Risco:** baixo.

#### Duque Soberano

**Efeito:** Taxar pega 3 moedas. Se você tiver menos moedas que o bot, pegue +1 moeda.

**Função:** recuperação.

**Risco:** baixo.

#### Duque Corrupto

**Efeito:** Taxar pega 5 moedas.

**Risco:** se o bot contestar e você perder, você perde todas as moedas.

**Função:** alto risco e alta recompensa.

### Capitão

#### Capitão Corsário

**Efeito:** Extorquir pega até 3 moedas.

**Função:** pressão econômica.

#### Capitão Intimidador

**Efeito:** se a Extorsão for bloqueada, ganhe 1 moeda do tesouro.

**Função:** reduz perda de turno.

#### Capitão Predador

**Efeito:** se o alvo tiver apenas 1 moeda, pegue essa moeda e compre 1 carta, depois devolva 1.

**Função:** mistura extorsão com filtragem de mão.

### Assassino

#### Assassino Silencioso

**Efeito:** Assassinar custa 2 moedas.

**Função:** ofensiva rápida.

#### Assassino Cruel

**Efeito:** se o Assassinato for bem-sucedido, ganhe 1 moeda.

**Função:** recompensa por execução.

#### Assassino Marcado

**Efeito:** Assassinar custa 3 moedas. Se for bloqueado pela Condessa, você pode pagar 1 moeda para contestar automaticamente.

**Função:** pressão contra defesa.

### Condessa

#### Condessa Implacável

**Efeito:** ao bloquear Assassinato com sucesso, ganhe 1 moeda.

**Função:** defesa que gera valor.

#### Condessa Sombria

**Efeito:** uma vez por duelo, se você provar Condessa, o bot perde 1 moeda.

**Função:** punição por contestação errada.

#### Condessa Intocável

**Efeito:** o primeiro Assassinato contra você em cada duelo custa +1 moeda para o adversário.

**Função:** proteção passiva.

### Embaixador

#### Embaixador Experiente

**Efeito:** Trocar compra 3 cartas e devolve 2.

**Função:** melhora qualidade da mão.

#### Embaixador Discreto

**Efeito:** depois de Trocar, ganhe 1 moeda se devolveu pelo menos uma carta ao baralho.

**Função:** valor gradual.

#### Embaixador Duplo

**Efeito:** Trocar compra 2 cartas e devolve 1.

**Função:** aumenta vantagem de cartas, mas pode ser forte demais e precisa de limite.

### Inquisidor

#### Inquisidor Severo

**Efeito:** Investigar permite olhar 1 carta do bot e, se for diferente da carta declarada anteriormente por ele, roubar 1 moeda.

**Função:** punição de blefe.

#### Inquisidor Profundo

**Efeito:** Trocar compra 2 cartas e devolve 1.

**Função:** versão mais eficiente do Inquisidor.

#### Inquisidor Absoluto

**Efeito:** uma vez por duelo, ao Investigar, você pode forçar a troca sem revelar sua decisão ao bot.

**Função:** controle psicológico.

## 9. Recompensas Entre Partidas

Após vencer um duelo, o jogador escolhe uma entre três recompensas.

### Exemplos de recompensa

- Melhorar uma carta aleatória.
- Escolher uma carta para aprimorar.
- Ganhar uma relíquia.
- Ganhar moedas iniciais no próximo duelo.
- Remover uma penalidade.
- Comprar uma carta especial.
- Transformar uma carta comum em carta rara.

### Recompensa por vitória perfeita

Se vencer sem perder influência, o jogador pode receber uma recompensa extra:

- escolha adicional;
- moeda extra;
- melhoria rara;
- cura de influência para o próximo duelo, caso esse sistema exista.

## 10. Relíquias, Selos e Modificadores

Relíquias seriam efeitos passivos da run.

Elas funcionam como os itens que criam combinações fortes e tornam cada run diferente.

### Exemplos de relíquias

#### Selo da Corte

Comece cada duelo com +1 moeda.

#### Livro de Favores

Na primeira vez que provar uma influência em um duelo, ganhe 2 moedas.

#### Máscara Rachada

Na primeira vez que blefar e for contestado, ignore a perda de influência. Depois, destrua esta relíquia.

#### Tesouro Oculto

Sempre que usar Renda, ganhe +1 moeda se tiver menos moedas que o bot.

#### Contrato Vermelho

Assassinato custa 1 moeda a menos, mas perder uma contestação de Assassino custa 1 moeda adicional.

### Selos em cartas

Além de relíquias globais, cartas poderiam receber selos.

Exemplos:

- Selo Dourado: ao provar esta carta, ganhe 1 moeda.
- Selo Sombrio: se esta carta for revelada por perda de influência, o bot perde 1 moeda.
- Selo Real: a primeira ação desta carta no duelo não pode ser contestada.
- Selo Falso: esta carta conta como outra carta uma vez por duelo.

## 11. Inimigos, Elites e Chefes

Bots podem ter personalidades, padrões e regras especiais.

### Bot comum

Usa regras normais, com pequenas preferências.

Exemplo: bot econômico usa Duque com frequência.

### Bot elite

Possui uma vantagem fixa.

Exemplos:

- começa com +2 moedas;
- possui 3 influências;
- contesta com mais frequência;
- bloqueia a primeira Ajuda Externa automaticamente;
- compra uma carta extra ao provar influência.

### Chefe

Possui mecânica exclusiva.

#### Chefe: O Conselho

Começa com 3 influências.

A cada vez que perde uma influência, ganha uma regra nova.

#### Chefe: A Condessa Vermelha

Assassinatos contra ela custam +1 moeda.

Quando bloqueia com sucesso, rouba 1 moeda.

#### Chefe: O Auditor

Toda vez que o jogador usa Taxar, há uma contestação automática se o jogador já tiver 5 moedas ou mais.

#### Chefe: O Fantocheiro

Uma vez por duelo, força o jogador a repetir a última ação usada.

## 12. Economia da Run

Além das moedas usadas dentro do duelo, o modo pode ter uma moeda de run.

### Moedas de duelo

Usadas durante a partida para ações normais: Assassinar, Golpe de Estado, conversões e outros efeitos.

### Prestígio

Moeda temporária usada entre duelos para comprar melhorias.

Prestígio é perdido ao final da run.

### Favores

Moeda rara usada para comprar relíquias fortes ou remover penalidades.

Pode ser obtida em eventos, elites ou vitórias perfeitas.

## 13. Progressão Permanente

O modo pode ter desbloqueios permanentes, mas eles devem ser leves para não destruir o equilíbrio.

### Bons desbloqueios permanentes

- novos bots;
- novas relíquias possíveis;
- novas artes ou cosméticos;
- novos modificadores de run;
- novos caminhos no mapa;
- novos desafios;
- cartas especiais liberadas para aparecer como recompensa.

### Evitar progressão permanente forte demais

Evite upgrades permanentes como "comece sempre com +3 moedas" ou "todas as cartas são melhores", porque isso pode reduzir a graça da run.

O ideal é desbloquear variedade, não poder bruto.

## 14. Balanceamento e Riscos

### Risco: perder a identidade do Coup

Se as melhorias forem fortes demais, o jogo vira apenas cálculo de combo e deixa de ser blefe.

Solução: manter contestação, bloqueio e leitura de risco como parte central das melhorias.

### Risco: upgrades óbvios demais

Se toda melhoria for apenas "+1 moeda", o modo fica previsível.

Solução: misturar upgrades numéricos, efeitos condicionais e efeitos de risco.

### Risco: bots injustos

Bots não devem parecer que sabem a mão do jogador.

Solução: cada bot deve ter personalidade clara e probabilidades de decisão. O jogador precisa sentir que aprendeu o padrão do inimigo.

### Risco: runs longas demais

Coup funciona bem com tensão curta.

Solução: runs de 15 a 25 minutos no início.

### Risco: excesso de cartas especiais

Muitas variações podem confundir.

Solução: iniciar com cartas base melhoradas e deixar DLCs/expansões como desbloqueios futuros.

## 15. MVP Sugerido

O MVP deve testar a diversão do loop antes de criar um sistema grande.

### Fase 1 - Protótipo jogável

- Criar modo "Duelo Roguelike" no lab.
- Jogador contra 1 bot.
- Baralho base.
- 3 duelos em sequência.
- Recompensa simples após cada vitória.

### Fase 2 - Melhorias básicas

- Duque +1 moeda.
- Embaixador compra +1 carta.
- Assassino custa -1 moeda.
- Condessa ganha 1 moeda ao bloquear.
- Capitão extorque +1 moeda.

### Fase 3 - Relíquias simples

- Começar com +1 moeda.
- Ganhar moeda ao vencer contestação.
- Reduzir custo do primeiro Assassinato.
- Comprar 1 carta extra na primeira troca.

### Fase 4 - Bots temáticos

- Bot econômico.
- Bot agressivo.
- Bot defensivo.
- Bot blefador.

### Fase 5 - Chefe da run

- Criar um chefe com 3 influências.
- Adicionar uma regra especial simples.
- Encerrar a run com tela de vitória ou derrota.

### Fase 6 - Interface final

- Tela de mapa da run.
- Tela de recompensa.
- Tela de loja.
- Tela de resumo da run.
- Estatísticas de melhores runs.

## Direção Recomendada

O melhor caminho é começar pequeno: um duelo contra bot com três recompensas possíveis no final.

Se esse núcleo for divertido, o modo pode crescer para mapa, relíquias, chefes, cartas raras e progressão permanente.

O coração do modo deve ser: "eu tenho uma carta melhorada, mas ainda posso estar blefando".

Essa frase preserva o Coup dentro da estrutura roguelike.
