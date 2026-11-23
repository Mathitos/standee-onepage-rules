/**
 * Arte enviada pelo usuário (pedido de 23/11): quando nenhuma arte do catálogo serve para a
 * unidade, uma imagem em preto e branco (traço escuro em fundo branco ou transparente) vira os
 * dois SVGs do contrato v2 do catálogo, com o mesmo tratamento que o importador dá ao PDF
 * (.claude/skills/importar-artes-pdf/scripts/vetor.py):
 * - silhueta (prototipo/pdf_grade.py silhueta): cinza < 200, fechamento por uma elipse de 5 px
 *   (~0,42 mm), buracos preenchidos, ilhas com menos de 2% da maior fora;
 * - tinta (prototipo/gerar.py tinta): desfoque gaussiano de 0,035 mm, cinza < 200 dentro da
 *   silhueta, sem pontos menores que 0,015 mm²;
 * - contornos pelos centros dos pixels (cv2.findContours, algoritmo de Suzuki e Abe),
 *   simplificados a 0,5 px (approxPolyDP).
 * Assim o gerador do 3MF e o PDF de papel leem a arte enviada como uma do catálogo. Funções sem
 * DOM: a tela entrega os pixels já na escala de 600 dpi; os testes chamam direto.
 */
import { S } from '../gerador/parametros'
import type { Poligono } from '../gerador/svg'

export const LIMIAR = 200
/** px de margem em volta da figura, como o importador (vetor.py MARGEM_PX) */
export const MARGEM_PX = 2

/** Imagem em cinza, uma amostra por pixel: 0 = preto, 255 = branco. */
export interface Cinza {
  dados: Uint8Array
  w: number
  h: number
}

/** Arte enviada, pronta para o gerador e para o papel (os SVGs no contrato v2). */
export interface ArteEnviada {
  id: string
  rotulo: string
  frente: string
  verso: string
  /** tamanho da figura (silhueta da frente) em mm: largura, altura */
  tamanhoMm: [number, number]
  /** o verso veio de outra imagem; sem ela, é a frente espelhada */
  versoProprio: boolean
}

/** RGBA (canvas) -> cinza, com a parte transparente sobre fundo branco. */
export function cinzaDeRgba(rgba: ArrayLike<number>, w: number, h: number): Cinza {
  const dados = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const a = rgba[4 * i + 3] / 255
    const l = 0.299 * rgba[4 * i] + 0.587 * rgba[4 * i + 1] + 0.114 * rgba[4 * i + 2]
    dados[i] = Math.round(l * a + 255 * (1 - a))
  }
  return { dados, w, h }
}

/** Elipse 5 x 5 do OpenCV (cv2.getStructuringElement(MORPH_ELLIPSE, (5, 5))). */
const ELIPSE5: [number, number][] = []
for (let dy = -2; dy <= 2; dy++) {
  for (let dx = -2; dx <= 2; dx++) if (Math.abs(dy) < 2 || dx === 0) ELIPSE5.push([dx, dy])
}

/** Dilatação (ou erosão) por ELIPSE5; fora da imagem não conta, como no OpenCV. */
function morfologia(m: Uint8Array, w: number, h: number, dilatar: boolean): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilatar ? 0 : 1
      for (const [dx, dy] of ELIPSE5) {
        const xx = x + dx
        const yy = y + dy
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
        const q = m[yy * w + xx]
        if (dilatar ? q : !q) {
          v = dilatar ? 1 : 0
          break
        }
      }
      out[y * w + x] = v
    }
  }
  return out
}

