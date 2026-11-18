# PRD 02 — catálogo, Army Forge e bases

Revisado em 17/11/2026 com evidência real (T001, PDF) e decisões D010–D016.

## Fontes

- **Lista**: texto do "Share as Text" do Army Forge colado pelo usuário (D010). Traz unidades, quantidades e equipamento resolvido. Não traz IDs, bases nem distribuição por modelo.
- **Artes**: PDFs de miniaturas de papel da OPR, convertidos em pacote de catálogo pela skill de importação (D017, PRD-04).
- **Bases e IDs**: army book do Army Forge, consultado pela skill ao montar o catálogo e gravado com versão e data (D015). O site não consulta o Army Forge no MVP.

## Catálogo versionado

Um pacote contém `manifest.json`, artes vetoriais (SVG em mm, D020: silhueta e tinta de cada face) e histórico de revisão. Unidades e artes são entidades separadas: uma unidade tem base e aliases; uma arte é uma pose com frente, verso e estilos.

```json
{
  "schemaVersion": 1,
  "packId": "human-defense-force",
  "packVersion": "0.1.0",
  "gameSystem": {"code": "GFF", "slug": "grimdark-future-firefight", "armyForgeId": 3},
  "armyBook": {"name": "Human Defense Force", "version": "3.6.0", "armyForgeId": "z65fgu0l29i4lnlu"},
  "source": {"pdfSha256": "b17c9ba4…", "dpi": 300},
  "units": [{
    "unitKey": "combat-bikers",
    "names": ["Combat Bikers"],
    "armyForgeUnitId": "UoYLgB-",
    "base": {"shape": "oval", "dimensionsMm": [60, 35], "raw": "60x35", "source": "army-forge v3.6.0", "retrievedAt": "2026-11-17"}
  }],
  "arts": [{
    "artId": "biker-pistol",
    "unitKey": "combat-bikers",
    "pdfLabel": "Biker Pistol",
    "equipmentTags": ["pistol"],
    "cosmetic": null,
    "styles": {
      "outline": {"page": 26, "row": 1, "front": "…/frente.svg", "back": "…/verso.svg", "canvasMm": [w, h]},
      "border":  {"page": 56, "row": 1, "front": "…/frente.svg", "back": "…/verso.svg", "canvasMm": [w, h]}
    },
    "frontBackIoU": 0.97,
    "reviewStatus": "pending",
    "licenseStatus": "user-approved"
  }]
}
```

O JSON ilustra o schema. Valores de base e IDs do exemplo vêm da captura de 17/11; o resto não é cadastro confirmado.

## Cadastro de PDFs (D017)

Feito fora do site, pela skill `importar-artes-pdf` (PRD-04): o usuário anexa o PDF numa sessão, scripts recortam e medem, o agente lê os rótulos e propõe o mapeamento, e o pacote é gravado em `catalog/<sistema>/<faccao>/`. O site apenas carrega pacotes prontos; não tem tela de rotulagem nem OCR.

Frente e verso do PDF formam uma arte, nunca dois modelos. Os protótipos antigos tratavam cada face como peça independente.

## Importação por texto (D010)

Exemplo real: `evidencias/2026-11-17-T001-armyforge/share-as-text.txt`.

Formato observado:
- Cabeçalho: `++ <Exército> (v<versão>) [<SISTEMA> <pts>pts] [<n> Units] ++`.
- Um bloco por unidade, separado por linha em branco:
  - Linha 1: `[<N>x ]<Nome> [<modelos>] Q<q>+ D<d>+ | <pts>pts | <regras>`. `Nx` agrupa unidades idênticas; os pontos são por unidade.
  - Linha 2: equipamentos separados por vírgulas de nível superior (vírgulas dentro de parênteses pertencem à arma), cada um com contagem opcional `<c>x`.

Regras:
- Total de modelos = Σ N × modelos. Conferir a soma de pontos com o cabeçalho; divergência gera alerta.
- Distribuição: se todo item tem contagem igual ao número de modelos, todos os modelos são iguais. Caso contrário, propor uma distribuição e exigir confirmação (ex.: `2x Battle Rifle, 1x Flamer, 3x Strike` → 2 com rifle, 1 com flamer).
- A versão do texto (`v3.6.0`) é comparada com a do catálogo. Se for diferente, alertar sobre nomes e bases.
- Tolerar CRLF, espaços extras e aspas tipográficas do clipboard.
- Linha não reconhecida aparece na revisão; nunca é descartada em silêncio.
- Formatos ainda sem exemplo real (herói anexado, unidade combinada, nome personalizado, mais de um exército, contagens fracionadas) ficam como pendência até a T002 capturá-los.
- Preservar o texto original e a data da importação no projeto.

