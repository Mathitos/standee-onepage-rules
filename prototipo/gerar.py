"""Protótipo de geração de standees a partir de uma lista resolvida (docs/PRD-03).

Uso (na raiz do projeto):
  python -I prototipo/gerar.py prototipo/lista-piloto.json --modo duas-metades --estilo borda --saida saidas/piloto
      [--bico 0.2] [--traco original|engrossado] [--paredes arachne] [--nome-na-base]

Saídas: 3MF Bambu de figuras (branco/preto) e de bases, STL por peça, prévias PNG,
relatorio.json e LEIA-ME.md. Modos: duas-metades e peca-unica (preto-relevo ou pintado).
Protótipo de referência para o gerador do site; não é o site.
"""
import argparse
import hashlib
import json
import math
import re
import sys
import time
import zipfile
from dataclasses import asdict, dataclass, replace
from pathlib import Path

import cv2
import manifold3d as mf
import numpy as np
import pymupdf
import trimesh
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).parent))
import pdf_grade as G  # noqa: E402
import perfil_bambu as B  # noqa: E402

DPI = G.DPI_ARTE           # lê a arte na resolução nativa do PDF (600 dpi)
S = 25.4 / DPI
TINTA_LIMIAR = 200         # traços de ~0,1 mm ficam cinza na borda; limiar alto não os quebra
TINTA_SUAVE_MM = 0.035     # desfoque leve antes do limiar: tira o serrilhado do JPEG
VERSAO = 'prototipo-0.2'
ACABAMENTOS = {                 # D028; a lista pode pedir um por modelo. Peça única: preto-relevo ou pintado (D032)
    'preto-relevo': 'preto em relevo',      # corpo branco, desenho preto em relevo (padrão)
    'branco-relevo': 'branco em relevo',    # corpo preto, branco em relevo, linhas como sulcos
    'pintado': 'pintado, sem relevo',       # desenho rente na face da mesa (peça única: nas duas faces)
}


@dataclass
class Param:
    corpo: float = 1.2            # espessura do corpo (de cada metade, ou da peça única), sem relevo
    relevo: float = 0.4
    camada_mesa: float = 0.4      # peça única: espessura do desenho P/B na face da mesa (2 camadas de 0,2)
    # acabamento pintado: cor do miolo. preto (D036, pedido do usuário em 21/11): a peça é preta e
    # o branco fica só nas áreas brancas do desenho, com camada_mesa de fundo em cada face
    miolo: str = 'preto'          # preto | branco
    # encaixe na base (D042, pedido do usuário em 22/11): retangular, como nas primeiras versões,
    # uma lingueta central reta numa fenda reta. O cônico (D031) soltava: a peça caía da base
    encaixe_base: str = 'retangular'  # retangular | mola | conico
    lingueta_ret_larg: float = 6.0    # retangular e mola: largura da lingueta (a das primeiras versões)
    folga_larg: float = 0.3           # retangular e mola: folga total da fenda na largura
    # mola (D043; teste pedido pelo usuário em 22/11 e reprovado: "o encaixe reto sem mola ficou
    # melhor"; pesquisa de encaixe em FDM, opção 1): a fenda
    # retangular com uma lâmina atrás, solta na ponta, cujo ressalto empurra a lingueta contra a
    # parede da frente. A figura não muda. Medidas da pesquisa, sem fonte direta
    mola_lamina: float = 0.8          # espessura da lâmina (a pesquisa pede testar também 0,6)
    mola_comprimento: float = 7.0     # da raiz da lâmina ao centro do ressalto (meio da fenda)
    # vão em volta da lâmina. A pesquisa dá 0,5 com bico 0,2; 0,6 porque a ponta da lâmina, além do
    # ressalto, anda ~16% mais que ele: com 0,6 o ressalto recua 0,52 mm antes de a ponta encostar
    mola_alivio: float = 0.6
    mola_raiz_raio: float = 0.4       # arredondamento na raiz da lâmina (0,5 x lâmina)
    mola_ressalto: float = 1.5        # comprimento do ressalto, centrado na fenda
    mola_entrada_graus: float = 30.0  # rampa do ressalto na boca, medida a partir da vertical
    mola_precarga: float = 0.30       # o ressalto fica a (lingueta - pré-carga) da parede oposta
    # conico (D031): duas linguetas cônicas em duas fendas cônicas; empurrada, cada lingueta
    # centra sozinha nas paredes inclinadas, sem depender da folga da impressora
    lingueta_larg: float = 4.0    # largura de cada lingueta junto à barra
    lingueta_entre: float = 12.0  # entre os centros das linguetas; igual em todas as artes (bases trocáveis)
    lingueta_conicidade: float = 0.5  # cada lado estreita 0,5 mm por mm de profundidade (~27°)
    lingueta_folga_barra: float = 0.15  # assentada, a barra fica esta altura acima da base
    lingueta_prof: float = 1.9    # fenda vazada: a lingueta não chega à mesa
    barra_sobra: float = 0.5      # a barra passa das linguetas por este tanto (alarga a de figuras estreitas)
    boca_chanfro: float = 0.3     # conico: chanfro na boca das fendas (face da mesa da base): pé de elefante
    travessa: float = 0.5         # meia altura da travessa sob os pés
    contato_mm: float = 1.0       # faixa considerada apoio dos pés
    # faixa preta na lateral das figuras (D034, pedido do usuário: laterais brancas apareciam).
    # 0,3 mm: o contorno preto da arte tem mediana de 0,30-0,36 mm na borda (Infantry); 0 desliga
    lateral_preta: float = 0.3
    folga_esp: float = 0.25       # folga total da fenda na espessura
    base_altura: float = 2.0      # pedido do usuário (17/11): base de 2 mm com fenda vazada
    bico: float = 0.2             # diâmetro do bico (mm) para o qual o desenho é preparado
    traco: str = 'original'       # original: traço do PDF a 600 dpi (D024); engrossado: + engorda
    engorda: float = 0.05         # modo engrossado: mm de cada lado, aplicado no vetor
    paredes: str = 'arachne'      # gerador de paredes gravado em cada objeto do 3MF (D025); '' = o do perfil
    acabamento: str = 'preto-relevo'  # duas metades: preto-relevo | branco-relevo | pintado (D028)
    sulco_engorda: float = 0.0    # branco-relevo: alarga as linhas (sulcos); no G-code (bico 0,2, Arachne) 0 ficou mais limpo que 0,03-0,08
    nome_na_base: bool = False    # escreve o nome da unidade na borda de cima da base
    # com o nome, o número da unidade na lista vai na borda de trás, do lado oposto (D035, pedido
    # do usuário em 19/11): unidades iguais (2x Veterans) ficam distinguíveis na mesa
    numero_na_base: bool = True
    numero_altura: float = 3.0    # altura dos algarismos (mm), a mesma pedida para o nome
    # bases na placa das figuras (D033). auto: quando as figuras já trocam de cor em quase toda
    # camada: peça única, ou qualquer modo com lateral preta (D034). Metades sem lateral preta têm
    # 1 troca na placa de figuras e juntar dava 13 trocas, +29 min e +3,6 g (CLI, 18/11)
    bases_junto: str = 'auto'     # auto | sim | nao (só com placas = acabamento)
    # unidade (D037, pedido do usuário em 21/11): uma placa por unidade da lista, com as figuras e
    # as bases dela; o que não couber vai para outra placa da mesma unidade. acabamento: placas por
    # acabamento, com as bases juntas ou à parte (D033)
    placas: str = 'unidade'       # unidade | acabamento
    texto_altura: float = 3.0     # altura das maiúsculas (mm); cai até texto_min se não couber
    texto_min: float = 1.8        # abaixo disto o nome não cabe e o relatório avisa
    texto_camada: float = 0.4     # nome embutido em branco nas primeiras camadas (D027)
    texto_margem: float = 0.6     # da borda da base até o texto
    texto_engorda: float = 0.06   # engrossa as letras; 0,12 era preciso com bico 0,4 e texto em relevo
    texto_arco_graus: float = 140 # arco da frente da base usado pelo texto
    fonte: str = 'C:/Windows/Fonts/bahnschrift.ttf'  # protótipo; o site precisa de fonte livre embutida
    encaixe: str = 'base'         # duas metades: base (a fenda alinha as metades) | gabarito (D029) | pinos
    gabarito_folga: float = 0.2   # folga do bolso em volta do contorno (mm, de cada lado)
    gabarito_fundo: float = 1.0
    gabarito_parede: float = 3.0
    gabarito_fechamento: float = 1.5  # fecha reentrâncias estreitas do bolso (sem paredes finas)
    furo_diam: float = 2.0        # encaixe por pinos: filamento 1,75 mm
    furo_parede: float = 1.0
    furo_dist_min: float = 6.0
    mesa: float = 256.0           # suposição: mesa 256 x 256 (A1/P1/X1); não confirmada
    margem_mesa: float = 8.0
    espaco: float = 4.0
    # torre de purga (placas de 2 cores), por placa: nas figuras, a posição padrão da A1 (x=15,
    # y=220; torre de ~37 x 37 mm). Nas bases com nome, as trocas nas primeiras camadas fazem a
    # torre chegar a 43 x 42 mm e ela passava da borda (18/11): lá fica em y=200
    torre_pos: tuple = (15.0, 220.0)
    torre_xyxy: tuple = (0.0, 205.0, 62.0, 256.0)   # área deixada livre de peças
    torre_pos_bases: tuple = (15.0, 200.0)
    torre_xyxy_bases: tuple = (0.0, 190.0, 70.0, 256.0)
    pad: int = 2                  # px de margem no canvas

    @property
    def engorda_malha(self):
        return self.engorda if self.traco == 'engrossado' else 0.0

    @property
    def furo_prof(self):
        return round(self.corpo - 0.4, 3)


# ---------------------------------------------------------------- 2D

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


def bbox(m):
    ys, xs = np.where(m)
    return ys.min(), ys.max(), xs.min(), xs.max()


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


