"""Desenha, vista de cima, o que o fatiador realmente extrudou (por filamento).

Uso: python -I prototipo/previa_gcode.py plate_1.gcode --saida previa.png [--z-min 1.2]
       [--recorte X0 Y0 X1 Y1] [--px-mm 20]

Serve para ver, sem abrir a interface, se o desenho preto sobrevive ao fatiamento: cada
movimento G1/G2/G3 com extrusão vira um traço com a largura anotada no G-code
(; LINE_WIDTH), na cor do filamento ativo (T0 branco, T1 preto). Camadas em ordem, então
o que fica por cima é o que se vê. Fundo cinza = sem material nas camadas desenhadas.
"""
import argparse
import math
import re
from pathlib import Path

import cv2
import numpy as np

NUM = r'(-?\d*\.?\d+)'
CORES = {0: (235, 235, 235), 1: (20, 20, 20)}
AREA_FILAMENTO = math.pi * (1.75 / 2) ** 2


SUB = 16   # subpixel (cv2 shift=4)


def tracar(img, p, q, larg_px, cor):
    """Cordão com a largura exata (retângulo + pontas redondas). cv2.line com espessura t
    desenha ~t+2 px e escurecia a prévia (medido em 18/11). O preenchimento do OpenCV inclui
    os pixels da borda (~0,5 px a mais de cada lado), descontados no raio."""
    (x0, y0), (x1, y1) = p, q
    r = max(0.5, larg_px / 2 - 0.5)
    dx, dy = x1 - x0, y1 - y0
    n = math.hypot(dx, dy)
    if n > 1e-9:
        ox, oy = -dy / n * r, dx / n * r
        pts = np.array([[x0 + ox, y0 + oy], [x1 + ox, y1 + oy], [x1 - ox, y1 - oy], [x0 - ox, y0 - oy]])
        cv2.fillConvexPoly(img, np.round(pts * SUB).astype(np.int32), cor, cv2.LINE_8, 4)
    for cx, cy in (p, q):
        cv2.circle(img, (int(round(cx * SUB)), int(round(cy * SUB))), max(1, int(round(r * SUB))), cor, -1, cv2.LINE_8, 4)


def ler(caminho):
    for linha in Path(caminho).read_text(encoding='utf-8', errors='replace').splitlines():
        yield linha


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('gcode', type=Path)
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--z-min', type=float, default=0.0, help='só camadas com Z acima disto (mm)')
    ap.add_argument('--z-max', type=float, default=1e9)
    ap.add_argument('--recorte', type=float, nargs=4, metavar=('X0', 'Y0', 'X1', 'Y1'))
    ap.add_argument('--px-mm', type=float, default=20)
    ap.add_argument('--cortar', action='store_true', help='corta a imagem no que foi impresso (ignora a torre)')
    a = ap.parse_args()

    x0, y0, x1, y1 = a.recorte or (0, 0, 256, 256)
    k = a.px_mm
    img = np.full((int((y1 - y0) * k), int((x1 - x0) * k), 3), 110, np.uint8)

    def px(x, y):
        return ((x - x0) * k, (y1 - y) * k)

    # o G-code da A1 começa com o filamento inicial carregado sem "T<n>" explícito; com dois
    # filamentos, o inicial é o outro em relação à primeira troca (sem troca, filamento 1)
    primeira = next((int(m[1]) for m in (re.match(r'^T(\d+)\b', l) for l in ler(a.gcode))
                     if m and int(m[1]) < 255), 1)
    x = y = z = 0.0
    camada, z_ant = 0.2, 0.0
    largura, ferramenta, relativo, dentro = 0.4, 1 - primeira if primeira in (0, 1) else 0, True, False
    for linha in ler(a.gcode):
        if linha.startswith('; Z_HEIGHT:'):
            z = float(linha.split(':')[1])
            camada, z_ant = (z - z_ant if z > z_ant else camada), z
            dentro = a.z_min < z <= a.z_max
            continue
        if linha.startswith('; LINE_WIDTH:'):
            largura = float(linha.split(':')[1])
            continue
        m = re.match(r'^T(\d+)\b', linha)
        if m and int(m[1]) < 255:
            ferramenta = int(m[1])
            continue
        if linha.startswith('M83'):
            relativo = True
        elif linha.startswith('M82'):
            relativo = False
        cmd = linha.split(';', 1)[0].strip()
        if not cmd or cmd[:2] not in ('G0', 'G1', 'G2', 'G3'):
            continue
        g = cmd.split()[0]
        val = {c: float(v) for c, v in re.findall(r'([XYZEIJ])' + NUM, cmd)}
        nx, ny = val.get('X', x), val.get('Y', y)
        # "G1 E.." sem X/Y é desretração (repõe a pressão no bico), não deposita uma gota:
        # desenhá-la como ponto deixava as linhas pontilhadas na prévia (corrigido em 18/11)
        extrude = (val.get('E', 0) > 0 if relativo else False) and ('X' in val or 'Y' in val)
        if dentro and extrude:
            cor = CORES.get(ferramenta, (0, 0, 200))
            esp = largura * k
            if g in ('G2', 'G3') and ('I' in val or 'J' in val):
                cx, cy = x + val.get('I', 0), y + val.get('J', 0)
                a0 = math.atan2(y - cy, x - cx)
                a1 = math.atan2(ny - cy, nx - cx)
                r = math.hypot(x - cx, y - cy)
                if g == 'G2' and a1 >= a0:
                    a1 -= 2 * math.pi
                if g == 'G3' and a1 <= a0:
                    a1 += 2 * math.pi
                # arco curtíssimo: o arredondamento das coordenadas pode inverter o sentido e
                # virar volta inteira (desenhava "bolinhas" nas linhas; 18/11). Decide pelo
                # comprimento que o filamento extrudado cobre.
                h = max(0.04, camada)
                secao_cordao = (largura - h) * h + math.pi * h * h / 4
                comp_e = val.get('E', 0) * AREA_FILAMENTO / max(1e-6, secao_cordao)
                alt = a1 + 2 * math.pi if a1 < a0 else a1 - 2 * math.pi
                if abs(abs(alt - a0) * r - comp_e) < abs(abs(a1 - a0) * r - comp_e):
                    a1 = alt
                passos = max(2, int(abs(a1 - a0) * r * k / 2))
                pts = [px(cx + r * math.cos(a0 + (a1 - a0) * i / passos), cy + r * math.sin(a0 + (a1 - a0) * i / passos))
                       for i in range(passos + 1)]
                for p, q in zip(pts, pts[1:]):
                    tracar(img, p, q, esp, cor)
            else:
                tracar(img, px(x, y), px(nx, ny), esp, cor)
        x, y = nx, ny
        z = val.get('Z', z)
    if a.cortar:
        # corta no que foi extrudado, fora da área reservada à torre de purga (canto x<62, y>205)
        usado = np.any(img != 110, axis=2)
        tx, ty = (int(v) for v in px(62, 205))
        usado[:max(0, ty), :max(0, tx)] = False
        ys, xs = np.where(usado)
        if len(ys):
            m = int(2 * k)
            img = img[max(0, ys.min() - m):ys.max() + m, max(0, xs.min() - m):xs.max() + m]
    a.saida.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(a.saida), img)
    print(a.saida)


if __name__ == '__main__':
    main()
