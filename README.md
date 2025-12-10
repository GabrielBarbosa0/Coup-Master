# Coup Master - Protótipo Online v0.0.1

Este é um protótipo funcional e multiplayer (até 8 jogadores) do jogo de tabuleiro "Coup", incluindo a expansão "A Reforma". O projeto é 100% estático (HTML, CSS, JavaScript) e utiliza o Firebase Realtime Database para sincronizar o estado do jogo entre todos os jogadores em tempo real.

O foco deste protótipo é fornecer uma "sandbox" (caixa de areia) para os jogadores, onde as regras (como pagar moedas, virar cartas, ou mudar de religião) são aplicadas manualmente pelos próprios jogadores, permitindo uma jogabilidade flexível.

![Interface do Jogo](img/game-screenshot.png)
*(Substitua esta linha por um link de uma captura de tela do seu jogo)*

---

## ✨ Funcionalidades

* **Multiplayer em Tempo Real (Até 8 Jogadores):** A sala é criada dinamicamente e os slots de jogador aparecem apenas quando novos jogadores entram.
* **Persistência de Sessão (por Aba):** Utiliza `sessionStorage` para que um jogador possa recarregar a página (F5) e reconectar-se ao seu slot, sem conflitos entre abas.
* **Sincronização com Firebase:** O estado do jogo (cartas na mão, moedas, religião, jogadores online) é sincronizado em tempo real para todos os clientes.
* **Expansão "A Reforma":**
    * **Asilo:** Área do Asilo com contador de moedas manual (`+`/`-`).
    * **Religião:** Cada jogador possui um status (Católico/Protestante) que pode ser alternado com um clique.
* **Baralho Configurável (Host):** O Jogador 1 (Host) pode definir quantas cópias de cada carta (base e expansão) estarão no baralho através de um modal de configuração (ícone de engrenagem).
* **Gestão da Sala:** Cada slot de jogador (quando online) possui um botão (`❌`) para remoção manual.
* **Interações Manuais:** O jogo funciona como uma "sandbox" onde os jogadores aplicam as regras, movem suas moedas (`+`/`-`) e gerem o Asilo.
* **Layout Responsivo:** A interface se adapta de um grid 4x2 no desktop para um layout empilhado em dispositivos móveis.
* **Ajuda Interativa:** Um modal "flip-card" exibe as ações de personagens e regras básicas.

---

## 🚀 Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+)
* **Backend & Database:** Firebase (Realtime Database)
* **Hospedagem:** Otimizado para GitHub Pages

---

## ⚙️ Como Rodar (Instalação)

Este projeto é estático, mas **requer o Firebase** para funcionar.

1.  **Clone o Repositório:**
    ```bash
    git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
    ```

2.  **Crie um Projeto no Firebase:**
    * Vá até o [console do Firebase](https://console.firebase.google.com/).
    * Crie um novo projeto.
    * Adicione um novo "Aplicativo Web" (clicando no ícone `</>`).
    * Copie o objeto `firebaseConfig` que será fornecido.

3.  **Configure o Realtime Database:**
    * No menu do Firebase, vá em **Build > Realtime Database**.
    * Crie um banco de dados.
    * **IMPORTANTE:** Vá para a aba **"Regras" (Rules)** e inicie em **modo de teste** (`test mode`) para permitir leitura e escrita.
        ```json
        {
          "rules": {
            ".read": true,
            ".write": true
          }
        }
        ```

4.  **Configure o `index.html`:**
    * Abra o arquivo `index.html`.
    * Encontre o comentário `// 1. INICIALIZAÇÃO E CONFIGURAÇÃO DO FIREBASE`.
    * Cole o seu objeto `firebaseConfig` no local indicado.

5.  **Estrutura de Imagens (Obrigatório):**
    * O `index.html` espera uma pasta `/img/` no mesmo nível.
    * Certifique-se de que esta pasta contém todas as imagens de cartas (`duque.png`, `inquisidor.png`, etc.), o verso da carta (`back.png`), a imagem do asilo (`asilo.png`), os ícones dos botões (`cached.svg`, `info.svg`, `settings_account.svg`, etc.) e as imagens do modal de ações (`front-actions.jpg`, `back-actions.jpg`).

6.  **Hospede o Projeto:**
    * Envie seus arquivos (com o `firebaseConfig` preenchido e a pasta `img/`) para o seu repositório do GitHub.
    * Ative o **GitHub Pages** nas configurações do seu repositório.

Pronto! Qualquer pessoa que acessar o link entrará na mesma sala de jogo.

---

## 📄 Licença

Este projeto é distribuído sob a licença MIT.