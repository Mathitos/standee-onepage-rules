# Peça única sem relevo (D032) — 18/11/2026

## Pedido

- O usuário imprimiu o teste anterior (metades em preto em relevo, base de uma fenda). Na Infantry Rifle, os detalhes da arma saíram "todos misturados, como se fossem várias linhas"; no fatiador parecia melhor.
- Depois do diagnóstico abaixo, ele pediu uma versão sem relevo em peça única.

## Diagnóstico da arma (preto em relevo)

Medido na frente da Infantry do projeto de teste, que usa o mesmo tratamento da arte da versão impressa:

- **No modelo:** na região da arma, 21% do branco fica em vãos com menos de 0,2 mm de largura, contra 15% na figura inteira. As linhas pretas ficam a 0,1–0,25 mm umas das outras.
- **No G-code** (CLI do Bambu Studio, A1 bico 0,2): nas camadas do relevo (z 1,2–1,6), o preto cobre 14,7% do branco do modelo na região da arma e 10,6% na figura inteira. O fatiador alarga as linhas finas até a largura mínima do cordão.
- **Na impressão** fechou mais do que no G-code. Explicação provável, não verificada: o plástico espalha um pouco a cada uma das 4 camadas do relevo de 0,4 mm. Além disso, um vão de 0,15 mm com 0,4 mm de fundo fica na sombra e parece preto quando visto de lado.

## Como ficou

- `--modo peca-unica --acabamento pintado`: o desenho fica rente nas duas faces, sem relevo.
  - **Face da mesa:** a frente, espelhada, nas primeiras 0,4 mm, com preto e branco coplanares. É a face mais lisa.
  - **Face de cima:** o verso, nas últimas 0,4 mm.
  - **Núcleo:** branco.
- **Espessura total de 1,6 mm**, a mesma da peça única com relevo.
  - O preto de uma face fica atrás de 1,2 mm de branco na outra.
  - A pesquisa de 18/11 achou relatos de que branco fino deixa o preto aparecer: 0,6 mm ou mais, talvez 1,0 mm.
- **Bases próprias:** a peça inteira entra na fenda, então a fenda tem espessura de 1,85 mm (1,6 + 0,25 de folga). Os nomes dos arquivos levam `-plana`.
  - As 2 linguetas cônicas (D031) são as mesmas.
  - `verificar_encaixe.py` deu folga barra–base de 0,159 mm nas 5 artes, igual às metades.
- **Teste:** lista `prototipo/lista-teste-peca-unica.json`, com 1 miniatura de cada arte.
  - Saída: `saidas/teste-peca-unica-sem-relevo/projeto-peca-unica-fino.3mf`. Primeiro com a placa 1 "Figuras" e a placa 2 "Bases"; depois regerado com uma placa só, "Figuras e bases" (D033, abaixo).

## No G-code

Fatiado pela CLI como está, em duas placas: "Success", sem aviso.

| Placa | Conteúdo | Camadas | Trocas | Tempo |
|---|---|---:|---:|---:|
| 1 | 5 figuras em peça única | 16 | 9 | 292 min |
| 2 | 5 bases com nome | 20 | 5 | 129 min |

- Na placa 1, as trocas caem nas camadas de 0,1 a 0,5 e de 1,3 a 1,6 mm: cada camada com as duas cores pede uma troca.
- Para comparar, no projeto em metades a placa de preto em relevo tem 1 troca e 253 min para 10 metades.

Mesma região da Infantry, branco do modelo coberto de preto no G-code:

| Face | Preto em relevo (metades, z 1,2–1,6) | Sem relevo (peça única) |
|---|---:|---:|
| Frente, região da arma | 14,7% | 5,8% (1ª camada, face da mesa) |
| Frente, figura inteira | 10,6% | 4,2% |
| Verso, mesma região | 9,5% | 3,4% (última camada) |
| Verso, figura inteira | 6,8% | 2,5% |

- Sem relevo, os vãos finos viram cordões brancos na mesma camada, em vez de canaletas vazias entre paredes pretas.
- Uma parte pequena fica sem material nenhum: 4,0% do branco na região da arma, 4,6% na figura inteira e 2,1% no verso. São vãos estreitos demais para qualquer das duas cores.
- Imagem: `2026-11-18-peca-unica-sem-relevo-arma.png`. Mostra o modelo, o relevo e a face da mesa sem relevo, com cada cordão na largura anotada no G-code.

## Bases na placa das figuras (D033)

O usuário observou que a peça única pintada já troca de cor em várias camadas e perguntou se não valia pôr as bases na mesma placa. Fatiado pela CLI, com as mesmas 5 figuras e 5 bases com nome. Os volumes de purga são supostos (200 e 600 mm³).

| Caso | Placas | Trocas | Tempo | Filamento |
|---|---:|---:|---:|---:|
| Peça única sem relevo, separadas | 2 | 9 + 5 = 14 | 292 + 129 = 421 min | 25,8 g |
| Peça única sem relevo, juntas | 1 | 16 | 419 min | 26,4 g |
| Peça única com relevo, separadas | 2 | 6 + 5 = 11 | 240 + 129 = 369 min | 23,9 g |
| Peça única com relevo, juntas | 1 | 12 | 365 min | 24,2 g |
| Metades em preto em relevo, separadas | 2 | 1 + 5 = 6 | 253 + 129 = 382 min | 28,5 g |
| Metades em preto em relevo, juntas | 1 | 13 | 411 min | 32,1 g |

- **Peça única:** juntar dá o mesmo tempo e o mesmo filamento.
  - As trocas das bases (camadas 0,1–0,4) caem nas camadas em que a figura já troca.
  - O que se acrescenta são as camadas do miolo, em que a figura é branca e a base é preta: uma troca a mais por camada. No total, sobram de 1 a 2 trocas.
  - O ganho é prático: uma impressão só, sem trocar de placa nem repetir o início. A estimativa quase não conta o início, que em cada placa dá 19 s entre o tempo do modelo e o total.
- **Metades:** a placa de figuras tem só 1 troca, onde começa o relevo. Juntar põe as duas cores em cada camada do miolo, com +7 trocas, +29 min e +3,6 g.
- Padrão `--bases-junto auto`: junta só na peça única. As peças são empacotadas juntas, e o que não couber vai para outra placa.
- O projeto de teste foi regerado assim, com a placa 1 "Figuras e bases". É idêntico, fora o perfil, ao que foi fatiado: 20 camadas, 16 trocas, 419 min, "Success", sem aviso.

## Não verificado

- Impressão real: nitidez da face da mesa e da face de cima, se o preto aparece através do branco, e o assento na base.
- Abertura na interface do Bambu Studio.