Fora do MVP: link direto (API sem CORS; exigiria proxy e verificação de termos) e "Share as File" (formato não capturado).

## Correspondência e revisão

Ordem: unidade por nome/alias aprovado → arte por equipamento (aliases aprovados, ex.: Battle Rifle ↔ "Rifle") → candidatos → escolha do usuário.

- Correspondência exata só quando o equipamento distintivo da arte está no modelo e os aliases foram aprovados.
- Similaridade textual apenas sugere; nunca aprovar automaticamente pelo maior score.
- **Variante não encontrada (D013)**: mostrar as artes mapeadas, primeiro as da mesma unidade, com imagem de frente e verso. A escolha fica registrada no projeto como substituição, visível na revisão e no manifesto.
- Proposta (não aprovada): oferecer a escolha como sugestão em listas futuras, sem aprovar automaticamente.
- O usuário pode distribuir artes diferentes entre cópias (ex.: 2 Biker Pistol + 1 Biker Lance).
- Variantes cosméticas do PDF (Sergeant, Banner, Medic, Radio) não vêm da lista; ficam disponíveis como poses opcionais.
- **Estilo (D012)**: contorno fino ou borda grossa, escolhido por projeto, com troca por linha. A borda grossa aumenta ~1,2 mm por lado; refazer a checagem de encaixe na base.

Casos do piloto:

| Modelo | Arte | Tratamento |
|---|---|---|
| Infantry Squad, Battle Rifle | Infantry Rifle (p6/p36) | Alias Battle Rifle ↔ Rifle a aprovar |
| Veterans, Shotgun | Veteran Shotgun (p15/p45) | Direto |
| Combat Bikers, Pistol + Hunting Lance | Biker Pistol (p26/p56), Biker Lance (p27/p57) | Usuário escolhe ou distribui |
| OGRE Robot, Gatling Gun | sem arte; OGRE Minigun/Grenade Launcher/Baton/Axe (p28–31) | Usuário escolhe a substituta (D013) |

Páginas da borda grossa inferidas pelo deslocamento de 30 e conferidas só em miniatura; confirmar no cadastro.

## Bases

- A fonte é o catálogo (D015). Valores do piloto, army book v3.6.0 em 17/11: Infantry Squad 25 redonda; Veterans 25 redonda; Combat Bikers `60x35`; OGRE Robot 40 redonda. O army book também lista bases quadradas, fora do escopo.
- O army book usa a chave `round` para `"60x35"`. Interpretar como oval de eixos 60 × 35; elipse é suposição a confirmar. Não converter para cápsula sem critério documentado.
- Formatos MVP: `round`, `oval`. Preservar `none`, `unknown` e medidas ambíguas como estados distintos. Se a fonte informar só "60 mm oval", não inventar o eixo menor.
- Base sem recomendação não recebe 25 mm automaticamente. Base funcional personalizada só com confirmação e identificação clara.
- Itens podem ter `bases` próprias no army book (montarias). O catálogo registra a variação; a base do item prevalece só com o item selecionado.
- Manter fonte, versão e data; alterações não reescrevem projetos salvos silenciosamente.

## Aceite

- Texto da lista piloto → 14 modelos: Infantry Squad 3 (Battle Rifle), Combat Bikers 3 (Pistol + Hunting Lance), Veterans 2×3 (Shotgun), OGRE Robot 2×1 (Gatling Gun); 780 pts.
- As 4 unidades do piloto têm arte aprovada ou substituição escolhida pelo usuário, e base revisada.
- Testes cobrem: agrupamento `Nx`, vírgulas dentro de parênteses, distribuição parcial, versão diferente, linha não reconhecida, alias, substituição, troca de estilo, base ausente e oval incompleto.
- Pacote inválido é rejeitado com mensagem localizada; conteúdo de pacotes nunca é executado.
- Cache local exportável. A interface avisa que limpar o armazenamento do navegador pode apagar os arquivos.
- Artes publicadas por decisão do usuário (D006); o PDF de origem nunca é publicado.
