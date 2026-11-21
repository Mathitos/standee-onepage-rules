"""Extrai linhas (rótulo, frente, verso) de PDFs de miniaturas de papel da OPR.

Módulo da skill importar-artes-pdf (docs/PRD-04); derivado de prototipo/pdf_grade.py.
Regras de layout observadas no PDF Human Defense Force (17/11/2026):
- cada linha é uma faixa com 4 células: aba (20 mm) | frente | verso | aba (20 mm);
  nos outros PDFs (21/11/2026) as abas vão de 14,8 a 24,8 mm, há figuras de página
  inteira com a faixa na vertical e tabelas estreitas (ver localizar_faixas);
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
ABA_MIN_MM, ABA_MAX_MM = 12, 30   # abas observadas: 14,8 (Wood Elves) a 24,8 mm (Daemons of Lust)
LINHA_CURTA_MM = 50               # 2ª tentativa, para tabelas estreitas
SIL_LIMIAR = 200                  # traço que fecha a silhueta (ver silhueta)
LIMIAR_DIF_LOCAL = 0.05           # cópias: diferença local de cinza (ver diferenca_local)
CELULA_MIN_MM = 10                # frente e verso; as capas davam "faixas" de 0,2 a 3,7 mm
ABA_TINTA_MAX = 0.2               # aba é papel em branco: até 0,07 nas faixas reais, 0,63+ nas capas


@dataclass
class Linha:
    pagina: int
    indice: int
    rotulo: np.ndarray   # cinza, na horizontal para leitura
    frente: np.ndarray   # cinza, em pé
    verso: np.ndarray    # cinza, em pé (vista de trás)
    faixa_mm: tuple      # (y0, y1) na página (na página girada, se girada)
    girada: bool = False  # faixa vertical (figura grande de página inteira)


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


def _cinco_linhas(v):
    """Das linhas verticais de uma faixa, as 5 do padrão aba | frente | verso | aba, ou None.

    Aceita uma linha a mais (traço na margem: Beastmen p7) e uma a menos: a aba de um lado
    que não fecha (Robot Legions p10) ou a linha entre verso e aba coberta pela arte
    (High Elf Fleets p1, Alien Hives p14). A que falta é reconstruída com a espessura da dobra.
    """
    mm = lambda a, b: (b[0] - a[1]) * MM_PER_PX
    px = lambda x: int(round(x / MM_PER_PX))
    aba_ok = lambda x: ABA_MIN_MM <= x <= ABA_MAX_MM
    for i in range(len(v) - 4):
        w = list(v[i:i + 5])
        ae, fr, ve, ad = (mm(w[k], w[k + 1]) for k in range(4))
        if (aba_ok(ae) and aba_ok(ad) and abs(ae - ad) <= EDGE_TOL_MM and abs(fr - ve) <= FOLD_TOL_MM
                and fr >= CELULA_MIN_MM):
            return w
    for i in range(len(v) - 3):
        w = list(v[i:i + 4])
        c0, c1, c2 = (mm(w[k], w[k + 1]) for k in range(3))
        if c1 < CELULA_MIN_MM:
            continue
        esp = w[2][1] - w[2][0] + 1
        esp_mm = esp * MM_PER_PX
        if aba_ok(c0) and abs(c1 - c2) <= FOLD_TOL_MM:                    # falta a aba direita
            x = w[3][1] + 1 + px(c0)
            return w + [(x, x + esp - 1)]
        if aba_ok(c2) and abs(c0 - c1) <= FOLD_TOL_MM:                    # falta a aba esquerda
            x = w[0][0] - 1 - px(c2)
            return [(x - esp + 1, x)] + w
        if aba_ok(c0) and abs(c2 - c1 - esp_mm - c0) <= EDGE_TOL_MM:      # falta a linha verso | aba
            x = w[2][1] + 1 + px(c1)
            return w[:3] + [(x, x + esp - 1), w[3]]
        if aba_ok(c2) and abs(c0 - c1 - esp_mm - c2) <= EDGE_TOL_MM:      # falta a linha aba | frente
            x = w[1][0] - 1 - px(c1)
            return [w[0], (x - esp + 1, x)] + w[1:]
    return None


def _tinta(faixa, x0, x1):
    """Fração escura da faixa entre x0 e x1 (só a parte dentro da página)."""
    x0, x1 = max(0, x0), min(faixa.shape[1], x1)
    return float(faixa[:, x0:x1].mean()) if x1 > x0 else 0.0


def detectar_linhas(cinza, linha_min_mm=LINE_MIN_MM):
    """Retorna faixas válidas [(y0, y1, [(x0,x1) x5])] e o número de faixas descartadas."""
    escuro = (cinza < DARK).astype(np.uint8)
    lmin = int(linha_min_mm / MM_PER_PX)
    horiz = cv2.morphologyEx(escuro, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (lmin, 1)))
    linhas_h = _runs(np.where(horiz.sum(1) >= lmin)[0])
    validas, descartadas = [], 0
    for (_, fim0), (ini1, _) in zip(linhas_h, linhas_h[1:]):
        y0, y1 = fim0 + 1, ini1 - 1
        if (y1 - y0) * MM_PER_PX < 15:
            continue
        cinco = _cinco_linhas(_runs(np.where(escuro[y0:y1].mean(0) > 0.9)[0]))
        if cinco is None or max(_tinta(escuro[y0:y1], cinco[0][1] + 1, cinco[1][0]),
                                _tinta(escuro[y0:y1], cinco[3][1] + 1, cinco[4][0])) > ABA_TINTA_MAX:
            descartadas += 1
            continue
        validas.append((y0, y1, cinco))
    return validas, descartadas


def localizar_faixas(cinza):
    """Grade da página: (cinza usada, faixas, descartadas, girada).

    Tenta a página como está e girada 90° no sentido horário, primeiro com linhas de tabela
    de 80 mm e depois de 50 mm; fica com a primeira tentativa que acha faixas.
    - Girada: figuras grandes de página inteira têm a faixa na vertical (aba em cima, verso
      de cabeça para baixo, frente em pé, aba embaixo).
    - 50 mm: tabelas estreitas dos enxames (Mummified Undead p26, Ratmen p22). Só entra se
      a página não tem faixa com 80 mm, para não cortar figuras de borda grossa.
    Mesma regra em prototipo/pdf_grade.py, para os índices de linha baterem.
    """
    primeira = None
    for linha_min in (LINE_MIN_MM, LINHA_CURTA_MM):
        for girada in (False, True):
            c = cv2.rotate(cinza, cv2.ROTATE_90_CLOCKWISE) if girada else cinza
            faixas, descartadas = detectar_linhas(c, linha_min)
            if faixas:
                if linha_min == LINE_MIN_MM:
                    # tabelas estreitas na mesma página de tabelas largas (Ratmen p24: 3 "Giant Rat
                    # V1" de 70 mm sobre 2 "V2" de 85 mm): entram as faixas de 50 mm que não cruzam
                    # nenhuma das de 80 mm
                    curtas, _ = detectar_linhas(c, LINHA_CURTA_MM)
                    novas = [f for f in curtas if all(f[1] < y0 or f[0] > y1 for y0, y1, _ in faixas)]
                    faixas = sorted(faixas + novas, key=lambda f: f[0])
                return c, faixas, descartadas, girada
            primeira = primeira or (cinza, [], descartadas, False)
    return primeira


def recortar_rotulo(cinza, y0, y1, v, girada, inset=INSET_PX, rotulo_px=int(LABEL_MM / MM_PER_PX)):
    """Rótulo na horizontal. Fica à esquerda da faixa. Na figura grande (página girada), pode
    estar embaixo da faixa (aqui, à esquerda) ou à esquerda dela (aqui, em cima). Na faixa larga
    encostada na margem, fica embaixo do canto esquerdo da faixa (Mummified Undead p3, Eternal
    Dynasty p3, Wood Elves p20) ou em cima dele (Human Empire p4): 26 artes sem rótulo até 21/11."""
    tem_tinta = lambda m: m.size > 0 and int((m < DARK).sum()) > 30
    x_rot = max(0, v[0][0] - rotulo_px)
    esquerda = cv2.rotate(cinza[y0 + inset:y1 - inset, x_rot:max(x_rot, v[0][0] - inset)],
                          cv2.ROTATE_90_COUNTERCLOCKWISE)
    if tem_tinta(esquerda):
        return esquerda
    if girada:
        y_rot = max(0, y0 - rotulo_px)
        return cv2.rotate(cinza[y_rot:max(y_rot, y0 - inset), max(0, v[0][0]):v[4][1] + 1], cv2.ROTATE_180)
    alt = int(rotulo_px * 1.8)              # o texto girado desce até ~45 mm
    lado = int(rotulo_px / 3)               # ~8 mm para cada lado da borda esquerda
    escala = rotulo_px / int(LABEL_MM / MM_PER_PX)
    vao = int(round(1.5 / MM_PER_PX * escala))   # pula a linha de baixo da faixa
    for y_a, y_b in ((y1 + vao, y1 + alt), (max(0, y0 - alt), max(0, y0 - vao))):   # embaixo; em cima (Human Empire p4)
        canto = cinza[y_a:y_b, max(0, v[0][0] - lado):max(0, v[0][0] + lado)]
        if tem_tinta(canto):
            return cv2.rotate(canto, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return esquerda


def extrair_pagina(doc, pagina):
    """Recorta as faixas da página (ver localizar_faixas)."""
    cinza, faixas, descartadas, girada = localizar_faixas(render_cinza(doc, pagina))
    linhas = []
    for i, (y0, y1, v) in enumerate(faixas):
        ya, yb = y0 + INSET_PX, y1 - INSET_PX
        cel = lambda a, b: cinza[ya:yb, v[a][1] + 1 + INSET_PX:v[b][0] - INSET_PX]
        linhas.append(Linha(
            pagina=pagina, indice=i,
            rotulo=recortar_rotulo(cinza, y0, y1, v, girada),
            frente=cv2.rotate(cel(1, 2), cv2.ROTATE_90_COUNTERCLOCKWISE),
            verso=cv2.rotate(cel(2, 3), cv2.ROTATE_90_CLOCKWISE),
            faixa_mm=(round(y0 * MM_PER_PX, 1), round(y1 * MM_PER_PX, 1)),
            girada=girada,
        ))
    return linhas, descartadas


def silhueta(cinza):
    """Silhueta preenchida: traço escuro fechado, buracos preenchidos, ilhas mínimas removidas.

    Limiar SIL_LIMIAR (200), como a tinta do gerador (D024): no contorno fino do Eternal Dynasty
    (p5-8) e do Daemons of Lust o traço de fora é cinza claro e, com 128, abria e a silhueta
    vazava (frente x verso de 0,05-0,17; com 200, 0,97).
    """
    escuro = cinza < SIL_LIMIAR
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fechado = cv2.morphologyEx(escuro.astype(np.uint8), cv2.MORPH_CLOSE, k) > 0
    cheio = ndi.binary_fill_holes(fechado)
    rot, n = ndi.label(cheio)
    if n == 0:
        raise ValueError('célula sem figura')
    areas = ndi.sum(cheio, rot, range(1, n + 1))
    manter = [i + 1 for i, a in enumerate(areas) if a >= 0.02 * areas.max()]
    return np.isin(rot, manter)


def _alinhar_tinta(A, B, raio=2):
    """Menor diferença entre duas máscaras de tinta, com tolerância de 1 px e busca de ±raio px."""
    H, W = max(A.shape[0], B.shape[0]) + 2 * raio, max(A.shape[1], B.shape[1]) + 2 * raio

    def pad(m, dy, dx):
        o = np.zeros((H, W), bool)
        o[raio + dy:raio + dy + m.shape[0], raio + dx:raio + dx + m.shape[1]] = m
        return o
    k = np.ones((3, 3), np.uint8)
    PA = pad(A, 0, 0)
    DA = cv2.dilate(PA.astype(np.uint8), k) > 0
    melhor = None
    for dy in range(-raio, raio + 1):
        for dx in range(-raio, raio + 1):
            PB = pad(B, dy, dx)
            dif = (PA & ~(cv2.dilate(PB.astype(np.uint8), k) > 0)) | (PB & ~DA)
            n = int(dif.sum())
            if melhor is None or n < melhor[0]:
                melhor = (n, dif, PA.sum() + PB.sum())
    return melhor


def _diferenca_local(a, ma, b, mb, sigma_px=1.0, limiar=60):
    """Maior fração de diferença forte de cinza numa janela de 2 mm, num sentido (b alinhado a a).

    Recortes na caixa da silhueta, alinhados em ±2 px, desfocados (sigma 1 px) e comparados em
    cinza; conta o que difere mais que `limiar`, só dentro da silhueta de a e fora do preto
    sólido (com 3 px de folga), depois de abrir a máscara com 2x2. Cada etapa tira um ruído que
    separava cópias idênticas: hachuras de 1 px (HDF p10), furos no preenchimento da borda grossa
    (High Elf Fleets p58-70), linhas finas antisserrilhadas (HEF p4, p40). As variantes do mesmo
    tamanho e rótulo (cabeças do Eternal Dynasty) ficam em 0,104-0,58. Calibração de 21/11.
    """
    A = recorte_bbox(a, ma).astype(np.float32)
    B = recorte_bbox(b, mb).astype(np.float32)
    SA = recorte_bbox(ma, ma).astype(np.uint8)
    r = 2
    H, W = max(A.shape[0], B.shape[0]) + 2 * r, max(A.shape[1], B.shape[1]) + 2 * r

    def pad(m, dy, dx, fundo=255):
        o = np.full((H, W), fundo, np.float32)
        o[r + dy:r + dy + m.shape[0], r + dx:r + dx + m.shape[1]] = m
        return o
    PA0 = pad(A, 0, 0)
    PA = cv2.GaussianBlur(PA0, (0, 0), sigma_px)
    dentro = pad(SA, 0, 0, 0) > 0
    melhor = None
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            PB0 = pad(B, dy, dx)
            d = np.abs(PA - cv2.GaussianBlur(PB0, (0, 0), sigma_px))
            soma = float(d.sum())
            if melhor is None or soma < melhor[0]:
                melhor = (soma, d, PB0)
    m = (melhor[1] > limiar) & dentro
    preto = cv2.morphologyEx(((PA0 < DARK) | (melhor[2] < DARK)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m &= ~(cv2.dilate(preto, np.ones((7, 7), np.uint8)) > 0)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    w = int(round(2 / MM_PER_PX))
    return float(cv2.blur(m.astype(np.float32), (w, w)).max())


def diferenca_local(a, ma, b, mb):
    """Diferença local nos dois sentidos, a menor. Uma caixa de silhueta 1 px maior numa das
    cópias deixava uma faixa sem par na borda só num sentido (HDF p15); as variantes dão o mesmo
    valor nos dois (Eternal Dynasty)."""
    return min(_diferenca_local(a, ma, b, mb), _diferenca_local(b, mb, a, ma))


def rotulos_iguais(ra, rb, limite=0.01):
    """Rótulos impressos iguais? Idênticos dão 0; um caractere diferente ("Raider V1" x "V2"), 0,04+."""
    def tinta(r):
        ys, xs = np.where(r < 160)
        return (r[ys.min():ys.max() + 1, xs.min():xs.max() + 1] < 160) if len(ys) > 30 else None
    A, B = tinta(ra), tinta(rb)
    if A is None or B is None:
        return A is None and B is None
    if abs(A.shape[0] - B.shape[0]) > 4 or abs(A.shape[1] - B.shape[1]) > 4:
        return False
    n, _, _ = _alinhar_tinta(A, B)
    return n / max(1, int(max(A.sum(), B.sum()))) < limite


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
