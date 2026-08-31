# Coup Master - Regras Alternativas

Documento de referência das regras alternativas usadas pelo sorteador do Modo Casual.

Estas regras foram extraídas do PDF `docs/Regras e ações de personagem Coup Master.pdf`. Elas existem para diversificar partidas sandbox e não são aplicadas automaticamente pelo sistema: o sorteador apenas escolhe e exibe as regras para que a mesa siga manualmente.

## Sumário

- [1. Uso no Modo Casual](#1-uso-no-modo-casual)
- [2. Regras Disponíveis](#2-regras-disponíveis)
- [3. Observações de Implementação](#3-observações-de-implementação)

## 1. Uso no Modo Casual

O host pode abrir o sorteador de regras alternativas no tabuleiro casual e escolher quantas regras entrarão na partida.

Quantidade permitida:

- 1 regra;
- 2 regras;
- 3 regras;
- 4 regras;
- 5 regras.

Quando o host sorteia, todos os jogadores veem uma animação e recebem o mesmo resultado.

O resultado é salvo em:

```text
salas/{roomCode}/gameState/alternativeRuleDraw
```

## 2. Regras Disponíveis

### 2.1 Justiça Lenta

Golpes de Estado só podem ser dados com 10 moedas, em vez de 7.

O Golpe de Estado passa a ser obrigatório com 15 moedas.

### 2.2 Falso Duque

Haverá apenas 1 Duque no baralho.

### 2.3 Assassino Declarado

Para o Assassinato ter sucesso, o Assassino deve adivinhar a última influência do alvo.

Se errar, perde as moedas e o alvo compra uma nova carta.

### 2.4 Sangue Frio

Após um Assassinato bem-sucedido, o Assassino ganha 2 moedas de recompensa.

### 2.5 Ladrão de Túmulos

Você pode pagar 4 moedas para trocar uma carta da mão com uma carta revelada na mesa.

### 2.6 Última Palavra

Quando for eliminado, você pode escolher um jogador para perder 2 moedas imediatamente.

### 2.7 Recompensa

Elimine um jogador com mais de 7 moedas e ganhe 2 moedas de recompensa.

A recompensa vale para eliminação por Golpe de Estado, contestação, Assassinato ou Execução Bruta.

### 2.8 Espólio

Quando alguém é eliminado, suas moedas são divididas entre os jogadores restantes em partes iguais.

Se sobrarem moedas após a divisão, a sobra volta para o banco.

### 2.9 Votos do Senado

Golpes de Estado precisam de aprovação da maioria dos jogadores vivos.

### 2.10 Mercado Negro

Você pode pagar 2 moedas para trocar uma carta da mão com uma carta do baralho.

### 2.11 Golpe Magno

Quando um jogador atingir 15 moedas, todos perdem 1 influência.

### 2.12 Soberania Absoluta

Se possuir 2 Condessas, você pode bloquear qualquer ação contra si.

Você pode blefar, mas se for contestado e estiver mentindo, será eliminado.

Se provar que possui as 2 Condessas, deve trocar ambas as cartas.

### 2.13 Contrabando

Você pode sacrificar uma influência sua para ganhar 10 moedas automaticamente.

### 2.14 Pânico Econômico

Quando alguém acumular mais de 8 moedas, todos os jogadores recebem 1 moeda automaticamente.

### 2.15 Câmara

Todos recebem 4 influências.

Cada jogador escolhe 2 influências para ficar e devolve 2 para o baralho.

### 2.16 Corrupção

No início do jogo, receba 2 cartas e selecione 1 para manter e 1 para descartar.

Em seguida, sua segunda carta será sorteada aleatoriamente.

### 2.17 O Trio Falso

Em vez de começar com 2 cartas, cada jogador começa com 3 cartas.

Apesar disso, cada jogador continua tendo apenas 2 vidas.

### 2.18 Figura Pública

Um personagem é revelado na mesa.

Só existirá esse personagem no jogo, e o uso dele é público: todos podem usar.

### 2.19 Chantagem

Ao gastar 7 moedas, você pode roubar uma influência de outro jogador e ficar com ela.

Você deve entregar uma de suas cartas para esse jogador.

A Chantagem pode ser bloqueada pelo Embaixador, Inquisidor ou Bufão.

### 2.20 Imprensa

Gaste 4 moedas para revelar a todos uma carta de outro jogador à sua escolha.

O jogador afetado ganha 2 moedas.

### 2.21 Favor da Coroa

Quando for alvo de uma ação, você pode pagar 3 moedas para bloqueá-la.

Essa regra não bloqueia Golpe de Estado.

### 2.22 Inversão de Poder

Pague 3 moedas e mude a direção dos turnos.

### 2.23 Espionagem

Uma vez por turno, você pode pagar 2 moedas para olhar secretamente uma influência de qualquer jogador.

### 2.24 Sorte do Destino

Sempre que um jogador perder uma influência, ele compra uma carta do topo do baralho.

Ele pode ficar com a carta ou devolvê-la ao fundo do baralho.

### 2.25 Conselho de Emergência

Quando um jogador atingir 10 moedas, todos os jogadores vivos recebem 2 moedas.

### 2.26 Herdeiro do Trono

Quando um jogador for eliminado, o responsável pela eliminação recebe imediatamente 3 moedas.

### 2.27 Golpe Declarado

Para o Golpe de Estado ter sucesso, o jogador deve adivinhar a última influência do alvo.

Se errar, perde as moedas e o alvo compra uma nova carta.

## 3. Observações de Implementação

O sorteador do Modo Casual usa essa lista como referência textual, mas não aplica efeitos automaticamente.

Algumas regras dependem de consenso de mesa antes de começar, especialmente:

- `Falso Duque`, porque altera composição do baralho;
- `Câmara`, porque altera a distribuição inicial;
- `Corrupção`, porque altera a escolha de cartas iniciais;
- `Figura Pública`, porque muda a existência e o uso de personagens;
- `Votos do Senado`, porque exige votação social;
- `Soberania Absoluta`, porque pode causar eliminação imediata se o blefe for contestado.

Como o Modo Casual é sandbox, a mesa pode adaptar qualquer regra antes da partida começar.