def registrar_verso(alvo, verso_cinza):
    """Alinha o verso ao contorno alvo (frente espelhada) maximizando IoU."""
    vs = G.silhueta(verso_cinza, DPI)
    ay0, ay1, ax0, ax1 = bbox(alvo)
    vy0, vy1, vx0, vx1 = bbox(vs)
    dy0, dx0 = int(ay1 - vy1), int(round((ax0 + ax1) / 2 - (vx0 + vx1) / 2))
    melhor = (-1.0, dy0, dx0)
    # busca de ±0,68 mm em passo de 2 px e depois refino de ±2 px
    for passo, raio in ((2, int(round(0.68 / S))), (1, 2)):
        _, cy, cx = melhor
        for dy in range(cy - raio, cy + raio + 1, passo):
            for dx in range(cx - raio, cx + raio + 1, passo):
                v = iou(deslocar(vs, dy, dx, alvo.shape, False), alvo)
                if v > melhor[0]:
                    melhor = (v, dy, dx)
    _, dy, dx = melhor
    return deslocar(verso_cinza, dy, dx, alvo.shape, 255), melhor[0]


def limpar(m, min_mm2=0.015):
    rot, n = ndi.label(m)
    if n == 0:
        return m
    areas = ndi.sum(m, rot, range(1, n + 1))
    return np.isin(rot, [i + 1 for i, a in enumerate(areas) if a * S * S >= min_mm2])


def tinta(cinza, sil):
    """Traço preto da arte (600 dpi): desfoque leve + limiar alto, para as linhas finas não quebrarem."""
    g = cv2.GaussianBlur(cinza, (0, 0), TINTA_SUAVE_MM / S)
    return limpar((g < TINTA_LIMIAR) & sil)


def engordar(m, mm):
    """Engrossa todo o preto por igual (dilatação por um disco de raio mm)."""
    if mm <= 0 or not m.any():
        return m
    return ndi.distance_transform_edt(~m) * S <= mm


def fracao_fina(m, largura_mm=0.4):
    """Fração da área com largura menor que o bico (some numa abertura morfológica)."""
    r = max(1, int(round(largura_mm / S)))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
    aberto = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, k) > 0
    return float(1 - aberto.sum() / max(1, m.sum()))


def meio_entre_px(P):
    """Meia distância entre as linguetas, em px; a mesma em todas as artes."""
    return int(round(P.lingueta_entre / 2 / S))


def entre_linguetas_mm(P):
    """Distância real entre os centros das linguetas (múltiplo de 2 px), usada também nas fendas."""
    return 2 * meio_entre_px(P) * S


def corpo_com_lingueta(sil, P):
    """Adiciona margem, travessa sob os pés e a lingueta do encaixe na base.

    Retangular (D042, padrão): uma lingueta reta de P.lingueta_ret_larg no meio do apoio dos pés,
    como nas primeiras versões. Cônico (D031): duas linguetas simétricas em volta do meio da
    travessa, a P.lingueta_entre uma da outra em todas as artes, cada uma estreitando para baixo
    (P.lingueta_conicidade), como a fenda. Se a figura for estreita, a travessa é alargada até
    cobrir as linguetas. Retorna (canvas, px de margem lateral, medidas).
    """
    h, w = sil.shape
    fundo = int(np.where(sil.any(1))[0].max())
    k = int(round(P.contato_mm / S))
    cols = np.where(sil[max(0, fundo - k):fundo + 1].any(0))[0]
    esq, dir_ = int(cols.min()), int(cols.max())
    centro = (esq + dir_ + 1) // 2           # fronteira entre colunas: eixo de simetria das linguetas
    conico = P.encaixe_base == 'conico'
    D = meio_entre_px(P) if conico else 0
    meia_topo = (P.lingueta_larg if conico else P.lingueta_ret_larg) / 2 / S
    tg = P.lingueta_conicidade if conico else 0.0
    alcance = D + int(math.ceil(meia_topo + P.barra_sobra / S))
    lado = P.pad + max(0, alcance - centro, centro + alcance - w)
    extra = int(math.ceil((P.travessa + P.lingueta_prof + 1.0) / S))
    m = np.zeros((h + 2 * P.pad + extra, w + 2 * lado), bool)
    m[P.pad:P.pad + h, lado:lado + w] = sil
    fundo, esq, dir_, centro = fundo + P.pad, esq + lado, dir_ + lado, centro + lado
    trav_orig = (dir_ - esq + 1) * S
    esq, dir_ = min(esq, centro - alcance), max(dir_, centro + alcance - 1)
    t = int(round(P.travessa / S))
    m[fundo - t:fundo + t + 1, esq:dir_ + 1] = True
    apoio = fundo + t
    prof = int(round(P.lingueta_prof / S))
    for cx in ((centro - D, centro + D) if conico else (centro,)):
        for i in range(prof):
            meia = int(round(meia_topo - (i + 0.5) * tg))
            m[apoio + 1 + i, cx - meia:cx + meia] = True
    cols_fig = np.where(sil.any(0))[0] + lado
    return m, lado, {
        'centro_col': int(centro), 'apoio_row': int(apoio),
        'travessa_mm': round((dir_ - esq + 1) * S, 2),
        'travessa_alargada': bool((dir_ - esq + 1) * S > trav_orig + 1e-6),
        'linguetas_mm': {'encaixe': 'conico' if conico else 'retangular', 'quantidade': 2 if conico else 1,
                         'entre_centros': round(entre_linguetas_mm(P), 3) if conico else None,
                         'larg_junto_barra': round(2 * int(round(meia_topo)) * S, 2),
                         'larg_ponta': round(2 * int(round(meia_topo - (prof - 0.5) * tg)) * S, 2),
                         'prof': round(prof * S, 2), 'conicidade': tg},
        'figura_esq_mm': round((centro - cols_fig.min()) * S, 2),
        'figura_dir_mm': round((cols_fig.max() + 1 - centro) * S, 2),
        'altura_mm': round((apoio - np.where(m.any(1))[0].min()) * S, 2),
    }


def posicionar_furos(sil_pad, P):
    dt = ndi.distance_transform_edt(sil_pad)
    lim = (P.furo_diam / 2 + P.furo_parede) / S
    if dt.max() < lim:
        return []
    p1 = np.unravel_index(np.argmax(dt), dt.shape)
    ys, xs = np.where(dt >= lim)
    d = np.hypot(ys - p1[0], xs - p1[1])
    ok = d >= P.furo_dist_min / S
    furos = [(int(p1[0]), int(p1[1]))]
    if ok.any():
        i = np.argmax(np.where(ok, d, -1))
        furos.append((int(ys[i]), int(xs[i])))
    return furos


# ---------------------------------------------------------------- 3D

def secao(mask, engorda=0.0):
    """Máscara -> CrossSection em mm (y para cima), compensando meio pixel da borda.

    engorda (mm) é aplicada no vetor: a 600 dpi um pixel tem 0,042 mm, grosso demais para
    engrossar traços de 0,1 mm com precisão.
    """
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    h = mask.shape[0]
    polys = []
    for c in cnts:
        c = cv2.approxPolyDP(c, 0.5, True)
        if len(c) < 3:
            continue
        p = c[:, 0, :].astype(float)
        polys.append(np.column_stack([p[:, 0] * S, (h - p[:, 1]) * S]))
    cs = mf.CrossSection(polys, mf.FillRule.EvenOdd).offset(S / 2, mf.JoinType.Miter, 2.0)
    return cs.offset(engorda, mf.JoinType.Round) if engorda > 0 else cs


def _furos(furos, h, P, z0):
    """Cilindros dos furos de pino (diâmetro P.furo_diam, fundo P.furo_prof) a partir de z0."""
    cils = None
    for r, c in furos:
        cil = mf.Manifold.cylinder(P.furo_prof + 0.02, P.furo_diam / 2, P.furo_diam / 2, 48)
        cil = cil.translate((c * S, (h - r) * S, z0 - 0.01))
        cils = cil if cils is None else cils + cil
    return cils


def metade(corpo_mask, relevo_mask, furos, P):
    """Acabamento preto-relevo: corpo branco, desenho preto em relevo; furos na face da mesa."""
    h = corpo_mask.shape[0]
    contorno = secao(corpo_mask)
    corpo = mf.Manifold.extrude(contorno, P.corpo)
    if furos:
        corpo = corpo - _furos(furos, h, P, 0.0)
    # o relevo nunca passa da borda do corpo
    relevo = mf.Manifold.extrude(secao(relevo_mask, P.engorda_malha) ^ contorno, P.relevo).translate((0, 0, P.corpo))
    return corpo, relevo


def metade_branco_relevo(corpo_mask, sil_mask, tinta_mask, furos, P):
    """Acabamento branco-relevo: corpo preto e relevo branco onde não há tinta; as linhas do
    desenho viram sulcos pretos (P.sulco_engorda os alarga, se o fatiador fechá-los). Furos na
    face da mesa."""
    h = corpo_mask.shape[0]
    contorno = secao(corpo_mask)
    corpo = mf.Manifold.extrude(contorno, P.corpo)
    if furos:
        corpo = corpo - _furos(furos, h, P, 0.0)
    branco = (secao(sil_mask) - secao(tinta_mask, P.sulco_engorda)) ^ contorno
    return corpo, mf.Manifold.extrude(branco, P.relevo).translate((0, 0, P.corpo))


def metade_pintada(corpo_mask, tinta_mask, furos, P, sil_mask=None):
    """Acabamento pintado: desenho rente na face da mesa (primeiras P.camada_mesa mm, preto e
    branco coplanares), sem relevo. Miolo preto (D036): o branco fica só nas áreas brancas do
    desenho; miolo branco: o resto é branco. A face de colar fica em cima, com os furos.
    corpo_mask e tinta_mask já vêm espelhados (a face da mesa é vista por baixo).
    Retorna [(malha, cor, rótulo)]; cor 0 = branco, 1 = preto."""
    h = corpo_mask.shape[0]
    contorno = secao(corpo_mask)
    preto_cs = secao(tinta_mask, P.engorda_malha) ^ contorno
    cam = P.camada_mesa
    vaos = _furos(furos, h, P, P.corpo - P.furo_prof) if furos else None
    if P.miolo == 'preto':
        # branco só dentro da silhueta da arte: barra e linguetas ficam pretas
        area = secao(sil_mask) ^ contorno if sil_mask is not None else contorno
        branco = mf.Manifold.extrude(area - preto_cs, cam)
        preto = mf.Manifold.extrude(contorno, P.corpo) - branco
        if vaos is not None:
            preto = preto - vaos
        return [(preto, 1, 'Preto - corpo'), (branco, 0, 'Branco - desenho na mesa')]
    branco = (mf.Manifold.extrude(contorno - preto_cs, cam)
              + mf.Manifold.extrude(contorno, P.corpo - cam).translate((0, 0, cam)))
    if vaos is not None:
        branco = branco - vaos
    return [(branco, 0, 'Branco - corpo'), (mf.Manifold.extrude(preto_cs, cam), 1, 'Preto - desenho na mesa')]


