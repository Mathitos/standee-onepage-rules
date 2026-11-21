"""Junta as páginas P&B dos PDFs em "Sets" de uma facção num PDF só, antes da extração (D038).

Uso: python -I juntar_sets.py --saida "Faccao_-_BW.pdf" SET1.pdf SET2.pdf ...

Nos sets da OPR (Daemons, High Elf Fleets, Robot Legions, Saurian Starhost) as páginas P&B
ficam no meio: capa, coloridas, P&B de borda branca, coloridas de borda preta, P&B de borda
preta, instruções. Página P&B = nenhum pixel colorido num render de 12 dpi (saturação > 50).
Entram os dois trechos de 3 ou mais páginas P&B seguidas de cada set (sem a última página, de
instruções); a saída tem as de borda branca de todos os sets e depois as de borda preta, como
os PDFs "- BW" avulsos. Terreno (um trecho só): use --terreno. Não sobrescreve a saída.
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
import pymupdf


def paginas_pb(doc):
    out = []
    for i, p in enumerate(doc):
        pix = p.get_pixmap(dpi=12)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]
        hsv = cv2.cvtColor(np.ascontiguousarray(img), cv2.COLOR_RGB2HSV)
        if ((hsv[:, :, 1] > 50) & (hsv[:, :, 2] > 40)).mean() < 0.002:
            out.append(i)
    return out


def corridas(idx):
    runs = []
    for i in idx:
        if runs and i == runs[-1][-1] + 1:
            runs[-1].append(i)
        else:
            runs.append([i])
    return runs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sets', type=Path, nargs='+', help='PDFs dos sets, na ordem (Set 1, Set 2, ...)')
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--terreno', action='store_true', help='um trecho P&B por PDF, em vez de dois')
    a = ap.parse_args()
    if a.saida.exists():
        sys.exit(f'já existe: {a.saida}')
    brancas, pretas, origem = [], [], []
    for arq in a.sets:
        doc = pymupdf.open(arq)
        idx = [i for i in paginas_pb(doc) if i != doc.page_count - 1]
        runs = [r for r in corridas(idx) if len(r) >= 3]
        esperado = 1 if a.terreno else 2
        if len(runs) != esperado:
            sys.exit(f'{arq.name}: {len(runs)} trechos P&B, esperado {esperado}: {[(r[0] + 1, r[-1] + 1) for r in runs]}')
        brancas.append((arq, runs[0]))
        if not a.terreno:
            pretas.append((arq, runs[1]))
        origem.append({'arquivo': arq.name, 'paginas': [f'{r[0] + 1}-{r[-1] + 1}' for r in runs]})
    saida = pymupdf.open()
    for arq, r in brancas + pretas:
        saida.insert_pdf(pymupdf.open(arq), from_page=r[0], to_page=r[-1])
    tmp = a.saida.with_suffix('.tmp')
    saida.save(tmp, garbage=3, deflate=True)
    tmp.replace(a.saida)
    print(json.dumps({'saida': str(a.saida), 'paginas': saida.page_count, 'origem': origem}, ensure_ascii=False))


if __name__ == '__main__':
    main()
