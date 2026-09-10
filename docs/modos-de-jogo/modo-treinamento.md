# Coup Master - Modo Treinamento

Documento de planejamento para o **Modo Treinamento**, uma experiência offline/local para jogar contra bots IA sem login com Google, sem sala Firebase obrigatória e sem impacto em estatísticas ranqueadas.

Este modo ainda não está implementado. Ele fica planejado como uma evolução de futuro próximo para reduzir a barreira de entrada, permitir testes rápidos e ensinar o fluxo automatizado do Coup Master antes do jogador entrar no ranqueado ou em uma Sala Personalizada.

## Sumário

- [1. Visão Geral](#1-visão-geral)
- [2. Objetivo do Modo](#2-objetivo-do-modo)
- [3. Diferença Para Outros Modos](#3-diferença-para-outros-modos)
- [4. Entrada e Login](#4-entrada-e-login)
- [5. Estrutura Recomendada](#5-estrutura-recomendada)
- [6. Bots IA](#6-bots-ia)
- [7. Progressão e Estatísticas](#7-progressão-e-estatísticas)
- [8. Implementação Recomendada](#8-implementação-recomendada)
- [9. Próximos Passos](#9-próximos-passos)

## 1. Visão Geral

O Modo Treinamento é uma partida automatizada contra IA, executada localmente no navegador.

A proposta é reaproveitar a base de regras do modo ranqueado, mas sem depender de autenticação, matchmaking, sala compartilhada ou gravação de resultado competitivo.

Ele deve funcionar como uma porta de entrada:

- o jogador abre o jogo;
- escolhe Treinamento;
- a mesa é criada localmente;
- bots completam os slots;
- a partida começa sem login Google.

## 2. Objetivo do Modo

O objetivo principal é ensinar e testar.

O modo deve permitir que o jogador pratique:

- ações gerais;
- ações de personagem;
- bloqueios;
- contestações;
- perda de influência;
- troca com Embaixador/Inquisidor;
- leitura de risco;
- fluxo completo de uma partida automatizada.

O jogador pode vencer ou perder normalmente, mas o resultado não deve contar como ranqueado.

## 3. Diferença Para Outros Modos

### Casual

- Casual é uma mesa sandbox online.
- Treinamento deve ser automatizado e local.
- Casual permite manipular cartas e resolver a partida manualmente.
- Treinamento deve ensinar o fluxo de regras automatizadas.

### Ranqueado

- Ranqueado exige conta Google.
- Ranqueado usa Firebase, `rankedState`, estatísticas e resultados.
- Treinamento não deve exigir login.
- Treinamento não deve gravar `rankedStats` nem `rankedResults`.

### Sala Personalizada

- Sala Personalizada é social e online.
- Permite amigos e bots.
- Usa uma cópia do motor automatizado.
- Treinamento deve ser individual, sem convite e sem host.

## 4. Entrada e Login

O Modo Treinamento deve permitir acesso sem login Google.

Comportamento esperado:

- se o jogador estiver logado, pode usar nome e avatar atuais;
- se não estiver logado, usa visitante local;
- não cria sala remota;
- não exige permissões Firebase;
- não depende de presença online.

Esse modo pode ser exibido no lobby ou em uma entrada pública antes do login, dependendo da decisão de produto.

## 5. Estrutura Recomendada

Uma estrutura inicial possível:

```text
training/
  training.html

js/gamemode/training/
  training-rules.js
  training-engine.js
  training-game.js
  training-renderer.js
```

Alternativa mais madura:

```text
js/gamemode/shared/
  automated-rules.js
  automated-engine.js
  bot-brain.js

js/gamemode/ranked/
js/gamemode/personalized/
js/gamemode/training/
```

A segunda opção evita duplicação, mas deve ser feita com calma para não quebrar o ranqueado.

## 6. Bots IA

O primeiro protótipo pode usar bots simples, reaproveitando a lógica atual do ranqueado.

Comportamento mínimo:

- preencher a mesa automaticamente;
- escolher ações válidas;
- responder a ações do jogador;
- contestar ou bloquear com algum grau de aleatoriedade;
- respeitar regras de eliminação e vitória.

Futuramente, o modo pode ter níveis:

- iniciante;
- normal;
- agressivo;
- blefador;
- defensivo;
- tutorial guiado.

## 7. Progressão e Estatísticas

O Treinamento não deve gerar:

- pontos ranqueados;
- vitórias ranqueadas;
- derrotas ranqueadas;
- conquistas ranqueadas;
- resultados em `rankedResults`.

Pode existir, futuramente, uma progressão local separada:

- partidas de treino jogadas;
- tutorial concluído;
- dicas vistas;
- personagens praticados;
- desafios offline concluídos.

Esses dados podem ficar em `localStorage` no primeiro momento.

## 8. Implementação Recomendada

Implementar em fases pequenas:

1. Criar entrada visual do modo Treinamento.
2. Criar uma tela local de partida contra bots.
3. Reaproveitar o máximo possível das regras automatizadas do ranqueado.
4. Evitar Firebase na primeira versão.
5. Adicionar dicas contextuais simples.
6. Adicionar tutorial guiado depois que a partida livre estiver estável.
7. Avaliar extração de um motor compartilhado entre ranqueado, personalizado e treinamento.

## 9. Próximos Passos

- Definir se o acesso fica no lobby ou antes do login.
- Decidir se o modo começa com 6 jogadores ou uma mesa reduzida.
- Mapear quais funções do motor ranqueado podem ser reaproveitadas sem Firebase.
- Separar regras puras de integração remota quando necessário.
- Criar um protótipo mínimo sem estatísticas e sem persistência remota.
