/**
 * Texto na borda da base, port de prototipo/gerar.py texto_na_borda(). O protótipo usava a
 * Bahnschrift do Windows; o site usa Barlow Semi Condensed Bold (OFL-1.1, @fontsource), com
 * o mesmo tamanho de corpo (altura / 0,72) e o espaçamento por caractere, sem kerning.
 */
import type { CrossSection, ManifoldToplevel, Vec2 } from 'manifold-3d'
import { parse, type Font } from 'opentype.js'
import type { Parametros } from './parametros'

export function carregarFonte(buf: ArrayBuffer): Font {
  return parse(buf)
}

interface Glifo {
  polys: Vec2[][]
  adv: number
}

/** Polígonos de um caractere em mm, origem na linha de base à esquerda, y para cima. */
function glifo(fonte: Font, ch: string, corpo: number): Glifo {
  const g = fonte.charToGlyph(ch)
  const adv = ((g.advanceWidth ?? 0) * corpo) / fonte.unitsPerEm
  if (!ch.trim() || g.index === 0) return { polys: [], adv }
  const polys: Vec2[][] = []
  let atual: Vec2[] = []
  let px = 0
  let py = 0
  const fechar = () => {
    if (atual.length >= 3) polys.push(atual)
    atual = []
  }
  for (const c of g.getPath(0, 0, corpo).commands) {
    if (c.type === 'M') {
      fechar()
      px = c.x!
      py = c.y!
      atual.push([px, -py])
    } else if (c.type === 'L') {
      px = c.x!
      py = c.y!
      atual.push([px, -py])
    } else if (c.type === 'Q') {
      const n = 8
      for (let i = 1; i <= n; i++) {
        const t = i / n
        const u = 1 - t
        const x = u * u * px + 2 * u * t * c.x1! + t * t * c.x!
        const y = u * u * py + 2 * u * t * c.y1! + t * t * c.y!
        atual.push([x, -y])
      }
      px = c.x!
      py = c.y!
    } else if (c.type === 'C') {
      const n = 10
      for (let i = 1; i <= n; i++) {
        const t = i / n
        const u = 1 - t
        const x = u * u * u * px + 3 * u * u * t * c.x1! + 3 * u * t * t * c.x2! + t * t * t * c.x!
        const y = u * u * u * py + 3 * u * u * t * c.y1! + 3 * u * t * t * c.y2! + t * t * t * c.y!
        atual.push([x, -y])
      }
      px = c.x!
      py = c.y!
    } else {
      fechar()
    }
  }
  fechar()
  return { polys, adv }
}

export interface MedidasTexto {
  texto: string
  alturaLetraMm: number
  coube: boolean
  comprimentoMm: number
  arcoDisponivelMm: number
}

/**
 * Texto na borda da base, letras com o topo para o centro. centro = 270 graus: borda da frente
 * (y negativo), lida pela frente; 90: borda de trás, lida por trás. Os glifos seguem a elipse
 * interna (a, b) recuada pela margem; o tamanho cai até P.textoMin se o texto não couber.
 */
export function textoNaBorda(
  w: ManifoldToplevel, fonte: Font, nome: string, a: number, b: number, P: Parametros,
  centro = 270, altura?: number,
): { secao: CrossSection; medidas: MedidasTexto } {
  let alt = altura ?? P.textoAltura
  const N = 2000
  let glifos: Glifo[] = []
  let espaco = 0
  let total = 0
  let ra = 0
  let rb = 0
  const t = new Float64Array(N)
  const pts: Vec2[] = new Array(N)
  const s = new Float64Array(N)
  for (;;) {
    const corpo = alt / 0.72
    const desc = (-fonte.descender * corpo) / fonte.unitsPerEm
    glifos = [...nome].map((ch) => glifo(fonte, ch, corpo))
    espaco = 0.06 * alt
    total = glifos.reduce((soma, g) => soma + g.adv, 0) + espaco * (glifos.length - 1)
    // curva na meia altura das letras: o espaçamento fica correto no meio do glifo
    const meio = P.textoMargem + desc + alt / 2
    ra = a - meio
    rb = b - meio
    const t0 = ((centro - P.textoArcoGraus / 2) * Math.PI) / 180
    const t1 = ((centro + P.textoArcoGraus / 2) * Math.PI) / 180
    for (let i = 0; i < N; i++) {
      t[i] = t0 + ((t1 - t0) * i) / (N - 1)
      pts[i] = [ra * Math.cos(t[i]), rb * Math.sin(t[i])]
      s[i] = i === 0 ? 0 : s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    }
    if (total <= s[N - 1] || alt <= P.textoMin) break
    alt = Math.max(P.textoMin, ((alt * s[N - 1]) / total) * 0.98)
  }
  let pos = (s[N - 1] - total) / 2
  const pecas: CrossSection[] = []
  for (const g of glifos) {
    const sc = pos + g.adv / 2
    pos += g.adv + espaco
    if (!g.polys.length) continue
    let i = busca(s, sc)
    i = Math.min(Math.max(i, 1), N - 1)
    const tt = t[i]
    let tx = -ra * Math.sin(tt)
    let ty = rb * Math.cos(tt)
    const n = Math.hypot(tx, ty)
    tx /= n
    ty /= n
    const nx = -ty                 // normal para dentro da base
    const ny = tx
    const cx = pts[i][0] - (nx * alt) / 2   // a linha de base fica a meia altura para fora
    const cy = pts[i][1] - (ny * alt) / 2
    const mundo = g.polys.map((p) =>
      p.map(([x, y]) => [cx + (x - g.adv / 2) * tx + y * nx, cy + (x - g.adv / 2) * ty + y * ny] as Vec2))
    pecas.push(w.CrossSection.ofPolygons(mundo, 'EvenOdd'))
  }
  return {
    secao: w.CrossSection.union(pecas),
    medidas: {
      texto: nome, alturaLetraMm: Math.round(alt * 100) / 100, coube: total <= s[N - 1],
      comprimentoMm: Math.round(total * 10) / 10, arcoDisponivelMm: Math.round(s[N - 1] * 10) / 10,
    },
  }
}

/** numpy searchsorted (lado esquerdo): primeiro índice com s[i] >= v. */
function busca(s: Float64Array, v: number): number {
  let lo = 0
  let hi = s.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (s[m] < v) lo = m + 1
    else hi = m
  }
  return lo
}
