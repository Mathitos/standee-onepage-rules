/**
 * Base preta com duas fendas cônicas vazadas (D031), impressa de cabeça para baixo (D027),
 * com nome e número da unidade embutidos em branco (D022/D035). Port de prototipo/gerar.py
 * fendas() e base().
 */
import type { Manifold, ManifoldToplevel, Vec2, Vec3 } from 'manifold-3d'
import type { Font } from 'opentype.js'
import type { Parte } from './figura'
import { entreLinguetasMm, type Parametros } from './parametros'
import { textoNaBorda, type MedidasTexto } from './texto'

export interface BaseSpec {
  forma: 'redonda' | 'oval'
  /** redonda: [diâmetro]; oval: [eixo maior, eixo menor] */
  mm: number[]
}

export function nomeBase(b: BaseSpec): string {
  return b.forma === 'redonda' ? `redonda-${b.mm[0]}` : `oval-${b.mm[0]}x${b.mm[1]}`
}

/**
 * Duas fendas centradas em x = 0, no sistema da base impressa de cabeça para baixo: z = 0 é a
 * boca. Na boca, a fenda é 2 x folga x conicidade mais estreita que a lingueta junto à barra:
 * empurrada, a lingueta encosta nas paredes inclinadas e para com a barra a P.linguetaFolgaBarra
 * da base. A boca tem chanfro contra o pé de elefante.
 */
export function fendas(w: ManifoldToplevel, P: Parametros, espessuraLingueta: number) {
  const tg = P.linguetaConicidade
  const H = P.baseAltura
  const c = P.bocaChanfro
  const boca = P.linguetaLarg - 2 * P.linguetaFolgaBarra * tg
  const e = espessuraLingueta + P.folgaEsp
  const larg = (z: number) => boca - 2 * z * tg
  if (larg(H) < 0.8) throw new Error('fenda cônica fecha antes do fundo da base')
  const tronco = (x: number, z0: number, w0: number, e0: number, z1: number, w1: number, e1: number) => {
    const pts: Vec3[] = []
    for (const [z, wd, ee] of [[z0, w0, e0], [z1, w1, e1]]) {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) pts.push([x + (sx * wd) / 2, (sy * ee) / 2, z])
    }
    return w.Manifold.hull(pts)
  }
  const L = entreLinguetasMm(P)
  const partes: Manifold[] = []
  for (const x of [-L / 2, L / 2]) {
    partes.push(tronco(x, -0.01, larg(-0.01), e, H + 0.01, larg(H + 0.01), e))
    partes.push(tronco(x, -0.01, boca + 2 * (c + 0.01), e + 2 * (c + 0.01), c, larg(c), e))
  }
  return {
    vaos: w.Manifold.union(partes),
    medidas: { entreCentros: L, largBoca: boca, largFundo: larg(H), espessura: e, chanfroBoca: c },
  }
}

export interface MedidasBase {
  fendas: ReturnType<typeof fendas>['medidas']
  nome?: MedidasTexto
  numero?: MedidasTexto
}

export function base(
  w: ManifoldToplevel, spec: BaseSpec, P: Parametros, espessuraLingueta: number, fonte: Font | null,
  nome?: string | null, numero?: number | null,
): { partes: Parte[]; medidas: MedidasBase } {
  const a = spec.mm[0] / 2
  const b = spec.forma === 'redonda' ? spec.mm[0] / 2 : spec.mm[1] / 2
  const elipse: Vec2[] = []
  for (let i = 0; i < 192; i++) {
    const t = (2 * Math.PI * i) / 192
    elipse.push([a * Math.cos(t), b * Math.sin(t)])
  }
  const contorno = w.CrossSection.ofPolygons([elipse], 'EvenOdd')
  let solido = w.Manifold.extrude(contorno, P.baseAltura)
  const { vaos, medidas: medF } = fendas(w, P, espessuraLingueta)
  const xf = (medF.entreCentros + medF.largBoca) / 2 + P.bocaChanfro
  const yf = medF.espessura / 2 + P.bocaChanfro
  if ((xf + 1.2) ** 2 / a ** 2 + (yf + 1.2) ** 2 / b ** 2 > 1) {
    throw new Error(`as fendas não cabem numa base de ${spec.mm.join('x')} mm`)
  }
  solido = solido.subtract(vaos)
  const medidas: MedidasBase = { fendas: medF }
  let partes: Parte[] = [{ malha: solido, cor: 1, rotulo: 'Preto - base' }]
  if (nome && fonte) {
    const t1 = textoNaBorda(w, fonte, nome, a, b, P)
    medidas.nome = t1.medidas
    let txt = t1.secao
    if (numero != null) {
      const t2 = textoNaBorda(w, fonte, String(numero), a, b, P, 90, P.numeroAltura)
      medidas.numero = t2.medidas
      txt = txt.add(t2.secao)
    }
    const livre = w.CrossSection.square([2 * xf + 1.6, 2 * yf + 1.6]).translate([-xf - 0.8, -yf - 0.8])
    txt = txt.offset(P.textoEngorda, 'Round')
    // impresso de cabeça para baixo: o texto é lido do outro lado, por isso espelhado
    txt = txt.intersect(contorno.offset(-0.3, 'Round')).subtract(livre).mirror([1, 0])
    const branco = w.Manifold.extrude(txt, P.textoCamada)
    partes = [
      { malha: solido.subtract(branco), cor: 1, rotulo: 'Preto - base' },
      { malha: branco, cor: 0, rotulo: 'Branco - nome' + (numero != null ? ' e número' : '') },
    ]
  }
  return { partes: partes.map((p) => ({ ...p, malha: p.malha.translate([a, b, 0]) })), medidas }
}