def peca_unica(corpo_mask, preto_mesa_mask, relevo_mask, P):
    """Peça única (D002/D011): desenho P/B na face da mesa, núcleo branco, relevo preto em cima.

    corpo_mask já está no sistema de coordenadas do modelo visto de cima; preto_mesa_mask
    deve vir espelhado (a face é vista por baixo). Branco e preto da camada inferior são
    complementares e coplanares em Z=0.
    """
    contorno = secao(corpo_mask)
    preto_cs = secao(preto_mesa_mask, P.engorda_malha) ^ contorno
    branco_cs = contorno - preto_cs
    cam = P.camada_mesa
    branco = mf.Manifold.extrude(branco_cs, cam) + mf.Manifold.extrude(contorno, P.corpo - cam).translate((0, 0, cam))
    preto_mesa = mf.Manifold.extrude(preto_cs, cam)
    relevo = mf.Manifold.extrude(secao(relevo_mask, P.engorda_malha) ^ contorno, P.relevo).translate((0, 0, P.corpo))
    return branco, preto_mesa, relevo


def lateral_preta(partes, corpo_mask, P):
    """Troca por preto o branco que fica a menos de P.lateral_preta mm da borda, em toda a altura
    (D034): a lateral da figura sai preta, inclusive no miolo. Na face, o contorno da arte fica com
    pelo menos essa largura. Retorna as partes com o branco recortado e uma parte "Preto - lateral"."""
    if P.lateral_preta <= 0:
        return partes
    contorno = secao(corpo_mask)
    prisma = mf.Manifold.extrude(contorno - contorno.offset(-P.lateral_preta, mf.JoinType.Round), 100).translate((0, 0, -50))
    saida, faixa = [], None
    for m, cor, rot in partes:
        if cor == 0:
            parte = m ^ prisma
            faixa = parte if faixa is None else faixa + parte
            m = m - prisma
        saida.append((m, cor, rot))
    if faixa is not None and not faixa.is_empty():
        saida.append((faixa, 1, 'Preto - lateral'))
    return saida


def anel_px(corpo_mask, P):
    """A faixa da lateral preta em pixels (prévias)."""
    if P.lateral_preta <= 0:
        return np.zeros_like(corpo_mask)
    return corpo_mask & (ndi.distance_transform_edt(corpo_mask) * S <= P.lateral_preta)


def espessura_peca(duas, acabamento, P):
    """Espessura da parte que entra na fenda: as duas metades unidas, o corpo da peça única com
    relevo (o relevo não chega à lingueta) ou a peça única pintada inteira."""
    if duas:
        return 2 * P.corpo
    return P.corpo + P.relevo if acabamento == 'pintado' else P.corpo


def peca_unica_pintada(corpo_mask, preto_mesa_mask, preto_cima_mask, P, sil_mask=None):
    """Peça única sem relevo (D032): desenho rente nas duas faces, preto e branco coplanares nas
    primeiras e nas últimas P.camada_mesa mm. Miolo preto (D036): o resto da peça é preto; miolo
    branco: núcleo branco. Espessura total P.corpo + P.relevo,
    a mesma da peça única com relevo: o preto de uma face fica atrás de 1,2 mm de branco na outra
    (branco fino deixa o preto aparecer, pesquisa de 18/11). preto_mesa_mask vem espelhado
    (a face da mesa é vista por baixo); preto_cima_mask é o verso como impresso.
    """
    contorno = secao(corpo_mask)
    esp, cam = P.corpo + P.relevo, P.camada_mesa
    baixo = secao(preto_mesa_mask, P.engorda_malha) ^ contorno
    cima = secao(preto_cima_mask, P.engorda_malha) ^ contorno
    if P.miolo == 'preto':
        # D036: peça preta; o branco só nas áreas brancas de cada face, com cam de fundo, e só
        # dentro da silhueta da arte (barra e linguetas pretas). A silhueta é a mesma nas duas
        # faces vista de cima (o verso é a frente espelhada)
        area = secao(sil_mask) ^ contorno if sil_mask is not None else contorno
        b_mesa = mf.Manifold.extrude(area - baixo, cam)
        b_cima = mf.Manifold.extrude(area - cima, cam).translate((0, 0, esp - cam))
        preto = mf.Manifold.extrude(contorno, esp) - b_mesa - b_cima
        return [(preto, 1, 'Preto - corpo'), (b_mesa, 0, 'Branco - desenho na mesa'),
                (b_cima, 0, 'Branco - desenho em cima')]
    branco = (mf.Manifold.extrude(contorno - baixo, cam)
              + mf.Manifold.extrude(contorno, esp - 2 * cam).translate((0, 0, cam))
              + mf.Manifold.extrude(contorno - cima, cam).translate((0, 0, esp - cam)))
    return [(branco, 0, 'Branco - corpo'), (mf.Manifold.extrude(baixo, cam), 1, 'Preto - desenho na mesa'),
            (mf.Manifold.extrude(cima, cam).translate((0, 0, esp - cam)), 1, 'Preto - desenho em cima')]


def _glifo(fonte, ch, k):
    """Polígonos de um caractere em mm, origem na linha de base à esquerda, y para cima."""
    l, t, r, b = fonte.getbbox(ch, anchor='ls')
    w, h = r - l + 8, b - t + 8
    img = Image.new('L', (w, h), 0)
    ImageDraw.Draw(img).text((4 - l, 4 - t), ch, font=fonte, anchor='ls', fill=255)
    m = np.asarray(img) > 127
    cnts, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    polys = []
    for c in cnts:
        c = cv2.approxPolyDP(c, 0.6, True)
        if len(c) >= 3:
            p = c[:, 0, :].astype(float)
            polys.append(np.column_stack([(p[:, 0] - (4 - l)) / k, ((4 - t) - p[:, 1]) / k]))
    return polys, fonte.getlength(ch) / k


def texto_na_borda(nome, a, b, P, centro=270, altura=None):
    """Texto na borda da base, letras com o topo para o centro. centro = 270 graus: borda da
    frente (y negativo), lida pela frente; 90: borda de trás, lida por trás.

    Os glifos seguem a elipse interna (a, b) recuada pela margem; o tamanho cai até
    texto_min se o nome não couber no arco. Retorna (CrossSection, medidas).
    """
    k = 40.0                                  # px por mm na rasterização dos glifos
    altura = altura or P.texto_altura
    while True:
        fonte = ImageFont.truetype(P.fonte, int(round(altura / 0.72 * k)))
        try:
            fonte.set_variation_by_name('Bold SemiCondensed')
        except (OSError, ValueError):
            pass
        desc = fonte.getmetrics()[1] / k
        glifos = [_glifo(fonte, ch, k) if ch.strip() else ([], fonte.getlength(ch) / k) for ch in nome]
        espaco = 0.06 * altura
        total = sum(adv for _, adv in glifos) + espaco * (len(glifos) - 1)
        # curva na meia altura das letras: o espaçamento fica correto no meio do glifo
        meio = P.texto_margem + desc + altura / 2
        ra, rb = a - meio, b - meio
        t = np.linspace(math.radians(centro - P.texto_arco_graus / 2), math.radians(centro + P.texto_arco_graus / 2), 2000)
        pts = np.column_stack([ra * np.cos(t), rb * np.sin(t)])
        s = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(pts, axis=0).T))])
        if total <= s[-1] or altura <= P.texto_min:
            break
        altura = max(P.texto_min, altura * s[-1] / total * 0.98)
    s0 = (s[-1] - total) / 2
    secao_txt = mf.CrossSection()
    pos = s0
    for polys, adv in glifos:
        sc = pos + adv / 2
        pos += adv + espaco
        if not polys:
            continue
        i = int(np.clip(np.searchsorted(s, sc), 1, len(s) - 1))
        tt = t[i]
        tan = np.array([-ra * math.sin(tt), rb * math.cos(tt)])
        tan /= np.linalg.norm(tan)
        nor = np.array([-tan[1], tan[0]])        # para dentro da base
        centro = pts[i] - nor * altura / 2      # linha de base fica a meia altura para fora
        mundo = [centro + np.outer(p[:, 0] - adv / 2, tan) + np.outer(p[:, 1], nor) for p in polys]
        secao_txt = secao_txt + mf.CrossSection(mundo, mf.FillRule.EvenOdd)
    return secao_txt, {'texto': nome, 'altura_letra_mm': round(altura, 2),
                       'coube': bool(total <= s[-1]), 'comprimento_mm': round(total, 1),
                       'arco_disponivel_mm': round(float(s[-1]), 1)}


def _retangulo(x0, y0, x1, y1):
    return mf.CrossSection.square((x1 - x0, y1 - y0)).translate((x0, y0))


def _circulo(cx, cy, r, n=48):
    t = np.linspace(0, 2 * math.pi, n, endpoint=False)
    return mf.CrossSection([np.column_stack([cx + r * np.cos(t), cy + r * np.sin(t)])])


