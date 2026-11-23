# Teste da mola na base (22/11/2026)

## Pedido do usuário

Depois da pesquisa de encaixe em FDM (`2026-11-22-pesquisa-encaixe-fdm.md`), perguntei se implementava a mola na base para um teste ao lado do encaixe retangular. Resposta: "Sim, testar a mola".

## Resultado (22/11, noite)

O usuário imprimiu o teste e respondeu: "o encaixe reto sem mola ficou melhor". O motivo não foi descrito.
- **Decisão:** o padrão continua o retangular (D042). A mola fica só como opção do protótipo (`--encaixe-base mola`) e não vai para o site.
- **Não foi dito:** se o reto segura bem a figura (de cabeça para baixo, de pé sem balançar) e se a base alinhou as metades.

## Atualização (22/11, noite): mini em preto em relevo

O usuário escreveu: "no final ficou melhor com outline preto em relevo mesmo, regere o teste de encaixe com uma mini nesse estilo" (D045).
- **Mudou só a figura:** a lista passou a pedir `"acabamento": "preto-relevo"`, o padrão do protótipo. Cada metade tem corpo branco de 1,2 mm e desenho preto em relevo de 0,4 mm. O comando perdeu o `--face-mm 0.1`, que só vale para o pintado.
- **Bases idênticas:** mesmas medidas de fenda no relatório e o mesmo volume nas três malhas.
- **Lingueta:** as duas metades coladas dão 2,4 mm, como antes. Nas malhas, até 1,9 mm do pé, cada metade tem só 1,2 mm de altura, então o relevo não chega à lingueta. `prototipo/verificar_encaixe.py` deu o mesmo resultado da mini pintada, com diferença de 0,001 mm no arredondamento.
- **CLI:** "Success", 20 camadas e 13 trocas (uma por camada de 0,1 a 1,2 mm), 131,5 min. Com a mini pintada eram 4 trocas e 77,7 min. A diferença vem da lateral preta (D034): a faixa preta de 0,3 mm na borda põe as duas cores em cada camada do corpo branco. A D034 mediu o mesmo na placa de figuras das metades em preto em relevo: de 1 para 13 trocas.
- **G-code:** nas camadas de 1,3 a 1,6 mm, o desenho preto sai inteiro sobre as metades. Na camada de 1,0 mm, o corpo branco sai com a borda preta, e os vãos da mola, abertos (`previas/gcode-relevo-z1-3-a-1-6.png` e `previas/gcode-z1-0.png`).
- A versão pintada foi tirada de `saidas/teste-mola/`.

O resto deste registro descreve a primeira geração, com a mini pintada. As bases e as contas da mola continuam valendo.

## O que foi feito

**No protótipo** (`prototipo/gerar.py`), uma terceira opção de encaixe na base: `--encaixe-base mola`.
- O padrão continua sendo o retangular (D042). O site não mudou.
- A figura é a mesma do retangular: uma lingueta reta de 6,0 × 1,9 mm.
- A fenda também é a mesma, 6,3 × (T + 0,25) mm. A diferença é a lâmina atrás dela (y > 0), presa numa ponta e solta na outra (`fenda_mola`).

| Item | Valor | Origem |
|---|---|---|
| Lâmina | 0,8 mm (`--mola-lamina`; teste também com 0,6) × 2,0 mm, a altura da base | pesquisa, opção 1 [I] |
| Comprimento | 7 mm, da raiz ao centro do ressalto; a ponta fica no fim do ressalto | pesquisa [I] |
| Ressalto | 1,5 mm de comprimento, no meio da fenda; entra 0,55 mm na fenda (folga de 0,25 + pré-carga de 0,30) | pesquisa [I] |
| Pré-carga | o ressalto fica a T − 0,30 da parede da frente: 2,10 mm nas metades (T = 2,4) | pesquisa [I] |
| Rampa | 30° da vertical, na boca (face de cima no jogo, que fica na mesa ao imprimir): 0,95 mm de altura | pesquisa [I] |
| Vãos | 0,6 mm atrás da lâmina, na ponta e entre a lâmina e a base, da fenda até a raiz | pesquisa dá 0,5; **mudado** (abaixo) |
| Raiz | arredondada com raio de 0,4 mm, dos dois lados | pesquisa (Hubs) |

- **Por que vãos de 0,6 mm e não 0,5:** a ponta da lâmina fica 0,75 mm além do centro do ressalto. Numa viga presa numa ponta, ela anda 1 + 1,5 × 0,75 / 7 ≈ 1,16 vez o que o ressalto anda.
  - com vão de 0,5, a ponta encostaria na base quando o ressalto tivesse recuado 0,43 mm, antes do fim da janela de ±0,20 (0,50 mm);
  - com 0,6, encosta a 0,52 mm. Isso também limita a dobra a 1,27% na lâmina de 0,8, abaixo do teto de 1,46% da pesquisa.
- **Contas no relatório** (`relatorio.json`, `bases.*.fendas_mm.mola`). Mesmas fórmulas da pesquisa, com E = 2680 MPa e a lâmina de 2 mm de altura:

