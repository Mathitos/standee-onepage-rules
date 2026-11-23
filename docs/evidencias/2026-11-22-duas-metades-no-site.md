# Duas metades no site (22/11/2026, noite)

## Pedido do usuário

Com o acabamento escolhido (preto em relevo, D045) e o encaixe decidido (reto, sem mola, D042/D043), perguntei se levava as duas metades em preto em relevo para o gerador do site. Resposta: "Sim, levar ao site" (D046).

## O que mudou no site

O gerador do site passa a gerar, por padrão, o caminho do protótipo `--modo duas-metades --acabamento preto-relevo`:
- **Figura** (`src/gerador/figura.ts`, `metadesPretoRelevo`, port de `metade()`): duas metades por arte.
  - corpo branco de 1,2 mm e desenho preto em relevo de 0,4 mm em cima, nunca além da borda do corpo;
  - a frente fica como no SVG. O verso usa o contorno da frente espelhado, porque o SVG do verso já vem alinhado à frente espelhada;
  - a lingueta e a barra ficam nas duas metades, sem relevo. Coladas, dão 2,4 mm;
  - lateral preta de 0,3 mm (D034), como no protótipo.
- **Base** (`espessuraPeca`): a fenda recebe as metades coladas, com 2,4 + 0,25 = 2,65 mm. A largura continua a da D042, 6,3 mm.
- **3MF** (`src/gerador/gerar.ts`): cada arte vira dois objetos, "<arte> - frente" e "<arte> - verso". Cada unidade continua numa placa (D037), com as duas metades e a base de cada modelo. O resultado ganhou `modo`, `espessuraLinguetaMm` e a lista de objetos de cada arte.
- **Tela da etapa 3**: novo seletor "Modo", com "duas metades, preto em relevo" (padrão) e "peça única pintada". O seletor de miolo só aparece na peça única, que continua como opção.
- **Lateral preta** (`lateralPreta`, vale para os dois modos): agora o branco é cortado pelo miolo, o contorno deslocado 0,3 mm para dentro. Antes era cortado pelo anel da borda. O resultado é o mesmo, mas sem bordas quase coincidentes.
  - No contorno espelhado do verso, o anel deixava 25 a 26 lascas de volume entre 1e-11 e 1e-9 mm³ no corpo branco.
  - Agora o corpo branco de cada metade é um pedaço só, com o mesmo volume.
  - Na peça única, as lascas do desenho branco sumiram. O "Preto - lateral" dela ainda tem 15 a 25 pedaços de volume quase nulo; não mexi, porque a peça única ficou como opção.

## Verificação

**Testes** (`npm run check`): tipos e 44 testes passam (eram 42).
- teste da peça única, agora com `modo: 'peca-unica'` explícito;
- teste novo das metades: 6 peças por unidade com 2 modelos, partes "Branco - corpo", "Preto - relevo" e "Preto - lateral" em cada metade, fenda de 2,65 mm e nomes "- frente" e "- verso" no 3MF;
- teste novo da geometria:
  - corpo de 0 a 1,2 mm e relevo de 1,2 a 1,6 mm;
  - relevo começando acima da lingueta;
  - as duas metades com a mesma caixa;
- lista piloto: placas com 9, 9, 9, 9, 3 e 3 peças.

`npm run build` passa.

**Protótipo × site**, Infantry Rifle em contorno fino, volumes em mm³ (protótipo: `saidas/teste-mola/relatorio.json`):

| Parte | Protótipo | Site |
|---|---|---|
| Frente, corpo branco | 461,22 | 461,28 |
| Frente, relevo preto | 83,60 | 83,62 |
| Frente, lateral preta | 52,97 | 52,91 |
| Verso, corpo branco | 461,23 | 461,28 |
| Verso, relevo preto | 76,09 | 75,75 |
| Verso, lateral preta | 52,97 | 52,91 |

A maior diferença é de 0,45%, no relevo do verso. O site lê o SVG vetorizado; o protótipo lê o PDF.

**Fatiamento pela CLI** da lista piloto gerada pelo teste (`saidas/site-piloto/projeto-site.3mf`, `GRAVAR_3MF=1`, `prototipo/fatiar_cli.py --bico 0.2`): "Success" nas 6 placas.
- 13 trocas em cada placa, uma por camada de 0,1 a 1,2 mm. É o mesmo do protótipo em preto em relevo com lateral preta (D034);
- tempos: 182,8 / 313,9 / 187,4 / 187,4 / 171,7 / 171,7 min, 1215 min no total.

**G-code da placa 1** (`saidas/site-piloto/previas/`):
- nas camadas de 1,3 a 1,6 mm, o desenho da frente e o do verso saem em preto sobre as seis metades;
- na de 1,0 mm, o corpo sai branco com a borda preta, e as fendas das bases saem abertas.

**No navegador embutido**, com a lista de exemplo salva no navegador:
- o OGRE Robot estava sem arte escolhida e ficou de fora, com "gerar só as unidades prontas" marcado;
- "Gerar 3MF" deu 4 placas de 9 peças em 2,1 s, sem avisos;
- dentro do 3MF baixado: 36 objetos, 24 metades com "Preto - relevo" e 12 bases com o nome;
- trocando para "peça única pintada", o seletor de miolo aparece, e o 3MF sai com 4 placas de 6 peças;
- console sem erros. A 375 px de largura, a página não rola para o lado.

## Não verificado

- A impressão de um 3MF do site em duas metades, e a abertura dele na interface do Bambu Studio.
- O OGRE Robot no navegador. Ele entrou no teste automático e no fatiamento da lista piloto.
