# Coup Master - Multiplayer Online Beta v0.5

![Status](https://img.shields.io/badge/Status-Beta_v0.5-blue) ![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Database-orange)

<p align="center">
  <img src="./marketing/banners/banner-coup-master.png" alt="Coup Master Banner" width="100%">
</p>

## 📖 Sobre o Projeto

**Coup Master** é um jogo multiplayer **sandbox** inspirado em jogos de blefe e estratégia política. 
Diferente de versões automatizadas, o foco aqui é reproduzir a experiência manual de uma mesa real, 
onde os próprios jogadores gerenciam ações, moedas e interações.

O sistema é sincronizado em tempo real via Firebase Realtime Database, utilizando uma arquitetura modular orientada a eventos,
com foco em escalabilidade e consistência de estado.


🔗 **Jogue agora:** [https://gabrielbarbosa0.github.io/Coup-Master](https://gabrielbarbosa0.github.io/Coup-Master)

---

## 🖼️ Preview

  <img src="./marketing/screenshots/game-preview.gif" width="800">

---

## 🧪 Demo Técnica

- Ambiente: Produção (GitHub Pages)
- Banco de Dados: Firebase Realtime Database
- Autenticação: Google OAuth 2.0 e visitante anônimo
- Sincronização: Event-driven via listeners em tempo real
- Chat: mensagens em tempo real da sala com atalhos rápidos
- PWA: manifest + service worker para instalação e cache de assets locais
- Monetizacao: banner responsivo do Google AdSense na sala de espera ranqueada

> O PWA melhora instalação, abertura em modo standalone e cache do shell. O multiplayer continua exigindo conexão com Firebase.

---

## ✨ Novidades da Versão Beta (v0.5)

### 🌑 Expansão: Sombras do Asilo (DLC 3)
* **Novas Influências:** Adição de 6 personagens inéditos com mecânicas avançadas: Pistoleiro, Magnata, Estrategista, Ladrão, Vigarista e Xerife.
* **Regras Dinâmicas:** O manual de ajuda (Flip Card) agora detecta automaticamente quais DLCs estão ativas no deck e exibe a carta de regras correspondente (`dlc3-actions.jpg`).

### 🔍 Otimização de Descoberta (SEO & Indexação)
* **Google Search Console:** Integração e verificação de propriedade para permitir que o jogo seja encontrado em buscas por "Coup Online".
* **Meta Tags Avançadas:** Implementação de títulos dinâmicos, descrições ricas e suporte a **Open Graph** para visualização profissional em compartilhamentos no WhatsApp e Discord.

---

## ✨ Novidades da Versão Beta (v0.4)

### 🧹 Manutenção e Autodestruição de Salas
* **Limpeza Automática:** Implementação de um sistema de varredura que deleta automaticamente salas sem atividade por mais de 24 horas.
* **Registro de Atividade:** Cada ação realizada na mesa — como mover cartas, alterar moedas ou mudar religião — agora atualiza o carimbo de tempo (`lastActivity`) da sala.
* **Otimização de Banco de Dados:** A rotina de limpeza é executada de forma silenciosa sempre que um novo jogador acessa o lobby, garantindo que o Realtime Database permaneça leve e organizado.

### 🛠️ Estabilidade e Persistência
* **Sincronização de Estado:** Melhoria nos gatilhos de atualização para garantir que o status da sala reflita sempre a última interação válida de forma consistente.
* **Segurança de Remoção:** Configuração de novas regras no Firebase para permitir a exclusão segura de nós de salas órfãs por usuários autenticados.

---

## ✨ Novidades da Versão Beta (v0.3)

### 👻 Modo Espectador Fantasma
* **Visão de Jogo:** Jogadores eliminados (0 cartas) agora podem solicitar permissão para assistir a mão de outros jogadores ativos.
* **Sistema de Convites:** Envio de notificações em tempo real para o alvo, que pode aceitar ou negar ser espectado.
* **Feedback Visual:** Jogadores sendo assistidos recebem um brilho azul sutil em seus avatares.
* **Mecânica Híbrida:** O modo espectador é visual e não bloqueia ações técnicas, garantindo que o fluxo da mesa sandbox nunca trave.

### ⛪ Identidade Visual de Religiões
* **Ícones Dinâmicos:** Adição de escudos personalizados (`shield-cross` e `shield-sword`) ao lado do status de religião.
* **Cores Suavizadas:** Paleta de cores atualizada para as facções Católica e Protestante, facilitando a identificação rápida na mesa.
* **Filtros Adaptativos:** Ícones em formato SVG com tratamento visual branco para máxima legibilidade em temas escuros.

### ⚙️ Melhorias na Interface (UI)
* **Novo Menu de Controles:** Ícones reorganizados para facilitar o acesso às Regras Alternativas, Música, Configurações e Modo Espectador.
* **Modais Elegantes:** Substituição de prompts nativos por janelas modais personalizadas para seleção de jogadores e configuração de baralho.

---

## 🚀 Funcionalidades Principais

* **Sandbox Total:** Gestão manual de moedas, vidas, trocas de cartas e o prêmio do Asilo.
* **Login com Google ou visitante:** Identificação automática com Nome/Foto via Google ou UID anônimo temporário pelo Firebase Auth.
* **Persistência de Slot:** Reconexão inteligente que reserva seu lugar na mesa através do seu UID único.
* **Deck Configurável:** O Host possui controle total sobre a quantidade de cada personagem (incluindo cartas de DLC's).
* **Suporte para 8 Jogadores:** Layout otimizado para partidas grandes, inclusive em dispositivos móveis.
* **Modo Espectador Fantasma:** Permite que jogadores com zero cartas na mão solicitem visão da mão de outros jogadores ativos.
* **Sistema de Notificações em Tempo Real:** Mecânica de "aceitar ou negar" para solicitações de espectador e alertas de interação.
* **Identidade Religiosa Visual:** Exibição de ícones de escudo (`shield-cross.svg` e `shield-sword.svg`) e cores dinâmicas para as facções Católica e Protestante.
* **Feedback Visual de Espectador:** Destaque com brilho azul suave e borda no avatar do jogador que está sendo assistido.
* **Interface Responsiva e Adaptável:** Ocultação automática do botão de espectador para jogadores que possuem cartas na mão.
* **Sistema de Salas Privadas:** Criação e entrada em salas via códigos únicos de 4 dígitos com função de cópia rápida no cabeçalho.
* **Modo Ranqueado Beta:** Tela e fluxo próprios para contas Google, sem host, com bots IA experimentais na sala de espera, turnos, custos, alvos, contestações, bloqueios, perdas de influência e tempos de resposta controlados pelo sistema. Rating e leaderboard continuam suspensos até existir validação autoritativa antifraude.
* **Banner AdSense na Espera Ranqueada:** Slot responsivo de publicidade carregado apenas em `ranked-waiting.html`, antes da partida ativa.
* **Controle de Áudio Integrado:** Música de fundo e efeitos sonoros sincronizados para ações como compra de cartas, moedas e impacto.
* **Gestão de Bots:** Capacidade de adicionar bots para testes de mesa.
* **Modais de Referência Rápida:** Visualização de guias de ações de personagens e regras alternativas através de cartas que giram (flip cards).

---

## 🛠️ Tecnologias

- **Frontend:** HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript (ES Modules)
- **Arquitetura:** Modular com separação de responsabilidades
- **Backend (BaaS):** Firebase Realtime Database
- **Autenticação:** Firebase Authentication (Google Provider + Anonymous Provider)
- **Hospedagem:** GitHub Pages
- **Monetizacao:** Google AdSense com bloco display responsivo na sala de espera ranqueada

---

## 🎮 Como Jogar

1. **Acesso:** Faça login com sua conta Google ou entre como visitante.
2. **Salas:** Crie uma nova sala como Host ou entre em uma existente usando o código de 4 dígitos.
3. **Mesa:**
   * **Host:** Configure o baralho no menu de engrenagem (⚙️) antes de iniciar.
   * **Ações:** Clique no Deck para comprar, arraste cartas para o Cemitério ou clique nos botões de moedas para atualizar seu saldo.
   * **Eliminação:** Se ficar sem cartas, clique no ícone do **Fantasma** para começar a espectar seus amigos.

---

## 🏗️ Arquitetura

O projeto segue uma arquitetura modular com separação clara de responsabilidades:

- **js/firebase/firebase.js** → Inicialização e infraestrutura (Auth + Database)
- **js/gamemode/game-modes.js** → Contrato compartilhado dos modos Casual e Ranqueado
- **rules.js** → Constantes e manipulação estrutural do baralho
- **gameState.js** → Gerenciamento de estado e transações Firebase
- **js/gamemode/casual/audio-service.js** → Audio casual, BGM, volume e sincronizacao de efeitos
- **js/gamemode/casual/card-preview.js** → Preview ampliado de cartas e flip do modal
- **js/gamemode/casual/modal-service.js** → Helpers compartilhados de abertura e fechamento de modais
- **js/gamemode/casual/settings-service.js** → Preferencias locais, compatibilidade de arraste e visibilidade de religiao
- **js/gamemode/casual/deck-presets.js** → Presets de composicao do baralho casual e duelo
- **js/gamemode/casual/drag-drop.js** → Drag/drop HTML5 legado, fallback Pointer Events e dropzones
- **js/gamemode/casual/render-cards.js** → Renderizacao de cartas, assets, tooltips e frente/verso
- **js/gamemode/casual/render-players.js** → Renderizacao dos slots, avatares, maos e badges do casual
- **board-renderer.js** → Renderização da interface e interações
- **lobby-manager.js** → Autenticação, criação e gerenciamento de salas
- **js/ui/ad-slots.js** → Configuracao central dos slots Google AdSense

Essa divisão garante escalabilidade, manutenibilidade e separação entre lógica de domínio e camada de apresentação.

O projeto segue princípios de:
- Separação de responsabilidades (SRP)
- Modularização por domínio
- Controle de estado centralizado
- Arquitetura baseada em eventos (listeners do Firebase)

---

## 📁 Estrutura de Pastas do Projeto

O projeto adota uma arquitetura modular baseada em responsabilidades bem definidas, separando os recursos estáticos (assets), as folhas de estilo (CSS) e o núcleo lógico do jogo (JS).

```text

Coup-Master/
├── 📂 assets/                  # Recursos de mídia estáticos
│   ├── 📂 img/                 # Banco de imagens global
│   │   ├── 📂 cards/           # Texturas das cartas divididas por expansões
│   │   │   ├── 📂 base/        # Cartas do Jogo Base (Duque, Capitão, etc.)
│   │   │   ├── 📂 promo/       # Cartas promocionais e extras
│   │   │   ├── 📂 dlc1/        # Influências da Revolução
│   │   │   └── 📂 dlc2/        # Influências do Asilo
│   │   ├── 📂 icons/           # Ícones SVG e UI do tabuleiro
│   │   └── 📂 logo/            # Identidade visual e favicons do projeto
│   ├── 📂 sounds/              # Trilha sonora (bgm) e efeitos sonoros (vfx)
├── 📂 css/                     # Estilização e folhas de estilo
│   ├── ads.css                 # Slot responsivo de publicidade
│   ├── lobby.css               # Design da interface do menu e salas
│   ├── legal.css               # Layout das páginas legais públicas
│   ├── casual-mode.css         # Layout do tabuleiro 2D e responsividade mobile
│   └── ranked-mode.css         # Layout dedicado do modo ranqueado
├── 📂 js/                      # Núcleo lógico do ecossistema JavaScript
│   ├── 📂 core/                # Estado do jogo e regras globais
│   │   ├── gameState.js        # Sincronização do estado da partida em tempo real
│   │   └── rules.js            # Definição matemática de cartas e baralhos
│   ├── 📂 firebase/            # Infraestrutura Firebase
│   │   └── firebase.js         # Inicialização e conexões com o banco de dados
│   ├── 📂 gamemode/            # Lógicas específicas por modo de jogo
│   │   ├── 📂 casual/          # Scripts dedicados à mesa clássica casual
│   │   │   ├── audio-service.js # Audio casual e sincronizacao SFX
│   │   │   ├── card-preview.js # Preview ampliado de cartas
│   │   │   ├── modal-service.js # Helpers compartilhados de modais
│   │   │   ├── settings-service.js # Preferencias locais do casual
│   │   │   ├── deck-presets.js # Presets de baralho casual
│   │   │   ├── drag-drop.js # Drag/drop legado e fallback compativel
│   │   │   ├── render-cards.js # Renderizacao de cartas
│   │   │   ├── render-players.js # Renderizacao dos jogadores
│   │   │   └── board-renderer.js # Manipulador do DOM e renderizador do tabuleiro 2D
│   │   └── 📂 ranked/          # Scripts dedicados ao modo ranqueado
│   │       ├── ranked-rules.js
│   │       ├── ranked-engine.js
│   │       ├── ranked-renderer.js
│   │       └── ranked-game.js
│   ├── 📂 lobby/
│   │   └── lobby-manager.js    # Fluxo de criação, faxina e entrada de salas
│   └── 📂 ui/
│       ├── ad-slots.js         # Renderizacao dos slots AdSense
│       ├── background-audio-guard.js
│       └── selection-lock.js
├── 📄 index.html               # Tabuleiro principal do jogo em modo normal 2D
├── 📄 login.html               # Tela de autenticação Google/visitante
├── 📄 lobby.html               # Perfil autenticado, criação e entrada em salas
├── 📄 privacy.html             # Política de Privacidade
├── 📄 terms.html               # Termos de Serviço
└── 📄 README.md                # Documentação técnica do projeto

```

### 🔍 Descrição dos Principais Diretórios

* **`assets/img/cards/`**: Organizado estrategicamente em subpastas (`base`, `promo`, `dlc1`, `dlc2`) para permitir que o motor do jogo (`board-renderer.js`) monte dinamicamente as URLs das texturas com base no tipo e na expansão configurada nos presets de baralho.
* **`js/core/`**: Funciona como o motor lógico invisível do jogo. O `gameState.js` escuta e injeta alterações diretamente no Firebase, garantindo que o jogo funcione como um sandbox em tempo real.
* **`js/firebase/`**: Centraliza a inicialização do Firebase e expõe `window.db` e `window.auth` para os demais scripts.
* **`js/gamemode/casual/`**: Concentra a mesa casual. `board-renderer.js` manipula o DOM de forma reativa, `audio-service.js` centraliza BGM/efeitos, `card-preview.js` cuida do preview ampliado, `modal-service.js` padroniza modais, `settings-service.js` centraliza preferencias locais, `deck-presets.js` concentra presets de baralho, `drag-drop.js` centraliza o arraste legado e compativel, `render-cards.js` monta as cartas visuais e `render-players.js` renderiza os slots de jogadores.
* **`js/gamemode/ranked/`**: Concentra o fluxo automatizado do modo ranqueado, incluindo regras, máquina de estados, renderização e integração Firebase.
* **`js/ui/`**: Centraliza utilitarios de interface compartilhados, incluindo protecao de audio em background, bloqueio de selecao e renderizacao dos slots AdSense.
* **Raiz (`.html`)**: Mantém os pontos de entrada do servidor web organizados de forma plana, simplificando os redirecionamentos diretos de rotas e parâmetros de URL (`?room=CODE`) entre o Lobby e o tabuleiro principal.

### Documentos legais

O projeto possui páginas públicas para a **Política de Privacidade** (`privacy.html`) e os **Termos de Serviço** (`terms.html`). Os links ficam no rodapé de `login.html` e `lobby.html`, fora das telas de partida e da sala de espera ranqueada, para manter o jogo limpo e ainda permitir consulta antes da entrada em salas.

Esses textos são uma base operacional para o beta do Coup Master e devem passar por revisão jurídica antes de uso comercial ou coleta ampliada de dados.

---

### Monetizacao com AdSense

O projeto possui um unico bloco de anuncio ativo no momento: um banner responsivo na sala de espera ranqueada (`ranked-waiting.html`). O lobby, a mesa casual, a mesa ranqueada ativa e o modal de resultado final nao exibem anuncios.

Arquivos relacionados:

- `ranked-waiting.html`: carrega `css/ads.css`, o snippet oficial do AdSense no `<head>` e o script `js/ui/ad-slots.js`.
- `css/ads.css`: define o visual responsivo do slot e o estado placeholder.
- `js/ui/ad-slots.js`: centraliza `ADSENSE_CLIENT` e `AD_SLOTS.rankedWaiting`.

Configuracao atual:

```javascript
const ADSENSE_CLIENT = 'ca-pub-5483968891175594';

const AD_SLOTS = {
  rankedWaiting: '6425587327'
};
```

Como o GitHub Pages do Coup Master usa caminho de projeto (`/Coup-Master`), o AdSense valida o dominio raiz `gabrielbarbosa0.github.io`. Para revisao do Google, mantenha tambem o repositorio raiz `gabrielbarbosa0.github.io` publicado com o snippet de verificacao do AdSense.

Evite adicionar anuncios dentro da mesa ativa, sobre cartas, controles de turno, modais de decisao ou areas de clique frequente, para reduzir risco de clique acidental.

---

## 🛠️ Instalação e Configuração

### 2️⃣ Crie o Projeto no Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Clique em **Criar Projeto**
3. Adicione um **App Web (</>)**
4. Copie as credenciais do objeto `firebaseConfig`

---

### 3️⃣ Configure a Autenticação (Obrigatório)

Para que o login e a reserva de slots funcionem:

1. No Firebase Console, vá em **Build > Authentication**
2. Acesse a aba **Sign-in method**
3. Ative os provedores **Google** e **Anônimo**
4. Vá em **Settings > Authorized domains**
5. Adicione:
   - `seu-usuario.github.io`
   - `127.0.0.1` (para testes locais)

---

### 4️⃣ Configure o Realtime Database

1. Vá em **Build** > **Realtime Database** e crie uma instância.
2. Na aba **Regras**, utilize a configuração abaixo para permitir a manutenção automática:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "rankedStats": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "rankedResults": {
      ".read": "auth != null",
      "$resultKey": {
        ".write": "auth != null && !data.exists()"
      }
    },
    "salas": {
      "$roomCode": {
        ".read": "auth != null",
        // Permite criar a sala e atualizar a atividade (lastActivity)
        ".write": "auth != null",

        "gameState": {
          // Permite que jogadores enviem sons e mexam no Asilo/Cemitério
          "lastSFX": { ".write": "auth != null" },
          "asylumScore": { ".write": "auth != null" },
          "freeCards": { ".write": "auth != null" },

          // PROTEÇÃO DO DECK: Apenas o Host pode resetar ou mudar a config
          "deck": { ".write": "auth.uid === data.parent().parent().child('hostUID').val()" },
          "deckConfig": { ".write": "auth.uid === data.parent().parent().child('hostUID').val()" },

          "players": {
            "$playerId": {
              // PERMISSÃO DE ENTRADA: 
              // Permite escrever se o slot estiver vazio (Join), se for o dono ou se for o Host (Kick)
              ".write": "auth != null && (!data.exists() || data.child('uid').val() === auth.uid || auth.uid === data.parent().parent().parent().child('hostUID').val() || (!data.hasChild('uid') && newData.child('uid').val() === auth.uid))"
            }
          }
        }
      }
    }
  }
}
```

Isso garante que apenas usuários autenticados possam acessar as salas e que o lobby consiga ler as estatísticas do modo ranqueado.

Os caminhos `rankedStats/{uid}` e `rankedResults/{resultKey}` são obrigatórios para o perfil ranqueado:

- `rankedResults/{resultKey}` guarda o resultado imutável de cada partida finalizada.
- `rankedStats/{uid}` guarda vitórias, derrotas, sequências, pontuação, ações e progresso de conquistas do jogador.
- `rankedStats/{uid}/countedRooms/{resultKey}` impede que a mesma partida seja contabilizada mais de uma vez no perfil.

> Enquanto o resultado e as estatísticas forem gravados pelo cliente, esses dados servem para beta, histórico local do jogador e testes de produto. Para ranking competitivo confiável, a validação do resultado deve migrar futuramente para um backend autoritativo ou Cloud Functions.

---

### 5️⃣ Vincule o Código ao Firebase

Atualize as credenciais no seu projeto  
(ex: `js/firebase/firebase.js`):

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

## 🛠️ Manutenção do Banco de Dados (Realtime Database)

Este projeto utiliza o **Plano Spark (Gratuito)** do Firebase. Por conta das limitações deste plano, funções agendadas de limpeza automática via servidor (Cloud Functions) não podem ser ativadas.

Com o tempo, o acúmulo de salas pode deixar o console do Firebase lento ou ativar o **"Modo Somente Leitura"**. Quando isso ocorrer, siga o procedimento abaixo:

### 🧹 Procedimento de Limpeza Manual

Caso o banco de dados apresente lentidão devido ao excesso de registros:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. No menu lateral, vá em **Realtime Database**.
3. Clique nos **três pontos (⋮)** localizados no canto superior direito da visualização de dados.
4. Selecione a opção **"Importar JSON"**.
5. Clique em navegar e escolha o arquivo **`limpeza.json`** localizado na raiz deste repositório.
6. Confirme a importação.

> [!CAUTION]
> **Atenção:** Este procedimento substituirá o nó selecionado (ex: `salas`) por um objeto vazio `{}`. Isso removerá **todas** as salas ativas e acumuladas instantaneamente, restaurando a performance total do painel.

### 🤖 Limpeza em Tempo de Execução

Embora o servidor não limpe as salas sozinho, o projeto possui uma lógica interna no arquivo `lobby-manager.js` que tenta remover salas inativas por mais de 24 horas sempre que um usuário acessa o Lobby.

* **Critério de Limpeza:** A função verifica os campos `lastActivity` e `createdAt` para determinar a idade da sala.
* **Limitação:** Se o site ficar muito tempo sem nenhum acesso no Lobby, o acúmulo manual via console (explicado acima) será necessário.

---

## 🧠 Desafios Técnicos

- Sincronização de estado em tempo real entre múltiplos jogadores
- Controle de concorrência em ações simultâneas
- Reconexão persistente via UID
- Gerenciamento de sala com slots reservados
- Renderização dinâmica com feedback visual em tempo real


## 📚 Aprendizados

Durante o desenvolvimento deste projeto, foram aplicados conceitos como:

- Sincronização de estado distribuído
- Tratamento de concorrência
- Arquitetura modular em JavaScript
- Design de sistemas multiplayer em tempo real
- Gerenciamento de autenticação e persistência com Firebase

## Compatibilidade

O modo casual usa o drag and drop nativo do navegador como base historica. Em `Configuracoes > Compatibilidade`, o fluxo alternativo de arraste baseado em Pointer Events fica ativado por padrao para melhorar a usabilidade em navegadores moveis como Samsung Internet.

O projeto também carrega `css/compat.css` nas telas principais para reduzir interferências de alto contraste forçado e recoloração automática em navegadores móveis.

## 🚀 Próximas Atualizações (Roadmap)

- [ ] **Custom Deck Engine:** Sistema de importação de baralhos via JSON personalizado, permitindo temas e regras totalmente customizáveis.
- [ ] **Card Previewer:** Visualização de cartas em alta definição ao clicar e segurar, facilitando a leitura de artes e habilidades.
- [ ] **Visual Stack:** Nova renderização de cartas em formato de leque ou pilha, otimizando o espaço da mesa para grandes grupos.
- [ ] **Coup Workshop:** Web app integrado para criação, edição e exportação de cartas personalizadas para a comunidade.
- [ ] **Expansões de Conteúdo:** Adição de novos sistemas de DLCs para integrar mecânicas complexas de forma modular.
- [ ] **Theming Engine (Beta):** Suporte para troca dinâmica de nomes de cartas, nomes de áreas, estilos visuais e efeitos sonoros.


---

## 📄 Licença
Este projeto é de código aberto sob a licença [MIT](LICENSE).
