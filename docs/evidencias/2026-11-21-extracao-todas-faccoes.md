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

## Resultado (passo 1 da skill; 21 facções extraídas agora, mais o HDF)

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

## Pendências

- **"Sem par" (198):** arte que só aparece num estilo. Causas vistas até aqui:
  - cópias agrupadas por engano numa página (Daemons of Lust: "Warrior Dual Sword" fino caiu no grupo de outra pose);
  - o Eternal Dynasty, com 40, ainda não investigado.
- **Rótulo vazio (26):** rótulo fora da área esperada; ainda não investigado.
- **Revisão por um agente independente:** pedida pelo usuário, em andamento.
- **Passos 2 a 5 da skill:** army book, leitura dos rótulos, mapeamento e montagem do pacote, para cada facção.
