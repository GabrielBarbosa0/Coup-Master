---
name: text-commit
description: Gera uma mensagem de commit em portugues para o Coup Master quando o usuario enviar exatamente /text-commit, pronta para copiar e colar.
---

# Text Commit

Use esta skill quando o usuario enviar exatamente:

```text
/text-commit
```

O objetivo e retornar uma mensagem de commit pronta para copiar e colar, no modelo antigo usado no Coup Master.

## Comportamento obrigatorio

Quando o pedido for `/text-commit`:

- leia apenas o estado do repositorio, como `git status --short`, `git diff --stat` e, se necessario, trechos de `git diff`;
- nao execute `git add`;
- nao execute `git commit`;
- nao altere arquivos;
- responda somente com um bloco de codigo `text`;
- nao escreva explicacao antes nem depois do bloco;
- nao use markdown fora do bloco;
- nao use labels como `Titulo:`, `Descricao:` ou `Verificacoes:`;
- nao inclua lista de testes, comandos rodados ou verificacoes feitas;
- nao inclua observacoes extras, exceto se houver risco critico que impeca uma mensagem segura.

## Formato final

A resposta final deve ser exatamente um bloco de texto neste formato:

````markdown
```text
tipo(escopo): titulo curto do commit

- descreve uma mudanca objetiva
- descreve outra mudanca objetiva
- descreve um ajuste relevante do mesmo conjunto
```
````

Esse formato e importante porque a interface mostra um cartao de texto simples com botao de copiar.

## Estilo da mensagem

Use Conventional Commits em portugues, sempre com escopo:

- `feat`: nova funcionalidade;
- `fix`: correcao de bug;
- `refactor`: reorganizacao interna sem mudar o comportamento principal;
- `docs`: documentacao;
- `style`: ajuste visual ou formatacao sem mudar logica;
- `test`: testes;
- `chore`: manutencao, scripts, configs ou tarefas auxiliares.

Prefira escopos especificos do Coup Master:

```text
fix(seo): corrigir indexacao do Coup Master
feat(guias): adicionar controles do gerador de guias
style(modal): ajustar layout do tesouro central
fix(firebase): autorizar dominio oficial no login
docs(regras): atualizar manual das regras alternativas
chore(pwa): atualizar cache do aplicativo
```

## Como montar o texto

1. Leia o estado do repositorio.
2. Agrupe as mudancas por intencao principal.
3. Escolha um unico tipo e escopo que represente melhor o conjunto.
4. Escreva de 2 a 4 bullets objetivos.
5. Use texto direto, pronto para commit, sem explicar o raciocinio.

Nao invente mudancas que nao aparecem no diff. Se o diff for grande, use `git diff --stat` e leitura direcionada dos arquivos mais relevantes.

## Modelos do Coup Master

### SEO e dominio

```text
fix(seo): corrigir resultado do Coup Master no Google

- remove chaves de traducao do HTML publico
- reforca metadados da pagina inicial em portugues
- redireciona acessos antigos do GitHub Pages para o dominio oficial
```

### Interface

```text
style(modal): ajustar modal do tesouro central

- remove elementos desnecessarios de jogador
- organiza as opcoes em duas linhas no desktop
- corrige a posicao do botao de fechar
```

### Guias

```text
feat(guias): aprimorar gerador de guias do Coup Master

- adiciona controles visuais para montar o guia
- ajusta textos e imagens das paginas geradas
- melhora a exportacao para uso no Canva
```

### Firebase

```text
fix(firebase): ajustar login no dominio oficial

- atualiza a configuracao para aceitar coupmaster.com.br
- preserva o login local e os dominios antigos autorizados
- corrige o fluxo de autenticacao com Google
```

### Documentacao

```text
docs(skills): atualizar modelo do text-commit

- define o formato antigo usado no Coup Master
- remove instrucoes genericas herdadas de outro projeto
- impede saidas com titulo, descricao ou verificacoes separadas
```

## Regra final de resposta

A resposta final deve conter apenas isto:

````markdown
```text
tipo(escopo): titulo do commit

- bullet objetivo
- bullet objetivo
- bullet objetivo
```
````

Nao coloque frases como "segue", "feito", "aqui esta" ou qualquer texto fora do bloco.
