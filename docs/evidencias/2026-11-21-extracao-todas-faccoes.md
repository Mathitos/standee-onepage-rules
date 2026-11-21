# Extração das artes P&B de todas as facções — 21/11/2026

## Pedido

"eu baixei o pdf de todas facções que encontrei [...] quero vc extraia todas as artes BW q vc encontrar". Depois: "tambem quero poder utilizar para listas do Age of Fantasy, entao n pegue apenas as do GF".

## Fontes

- **PDFs "- BW" avulsos (14):** Alien Hives, Beastmen, Blessed Sisters, Daemons of Plague, Duchies of Vinci, Dwarf Guilds, Eternal Dynasty, Human Defense Force, Human Empire, Jackals, Mummified Undead, Ratmen, Saurians, Shadow Stalkers e Wood Elves.
  - Vampiric Undead estava só dentro de `dtrpg-2026-11-17_06-35pm.zip` e foi copiado para Downloads.
- **Sets:** Daemons of Change (2), Daemons of Lust (2), Daemons of War (2), High Elf Fleets (5), Robot Legions (5) e Saurian Starhost (4).
  - Cada set é um zip dentro de `dtrpg-2026-11-17_06-34pm.zip` ou `06-35pm.zip`, com um PDF e tokens de VTT.
  - O PDF de cada set tem capa, coloridas, P&B com borda branca, coloridas com borda preta, P&B com borda preta e instruções.
- **Páginas P&B:** fração de pixels coloridos por página, com render a 12 dpi. As P&B têm 0; as coloridas, 0,3% ou mais.
  - Bate com a lista do outro agente.
  - A última página de cada set (instruções) também é P&B e ficou de fora.
  - Robot Legions Set 5 p3 deu 0,13%: é uma página colorida de robôs cinza e ficou de fora, porque só entram trechos de 3 ou mais páginas P&B seguidas.
- **PDF P&B por facção:** as P&B dos sets foram juntas num PDF por facção, em Downloads, no padrão dos avulsos: `<Facção>_-_BW.pdf`.
  - Ordem: as de borda branca de todos os sets, depois as de borda preta.
  - Os terrenos viraram `Saurian_Starhost_-_Terrain_-_BW.pdf` e `High_Elf_Fleet_-_Terrain_-_BW.pdf`. Não entram no catálogo: são cenário, não unidades.
- **Sistema de cada facção:** pela capa, "Sci-Fi Paper Miniatures Pack" ou "Fantasy Paper Miniatures Pack". Os quatro Daemons são de fantasia.
  - **Sci-fi** → `catalog/gff/`: Alien Hives, Blessed Sisters, Dwarf Guilds, Eternal Dynasty, High Elf Fleets, Human Defense Force, Jackals, Robot Legions e Saurian Starhost.
  - **Fantasia** → `catalog/aof/`: Beastmen, Daemons of Change/Lust/Plague/War, Duchies of Vinci, Human Empire, Mummified Undead, Ratmen, Saurians, Shadow Stalkers, Vampiric Undead e Wood Elves.
  - A mesma arte serve a GF e GFF, e a AoF e AoF Skirmish/Regiments. O sistema do army book se escolhe no passo 2.

## Layouts novos (D038)

O detector de grade foi calibrado no HDF. Nos outros PDFs apareceram:

| Caso | Exemplo | Tratamento |
|---|---|---|
| Abas de 14,8 a 24,8 mm, não 20 ± 2,5 | Wood Elves p27, Saurian Starhost p14, Mummified Undead p2 | abas entre 12 e 30 mm, iguais dos dois lados (±2,5) |
| Figura grande de página inteira, faixa vertical (aba, verso de cabeça para baixo, frente em pé, aba) | Daemons of Lust p8 (Harbinger), Shadow Stalkers p4 (duas faixas) | sem faixa horizontal, tenta a página girada 90° no sentido horário |
| Rótulo da figura grande embaixo da faixa, ou à esquerda dela | Saurian Starhost p11 / Daemons of Lust p8 | tenta embaixo; se vazio, à esquerda |
| Linha a mais na margem | Beastmen p7 | procura as 5 linhas do padrão entre as encontradas |
| Linha a menos: aba que não fecha, ou linha entre verso e aba coberta pela arte | Robot Legions p10; High Elf Fleets p1, Alien Hives p14 | reconstrói a linha que falta |
| Tabela estreita (enxames), linhas com menos de 80 mm | Mummified Undead p26, Ratmen p22 | sem faixa com 80 mm, tenta 50 mm |
| Traço fino da figura grande passa do limiar de estilo e a página sai "borda" | Daemons of Lust p8 (0,73) | duas "bordas" sem par, com o mesmo rótulo e uma contendo a outra, viram par; a menor é a fina |

