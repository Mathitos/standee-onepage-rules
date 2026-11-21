# Gerador de 3MF no site (D039) — 21/11/2026

## Pedido

"dispare um agente para revisar se vc não esqueceu de extrair nenhum, depois pode começar a desenvolver a página web que gera os arquivos 3mf para quando eu voltar, subirmos para uma github pages"

## O que o site faz

1. **Etapa 1:** importa o "Share as Text" do Army Forge, como antes.
2. **Etapa 2:** acha a facção do catálogo pelo nome do exército, ou o usuário escolhe.
   - Com associação revisada (hoje só o HDF), sugere a arte pela arma e a base pelo army book.
   - Sem associação, o usuário escolhe a arte de cada grupo de modelos numa galeria, pela figura e pelo rótulo impresso, e a base de cada unidade (D013/D015).
   - Unidade sem arte ou base fica pendente. Só sai do 3MF se o usuário marcar "gerar só as unidades prontas".
3. **Etapa 3:** gera o 3MF num Web Worker, com barra de progresso e botão de cancelar, e oferece o download.
   - **Opções:** nome e número na base, bico 0,2 ou 0,4, miolo preto ou branco, e estilo da arte (contorno fino ou borda grossa).

## Como foi feito

- **`src/gerador/`:** port do caminho padrão de `prototipo/gerar.py`, mantendo nomes e regras.
  - `secao` (polígonos dos centros dos pixels, meio pixel para fora, junção miter);
  - `corpoComLingueta`, `pecaUnicaPintada` (D032/D036) e `lateralPreta` (D034);
  - `fendas` e `base` (D031/D027); `textoNaBorda` (D022/D035);
  - `empacotar` e `centralizar`; `escrever3mf` (D026), com o project_settings da A1;
  - uma placa por unidade (D037).
- **Bibliotecas:**
  - manifold-3d 3.5.4 (WebAssembly, Apache-2.0), a mesma do protótipo. A 3.5.5 tinha 8 dias e ficou de fora.
  - fflate 0.8.3 (MIT), para o zip.
  - opentype.js 2.0.0 (MIT) e @fontsource/barlow-semi-condensed 5.3.0 (OFL-1.1). O protótipo usava a Bahnschrift do Windows, que não pode ir para o site.
- **Memória do WebAssembly:** um worker por geração. As malhas são copiadas para arrays comuns e os objetos do manifold são apagados depois de cada figura e de cada base.
- **Arte:** vem dos SVG do catálogo (contrato v2, `vetor.py`), não do PDF.
  - 600 dpi, com a silhueta e a tinta calculadas pelas mesmas funções do gerador e o verso alinhado.
  - `exportar_web.py` grava os SVG de todas as artes de cada facção, revisadas ou não, mais `artes.json` e o rótulo impresso em PNG de 1 bit.
- **Catálogo no site:** um plugin do Vite serve `catalog/` em desenvolvimento. No build, copia para `dist/catalogo/` só os índices, as artes e os rótulos; `work/`, `review/`, `build/` e `armybook/` ficam fora.
- **Perfil da impressora:** `public/bambu/a1-bico-0.2.json` e `a1-bico-0.4.json`, gerados por `prototipo/perfil_para_site.py` a partir do Bambu Studio 02.07.01.57 instalado. A placa é Textured PEI.

## Verificação

### Lista piloto HDF, contra o protótipo

Teste `tests/gerador.test.ts` (Node, mesmas artes, contorno fino), em 12 s.

- 6 placas, uma por unidade: "1 Infantry Squad" … "6 OGRE Robot", com 6, 6, 6, 6, 2 e 2 peças.
- Todas as malhas com `status = NoError` e volume positivo.
- O 3MF tem `curr_bed_type = Textured PEI Plate`, `wipe_tower_y = 200` em todas as placas, Arachne por objeto e "Branco - nome e número".
- **Comparação com `saidas/lista-completa-peca-unica-sem-relevo/relatorio.json`** (protótipo):

| Arte | Peça (mm) site / protótipo | Branco na mesa (mm³) | Branco em cima | Preto - corpo |
|---|---|---|---|---|
| infantry-rifle | 18,89 × 37,04 / 18,88 × 37,04 | 76,11 / 76,14 | 83,81 / 83,81 | 522,48 / 523,03 |
| veteran-shotgun | 21,59 × 36,58 / igual | 80,95 / 80,98 | 79,21 / 79,20 | 559,04 / 559,61 |
| biker-pistol | 40,34 × 34,88 / igual | 195,57 / 195,60 | 192,40 / 192,39 | 1089,12 / 1089,51 |
| biker-lance | 41,23 × 35,14 / igual | 223,40 / 223,40 | 219,28 / 219,28 | 1229,72 / 1230,08 |
| ogre-minigun | 37,42 × 56,47 / igual | 319,37 / 319,37 | 322,80 / 322,45 | 1676,38 / 1677,77 |

- Bases com as mesmas medidas: 25, 60 × 35 e 40 mm.
- **"Preto - lateral":** sai com 0,8 a 1,3 mm³ no site, contra 0,2 a 0,4 mm³ no protótipo. No site, o contorno com a barra e as linguetas é unido em vetor; no protótipo, era traçado de uma máscara.

### Fatiamento

`prototipo/fatiar_cli.py` com bico 0,2 deu "Success": 6 placas de 20 camadas.

| Placa | Site | Protótipo |
|---|---|---|
| 1 Infantry Squad | 8 trocas, 154,5 min | 8 trocas, 154,5 min |
| 2 Combat Bikers | 9 trocas, 301,1 min | 8 trocas, 294,3 min |
| 3 Veterans | 9 trocas, 162,2 min | 8 trocas, 156,3 min |
| 4 Veterans | 9 trocas, 162,2 min | 8 trocas, 156,3 min |
| 5 OGRE Robot | 8 trocas, 142,0 min | 8 trocas, 141,9 min |
| 6 OGRE Robot | 8 trocas, 142,0 min | 8 trocas, 142,0 min |

- Nas placas 2 a 4, o fatiador começou a primeira camada pelo preto e precisou de uma troca a mais em z = 0,4, cerca de 6 min. A causa não foi investigada.

### Navegador

No navegador embutido, com o servidor de desenvolvimento:
1. Colei a lista de exemplo.
2. Infantry, Bikers e Veterans foram sugeridas pelo catálogo, e as bases vieram do army book.
3. OGRE Robot ficou pendente (não há arte de Gatling Gun); escolhi a OGRE Minigun na galeria.
4. "Gerar 3MF (14 modelos)" levou 6,7 s e o download saiu com 11,3 MB.

- **Problema achado e corrigido:** o Vite descobria as bibliotecas só quando o worker abria e recarregava a página no meio da geração. Agora elas são otimizadas já na partida (`optimizeDeps`).

## Não verificado

- 3MF do site aberto na interface do Bambu Studio e impresso.
- Build publicado no GitHub Pages.
- Geração com facções sem associação, além da escolha na galeria.
- Celular: a página se ajusta (CSS com grade e quebras), mas a geração de listas grandes num celular não foi medida.
