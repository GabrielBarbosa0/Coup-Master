# Testes automatizados

Esta pasta concentra os testes automatizados do Coup Master.

- Os arquivos `*.test.js`, exceto `rule-selection.test.js`, rodam diretamente com Node.js.
- `rule-selection.test.js` valida a interface em navegador e requer Playwright com Microsoft Edge.

Exemplo:

```powershell
node tests\automated\ranked-engine.test.js
```

Ao criar um novo teste automatizado, mantenha-o nesta pasta em vez de colocá-lo ao lado do código de produção em `js/`.