- **Falso positivo nas capas:** as tentativas girada e de 50 mm achavam "faixas" na ilustração da capa.
  - Agora se exige frente e verso com 10 mm ou mais (as capas davam 0,2 a 3,7 mm) e abas com até 20% de tinta.
  - Nas faixas reais dos 22 PDFs, as abas têm de 0 a 7% de tinta; nas capas, 63% a 95%.
- **Mesma regra no gerador:** `prototipo/pdf_grade.py` usa o mesmo código de detecção (conferido: funções iguais), para os índices de linha da lista baterem. A 600 dpi os recortes saem com o dobro do tamanho.
- **HDF inalterado:** o `candidatos.json` do HDF, regerado com o código novo, é idêntico ao anterior (páginas, grupos e candidatos), e o gerador continua achando 218 linhas.

## Primeira extração (antes da revisão independente)

| Facção | Páginas | Arte | Ignoradas | Giradas | Candidatos | Pares | Sem par | Rótulo vazio |
|---|---:|---:|---|---:|---:|---:|---:|---:|
| aof/beastmen | 44 | 42 | 1, 44 | 0 | 49 | 38 | 11 | 0 |
| aof/daemons-of-change | 30 | 30 | — | 2 | 28 | 18 | 10 | 0 |
| aof/daemons-of-lust | 24 | 24 | — | 2 | 21 | 20 | 1 | 0 |
| aof/daemons-of-plague | 28 | 26 | 1, 28 | 2 | 27 | 18 | 9 | 2 |
| aof/daemons-of-war | 28 | 28 | — | 2 | 23 | 21 | 2 | 0 |
| aof/duchies-of-vinci | 48 | 46 | 1, 48 | 0 | 49 | 40 | 9 | 0 |
| aof/human-empire | 66 | 64 | 1, 66 | 10 | 82 | 68 | 14 | 6 |
| aof/mummified-undead | 56 | 54 | 1, 56 | 0 | 63 | 41 | 22 | 8 |
| aof/ratmen | 68 | 66 | 1, 68 | 2 | 50 | 48 | 2 | 0 |
| aof/saurians | 50 | 48 | 1, 50 | 4 | 53 | 39 | 14 | 2 |
| aof/shadow-stalkers | 50 | 48 | 1, 50 | 4 | 39 | 39 | 0 | 0 |
| aof/vampiric-undead | 66 | 64 | 1, 66 | 4 | 56 | 55 | 1 | 0 |
| aof/wood-elves | 87 | 86 | 1 | 6 | 81 | 68 | 13 | 4 |
| gff/alien-hives | 58 | 56 | 1, 58 | 10 | 41 | 41 | 0 | 0 |
| gff/blessed-sisters | 80 | 78 | 1, 80 | 2 | 85 | 78 | 7 | 2 |
| gff/dwarf-guilds | 78 | 76 | 1, 78 | 0 | 72 | 67 | 5 | 0 |
| gff/eternal-dynasty | 44 | 42 | 1, 44 | 0 | 67 | 27 | 40 | 2 |
| gff/high-elf-fleets | 72 | 72 | — | 0 | 70 | 52 | 18 | 0 |
| gff/human-defense-force | 62 | 60 | 1, 62 | 0 | 69 | 69 | 0 | 0 |
| gff/jackals | 46 | 44 | 1, 46 | 0 | 44 | 36 | 8 | 0 |
| gff/robot-legions | 42 | 42 | — | 2 | 38 | 34 | 4 | 0 |
| gff/saurian-starhost | 52 | 52 | — | 8 | 45 | 37 | 8 | 0 |
| **Total** | | | | | **1152** | **954** | **198** | **26** |

- **Faixas e páginas:** 4434 faixas no total. As páginas ignoradas são só a capa e a última (instruções); nenhuma faixa descartada em página de arte.
- **Tempo:** ~2,5 min para todas as facções, 4 de cada vez.
- **Daemons of Lust p8 (Harbinger):** recorte em pé e rótulo legível na folha de rótulos.

## Revisão independente e correções

O usuário pediu um agente para conferir se faltava alguma arte. O agente revisor trabalhou sem as conclusões desta sessão, comparando contagens próprias de faixas, cores das páginas, rótulos por XOR e tokens de VTT de cada set. Ele achou artes perdidas:

- **Ratmen p24 e p57:** 3 tabelas "Giant Rat V1" de 70 mm, numa página que também tinha tabelas de 85 mm. A tentativa com linhas de 50 mm só rodava em páginas sem nenhuma faixa de 80 mm.
- **Cópias agrupadas por engano:** o agrupamento olhava só tamanho e miniatura.
  - **Rótulos diferentes:** "Raider V1" × "V2", "Vulture Zapper" × "Shotgun" × "Blaster" e outros 11 casos.
  - **Mesmo rótulo, cabeça diferente:** 6 variantes do Eternal Dynasty.
  - **Total perdido:** 16 artes nos dois estilos e 7 num estilo só.
- **Silhuetas quebradas:** no contorno fino do Eternal Dynasty (p5–8), frente × verso ficava entre 0,04 e 0,17.

