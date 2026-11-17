"""Extrai linhas (rótulo, frente, verso) de PDFs de miniaturas de papel da OPR.

Módulo da skill importar-artes-pdf (docs/PRD-04); derivado de prototipo/pdf_grade.py.
Regras de layout observadas no PDF Human Defense Force (17/11/2026):
- cada linha é uma faixa com 4 células: aba (20 mm) | frente | verso | aba (20 mm);
- frente e verso têm a mesma largura (a dobra fica entre elas); em geral a dobra
  está no centro da página, mas p20/21/50/51 estão deslocadas ~5 mm;
- o rótulo é texto girado FORA da tabela, à esquerda da primeira aba, nos dois estilos;
- figuras deitadas: na frente o chão fica do lado esquerdo, no verso do lado direito.
Faixas que violam essas regras são descartadas e contadas, nunca forçadas.
"""
from dataclasses import dataclass

import cv2
import numpy as np
import pymupdf
from scipy import ndimage as ndi

DPI = 300
MM_PER_PX = 25.4 / DPI
DARK = 128          # limiar de "preto" em escala de cinza
LINE_MIN_MM = 80    # linha da tabela: mais longa que qualquer traço de figura
EDGE_CELL_MM = 20   # largura esperada das abas
EDGE_TOL_MM = 2.5
FOLD_TOL_MM = 1.5   # diferença máxima entre larguras de frente e verso
LABEL_MM = 25       # área à esquerda da tabela onde fica o rótulo
INSET_PX = 3        # descarta a borda antialiased das linhas da grade


@dataclass
class Linha:
    pagina: int
    indice: int
    rotulo: np.ndarray   # cinza, na horizontal para leitura
    frente: np.ndarray   # cinza, em pé
    verso: np.ndarray    # cinza, em pé (vista de trás)
    faixa_mm: tuple      # (y0, y1) na página


def render_cinza(doc, pagina, dpi=DPI):
    pix = doc[pagina - 1].get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY)
    return np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w).copy()


def _runs(idx):
    """Agrupa índices consecutivos em (início, fim)."""
    if len(idx) == 0:
        return []
    cortes = np.where(np.diff(idx) > 1)[0]
    inicios = np.r_[idx[0], idx[cortes + 1]]
    fins = np.r_[idx[cortes], idx[-1]]
    return list(zip(inicios.tolist(), fins.tolist()))


def detectar_linhas(cinza):
    """Retorna faixas válidas [(y0, y1, [(x0,x1) x5])] e o número de faixas descartadas."""
    escuro = (cinza < DARK).astype(np.uint8)
    h, w = escuro.shape
    lmin = int(LINE_MIN_MM / MM_PER_PX)
    horiz = cv2.morphologyEx(escuro, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (lmin, 1)))
    linhas_h = _runs(np.where(horiz.sum(1) >= lmin)[0])
    validas, descartadas = [], 0
    for (_, fim0), (ini1, _) in zip(linhas_h, linhas_h[1:]):
        y0, y1 = fim0 + 1, ini1 - 1
        if (y1 - y0) * MM_PER_PX < 15:
            continue
        faixa = escuro[y0:y1]
        verticais = _runs(np.where(faixa.mean(0) > 0.9)[0])
        if len(verticais) != 5:
            descartadas += 1
            continue
        aba_esq = (verticais[1][0] - verticais[0][1]) * MM_PER_PX
        aba_dir = (verticais[4][0] - verticais[3][1]) * MM_PER_PX
        frente = (verticais[2][0] - verticais[1][1]) * MM_PER_PX
        verso = (verticais[3][0] - verticais[2][1]) * MM_PER_PX
        if (abs(aba_esq - EDGE_CELL_MM) > EDGE_TOL_MM or abs(aba_dir - EDGE_CELL_MM) > EDGE_TOL_MM
                or abs(frente - verso) > FOLD_TOL_MM):
            descartadas += 1
            continue
        validas.append((y0, y1, verticais))
    return validas, descartadas


