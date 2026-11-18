"""Vetorização das artes (D020): recorte a 300 dpi -> polígonos em mm -> SVG.

O PDF HDF é raster (300 dpi, sem vetores); os vetores são traçados aqui, com o mesmo
método do gerador (contorno do pixel, approxPolyDP 0,5 px, deslocamento de meio pixel).

Contrato dos SVGs de uma arte num estilo (frente.svg e verso.svg):
- unidades em mm; viewBox "0 0 L A" com largura L e altura A iguais nas duas faces;
- y para baixo, como na imagem; a figura em pé, no sentido do PDF;
- espelhar o verso em x (x -> L - x) o sobrepõe à frente (alinhamento já aplicado);
- path#silhueta (branco) e path#tinta (preto, só dentro da silhueta da própria face);
- paths só com M, L implícito e Z; fill-rule evenodd.
O verso não é recortado pela frente: a política de contorno (capas) fica para o gerador.
"""
from __future__ import annotations

import cv2
import manifold3d as mf
import numpy as np
from scipy import ndimage as ndi
from skimage.draw import polygon as desenhar_poligono

import grade as G

S = G.MM_PER_PX
EPS_PX = 0.5          # simplificação do contorno (0,04 mm), igual ao gerador
FOLGA_PX = 120        # tela extra para o verso que sai da silhueta da frente (capas)
RAIO_ALINHAR = 8
MARGEM_PX = 2


def limpar(m, min_px=4):
    rot, n = ndi.label(m)
    if n == 0:
        return m
    areas = ndi.sum(m, rot, range(1, n + 1))
    return np.isin(rot, [i + 1 for i, a in enumerate(areas) if a >= min_px])


def deslocar(img, dy, dx, shape, fundo):
    out = np.full(shape, fundo, img.dtype)
    h, w = img.shape
    ys, yd = max(0, -dy), max(0, dy)
    xs, xd = max(0, -dx), max(0, dx)
    hh = min(h - ys, shape[0] - yd)
    ww = min(w - xs, shape[1] - xd)
    if hh > 0 and ww > 0:
        out[yd:yd + hh, xd:xd + ww] = img[ys:ys + hh, xs:xs + ww]
    return out


def poligonos(mask):
    """Máscara -> polígonos em pixels contínuos (pixel c ocupa [c, c+1]); y para baixo."""
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    polys = []
    for c in cnts:
        c = cv2.approxPolyDP(c, EPS_PX, True)
        if len(c) >= 3:
            polys.append(c[:, 0, :].astype(float) + 0.5)
    if not polys:
        return []
    cs = mf.CrossSection(polys, mf.FillRule.EvenOdd).offset(0.5, mf.JoinType.Miter, 2.0)
    return [np.asarray(p, float) for p in cs.to_polygons() if len(p) >= 3]


def rasterizar(polys, shape):
    """Polígonos em pixels contínuos -> máscara (par-ímpar, centro do pixel)."""
    m = np.zeros(shape, bool)
    for p in polys:
        rr, cc = desenhar_poligono(p[:, 1] - 0.5, p[:, 0] - 0.5, shape)
        t = np.zeros(shape, bool)
        t[rr, cc] = True
        m ^= t
    return m


def iou(a, b):
    u = (a | b).sum()
    return float((a & b).sum() / u) if u else 1.0


def fora_da_borda(vetor_px, original):
    """Pixels diferentes que não estão na faixa de 1 px da borda do original (esperado: 0).

    Traços finos têm IoU baixo mesmo com erro só na borda (0,04 mm); esta conta separa
    deslocamento de borda de perda real de desenho.
    """
    faixa = ndi.binary_dilation(original) & ~ndi.binary_erosion(original)
    return int(((vetor_px ^ original) & ~faixa).sum())


def _d(polys):
    partes = []
    for p in polys:
        q = p * S
        pts = ' '.join(f'{x:.2f} {y:.2f}' for x, y in q)
        partes.append(f'M{pts}Z')
    return ''.join(partes)


