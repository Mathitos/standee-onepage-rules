"""Protótipo de geração de standees a partir de uma lista resolvida (docs/PRD-03).

Uso (na raiz do projeto):
  python -I prototipo/gerar.py prototipo/lista-piloto.json --modo duas-metades --estilo borda --saida saidas/piloto

Saídas: 3MF Bambu de figuras (branco/preto) e de bases, STL por peça, prévias PNG,
relatorio.json e LEIA-ME.md. Modo implementado: duas-metades (peca-unica ainda não).
Protótipo de referência para o gerador do site; não é o site.
"""
import argparse
import hashlib
import json
import math
import sys
import time
import zipfile
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import manifold3d as mf
import numpy as np
import pymupdf
import trimesh
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).parent))
import pdf_grade as G  # noqa: E402

S = G.MM_PER_PX
VERSAO = 'prototipo-0.1'


@dataclass
class Param:
    corpo: float = 1.2            # espessura do corpo (de cada metade, ou da peça única), sem relevo
    relevo: float = 0.4
    camada_mesa: float = 0.4      # peça única: espessura do desenho P/B na face da mesa (2 camadas de 0,2)
    lingueta_larg: float = 6.0
    lingueta_prof: float = 3.0
    travessa: float = 0.5         # meia altura da travessa sob os pés
    contato_mm: float = 1.0       # faixa considerada apoio dos pés
    folga_larg: float = 0.3       # folga total da fenda
    folga_esp: float = 0.25
    base_altura: float = 4.0
    fenda_prof: float = 3.2
    furo_diam: float = 2.0        # pino: filamento 1,75 mm
    furo_parede: float = 1.0
    furo_dist_min: float = 6.0
    mesa: float = 256.0           # suposição: mesa 256 x 256 (A1/P1/X1); não confirmada
    margem_mesa: float = 8.0
    espaco: float = 4.0
    # área livre para a torre de purga padrão da A1 (x=15, y=220, largura 35) — só na placa de 2 cores
    torre_xyxy: tuple = (0.0, 205.0, 62.0, 256.0)
    pad: int = 2                  # px de margem no canvas

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
    vs = G.silhueta(verso_cinza)
    ay0, ay1, ax0, ax1 = bbox(alvo)
    vy0, vy1, vx0, vx1 = bbox(vs)
    dy0, dx0 = int(ay1 - vy1), int(round((ax0 + ax1) / 2 - (vx0 + vx1) / 2))
    melhor = (-1.0, dy0, dx0)
    for dy in range(dy0 - 8, dy0 + 9):
        for dx in range(dx0 - 8, dx0 + 9):
            v = iou(deslocar(vs, dy, dx, alvo.shape, False), alvo)
            if v > melhor[0]:
                melhor = (v, dy, dx)
    _, dy, dx = melhor
    return deslocar(verso_cinza, dy, dx, alvo.shape, 255), melhor[0]


def limpar(m, min_px=4):
    rot, n = ndi.label(m)
    if n == 0:
        return m
    areas = ndi.sum(m, rot, range(1, n + 1))
    return np.isin(rot, [i + 1 for i, a in enumerate(areas) if a >= min_px])


def fracao_fina(m, largura_mm=0.4):
    """Fração da área com largura menor que o bico (some numa abertura morfológica)."""
    r = max(1, int(round(largura_mm / S)))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
    aberto = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, k) > 0
    return float(1 - aberto.sum() / max(1, m.sum()))