/** Componentes 4-conexos (o padrão do scipy.ndimage.label): rótulo por pixel e área de cada um. */
function rotular(m: Uint8Array, w: number, h: number) {
  const rot = new Int32Array(w * h)
  const areas: number[] = [0]
  const fila = new Int32Array(w * h)
  for (let p = 0; p < w * h; p++) {
    if (!m[p] || rot[p]) continue
    const r = areas.length
    let ini = 0
    let fim = 0
    fila[fim++] = p
    rot[p] = r
    let area = 0
    while (ini < fim) {
      const q = fila[ini++]
      area++
      const x = q % w
      for (const v of [q - w, q + w, x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1]) {
        if (v >= 0 && v < w * h && m[v] && !rot[v]) {
          rot[v] = r
          fila[fim++] = v
        }
      }
    }
    areas.push(area)
  }
  return { rot, areas }
}

/** scipy.ndimage.binary_fill_holes: o fundo que não alcança a borda (4-conexo) vira figura. */
function preencherBuracos(m: Uint8Array, w: number, h: number): Uint8Array {
  const fora = new Uint8Array(w * h)
  const fila = new Int32Array(w * h)
  let fim = 0
  const semear = (p: number) => {
    if (!m[p] && !fora[p]) {
      fora[p] = 1
      fila[fim++] = p
    }
  }
  for (let x = 0; x < w; x++) {
    semear(x)
    semear((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    semear(y * w)
    semear(y * w + w - 1)
  }
  for (let ini = 0; ini < fim; ini++) {
    const q = fila[ini]
    const x = q % w
    if (q >= w) semear(q - w)
    if (q < (h - 1) * w) semear(q + w)
    if (x > 0) semear(q - 1)
    if (x < w - 1) semear(q + 1)
  }
  return fora.map((v) => (v ? 0 : 1))
}

/** pdf_grade.silhueta: traço escuro fechado, buracos preenchidos, ilhas mínimas fora. */
export function silhuetaDe(c: Cinza): Uint8Array {
  const { w, h } = c
  const escuro = c.dados.map((v) => (v < LIMIAR ? 1 : 0))
  const fechado = morfologia(morfologia(escuro, w, h, true), w, h, false)
  const cheio = preencherBuracos(fechado, w, h)
  const { rot, areas } = rotular(cheio, w, h)
  const maior = Math.max(0, ...areas)
  return Uint8Array.from(rot, (r) => (r && areas[r] >= 0.02 * maior ? 1 : 0))
}

/** Desfoque gaussiano separável com borda refletida (BORDER_REFLECT_101), raio 3 sigma. */
function desfocar(c: Cinza, sigma: number): Float32Array {
  const { w, h } = c
  const r = Math.max(1, Math.round(sigma * 3))
  const k: number[] = []
  for (let i = -r; i <= r; i++) k.push(Math.exp(-(i * i) / (2 * sigma * sigma)))
  const soma = k.reduce((a, b) => a + b, 0)
  const ref = (i: number, n: number) => (n === 1 ? 0 : i < 0 ? -i : i >= n ? 2 * n - 2 - i : i)
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0
      for (let i = -r; i <= r; i++) v += k[i + r] * c.dados[y * w + ref(x + i, w)]
      tmp[y * w + x] = v / soma
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0
      for (let i = -r; i <= r; i++) v += k[i + r] * tmp[ref(y + i, h) * w + x]
      out[y * w + x] = v / soma
    }
  }
  return out
}

/** gerar.tinta + limpar: traço preto dentro da silhueta, sem pontos menores que 0,015 mm². */
export function tintaDe(c: Cinza, sil: Uint8Array): Uint8Array {
  const g = desfocar(c, 0.035 / S)
  const m = new Uint8Array(c.w * c.h)
  for (let i = 0; i < m.length; i++) m[i] = g[i] < LIMIAR && sil[i] ? 1 : 0
  const { rot, areas } = rotular(m, c.w, c.h)
  return Uint8Array.from(rot, (r) => (r && areas[r] * S * S >= 0.015 ? 1 : 0))
}

/** Espelha a máscara em x (a frente vista por trás). */
export function espelhar(m: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = m[y * w + (w - 1 - x)]
  return out
}