Correções (`grade.py`, com o mesmo código em `prototipo/pdf_grade.py`):

- **Tabelas estreitas:** as faixas de 50 mm entram também em páginas com faixas de 80 mm, quando não cruzam nenhuma delas.
- **Silhueta com limiar 200, não 128:** o traço de fora do contorno fino é cinza claro.
  - Eternal Dynasty p5: 0,165 → 0,973; Daemons of Lust p3: 0,64 → 0,96.
  - Grupos com frente × verso < 0,9: de 222 para 59, somando as 22 facções.
- **Cópia exige o mesmo rótulo impresso** (`rotulos_iguais`): idênticos dão 0; um caractere diferente, 0,04 ou mais.
- **Cópia exige o mesmo desenho** (`diferenca_local`): diferença forte de cinza numa janela de 2 mm, com o recorte desfocado.
  - A medida fica dentro da silhueta, fora do preto sólido, com abertura 2×2, e vale o menor dos dois sentidos.
  - **Calibração:** cópias e ruído dão 0,0. Os testes foram nas hachuras de 1 px do HDF, nos furos da borda grossa do High Elf Fleets e nas linhas finas. As cabeças trocadas do Eternal Dynasty dão de 0,104 a 0,58. O limite ficou em 0,05.
  - As primeiras versões da medida (binária, só em cinza, sem tirar o preto sólido) separavam cópias idênticas. Chegaram a 124 artes a mais, e foram descartadas.

Resultado:

- **Faixas perdidas:** as 42 apontadas pelo revisor agora são grupos próprios.
- **Ratmen p24/p57:** 5 faixas em 2 grupos.
- **Totais:** 4434 → 4440 faixas, 1152 → 1149 candidatos, 954 → 993 pares. Com os rótulos de canto (abaixo), 1137 candidatos e 1005 pares.
  - O total de candidatos quase não muda porque a silhueta nova também junta cópias que antes ficavam separadas por máscara quebrada. Por exemplo, o Eternal Dynasty foi de 67 para 61 candidatos e de 27 para 46 pares.
- **HDF:** candidatos idênticos aos de antes, na mesma ordem. O `revisao.json` continua valendo.

- **Rótulos vazios (26):** em faixas largas encostadas na margem, o rótulo fica embaixo do canto esquerdo da faixa (Mummified Undead p3, Eternal Dynasty p3, Wood Elves p20) ou em cima dele (Human Empire p4). A grade passou a procurar nessas duas posições quando não acha nada à esquerda. Os 26 apareceram, todos legíveis ("Snake King", "Army Standard", "Drone Sage"…).

Não verificado: variantes do mesmo rótulo com diferença menor que a das cabeças do Eternal Dynasty. O revisor não inspecionou um a um os ~640 grupos com pontuação baixa.

## Resultado final (depois das correções)

| Facção | Faixas | Candidatos | Pares | Sem par |
|---|---:|---:|---:|---:|
| aof/beastmen | 176 | 52 | 41 | 11 |
| aof/daemons-of-change | 122 | 28 | 18 | 10 |
| aof/daemons-of-lust | 90 | 22 | 21 | 1 |
| aof/daemons-of-plague | 100 | 26 | 19 | 7 |
| aof/daemons-of-war | 104 | 25 | 21 | 4 |
| aof/duchies-of-vinci | 206 | 51 | 41 | 10 |
| aof/human-empire | 240 | 79 | 71 | 8 |
| aof/mummified-undead | 212 | 56 | 48 | 8 |
| aof/ratmen | 250 | 50 | 50 | 0 |
| aof/saurians | 178 | 51 | 40 | 11 |
| aof/shadow-stalkers | 188 | 39 | 39 | 0 |
| aof/vampiric-undead | 246 | 56 | 55 | 1 |
| aof/wood-elves | 328 | 79 | 70 | 9 |
| gff/alien-hives | 166 | 41 | 41 | 0 |
| gff/blessed-sisters | 328 | 85 | 83 | 2 |
| gff/dwarf-guilds | 306 | 71 | 67 | 4 |
| gff/eternal-dynasty | 184 | 61 | 46 | 15 |
| gff/high-elf-fleets | 286 | 70 | 53 | 17 |
| gff/human-defense-force | 218 | 69 | 69 | 0 |
| gff/jackals | 182 | 44 | 38 | 6 |
| gff/robot-legions | 148 | 36 | 36 | 0 |
| gff/saurian-starhost | 182 | 46 | 38 | 8 |
| **Total** | **4440** | **1137** | **1005** | **132** |

Nenhum rótulo vazio; páginas ignoradas só capa e instruções.

## Pendências

- **"Sem par" (132, depois das correções):** arte que só aparece num estilo, ou cujo par não foi achado pelo rótulo e pela silhueta.
- **Passos 2 a 5 da skill:** army book, leitura dos rótulos, mapeamento e montagem do pacote, para cada facção.
