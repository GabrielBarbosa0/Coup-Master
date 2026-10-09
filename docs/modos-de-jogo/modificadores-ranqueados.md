# Modificadores Ranqueados

## Estado Atual

O sistema esta em fase experimental e ainda nao e carregado pelo Modo Ranqueado nem pela Sala Personalizada.

O primeiro modulo fica em `js/gamemode/shared/ranked-modifiers.js`. Ele concentra o catalogo inicial, o sorteio deterministico de cinco regras e as restricoes de compatibilidade. Essa separacao permite testar a ideia sem alterar o fluxo dos modos existentes.

## Estrategia De Integracao

Nao duplicar todo o Modo Ranqueado. Uma copia integral criaria dois motores com regras, correcoes e bugs diferentes.

A primeira integracao deve acontecer como uma opcao experimental da Sala Personalizada:

- desativada por padrao;
- escolhida pelo host antes da partida;
- sem pontos, ranking ou conquistas;
- persistida em `personalizedState.alternativeRuleDraw`;
- sorteada uma unica vez antes da criacao do baralho;
- preservada em reconexoes e reinicios da interface.

Depois dos testes, uma fila separada pode oferecer um futuro modo dinamico sem substituir o ranqueado tradicional. Essa fila deve reutilizar o mesmo motor por configuracao, nao por copia de arquivos.

## Regras Do MVP

Cada partida sorteia exatamente cinco regras entre:

- `justica-lenta`;
- `falso-duque`;
- `sangue-frio`;
- `recompensa`;
- `espolio`;
- `herdeiro-do-trono`;
- `ultima-palavra`;
- `favor-da-coroa`;
- `panico-economico`;
- `conselho-de-emergencia`;
- `golpe-declarado`;
- `assassino-declarado`.

## Restricoes

Somente uma regra de cada grupo pode ser sorteada:

- finalizador declarado: `golpe-declarado` ou `assassino-declarado`;
- gatilho economico: `panico-economico` ou `conselho-de-emergencia`;
- recompensa direta: `sangue-frio`, `recompensa` ou `herdeiro-do-trono`.

Uma partida pode conter no maximo duas regras relacionadas a eliminacao, contando `sangue-frio`, `recompensa`, `espolio`, `herdeiro-do-trono` e `ultima-palavra`.

## Contrato Do Sorteio

O sorteio recebe uma seed persistida no estado. A mesma seed e o mesmo catalogo sempre devem produzir as mesmas cinco regras e na mesma ordem.

Clientes nunca devem sortear localmente depois de receber o estado da partida. O controlador que inicia a partida cria o sorteio dentro da mesma transacao usada para preparar o jogo. Os demais clientes apenas leem `ruleIds`.

## Proximas Etapas

1. Criar um laboratorio visual para o sorteio e para o modal responsivo.
2. Extrair o catalogo textual usado pelo Casual para evitar duas fontes de verdade.
3. Adicionar a opcao experimental na espera da Sala Personalizada.
4. Implementar primeiro `Justica Lenta` e `Falso Duque` no motor personalizado.
5. Implementar os efeitos de eliminacao com uma fila de resolucao explicita.
6. Implementar bloqueio pago e finalizadores declarados.
7. Testar bots, reconexao, timeout, traducao e combinacoes antes de considerar uma fila publica.
