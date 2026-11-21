"""Vetorização das artes, contrato v2 (D020, revisto em 21/11 com D024/D039).

A arte do PDF é JPEG de 600 dpi. Os vetores saem da faixa renderizada a 600 dpi com o
mesmo tratamento do gerador (prototipo/gerar.py): silhueta de pdf_grade, tinta com desfoque
de 0,035 mm e limiar 200, verso alinhado à frente espelhada por IoU. Assim o site, lendo o
SVG, reproduz o que o protótipo fazia lendo o PDF.

Contrato dos SVGs de uma arte num estilo (frente.svg e verso.svg), versão 2:
- viewBox "0 0 W H" em pixels de 600 dpi; width/height em mm (W e H x 25,4/600);
- W e H iguais nas duas faces; y para baixo, como na imagem; a figura em pé;
- espelhar o verso em x (x -> W - x) o sobrepõe à frente (alinhamento já aplicado);
- path#silhueta e path#tinta, fill-rule evenodd, só com M, l relativos e z, coordenadas
  inteiras: os vértices são os centros dos pixels do contorno (cv2.findContours +
  approxPolyDP de 0,5 px). Quem gera malha desloca o polígono meio pixel para fora
  (junção miter), como prototipo/gerar.py secao(), para chegar à borda dos pixels;
- a tinta de cada face fica dentro da silhueta da própria face; a política de contorno
  (capas) fica para o gerador, que usa a silhueta da frente.
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

RAIZ = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(RAIZ / 'prototipo'))
import gerar as GR  # noqa: E402  (mesmo tratamento da arte do gerador)
import pdf_grade as PG  # noqa: E402

DPI = PG.DPI_ARTE
S = 25.4 / DPI
EPS_PX = 0.5
MARGEM_PX = 2
VERSAO = 2


def contornos(mask):
    """Máscara -> polígonos (vértices nos centros dos pixels, inteiros), como o gerador."""
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cnts:
        c = cv2.approxPolyDP(c, EPS_PX, True)
        if len(c) >= 3:
            out.append(c[:, 0, :].astype(np.int64))
    return out


def _d(polys):
    partes = []
    for p in polys:
        d = np.diff(p, axis=0)
        partes.append(f'M{p[0][0]} {p[0][1]}l' + ' '.join(f'{a} {b}' for a, b in d) + 'z')
    # sem espaço antes de número negativo (sintaxe válida de path): ~10% menor
    return ''.join(partes).replace(' -', '-')


def svg(sil, tinta, titulo):
    h, w = sil.shape
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w * S:.3f}mm" height="{h * S:.3f}mm" '
            f'viewBox="0 0 {w} {h}" data-dpi="{DPI}" data-contrato="{VERSAO}">'
            f'<title>{titulo}</title>'
            f'<path id="silhueta" fill="#fff" fill-rule="evenodd" d="{_d(contornos(sil))}"/>'
            f'<path id="tinta" fill="#000" fill-rule="evenodd" d="{_d(contornos(tinta))}"/>'
            '</svg>\n')


def vetorizar(frente, verso, titulo):
    """Recortes em cinza a 600 dpi (frente e verso em pé, como pdf_grade os entrega) -> SVGs.

    Retorna {'svg': {frente, verso}, 'previas': {frente, verso}, 'iouFrenteVerso', 'telaMm',
    'tamanhoMm'}. Levanta ValueError se uma face não tiver figura.
    """
    sil = PG.silhueta(frente, DPI)
    alvo = sil[:, ::-1]
    verso_al, iou_fv = GR.registrar_verso(alvo, verso)
    sil_v = PG.silhueta(verso_al, DPI)
    tf = GR.tinta(frente, sil)
    tv = GR.tinta(verso_al, sil_v)
    # tela comum: caixa da frente unida à do verso espelhado, com margem
    uniao = sil | sil_v[:, ::-1]
    ys, xs = np.where(uniao)
    H, W = sil.shape
    y0, y1 = max(0, ys.min() - MARGEM_PX), min(H, ys.max() + 1 + MARGEM_PX)
    x0, x1 = max(0, xs.min() - MARGEM_PX), min(W, xs.max() + 1 + MARGEM_PX)
    cf = (slice(y0, y1), slice(x0, x1))
    cv = (slice(y0, y1), slice(W - x1, W - x0))
    faces = {'frente': (sil[cf], tf[cf]), 'verso': (sil_v[cv], tv[cv])}
    saida, previas = {}, {}
    for lado, (s, t) in faces.items():
        saida[lado] = svg(s, t, f'{titulo} - {lado}')
        img = np.full(s.shape, 200, np.uint8)
        img[s] = 255
        img[t] = 0
        previas[lado] = img
    ys, xs = np.where(sil)
    return {
        'svg': saida, 'previas': previas, 'iouFrenteVerso': round(float(iou_fv), 3),
        'telaMm': [round((x1 - x0) * S, 3), round((y1 - y0) * S, 3)],
        'tamanhoMm': [round((xs.max() - xs.min() + 1) * S, 2), round((ys.max() - ys.min() + 1) * S, 2)],
    }
