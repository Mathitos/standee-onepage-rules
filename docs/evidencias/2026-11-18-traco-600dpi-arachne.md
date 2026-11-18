# Desenho fiel ao original: 600 dpi e paredes Arachne — 18/11/2026

## O que o usuário viu

Fatiou `figuras-duas-metades-borda.3mf` (traço mínimo 0,45 mm, D023) na interface do Bambu Studio com bico 0,2. O desenho ficou estranho: linhas grossas e quebradas, borrões e pontos brancos dentro das linhas.

## Causas encontradas

1. **Resolução**: a arte do PDF HDF é uma imagem JPEG de 4960 × 7016 px por página A4, ou seja, **600 dpi**. O gerador lia a 300 dpi com limiar 128.
   - A 600 dpi, a largura mediana dos traços internos é de 0,085 a 0,12 mm, conforme o limiar.
   - A 300 dpi os traços viravam pedaços soltos: 527 componentes com limiar 128 a 600 dpi, contra 31 com limiar 192.
   - O traço mínimo engrossava esses pedaços pelo esqueleto e formava os borrões.
2. **Paredes do fatiador**: os perfis de sistema da A1 (bicos 0,2 e 0,4) usam `wall_generator = classic`. Numa linha da largura do bico, as paredes classic viram contas de pontos. Numa linha de duas larguras, sobra um vão no meio, que aparece como pontos brancos.
3. **Ferramentas de validação** (corrigidas):
   - `fatiar_cli.py`: o `project_settings` exportado pela CLI trazia o nome do perfil, mas valores genéricos. O bico 0,2 era fatiado com linha de 0,4 mm, camada de 0,2 mm e Arachne. Agora os valores do perfil resolvido são copiados por cima; para o bico 0,2 são 173 chaves.
   - `previa_gcode.py` tinha três artefatos:
     - desenhava "G1 E" sem X/Y (desretração) como ponto;
     - desenhava arcos minúsculos como voltas inteiras quando o arredondamento invertia o sentido; agora decide pelo filamento extrudado;
     - desenhava as linhas do `cv2.line` com ~2 px a mais (espessura 5 → 7 px).

     Agora cada cordão é um retângulo com pontas redondas, na largura anotada. Na figura de comparação, a versão antiga renderizada assim reproduz o que o usuário viu na interface.

## Comparação no G-code

Perfil: CLI do Bambu Studio 02.07.01.57, `Bambu Lab A1 0.2 nozzle`, `0.10mm Standard @BBL A1 0.2 nozzle`, PLA Basic. Arte: Infantry Rifle, borda grossa, duas metades.

| Variante | Paredes classic (padrão do perfil) | Paredes Arachne |
|---|---|---|
| Antiga: 300 dpi + traço mínimo 0,45 | borrões e linhas quebradas (= interface do usuário) | borrões |
| 600 dpi, traço do PDF (engorda 0) | linhas somem | **contínuas, mais próximas do original** |
| 600 dpi + engorda 0,03 / 0,05 / 0,08 mm (no vetor) | contínuas a partir de 0,05, mais escuras | mais escuras quanto maior a engorda |
| 600 dpi, redesenho só das linhas que cabem (largura 0,23, vão 0,12–0,15) | contas de pontos | limpo, um pouco mais pesado que o traço do PDF |

Com bico 0,4 e Arachne, o traço do PDF também ficou melhor que o redesenho (vão 0,24) e que a engorda de 0,1 mm, embora mais grosseiro que com bico 0,2.

Imagem: `2026-11-18-traco-600dpi-arachne.png`, com original, antes (o que o usuário viu) e agora.

Uma métrica de diferença borrada contra o original foi tentada, mas mede sobretudo o tom (linhas que somem "melhoram" a nota). Por isso a escolha foi visual, feita com as imagens lado a lado.

## Decisões

- **D024**: traço do PDF lido a 600 dpi, com desfoque de 0,035 mm e limiar 200, sem engrossar. `--traco engrossado --engorda X` fica como opção, aplicada no vetor porque a 600 dpi 1 px = 0,042 mm.
- **D025**: o 3MF grava `wall_generator = arachne` em cada objeto, no `Metadata/model_settings.config`, como o Bambu Studio grava um ajuste por objeto. A CLI respeita esse ajuste mesmo com o perfil em classic: a parede externa sai com 34 larguras distintas, de 0,13 a 0,47 mm, contra 2 larguras (0,20 e 0,22) em classic.
- D023 (traço mínimo pelo esqueleto) foi substituída.

## Lista piloto regerada e fatiada (CLI, bico 0,2, perfis de sistema)

| Arquivo | Objetos | Trocas | Tempo estimado |
|---|---:|---:|---:|
| `figuras-duas-metades-borda.3mf` (6,9 MB) | 28 | 1 | 702 min |
| `bases-duas-metades-borda.3mf` (com nome) | 14 | 0 | 209 min |
| `figuras-peca-unica-borda.3mf` | 14 | 6 | 589 min |

As malhas passam na checagem: fechadas e com normais consistentes. As prévias do G-code ficam em `saidas/piloto-duas-metades-borda/fatiamento-cli/previa-*.png`, fora do git.

## Pendente

- Abrir na interface: ver se o aviso de versão sumiu e se os objetos mostram o ajuste de paredes. Se a interface carregar só a geometria, o ajuste por objeto se perde; nesse caso, escolher Arachne em Qualidade → Gerador de paredes.
- Imprimir para confirmar a legibilidade.
- Os SVGs do catálogo (D020) foram traçados a 300 dpi com limiar 128 e têm o mesmo defeito: refazer a 600 dpi.
- Tempo: com bico 0,2 e camada de 0,1 mm, a placa de figuras leva ~11,7 h, contra ~7,9 h na estimativa anterior com valores genéricos.
