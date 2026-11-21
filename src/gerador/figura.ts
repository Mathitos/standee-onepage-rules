/**
 * Figura em peça única pintada (D032), port de prototipo/gerar.py: secao, corpo_com_lingueta,
 * peca_unica_pintada e lateral_preta. Toda a geometria 2D fica em mm, y para cima, como no
 * protótipo; as contas de pixel (fundo da figura, colunas de apoio, linguetas) usam os pixels
 * de 600 dpi do SVG, com os centros nos inteiros.
 */
import type { CrossSection, Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d'
import type { Malha } from './manifold'
import { S, meioEntrePx, type Parametros } from './parametros'
import type { FaceSvg, Poligono } from './svg'

export interface Parte {
  malha: Manifold
  /** 0 = filamento 1 (branco), 1 = filamento 2 (preto) */
  cor: 0 | 1
  rotulo: string
}

/** prototipo secao(): polígonos (centros, px, y para baixo) -> mm, y para cima, meio pixel para fora. */
export function secao(w: ManifoldToplevel, polys: Poligono[], H: number): CrossSection {
  const mm = polys.map((p) => p.map(([x, y]) => [x * S, (H - y) * S] as Vec2))
  return w.CrossSection.ofPolygons(mm, 'EvenOdd').offset(S / 2, 'Miter', 2.0)
}

/** Polígono em coordenadas contínuas de pixel (centros nos inteiros) -> mm, y para cima. */
function pxParaMm(p: [number, number][], H: number): Vec2[] {
  return p.map(([x, y]) => [x * S, (H - y) * S] as Vec2)
}

export interface MedidasCorpo {
  travessaMm: number
  travessaAlargada: boolean
  linguetas: { entreCentrosMm: number; largJuntoBarraMm: number; largPontaMm: number; profMm: number }
  figuraEsqMm: number
  figuraDirMm: number
}

/**
 * prototipo corpo_com_lingueta(): silhueta + travessa sob os pés + duas linguetas cônicas
 * (D031), simétricas em volta do meio da travessa, a P.linguetaEntre uma da outra em todas as
 * artes. Figura estreita ganha travessa mais larga. Tudo na orientação da frente.
 */
export function corpoComLingueta(w: ManifoldToplevel, sil: CrossSection, H: number, P: Parametros) {
  const b = sil.bounds()
  const fundo = Math.round(H - 0.5 - b.min[1] / S)          // linha do pixel mais baixo
  const k = Math.round(P.contatoMm / S)
  const faixa = w.CrossSection.ofPolygons(
    pxParaMm([[-1e4, fundo - k - 0.5], [1e4, fundo - k - 0.5], [1e4, fundo + 0.5], [-1e4, fundo + 0.5]], H), 'EvenOdd')
  const apoioPes = sil.intersect(faixa).bounds()
  const esq = Math.round(apoioPes.min[0] / S + 0.5)
  const dir = Math.round(apoioPes.max[0] / S - 0.5)
  const centro = Math.floor((esq + dir + 1) / 2)            // fronteira entre colunas: eixo das linguetas
  const D = meioEntrePx(P)
  const meiaTopo = P.linguetaLarg / 2 / S
  const alcance = D + Math.ceil(meiaTopo + P.barraSobra / S)
  const travOrig = (dir - esq + 1) * S
  const esq2 = Math.min(esq, centro - alcance)
  const dir2 = Math.max(dir, centro + alcance - 1)
  const t = Math.round(P.travessa / S)
  const barra = pxParaMm([[esq2 - 0.5, fundo - t - 0.5], [dir2 + 0.5, fundo - t - 0.5],
    [dir2 + 0.5, fundo + t + 0.5], [esq2 - 0.5, fundo + t + 0.5]], H)
  const apoio = fundo + t
  const prof = Math.round(P.linguetaProf / S)
  const linguetas: Vec2[][] = []
  let meiaPonta = 0
  for (const cx of [centro - D, centro + D]) {
    const ladoEsq: [number, number][] = []
    const ladoDir: [number, number][] = []
    for (let i = 0; i < prof; i++) {
      const meia = Math.round(meiaTopo - (i + 0.5) * P.linguetaConicidade)
      meiaPonta = meia
      const y0 = apoio + 0.5 + i
      ladoEsq.push([cx - meia - 0.5, y0], [cx - meia - 0.5, y0 + 1])
      ladoDir.push([cx + meia - 0.5, y0], [cx + meia - 0.5, y0 + 1])
    }
    linguetas.push(pxParaMm([...ladoEsq, ...ladoDir.reverse()], H))
  }
  const corpo = sil.add(w.CrossSection.ofPolygons([barra, ...linguetas], 'EvenOdd'))
  const medidas: MedidasCorpo = {
    travessaMm: round((dir2 - esq2 + 1) * S, 2),
    travessaAlargada: (dir2 - esq2 + 1) * S > travOrig + 1e-6,
    linguetas: {
      entreCentrosMm: round(2 * D * S, 3),
      largJuntoBarraMm: round(2 * Math.round(meiaTopo) * S, 2),
      largPontaMm: round(2 * meiaPonta * S, 2),
      profMm: round(prof * S, 2),
    },
    figuraEsqMm: round((centro - 0.5) * S - b.min[0], 2),
    figuraDirMm: round(b.max[0] - (centro - 0.5) * S, 2),
  }
  return { corpo, medidas }
}

function round(v: number, casas: number) {
  const f = 10 ** casas
  return Math.round(v * f) / f
}

/**
 * Peça única pintada vista de cima (como impressa): a face da mesa mostra a frente espelhada,
 * a de cima mostra o verso como está no SVG (já alinhado à frente espelhada). Miolo preto
 * (D036): peça preta, branco só nas áreas brancas de cada face, dentro da silhueta da arte.
 * Depois troca por preto o branco a menos de P.lateralPreta mm da borda (D034).
 */
export function pecaUnicaPintada(w: ManifoldToplevel, frente: FaceSvg, verso: FaceSvg, P: Parametros) {
  const { largura: W, altura: H } = frente
  if (verso.largura !== W || verso.altura !== H) throw new Error('frente e verso com telas diferentes')
  const silF = secao(w, frente.silhueta, H)
  const { corpo: corpoF, medidas } = corpoComLingueta(w, silF, H, P)
  // vista de cima: espelha a frente no eixo da tela (x -> W - 1 - x nos centros dos pixels)
  const espelhar = (cs: CrossSection) => cs.mirror([1, 0]).translate([(W - 1) * S, 0])
  const contorno = espelhar(corpoF)
  const area = espelhar(silF).intersect(contorno)
  const baixo = espelhar(secao(w, frente.tinta, H)).intersect(contorno)
  const cima = secao(w, verso.tinta, H).intersect(contorno)
  const esp = P.corpo + P.relevo
  const cam = P.camadaMesa
  const { Manifold } = w
  let partes: Parte[]
  if (P.miolo === 'preto') {
    const bMesa = Manifold.extrude(area.subtract(baixo), cam)
    const bCima = Manifold.extrude(area.subtract(cima), cam).translate([0, 0, esp - cam])
    const preto = Manifold.extrude(contorno, esp).subtract(bMesa).subtract(bCima)
    partes = [
      { malha: preto, cor: 1, rotulo: 'Preto - corpo' },
      { malha: bMesa, cor: 0, rotulo: 'Branco - desenho na mesa' },
      { malha: bCima, cor: 0, rotulo: 'Branco - desenho em cima' },
    ]
  } else {
    const branco = Manifold.extrude(contorno.subtract(baixo), cam)
      .add(Manifold.extrude(contorno, esp - 2 * cam).translate([0, 0, cam]))
      .add(Manifold.extrude(contorno.subtract(cima), cam).translate([0, 0, esp - cam]))
    partes = [
      { malha: branco, cor: 0, rotulo: 'Branco - corpo' },
      { malha: Manifold.extrude(baixo, cam), cor: 1, rotulo: 'Preto - desenho na mesa' },
      { malha: Manifold.extrude(cima, cam).translate([0, 0, esp - cam]), cor: 1, rotulo: 'Preto - desenho em cima' },
    ]
  }
  // origem no canto da caixa do corpo inteiro, antes de recortar a lateral
  let x0 = Infinity
  let y0 = Infinity
  for (const p of partes) {
    const bb = p.malha.boundingBox()
    x0 = Math.min(x0, bb.min[0])
    y0 = Math.min(y0, bb.min[1])
  }
  partes = lateralPreta(w, partes, contorno, P).map((p) => ({ ...p, malha: p.malha.translate([-x0, -y0, 0]) }))
  return { partes, medidas }
}

/** prototipo lateral_preta(): o branco a menos de P.lateralPreta mm da borda vira preto, em toda a altura. */
export function lateralPreta(w: ManifoldToplevel, partes: Parte[], contorno: CrossSection, P: Parametros): Parte[] {
  if (P.lateralPreta <= 0) return partes
  const anel = contorno.subtract(contorno.offset(-P.lateralPreta, 'Round'))
  const prisma = w.Manifold.extrude(anel, 100).translate([0, 0, -50])
  const saida: Parte[] = []
  let faixa: Manifold | null = null
  for (const p of partes) {
    if (p.cor === 0) {
      const parte = p.malha.intersect(prisma)
      faixa = faixa ? faixa.add(parte) : parte
      saida.push({ ...p, malha: p.malha.subtract(prisma) })
    } else {
      saida.push(p)
    }
  }
  if (faixa && !faixa.isEmpty()) saida.push({ malha: faixa, cor: 1, rotulo: 'Preto - lateral' })
  return saida
}

/** Copia a malha para fora do WebAssembly (x, y, z por vértice). */
export function paraMalha(m: Manifold): Malha {
  const mesh = m.getMesh()
  const n = mesh.numProp
  const vp = mesh.vertProperties
  const nv = vp.length / n
  const vertices = new Float32Array(nv * 3)
  for (let i = 0; i < nv; i++) {
    vertices[3 * i] = vp[i * n]
    vertices[3 * i + 1] = vp[i * n + 1]
    vertices[3 * i + 2] = vp[i * n + 2]
  }
  return { vertices, triangulos: new Uint32Array(mesh.triVerts) }
}
