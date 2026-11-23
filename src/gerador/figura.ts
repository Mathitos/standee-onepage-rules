/**
 * Figura em duas metades em preto em relevo (D041/D045, padrão) ou em peça única pintada (D032),
 * port de prototipo/gerar.py: secao, corpo_com_lingueta, metade, peca_unica_pintada e
 * lateral_preta. Toda a geometria 2D fica em mm, y para cima, como no
 * protótipo; as contas de pixel (fundo da figura, colunas de apoio, linguetas) usam os pixels
 * de 600 dpi do SVG, com os centros nos inteiros.
 */
import type { CrossSection, Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d'
import type { Font } from 'opentype.js'
import type { Malha } from './manifold'
import { S, meioEntrePx, type Parametros } from './parametros'
import type { FaceSvg, Poligono } from './svg'
import { textoReto } from './texto'

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
  linguetas: {
    encaixe: Parametros['encaixeBase']
    quantidade: number
    /** só no cônico */
    entreCentrosMm: number | null
    largJuntoBarraMm: number
    largPontaMm: number
    profMm: number
  }
  figuraEsqMm: number
  figuraDirMm: number
}

/**
 * prototipo corpo_com_lingueta(): silhueta + travessa sob os pés + lingueta do encaixe.
 * Retangular (D042, padrão): uma lingueta reta de P.linguetaRetLarg no meio do apoio dos pés.
 * Cônico (D031): duas linguetas cônicas simétricas em volta do meio da travessa, a
 * P.linguetaEntre uma da outra em todas as artes. Figura estreita ganha travessa mais larga.
 * Tudo na orientação da frente.
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
  const conico = P.encaixeBase === 'conico'
  const D = conico ? meioEntrePx(P) : 0
  const meiaTopo = (conico ? P.linguetaLarg : P.linguetaRetLarg) / 2 / S
  const tg = conico ? P.linguetaConicidade : 0
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
  for (const cx of conico ? [centro - D, centro + D] : [centro]) {
    const ladoEsq: [number, number][] = []
    const ladoDir: [number, number][] = []
    for (let i = 0; i < prof; i++) {
      const meia = Math.round(meiaTopo - (i + 0.5) * tg)
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
      encaixe: P.encaixeBase,
      quantidade: conico ? 2 : 1,
      entreCentrosMm: conico ? round(2 * D * S, 3) : null,
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
  return { partes: fecharPeca(w, partes, contorno, P), medidas }
}

/**
 * Recorta a lateral preta (D034) e leva a origem ao canto da caixa da peça inteira, medida antes
 * do recorte, como o protótipo.
 */
function fecharPeca(w: ManifoldToplevel, partes: Parte[], contorno: CrossSection, P: Parametros): Parte[] {
  let x0 = Infinity
  let y0 = Infinity
  for (const p of partes) {
    const bb = p.malha.boundingBox()
    x0 = Math.min(x0, bb.min[0])
    y0 = Math.min(y0, bb.min[1])
  }
  return lateralPreta(w, partes, contorno, P).map((p) => ({ ...p, malha: p.malha.translate([-x0, -y0, 0]) }))
}

export interface Metade {
  lado: 'frente' | 'verso'
  partes: Parte[]
}

/**
 * Duas metades em preto em relevo (D041/D045), port de prototipo metade(): corpo de P.corpo e
 * desenho preto em relevo de P.relevo em cima, nunca além da borda do corpo. Miolo preto (pedido
 * do usuário em 23/11, como a D036): o corpo é preto e o branco fica só na face de cima
 * (P.camadaMesa) dentro da silhueta da arte, embaixo do relevo; a barra e a lingueta ficam
 * pretas. Assim as duas cores só se encontram nessas camadas, em vez de em todas (o branco com a
 * lateral preta da D034). Miolo branco: o corpo branco da D046. A face da mesa é a da cola;
 * impressas assim, as duas metades coladas costas com costas mostram a frente e o verso. A frente
 * fica como no SVG; a metade do verso tem o contorno da frente espelhado, porque o SVG do verso já
 * vem alinhado à frente espelhada. A lingueta e a barra ficam nas duas metades, sem relevo:
 * coladas, a lingueta tem 2 x P.corpo e entra na fenda. Com `numero`, cada metade leva o número
 * da pose em fenda na face da cola (fendaDoNumero).
 */
