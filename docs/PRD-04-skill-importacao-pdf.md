# PRD 04 — skill de importação de artes

Decisão D017 (aceita pelo usuário, 17/11/2026): a rotulagem e a importação das imagens são uma **skill do Claude Code**, executada pelo agente, uma sessão por PDF. Substitui a tela de rotulagem no site e o OCR (D016).

## Fluxo de uso

1. O usuário abre uma sessão no projeto, anexa o PDF e pede a importação, informando o link da facção no Army Forge se tiver.
2. O agente executa a skill: scripts fazem recorte, medidas e validação; o agente lê os rótulos e propõe o mapeamento para o army book.
3. A skill grava o pacote no projeto e devolve um relatório com folhas de contato e pendências.
4. O usuário aprova ou corrige na própria sessão; correções viram aliases aprovados e o pacote passa a `approved`.

## Entradas

- Caminho do PDF (obrigatório).
- Sistema de jogo e army book: link `army-info`/`share` ou ID. Se faltar, o agente pergunta; não adivinha.
- Opcional: versão do pacote e notas.

## Divisão de trabalho

| Etapa | Quem | Saída |
|---|---|---|
| Hash, render a 300 dpi, classificação de páginas | script | `pages.json` |
| Faixas, recorte de rótulo, frente e verso | script | recortes |
| Orientação, máscara, IoU frente × verso espelhado, escala em mm | script | máscaras e métricas |
| Deduplicação de cópias idênticas | script | grupos |
| Pareamento contorno fino × borda grossa | script; agente confere | estilos |
| Leitura dos rótulos | agente (visão), em folhas numeradas | `labels.json` |
| Army book: unidades, armas, bases | script baixa; agente interpreta | snapshot |
| Mapeamento rótulo → unidade/equipamento | agente propõe; ambíguo fica pendente | mapeamento |
| Escrita do pacote e validação de schema | script | manifesto e imagens |
| Relatório | agente | `review/report.md` e folhas de contato |

Princípio: medida e geometria são sempre script reprodutível. O agente faz só o que exige leitura ou julgamento e registra a origem (`labelSource: agent-vision`).

## Regras de layout

Observadas no PDF Human Defense Force. A skill verifica cada PDF novo e para com relatório se alguma regra falhar; nunca força o recorte.

- Cada linha é uma faixa independente com 4 células: aba (20 mm) | frente | verso | aba (20 mm). Frente e verso têm a mesma largura, que varia por linha. A dobra costuma ficar no centro da página, mas p20/21/50/51 estão deslocadas ~5 mm: a regra é "células iguais", não "centro da página".
- Linhas da tabela são detectadas com comprimento mínimo de 80 mm; com menos, a borda preta das figuras deitadas vira falsa linha.
- O rótulo é texto girado 90° **fora da tabela**, à esquerda da primeira aba, nos dois estilos (contorno fino e borda grossa). O recorte é gravado na horizontal para leitura.
- Página fora do padrão (capa, instruções) é ignorada e listada no relatório.
- Figuras deitadas: na frente o chão fica do lado esquerdo; no verso, do lado direito. A skill grava as imagens já em pé.
- Resultado no PDF HDF com `prototipo/pdf_grade.py`: 218 linhas (109 por estilo), todas com rótulo; só capa e instruções descartadas.
- Variações nos outros PDFs (21/11, D038): abas de 14,8 a 24,8 mm; figura grande de página inteira com a faixa na vertical (aba, verso de cabeça para baixo, frente em pé, aba) e rótulo embaixo ou à esquerda; uma linha a mais (traço na margem) ou a menos (aba aberta, ou linha entre verso e aba coberta pela arte); tabelas estreitas de enxames, com linhas de menos de 80 mm. A detecção cobre esses casos (ver `grade.localizar_faixas`) e recusa "faixas" com células de menos de 10 mm ou abas com mais de 20% de tinta (capas).
- PDFs em sets (Daemons, High Elf Fleets, Robot Legions, Saurian Starhost): as páginas P&B ficam no meio do set, entre as coloridas. Juntá-las num PDF por facção antes da extração (fração de pixels coloridos por página = 0).

## Rótulos e mapeamento

- Transcrever o rótulo exatamente como impresso. Em caso de dúvida, marcar `labelConfidence: low`; nunca completar palavras.
- Cópias idênticas recebem um rótulo por grupo. Rótulos diferentes dentro de um grupo viram pendência.
- Unidade por nome/alias do army book (ex.: "Biker" → Combat Bikers). Equipamento por alias (ex.: "Rifle" → Battle Rifle). Todo alias novo fica `proposed` até a aprovação.
- Sem correspondência (ex.: "OGRE Minigun" × Gatling Gun): manter o rótulo original como `unmapped`. O site oferece a arte como substituta (D013).
- Poses de comando/apoio (Sergeant, Banner, Medic, Radio) são marcadas como `cosmetic`.

