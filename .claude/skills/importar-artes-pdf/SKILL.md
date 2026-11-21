---
name: importar-artes-pdf
description: Importa um PDF de miniaturas de papel da One Page Rules (paper minis / standees) para o catálogo do Standee Forge. Recorta frente e verso de cada arte, junta cópias, pareia os estilos contorno fino e borda grossa, lê os rótulos, relaciona as artes com o army book do Army Forge e grava o pacote em catalog/<sistema>/<facção>. Use quando o usuário anexar um PDF de paper minis da OPR ou pedir para importar, catalogar ou atualizar as artes de uma facção.
---

# Importar artes de um PDF (Standee Forge)

Especificação: `docs/PRD-04-skill-importacao-pdf.md`. Decisões: D012 (dois estilos), D013 (substituição pelo usuário), D017 (esta skill). Medida e geometria ficam nos scripts; você só lê rótulos e julga o mapeamento.

## Regras que não podem ser quebradas

- **Não invente.** Transcreva o rótulo exatamente como está impresso. Se houver dúvida em qualquer letra, use `"confiancaRotulo": "baixa"`; nunca complete palavras.
- Correspondência com o army book só por nome, alias ou equipamento que você consegue justificar. Sem justificativa: `"status": "unmapped"`. Alias novo: `"status": "alias-proposed"` (o usuário aprova).
- Base nunca é inventada: vem do army book pelo `armyForgeUnitId`; sem isso fica `unknown`.
- O PDF **nunca** vai para o git (nem cópia dele). Versionados: `manifest.json`, `revisao.json`, `arts/` (SVG) e `armybook/`. Fora do git: `work/`, `review/`, `build/` (D006/D020).
- Army Forge: só leitura, uma requisição por army book, sem login. Nunca peça senha ou token.
- Uma facção por pasta; não edite a pasta de outra facção que outra sessão possa estar usando.

## Passo a passo

### 0. Preparar

- Python: use `C:/Users/Matheus/AppData/Local/Python/pythoncore-3.14-64/python.exe` se existir (os aliases `python`/`py` não são confiáveis no PC Windows atual); senão teste `python`. Confirme com `-c "import numpy, cv2, scipy, pymupdf"`. Rode sempre com `-I`.
- Pergunte o que faltar: o PDF (caminho) e a facção no Army Forge. Se o usuário pedir para você buscar, a listagem pública de army books oficiais serve (só leitura, sem login): `GET https://army-forge.onepagerules.com/api/army-books?filters=official&gameSystemSlug=<slug>&searchText=&page=1&unitCount=0&balanceValid=false&customRules=true&fans=false&sortBy=null`. Case pelo nome exato da facção; na dúvida, pergunte.
- Pasta do pacote: `catalog/<sistema>/<faccao>`, ex.: `catalog/gff/human-defense-force`.

Os scripts ficam em `.claude/skills/importar-artes-pdf/scripts/`; rode da raiz do repositório.

### 1. Extrair

PDF em "Sets" (P&B no meio das coloridas): junte antes as páginas P&B de todos os sets da facção num PDF só, no padrão dos avulsos (`juntar_sets.py`, D038). Terreno não entra no catálogo.

```bash
PY -I .claude/skills/importar-artes-pdf/scripts/juntar_sets.py --saida "<Facção>_-_BW.pdf" "<Set 1>.pdf" "<Set 2>.pdf" ...
```

```bash
PY -I .claude/skills/importar-artes-pdf/scripts/extrair.py --pdf "<pdf>" --saida catalog/<sistema>/<faccao>
```

Confira o resumo: páginas de arte, páginas ignoradas (capa, instruções), estilos por página, número de candidatos e pares. Se não houver páginas de arte ou a grade não bater, **pare e relate**: o layout é diferente do esperado (PRD-04, "Regras de layout"). Saída `ja-extraido` significa mesmo PDF já processado; só use `--refazer` se o usuário pedir.

A grade aceita as variações vistas nos 22 PDFs (abas de 12 a 30 mm, figura de página inteira com a faixa na vertical, linha a mais ou a menos, tabelas estreitas) e agrupa como cópia só faixas com o mesmo rótulo impresso e o mesmo desenho (`grade.rotulos_iguais`, `grade.diferenca_local`). Revisão independente de 21/11: nenhuma faixa ou arte perdida depois dessas regras.

### 1b. Exportar para o site

```bash
PY -I .claude/skills/importar-artes-pdf/scripts/exportar_web.py --pdf "<pdf>" --saida catalog/<sistema>/<faccao>
```

Grava os SVG de todas as artes (contrato v2 em `scripts/vetor.py`: 600 dpi, mesmo tratamento do gerador), a imagem do rótulo impresso e `artes.json`, que o site lê (D039). Sem revisão, cada arte tem o id do candidato e o usuário escolhe pela figura; rode de novo depois de mudar o `revisao.json`, para usar os `artId`. A segunda rodada reaproveita os SVG do mesmo PDF pelo id do candidato (segundos, não minutos); `--revetorizar` traça tudo de novo, depois de mudar `vetor.py` ou a extração.

### 2. Army book

Baixe o army book nos dois sistemas do lado da facção: as listas podem vir de qualquer um. Ids conferidos (21/11): 2 Grimdark Future, 3 Firefight, 4 Age of Fantasy, 5 AoF Skirmish. O id da unidade é o mesmo nos sistemas e o nome pode mudar ("OGRE Robots" / "OGRE Robot"); GF e AoF têm unidades (veículos, monstros) que Firefight e Skirmish não têm.

