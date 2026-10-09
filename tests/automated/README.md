# Testes automatizados

`automated-controller.test.js` cobre o coordenador compartilhado de relogio, prazos e decisoes de IA. `automated-adapters.test.js` tambem garante que os renderers de Ranqueado e Sala Personalizada continuem adaptadores finos da implementacao comum.

Esta pasta concentra os testes automatizados do Coup Master.

- Os arquivos `*.test.js`, exceto `rule-selection.test.js`, rodam diretamente com Node.js.
- `rule-selection.test.js` valida a interface em navegador e requer Playwright com Microsoft Edge.

Exemplo:

```powershell
node tests\automated\ranked-engine.test.js
```

Antes de refatorar o motor automatizado compartilhado, execute tambem:

```powershell
node tests\automated\automated-engine-contract.test.js
```

Essa suite aplica o mesmo contrato aos motores ranqueado e personalizado. Ela protege a API publica, o estado serializavel, o inicio da partida, as acoes, os alvos, as contestacoes, os bloqueios e o formato essencial dos resultados. Matchmaking ranqueado e controles do anfitriao personalizado permanecem cobertos por suas suites especificas.

`automated-rules.test.js` valida o nucleo compartilhado de regras, as fachadas dos dois modos e a ordem de carregamento dos scripts nas paginas.

`automated-model.test.js` valida as consultas puras de jogadores, influencias, assentos, alvos, respostas, bloqueios e vencedor, alem da integracao do modulo com os dois motores.

`automated-actions.test.js` valida o fluxo compartilhado de declaracao e resolucao das acoes, custos, respostas e bloqueios, preservando a telemetria exclusiva do ranqueado.

`automated-cards.test.js` valida provas e concessoes de contestacao, perdas e eliminacoes, trocas e investigacoes, incluindo a separacao entre a telemetria ranqueada e o estado personalizado.

`automated-turns.test.js` valida prazos, transicoes animadas, renda e golpe automaticos, timeout de respostas e contestacoes, alternancia de jogador e encerramento da partida nos dois modos.

`automated-profiles.test.js` valida o contrato comum dos perfis, estatisticas, metadados, desempenho e resultados, garantindo que campos competitivos existam apenas no ranqueado.

`automated-adapters.test.js` impede que o ciclo compartilhado volte a ser duplicado nos motores e valida as diferencas finais de prontidao, revanche, matchmaking e administracao.

Ao criar um novo teste automatizado, mantenha-o nesta pasta em vez de colocá-lo ao lado do código de produção em `js/`.