| Recuo do ressalto | Lâmina 0,8: dobra / força | Lâmina 0,6: dobra / força |
|---|---|---|
| 0,10 mm | 0,24% / 0,20 N | 0,18% / 0,08 N |
| 0,30 mm (nominal) | 0,73% / 0,60 N | 0,55% / 0,25 N |
| 0,50 mm | 1,22% / 1,00 N | 0,92% / 0,42 N |

A figura pesa ~0,01 N. Mesmo com o atrito mais baixo da pesquisa (0,12), a lâmina de 0,6 na pré-carga nominal segura 2 × 0,12 × 0,25 = 0,06 N. São contas, não medida.

**Bases de teste por lista.** Um modelo da lista pode trazer `"bases_teste"`, com encaixe, lâmina e rótulo por base:
- cada base vai para a placa do modelo, com a figura, e a regra de uma unidade por placa continua valendo;
- o rótulo vai na borda de trás, no lugar do número da unidade (D035), em branco embutido como o nome;
- a lingueta da figura tem que servir em todas: base cônica só com lingueta cônica, e o gerador recusa a mistura.

**Texto e vão da mola.** O texto da base deixava livre um retângulo simétrico em volta da fenda. Agora o retângulo é o do vão real, tirado depois do espelhamento do texto, porque a mola só existe de um lado.

## Arquivo de teste

- **Arquivo:** `saidas/teste-mola/projeto-duas-metades-fino.3mf` (fora do git).
- **Lista:** `prototipo/lista-teste-mola.json`.
- **Comando:**

```bash
python -I prototipo/gerar.py prototipo/lista-teste-mola.json --modo duas-metades --estilo fino --nome-na-base --encaixe-base mola --saida saidas/teste-mola
```

**Uma placa, "1 Infantry Squad":**
- a Infantry Rifle em duas metades, acabamento preto em relevo (D045). Na primeira geração era o pintado, com o desenho só na primeira camada, como a placa 1 do teste de 21/11;
- três bases de 25 mm. A borda de trás de cada uma diz qual é: **RETA** (D042, sem mola), **MOLA 0,8** e **MOLA 0,6**;
- todas com "Infantry Squad" na frente.

A lingueta é igual à do `saidas/teste-duas-metades/` regerado em 22/11. Uma figura daquele arquivo serve nestas bases.

## Verificação

**Malhas.** Nenhuma falha (fechadas, normais consistentes). Cortes horizontais das bases em z = 0,05 / 0,3 / 0,6 / 1,0 / 1,5 / 1,95 mm, com z = 0 na boca:

| Medida | RETA | MOLA 0,8 | MOLA 0,6 |
|---|---|---|---|
| Fenda no centro, da parede da frente ao outro lado | 2,65 mm em toda a altura | até o ressalto: 2,10 mm de z ≈ 0,95 para cima; na rampa, 2,62 (z 0,05), 2,48 (z 0,3), 2,30 (z 0,6) | igual à 0,8 |
| Lâmina no centro | — | 0,80 mm | 0,60 mm |
| Vão atrás da lâmina | — | 0,60 mm | 0,60 mm |
| Vão na frente da lâmina, a 5 mm do centro | — | 0,60 mm | 0,60 mm |

- **Lâmina solta:** em todos os cortes, tirar uma faixa de 0,1 mm perto da raiz separa a lâmina do resto da base (1 pedaço → 2). Então ela só está presa na raiz.
- **Corte vertical no centro:** a rampa fica na boca. Com a lingueta de 2,4 mm encostada na parede da frente, a interferência com o ressalto é de 0,30 mm.

**Fatiamento pela CLI** (`prototipo/fatiar_cli.py --bico 0.2`), com a mini pintada: "Success". Com a mini em relevo, ver a atualização no início.
- 1 placa, 5 objetos e 20 camadas;
- 4 trocas, nas mesmas alturas do teste de 21/11 (0,1 / 0,2 / 0,3 / 0,4 mm, por causa do nome nas bases);
- 77,7 min. A placa 1 do teste das duas metades, com uma base só, dava 55,4 min.

**G-code** (`prototipo/previa_gcode.py`, camadas de 0,2 e 1,0 mm nas bases com mola):
- os vãos saem abertos;
- a lâmina sai em paredes;
- perto da boca, o ressalto aparece menor, por causa da rampa.

## Não verificado

- **A impressão.** Não sei se a lâmina de 0,6 mm sai inteira com bico 0,2 e se os vãos de 0,6 mm não grudam com o pé de elefante. Também não sei se a lingueta entra com o dedo e se a figura fica de pé e sai sem quebrar a lâmina.
- **Todas as medidas da mola são inferência da pesquisa**, com fórmulas de fonte e números sem teste. A relaxação do PLA (11–14% em 500 s, pesquisa) não foi medida.
- Abrir na interface do Bambu.

## O que observar na impressão

- Para cada base, empurrar a figura e anotar:
  - entra ou não;
  - segura de cabeça para baixo ou cai;
  - fica de pé sem balançar.
- Depois de 5 encaixes, a mola continua apertando? E no dia seguinte?
- Os vãos ficaram abertos, ou a lâmina grudou na base?
