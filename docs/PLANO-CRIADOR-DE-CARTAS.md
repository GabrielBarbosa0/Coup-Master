# Plano do Criador de Cartas

## 1. Visao geral

O Criador de Cartas e uma proposta futura para permitir que a comunidade crie, importe, exporte e utilize baralhos personalizados no modo Casual do Coup Master.

O objetivo inicial nao e criar novas regras automatizadas. O modo Casual continuara funcionando como uma mesa manual: o jogo sincroniza cartas, imagens, nomes, quantidades e movimentos, enquanto os jogadores interpretam e aplicam as regras do baralho criado pela comunidade.

Essa limitacao torna a primeira versao mais segura, previsivel e compativel com a arquitetura atual.

## 2. Objetivos

- Permitir a criacao de cartas personalizadas pelo navegador.
- Permitir frente, verso, nome, descricao e quantidade personalizados.
- Exportar um baralho completo em um unico arquivo compartilhavel.
- Importar um baralho criado por outro jogador.
- Associar um baralho personalizado a uma sala Casual.
- Baixar automaticamente o baralho para todos os participantes da sala.
- Manter cartas ocultas visualmente ate serem reveladas.
- Armazenar baralhos usados recentemente no dispositivo para evitar downloads repetidos.
- Preparar uma base que possa evoluir futuramente para uma plataforma de mesa 2D.

## 3. Fora do escopo inicial

- Uso de baralhos comunitarios no Ranqueado.
- Uso de baralhos comunitarios na Sala Personalizada automatizada.
- Execucao de JavaScript ou qualquer codigo enviado pelo criador.
- Criacao livre de regras automatizadas, bots ou efeitos programaveis.
- Pontuacao competitiva ou conquistas oficiais com baralhos comunitarios.
- Galeria publica sem moderacao.

## 4. Experiencia do criador

O editor deve permitir:

- criar um baralho vazio ou duplicar um baralho existente;
- definir nome, autor, versao, idioma e descricao;
- enviar uma imagem de verso comum para o baralho;
- adicionar, duplicar, reordenar e remover cartas;
- definir nome, descricao e quantidade de copias de cada carta;
- enviar, cortar e reposicionar a imagem da frente;
- visualizar a carta nos tamanhos de desktop e mobile;
- validar o baralho antes de exportar ou publicar na sala;
- exportar e importar o pacote do baralho;
- salvar rascunhos localmente.

Na primeira versao, descricao e texto de habilidade sao apenas informativos. O motor Casual nao interpreta esses textos.

## 5. Experiencia dentro da sala

O anfitriao controla qual baralho personalizado esta ativo.

Fluxo proposto:

1. O anfitriao cria uma sala Casual.
2. O anfitriao escolhe um baralho salvo ou importa um pacote.
3. O navegador valida e prepara imagens e metadados.
4. Os arquivos sao enviados ao armazenamento remoto.
5. A sala recebe a referencia do pacote, sua versao e seu hash.
6. Cada participante baixa e valida o pacote automaticamente.
7. A interface exibe o progresso individual de carregamento.
8. A distribuicao de cartas fica bloqueada ate todos os jogadores ativos estarem prontos.
9. Durante a partida, cartas ocultas mostram apenas o verso configurado.
10. Quando uma carta e revelada, morta ou pertence ao jogador local, a frente correspondente pode ser exibida.

Se o pacote falhar, o jogador deve poder tentar novamente. O anfitriao tambem pode voltar ao baralho oficial sem recriar a sala.

## 6. Formato do pacote

O formato recomendado e um arquivo ZIP com extensao propria, por exemplo `.coupdeck`. Imagens nao devem ser armazenadas diretamente como Base64 no JSON, pois isso aumenta muito o tamanho e o consumo de memoria.

Estrutura proposta:

```text
baralho-comunitario.coupdeck
|-- manifest.json
|-- cards/
|   |-- alquimista.webp
|   `-- espiao.webp
|-- backs/
|   `-- back.webp
`-- thumbnails/
    `-- cover.webp
```

Exemplo inicial de `manifest.json`:

```json
{
  "format": "coup-master-deck",
  "schemaVersion": 1,
  "id": "alquimistas-v1",
  "name": "Conspiracao dos Alquimistas",
  "author": "Gabriel",
  "version": "1.0.0",
  "language": "pt-BR",
  "description": "Baralho comunitario para partidas casuais.",
  "cardBack": "backs/back.webp",
  "thumbnail": "thumbnails/cover.webp",
  "cards": [
    {
      "id": "alquimista",
      "name": "Alquimista",
      "description": "Texto de referencia para os jogadores.",
      "image": "cards/alquimista.webp",
      "copies": 3
    }
  ]
}
```