def corpo_com_lingueta(sil, P):
    """Adiciona margem, travessa sob os pés e lingueta central. Retorna canvas e medidas."""
    h, w = sil.shape
    extra = int(math.ceil((P.travessa + P.lingueta_prof + 1.0) / S))
    m = np.zeros((h + 2 * P.pad + extra, w + 2 * P.pad), bool)
    m[P.pad:P.pad + h, P.pad:P.pad + w] = sil
    fundo = np.where(m.any(1))[0].max()
    k = int(round(P.contato_mm / S))
    cols = np.where(m[fundo - k:fundo + 1].any(0))[0]
    esq, dir_ = int(cols.min()), int(cols.max())
    centro = (esq + dir_) // 2
    t = int(round(P.travessa / S))
    m[fundo - t:fundo + t + 1, esq:dir_ + 1] = True
    apoio = fundo + t
    meia = int(round(P.lingueta_larg / 2 / S))
    prof = int(round(P.lingueta_prof / S))
    if centro - meia < 0 or centro + meia >= m.shape[1]:
        raise ValueError('lingueta maior que a figura')
    m[apoio + 1:apoio + 1 + prof, centro - meia:centro + meia] = True
    cols_fig = np.where(sil.any(0))[0] + P.pad
    return m, {
        'centro_col': int(centro), 'apoio_row': int(apoio),
        'travessa_mm': round((dir_ - esq + 1) * S, 2),
        'lingueta_mm': [round(2 * meia * S, 2), round(prof * S, 2)],
        'figura_esq_mm': round((centro - cols_fig.min()) * S, 2),
        'figura_dir_mm': round((cols_fig.max() - centro) * S, 2),
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

def secao(mask):
    """Máscara -> CrossSection em mm (y para cima), compensando meio pixel da borda."""
    cnts, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    h = mask.shape[0]
    polys = []
    for c in cnts:
        c = cv2.approxPolyDP(c, 0.5, True)
        if len(c) < 3:
            continue
        p = c[:, 0, :].astype(float)
        polys.append(np.column_stack([p[:, 0] * S, (h - p[:, 1]) * S]))
    cs = mf.CrossSection(polys, mf.FillRule.EvenOdd)
    return cs.offset(S / 2, mf.JoinType.Miter, 2.0)


def metade(corpo_mask, relevo_mask, furos, P):
    h = corpo_mask.shape[0]
    contorno = secao(corpo_mask)
    corpo = mf.Manifold.extrude(contorno, P.corpo)
    for r, c in furos:
        cil = mf.Manifold.cylinder(P.furo_prof + 0.01, P.furo_diam / 2, P.furo_diam / 2, 48)
        corpo = corpo - cil.translate((c * S, (h - r) * S, -0.01))
    # o relevo nunca passa da borda do corpo
    relevo = mf.Manifold.extrude(secao(relevo_mask) ^ contorno, P.relevo).translate((0, 0, P.corpo))
    return corpo, relevo


def peca_unica(corpo_mask, preto_mesa_mask, relevo_mask, P):
    """Peça única (D002/D011): desenho P/B na face da mesa, núcleo branco, relevo preto em cima.

    corpo_mask já está no sistema de coordenadas do modelo visto de cima; preto_mesa_mask
    deve vir espelhado (a face é vista por baixo). Branco e preto da camada inferior são
    complementares e coplanares em Z=0.
    """
    contorno = secao(corpo_mask)
    preto_cs = secao(preto_mesa_mask) ^ contorno
    branco_cs = contorno - preto_cs
    cam = P.camada_mesa
    branco = mf.Manifold.extrude(branco_cs, cam) + mf.Manifold.extrude(contorno, P.corpo - cam).translate((0, 0, cam))
    preto_mesa = mf.Manifold.extrude(preto_cs, cam)
    relevo = mf.Manifold.extrude(secao(relevo_mask) ^ contorno, P.relevo).translate((0, 0, P.corpo))
    return branco, preto_mesa, relevo


def base(forma, mm, P, espessura_lingueta):
    a, b = (mm[0] / 2, mm[0] / 2) if forma == 'redonda' else (mm[0] / 2, mm[1] / 2)
    t = np.linspace(0, 2 * math.pi, 192, endpoint=False)
    contorno = mf.CrossSection([np.column_stack([a * np.cos(t), b * np.sin(t)])])
    solido = mf.Manifold.extrude(contorno, P.base_altura)
    fl, fe = P.lingueta_larg + P.folga_larg, espessura_lingueta + P.folga_esp
    fenda = mf.Manifold.cube((fl, fe, P.fenda_prof + 0.01)).translate(
        (-fl / 2, -fe / 2, P.base_altura - P.fenda_prof))
    return (solido - fenda).translate((a, b, 0)), {'fenda_mm': [round(fl, 2), round(fe, 2), P.fenda_prof],
                                                    'fundo_mm': round(P.base_altura - P.fenda_prof, 2)}


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


def escrever_3mf(caminho, objetos, itens):
    """Projeto 3MF no formato do Bambu Studio, sem perfil de impressora embutido.

    objetos: {chave: (nome, [(manifold, cor 0=branco 1=preto, rotulo)])}
    itens: [(chave, x, y)]
    Reproduz o que o próprio Bambu Studio grava: cada cópia é um objeto, com arquivo
    3D/Objects/object_k.model; a malha fica só no arquivo da primeira cópia e as
    demais apontam para ele (o arquivo não cresce com as cópias). Os ids de malhas e
    de objetos montados compartilham UM espaço global (ids repetidos entre arquivos
    fazem o Bambu misturar malhas: conflitos e "fora da mesa").
    """
    preparadas = {}
    for chave, (nome, partes) in objetos.items():
        # convenção do Bambu: malha centrada na origem; a posição vai no item
        caixas = np.array([m.bounding_box() for m, _, _ in partes])
        lo, hi = caixas[:, :3].min(0), caixas[:, 3:].max(0)
        c = (lo + hi) / 2
        preparadas[chave] = (nome, [(m.translate(tuple(-c)), cor, rot) for m, cor, rot in partes], c - lo)
    arquivos, rels, dono, recursos, cfg, build, instancias, cortes, contagem = {}, [], {}, [], [], [], [], [], {}
    proximo_id = 1
    for k, (chave, x, y) in enumerate(itens, 1):
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
                   f'<metadata key="extruder" value="1"/><metadata face_count="{sum(faces)}"/>{partes_cfg}</object>\n')
        cx, cy, cz = centro
        build.append(f'<item objectid="{oid}" p:UUID="{UUID_ITEM.format(oid)}" '
                     f'transform="1 0 0 0 1 0 0 0 1 {x + cx:.3f} {y + cy:.3f} {cz:.3f}" printable="1"/>\n')
        instancias.append(f'<model_instance><metadata key="object_id" value="{oid}"/>'
                          '<metadata key="instance_id" value="0"/>'
                          f'<metadata key="identify_id" value="{100 + k}"/></model_instance>')
        cortes.append(f'<object id="{oid}"><cut_id id="0" check_sum="1" connectors_cnt="0"/></object>')
    principal = (f'{CABECALHO}<metadata name="Application">BambuStudio-02.00.02.01</metadata>\n'
                 f'<resources>\n{"".join(recursos)}</resources>\n'
                 f'<build p:UUID="{UUID_BUILD}">\n{"".join(build)}</build>\n</model>\n')
    placa = ('<plate><metadata key="plater_id" value="1"/><metadata key="plater_name" value=""/>'
             '<metadata key="locked" value="false"/><metadata key="filament_map_mode" value="Auto For Flush"/>'
             f'<metadata key="gcode_file" value=""/>{"".join(instancias)}</plate>')
    config = f'<?xml version="1.0" encoding="UTF-8"?>\n<config>\n{"".join(cfg)}{placa}\n<assemble>\n</assemble>\n</config>\n'
    arquivos['Metadata/cut_information.xml'] = f'<?xml version="1.0" encoding="utf-8"?>\n<objects>{"".join(cortes)}</objects>\n'
    arquivos['Metadata/filament_sequence.json'] = '{"plate_1":{"nozzle_sequence":[],"optimal_assignment":[],"sequence":[]}}'
    tmp = Path(str(caminho) + '.tmp')
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="gcode" ContentType="text/x.gcode"/></Types>')
        z.writestr('_rels/.rels', f'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="{REL_3DMODEL}"/></Relationships>')
        z.writestr('3D/3dmodel.model', principal)
        z.writestr('3D/_rels/3dmodel.model.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(rels) + '</Relationships>')
        for nome_arq, xml in arquivos.items():
            z.writestr(nome_arq, xml)
        z.writestr('Metadata/model_settings.config', config)
        z.writestr('Metadata/slice_info.config', '<?xml version="1.0" encoding="UTF-8"?><config><header><header_item key="X-BBL-Client-Type" value="slicer"/><header_item key="X-BBL-Client-Version" value="02.00.02.01"/></header></config>')
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
    return placas


# ---------------------------------------------------------------- prévias

def previa_metade(corpo, relevo, furos, escala=3):
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
    ap.add_argument('--estilo', choices=['fino', 'borda'], default='borda')
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--margem', type=float, default=Param.margem_mesa, help='margem da borda da mesa (mm)')
    ap.add_argument('--espaco', type=float, default=Param.espaco, help='espaço entre peças (mm)')
    a = ap.parse_args()
    P = Param(margem_mesa=a.margem, espaco=a.espaco)
    duas = a.modo == 'duas-metades'
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

    usadas = sorted({m['arte'] for m in lista['modelos']})
    artes, objetos_fig, mascaras, checks, stl = {}, {}, {}, [], []
    for chave in usadas:
        info = lista['artes'][chave]
        pagina = info['pagina'][a.estilo]
        linhas, _ = G.extrair_pagina(doc, pagina)
        L = linhas[info['linha']]
        frente_sil = G.silhueta(L.frente)
        alvo = frente_sil[:, ::-1]
        verso_al, iou_fv = registrar_verso(alvo, L.verso)
        rel_f = limpar((L.frente < G.DARK) & frente_sil)
        rel_v = limpar((verso_al < G.DARK) & alvo)
        corpo_f, med = corpo_com_lingueta(frente_sil, P)
        pad = lambda m: np.pad(m, ((P.pad, corpo_f.shape[0] - m.shape[0] - P.pad), (P.pad, P.pad)))
        rel_f, rel_v = pad(rel_f), pad(rel_v)
        corpo_v = corpo_f[:, ::-1]
        assert np.array_equal(corpo_v[:, ::-1], corpo_f)
        if duas:
            furos_f = posicionar_furos(pad(frente_sil), P)
            furos_v = [(r, corpo_f.shape[1] - 1 - c) for r, c in furos_f]
            pecas = []
            for lado, corpo_m, rel_m, furos in (('frente', corpo_f, rel_f, furos_f),
                                                ('verso', corpo_v, rel_v, furos_v)):
                corpo3, relevo3 = metade(corpo_m, rel_m, furos, P)
                pecas.append((lado, corpo_m, rel_m,
                              [(corpo3, 0, 'Branco - corpo'), (relevo3, 1, 'Preto - relevo')]))
        else:
            # vista de cima: contorno = frente espelhada; face da mesa mostra a frente (espelhada
            # no modelo, lida certa por baixo); relevo em cima = verso como impresso
            furos_f = []
            branco3, preto3, relevo3 = peca_unica(corpo_v, rel_f[:, ::-1], rel_v, P)
            pecas = [('peca', corpo_v, rel_v, [(branco3, 0, 'Branco - corpo'),
                                                (preto3, 1, 'Preto - desenho na mesa'),
                                                (relevo3, 1, 'Preto - relevo')])]
        dims = None
        for sufixo, corpo_m, rel_m, partes3 in pecas:
            bmin = partes3[0][0].bounding_box()
            desl = (-bmin[0], -bmin[1], 0)
            partes3 = [(m.translate(desl), cor, rot) for m, cor, rot in partes3]
            k = f'{chave}-{sufixo}'
            nome = f'{info["rotulo"]} - {sufixo}' if duas else info['rotulo']
            objetos_fig[k] = (nome, partes3)
            mascaras[k] = (corpo_m, rel_m)
            checks += [checar(f'{k} {rot}', m) for m, _, rot in partes3]
            uniao = partes3[0][0]
            for m, _, _ in partes3[1:]:
                uniao = uniao + m
            para_trimesh(uniao).export(saida / 'stl' / f'{k}.stl')
            stl.append(f'stl/{k}.stl')
            bb = partes3[0][0].bounding_box()
            dims = [round(bb[3] - bb[0], 2), round(bb[4] - bb[1], 2)]
        # prévia: frente como vista pela frente e verso como visto por trás, nos dois modos
        sep = np.full((previa_metade(corpo_f, rel_f, []).shape[0], 12, 3), 200, np.uint8)
        furos_v = [(r, corpo_f.shape[1] - 1 - c) for r, c in furos_f]
        cv2.imwrite(str(saida / 'previas' / f'{chave}.png'),
                    np.hstack([previa_metade(corpo_f, rel_f, furos_f), sep, previa_metade(corpo_v, rel_v, furos_v)]))
        artes[chave] = {
            'rotulo': info['rotulo'], 'pagina_pdf': pagina, 'linha': info['linha'], 'estilo': a.estilo,
            'iou_frente_verso': round(iou_fv, 3), 'furos_por_metade': len(furos_f),
            'preto_fino_frente': round(fracao_fina(rel_f), 3), 'preto_fino_verso': round(fracao_fina(rel_v), 3),
            'peca_mm': dims, **med,
        }

    bases_def, objetos_base = {}, {}
    for chave_b, bdef in lista['bases'].items():
        if not any(m['base'] == chave_b for m in lista['modelos']):
            continue
        solido, med_b = base(bdef['forma'], bdef['mm'], P, (2 if duas else 1) * P.corpo)
        # bases numa cor só (filamento 1, cor à escolha): sem torre de purga
        objetos_base[f'base-{chave_b}'] = (f'Base {chave_b}', [(solido, 0, 'Base')])
        checks.append(checar(f'base-{chave_b}', solido))
        para_trimesh(solido).export(saida / 'stl' / f'base-{chave_b}.stl')
        stl.append(f'stl/base-{chave_b}.stl')
        bb = solido.bounding_box()
        hh, ww = int((bb[4] - bb[1]) / S), int((bb[3] - bb[0]) / S)
        yy, xx = np.ogrid[:hh, :ww]
        elipse = ((xx - ww / 2) / (ww / 2)) ** 2 + ((yy - hh / 2) / (hh / 2)) ** 2 <= 1
        mascaras[f'base-{chave_b}'] = (elipse, None)
        bases_def[chave_b] = {**bdef, **med_b, 'dim_mm': [round(bb[3] - bb[0], 2), round(bb[4] - bb[1], 2)]}

    # encaixe figura x base
    for m in lista['modelos']:
        art, bd = artes[m['arte']], lista['bases'][m['base']]
        meio_eixo = bd['mm'][0] / 2
        art.setdefault('base', m['base'])
        art['sobra_lateral_mm'] = round(max(art['figura_esq_mm'], art['figura_dir_mm']) - meio_eixo, 2)

    # instâncias e placas
    pecas_fig, pecas_base = [], []
    for m in lista['modelos']:
        for i in range(m['qtd']):
            for sufixo in (('frente', 'verso') if duas else ('peca',)):
                pecas_fig.append((f'{m["arte"]}-{sufixo}', *artes[m['arte']]['peca_mm']))
            pecas_base.append((f'base-{m["base"]}', *bases_def[m['base']]['dim_mm']))
    placas_fig = empacotar(pecas_fig, P, reservado=P.torre_xyxy)
    placas_base = empacotar(pecas_base, P)
    arquivos = []
    for nome, objetos, placas in (('figuras', objetos_fig, placas_fig), ('bases', objetos_base, placas_base)):
        for i, placa in enumerate(placas, 1):
            sufixo = f'-placa{i}' if len(placas) > 1 else ''
            arq = f'{nome}-{a.modo}-{a.estilo}{sufixo}.3mf'
            usados = {k for k, *_ in placa}
            escrever_3mf(saida / arq, {k: v for k, v in objetos.items() if k in usados},
                         [(k, x, y) for k, x, y, _, _ in placa])
            reservado = P.torre_xyxy if nome == 'figuras' else None
            cv2.imwrite(str(saida / 'previas' / f'placa-{nome}{sufixo}.png'),
                        previa_placa(placa, mascaras, P, reservado=reservado))
            arquivos.append({'arquivo': arq, 'pecas': len(placa),
                             'tamanho_mb': round((saida / arq).stat().st_size / 1e6, 2)})

    # sobreposição na mesa
    for placa in placas_fig + placas_base:
        for i, (_, x1, y1, w1, h1) in enumerate(placa):
            assert x1 >= 0 and y1 >= 0 and x1 + w1 <= P.mesa and y1 + h1 <= P.mesa
            for _, x2, y2, w2, h2 in placa[i + 1:]:
                assert x1 + w1 <= x2 or x2 + w2 <= x1 or y1 + h1 <= y2 or y2 + h2 <= y1

    relatorio = {
        'gerador': VERSAO, 'modo': a.modo, 'estilo': a.estilo, 'parametros': asdict(P),
        'furo_prof_mm': P.furo_prof if duas else None,
        'pino_sugerido_mm': [1.75, round(2 * P.furo_prof - 0.1, 2)] if duas else None,
        'espessura_lingueta_mm': round((2 if duas else 1) * P.corpo, 2), 'pdf_sha256': sha,
        'modelos': lista['modelos'], 'total_modelos': sum(m['qtd'] for m in lista['modelos']),
        'total_pecas_figura': len(pecas_fig), 'total_bases': len(pecas_base),
        'artes': artes, 'bases': bases_def, 'arquivos_3mf': arquivos, 'stl': stl,
        'checagens_malha': checks, 'tempo_s': round(time.time() - t0, 1),
    }
    (saida / 'relatorio.json').write_text(json.dumps(relatorio, indent=2, ensure_ascii=False), encoding='utf-8')
    falhas = [c for c in checks if not (c['fechada'] and c['normais_consistentes'] and c['volume_mm3'] > 0)]
    print(json.dumps({'arquivos': arquivos, 'falhas_malha': falhas, 'tempo_s': relatorio['tempo_s']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
