"""Passo 1 da skill importar-artes-pdf: PDF -> candidatos de arte para revisão.

Uso: python -I extrair.py --pdf ARQUIVO.pdf --saida catalog/<sistema>/<faccao> [--refazer]

Faz, sem julgamento humano: hash do PDF, detecção das faixas, estilo por página
(contorno fino x borda grossa), agrupamento de cópias idênticas, pareamento dos dois
estilos da mesma arte e folhas numeradas com os rótulos para o agente ler.
Grava só em <saida>/work/ (fora do git). Idempotente: mesmo SHA-256 não refaz.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import pymupdf
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).parent))
import grade as G  # noqa: E402

S = G.MM_PER_PX
LIMIAR_COPIA = 0.035      # diferença média entre miniaturas para considerar cópia
LIMIAR_ROTULO = 0.10      # diferença média entre rótulos para considerar a mesma arte
POR_FOLHA = 12


def png(caminho, img):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    ok, buf = cv2.imencode('.png', img)
    if not ok:
        raise RuntimeError(f'falha ao gravar {caminho}')
    buf.tofile(str(caminho))


def assinatura_rotulo(rot):
    tinta = rot < G.DARK
    if tinta.sum() < 30:
        return None
    ys, xs = np.where(tinta)
    rec = rot[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    return cv2.resize(rec, (192, 48), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0


def contem(fino, borda):
    """Quanto a silhueta fina, dilatada, explica a da borda grossa (mesma arte?)."""
    r = int(round(1.6 / S))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    dil = cv2.dilate(fino.astype(np.uint8), k) > 0
    return G.alinhar_iou(dil, borda, raio=6)


def miniatura(img, alto=150):
    h, w = img.shape[:2]
    return cv2.resize(img, (max(1, int(w * alto / h)), alto), interpolation=cv2.INTER_AREA)


def folha(tiles, colunas=3):
    alto = max(t.shape[0] for t in tiles)
    larg = max(t.shape[1] for t in tiles)
    linhas = []
    for i in range(0, len(tiles), colunas):
        fila = [cv2.copyMakeBorder(t, 0, alto - t.shape[0], 0, larg - t.shape[1], cv2.BORDER_CONSTANT, value=255)
                for t in tiles[i:i + colunas]]
        while len(fila) < colunas:
            fila.append(np.full((alto, larg), 255, np.uint8))
        linhas.append(np.hstack([cv2.copyMakeBorder(f, 6, 6, 6, 6, cv2.BORDER_CONSTANT, value=200) for f in fila]))
    return np.vstack(linhas)


def recortar_tinta(rotulo, margem=8):
    ys, xs = np.where(rotulo < G.DARK)
    if len(ys) < 30:
        return None
    return rotulo[max(0, ys.min() - margem):ys.max() + margem, max(0, xs.min() - margem):xs.max() + margem]


def tile(cid, rotulo, imagens):
    topo = np.full((40, 10), 255, np.uint8)
    corpo = np.hstack([miniatura(i) for i in imagens] or [topo])
    tinta = recortar_tinta(rotulo) if rotulo is not None else None
    rot = miniatura(tinta, 70) if tinta is not None else np.full((70, 200), 255, np.uint8)
    largura_texto = cv2.getTextSize(cid, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)[0][0] + 12
    largura = max(corpo.shape[1], rot.shape[1], 260, largura_texto)
    pad = lambda im: cv2.copyMakeBorder(im, 0, 0, 0, largura - im.shape[1], cv2.BORDER_CONSTANT, value=255)
    cab = np.full((40, largura), 255, np.uint8)
    cv2.putText(cab, cid, (6, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, 0, 2)
    return np.vstack([pad(cab), pad(rot), pad(corpo)])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pdf', type=Path, required=True)
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--refazer', action='store_true')
    a = ap.parse_args()
    work = a.saida / 'work'
    sha = hashlib.sha256(a.pdf.read_bytes()).hexdigest()
    estado = work / 'candidatos.json'
    if estado.exists() and not a.refazer:
        anterior = json.loads(estado.read_text(encoding='utf-8'))
        if anterior.get('pdf', {}).get('sha256') == sha:
            print(json.dumps({'situacao': 'ja-extraido', 'arquivo': str(estado)}, ensure_ascii=False))
            return
    doc = pymupdf.open(a.pdf)

    paginas, grupos = [], []
    for p in range(1, doc.page_count + 1):
        linhas, descartadas = G.extrair_pagina(doc, p)
        if not linhas:
            paginas.append({'pagina': p, 'tipo': 'ignorada', 'faixas_descartadas': descartadas})
            continue
        dados = []
        for L in linhas:
            m = G.silhueta(L.frente)
            dados.append((L, m, G.escuro_na_faixa(L.frente, m), G.assinatura(L.frente, m)))
        escuro = float(np.median([d[2] for d in dados]))
        estilo = 'borda' if escuro >= G.LIMIAR_BORDA else 'fino'
        paginas.append({'pagina': p, 'tipo': 'arte', 'estilo': estilo, 'linhas': len(linhas),
                        'faixas_descartadas': descartadas, 'escuro_faixa': round(escuro, 3)})
        locais = []
        for L, m, _, sig in dados:
            ys, xs = np.where(m)
            tam = ((ys.max() - ys.min()) * S, (xs.max() - xs.min()) * S)
            for g in locais:
                if abs(g['tam'][0] - tam[0]) < 1 and abs(g['tam'][1] - tam[1]) < 1 and \
                        float(np.abs(g['sig'] - sig).mean()) < LIMIAR_COPIA:
                    g['linhas'].append(L.indice)
                    break
            else:
                locais.append({'L': L, 'm': m, 'sig': sig, 'tam': tam, 'linhas': [L.indice]})
        for g in locais:
            g.update(pagina=p, estilo=estilo, sig_rot=assinatura_rotulo(g['L'].rotulo))
            grupos.append(g)

    # grava representantes e mede frente x verso
    for i, g in enumerate(grupos, 1):
        g['id'] = f'g{i:03d}'
        L, m = g['L'], g['m']
        mv = G.silhueta(L.verso)
        g['iou_fv'] = G.alinhar_iou(m, mv[:, ::-1])
        base = work / 'grupos' / g['id']
        png(base / 'frente.png', L.frente)
        png(base / 'verso.png', L.verso)
        png(base / 'mascara.png', (m * 255).astype(np.uint8))
        png(base / 'rotulo.png', L.rotulo)

    # pareamento fino x borda pelo rótulo, confirmado pela silhueta
    finos = [g for g in grupos if g['estilo'] == 'fino']
    bordas = [g for g in grupos if g['estilo'] == 'borda']
    # todas as ligações possíveis; depois atribuição global pelo rótulo mais idêntico
    # (guloso por grupo errava: "Storm Trooper Rifle" x "Storm Trooper Drum Rifle")
    ligacoes = []
    for f in finos:
        for b in bordas:
            if f['sig_rot'] is None or b['sig_rot'] is None:
                continue
            if not (0 <= b['tam'][0] - f['tam'][0] <= 5 and 0 <= b['tam'][1] - f['tam'][1] <= 9):
                continue
            d = float(np.abs(f['sig_rot'] - b['sig_rot']).mean())
            if d >= LIMIAR_ROTULO:
                continue
            cont = contem(f['m'], b['m'])
            # rótulo idêntico tolera contenção menor (a borda grossa preenche vãos, ex.: capas)
            if (d < 0.02 and cont >= 0.75) or cont >= 0.85:
                ligacoes.append((round(d, 3), -cont, f, b))
    ligacoes.sort(key=lambda x: (x[0], x[1]))
    par_de, usados = {}, set()
    for d, menos_cont, f, b in ligacoes:
        if f['id'] in par_de or b['id'] in usados:
            continue
        par_de[f['id']] = b
        usados.add(b['id'])
        f['contem'] = -menos_cont
    candidatos = [(f, par_de.get(f['id'])) for f in finos]
    candidatos += [(None, b) for b in bordas if b['id'] not in usados]

    saida_cand, tiles = [], []
    for i, (f, b) in enumerate(candidatos, 1):
        cid = f'a{i:03d}'
        ref = f or b
        c = {
            'id': cid,
            'grupos': {k: g['id'] for k, g in (('fino', f), ('borda', b)) if g is not None},
            'paginas': sorted({g['pagina'] for g in (f, b) if g}),
            'copias_no_pdf': {k: len(g['linhas']) for k, g in (('fino', f), ('borda', b)) if g is not None},
            'tamanho_mm': {k: [round(v, 1) for v in g['tam']] for k, g in (('fino', f), ('borda', b)) if g is not None},
            'iou_frente_verso': {k: round(g['iou_fv'], 3) for k, g in (('fino', f), ('borda', b)) if g is not None},
            'contencao_par': round(f['contem'], 3) if f is not None and b is not None else None,
            'rotulo_tem_tinta': ref['sig_rot'] is not None,
            'pendencias': [],
        }
        if f is None or b is None:
            c['pendencias'].append('sem par no outro estilo')
        if min(c['iou_frente_verso'].values()) < 0.95:
            c['pendencias'].append('frente x verso abaixo de 0,95')
        if ref['sig_rot'] is None:
            c['pendencias'].append('rótulo sem texto')
        saida_cand.append(c)
        imgs = [ref['L'].frente] + ([b['L'].frente] if f is not None and b is not None else [])
        tiles.append(tile(cid, ref['L'].rotulo, imgs))

    folhas = []
    for n, i in enumerate(range(0, len(tiles), POR_FOLHA), 1):
        caminho = work / f'rotulos-{n:02d}.png'
        png(caminho, folha(tiles[i:i + POR_FOLHA]))
        folhas.append(str(caminho))

    resultado = {
        'pdf': {'nome': a.pdf.name, 'sha256': sha, 'paginas': doc.page_count, 'dpi': G.DPI},
        'paginas': paginas,
        'grupos': [{'id': g['id'], 'pagina': g['pagina'], 'linhas': g['linhas'], 'estilo': g['estilo'],
                    'tamanho_mm': [round(v, 1) for v in g['tam']], 'iou_frente_verso': round(g['iou_fv'], 3)}
                   for g in grupos],
        'candidatos': saida_cand,
        'folhas_rotulos': folhas,
    }
    estado.parent.mkdir(parents=True, exist_ok=True)
    tmp = estado.with_suffix('.tmp')
    tmp.write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding='utf-8')
    tmp.replace(estado)
    resumo = {
        'paginas_arte': sum(1 for p in paginas if p['tipo'] == 'arte'),
        'paginas_ignoradas': [p['pagina'] for p in paginas if p['tipo'] == 'ignorada'],
        'estilos': {e: sum(1 for p in paginas if p.get('estilo') == e) for e in ('fino', 'borda')},
        'linhas': sum(len(g['linhas']) for g in grupos), 'grupos': len(grupos),
        'candidatos': len(saida_cand), 'pares': sum(1 for c in saida_cand if len(c['grupos']) == 2),
        'com_pendencia': [c['id'] for c in saida_cand if c['pendencias']],
        'folhas_rotulos': folhas, 'arquivo': str(estado),
    }
    print(json.dumps(resumo, ensure_ascii=False))


if __name__ == '__main__':
    main()
