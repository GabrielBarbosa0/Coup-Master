# Mesa de Jogo 2.0

Prototipo visual isolado para testar uma mesa horizontal com oito jogadores.

## Estrutura

- quatro jogadores na faixa superior;
- Asilo, Cemiterio e Baralho na faixa central;
- quatro jogadores na faixa inferior;
- controles de sala e jogo sobrepostos no topo;
- acesso ao chat na lateral esquerda;
- resumo da sala no rodape.

## Responsividade

Em telas de ate 700px, a mesa muda para um fluxo vertical:

- controles da sala e do jogo permanecem na primeira linha;
- os oito jogadores sao organizados em duas colunas;
- o Cemiterio ocupa uma linha inteira depois dos jogadores;
- Asilo e Baralho dividem a linha seguinte;
- o resumo da sala permanece no final da mesa.

Entre 701px e 1024px, o layout tablet preserva a composicao horizontal, mas remove larguras minimas rigidas e adapta jogadores, cartas e areas centrais ao espaco disponivel.

Acima de 1024px, a composicao horizontal original e preservada: quatro jogadores, Asilo/Cemiterio/Baralho e mais quatro jogadores.

O prototipo nao usa Firebase e nao altera o tabuleiro principal. As interacoes de moedas, compra de carta, chat, tela cheia e reset funcionam apenas localmente para demonstracao.

Abra `teste/mesa-2.0/index.html` por um servidor estatico.