O campo `schemaVersion` permite migrar pacotes antigos quando o formato evoluir.

## 7. Distribuicao dos assets

Arquivos escolhidos no computador do anfitriao nao ficam automaticamente acessiveis aos demais navegadores. Para que todos vejam as mesmas cartas, os assets precisam ser distribuidos.

Arquitetura recomendada:

- Firebase Storage para imagens e pacotes;
- Firebase Realtime Database para metadados e estado da sala;
- Cache Storage ou IndexedDB para o cache local dos pacotes;
- hash do pacote para validar integridade e evitar downloads repetidos.

Referencia sugerida na sala:

```text
salas/{roomCode}/customDeck
|-- id
|-- schemaVersion
|-- packageVersion
|-- packageHash
|-- manifestUrl
|-- selectedBy
`-- selectedAt
```

Estado de carregamento sugerido:

```text
salas/{roomCode}/customDeckClients/{uid}
|-- status: downloading | ready | error
|-- packageHash
|-- progress
`-- updatedAt
```

O Realtime Database nao deve receber imagens em Base64.

## 8. Identidade e sigilo das cartas

Baixar as ilustracoes do baralho nao deve revelar quais cartas estao nas maos adversarias.

Existem duas camadas diferentes:

- catalogo: todos podem conhecer as cartas e imagens existentes no pacote;
- estado da partida: cada jogador so deve conhecer a identidade das proprias cartas e das cartas publicamente reveladas.

Na implementacao ideal, o estado publico de uma carta oculta contem apenas um identificador opaco. O tipo real nao deve ser enviado a todos os clientes apenas para ser escondido por CSS ou por `back.png`.

Como o Casual e uma mesa de confianca entre participantes, essa protecao pode ser implementada em etapas. Mesmo assim, o modelo de dados deve evitar consolidar uma arquitetura que torne a mao adversaria facilmente legivel pelo console do navegador.

## 9. Validacao e seguranca

Todo pacote deve ser tratado como conteudo nao confiavel.

Regras iniciais recomendadas:

- aceitar apenas PNG, JPEG e WebP;
- nao aceitar HTML, scripts ou JavaScript;
- bloquear SVG ou sanitiza-lo de forma rigorosa antes de qualquer suporte;
- limitar dimensoes, tamanho por imagem, quantidade de cartas e tamanho total;
- normalizar nomes de arquivos e impedir caminhos como `../`;
- validar o JSON contra um schema conhecido;
- ignorar campos desconhecidos que possam alterar comportamento;
- gerar IDs internos em vez de confiar cegamente nos IDs importados;
- verificar hash e versao antes de usar arquivos em cache;
- impedir que baralhos comunitarios escrevam ranking, resultados oficiais ou conquistas competitivas.

Antes de uma galeria publica, tambem sera necessario definir moderacao, denuncia, direitos autorais, exclusao e termos para conteudo enviado por usuarios.

## 10. Integracao com o codigo atual

O codigo atual ainda possui tipos de carta e caminhos de imagens definidos de forma estatica. A evolucao deve introduzir registros dinamicos sem quebrar os baralhos oficiais.

Componentes sugeridos:

