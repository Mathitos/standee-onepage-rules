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
- Imagens, PDF e snapshot do army book **nunca** vão para o git (`arts/`, `work/`, `armybook/`, `review/`, `build/` estão no `.gitignore`). Só `manifest.json` e `revisao.json` podem ser versionados.
- Army Forge: só leitura, uma requisição por army book, sem login. Nunca peça senha ou token.
- Uma facção por pasta; não edite a pasta de outra facção que outra sessão possa estar usando.

## Passo a passo

### 0. Preparar

- Python: use `C:/Users/Matheus/AppData/Local/Python/pythoncore-3.14-64/python.exe` se existir (os aliases `python`/`py` não são confiáveis no PC Windows atual); senão teste `python`. Confirme com `-c "import numpy, cv2, scipy, pymupdf"`. Rode sempre com `-I`.
- Pergunte o que faltar: o PDF (caminho) e a facção no Army Forge (link de lista compartilhada ou id do army book e sistema). Não adivinhe.
- Pasta do pacote: `catalog/<sistema>/<faccao>`, ex.: `catalog/gff/human-defense-force`.

Os scripts ficam em `.claude/skills/importar-artes-pdf/scripts/`; rode da raiz do repositório.

### 1. Extrair

```bash
PY -I .claude/skills/importar-artes-pdf/scripts/extrair.py --pdf "<pdf>" --saida catalog/<sistema>/<faccao>
```

Confira o resumo: páginas de arte, páginas ignoradas (capa, instruções), estilos por página, número de candidatos e pares. Se não houver páginas de arte ou a grade não bater, **pare e relate**: o layout é diferente do esperado (PRD-04, "Regras de layout"). Saída `ja-extraido` significa mesmo PDF já processado; só use `--refazer` se o usuário pedir.

### 2. Army book

```bash
PY -I .claude/skills/importar-artes-pdf/scripts/armybook.py --share <id-da-lista> --saida catalog/<sistema>/<faccao>
# ou: --army-book <id> --sistema <n>   (GFF = 3; outros: pergunte)
```

Leia o `.resumo.json`: unidades, tamanhos, bases (valor bruto), armas e opções de troca.

### 3. Ler rótulos e mapear

Leia cada `work/rotulos-NN.png` (Read). Cada quadro traz o id do candidato (`a001`…), o rótulo e as miniaturas. Escreva `catalog/<sistema>/<faccao>/revisao.json`:

```json
{
  "packId": "human-defense-force",
  "packVersion": "0.1.0",
  "gameSystem": {"code": "GFF", "slug": "grimdark-future-firefight", "armyForgeId": 3},
  "armyBook": {"arquivo": "armybook/z65fgu0l29i4lnlu-gs3-v3.6.0.json"},
  "unidades": {
    "veterans": {"nomes": ["Veterans"], "armyForgeUnitId": "SScXOqX"}
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

- `artId` e `unitKey`: minúsculas com hífen, únicos.
- `equipmentTags`: nomes **como no army book** (ex.: rótulo "Rifle" → `"Battle Rifle"`, com `aliases: [{"pdf": "Rifle", "armyBook": "Battle Rifle"}]` e status `alias-proposed`).
- Poses de comando/apoio sem arma própria (Sergeant, Banner, Medic, Radio): `"cosmetic": "sergeant"` etc.
- Arte sem unidade ou arma correspondente (ex.: "OGRE Minigun" quando o army book só tem Gatling Gun): `"status": "unmapped"`, `unitKey` da unidade se ela existir; o site oferece a arte como substituta (D013).
- Candidato que não é arte (falso positivo): `{"ignorar": true}`.
- Pode revisar em partes; candidatos ainda não revisados ficam fora do manifesto e listados no relatório.

### 4. Montar o pacote

```bash
PY -I .claude/skills/importar-artes-pdf/scripts/montar.py --saida catalog/<sistema>/<faccao>
```

Corrija os erros que ele listar até sair `"situacao": "ok"`.

### 5. Relatar e pedir aprovação

Mostre ao usuário: resumo, `review/relatorio.md`, as folhas `review/contato-NN.png` (Read) e as pendências (rótulos de baixa confiança, aliases propostos, `unmapped`, frente × verso < 0,95, sem par). Peça aprovação explícita.

- Aprovado: rode `montar.py --saida … --aprovado`. Correções do usuário viram alterações no `revisao.json` (aliases aprovados passam a `mapped`).
- Commit (se houver repositório): só `manifest.json` e `revisao.json`.

## Saídas

```text
catalog/<sistema>/<faccao>/
  revisao.json, manifest.json        versionados (sem imagens)
  arts/<artId>/<estilo>/frente.png, verso.png, mascara.png
  armybook/                          snapshot + resumo
  review/relatorio.md, contato-*.png
  build/<packId>-<versao>.zip        pacote para carregar no site
  work/                              recortes e folhas de rótulo
```