def fenda_mola(P, espessura_lingueta):
    """Fenda retangular (D042) com uma mola atrás (y > 0): uma lâmina de P.mola_lamina, presa
    numa ponta e solta na outra, com um ressalto no meio da fenda que entra P.folga_esp +
    P.mola_precarga na fenda. A lingueta empurra o ressalto ao entrar, a lâmina dobra no plano da
    base (o plano forte da impressão) e aperta a lingueta contra a parede da frente.

    Vista de cima: vão de P.mola_alivio atrás da lâmina e na ponta dela, e entre a lâmina e o
    corpo da base onde ela passa da fenda até a raiz; raio na raiz. O ressalto tem uma rampa na
    boca (z = 0), a P.mola_entrada_graus da vertical, para a lingueta abrir a lâmina ao descer.
    Retorna (vão, ressalto, medidas, (x0, y0, x1, y1) do que ocupa na face de cima).
    """
    H, T = P.base_altura, espessura_lingueta
    fl, e = P.lingueta_ret_larg + P.folga_larg, T + P.folga_esp
    t, L, g, r = P.mola_lamina, P.mola_comprimento, P.mola_alivio, P.mola_raiz_raio
    meio = P.mola_ressalto / 2
    p = P.folga_esp + P.mola_precarga                     # quanto o ressalto entra na fenda
    c = p / math.tan(math.radians(P.mola_entrada_graus))  # altura da rampa a partir da boca
    if c > H - 0.5 or L - meio < fl / 2 + 2 * r:
        raise ValueError('mola não cabe: rampa alta demais ou lâmina curta demais')
    x0, x1 = -L, meio                # raiz e ponta da lâmina
    y0, y1 = e / 2, e / 2 + t        # face da lâmina voltada para a fenda e face de trás
    corte = (_retangulo(-fl / 2, -e / 2, fl / 2, e / 2)                 # a fenda
             + _retangulo(x0, y1, x1 + g, y1 + g)                     # alívio atrás
             + _retangulo(x1, y0 - 0.01, x1 + g, y1 + g)              # alívio na ponta
             + _retangulo(x0, y0 - g, -fl / 2 + 0.01, y0)             # alívio na frente, até a fenda
             + _circulo(x0, y1 + r, r) + _circulo(x0, y0 - r, r))     # raio na raiz
    vao = mf.Manifold.extrude(corte, H + 0.02).translate((0, 0, -0.01))
    perfil = [(y0 + 0.01, 0.0), (y0, 0.0), (y0 - p, c), (y0 - p, H), (y0 + 0.01, H)]
    ressalto = mf.Manifold.hull_points([(x, y, z) for x in (-meio, meio) for y, z in perfil])
    # dobra da lâmina (viga engastada, força no ressalto; ficha do PLA Basic: E 2680 MPa no XY,
    # 39 MPa de tração) para a pré-carga nominal e para 0,2 mm de erro da impressora
    E, I = 2680.0, H * t ** 3 / 12
    flexao = {f'{d:.2f}': {'deformacao_pct': round(150 * t * d / L ** 2, 2),
                           'forca_N': round(3 * E * I * d / L ** 3, 2)}
              for d in (P.mola_precarga - 0.2, P.mola_precarga, P.mola_precarga + 0.2)}
    med = {'encaixe': 'mola', 'quantidade': 1, 'largura': round(fl, 3), 'espessura': round(e, 3),
           'altura': H, 'folga_larg_mm': P.folga_larg, 'folga_esp_mm': P.folga_esp,
           'mola': {'lado': 'atrás (y > 0)', 'lamina_mm': t, 'comprimento_ate_ressalto_mm': L,
                    'alivio_mm': g, 'raio_raiz_mm': r, 'ressalto_comprimento_mm': P.mola_ressalto,
                    'ressalto_entra_mm': round(p, 3), 'rampa_graus': P.mola_entrada_graus,
                    'rampa_altura_mm': round(c, 3), 'precarga_mm': P.mola_precarga,
                    'ressalto_a_parede_oposta_mm': round(e - p, 3),
                    'recuo_ate_a_ponta_encostar_mm': round(g / (1 + 1.5 * x1 / L), 3),
                    'flexao_por_recuo_mm': flexao}}
    return vao, ressalto, med, (x0 - r, -e / 2, max(fl / 2, x1 + g), y1 + 2 * r)


def fendas(P, espessura_lingueta):
    """Vãos do encaixe, centrados em x = 0, no sistema da base impressa de cabeça para baixo:
    z = 0 é a boca (face de cima no jogo). Retorna (vão, sólido a somar depois de abrir o vão ou
    None, medidas, (x0, y0, x1, y1) do que a fenda ocupa na face de cima).

    Retangular (D042, padrão): uma fenda reta e vazada, P.folga_larg mais larga que a lingueta e
    P.folga_esp mais grossa, sem chanfro, como nas primeiras versões.

    Mola (teste de 22/11): a retangular com uma lâmina que aperta a lingueta (fenda_mola).

    Cônico (D031): duas fendas com a conicidade da lingueta; na boca, 2 x folga_barra x
    conicidade mais estreitas que a lingueta junto à barra: empurrada, a lingueta encosta nas
    paredes inclinadas e para com a barra a P.lingueta_folga_barra da base. A boca tem chanfro
    contra o pé de elefante da primeira camada.
    """
    H = P.base_altura
    e = espessura_lingueta + P.folga_esp
    if P.encaixe_base == 'mola':
        return fenda_mola(P, espessura_lingueta)
    if P.encaixe_base != 'conico':
        fl = P.lingueta_ret_larg + P.folga_larg
        vao = mf.Manifold.cube((fl, e, H + 0.02)).translate((-fl / 2, -e / 2, -0.01))
        med = {'encaixe': 'retangular', 'quantidade': 1, 'largura': round(fl, 3), 'espessura': round(e, 3),
               'altura': H, 'folga_larg_mm': P.folga_larg, 'folga_esp_mm': P.folga_esp}
        return vao, None, med, (-fl / 2, -e / 2, fl / 2, e / 2)
    tg, c = P.lingueta_conicidade, P.boca_chanfro
    boca = P.lingueta_larg - 2 * P.lingueta_folga_barra * tg
    larg = lambda z: boca - 2 * z * tg
    if larg(H) < 0.8:
        raise ValueError('fenda cônica fecha antes do fundo da base')

    def tronco(x, z0, w0, e0, z1, w1, e1):
        return mf.Manifold.hull_points([(x + sx * w / 2, sy * ee / 2, z)
                                        for z, w, ee in ((z0, w0, e0), (z1, w1, e1))
                                        for sx in (-1, 1) for sy in (-1, 1)])
    L = entre_linguetas_mm(P)
    total = None
    for x in (-L / 2, L / 2):
        f = tronco(x, -0.01, larg(-0.01), e, H + 0.01, larg(H + 0.01), e)
        f = f + tronco(x, -0.01, boca + 2 * (c + 0.01), e + 2 * (c + 0.01), c, larg(c), e)
        total = f if total is None else total + f
    med = {'encaixe': 'conico', 'quantidade': 2, 'entre_centros': round(L, 3), 'larg_boca': round(boca, 3),
           'larg_fundo': round(larg(H), 3), 'espessura': round(e, 3), 'chanfro_boca': c,
           'altura': H, 'conicidade': tg, 'folga_barra_mm': P.lingueta_folga_barra}
    xf, yf = (L + boca) / 2 + c, e / 2 + c
    return total, None, med, (-xf, -yf, xf, yf)


def base(forma, mm, P, espessura_lingueta, nome=None, numero=None):
    """Base preta com a fenda vazada do encaixe (D042 retangular; mola, em teste; D031 cônico),
    impressa de cabeça para baixo (D027).

    A face da mesa é a de cima no jogo: sai lisa, com o acabamento da mesa. Com nome, o texto
    fica embutido em branco nas primeiras P.texto_camada mm, rente à superfície (não colide com
    o standee ao encaixar) e espelhado, porque é lido do outro lado. O número da unidade (D035),
    ou um rótulo curto no lugar dele, vai do mesmo jeito na borda de trás, lido por trás.
    Retorna ([(malha, cor, rótulo)], medidas); cor 0 = filamento 1 (branco), 1 = filamento 2
    (preto).
    """
    a, b = (mm[0] / 2, mm[0] / 2) if forma == 'redonda' else (mm[0] / 2, mm[1] / 2)
    t = np.linspace(0, 2 * math.pi, 192, endpoint=False)
    contorno = mf.CrossSection([np.column_stack([a * np.cos(t), b * np.sin(t)])])
    solido = mf.Manifold.extrude(contorno, P.base_altura)
    vaos, somar, med_f, (fx0, fy0, fx1, fy1) = fendas(P, espessura_lingueta)
    xf, yf = max(-fx0, fx1), max(-fy0, fy1)
    if (xf + 1.2) ** 2 / a ** 2 + (yf + 1.2) ** 2 / b ** 2 > 1:
        raise ValueError(f'as fendas não cabem numa base de {mm} mm')
    solido = solido - vaos
    if somar is not None:
        solido = solido + somar
    med = {'fendas_mm': med_f,
           'fenda': {'conico': 'duas, vazadas e cônicas',
                     'mola': 'uma, vazada e retangular, com mola atrás'}.get(P.encaixe_base, 'uma, vazada e retangular'),
           'impressa': 'de cabeça para baixo (face da mesa = face de cima)'}
    partes = [(solido, 1, 'Preto - base')]
    if nome or numero is not None:
        txt = mf.CrossSection()
        if nome:
            txt, med_txt = texto_na_borda(nome, a, b, P)
            med['nome'] = {**med_txt, 'embutido_mm': P.texto_camada}
        if numero is not None:
            txt_n, med_n = texto_na_borda(str(numero), a, b, P, centro=90, altura=P.numero_altura)
            txt = txt + txt_n
            med['numero'] = {**med_n, 'embutido_mm': P.texto_camada}
        livre = _retangulo(fx0 - 0.8, fy0 - 0.8, fx1 + 0.8, fy1 + 0.8)
        txt = txt.offset(P.texto_engorda, mf.JoinType.Round)
        # espelha antes de tirar a área da fenda: o vão da mola não é simétrico
        txt = (txt ^ contorno.offset(-0.3, mf.JoinType.Round)).mirror((1, 0)) - livre
        branco = mf.Manifold.extrude(txt, P.texto_camada)
        rot_b = 'Branco - nome' + (' e número' if numero is not None else '') if nome else 'Branco - número'
        partes = [(solido - branco, 1, 'Preto - base'), (branco, 0, rot_b)]
    return [(m.translate((a, b, 0)), cor, rot) for m, cor, rot in partes], med


def chave_base(m, P, duas=True):
    k = f'base-{m["base"]}'
    if not duas and m.get('acabamento', P.acabamento) == 'pintado':
        k += '-plana'   # fenda para a peça única pintada, mais grossa
    if P.nome_na_base:
        k += ('-' + str(m['numero']) if P.numero_na_base else '') + '-' + re.sub(r'[^a-z0-9]+', '-', m['unidade'].lower()).strip('-')
    return k


def numerar(modelos):
    """Número de cada modelo na lista (D035). Com "numero" em todos, vale o da lista, que separa
    unidades repetidas (2x Veterans = 3 e 4). Sem nenhum, numera os nomes de unidade na ordem em
    que aparecem; aí unidades repetidas com o mesmo nome ganhariam o mesmo número."""
    com = [m for m in modelos if 'numero' in m]
    if com and len(com) != len(modelos):
        sys.exit('"numero" precisa estar em todos os modelos da lista, ou em nenhum')
    if not com:
        ordem = list(dict.fromkeys(m['unidade'] for m in modelos))
        for m in modelos:
            m['numero'] = ordem.index(m['unidade']) + 1