```text
js/community-decks/
|-- card-registry.js
|-- deck-package-service.js
|-- deck-validator.js
|-- deck-storage.js
|-- deck-room-sync.js
|-- deck-cache.js
`-- deck-editor.js
```

Responsabilidades:

- `card-registry.js`: resolve metadados, imagens e verso de cartas oficiais ou comunitarias;
- `deck-package-service.js`: importa e exporta `.coupdeck`;
- `deck-validator.js`: valida schema, limites e tipos de arquivo;
- `deck-storage.js`: envia, consulta e remove pacotes remotos;
- `deck-room-sync.js`: associa o pacote a sala e acompanha a prontidao;
- `deck-cache.js`: persiste pacotes locais por hash;
- `deck-editor.js`: controla a interface de criacao.

Os renderizadores devem pedir imagens e metadados ao `CardRegistry`, em vez de montar diretamente caminhos como `assets/img/cards/{grupo}/{tipo}.png`.

## 11. Persistencia e ciclo de vida

Tipos de armazenamento propostos:

- rascunhos locais: IndexedDB;
- pacotes exportados: arquivo `.coupdeck` no dispositivo;
- baralhos privados da conta: Firebase Storage e indice por UID;
- baralho temporario da sala: Storage com politica de expiracao;
- catalogo publico futuro: Storage, banco de metadados e moderacao.

Pacotes temporarios sem uso devem ser removidos automaticamente para controlar custos. Baralhos salvos permanentemente devem possuir dono, versao e estado de publicacao.

## 12. Funcionamento offline

O editor pode funcionar offline para criar, importar, editar e exportar baralhos locais. Uma partida offline contra bots tambem pode usar esses pacotes sem Firebase.

Uma sala online exige conexao ao menos para distribuir o pacote e sincronizar a partida. Depois de baixado, o pacote pode permanecer em cache e ser reutilizado em outras salas.

## 13. Fases de implementacao

### Fase 1 - Formato e importacao local

- definir o schema do `manifest.json`;
- implementar validacao;
- importar e exportar `.coupdeck`;
- armazenar pacotes no IndexedDB;
- renderizar cartas comunitarias em um laboratorio isolado.

### Fase 2 - Editor visual

- criar interface de baralho e cartas;
- adicionar corte e preview de imagens;
- salvar rascunhos;
- mostrar validacoes e limites;
- testar desktop e mobile.

### Fase 3 - Casual local

- introduzir `CardRegistry` dinamico;
- permitir selecionar um pacote no modo Casual local;
- adaptar baralho, mao, preview, descarte e guias informativos;
- garantir que os baralhos oficiais continuem funcionando.

### Fase 4 - Sincronizacao da sala

- integrar Firebase Storage;
- publicar o manifesto da sala;
- baixar e armazenar assets nos demais clientes;
- exibir progresso e erros;
- bloquear a distribuicao ate todos estarem prontos;
- implementar troca segura para o baralho oficial.

### Fase 5 - Biblioteca privada

- salvar baralhos por conta;
- duplicar e versionar pacotes;
- gerar codigos ou arquivos de compartilhamento;
- controlar exclusao e custos de armazenamento.

### Fase 6 - Comunidade, opcional

- galeria publica;
- busca, tags, favoritos e versoes;
- denuncia e moderacao;
- revisao dos termos de uso;
- verificacao de conteudo e autoria.

### Fase 7 - Regras declarativas, opcional e futura

Se houver interesse em automatizar baralhos comunitarios, criar uma biblioteca fechada de efeitos combinaveis. Nunca executar codigo arbitrario do pacote.

Exemplo conceitual:

```json
{
  "action": {
    "target": "opponent",
    "cost": 2,
    "effects": [
      { "type": "transferCoins", "amount": 2 }
    ],
    "challengeable": true
  }
}
```

Essa fase exigiria validacao adicional, integracao com bots, interface de acoes e testes combinatorios. Nao deve bloquear a primeira versao manual do criador.

## 14. Criterios de aceite da primeira versao online

- Um anfitriao consegue criar ou importar um baralho valido.
- O baralho pode ser exportado e reimportado sem perda de dados.
- Todos os jogadores da sala recebem o mesmo pacote automaticamente.
- A partida nao inicia enquanto houver jogador ativo sem o pacote pronto.
- Cartas ocultas exibem somente o verso.
- Cartas reveladas exibem a frente correta para todos.
- Reentrar na sala reutiliza o pacote em cache quando o hash for igual.
- Falhas de download oferecem nova tentativa e retorno ao baralho oficial.
- Nenhum arquivo do pacote executa codigo.
- O uso do baralho comunitario nao altera ranking ou conquistas competitivas.

## 15. Decisoes futuras

- Definir limites de tamanho, resolucao e quantidade de cartas.
- Definir se visitantes anonimos podem enviar pacotes ao Storage.
- Definir quanto tempo pacotes temporarios permanecem armazenados.
- Definir se cada carta pode ter verso proprio.
- Definir se o criador oferece molduras e campos de texto sobre a imagem.
- Definir o comportamento quando o anfitriao desconecta durante o envio.
- Definir se o pacote fica vinculado a sala, ao anfitriao ou aos dois.
- Auditar o sigilo das maos no estado Firebase atual antes do lancamento.

## 16. Diretriz principal

A primeira versao deve ser um criador de conteudo visual para o Casual manual, e nao uma plataforma de scripts. Essa abordagem entrega valor para a comunidade com menor risco e cria uma base gradual para o Coup Master evoluir como uma mesa 2D extensivel.