/** Caixa da figura (x0, y0, x1, y1, inclusive), ou null se a máscara está vazia. */
export function caixa(m: Uint8Array, w: number, h: number): [number, number, number, number] | null {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : [x0, y0, x1, y1]
}

// vizinhança 8 em sentido horário na tela (y para baixo), a partir do leste
const DX = [1, 1, 0, -1, -1, -1, 0, 1]
const DY = [0, 1, 1, 1, 0, -1, -1, -1]
const DIRECAO = new Int8Array(9).fill(-1)
for (let d = 0; d < 8; d++) DIRECAO[(DY[d] + 1) * 3 + DX[d] + 1] = d

/**
 * Bordas da máscara pelos centros dos pixels: o seguimento de bordas de Suzuki e Abe (1985), o
 * mesmo do cv2.findContours, com todas as bordas externas e de buraco (preenchidas por
 * even-odd), simplificadas a 0,5 px. Coordenadas inteiras, y para baixo.
 */
export function contornos(m: Uint8Array, w: number, h: number, eps = 0.5): Poligono[] {
  const W = w + 2
  const f = new Int32Array(W * (h + 2))
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) f[(y + 1) * W + x + 1] = 1
  const out: Poligono[] = []
  let nbd = 1
  for (let i = 1; i <= h; i++) {
    for (let j = 1; j <= w; j++) {
      const p = i * W + j
      const v = f[p]
      let inicio: number
      if (v === 1 && f[p - 1] === 0) inicio = 4 // borda externa: começa pelo vizinho oeste
      else if (v >= 1 && f[p + 1] === 0) inicio = 0 // borda de buraco: começa pelo vizinho leste
      else continue
      nbd++
      // 3.1: a partir do vizinho inicial, no sentido horário, o primeiro pixel da figura
      let d1 = -1
      for (let k = 0; k < 8; k++) {
        const d = (inicio + k) % 8
        if (f[(i + DY[d]) * W + j + DX[d]] !== 0) {
          d1 = d
          break
        }
      }
      if (d1 < 0) {
        f[p] = -nbd // pixel isolado: um ponto só, descartado
        continue
      }
      const i1 = i + DY[d1]
      const j1 = j + DX[d1]
      let i2 = i1
      let j2 = j1
      let i3 = i
      let j3 = j
      const pts: [number, number][] = []
      for (let guarda = 0; guarda < 8 * W * (h + 2); guarda++) {
        pts.push([j3 - 1, i3 - 1])
        // 3.3: a partir do vizinho seguinte a (i2, j2), no sentido anti-horário
        const d2 = DIRECAO[(i2 - i3 + 1) * 3 + (j2 - j3 + 1)]
        let i4 = i3
        let j4 = j3
        let lesteVazio = false
        for (let k = 1; k <= 8; k++) {
          const d = (d2 - k + 8) % 8
          if (f[(i3 + DY[d]) * W + j3 + DX[d]] !== 0) {
            i4 = i3 + DY[d]
            j4 = j3 + DX[d]
            break
          }
          if (d === 0) lesteVazio = true
        }
        // 3.4
        const p3 = i3 * W + j3
        if (lesteVazio) f[p3] = -nbd
        else if (f[p3] === 1) f[p3] = nbd
        // 3.5: de volta ao começo
        if (i4 === i && j4 === j && i3 === i1 && j3 === j1) break
        i2 = i3
        j2 = j3
        i3 = i4
        j3 = j4
      }
      const s = simplificar(pts, eps)
      if (s.length >= 3) out.push(s)
    }
  }
  return out
}