export function metadesPretoRelevo(
  w: ManifoldToplevel, frente: FaceSvg, verso: FaceSvg, P: Parametros, numero: { fonte: Font; texto: string } | null = null,
) {
  const { largura: W, altura: H } = frente
  if (verso.largura !== W || verso.altura !== H) throw new Error('frente e verso com telas diferentes')
  const silF = secao(w, frente.silhueta, H)
  const { corpo: corpoF, medidas } = corpoComLingueta(w, silF, H, P)
  const espelhar = (cs: CrossSection) => cs.mirror([1, 0]).translate([(W - 1) * S, 0])
  const { Manifold } = w
  const lugar = numero ? lugarDoNumero(w, silF, numero.fonte, numero.texto, P) : null
  const metades: Metade[] = []
  for (const [lado, contorno, sil, tinta] of [
    ['frente', corpoF, silF, secao(w, frente.tinta, H)],
    ['verso', espelhar(corpoF), espelhar(silF), secao(w, verso.tinta, H)],
  ] as const) {
    const relevo: Parte = { malha: Manifold.extrude(tinta.intersect(contorno), P.relevo).translate([0, 0, P.corpo]), cor: 1, rotulo: 'Preto - relevo' }
    let partes: Parte[]
    if (P.miolo === 'preto') {
      const face = Manifold.extrude(sil.intersect(contorno), P.camadaMesa).translate([0, 0, P.corpo - P.camadaMesa])
      partes = [
        { malha: Manifold.extrude(contorno, P.corpo).subtract(face), cor: 1, rotulo: 'Preto - corpo' },
        { malha: face, cor: 0, rotulo: 'Branco - face' },
        relevo,
      ]
    } else {
      partes = [{ malha: Manifold.extrude(contorno, P.corpo), cor: 0, rotulo: 'Branco - corpo' }, relevo]
    }
    if (lugar) {
      // a metade do verso é a frente espelhada: o número vai no lugar espelhado, de novo espelhado para ser lido por baixo
      const [cx, cy] = lado === 'frente' ? lugar.centro : [(W - 1) * S - lugar.centro[0], lugar.centro[1]]
      const fenda = Manifold.extrude(lugar.glifos.mirror([1, 0]).translate([cx, cy]), P.poseFenda)
      partes = partes.map((p) => (p.malha.boundingBox().min[2] < P.poseFenda ? { ...p, malha: p.malha.subtract(fenda) } : p))
    }
    metades.push({ lado, partes: fecharPeca(w, partes, contorno, P) })
  }
  return { metades, medidas, numero: lugar ? { texto: numero!.texto, alturaMm: lugar.alturaMm } : null }
}

/**
 * Lugar do número da pose (pedido do usuário em 23/11: "um número em fenda nas primeiras
 * camadas, para evitar troca de filamento"): na face da mesa de cada metade, que é a da cola e
 * fica escondida depois de colada, com P.poseFenda mm de fundo. Vai no ponto da silhueta mais
 * longe da borda (o meio do maior círculo que cabe nela, recuada P.poseMargem), com letras de
 * P.poseAltura mm, menores se o círculo em volta do número não couber, até P.poseMin; abaixo
 * disso, a figura fica sem número (null). Devolve os glifos centrados na origem, sem espelhar.
 */
export function lugarDoNumero(w: ManifoldToplevel, sil: CrossSection, fonte: Font, texto: string, P: Parametros) {
  const regiao = sil.offset(-P.poseMargem, 'Round')
  if (regiao.isEmpty()) return null
  const b = regiao.bounds()
  // raio do maior círculo dentro da região, por bisseção (lo nunca esvazia a região)
  let lo = 0
  let hi = Math.min(b.max[0] - b.min[0], b.max[1] - b.min[1]) / 2
  for (let i = 0; i < 14; i++) {
    const m = (lo + hi) / 2
    if (regiao.offset(-m, 'Round').isEmpty()) hi = m
    else lo = m
  }
  const glifos0 = textoReto(w, fonte, texto, P.poseAltura)
  const g = glifos0.bounds()
  const raio = Math.hypot(g.max[0] - g.min[0], g.max[1] - g.min[1]) / 2
  const escala = Math.min(1, (0.98 * lo) / raio)
  if (P.poseAltura * escala < P.poseMin) return null
  // o maior pedaço da região recuada quase até o fim; todo ponto dele deixa o número inteiro dentro
  const fundo = regiao.offset(-Math.max(raio * escala, 0.9 * lo), 'Round').decompose().sort((x, y) => y.area() - x.area())[0]
  const fb = fundo.bounds()
  let centro: Vec2 = [(fb.min[0] + fb.max[0]) / 2, (fb.min[1] + fb.max[1]) / 2]
  if (fundo.intersect(w.CrossSection.square(0.01, true).translate(centro)).area() <= 0) centro = fundo.toPolygons()[0][0]
  return { centro, glifos: glifos0.scale(escala), alturaMm: Math.round(P.poseAltura * escala * 10) / 10 }
}

/**
 * prototipo lateral_preta(): o branco a menos de P.lateralPreta mm da borda vira preto, em toda a
 * altura. Corta pelo miolo (o contorno deslocado para dentro), não pelo anel da borda: dá o mesmo
 * resultado, mas sem bordas quase coincidentes. Com o anel, o contorno espelhado do verso deixava
 * lascas de volume ~1e-10 mm³ no branco.
 */
export function lateralPreta(w: ManifoldToplevel, partes: Parte[], contorno: CrossSection, P: Parametros): Parte[] {
  if (P.lateralPreta <= 0) return partes
  const miolo = w.Manifold.extrude(contorno.offset(-P.lateralPreta, 'Round'), 100).translate([0, 0, -50])
  const saida: Parte[] = []
  let faixa: Manifold | null = null
  for (const p of partes) {
    if (p.cor === 0) {
      const parte = p.malha.subtract(miolo)
      faixa = faixa ? faixa.add(parte) : parte
      saida.push({ ...p, malha: p.malha.intersect(miolo) })
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
