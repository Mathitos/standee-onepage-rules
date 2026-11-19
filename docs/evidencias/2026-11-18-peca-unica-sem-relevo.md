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
  - Saída: `saidas/teste-peca-unica-sem-relevo/projeto-peca-unica-fino.3mf`, com a placa 1 "Figuras" e a placa 2 "Bases".

## No G-code

Fatiado pela CLI como está: "Success", sem aviso.

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

## Não verificado

- Impressão real: nitidez da face da mesa e da face de cima, se o preto aparece através do branco, e o assento na base.
- Abertura na interface do Bambu Studio.
