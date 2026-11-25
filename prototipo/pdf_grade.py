"""Extrai linhas (rótulo, frente, verso) de PDFs de miniaturas de papel da OPR.

Protótipo do recorte que a skill importar-artes-pdf (docs/PRD-04) vai usar.
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

DPI = 300           # detecção da grade
DPI_ARTE = 600      # resolução nativa da arte (JPEG 4960x7016 na página A4); traços de ~0,1 mm
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
SIL_ABERTURA_PX = 7               # a 600 dpi: tira as lascas do contorno da silhueta de 300 (D055)
SIL_EXTRA_MIN_MM2 = 2.0           # região mínima que a silhueta de 300 dpi acrescenta (D055)
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


def extrair_pagina(doc, pagina, dpi=DPI):
    """Recorta as linhas da página (ver localizar_faixas). A grade é sempre detectada a DPI;
    com dpi maior, as células saem de uma renderização em dpi, nas mesmas coordenadas escaladas."""
    cinza, faixas, descartadas, girada = localizar_faixas(render_cinza(doc, pagina))
    f = dpi / DPI
    alta = cinza
    if dpi != DPI:
        alta = render_cinza(doc, pagina, dpi=dpi)
        if girada:
            alta = cv2.rotate(alta, cv2.ROTATE_90_CLOCKWISE)
    ins = int(round(INSET_PX * f))
    e = lambda v: int(round(v * f))
    linhas = []
    for i, (y0, y1, v) in enumerate(faixas):
        ya, yb = e(y0) + ins, e(y1) - ins
        cel = lambda a, b: alta[ya:yb, e(v[a][1] + 1) + ins:e(v[b][0]) - ins]
        ve = [(e(a), e(b)) for a, b in v]
        linhas.append(Linha(
            pagina=pagina, indice=i,
            rotulo=recortar_rotulo(alta, e(y0), e(y1), ve, girada, ins, int(LABEL_MM * dpi / 25.4)),
            frente=cv2.rotate(cel(1, 2), cv2.ROTATE_90_COUNTERCLOCKWISE),
            verso=cv2.rotate(cel(2, 3), cv2.ROTATE_90_CLOCKWISE),
            faixa_mm=(round(y0 * MM_PER_PX, 1), round(y1 * MM_PER_PX, 1)),
            girada=girada,
        ))
    return linhas, descartadas


def silhueta(cinza, dpi=DPI):
    """Silhueta preenchida: traço escuro fechado, buracos preenchidos, ilhas mínimas removidas.
    Limiar SIL_LIMIAR (200), o mesmo da skill (grade.silhueta): traço de fora cinza claro.

    Acima de DPI (a arte a 600 dpi), a silhueta ganha as regiões grandes que a mesma célula
    reduzida a DPI preenche e a de 600 deixa de fora (D055). O traço cinza-claro que fecha partes
    da figura junto à borda de baixo da célula (as voltas da cauda do Snakeman, as patas dos
    cães, a nuvem do Jetpack Warrior) fica com falhas a 600 dpi e o miolo virava fundo; reduzida,
    a célula fecha esse traço como na importação (grade.silhueta, máscara de 300 dpi). O contorno
    continua o de 600 dpi; uma abertura tira as lascas do contorno, mais grosso a 300 dpi."""
    s = _silhueta(cinza, dpi)
    f = dpi // DPI
    if f < 2:
        return s
    h, w = cinza.shape
    try:
        s3 = _silhueta(cv2.resize(cinza, (w // f, h // f), interpolation=cv2.INTER_AREA), DPI)
    except ValueError:
        return s
    s3 = cv2.resize(s3.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST) > 0
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (SIL_ABERTURA_PX, SIL_ABERTURA_PX))
    extra = cv2.morphologyEx((s3 & ~s).astype(np.uint8), cv2.MORPH_OPEN, k) > 0
    rot, n = ndi.label(extra)
    if n == 0:
        return s
    px_mm2 = (25.4 / dpi) ** 2
    areas = ndi.sum(extra, rot, range(1, n + 1)) * px_mm2
    # só o que encosta na silhueta (miolo e reentrâncias): ilha solta viraria peça flutuando
    borda = cv2.dilate(s.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    encosta = ndi.sum(borda, rot, range(1, n + 1)) > 0
    manter = [i + 1 for i in range(n) if areas[i] >= SIL_EXTRA_MIN_MM2 and encosta[i]]
    if not manter:
        return s
    # a abertura deixa frestas de 1-3 px entre a silhueta e o acréscimo: viravam furinhos com
    # lateral preta na peça; fechadas, ficam como o resto da silhueta (buracos preenchidos)
    return ndi.binary_fill_holes(s | np.isin(rot, manter))


def _silhueta(cinza, dpi):
    escuro = cinza < SIL_LIMIAR
    n = int(round(5 * dpi / DPI))     # fechamento de ~0,42 mm em qualquer resolução
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
    fechado = cv2.morphologyEx(escuro.astype(np.uint8), cv2.MORPH_CLOSE, k) > 0
    cheio = ndi.binary_fill_holes(fechado)
    rot, n = ndi.label(cheio)
    if n == 0:
        raise ValueError('célula sem figura')
    areas = ndi.sum(cheio, rot, range(1, n + 1))
    manter = [i + 1 for i, a in enumerate(areas) if a >= 0.02 * areas.max()]
    return np.isin(rot, manter)


def tem_texto(rotulo):
    """Indica se a célula do rótulo tem tinta (as páginas de borda grossa vêm vazias)."""
    return int((rotulo < DARK).sum()) > 30