def extrair_pagina(doc, pagina):
    cinza = render_cinza(doc, pagina)
    faixas, descartadas = detectar_linhas(cinza)
    linhas = []
    for i, (y0, y1, v) in enumerate(faixas):
        ya, yb = y0 + INSET_PX, y1 - INSET_PX
        cel = lambda a, b: cinza[ya:yb, v[a][1] + 1 + INSET_PX:v[b][0] - INSET_PX]
        x_rot = max(0, v[0][0] - int(LABEL_MM / MM_PER_PX))
        linhas.append(Linha(
            pagina=pagina, indice=i,
            rotulo=cv2.rotate(cinza[ya:yb, x_rot:v[0][0] - INSET_PX], cv2.ROTATE_90_COUNTERCLOCKWISE),
            frente=cv2.rotate(cel(1, 2), cv2.ROTATE_90_COUNTERCLOCKWISE),
            verso=cv2.rotate(cel(2, 3), cv2.ROTATE_90_CLOCKWISE),
            faixa_mm=(round(y0 * MM_PER_PX, 1), round(y1 * MM_PER_PX, 1)),
        ))
    return linhas, descartadas


def silhueta(cinza):
    """Silhueta preenchida: traço escuro fechado, buracos preenchidos, ilhas mínimas removidas."""
    escuro = cinza < DARK
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fechado = cv2.morphologyEx(escuro.astype(np.uint8), cv2.MORPH_CLOSE, k) > 0
    cheio = ndi.binary_fill_holes(fechado)
    rot, n = ndi.label(cheio)
    if n == 0:
        raise ValueError('célula sem figura')
    areas = ndi.sum(cheio, rot, range(1, n + 1))
    manter = [i + 1 for i, a in enumerate(areas) if a >= 0.02 * areas.max()]
    return np.isin(rot, manter)


def tem_texto(rotulo):
    """Indica se a área do rótulo (fora da tabela) tem tinta."""
    return int((rotulo < DARK).sum()) > 30


LIMIAR_BORDA = 0.55


def escuro_na_faixa(cinza, mascara, de_mm=0.7, ate_mm=1.0):
    """Fração escura entre 0,7 e 1,0 mm para dentro do contorno.

    Calibrado no PDF HDF (17/11/2026), mediana por página: contorno fino 0,20–0,31;
    borda grossa 0,80–1,00. Uma faixa mais rasa (0,6 mm) não separa (pneus escuros).
    """
    dt = ndi.distance_transform_edt(mascara) * MM_PER_PX
    faixa = (dt >= de_mm) & (dt <= ate_mm)
    return float((cinza[faixa] < DARK).mean()) if faixa.any() else 0.0


def recorte_bbox(img, mascara):
    ys, xs = np.where(mascara)
    return img[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def assinatura(cinza, mascara, lado=96):
    """Miniatura normalizada da arte (para achar cópias idênticas)."""
    rec = recorte_bbox(cinza, mascara)
    return cv2.resize(rec, (lado, lado), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


def alinhar_iou(a, b, raio=8):
    """Melhor IoU entre duas máscaras, alinhando base e centro e testando deslocamentos pequenos."""
    ay, ax = np.where(a)
    by, bx = np.where(b)
    h = max(a.shape[0], b.shape[0]) + 2 * raio
    w = max(a.shape[1], b.shape[1]) + 2 * raio
    A = np.zeros((h, w), bool)
    A[raio:raio + a.shape[0], raio:raio + a.shape[1]] = a
    dy0 = int(ay.max() - by.max())
    dx0 = int(round((ax.min() + ax.max()) / 2 - (bx.min() + bx.max()) / 2))
    melhor = 0.0
    for dy in range(dy0 - raio, dy0 + raio + 1, 2):
        for dx in range(dx0 - raio, dx0 + raio + 1, 2):
            B = np.zeros((h, w), bool)
            y0, x0 = raio + dy, raio + dx
            ys, xs = slice(max(0, y0), min(h, y0 + b.shape[0])), slice(max(0, x0), min(w, x0 + b.shape[1]))
            B[ys, xs] = b[max(0, -y0):max(0, -y0) + (ys.stop - ys.start), max(0, -x0):max(0, -x0) + (xs.stop - xs.start)]
            melhor = max(melhor, iou(A, B))
    return melhor
