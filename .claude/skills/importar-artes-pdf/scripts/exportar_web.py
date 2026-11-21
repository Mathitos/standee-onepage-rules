"""Exporta todas as artes de uma facção para o site (D039): SVG v2 a 600 dpi, rótulo e índice.

Uso: python -I exportar_web.py --pdf ARQUIVO.pdf --saida catalog/<sistema>/<faccao> [--faccao "Nome"]

Lê work/candidatos.json (passo 1) e, se existir, revisao.json (passo 3). Cada candidato vira
uma arte: com revisão, usa o artId, o rótulo e o mapeamento; sem revisão, usa o id do
candidato e a imagem do rótulo impresso, para o usuário escolher no site pela figura (D013).
Grava, versionados: arts/<id>/<estilo>/frente.svg e verso.svg (contrato em vetor.py),
arts/<id>/rotulo.png e artes.json. Apaga artes de uma exportação anterior que não existem mais.
"""
import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np
import pymupdf

sys.path.insert(0, str(Path(__file__).parent))
import vetor as V  # noqa: E402

PG = V.PG


def png(caminho, img):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    ok, buf = cv2.imencode('.png', img, [cv2.IMWRITE_PNG_COMPRESSION, 9])
    if not ok:
        raise RuntimeError(f'falha ao gravar {caminho}')
    buf.tofile(str(caminho))


def ler_cinza(caminho):
    return cv2.imdecode(np.fromfile(str(caminho), np.uint8), cv2.IMREAD_GRAYSCALE)


def rotulo_png(cinza):
    """Rótulo impresso, recortado na tinta e em 1 bit (cabe em ~1-3 KB)."""
    if cinza is None:
        return None
    ys, xs = np.where(cinza < 160)
    if len(ys) < 30:
        return None
    m = 6
    rec = cinza[max(0, ys.min() - m):ys.max() + m, max(0, xs.min() - m):xs.max() + m]
    return np.where(rec < 160, 0, 255).astype(np.uint8)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pdf', type=Path, required=True)
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--faccao', help='nome de exibição (padrão: do nome do PDF)')
    a = ap.parse_args()
    raiz, work = a.saida, a.saida / 'work'
    cand = json.loads((work / 'candidatos.json').read_text(encoding='utf-8'))
    sha = hashlib.sha256(a.pdf.read_bytes()).hexdigest()
    if sha != cand['pdf']['sha256']:
        sys.exit(f'PDF diferente do extraído: {sha[:12]} x {cand["pdf"]["sha256"][:12]}')
    rev_path = raiz / 'revisao.json'
    rev = json.loads(rev_path.read_text(encoding='utf-8')) if rev_path.exists() else {}
    revisadas = rev.get('artes', {})
    grupos = {g['id']: g for g in cand['grupos']}
    doc = pymupdf.open(a.pdf)
    cache = {}

    def linha(gid):
        g = grupos[gid]
        p = g['pagina']
        if p not in cache:
            cache.clear()                     # uma página por vez: a 600 dpi elas pesam
            cache[p] = PG.extrair_pagina(doc, p, V.DPI)[0]
        return cache[p][g['linhas'][0]]

    nome = a.faccao or a.pdf.stem.replace('_-_BW', '').replace('_BW', '').replace('_', ' ').strip()
    artes, erros, ids = [], [], set()
    tmp_arts = raiz / 'arts.tmp'
    if tmp_arts.exists():
        shutil.rmtree(tmp_arts)
    # ordem de página: o processamento pega uma página de cada vez
    ordem = sorted(cand['candidatos'], key=lambda c: min(grupos[g]['pagina'] for g in c['grupos'].values()))
    for c in ordem:
        r = revisadas.get(c['id'], {})
        if r.get('ignorar'):
            continue
        art_id = r.get('artId') or c['id']
        if art_id in ids:
            erros.append(f'{c["id"]}: artId repetido {art_id}')
            continue
        ids.add(art_id)
        estilos = {}
        for estilo in ('fino', 'borda'):
            gid = c['grupos'].get(estilo)
            if gid is None:
                continue
            L = linha(gid)
            try:
                vet = V.vetorizar(L.frente, L.verso, f'{art_id} {estilo}')
            except (ValueError, IndexError) as e:
                erros.append(f'{c["id"]} {estilo}: {e}')
                continue
            pasta = tmp_arts / art_id / estilo
            pasta.mkdir(parents=True, exist_ok=True)
            for lado, texto in vet['svg'].items():
                (pasta / f'{lado}.svg').write_text(texto, encoding='utf-8', newline='\n')
            estilos[estilo] = {'telaMm': vet['telaMm'], 'tamanhoMm': vet['tamanhoMm'],
                               'iouFrenteVerso': vet['iouFrenteVerso'],
                               'pagina': grupos[gid]['pagina'], 'copias': len(grupos[gid]['linhas'])}
        if not estilos:
            continue
        gid0 = c['grupos'].get('fino') or c['grupos'].get('borda')
        rot = rotulo_png(ler_cinza(work / 'grupos' / gid0 / 'rotulo.png'))
        if rot is not None:
            png(tmp_arts / art_id / 'rotulo.png', rot)
        artes.append({
            'id': art_id, 'candidato': c['id'],
            'rotulo': r.get('rotulo'), 'rotuloImg': f'arts/{art_id}/rotulo.png' if rot is not None else None,
            'unitKey': r.get('unitKey'), 'equipmentTags': r.get('equipmentTags', []),
            'cosmetic': r.get('cosmetic'), 'status': r.get('status', 'nao-revisada'),
            'estilos': estilos, 'pendencias': c['pendencias'],
        })
    indice = {
        'contrato': V.VERSAO, 'dpi': V.DPI, 'packId': rev.get('packId') or raiz.name, 'faccao': nome,
        'sistema': raiz.parent.name,
        'pdf': {'nome': cand['pdf']['nome'], 'sha256': sha, 'paginas': cand['pdf']['paginas']},
        'manifesto': 'manifest.json' if (raiz / 'manifest.json').exists() else None,
        'artes': artes,
    }
    if (raiz / 'arts').exists():
        shutil.rmtree(raiz / 'arts')
    try:
        tmp_arts.replace(raiz / 'arts')
    except PermissionError:
        # Windows nega renomear pasta vigiada (servidor do Vite aberto, 21/11): copia o conteúdo
        shutil.copytree(tmp_arts, raiz / 'arts', dirs_exist_ok=True)
        shutil.rmtree(tmp_arts, ignore_errors=True)
    (raiz / 'artes.json').write_text(json.dumps(indice, indent=1, ensure_ascii=False), encoding='utf-8', newline='\n')
    tamanho = sum(f.stat().st_size for f in (raiz / 'arts').rglob('*') if f.is_file())
    print(json.dumps({'faccao': nome, 'artes': len(artes), 'estilos': sum(len(x['estilos']) for x in artes),
                      'mb': round(tamanho / 1e6, 1), 'erros': erros}, ensure_ascii=False))


if __name__ == '__main__':
    main()
