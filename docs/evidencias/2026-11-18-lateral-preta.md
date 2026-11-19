# Lateral preta das figuras (D034) — 18/11/2026

## Pedido

- O usuário viu na impressão que as laterais dos standees saíam brancas: o corpo branco aparece em volta do contorno preto da arte.
- Pediu o preto nas laterais: "quero q o filamento seja o preto, as laterais dos standees estão brancas".

## Como ficou

- Em cada figura, o branco a menos de 0,3 mm da borda vira preto, em toda a altura. Fica numa parte própria, "Preto - lateral".
  - Vale nos três acabamentos das metades e nos dois da peça única.
  - A barra e as linguetas também ganham a borda preta.
  - O miolo e as faces continuam brancos, então o branco do desenho não fica sobre preto.
- **Largura:** medida no contorno preto da arte da Infantry (frente e verso), da borda até o primeiro branco, sem contar a barra e as linguetas.
  - Mediana de 0,30 mm na frente e 0,36 mm no verso.
  - Em 50% e 40% do contorno, respectivamente, o preto da arte tem menos de 0,30 mm.
  - Com 0,3 mm, a face só muda onde o contorno da arte é mais fino que isso: ali o contorno fica com 0,3 mm.
  - `--lateral-preta 0` desliga.
- **Medidas mantidas:** a caixa de cada peça, o empacotamento e o encaixe não mudam. `verificar_encaixe.py` deu folga barra–base de 0,159 mm nas 5 artes, nas metades e na peça única.
- **Torre de purga:** com troca em toda camada, a torre da placa de figuras cresce como a das bases. Em y = 220, a CLI recusava a placa: "Found G-code outside of the printable area". Com lateral preta, as placas de figuras usam y = 200, como a de bases (D027).
- **Bases junto (D033):** `--bases-junto auto` agora junta as bases às figuras quando o projeto tem um acabamento só e as figuras já trocam de cor em quase toda camada. Isso vale para a peça única e para qualquer modo com lateral preta.

## No G-code (CLI do Bambu Studio 02.07.01.57, A1 bico 0,2, volumes de purga supostos)

- Numa camada do miolo (z 0,8) da peça única, a parede de fora da Infantry é preta em toda a volta, inclusive na barra e nas linguetas. Por dentro ficam as paredes e o preenchimento brancos.
  - Imagem: `2026-11-18-lateral-preta-gcode.png`.

Mesmas 5 artes, com 5 bases com nome:

| Caso | Placas | Trocas | Tempo | Filamento |
|---|---:|---:|---:|---:|
| Peça única sem relevo, juntas, sem lateral | 1 | 16 | 419 min | 26,4 g |
| Peça única sem relevo, juntas, com lateral | 1 | 16 | 420 min | 26,4 g |
| Metades preto em relevo, separadas, sem lateral | 2 | 1 + 5 | 382 min | 28,5 g |
| Metades preto em relevo, separadas, com lateral | 2 | 13 + 5 | 443 min | 34,8 g |
| Metades preto em relevo, juntas, com lateral | 1 | 13 | 411 min | 32,0 g |

- **Peça única:** a lateral preta não custa nada, porque nessa placa toda camada já tinha as duas cores.
- **Metades:** a placa de figuras passa de 1 para 13 trocas. Com as bases juntas, o total fica 28 min e 3,5 g acima das metades sem lateral em placas separadas.

Projeto de teste das metades, `saidas/teste-acabamento/projeto-duas-metades-fino.3mf`, regerado com três acabamentos. Com acabamentos diferentes, as bases ficam numa placa própria.

| Placa | Trocas | Tempo | Antes (sem lateral) |
|---|---:|---:|---:|
| 1 preto em relevo, 10 metades | 13 | 314 min | 1 troca, 253 min |
| 2 branco em relevo, 2 metades | 4 | 53 min | 1 troca, 40 min |
| 3 pintado, 2 metades | 12 | 96 min | 5 trocas, 64 min |
| 4 7 bases com nome | 5 | 149 min | 5 trocas, 149 min |

- No branco em relevo, o corpo já é preto; a faixa só recorta a borda do relevo branco onde o contorno da arte é fino.

## Não verificado

- Impressão real: se a lateral sai preta por inteiro, se o contorno fica bom na face e se a parede preta de um cordão deixa o branco de dentro aparecer.