def para_trimesh(m):
    mesh = m.to_mesh()
    return trimesh.Trimesh(mesh.vert_properties[:, :3].astype(np.float64), mesh.tri_verts, process=False)


def checar(nome, m):
    tm = para_trimesh(m)
    return {'peca': nome, 'triangulos': int(len(tm.faces)), 'fechada': bool(tm.is_watertight),
            'normais_consistentes': bool(tm.is_winding_consistent), 'volume_mm3': round(float(tm.volume), 2),
            'genus': int(m.genus()), 'status': str(m.status()), 'z_mm': [round(float(tm.bounds[0][2]), 3),
                                                                           round(float(tm.bounds[1][2]), 3)]}


# ---------------------------------------------------------------- 3MF / STL

NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
NS_BBL = 'http://schemas.bambulab.com/package/2021'
NS_P = 'http://schemas.microsoft.com/3dmanufacturing/production/2015/06'
CABECALHO = (f'<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="{NS}" '
             f'xmlns:BambuStudio="{NS_BBL}" xmlns:p="{NS_P}" requiredextensions="p">\n'
             '<metadata name="BambuStudio:3mfVersion">1</metadata>\n')
REL_3DMODEL = 'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel'


# UUIDs no padrão que o Bambu Studio grava e lê (índices codificados no prefixo).
UUID_OBJ = '{:08x}-61cb-4c03-9d28-80fed5dfa1dc'      # objeto dono da malha
UUID_OBJ_COPIA = '{:08x}-71cb-4c03-9d28-80fed5dfa1dc'  # objeto que reaproveita malha
UUID_MALHA = '{:04x}{:04x}-81cb-4c03-9d28-80fed5dfa1dc'
UUID_COMP = '{:04x}{:04x}-b206-40ff-9872-83e8017abed1'
UUID_ITEM = '{:08x}-b1ec-4553-aec9-835e5b724bb4'
UUID_BUILD = '2c7c17d8-22b5-4d84-8835-1976022ea369'


def _malha_xml(k, p, mid, m):
    """Malha da parte p do objeto de índice k, com id global mid."""
    mesh = m.to_mesh()
    v = mesh.vert_properties[:, :3]
    f = mesh.tri_verts
    vs = ''.join(f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in v)
    ts = ''.join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in f)
    return (f'<object id="{mid}" p:UUID="{UUID_MALHA.format(k, p)}" type="model">'
            f'<mesh><vertices>{vs}</vertices><triangles>{ts}</triangles></mesh></object>\n'), len(f)


def gabarito(corpo_mask, P):
    """Gabarito de colagem das duas metades (D029): bandeja com um bolso no contorno da peça.

    A primeira metade entra com a face de fora para baixo; a segunda vai por cima, com a face
    de fora para cima; as paredes do bolso (contorno + folga) alinham as duas, inclusive a
    lingueta. corpo_mask é o contorno visto de cima com a primeira metade de face para baixo
    (o mesmo do verso impresso). Profundidade: primeira metade com relevo + metade da segunda.
    Um furo no fundo serve para empurrar a peça colada para fora.
    """
    fech = P.gabarito_fechamento
    bolso = secao(corpo_mask).offset(P.gabarito_folga, mf.JoinType.Round)
    bolso = bolso.offset(fech, mf.JoinType.Round).offset(-fech, mf.JoinType.Round)
    x0, y0, x1, y1 = bolso.bounds()
    m = P.gabarito_parede
    caixa = mf.CrossSection.square((x1 - x0 + 2 * m, y1 - y0 + 2 * m)).translate((x0 - m, y0 - m))
    prof = round(P.corpo + P.relevo + 0.5 * P.corpo, 2)
    solido = mf.Manifold.extrude(caixa, P.gabarito_fundo + prof)
    solido = solido - mf.Manifold.extrude(bolso, prof + 0.01).translate((0, 0, P.gabarito_fundo))
    dt = ndi.distance_transform_edt(corpo_mask)
    r, c = np.unravel_index(np.argmax(dt), dt.shape)
    raio = min(3.0, dt.max() * S - 1.0)
    if raio >= 1.0:
        h = corpo_mask.shape[0]
        furo = mf.Manifold.cylinder(P.gabarito_fundo + 0.02, raio, raio, 48)
        solido = solido - furo.translate((c * S, (h - r) * S, -0.01))
    return solido, {'bolso_prof_mm': prof, 'folga_mm': P.gabarito_folga,
                    'furo_para_empurrar_mm': round(2 * raio, 1) if raio >= 1.0 else None}


def colunas_de_placas(n):
    """Colunas da grade de placas do Bambu Studio (PartPlate.hpp, compute_colum_count)."""
    v = math.sqrt(n)
    r = round(v)
    return int(r + 1 if v > r else r)


