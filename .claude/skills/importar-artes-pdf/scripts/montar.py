"""Passo 4 da skill: junta candidatos + revisão do agente -> pacote do catálogo.

Uso: python -I montar.py --saida catalog/<sistema>/<faccao>

Lê <saida>/work/candidatos.json (passo 1), <saida>/revisao.json (escrito pelo agente,
formato no SKILL.md; versionado) e <saida>/artes.json, que exportar_web.py grava junto com os
SVG (contrato v2, 600 dpi; rode-o antes, depois de mudar a revisão). Gera:
  manifest.json                         (versionado; aponta para arts/<artId>/<estilo>/*.svg)
  review/relatorio.md, review/contato-NN.png    (prévias dos recortes)
  build/<packId>-<versao>.zip            (manifest + arts, para levar o pacote sem o repositório)
Candidatos sem revisão ficam fora do manifesto e listados como pendência. Nada é inventado:
base sem dado vira "unknown"; rótulo vazio é erro.
"""
import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import extrair as E  # noqa: E402


def ler_cinza(caminho):
    return cv2.imdecode(np.fromfile(str(caminho), np.uint8), cv2.IMREAD_GRAYSCALE)

SLUG = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
STATUS = {'mapped', 'alias-proposed', 'unmapped'}


def base_de(raw):
    if raw is None:
        return {'shape': 'unknown', 'dimensionsMm': None, 'raw': None}
    s = str(raw).strip().lower()
    if re.fullmatch(r'\d+(\.\d+)?', s):
        return {'shape': 'round', 'dimensionsMm': [float(s)], 'raw': raw}
    m = re.fullmatch(r'(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)', s)
    if m:
        a, b = float(m[1]), float(m[2])
        return {'shape': 'oval', 'dimensionsMm': [max(a, b), min(a, b)], 'raw': raw,
                'nota': 'elipse é suposição até confirmação'}
    return {'shape': 'unknown', 'dimensionsMm': None, 'raw': raw}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--aprovado', action='store_true',
                    help='só depois que o usuário aprovar o relatório na conversa')
    a = ap.parse_args()
    raiz, work = a.saida, a.saida / 'work'
    cand = json.loads((work / 'candidatos.json').read_text(encoding='utf-8'))
    rev = json.loads((raiz / 'revisao.json').read_text(encoding='utf-8'))
    erros = []

    livro, baixado = None, None
    if rev.get('armyBook', {}).get('arquivo'):
        livro = json.loads((raiz / rev['armyBook']['arquivo']).read_text(encoding='utf-8'))
        resumo_path = raiz / rev['armyBook']['arquivo'].replace('.json', '.resumo.json')
        baixado = json.loads(resumo_path.read_text(encoding='utf-8'))['baixadoEm'] if resumo_path.exists() else None
    por_id = {u['id']: u for u in (livro or {}).get('units', [])}

    unidades = []
    for chave, u in rev.get('unidades', {}).items():
        if not SLUG.match(chave):
            erros.append(f'unitKey inválida: {chave}')
        af = por_id.get(u.get('armyForgeUnitId'))
        if u.get('armyForgeUnitId') and af is None:
            erros.append(f'{chave}: armyForgeUnitId {u["armyForgeUnitId"]} não está no army book')
        base = base_de((af or {}).get('bases', {}).get('round')) if af else base_de(None)
        base.update(source=f'army-forge v{livro.get("versionString")}' if af else None, retrievedAt=baixado if af else None)
        unidades.append({'unitKey': chave, 'names': u.get('nomes', []), 'armyForgeUnitId': u.get('armyForgeUnitId'),
                         'base': base})
    chaves_unidade = {u['unitKey'] for u in unidades}

    candidatos = {c['id']: c for c in cand['candidatos']}
    revisadas = rev.get('artes', {})
    exportadas = {}
    if (raiz / 'artes.json').exists():
        exportadas = {a['id']: a for a in json.loads((raiz / 'artes.json').read_text(encoding='utf-8'))['artes']}
    artes, art_ids = [], set()
    for cid, r in revisadas.items():
        if cid not in candidatos:
            erros.append(f'{cid}: não existe em candidatos.json')
            continue
        if r.get('ignorar'):
            continue
        c = candidatos[cid]
        art_id = r.get('artId', '')
        if not SLUG.match(art_id) or art_id in art_ids:
            erros.append(f'{cid}: artId inválido ou repetido ({art_id!r})')
        art_ids.add(art_id)
        if not r.get('rotulo'):
            erros.append(f'{cid}: rótulo vazio')
        status = r.get('status')
        if status not in STATUS:
            erros.append(f'{cid}: status inválido ({status!r})')
        if status != 'unmapped' and r.get('unitKey') not in chaves_unidade:
            erros.append(f'{cid}: unitKey {r.get("unitKey")!r} não declarada em "unidades"')
        estilos = {}
        exp = exportadas.get(art_id)
        if exp is None:
            erros.append(f'{cid}: {art_id} não está em artes.json; rode exportar_web.py depois da revisão')
            continue
        for estilo, gid in c['grupos'].items():
            g = next(x for x in cand['grupos'] if x['id'] == gid)
            e = exp['estilos'].get(estilo)
            if e is None:
                erros.append(f'{cid}: estilo {estilo} sem SVG exportado')
                continue
            estilos[estilo] = {'page': g['pagina'], 'rows': g['linhas'],
                               'front': f'arts/{art_id}/{estilo}/frente.svg',
                               'back': f'arts/{art_id}/{estilo}/verso.svg',
                               'canvasMm': e['telaMm'], 'frontBackIoU': e['iouFrenteVerso'],
                               'sizeMm': g['tamanho_mm'], 'vector': {'contract': 2, 'dpi': 600}}
        artes.append({
            'artId': art_id, 'candidateId': cid, 'pdfLabel': r.get('rotulo'),
            'labelSource': 'agent-vision', 'labelConfidence': r.get('confiancaRotulo', 'alta'),
            'unitKey': r.get('unitKey'), 'equipmentTags': r.get('equipmentTags', []),
            'cosmetic': r.get('cosmetic'), 'mappingStatus': status, 'aliases': r.get('aliases', []),
            'notes': r.get('notas', ''), 'styles': estilos, 'pendencias': c['pendencias'],
            'reviewStatus': 'approved' if a.aprovado else 'agent-proposed', 'licenseStatus': 'user-approved',
        })

    if erros:
        print(json.dumps({'situacao': 'erro', 'erros': erros}, ensure_ascii=False, indent=2))
        sys.exit(1)

    manifesto = {
        'schemaVersion': 1, 'packId': rev['packId'], 'packVersion': rev['packVersion'],
        'gameSystem': rev.get('gameSystem'),
        'armyBook': {'id': (livro or {}).get('uid'), 'name': (livro or {}).get('name'),
                     'version': (livro or {}).get('versionString'), 'retrievedAt': baixado if livro else None},
        'source': {'pdfName': cand['pdf']['nome'], 'pdfSha256': cand['pdf']['sha256'], 'dpi': cand['pdf']['dpi'],
                   'mmPerPx': round(25.4 / cand['pdf']['dpi'], 6)},
        'reviewStatus': 'approved' if a.aprovado else 'agent-proposed',
        'units': unidades, 'arts': artes,
    }

    (raiz / 'manifest.json').write_text(json.dumps(manifesto, indent=2, ensure_ascii=False), encoding='utf-8', newline='\n')

    # relatório e folhas de contato
    review = raiz / 'review'
    review.mkdir(exist_ok=True)
    nao_revisados = [cid for cid in candidatos if cid not in revisadas]
    linhas = [f'# Revisão do pacote {rev["packId"]} {rev["packVersion"]}', '',
              f'PDF: {cand["pdf"]["nome"]} (SHA-256 `{cand["pdf"]["sha256"][:12]}…`), army book '
              f'{manifesto["armyBook"]["name"]} v{manifesto["armyBook"]["version"]}.', '',
              f'- Candidatos no PDF: {len(candidatos)}; revisados: {len(revisadas)}; no manifesto: {len(artes)}.',
              f'- Sem revisão (fora do manifesto): {", ".join(nao_revisados) or "nenhum"}.',
              f'- Rótulo com baixa confiança: {", ".join(x["artId"] for x in artes if x["labelConfidence"] != "alta") or "nenhum"}.',
              f'- Alias proposto (precisa aprovação): {", ".join(x["artId"] for x in artes if x["mappingStatus"] == "alias-proposed") or "nenhum"}.',
              f'- Sem correspondência no army book: {", ".join(x["artId"] for x in artes if x["mappingStatus"] == "unmapped") or "nenhum"}.',
              '- Vetores: SVG contrato v2 a 600 dpi, gravados por exportar_web.py (todas as artes da facção).',
              '', '| Candidato | artId | Rótulo | Unidade | Equipamento | Status | Pendências |', '|---|---|---|---|---|---|---|']
    for x in artes:
        linhas.append(f'| {x["candidateId"]} | {x["artId"]} | {x["pdfLabel"]} | {x["unitKey"] or "—"} | '
                      f'{", ".join(x["equipmentTags"]) or "—"} | {x["mappingStatus"]} | {"; ".join(x["pendencias"]) or "—"} |')
    linhas += ['', '| Unidade | Nomes | Base |', '|---|---|---|']
    for u in unidades:
        b = u['base']
        linhas.append(f'| {u["unitKey"]} | {", ".join(u["names"])} | {b["shape"]} {b["dimensionsMm"] or ""} (bruto: {b["raw"]}) |')
    (review / 'relatorio.md').write_text('\n'.join(linhas) + '\n', encoding='utf-8')
    for f in review.glob('contato-*.png'):
        f.unlink()
    tiles = []
    for x in artes:
        imgs = []
        for estilo in ('borda', 'fino'):
            if estilo in x['styles']:
                pasta = work / 'grupos' / candidatos[x['candidateId']]['grupos'][estilo]
                imgs += [ler_cinza(pasta / 'frente.png'), ler_cinza(pasta / 'verso.png')]
                break
        tiles.append(E.tile(f'{x["artId"]} ({x["unitKey"] or "?"})', None, imgs))
    folhas = []
    for n, i in enumerate(range(0, len(tiles), E.POR_FOLHA), 1):
        caminho = review / f'contato-{n:02d}.png'
        E.png(caminho, E.folha(tiles[i:i + E.POR_FOLHA]))
        folhas.append(str(caminho))

    # pacote para o site
    build = raiz / 'build'
    build.mkdir(exist_ok=True)
    zip_path = build / f'{rev["packId"]}-{rev["packVersion"]}.zip'
    tmp = zip_path.with_suffix('.tmp')
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        z.write(raiz / 'manifest.json', 'manifest.json')
        for f in sorted((raiz / 'arts').rglob('*.svg')):
            z.write(f, f.relative_to(raiz).as_posix())
    tmp.replace(zip_path)

    print(json.dumps({'situacao': 'ok', 'manifesto': str(raiz / 'manifest.json'), 'artes': len(artes),
                      'unidades': len(unidades), 'nao_revisados': len(nao_revisados),
                      'relatorio': str(review / 'relatorio.md'), 'contato': folhas, 'pacote': str(zip_path)},
                     ensure_ascii=False))


if __name__ == '__main__':
    main()
