---
name: text-commit
description: Gera uma mensagem de commit em português quando o usuário enviar exatamente /text-commit, pronta para copiar e colar.
---

# Text Commit

Use esta skill quando o usuário enviar exatamente:

```text
/text-commit
```

O objetivo é retornar uma mensagem de commit pronta para copiar e colar.

## Comportamento obrigatório

Quando o pedido for `/text-commit`:

- faça apenas inspeções de leitura, como `git status --short`, `git diff --stat` e, se necessário, `git diff`;
- não execute `git add`;
- não execute `git commit`;
- não altere arquivos;
- responda somente com um bloco de código `text`;
- não escreva explicação antes nem depois do bloco;
- não use markdown fora do bloco;
- não inclua observações extras, exceto se houver risco crítico que impeça uma mensagem segura.

O formato final deve ser exatamente este tipo de resposta:

````markdown
```text
feat(escopo): título curto do commit

- descreve uma mudança objetiva
- descreve outra mudança objetiva
- menciona ajustes relevantes de documentação, testes ou interface
```
````

Esse formato é importante porque a interface mostra um cartão de “Texto simples” com botão de copiar.

## Estilo da mensagem

Use Conventional Commits em português:

- `feat`: nova funcionalidade;
- `fix`: correção de bug;
- `refactor`: reorganização interna sem mudar comportamento principal;
- `docs`: documentação;
- `style`: ajuste visual ou formatação sem mudar lógica;
- `test`: testes;
- `chore`: manutenção, scripts, configs ou tarefas auxiliares.

Prefira títulos curtos e claros:

```text
feat(planilhas): aprimorar conversor da Anny
fix(interface): corrigir alinhamento do modal
docs(projeto): atualizar regras operacionais
chore(config): adicionar aliases de fornecedores
```

## Como montar o texto

1. Leia o estado do repositório.
2. Agrupe as mudanças por intenção principal.
3. Escolha um único tipo e escopo que represente melhor o conjunto.
4. Escreva bullets objetivos, sem detalhes excessivos.
5. Se houver muitas mudanças diferentes, priorize as mais importantes.

Não invente mudanças que não aparecem no diff. Se o diff for grande, use `git diff --stat` e uma leitura direcionada dos arquivos mais relevantes.

## Modelos genéricos

### Funcionalidade

```text
feat(escopo): adicionar nova funcionalidade

- adiciona fluxo principal para a nova funcionalidade
- integra a lógica com os serviços existentes
- documenta o comportamento esperado
```

### Correção

```text
fix(escopo): corrigir comportamento incorreto

- ajusta a regra que gerava o erro
- preserva o comportamento esperado nos demais casos
- valida o fluxo afetado
```

### Interface

```text
style(interface): ajustar visual do sistema

- reduz espaçamentos e cantos arredondados
- melhora leitura das tabelas e seletores
- corrige alinhamentos em componentes visuais
```

### Planilhas

```text
feat(planilhas): aprimorar geração de planilhas

- atualiza regras de leitura e conversão dos arquivos
- corrige validações e menus suspensos
- normaliza campos usados no fluxo de copiar e colar
```

### Documentação

```text
docs(projeto): atualizar documentação operacional

- registra novas regras de negócio
- documenta decisões técnicas recentes
- organiza orientações para próximos usos
```

### Manutenção

```text
chore(projeto): organizar scripts e configurações

- ajusta arquivos auxiliares do projeto
- adiciona configurações reutilizáveis
- prepara a base para próximas alterações
```

## Regra final de resposta

A resposta final deve conter apenas isto:

````markdown
```text
tipo(escopo): título do commit

- bullet objetivo
- bullet objetivo
- bullet objetivo
```
````

Não coloque frases como “segue”, “feito”, “aqui está” ou qualquer texto fora do bloco.