def svg(sil, tinta, shape, titulo):
    h, w = shape
    L, A = round(w * S, 2), round(h * S, 2)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{L}mm" height="{A}mm" viewBox="0 0 {L} {A}">'
            f'<title>{titulo}</title>'
            f'<path id="silhueta" fill="#fff" fill-rule="evenodd" d="{_d(sil)}"/>'
            f'<path id="tinta" fill="#000" fill-rule="evenodd" d="{_d(tinta)}"/>'
            '</svg>\n')


def alinhar_verso(alvo, verso_sil):
    """Desloca a silhueta do verso para a tela de `alvo` (frente espelhada), maximizando IoU."""
    ay, ax = np.where(alvo)
    vy, vx = np.where(verso_sil)
    dy0 = int(ay.max() - vy.max())
    dx0 = int(round((ax.min() + ax.max()) / 2 - (vx.min() + vx.max()) / 2))
    melhor = (-1.0, dy0, dx0)
    for dy in range(dy0 - RAIO_ALINHAR, dy0 + RAIO_ALINHAR + 1):
        for dx in range(dx0 - RAIO_ALINHAR, dx0 + RAIO_ALINHAR + 1):
            v = iou(deslocar(verso_sil, dy, dx, alvo.shape, False), alvo)
            if v > melhor[0]:
                melhor = (v, dy, dx)
    return melhor


def vetorizar(frente, verso, titulo):
    """Recortes em cinza (frente e verso, no sentido do PDF) -> SVGs, prévias e medidas."""
    F = np.pad(frente, FOLGA_PX, constant_values=255)
    sf = G.silhueta(F)
    sv0 = G.silhueta(verso)
    alvo = sf[:, ::-1]
    iou_fv, dy, dx = alinhar_verso(alvo, sv0)
    V = deslocar(verso, dy, dx, F.shape, 255)
    sv = deslocar(sv0, dy, dx, F.shape, False)
    tf = limpar((F < G.DARK) & sf)
    tv = limpar((V < G.DARK) & sv)

    uniao = sf | sv[:, ::-1]
    ys, xs = np.where(uniao)
    W = F.shape[1]
    y0, y1 = max(0, ys.min() - MARGEM_PX), min(F.shape[0] - 1, ys.max() + MARGEM_PX)
    x0, x1 = max(0, xs.min() - MARGEM_PX), min(W - 1, xs.max() + MARGEM_PX)
    if min(y0, x0) == 0 or y1 == F.shape[0] - 1 or x1 == W - 1:
        raise ValueError(f'{titulo}: verso fora da tela de alinhamento; aumente FOLGA_PX')
    cf = (slice(y0, y1 + 1), slice(x0, x1 + 1))
    cv = (slice(y0, y1 + 1), slice(W - 1 - x1, W - x0))
    faces = {'frente': (sf[cf], tf[cf]), 'verso': (sv[cv], tv[cv])}
    assert np.array_equal(faces['verso'][0][:, ::-1], sv[:, ::-1][cf])

    saida, medidas, previas = {}, {}, {}
    for lado, (sil, tinta) in faces.items():
        ps, pt = poligonos(sil), poligonos(tinta)
        rs, rt = rasterizar(ps, sil.shape), rasterizar(pt, sil.shape)
        saida[lado] = svg(ps, pt, sil.shape, f'{titulo} - {lado}')
        medidas[lado] = {'iouSilhueta': round(iou(rs, sil), 4), 'iouTinta': round(iou(rt, tinta), 4),
                         'pxForaDaBorda': fora_da_borda(rs, sil) + fora_da_borda(rt, tinta),
                         'vertices': int(sum(len(p) for p in ps + pt)), 'bytes': len(saida[lado].encode())}
        img = np.full(sil.shape, 200, np.uint8)
        img[rs] = 255
        img[rt] = 0
        previas[lado] = img
    h, w = faces['frente'][0].shape
    return {
        'svg': saida, 'previas': previas, 'medidas': medidas,
        'iouFrenteVerso': round(iou_fv, 3),
        'telaMm': [round(w * S, 2), round(h * S, 2)],
    }