```bash
PY -I .claude/skills/importar-artes-pdf/scripts/armybook.py --army-book <id> --sistema 3 --saida catalog/gff/<faccao>
PY -I .claude/skills/importar-artes-pdf/scripts/armybook.py --army-book <id> --sistema 2 --saida catalog/gff/<faccao>
# ou: --share <id-da-lista> (descobre army book e sistema; só GFF verificado)
PY -I .claude/skills/importar-artes-pdf/scripts/unidades.py --saida catalog/<sistema>/<faccao>
```

O `unidades.py` junta as unidades dos livros baixados em `work/unidades-armybook.json`: nome em cada sistema, `genericName`, bases, armas, itens e opções. O `genericName` ajuda muito: os rótulos do PDF usam nomes antigos ou genéricos ("Brute Lord" para "Kemba Brute Boss", genericName "Brute Leader").

### 3. Ler rótulos e mapear

Leia cada `work/rotulos-NN.png` (Read). Cada quadro traz o id do candidato (`a001`…), o rótulo e as miniaturas. Escreva `catalog/<sistema>/<faccao>/revisao.json`:

```json
{
  "packId": "human-defense-force",
  "packVersion": "0.1.0",
  "gameSystems": [{"code": "GF", "slug": "grimdark-future", "armyForgeId": 2},
                  {"code": "GFF", "slug": "grimdark-future-firefight", "armyForgeId": 3}],
  "armyBooks": [{"arquivo": "armybook/z65fgu0l29i4lnlu-gs3-v3.6.0.json"},
                {"arquivo": "armybook/z65fgu0l29i4lnlu-gs2-v3.6.0.json"}],
  "unidades": {
    "veterans": {"armyForgeUnitId": "SScXOqX"}
  },
  "artes": {
    "a034": {
      "artId": "veteran-shotgun",
      "rotulo": "Veteran Shotgun",
      "confiancaRotulo": "alta",
      "unitKey": "veterans",
      "equipmentTags": ["Shotgun"],
      "cosmetic": null,
      "status": "mapped",
      "aliases": [],
      "notas": ""
    }
  }
}
```

- `artId` e `unitKey`: minúsculas com hífen, únicos. Os nomes da unidade em todos os livros entram sozinhos em `names` pelo `armyForgeUnitId`; `nomes` só para algum extra.
- `status`: `mapped` quando o rótulo nomeia a unidade pelo nome atual ou pelo `genericName`, sem interpretação; `alias-proposed` quando depende de interpretação justificável (registre em `aliases` e `notas`); `unmapped` sem justificativa.
- `equipmentTags`: nomes **como no army book**, das armas, itens ou opções da unidade (o `montar.py` recusa outros; ex.: rótulo "Rifle" → `"Battle Rifle"`, com `aliases: [{"pdf": "Rifle", "armyBook": "Battle Rifle"}]` e status `alias-proposed`). Rótulo com arma, item ou montaria → a tag; rótulo sem arma → `[]`, a arte genérica da unidade. O site escolhe, por modelo, a arte com mais tags presentes no equipamento ou nas regras; sem nenhuma, a genérica; sem genérica, o usuário escolhe (D013).
- Poses de comando/apoio sem arma própria (Sergeant, Banner, Medic, Radio): `"cosmetic": "sergeant"` etc.
- Arte sem unidade ou arma correspondente (ex.: "OGRE Minigun" quando o army book só tem Gatling Gun): `"status": "unmapped"`, `unitKey` da unidade se ela existir; o site oferece a arte como substituta (D013).
- Candidato que não é arte (falso positivo): `{"ignorar": true}`.
- Pode revisar em partes; candidatos ainda não revisados ficam fora do manifesto e listados no relatório.
- Confira enquanto escreve, sem gravar nada: `montar.py --saida … --so-validar` (aponta tags fora do army book, ids inexistentes, slugs repetidos e candidatos sem revisão).

### 4. Montar o pacote

```bash
PY -I .claude/skills/importar-artes-pdf/scripts/montar.py --saida catalog/<sistema>/<faccao>
```

Corrija os erros que ele listar até sair `"situacao": "ok"`. O `montar.py` não grava SVG: usa os do passo 1b (rode `exportar_web.py` antes, depois da revisão).

### 5. Relatar e pedir aprovação

Mostre ao usuário: resumo, `review/relatorio.md`, as folhas `review/contato-NN.png` (Read) e as pendências (rótulos de baixa confiança, aliases propostos, `unmapped`, frente × verso < 0,95, sem par). Peça aprovação explícita.

- Aprovado: rode `montar.py --saida … --aprovado`. Correções do usuário viram alterações no `revisao.json` (aliases aprovados passam a `mapped`).
- Commit (se houver repositório): `manifest.json`, `revisao.json`, `artes.json`, `arts/` e `armybook/`. Confira com `git status` que nenhum PDF entrou e que os únicos PNG são `arts/*/rotulo.png`.

## Saídas

```text
catalog/<sistema>/<faccao>/
  revisao.json, manifest.json        versionados
  artes.json                         versionado: índice de todas as artes, lido pelo site
  arts/<id>/<estilo>/frente.svg, verso.svg   vetores v2 (600 dpi), versionados (contrato em scripts/vetor.py)
  arts/<id>/rotulo.png               rótulo impresso em 1 bit, versionado
  armybook/                          snapshot + resumo, versionados
  review/relatorio.md, contato-*.png fora do git (prévias renderizadas dos vetores)
  build/<packId>-<versao>.zip        fora do git (pacote avulso, opcional)
  work/                              fora do git (recortes raster e folhas de rótulo)
```