def escrever_3mf(caminho, objetos, placas, ajustes=None, projeto=None, mesa=256.0, torres=None):
    """Projeto 3MF no formato do Bambu Studio, com várias placas.

    objetos: {chave: (nome, [(manifold, cor 0=branco 1=preto, rotulo)])}
    placas: [(nome da placa, [(chave, x, y)])], x/y em mm dentro da placa.
    torres: posição (x, y) da torre de purga em cada placa (None = a do perfil).
    ajustes: ajustes de impressão por objeto (ex.: {'wall_generator': 'arachne'}), gravados
    como o Bambu Studio grava um ajuste mudado só naquele objeto.
    projeto: project_settings.config (dict). Sem ele o Bambu Studio diz que o 3MF é de versão
    antiga e carrega só a geometria (Plater.cpp, load_files; observado pelo usuário em 18/11).
    Placas: o Bambu decide a placa de cada objeto pela posição (PartPlate.cpp,
    compute_shape_position): a placa i fica em (coluna, -linha) x mesa x 1,2.
    Reproduz o que o próprio Bambu Studio grava: cada cópia é um objeto, com arquivo
    3D/Objects/object_k.model; a malha fica só no arquivo da primeira cópia e as
    demais apontam para ele (o arquivo não cresce com as cópias). Os ids de malhas e
    de objetos montados compartilham UM espaço global (ids repetidos entre arquivos
    fazem o Bambu misturar malhas: conflitos e "fora da mesa").
    """
    extra_cfg = ''.join(f'<metadata key="{k}" value="{v}"/>' for k, v in (ajustes or {}).items())
    preparadas = {}
    for chave, (nome, partes) in objetos.items():
        # convenção do Bambu: malha centrada na origem; a posição vai no item
        caixas = np.array([m.bounding_box() for m, _, _ in partes])
        lo, hi = caixas[:, :3].min(0), caixas[:, 3:].max(0)
        c = (lo + hi) / 2
        preparadas[chave] = (nome, [(m.translate(tuple(-c)), cor, rot) for m, cor, rot in partes], c - lo)
    arquivos, rels, dono, recursos, cfg, build, cortes, contagem = {}, [], {}, [], [], [], [], {}
    proximo_id = 1
    passo, cols = mesa * 1.2, colunas_de_placas(len(placas))
    itens, instancias = [], [[] for _ in placas]
    for ip, (_, lista_itens) in enumerate(placas):
        ox, oy = (ip % cols) * passo, -(ip // cols) * passo
        itens += [(ip, chave, x + ox, y + oy) for chave, x, y in lista_itens]
    for k, (ip, chave, x, y) in enumerate(itens, 1):
        nome, partes, centro = preparadas[chave]
        arq = f'3D/Objects/object_{k}.model'
        rels.append(f'<Relationship Target="/{arq}" Id="rel-{k}" Type="{REL_3DMODEL}"/>')
        if chave not in dono:
            mids = list(range(proximo_id, proximo_id + len(partes)))
            proximo_id += len(partes)
            blocos = [_malha_xml(k, p, mid, m) for p, (mid, (m, _, _)) in enumerate(zip(mids, partes))]
            faces = [nf for _, nf in blocos]
            dono[chave] = (k, mids, faces)
            arquivos[arq] = f'{CABECALHO}<resources>\n{"".join(b for b, _ in blocos)}</resources>\n<build/>\n</model>\n'
            uuid_obj = UUID_OBJ.format(k)
            contagem[chave] = 1
        else:
            arquivos[arq] = f'{CABECALHO}<resources>\n</resources>\n<build/>\n</model>\n'
            uuid_obj = UUID_OBJ_COPIA.format(k)
            contagem[chave] += 1
        oid = proximo_id
        proximo_id += 1
        k_dono, mids, faces = dono[chave]
        comps = ''.join(f'<component p:path="/3D/Objects/object_{k_dono}.model" objectid="{mid}" '
                        f'p:UUID="{UUID_COMP.format(k, p)}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>'
                        for p, mid in enumerate(mids))
        recursos.append(f'<object id="{oid}" p:UUID="{uuid_obj}" type="model"><components>{comps}</components></object>\n')
        partes_cfg = ''.join(
            f'<part id="{mid}" subtype="normal_part"><metadata key="name" value="{rot}"/>'
            '<metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>'
            f'<metadata key="extruder" value="{cor + 1}"/>'
            f'<mesh_stat face_count="{nf}" edges_fixed="0" degenerate_facets="0" facets_removed="0" '
            'facets_reversed="0" backwards_edges="0"/></part>'
            for mid, nf, (_, cor, rot) in zip(mids, faces, partes))
        cfg.append(f'<object id="{oid}"><metadata key="name" value="{nome} #{contagem[chave]}"/>'
                   f'<metadata key="extruder" value="1"/>{extra_cfg}<metadata face_count="{sum(faces)}"/>{partes_cfg}</object>\n')
        cx, cy, cz = centro
        build.append(f'<item objectid="{oid}" p:UUID="{UUID_ITEM.format(oid)}" '
                     f'transform="1 0 0 0 1 0 0 0 1 {x + cx:.3f} {y + cy:.3f} {cz:.3f}" printable="1"/>\n')
        instancias[ip].append(f'<model_instance><metadata key="object_id" value="{oid}"/>'
                          '<metadata key="instance_id" value="0"/>'
                          f'<metadata key="identify_id" value="{100 + k}"/></model_instance>')
        cortes.append(f'<object id="{oid}"><cut_id id="0" check_sum="1" connectors_cnt="0"/></object>')
    principal = (f'{CABECALHO}<metadata name="Application">BambuStudio-02.07.01.57</metadata>\n'
                 f'<resources>\n{"".join(recursos)}</resources>\n'
                 f'<build p:UUID="{UUID_BUILD}">\n{"".join(build)}</build>\n</model>\n')
    xml_placas = ''.join(
        f'<plate><metadata key="plater_id" value="{ip + 1}"/><metadata key="plater_name" value="{nome_p}"/>'
        '<metadata key="locked" value="false"/><metadata key="filament_map_mode" value="Auto For Flush"/>'
        f'<metadata key="gcode_file" value=""/>{"".join(instancias[ip])}</plate>\n'
        for ip, (nome_p, _) in enumerate(placas))
    config = f'<?xml version="1.0" encoding="UTF-8"?>\n<config>\n{"".join(cfg)}{xml_placas}<assemble>\n</assemble>\n</config>\n'
    arquivos['Metadata/cut_information.xml'] = f'<?xml version="1.0" encoding="utf-8"?>\n<objects>{"".join(cortes)}</objects>\n'
    arquivos['Metadata/filament_sequence.json'] = json.dumps(
        {f'plate_{i + 1}': {'nozzle_sequence': [], 'optimal_assignment': [], 'sequence': []} for i in range(len(placas))})
    if projeto:
        projeto = dict(projeto)
        for i, k in enumerate(('wipe_tower_x', 'wipe_tower_y')):   # um valor por placa (PartPlate.cpp)
            if isinstance(projeto.get(k), list) and projeto[k]:
                padrao = projeto[k][0]
                projeto[k] = [padrao if not torres or torres[n] is None else f'{torres[n][i]:g}'
                              for n in range(len(placas))]
        arquivos['Metadata/project_settings.config'] = json.dumps(projeto, indent=4, ensure_ascii=False)
    tmp = Path(str(caminho) + '.tmp')
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="gcode" ContentType="text/x.gcode"/></Types>')
        z.writestr('_rels/.rels', f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="{REL_3DMODEL}"/></Relationships>')
        z.writestr('3D/3dmodel.model', principal)
        z.writestr('3D/_rels/3dmodel.model.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(rels) + '</Relationships>')
        for nome_arq, xml in arquivos.items():
            z.writestr(nome_arq, xml)
        z.writestr('Metadata/model_settings.config', config)
        z.writestr('Metadata/slice_info.config', '<?xml version="1.0" encoding="UTF-8"?><config><header><header_item key="X-BBL-Client-Type" value="slicer"/><header_item key="X-BBL-Client-Version" value="02.07.01.57"/></header></config>')
    tmp.replace(caminho)


def empacotar(pecas, P, reservado=None):
    """Prateleiras simples. pecas: [(chave, larg, alt)] -> placas [(chave, x, y, larg, alt)].

    reservado: retângulo (x0, y0, x1, y1) em mm da mesa que fica livre (torre de purga).
    """
    util = P.mesa - 2 * P.margem_mesa
    m = P.margem_mesa
    bate = lambda x, y, w, h: reservado is not None and not (
        x + m + w <= reservado[0] or x + m >= reservado[2] or y + m + h <= reservado[1] or y + m >= reservado[3])
    placas, atual = [], []
    x = y = alt_linha = 0.0
    for chave, w, h in sorted(pecas, key=lambda p: -p[2]):
        if w > util or h > util:
            raise ValueError(f'{chave} não cabe na mesa')
        while True:
            if x + w > util:
                x, y, alt_linha = 0.0, y + alt_linha + P.espaco, 0.0
            if y + h > util:
                placas.append(atual)
                atual, x, y, alt_linha = [], 0.0, 0.0, 0.0
                continue
            if bate(x, y, w, h):
                x = reservado[2] - m + P.espaco
                continue
            break
        atual.append((chave, x + m, y + m, w, h))
        x += w + P.espaco
        alt_linha = max(alt_linha, h)
    placas.append(atual)
    return [centralizar(pl, P, reservado) for pl in placas]


def centralizar(placa, P, reservado=None):
    """Leva o conjunto de peças para o centro da mesa, longe das bordas (21/11: bases descolaram
    na impressão; a causa principal era a mesa a 35 °C, ver perfil_bambu). Se o centro bater na
    área da torre, aproxima de volta da frente até não bater."""
    if not placa:
        return placa
    x0 = min(p[1] for p in placa); y0 = min(p[2] for p in placa)
    x1 = max(p[1] + p[3] for p in placa); y1 = max(p[2] + p[4] for p in placa)
    dx = max(0.0, P.mesa / 2 - (x0 + x1) / 2)
    dy0 = max(0.0, P.mesa / 2 - (y0 + y1) / 2)
    bate = lambda dy: reservado is not None and any(not (
        x + dx + w <= reservado[0] or x + dx >= reservado[2] or y + dy + h <= reservado[1] or y + dy >= reservado[3])
        for _, x, y, w, h in placa)
    for passo in range(21):
        dy = dy0 * (1 - passo / 20)
        if not bate(dy):
            return [(k, x + dx, y + dy, w, h) for k, x, y, w, h in placa]
    return placa


# ---------------------------------------------------------------- prévias

def previa_metade(corpo, relevo, furos, escala=max(1, round(0.254 / S))):
    img = np.full((*corpo.shape, 3), 200, np.uint8)
    img[corpo] = 255
    img[relevo] = 0
    for r, c in furos:
        cv2.circle(img, (c, r), int(1.0 / S), (40, 40, 220), 2)
    return cv2.resize(img, None, fx=1 / escala, fy=1 / escala, interpolation=cv2.INTER_AREA)


def previa_placa(placa, mascaras, P, px_mm=4, reservado=None):
    """Vista de cima da mesa: corpo branco, relevo preto, bases cinza, área da torre tracejada."""
    n = int(P.mesa * px_mm)
    img = np.full((n, n, 3), 175, np.uint8)
    cv2.rectangle(img, (0, 0), (n - 1, n - 1), (90, 90, 90), 2)
    if reservado:
        x0, y0, x1, y1 = (int(v * px_mm) for v in reservado)
        cv2.rectangle(img, (x0, n - y1), (x1, n - y0), (40, 40, 200), 2)
        cv2.putText(img, 'torre', (x0 + 8, n - y1 + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (40, 40, 200), 2)
    for chave, x, y, w, h in placa:
        corpo, relevo = mascaras[chave]
        tam = (max(1, int(w * px_mm)), max(1, int(h * px_mm)))
        c = cv2.resize(corpo.astype(np.uint8), tam, interpolation=cv2.INTER_AREA) > 0
        x0, y0 = int(x * px_mm), n - int((y + h) * px_mm)
        reg = img[y0:y0 + c.shape[0], x0:x0 + c.shape[1]]
        reg[c] = (120, 120, 120) if relevo is None else (255, 255, 255)
        if relevo is not None:
            r = cv2.resize(relevo.astype(np.uint8) * 255, tam, interpolation=cv2.INTER_AREA) > 96
            reg[r] = (0, 0, 0)
    return img


# ---------------------------------------------------------------- principal

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('lista', type=Path)
    ap.add_argument('--modo', choices=['duas-metades', 'peca-unica'], default='duas-metades')
    ap.add_argument('--estilo', choices=['fino', 'borda'], default='fino',
                    help='fino (contorno fino, padrão dos testes desde 18/11) ou borda (borda grossa)')
    ap.add_argument('--encaixe', choices=['base', 'gabarito', 'pinos'], default=Param.encaixe,
                    help='duas metades: base (padrão: a fenda da base alinha as metades na colagem), '
                         'gabarito de colagem impresso (D029) ou furos para pino solto')
    ap.add_argument('--encaixe-base', choices=['retangular', 'mola', 'conico'], default=Param.encaixe_base,
                    help='retangular (padrão, D042: uma lingueta reta, como nas primeiras versões), mola (D043, '
                         'reprovada no teste: a fenda retangular com uma lâmina que aperta a lingueta) ou conico (D031: duas '
                         'linguetas cônicas). A lista pode pedir bases de teste por modelo ("bases_teste")')
    ap.add_argument('--mola-lamina', type=float, default=Param.mola_lamina, help='mola: espessura da lâmina (mm)')
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--margem', type=float, default=Param.margem_mesa, help='margem da borda da mesa (mm)')
    ap.add_argument('--espaco', type=float, default=Param.espaco, help='espaço entre peças (mm)')
    ap.add_argument('--bico', type=float, default=Param.bico, help='diâmetro do bico (mm)')
    ap.add_argument('--traco', choices=['original', 'engrossado'], default=Param.traco,
                    help='original: traço do PDF a 600 dpi (padrão); engrossado: engrossa tudo por igual (--engorda)')
    ap.add_argument('--engorda', type=float, default=Param.engorda, help='modo engrossado: mm de cada lado')
    ap.add_argument('--paredes', choices=['arachne', 'classic', 'perfil'], default=Param.paredes,
                    help='gerador de paredes gravado nos objetos do 3MF; perfil = não grava (usa o do perfil)')
    ap.add_argument('--so', action='append', help='gera só estas artes (diagnóstico)')
    ap.add_argument('--acabamento', choices=list(ACABAMENTOS), default=Param.acabamento,
                    help='duas metades: preto-relevo (padrão), branco-relevo ou pintado; peça única: preto-relevo ou '
                         'pintado (desenho rente nas duas faces, D032); a lista pode '
                         'pedir um por modelo ("acabamento")')
    ap.add_argument('--sulco-engorda', type=float, default=Param.sulco_engorda,
                    help='branco-relevo: alarga as linhas pretas (sulcos), mm de cada lado')
    ap.add_argument('--corpo', type=float, default=Param.corpo, help='espessura do corpo (mm)')
    ap.add_argument('--relevo-mm', type=float, default=Param.relevo, help='altura do relevo (mm)')
    ap.add_argument('--face-mm', type=float, default=Param.camada_mesa,
                    help='espessura do desenho rente em cada face (peça única e pintado), mm')
    ap.add_argument('--miolo', choices=['preto', 'branco'], default=Param.miolo,
                    help='acabamento pintado: miolo preto (padrão, D036: branco só nas áreas brancas do desenho) ou branco')
    ap.add_argument('--nome-na-base', action='store_true', help='escreve o nome da unidade na borda da base')
    ap.add_argument('--sem-numero', action='store_true',
                    help='com --nome-na-base, não escreve o número da unidade na borda de trás (D035)')
    ap.add_argument('--lateral-preta', type=float, default=Param.lateral_preta,
                    help='mm de faixa preta na lateral das figuras, em toda a altura (D034); 0 desliga')
    ap.add_argument('--placas', choices=['unidade', 'acabamento'], default=Param.placas,
                    help='unidade (padrão, D037): uma placa por unidade da lista, com as bases; '
                         'acabamento: placas por acabamento (--bases-junto decide as bases)')
    ap.add_argument('--bases-junto', choices=['auto', 'sim', 'nao'], default=Param.bases_junto,
                    help='bases na placa das figuras, o que couber (D033); auto = na peça única ou com lateral preta')
    a = ap.parse_args()
    P = Param(margem_mesa=a.margem, espaco=a.espaco, bico=a.bico, traco=a.traco, engorda=a.engorda,
              paredes='' if a.paredes == 'perfil' else a.paredes,
              acabamento=a.acabamento, sulco_engorda=a.sulco_engorda, corpo=a.corpo, relevo=a.relevo_mm, camada_mesa=a.face_mm, miolo=a.miolo, placas=a.placas,
              encaixe=a.encaixe, encaixe_base=a.encaixe_base, mola_lamina=a.mola_lamina,
              nome_na_base=a.nome_na_base, numero_na_base=not a.sem_numero, bases_junto=a.bases_junto, lateral_preta=a.lateral_preta)
    duas = a.modo == 'duas-metades'
    acab_de = lambda m: m.get('acabamento', P.acabamento)
    if P.lingueta_prof > P.base_altura:
        sys.exit('lingueta mais funda que a base: sobraria por baixo da fenda vazada')
    t0 = time.time()
    lista = json.loads(a.lista.read_text(encoding='utf-8'))
    pdf = Path(lista['pdf']['caminho'])
    sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if sha != lista['pdf']['sha256']:
        sys.exit(f'PDF diferente do esperado: {sha}')
    doc = pymupdf.open(pdf)
    saida = a.saida
    for sub in ('stl', 'previas'):
        (saida / sub).mkdir(parents=True, exist_ok=True)
    for velho in (saida / 'previas').glob('placa-*.png'):   # prévias de placas de uma geração anterior
        velho.unlink()

    if a.so:
        lista['modelos'] = [m for m in lista['modelos'] if m['arte'] in a.so]
    numerar(lista['modelos'])
    for m in lista['modelos']:
        if acab_de(m) not in ACABAMENTOS or (not duas and acab_de(m) not in ('preto-relevo', 'pintado')):
            sys.exit(f'acabamento {acab_de(m)!r} não existe neste modo ({m["unidade"]})')
    usadas = sorted({m['arte'] for m in lista['modelos']})
    artes, objetos_fig, mascaras, checks, stl = {}, {}, {}, [], []
    objetos_gab, gabaritos = {}, {}
    for chave in usadas:
        info = lista['artes'][chave]
        pagina = info['pagina'][a.estilo]
        linhas, _ = G.extrair_pagina(doc, pagina, DPI)
        L = linhas[info['linha']]
        frente_sil = G.silhueta(L.frente, DPI)
        alvo = frente_sil[:, ::-1]
        verso_al, iou_fv = registrar_verso(alvo, L.verso)
        rel_f = tinta(L.frente, frente_sil)
        rel_v = tinta(verso_al, alvo)
        fino_antes = (fracao_fina(rel_f, P.bico), fracao_fina(rel_v, P.bico))
        # a engorda (modo engrossado) vai para a malha pelo vetor (secao); aqui só nas prévias e métricas
        corpo_f, lado, med = corpo_com_lingueta(frente_sil, P)
        pad = lambda m: np.pad(m, ((P.pad, corpo_f.shape[0] - m.shape[0] - P.pad), (lado, lado)))
        rel_f, rel_v = pad(rel_f), pad(rel_v)
        sil_f, sil_v = pad(frente_sil), pad(alvo)
        vis_f, vis_v = engordar(rel_f, P.engorda_malha) & sil_f, engordar(rel_v, P.engorda_malha) & sil_v
        corpo_v = corpo_f[:, ::-1]
        assert np.array_equal(corpo_v[:, ::-1], corpo_f)
        if duas:
            furos_f = posicionar_furos(pad(frente_sil), P) if P.encaixe == 'pinos' else []
            if P.encaixe == 'gabarito':
                gab, med_gab = gabarito(corpo_v, P)
                bmin = gab.bounding_box()
                objetos_gab[f'gabarito-{chave}'] = (f'Gabarito {info["rotulo"]}', [(gab.translate((-bmin[0], -bmin[1], 0)), 0, 'Gabarito')])
                checks.append(checar(f'gabarito-{chave}', gab))
                bb = gab.bounding_box()
                med_gab['dim_mm'] = [round(bb[3] - bb[0], 2), round(bb[4] - bb[1], 2)]
                gabaritos[chave] = med_gab
                mascaras[f'gabarito-{chave}'] = (np.ones((int(med_gab['dim_mm'][1] / S), int(med_gab['dim_mm'][0] / S)), bool), None)
            furos_v = [(r, corpo_f.shape[1] - 1 - c) for r, c in furos_f]
            pecas = []
            for ac in sorted({acab_de(m) for m in lista['modelos'] if m['arte'] == chave}, key=list(ACABAMENTOS).index):
                for lado, corpo_m, rel_m, vis_m, sil_m, furos, furos_esp in (
                        ('frente', corpo_f, rel_f, vis_f, sil_f, furos_f, furos_v),
                        ('verso', corpo_v, rel_v, vis_v, sil_v, furos_v, furos_f)):
                    if ac == 'branco-relevo':
                        corpo3, relevo3 = metade_branco_relevo(corpo_m, sil_m, rel_m, furos, P)
                        branco = sil_m & ~engordar(rel_m, P.sulco_engorda)
                        pecas.append((ac, lado, corpo_m, corpo_m & ~branco,
                                      [(corpo3, 1, 'Preto - corpo'), (relevo3, 0, 'Branco - relevo')]))
                    elif ac == 'pintado':
                        # desenho na face da mesa: tudo espelhado, inclusive contorno e furos
                        pecas.append((ac, lado, corpo_m[:, ::-1], vis_m[:, ::-1],
                                      metade_pintada(corpo_m[:, ::-1], rel_m[:, ::-1], furos_esp, P, sil_m[:, ::-1])))
                    else:
                        corpo3, relevo3 = metade(corpo_m, rel_m, furos, P)
                        pecas.append((ac, lado, corpo_m, vis_m,
                                      [(corpo3, 0, 'Branco - corpo'), (relevo3, 1, 'Preto - relevo')]))
        else:
            # vista de cima: contorno = frente espelhada; face da mesa mostra a frente (espelhada
            # no modelo, lida certa por baixo); relevo em cima = verso como impresso
            furos_f, pecas = [], []
            for ac in sorted({acab_de(m) for m in lista['modelos'] if m['arte'] == chave}, key=list(ACABAMENTOS).index):
                if ac == 'pintado':
                    pecas.append((ac, 'peca', corpo_v, vis_v, peca_unica_pintada(corpo_v, rel_f[:, ::-1], rel_v, P, sil_v)))
                else:
                    branco3, preto3, relevo3 = peca_unica(corpo_v, rel_f[:, ::-1], rel_v, P)
                    pecas.append((ac, 'peca', corpo_v, vis_v, [(branco3, 0, 'Branco - corpo'),
                                                               (preto3, 1, 'Preto - desenho na mesa'),
                                                               (relevo3, 1, 'Preto - relevo')]))
        dims = None
        for ac, lado, corpo_m, rel_m, partes3 in pecas:
            bmin = partes3[0][0]                     # o corpo inteiro, antes de recortar a lateral
            for m_p, _, _ in partes3[1:]:
                bmin = bmin + m_p
            bmin = bmin.bounding_box()
            desl = (-bmin[0], -bmin[1], 0)
            partes3 = [(m.translate(desl), cor, rot) for m, cor, rot in lateral_preta(partes3, corpo_m, P)]
            k = f'{chave}-{ac}-{lado}'
            nome = info['rotulo'] + ('' if ac == P.acabamento else f' ({ACABAMENTOS[ac]})') + (f' - {lado}' if duas else '')
            objetos_fig[k] = (nome, partes3)
            mascaras[k] = (corpo_m, rel_m | anel_px(corpo_m, P))
            checks += [checar(f'{k} {rot}', m) for m, _, rot in partes3]
            uniao = partes3[0][0]
            for m, _, _ in partes3[1:]:
                uniao = uniao + m
            para_trimesh(uniao).export(saida / 'stl' / f'{k}.stl')
            stl.append(f'stl/{k}.stl')
            bb = uniao.bounding_box()
            dims = [round(bb[3] - bb[0], 2), round(bb[4] - bb[1], 2)]
        # prévia: frente como vista pela frente e verso como visto por trás, nos dois modos
        sep = np.full((previa_metade(corpo_f, vis_f, []).shape[0], 12, 3), 200, np.uint8)
        furos_v = [(r, corpo_f.shape[1] - 1 - c) for r, c in furos_f]
        cv2.imwrite(str(saida / 'previas' / f'{chave}.png'),
                    np.hstack([previa_metade(corpo_f, vis_f | anel_px(corpo_f, P), furos_f), sep,
                               previa_metade(corpo_v, vis_v | anel_px(corpo_v, P), furos_v)]))
        artes[chave] = {
            'rotulo': info['rotulo'], 'pagina_pdf': pagina, 'linha': info['linha'], 'estilo': a.estilo,
            'iou_frente_verso': round(iou_fv, 3), 'furos_por_metade': len(furos_f),
            'preto_fino_frente_pdf': round(fino_antes[0], 3), 'preto_fino_verso_pdf': round(fino_antes[1], 3),
            'preto_fino_frente': round(fracao_fina(vis_f, P.bico), 3), 'preto_fino_verso': round(fracao_fina(vis_v, P.bico), 3),
            'peca_mm': dims, **med,
        }

    def bases_do_modelo(m):
        """[(chave, Param, texto da borda de trás)]: a base do modelo ou, se a lista pedir
        "bases_teste" (ex.: [{"encaixe_base": "mola", "mola_lamina": 0.6, "rotulo": "MOLA 0,6"}]),
        uma base por item, todas na placa do modelo, com o rótulo no lugar do número."""
        num = m['numero'] if P.nome_na_base and P.numero_na_base else None
        if 'bases_teste' not in m:
            return [(chave_base(m, P, duas), P, num)]
        saida_b = []
        for bt in m['bases_teste']:
            Pb = replace(P, encaixe_base=bt.get('encaixe_base', P.encaixe_base),
                         mola_lamina=bt.get('mola_lamina', P.mola_lamina))
            if (Pb.encaixe_base == 'conico') != (P.encaixe_base == 'conico'):
                sys.exit('bases_teste: a base cônica só serve na lingueta cônica, e vice-versa')
            rot = bt.get('rotulo')
            sufixo = re.sub(r'[^a-z0-9]+', '-', (rot or f'{Pb.encaixe_base} {Pb.mola_lamina}').lower()).strip('-')
            saida_b.append((f'{chave_base(m, P, duas)}-{sufixo}', Pb, rot if rot else num))
        return saida_b

    bases_def, objetos_base = {}, {}
    for m in lista['modelos']:
        chave_b, bdef = m['base'], lista['bases'][m['base']]
        nome_u = m['unidade'] if P.nome_na_base else None
        for kb, Pb, num_u in bases_do_modelo(m):
            if kb in bases_def:
                continue
            partes_b, med_b = base(bdef['forma'], bdef['mm'], Pb, espessura_peca(duas, acab_de(m), P), nome=nome_u, numero=num_u)
            rotulo = f'Base {chave_b}' + (f' - {num_u} {nome_u}' if num_u is not None and nome_u
                                          else f' - {nome_u or num_u}' if nome_u or num_u is not None else '')
            objetos_base[kb] = (rotulo, partes_b)
            checks += [checar(f'{kb} {rot}', m_b) for m_b, _, rot in partes_b]
            solido = partes_b[0][0]
            for m_b, _, _ in partes_b[1:]:
                solido = solido + m_b
            para_trimesh(solido).export(saida / 'stl' / f'{kb}.stl')
            stl.append(f'stl/{kb}.stl')
            bb = solido.bounding_box()
            hh, ww = int((bb[4] - bb[1]) / S), int((bb[3] - bb[0]) / S)
            yy, xx = np.ogrid[:hh, :ww]
            elipse = ((xx - ww / 2) / (ww / 2)) ** 2 + ((yy - hh / 2) / (hh / 2)) ** 2 <= 1
            mascaras[kb] = (elipse, None)
            bases_def[kb] = {**bdef, **med_b, 'encaixe_base': Pb.encaixe_base,
                             'dim_mm': [round(bb[3] - bb[0], 2), round(bb[4] - bb[1], 2)]}

    # encaixe figura x base
    for m in lista['modelos']:
        art, bd = artes[m['arte']], lista['bases'][m['base']]
        meio_eixo = bd['mm'][0] / 2
        art.setdefault('base', m['base'])
        art['sobra_lateral_mm'] = round(max(art['figura_esq_mm'], art['figura_dir_mm']) - meio_eixo, 2)

    # instâncias e placas
    pecas_fig, pecas_base = {ac: [] for ac in ACABAMENTOS}, []
    for m in lista['modelos']:
        for i in range(m['qtd']):
            for lado in (('frente', 'verso') if duas else ('peca',)):
                pecas_fig[acab_de(m)].append((f'{m["arte"]}-{acab_de(m)}-{lado}', *artes[m['arte']]['peca_mm']))
            for kb, _, _ in bases_do_modelo(m):
                pecas_base.append((kb, *bases_def[kb]['dim_mm']))
    # cada acabamento numa placa própria: misturados, cada camada teria as duas cores
    usados_ac = [ac for ac in ACABAMENTOS if pecas_fig[ac]]
    # com lateral preta (D034) toda camada das figuras tem as duas cores: a torre cresce como a das
    # bases e, em y = 220, saía da mesa (CLI, 18/11)
    area_fig, torre_fig = (P.torre_xyxy_bases, P.torre_pos_bases) if P.lateral_preta > 0 else (P.torre_xyxy, P.torre_pos)
    grupos_fig = [('Figuras' if len(usados_ac) == 1 else f'Figuras - {ACABAMENTOS[ac]}',
                   empacotar(pecas_fig[ac], P, reservado=area_fig)) for ac in usados_ac]
    # com nome, a placa de bases tem duas cores e precisa da área da torre livre
    placas_base = empacotar(pecas_base, P, reservado=P.torre_xyxy_bases if P.nome_na_base else None)
    junto = P.bases_junto == 'sim' or (P.bases_junto == 'auto' and len(usados_ac) == 1
                                       and (not duas or P.lateral_preta > 0))
    com_bases = {'Bases', 'Figuras e bases'}
    if P.placas == 'unidade':
        # D037: uma unidade por placa, figuras e bases juntas, na ordem do número da unidade.
        # Acabamentos diferentes da mesma unidade vão em placas separadas (com as bases dos seus
        # modelos): misturados, cada camada teria as duas cores
        por_un = {}
        for m in lista['modelos']:
            g = por_un.setdefault((m['numero'], m['unidade'], acab_de(m)), [])
            for i in range(m['qtd']):
                for lado in (('frente', 'verso') if duas else ('peca',)):
                    g.append((f'{m["arte"]}-{acab_de(m)}-{lado}', *artes[m['arte']]['peca_mm']))
                for kb, _, _ in bases_do_modelo(m):
                    g.append((kb, *bases_def[kb]['dim_mm']))
        n_acab = {}
        for n, u, ac in por_un:
            n_acab[(n, u)] = n_acab.get((n, u), 0) + 1
        # ordem: número da unidade; dentro dela, a ordem dos modelos na lista
        grupos_fig = [(f'{n} {u}' + (f' - {ACABAMENTOS[ac]}' if n_acab[(n, u)] > 1 else ''),
                       empacotar(g, P, reservado=P.torre_xyxy_bases))
                      for (n, u, ac), g in sorted(por_un.items(), key=lambda kv: kv[0][0])]
        com_bases |= {nome for nome, _ in grupos_fig}
        placas_base = []
    elif junto:
        if len(usados_ac) != 1:
            sys.exit('--bases-junto sim: só com um acabamento de figura')
        grupos_fig = [('Figuras e bases', empacotar(pecas_fig[usados_ac[0]] + pecas_base, P, reservado=P.torre_xyxy_bases))]
        placas_base = []
    # gabaritos de colagem: um por arte, numa placa de uma cor
    placas_gab = empacotar([(k, *gabaritos[k.removeprefix('gabarito-')]['dim_mm']) for k in objetos_gab], P) if objetos_gab else []
    # um projeto só (pedido do usuário em 18/11): placas de figuras, de bases e de gabaritos
    placas_proj, info_placas, torres = [], [], []
    for nome, placas in grupos_fig + [('Bases', placas_base), ('Gabaritos', placas_gab)]:
        for i, placa in enumerate(placas, 1):
            rotulo = nome if len(placas) == 1 else f'{nome} ({i}/{len(placas)})'
            placas_proj.append((rotulo, [(k, x, y) for k, x, y, _, _ in placa]))
            torres.append(P.torre_pos_bases if nome in com_bases else None if nome == 'Gabaritos' else torre_fig)
            arq_png = f'placa-{len(placas_proj)}-' + re.sub(r'[^a-z0-9]+', '-', rotulo.lower()).strip('-') + '.png'
            cv2.imwrite(str(saida / 'previas' / arq_png),
                        previa_placa(placa, mascaras, P, reservado=None if nome == 'Gabaritos' else area_fig
                                     if nome not in com_bases else (P.torre_xyxy_bases if P.nome_na_base or nome != 'Bases' else None)))
            info_placas.append({'placa': len(placas_proj), 'nome': rotulo, 'pecas': len(placa)})
    try:
        perfis, projeto = B.para_bico(P.bico)
    except (OSError, RuntimeError, KeyError) as e:
        print(f'AVISO: sem perfil embutido ({e}); o Bambu vai carregar só a geometria', file=sys.stderr)
        perfis, projeto = None, None
    arq = f'projeto-{a.modo}-{a.estilo}.3mf'
    escrever_3mf(saida / arq, {**objetos_fig, **objetos_base, **objetos_gab}, placas_proj,
                 ajustes={'wall_generator': P.paredes} if P.paredes else None, projeto=projeto, mesa=P.mesa,
                 torres=torres)
    arquivos = [{'arquivo': arq, 'placas': info_placas, 'perfil_embutido': perfis,
                 'tamanho_mb': round((saida / arq).stat().st_size / 1e6, 2)}]

    # sobreposição na mesa
    for placa in [pl for _, placas in grupos_fig for pl in placas] + placas_base + placas_gab:
        for i, (_, x1, y1, w1, h1) in enumerate(placa):
            assert x1 >= 0 and y1 >= 0 and x1 + w1 <= P.mesa and y1 + h1 <= P.mesa
            for _, x2, y2, w2, h2 in placa[i + 1:]:
                assert x1 + w1 <= x2 or x2 + w2 <= x1 or y1 + h1 <= y2 or y2 + h2 <= y1

    relatorio = {
        'gerador': VERSAO, 'modo': a.modo, 'estilo': a.estilo, 'parametros': asdict(P),
        'encaixe': P.encaixe if duas else None, 'gabaritos': gabaritos,
        'furo_prof_mm': P.furo_prof if duas and P.encaixe == 'pinos' else None,
        'pino_sugerido_mm': [1.75, round(2 * P.furo_prof - 0.1, 2)] if duas and P.encaixe == 'pinos' else None,
        'espessura_lingueta_mm': sorted({round(espessura_peca(duas, acab_de(m), P), 2) for m in lista['modelos']}), 'pdf_sha256': sha,
        'modelos': lista['modelos'], 'total_modelos': sum(m['qtd'] for m in lista['modelos']),
        'total_pecas_figura': sum(map(len, pecas_fig.values())), 'total_bases': len(pecas_base),
        'artes': artes, 'bases': bases_def, 'arquivos_3mf': arquivos, 'stl': stl,
        'checagens_malha': checks, 'tempo_s': round(time.time() - t0, 1),
    }
    (saida / 'relatorio.json').write_text(json.dumps(relatorio, indent=2, ensure_ascii=False), encoding='utf-8')
    falhas = [c for c in checks if not (c['fechada'] and c['normais_consistentes'] and c['volume_mm3'] > 0)]
    print(json.dumps({'arquivos': arquivos, 'falhas_malha': falhas, 'tempo_s': relatorio['tempo_s']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
