"""Confere o encaixe das linguetas cônicas nas fendas da base (D031) com as malhas geradas.

Para cada arte, corta a metade da frente no meio da espessura (contorno da figura) e a base
num plano vertical pelas fendas, e põe o contorno de pé sobre a base. Depois:

- afunda a figura até encostar: mede a folga entre a barra e a base;
- desloca a figura para o lado: mostra quanto ela sobe (centragem);
- inclina a figura: mostra quanto ela sobe (as duas linguetas seguram a inclinação);
- simula a impressora errando a largura (lingueta mais larga ou mais estreita).

Uso: python -I prototipo/verificar_encaixe.py saidas/teste-acabamento [--png saida.png]
"""
import argparse
import json
import math
from pathlib import Path

import cv2
import manifold3d as mf
import numpy as np
import trimesh

EPS = 1e-4  # mm²: área de interseção considerada contato


def carregar(caminho):
    tm = trimesh.load(caminho, force='mesh')
    return mf.Manifold(mf.Mesh(vert_properties=np.asarray(tm.vertices, np.float32),
                               tri_verts=np.asarray(tm.faces, np.uint32)))


def contorno_da_metade(stl, corpo):
    return carregar(stl).slice(corpo / 2)


def corte_da_base(stl):
    """Corte vertical pelas fendas: (x, -z). Base impressa de cabeça para baixo, então
    y' = 0 é a face de cima no jogo e y' negativo entra na base."""
    m = carregar(stl)
    x0, y0, _, x1, y1, _ = m.bounding_box()
    return m.rotate((90, 0, 0)).slice((y0 + y1) / 2), (x0 + x1) / 2


def pontas(contorno):
    """Centros das duas linguetas e a ponta (y mínimo) do contorno."""
    x0, ymin, x1, _ = contorno.bounds()
    faixa = contorno ^ mf.CrossSection.square((x1 - x0 + 2, 0.6)).translate((x0 - 1, ymin))
    pedacos = sorted(faixa.decompose(), key=lambda c: c.bounds()[0])
    if len(pedacos) != 2:
        raise SystemExit(f'esperava 2 linguetas, achei {len(pedacos)}')
    cx = [(p.bounds()[0] + p.bounds()[2]) / 2 for p in pedacos]
    return cx, ymin


def afundar(contorno, base, xb, cx, ymin, dx=0.0, giro=0.0):
    """Maior profundidade s (ponta das linguetas abaixo da face de cima) sem interseção."""
    meio = (cx[0] + cx[1]) / 2
    c = contorno.translate((-meio, -ymin))
    if giro:
        c = c.rotate(giro)
    c = c.translate((xb + dx, 0))

    def bate(s):
        return (c.translate((0, -s)) ^ base).area() > EPS
    lo, hi = -0.5, 2.5
    if bate(lo):
        return float('nan')
    for _ in range(40):
        mid = (lo + hi) / 2
        lo, hi = (lo, mid) if bate(mid) else (mid, hi)
    return lo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('saida', type=Path)
    ap.add_argument('--png', type=Path)
    a = ap.parse_args()
    rel = json.loads((a.saida / 'relatorio.json').read_text(encoding='utf-8'))
    P = rel['parametros']
    corpo = P['corpo']
    resultado, figs = {}, []
    for m in rel['modelos']:
        arte = m['arte']
        if arte in resultado:
            continue
        ac = m.get('acabamento', P['acabamento'])
        lado = 'frente' if rel['modo'] == 'duas-metades' else 'peca'
        cont = contorno_da_metade(a.saida / 'stl' / f'{arte}-{ac}-{lado}.stl', corpo)
        kb = next(k for k in rel['bases'] if k.startswith(f'base-{m["base"]}'))
        base, xb = corte_da_base(a.saida / 'stl' / f'{kb}.stl')
        cx, ymin = pontas(cont)
        prof = rel['artes'][arte]['linguetas_mm']['prof']
        s0 = afundar(cont, base, xb, cx, ymin)
        r = {'entre_linguetas_mm': round(cx[1] - cx[0], 3), 'folga_barra_base_mm': round(prof - s0, 3)}
        # deslocada para o lado: quanto sobe
        r['sobe_se_deslocada_mm'] = {f'{d:+.2f}': round(s0 - afundar(cont, base, xb, cx, ymin, dx=d), 3)
                                     for d in (-0.1, -0.05, 0.05, 0.1)}
        # inclinada: quanto sobe
        r['sobe_se_inclinada_mm'] = {f'{g:+.1f} grau': round(s0 - afundar(cont, base, xb, cx, ymin, giro=g), 3)
                                     for g in (-1.0, -0.5, 0.5, 1.0)}
        # impressora errando a largura (cada lado): lingueta mais larga (+) ou mais estreita (-)
        erro = {}
        for e in (-0.1, -0.05, 0.05, 0.1):
            ce = cont.offset(e, mf.JoinType.Miter)
            cxe, ye = pontas(ce)
            s = afundar(ce, base, xb, cxe, ye)
            meio = [afundar(ce, base, xb, cxe, ye, dx=d) for d in (-0.05, 0.05)]
            # o offset move a ponta e a barra juntas: a profundidade da lingueta continua prof
            erro[f'{e:+.2f} por lado'] = {'folga_barra_base_mm': round(prof - s, 3),
                                          'sobe_se_deslocada_0_05_mm': round(s - max(meio), 3)}
        r['erro_de_largura'] = erro
        resultado[arte] = r
        figs.append((arte, cont, base, xb, cx, ymin, s0))
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
    if a.png:
        desenhar(figs, a.png)


def desenhar(figs, png, k=90):
    """Corte das linguetas assentadas (primeira arte): base em cinza, figura em branco com
    contorno vermelho, vazio em azul claro."""
    paineis = []
    for arte, cont, base, xb, cx, ymin, s0 in figs[:1]:
        meio = (cx[0] + cx[1]) / 2
        c = cont.translate((xb - meio, -ymin - s0))
        x0, x1, y0, y1 = xb - 9, xb + 9, -2.3, 1.2
        w, h = int((x1 - x0) * k), int((y1 - y0) * k)
        img = np.full((h, w, 3), (250, 225, 200), np.uint8)
        para_px = lambda pts: np.array([[(x - x0) * k, (y1 - y) * k] for x, y in pts], np.int32)
        for poly in base.to_polygons():
            cv2.fillPoly(img, [para_px(poly)], (120, 120, 120), lineType=cv2.LINE_AA)
        for poly in c.to_polygons():
            cv2.fillPoly(img, [para_px(poly)], (255, 255, 255), lineType=cv2.LINE_AA)
            cv2.polylines(img, [para_px(poly)], True, (40, 40, 220), 1, cv2.LINE_AA)
        cv2.putText(img, arte, (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1, cv2.LINE_AA)
        paineis.append(img)
    linha = []
    for p in paineis:
        linha += [p, np.full((p.shape[0], 8, 3), 255, np.uint8)]
    out = np.hstack(linha[:-1])
    rod = np.full((30, out.shape[1], 3), 255, np.uint8)
    cv2.putText(rod, f'Corte vertical pelas fendas, linguetas assentadas. Cinza = base; branco = figura; azul = vazio. {k} px/mm.',
                (6, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (60, 60, 60), 1, cv2.LINE_AA)
    cv2.imwrite(str(png), np.vstack([out, rod]))


if __name__ == '__main__':
    main()