## Saída no projeto

```text
catalog/<sistema>/<faccao>/
  manifest.json                    schema do PRD-02, sem imagens
  arts/<artId>/<estilo>/frente.svg, verso.svg   vetores em mm (D020)
  armybook/<id>-v<versão>.json     snapshot usado no mapeamento
  review/report.md, contact-*.png, labels-*.png
  build/<faccao>-<versão>.zip      pacote avulso (opcional; o site lê catalog/)
```

- Recortes em escala de cinza a 300 dpi, sem reamostragem, só em `work/`. A arte publicada é o SVG traçado deles (D020): `path#silhueta` e `path#tinta`, mm, mesma tela na frente e no verso, verso já alinhado (espelhar em x o sobrepõe à frente) e sem recorte pela frente, para a política das capas ficar no gerador. As folhas de contato são renderizadas a partir dos vetores, e o relatório traz IoU e pixels fora da faixa de 1 px da borda (esperado 0). **Pendente (18/11)**: recortar a arte a 600 dpi, resolução nativa do PDF HDF, com o tratamento do gerador (D024); a 300 dpi com limiar 128 os traços de ~0,1 mm quebram.
- Idempotente: mesmo SHA-256 não refaz nada sem pedido explícito. PDF novo gera nova `packVersion`, com diferenças no relatório.
- O PDF original não é copiado para o projeto; registram-se hash, nome e páginas.
- Git (D006): `manifest.json`, `revisao.json`, `arts/` (SVG) e `armybook/` são versionados; o PDF, `work/`, `review/` e `build/` ficam fora.

## Aprovação

- `reviewStatus` do pacote: `agent-proposed` → `approved` depois que o usuário confirma o relatório na sessão.
- O site aceita um pacote `agent-proposed`, mas mostra as pendências.

## Requisitos técnicos

- Local: `.claude/skills/importar-artes-pdf/` (`SKILL.md` + `scripts/`), versionada com o projeto e disponível em qualquer sessão aberta na pasta. O recorte de `prototipo/pdf_grade.py` é o ponto de partida dos scripts.
- Python com PyMuPDF, OpenCV, NumPy e SciPy. O `SKILL.md` explica como achar o interpretador; o alias `python` não é confiável no PC Windows atual.
- Scripts recebem caminhos por argumento, rodam com `-I` e escrevem em temporário com renomeação atômica.
- Army book: só leitura, uma requisição por facção, sem login.
- Sessões paralelas: cada facção em sua pasta; nenhum índice global editado por duas sessões ao mesmo tempo.

## Implementação (17/11/2026)

- Scripts: `extrair.py` (passo 1), `armybook.py` (passo 2), `montar.py` (passo 4); instruções em `SKILL.md`.
- Estilo por página: fração escura entre 0,7 e 1,0 mm para dentro do contorno (mediana da página); limiar 0,55. No HDF: fino 0,20–0,31, borda 0,80–1,00. Uma faixa de 0,6 mm não separava (pneus escuros das motos).
- Cópias: mesma página, tamanho ±1 mm e miniatura com diferença média < 0,035.
- Pares fino × borda: rótulo (igual nos dois estilos) + tamanho compatível + contenção da silhueta fina dilatada; atribuição global pelo rótulo mais idêntico (a atribuição gulosa trocava "Storm Trooper Rifle" com "Storm Trooper Drum Rifle"). Não assume deslocamento de páginas; no HDF todos os 69 pares deram 30 páginas.
- `revisao.json` fica na raiz da facção (versionado); `--aprovado` só após o "ok" do usuário.
- Resultado no HDF: 218 linhas → 138 grupos → 69 artes, todas pareadas; 13 com frente × verso < 0,95 (Storm Troopers com capa e outros), ver PRD-03.

## Aceite

- PDF HDF: 30 páginas de arte por estilo detectadas; capa e instruções ignoradas; cópias deduplicadas; pares fino × borda grossa formados.
- Rótulos batem com a leitura manual em `evidencias/2026-11-17-pdf-hdf.md`.
- Piloto presente com escala e IoU registrados: Infantry Rifle, Veteran Shotgun, Biker Pistol, Biker Lance e as 4 artes de OGRE.
- Rodar de novo com o mesmo PDF não altera arquivos.
- As folhas de contato permitem conferir o pacote inteiro em poucos minutos.