/** Distância do ponto à reta por a e b (ao ponto a, se a = b). */
function distancia(p: [number, number], a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const n = Math.hypot(dx, dy)
  if (n === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / n
}

/** Douglas-Peucker numa cadeia aberta (mantém as pontas), sem recursão. */
function douglasPeucker(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length < 3) return pts.slice()
  const manter = new Uint8Array(pts.length)
  manter[0] = 1
  manter[pts.length - 1] = 1
  const pilha: [number, number][] = [[0, pts.length - 1]]
  while (pilha.length) {
    const [a, b] = pilha.pop()!
    let dmax = -1
    let k = -1
    for (let i = a + 1; i < b; i++) {
      const d = distancia(pts[i], pts[a], pts[b])
      if (d > dmax) {
        dmax = d
        k = i
      }
    }
    if (k >= 0 && dmax > eps) {
      manter[k] = 1
      pilha.push([a, k], [k, b])
    }
  }
  return pts.filter((_, i) => manter[i])
}

/** approxPolyDP fechado: corta no ponto mais longe do primeiro e simplifica as duas metades. */
function simplificar(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length < 3) return pts
  let k = 0
  let dmax = -1
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1])
    if (d > dmax) {
      dmax = d
      k = i
    }
  }
  if (k === 0) return [pts[0]]
  const a = douglasPeucker(pts.slice(0, k + 1), eps)
  const b = douglasPeucker([...pts.slice(k), pts[0]], eps)
  return [...a.slice(0, -1), ...b.slice(0, -1)]
}

/** vetor.py _d: M x y, l relativos, z; sem espaço antes de negativo. */
function caminho(polys: Poligono[]): string {
  return polys
    .map((p) => {
      const rel = p.slice(1).map((q, i) => `${q[0] - p[i][0]} ${q[1] - p[i][1]}`)
      return `M${p[0][0]} ${p[0][1]}l${rel.join(' ')}z`
    })
    .join('')
    .replace(/ -/g, '-')
}

/** vetor.py svg(): uma face no contrato v2. */
export function svgDaFace(sil: Uint8Array, tinta: Uint8Array, w: number, h: number, titulo: string): string {
  const esc = titulo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(w * S).toFixed(3)}mm" height="${(h * S).toFixed(3)}mm" ` +
    `viewBox="0 0 ${w} ${h}" data-dpi="600" data-contrato="2"><title>${esc}</title>` +
    `<path id="silhueta" fill="#fff" fill-rule="evenodd" d="${caminho(contornos(sil, w, h))}"/>` +
    `<path id="tinta" fill="#000" fill-rule="evenodd" d="${caminho(contornos(tinta, w, h))}"/></svg>\n`
  )
}

/**
 * As duas faces da arte enviada, já na escala de 600 dpi e com a mesma tela. Sem verso, ele é a
 * frente espelhada (o desenho visto por trás); com verso, ele já deve vir como visto por trás,
 * como os do catálogo (alinhado à frente espelhada).
 */
export function arteDeCinza(id: string, rotulo: string, frente: Cinza, verso: Cinza | null): ArteEnviada {
  const { w, h } = frente
  if (verso && (verso.w !== w || verso.h !== h)) throw new Error('frente e verso com telas diferentes')
  const silF = silhuetaDe(frente)
  const cx = caixa(silF, w, h)
  if (!cx) throw new Error('não achei a figura: use desenho escuro em fundo branco ou transparente')
  const tintaF = tintaDe(frente, silF)
  let silV = espelhar(silF, w, h)
  let tintaV = espelhar(tintaF, w, h)
  if (verso) {
    silV = silhuetaDe(verso)
    if (!caixa(silV, w, h)) throw new Error('não achei a figura no verso: use desenho escuro em fundo branco ou transparente')
    tintaV = tintaDe(verso, silV)
  }
  return {
    id,
    rotulo,
    frente: svgDaFace(silF, tintaF, w, h, `${rotulo} - frente`),
    verso: svgDaFace(silV, tintaV, w, h, `${rotulo} - verso`),
    tamanhoMm: [Math.round((cx[2] - cx[0] + 1) * S * 100) / 100, Math.round((cx[3] - cx[1] + 1) * S * 100) / 100],
    versoProprio: !!verso,
  }
}
