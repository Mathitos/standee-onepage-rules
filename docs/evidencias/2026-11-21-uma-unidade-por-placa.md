# Uma unidade por placa (D037) — 21/11/2026

## Pedido

"vamos manter 0.2 entao, e quando for gerar o 3mf, gere 1 unidade por plate, com as bases na plate"

## Como ficou

- **Padrão novo (`--placas unidade`):** cada unidade da lista ganha uma placa, com as figuras e as bases dela.
  - As placas seguem o número da unidade e levam o nome dela, por exemplo "1 Infantry Squad", "3 Veterans" e "4 Veterans".
  - Se uma unidade não couber numa placa, ganha outras, com o nome "3 Veterans (1/2)", "(2/2)" e assim por diante.
  - Acabamentos diferentes da mesma unidade vão na mesma placa.
- **Torre de purga:** fica em y = 200 em todas as placas de unidade, como nas placas com bases (D027).
- **Opção antiga (`--placas acabamento`):** placas por acabamento, com `--bases-junto` decidindo as bases (D033).
- **Prévias:** o gerador agora apaga as prévias de placa da geração anterior na mesma pasta.
- **Projetos de teste:** continuam com bico 0,2. A Infantry com bico 0,4 (`saidas/teste-infantry-bico-04/`) ficou como estava.

## Custo (CLI do Bambu Studio 02.07.01.57, A1 bico 0,2, volumes de purga supostos)

Cada placa repete as trocas das camadas com desenho branco: 8 por placa na peça única sem relevo, com miolo preto. Repete também a purga de cada troca.

| Projeto | Antes | Uma unidade por placa |
|---|---|---|
| Lista completa (14 figuras e 14 bases) | 1 placa, 8 trocas, 816,0 min, 10,2 + 33,7 g | 6 placas, 48 trocas, 1045,3 min, 26,6 + 40,3 g |
| Teste de peça única (5 artes e 5 bases) | 1 placa, 8 trocas, 382,7 min | 4 placas, 32 trocas, 520,8 min |
| Teste das metades (3 acabamentos) | 4 placas por acabamento, 26 trocas, 574,7 min | 4 placas por unidade, 55 trocas, 717,8 min |

Placas da lista completa:

| Placa | Peças | Trocas | Tempo |
|---|---:|---:|---:|
| 1 Infantry Squad | 3 figuras + 3 bases | 8 | 154,5 min |
| 2 Combat Bikers | 3 + 3 | 8 | 294,3 min |
| 3 Veterans | 3 + 3 | 8 | 156,3 min |
| 4 Veterans | 3 + 3 | 8 | 156,3 min |
| 5 OGRE Robot | 1 + 1 | 8 | 141,9 min |
| 6 OGRE Robot | 1 + 1 | 8 | 142,0 min |

- **Custo total:** +3,8 h e +23 g de filamento em relação à placa única. A diferença é quase toda purga.
- **O que a estimativa não conta:** o início de cada placa (aquecimento e nivelamento). Ela dá ~20 s por placa entre o tempo do modelo e o total.
- **Ganho prático:**
  - cada unidade é uma impressão de 2,4 a 4,9 h;
  - uma falha perde só aquela unidade;
  - dá para imprimir só as unidades que faltam.

## Não verificado

- Impressão real.
- Volumes de purga reais.
