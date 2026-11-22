/**
 * Folhas A4 de standees de papel (D044): uma faixa dobrável por modelo da lista, no formato do PDF
 * da OPR (aba | frente | verso | aba), em pé e várias por folha, na escala do PDF a 100% (D014):
 * a arte vem dos SVG do catálogo (600 dpi) sem redimensionar.
 *
 * Faixa, de cima para baixo:
 *   aba de trás (rótulo girado 180°) | verso girado 180°, pés na dobra de cima |
 *   dobra do meio (sobre a cabeça) | frente em pé, pés na dobra de baixo | aba da frente (rótulo)
 * Dobrada no meio, a metade de cima cai atrás da frente. O giro de 180° no papel equivale ao
 * espelho em x que alinha o verso à frente (D020: x -> W - 1 - x nos centros dos pixels), então
 * as silhuetas coincidem e dá para colar e recortar no contorno (método 2 da OPR) ou montar em
 * tenda (método 1).
 *
 * Base do army book (D044, conferência de 22/11): com a base da unidade, cada aba é meia base
 * (meio círculo ou meia elipse), com o lado reto na dobra dos pés e o centro no meio do apoio
 * dos pés, como a fenda do 3MF. Dobradas para fora (método 2), as duas abas formam a base inteira,
 * na medida do army book. Sem base, ou se a meia base não couber na folha, as abas são
 * retângulos como no PDF da OPR, com aviso.
 */
import { parse, type Font, type PathCommand } from 'opentype.js'
import type { BaseSpec } from '../gerador/base'
import { nomeBase } from '../gerador/base'
import { S } from '../gerador/parametros'
import { lerSvg, type FaceSvg, type Poligono } from '../gerador/svg'
import { escreverPdf, num, PT, type FormularioPdf } from './pdf'

export interface ModeloPapel {
  unidade: string
  /** posição da unidade na lista (D035) */
  numero: number
  qtd: number
  /** chave em PedidoPapel.artes */
  arte: string
  /** base do army book (D015); sem ela, abas retangulares */
  base?: BaseSpec | null
}

export interface ArtePapel {
  rotulo: string
  /** textos dos SVG (contrato v2) */
  frente: string
  verso: string
}

export interface ParametrosPapel {
  folhaMm: [number, number]
  /** margem em volta da folha (área que muitas impressoras não imprimem) */
  margemMm: number
  /** faixa de baixo com título, instruções e régua */
  rodapeMm: number
  /** abas retangulares (sem base): comprimento padrão e mínimo */
  abaMm: number
  abaMinMm: number
  /** papel acima da cabeça, em cada metade */
  folgaCabecaMm: number
  folgaCabecaMinMm: number
  /** papel de cada lado da figura */
  ladoMm: number
  larguraMinMm: number
  /** faixa de apoio dos pés, a partir do pixel mais baixo (como contatoMm do 3MF) */
  contatoMm: number
  linhaCorteMm: number
  linhaDobraMm: number
}

/**
 * Medidas do PDF da OPR (evidencias/2026-11-17-pdf-hdf.md e 2026-11-22-encaixe-retangular-e-escala.md):
 * abas de 19,98 mm; célula = figura + 5,6–5,7 mm (Infantry 34,3 -> 40,0; OGRE 53,8 -> 59,4);
 * faixa = figura + ~5,5 mm de cada lado nas largas (Biker 40,2 -> 51,2; OGRE 37,3 -> 47,6).
 */
export const PADRAO_PAPEL: ParametrosPapel = {
  folhaMm: [210, 297],
  margemMm: 7,
  rodapeMm: 8,
  abaMm: 20,
  abaMinMm: 12,
  folgaCabecaMm: 5.5,
  folgaCabecaMinMm: 1,
  ladoMm: 5.5,
  larguraMinMm: 30,
  contatoMm: 1.0,
  linhaCorteMm: 0.2,
  linhaDobraMm: 0.15,
}

export interface PedidoPapel {
  modelos: ModeloPapel[]
  artes: Record<string, ArtePapel>
  /** nome da lista, no rodapé e nas propriedades do PDF */
  titulo?: string
  /** fonte dos rótulos (woff/ttf/otf); sem ela, as faixas saem sem texto */
  fonte?: ArrayBuffer | null
  parametros?: Partial<ParametrosPapel>
  data?: Date
}

export interface MedidasFaixa {
  arte: string
  /** largura × comprimento da faixa inteira */
  faixaMm: [number, number]
  /** largura × altura da figura (frente com o verso espelhado por cima) */
  figuraMm: [number, number]
  /** profundidade de cada aba (na meia base, metade da profundidade da base) */
  abaMm: number
  celulaMm: number
  /** 'base': meia base do army book em cada aba; 'retangulo': abas como no PDF da OPR */
  formaAba: 'base' | 'retangulo'
  /** base formada pelas duas abas: largura (no plano da figura) × profundidade */
  baseMm: [number, number] | null
  /** do centro da base ao meio da faixa (a base fica no meio do apoio dos pés) */
  desvioBaseMm: number
  /** folga ou abas menores que o padrão para caber na folha */
  reduzida: boolean
  cabe: boolean
}

export interface PosicaoFaixa {
  folha: number
  x: number
  y: number
  /** chave em ResultadoPapel.medidas (arte + base) */
  chave: string
  arte: string
  numero: number
  unidade: string
}

export interface ResultadoPapel {
  arquivo: Uint8Array
  folhas: number
  faixas: PosicaoFaixa[]
  medidas: Record<string, MedidasFaixa>
  avisos: string[]
}

const r2 = (n: number) => Math.round(n * 100) / 100
/** mm nos avisos, com vírgula: 14,37 */
const mm = (n: number) => String(r2(n)).replace('.', ',')
const rotuloBase = (b: BaseSpec) => (b.forma === 'redonda' ? `redonda de ${mm(b.mm[0])} mm` : `oval de ${mm(b.mm[0])} × ${mm(b.mm[1])} mm`)

function limites(polys: Poligono[]) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const p of polys) {
    for (const [x, y] of p) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return { x0, y0, x1, y1 }
}

/** Meio do apoio dos pés em px (centros): vértices da silhueta a até k px do pixel mais baixo. */
function meioDosPes(polys: Poligono[], fundo: number, k: number): number {
  let x0 = Infinity
  let x1 = -Infinity
  for (const p of polys) {
    for (const [x, y] of p) {
      if (y < fundo - k) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
    }
  }
  return (x0 + x1) / 2
}

interface Medida extends MedidasFaixa {
  /** largura da tela em px (frente e verso iguais) */
  telaPx: number
  /** linha dos pés na tela, px contínuos (borda de baixo do pixel mais baixo) */
  pesPx: number
  /** borda esquerda da faixa e centro da base, em mm a partir da borda esquerda da tela */
  esqMm: number
  baseCxMm: number
}

/**
 * Medidas da faixa de uma arte com a base da unidade. Encurta a folga sobre a cabeça se a faixa
 * não couber na altura útil; se ainda não couber, troca a meia base por abas retangulares curtas.
 */
export function medirFaixa(frente: FaceSvg, verso: FaceSvg, P: ParametrosPapel, util: [number, number], base?: BaseSpec | null): Medida {
  if (verso.largura !== frente.largura || verso.altura !== frente.altura) throw new Error('frente e verso com telas diferentes')
  const W = frente.largura
  const f = limites(frente.silhueta)
  const v = limites(verso.silhueta)
  // o verso entra espelhado (girado 180° no papel): x -> W - 1 - x
  const ux0 = Math.min(f.x0, W - 1 - v.x1)
  const ux1 = Math.max(f.x1, W - 1 - v.x0)
  const pesPx = Math.max(f.y1, v.y1) + 0.5
  const topoPx = Math.min(f.y0, v.y0) - 0.5
  const figW = (ux1 - ux0 + 1) * S
  const figH = (pesPx - topoPx) * S
  const baseMm: [number, number] | null = base ? (base.forma === 'redonda' ? [base.mm[0], base.mm[0]] : [base.mm[0], base.mm[1]]) : null
  // a base fica no meio do apoio dos pés da frente, como a fenda do 3MF
  const baseCxMm = meioDosPes(frente.silhueta, f.y1, Math.round(P.contatoMm / S)) * S

  const enquadrar = (comBase: boolean) => {
    let esq = (ux0 - 0.5) * S - P.ladoMm
    let dir = (ux1 + 0.5) * S + P.ladoMm
    if (comBase && baseMm) {
      esq = Math.min(esq, baseCxMm - baseMm[0] / 2)
      dir = Math.max(dir, baseCxMm + baseMm[0] / 2)
    }
    if (dir - esq < P.larguraMinMm) {
      const falta = P.larguraMinMm - (dir - esq)
      esq -= falta / 2
      dir += falta / 2
    }
    return { esq, largura: dir - esq }
  }

  let formaAba: 'base' | 'retangulo' = baseMm ? 'base' : 'retangulo'
  let aba = baseMm ? baseMm[1] / 2 : P.abaMm
  let folga = P.folgaCabecaMm
  const comprimento = () => 2 * (figH + folga) + 2 * aba
  if (comprimento() > util[1]) folga = Math.max(P.folgaCabecaMinMm, (util[1] - 2 * aba) / 2 - figH)
  if (comprimento() > util[1]) {
    // a meia base não cabe: abas retangulares, encurtadas até o mínimo
    formaAba = 'retangulo'
    aba = Math.max(P.abaMinMm, Math.min(P.abaMm, util[1] / 2 - figH - folga))
  }
  let quadro = enquadrar(formaAba === 'base')
  if (formaAba === 'base' && quadro.largura > util[0]) {
    formaAba = 'retangulo'
    aba = Math.max(P.abaMinMm, Math.min(P.abaMm, util[1] / 2 - figH - folga))
    quadro = enquadrar(false)
  }
  const meio = quadro.esq + quadro.largura / 2
  return {
    arte: '',
    faixaMm: [quadro.largura, comprimento()],
    figuraMm: [figW, figH],
    abaMm: aba,
    celulaMm: figH + folga,
    formaAba,
    baseMm: formaAba === 'base' ? baseMm : null,
    desvioBaseMm: formaAba === 'base' ? baseCxMm - meio : 0,
    reduzida: folga < P.folgaCabecaMm || (formaAba === 'retangulo' && aba < P.abaMm) || (!!baseMm && formaAba !== 'base'),
    cabe: comprimento() <= util[1] + 1e-9 && quadro.largura <= util[0] + 1e-9,
    telaPx: W,
    pesPx,
    esqMm: quadro.esq,
    baseCxMm,
  }
}

interface Linha {
  h: number
  x: number
  itens: { i: number; x: number }[]
}

/**
 * Prateleiras com primeiro encaixe: cada faixa vai na primeira linha de qualquer folha com largura
 * sobrando e cuja altura (crescendo, se preciso) ainda caiba na folha; senão abre uma linha ou
 * uma folha. Faixas lado a lado, encostadas (o corte entre elas é um só, como no PDF da OPR).
 * Devolve [folha, x, y] relativos à área útil.
 */
export function distribuir(dims: [number, number][], util: [number, number]): [number, number, number][] {
  const eps = 1e-9
  const folhas: { linhas: Linha[]; altura: number }[] = []
  dims.forEach(([w, l], i) => {
    for (const fl of folhas) {
      for (const ln of fl.linhas) {
        if (ln.x + w > util[0] + eps) continue
        const altura = fl.altura - ln.h + Math.max(ln.h, l)
        if (altura > util[1] + eps) continue
        ln.itens.push({ i, x: ln.x })
        ln.x += w
        ln.h = Math.max(ln.h, l)
        fl.altura = altura
        return
      }
      if (fl.altura + l <= util[1] + eps) {
        fl.linhas.push({ h: l, x: w, itens: [{ i, x: 0 }] })
        fl.altura += l
        return
      }
    }
    folhas.push({ linhas: [{ h: l, x: w, itens: [{ i, x: 0 }] }], altura: l })
  })
  const pos: [number, number, number][] = new Array(dims.length)
  folhas.forEach((fl, k) => {
    let y = 0
    for (const ln of fl.linhas) {
      for (const it of ln.itens) pos[it.i] = [k, it.x, y]
      y += ln.h
    }
  })
  return pos
}

/** Desenho da tinta de uma face em px da tela (y para baixo), para um Form XObject. */
function formularioArte(nome: string, face: FaceSvg): FormularioPdf {
  // os vértices são os centros dos pixels do contorno: o traço de 1 px (meio para cada lado)
  // devolve a área dos pixels, como o offset de S/2 do gerador 3D; sem ele as linhas de ~0,1 mm
  // (2,4 px) perderiam 1 px de largura
  const ops: string[] = ['0 g 0 G 1 w 0 j 2 M']
  for (const p of face.tinta) {
    ops.push(`${p[0][0]} ${p[0][1]} m`)
    for (let k = 1; k < p.length; k++) ops.push(`${p[k][0]} ${p[k][1]} l`)
    ops.push('h')
  }
  ops.push('B*')
  return { nome, caixa: [-1, -1, face.largura + 1, face.altura + 1], conteudo: ops.join('\n') }
}

/** Contorno de um texto (y para baixo), preenchido. Encolhe para caber em `maxLarg`. */
function texto(fonte: Font, t: string, x: number, yBase: number, tam: number, alinhar: 'centro' | 'esq' | 'dir', maxLarg = Infinity) {
  let adv = fonte.getAdvanceWidth(t, tam)
  if (adv > maxLarg) {
    tam *= maxLarg / adv
    adv = maxLarg
  }
  const x0 = alinhar === 'centro' ? x - adv / 2 : alinhar === 'dir' ? x - adv : x
  const ops: string[] = []
  let cx = 0
  let cy = 0
  for (const c of fonte.getPath(t, x0, yBase, tam).commands as PathCommand[]) {
    if (c.type === 'M' || c.type === 'L') {
      ops.push(`${num(c.x!)} ${num(c.y!)} ${c.type === 'M' ? 'm' : 'l'}`)
      cx = c.x!
      cy = c.y!
    } else if (c.type === 'C') {
      ops.push(`${num(c.x1!)} ${num(c.y1!)} ${num(c.x2!)} ${num(c.y2!)} ${num(c.x!)} ${num(c.y!)} c`)
      cx = c.x!
      cy = c.y!
    } else if (c.type === 'Q') {
      // quadrática -> cúbica
      const a = [cx + (2 / 3) * (c.x1! - cx), cy + (2 / 3) * (c.y1! - cy)]
      const b = [c.x! + (2 / 3) * (c.x1! - c.x!), c.y! + (2 / 3) * (c.y1! - c.y!)]
      ops.push(`${num(a[0])} ${num(a[1])} ${num(b[0])} ${num(b[1])} ${num(c.x!)} ${num(c.y!)} c`)
      cx = c.x!
      cy = c.y!
    } else ops.push('h')
  }
  return ops.length ? ops.join('\n') + '\nf\n' : ''
}

/**
 * Duas linhas na aba da frente ("3 Veterans" e o rótulo da arte), lidas com a dobra em cima.
 * `largura(d)` é a largura útil da aba a d mm da dobra; na meia base o texto fica perto da dobra,
 * onde ela é mais larga.
 */
function rotuloAba(fonte: Font, l1: string, l2: string, cx: number, yDobra: number, aba: number, largura: (d: number) => number, perto: boolean) {
  const t1 = Math.min(3.6, aba * 0.2)
  const t2 = Math.min(2.8, aba * 0.16)
  const vao = 0.25 * t1 + 0.8
  const bloco = 0.7 * t1 + vao + 0.7 * t2
  const d0 = perto ? 1.2 : (aba - bloco) / 2
  const d1 = d0 + 0.7 * t1
  const d2 = d1 + vao + 0.7 * t2
  return texto(fonte, l1, cx, yDobra + d1, t1, 'centro', largura(d1 + 0.22 * t1) - 2) +
    texto(fonte, l2, cx, yDobra + d2, t2, 'centro', largura(d2 + 0.22 * t2) - 2)
}

/** Meia elipse de semieixos a (x) e b (y, sinal = lado), de (cx - a, y) a (cx + a, y), em 2 cúbicas. */
function meiaElipse(cx: number, y: number, a: number, b: number): string {
  const k = 0.5522847498
  return [
    `${num(cx - a)} ${num(y + k * b)} ${num(cx - k * a)} ${num(y + b)} ${num(cx)} ${num(y + b)} c`,
    `${num(cx + k * a)} ${num(y + b)} ${num(cx + a)} ${num(y + k * b)} ${num(cx + a)} ${num(y)} c`,
  ].join('\n')
}

export function gerarPapel(pedido: PedidoPapel): ResultadoPapel {
  const P: ParametrosPapel = { ...PADRAO_PAPEL, ...pedido.parametros }
  const fonte = pedido.fonte ? parse(pedido.fonte) : null
  const [FW, FH] = P.folhaMm
  const util: [number, number] = [FW - 2 * P.margemMm, FH - 2 * P.margemMm - P.rodapeMm]
  const avisos: string[] = []

  // um formulário por face de arte, reutilizado em todas as cópias e bases
  const faces = new Map<string, { frente: FaceSvg; verso: FaceSvg; nomes: [string, string] }>()
  const formularios: FormularioPdf[] = []
  for (const chave of new Set(pedido.modelos.map((m) => m.arte))) {
    const a = pedido.artes[chave]
    if (!a) throw new Error(`arte ${chave} não enviada`)
    const i = faces.size
    const frente = lerSvg(a.frente)
    const verso = lerSvg(a.verso)
    faces.set(chave, { frente, verso, nomes: [`F${i}`, `V${i}`] })
    formularios.push(formularioArte(`F${i}`, frente), formularioArte(`V${i}`, verso))
  }

  // uma medida por arte e base
  const chaveFaixa = (m: ModeloPapel) => `${m.arte}|${m.base ? nomeBase(m.base) : 'sem-base'}`
  const medidas = new Map<string, Medida>()
  const semBase = new Set<string>()
  for (const m of pedido.modelos) {
    const k = chaveFaixa(m)
    if (!m.base) semBase.add(m.unidade)
    if (medidas.has(k)) continue
    const fc = faces.get(m.arte)!
    const md = medirFaixa(fc.frente, fc.verso, P, util, m.base)
    md.arte = m.arte
    medidas.set(k, md)
    const rot = pedido.artes[m.arte].rotulo
    if (!md.cabe) {
      avisos.push(`${rot}: a faixa de ${mm(md.faixaMm[0])} × ${mm(md.faixaMm[1])} mm não cabe numa folha A4 em tamanho real; ficou de fora.`)
    } else if (m.base && md.formaAba !== 'base') {
      avisos.push(`${rot}: a base ${rotuloBase(m.base)} não coube na folha junto com a figura; abas retangulares de ${mm(md.abaMm)} mm.`)
    } else if (md.reduzida) {
      const abas = md.formaAba === 'retangulo' && md.abaMm < P.abaMm ? `abas de ${mm(md.abaMm)} mm e ` : ''
      avisos.push(`${rot}: ${abas}${mm(md.celulaMm - md.figuraMm[1])} mm de papel sobre a cabeça, menos que o padrão, para caber na folha.`)
    }
  }
  for (const u of semBase) avisos.push(`${u}: sem base escolhida; abas retangulares de ${mm(P.abaMm)} mm, como no PDF da OPR.`)

  const copias: ModeloPapel[] = []
  for (const m of pedido.modelos) {
    if (!medidas.get(chaveFaixa(m))!.cabe) continue
    for (let k = 0; k < m.qtd; k++) copias.push(m)
  }
  const pos = distribuir(copias.map((m) => medidas.get(chaveFaixa(m))!.faixaMm), util)
  const nFolhas = pos.reduce((n, [k]) => Math.max(n, k + 1), 0)
  const paginas: string[][] = Array.from({ length: nFolhas }, () => [
    // mm, origem no canto de cima à esquerda, y para baixo
    `${num(PT, 6)} 0 0 ${num(-PT, 6)} 0 ${num(FH * PT, 4)} cm`,
  ])
  const faixas: PosicaoFaixa[] = []

  copias.forEach((m, i) => {
    const [k, ux, uy] = pos[i]
    const chave = chaveFaixa(m)
    const md = medidas.get(chave)!
    const [nf, nv] = faces.get(m.arte)!.nomes
    const x = P.margemMm + ux
    const y = P.margemMm + uy
    const [w, L] = md.faixaMm
    const T = md.abaMm
    const C = md.celulaMm
    const yCima = y + T                 // dobra dos pés do verso
    const yMeio = y + T + C             // dobra sobre a cabeça
    const yBaixo = y + T + 2 * C        // dobra dos pés da frente
    const ox = x - md.esqMm             // px da tela -> mm da folha: ox + px * S
    const ops = paginas[k]
    const comBase = md.formaAba === 'base'
    const bcx = ox + md.baseCxMm        // centro da base na folha
    const ba = comBase ? md.baseMm![0] / 2 : 0

    // dobras: tracejadas, cinza; com meia base, as dos pés só onde a aba prende
    ops.push(`q 0.45 G ${num(P.linhaDobraMm)} w [1.2 0.8] 0 d`)
    ops.push(`${num(x)} ${num(yMeio)} m ${num(x + w)} ${num(yMeio)} l S`)
    for (const yy of [yCima, yBaixo]) {
      ops.push(comBase ? `${num(bcx - ba)} ${num(yy)} m ${num(bcx + ba)} ${num(yy)} l S` : `${num(x)} ${num(yy)} m ${num(x + w)} ${num(yy)} l S`)
    }
    ops.push('Q')
    // corte: linha cheia em volta da faixa (com meia base, pelo contorno das abas)
    ops.push(`q 0 G ${num(P.linhaCorteMm)} w`)
    if (comBase) {
      ops.push(
        `${num(x)} ${num(yCima)} m ${num(x)} ${num(yBaixo)} l ${num(bcx - ba)} ${num(yBaixo)} l`,
        meiaElipse(bcx, yBaixo, ba, T),
        `${num(x + w)} ${num(yBaixo)} l ${num(x + w)} ${num(yCima)} l ${num(bcx + ba)} ${num(yCima)} l`,
        // de volta pela meia base de cima, da direita para a esquerda
        meiaElipse(bcx, yCima, -ba, -T),
        'h S',
      )
    } else {
      ops.push(`${num(x)} ${num(y)} ${num(w)} ${num(L)} re S`)
    }
    ops.push('Q')
    // arte: frente em pé com os pés na dobra de baixo; verso girado 180° com os pés na de cima
    ops.push(`q ${num(-S, 7)} 0 0 ${num(-S, 7)} ${num(ox + (md.telaPx - 1) * S, 4)} ${num(yCima + md.pesPx * S, 4)} cm /${nv} Do Q`)
    ops.push(`q ${num(S, 7)} 0 0 ${num(S, 7)} ${num(ox, 4)} ${num(yBaixo - md.pesPx * S, 4)} cm /${nf} Do Q`)
    if (fonte) {
      const l1 = `${m.numero} ${m.unidade}`
      const l2 = pedido.artes[m.arte].rotulo
      const cx = comBase ? bcx : x + w / 2
      const largura = comBase ? (d: number) => 2 * ba * Math.sqrt(Math.max(0, 1 - (d / T) ** 2)) : () => w - 1
      ops.push('q 0 g')
      ops.push(rotuloAba(fonte, l1, l2, cx, yBaixo, T, largura, comBase))
      // aba de trás: o mesmo rótulo girado 180° em volta do centro da sua dobra (lido por trás)
      ops.push(`q -1 0 0 -1 ${num(2 * cx)} ${num(2 * yCima)} cm`)
      ops.push(rotuloAba(fonte, l1, l2, cx, yCima, T, largura, comBase))
      ops.push('Q Q')
    }
    faixas.push({ folha: k, x, y, chave, arte: m.arte, numero: m.numero, unidade: m.unidade })
  })

  // rodapé: título, instrução de impressão e régua de 50 mm para conferir a escala
  const titulo = pedido.titulo?.trim() || 'Standee Forge'
  paginas.forEach((ops, k) => {
    const y0 = FH - P.margemMm - P.rodapeMm
    const xd = FW - P.margemMm
    const xr = xd - 50
    const yr = y0 + 5
    ops.push(`q 0 G 0.2 w ${num(xr)} ${num(yr)} m ${num(xd)} ${num(yr)} l S`)
    for (let d = 0; d <= 50; d += 5) {
      const h = d % 50 === 0 ? 2.2 : d % 10 === 0 ? 1.4 : 0.8
      ops.push(`${num(xr + d)} ${num(yr)} m ${num(xr + d)} ${num(yr - h)} l S`)
    }
    ops.push('Q')
    if (fonte) {
      const larg = xr - 8 - P.margemMm
      ops.push('q 0 g')
      ops.push(texto(fonte, `${titulo} · folha ${k + 1} de ${nFolhas} · Standee Forge`, P.margemMm, y0 + 3.6, 2.8, 'esq', larg))
      ops.push(texto(fonte, 'Imprima em tamanho real (100%), sem ajustar à página. Linha cheia: cortar. Tracejada: dobrar. Abas para fora: a base da unidade.',
        P.margemMm, y0 + 7, 2.4, 'esq', larg))
      ops.push(texto(fonte, '50 mm', xr - 1.5, yr + 0.9, 2.6, 'dir'))
      ops.push('Q')
    }
  })

  const arquivo = escreverPdf({
    larguraPt: FW * PT,
    alturaPt: FH * PT,
    paginas: paginas.map((p) => p.join('\n')),
    formularios,
    titulo: `${titulo} — standees de papel`,
    criador: 'Standee Forge',
    data: pedido.data,
  })
  const saida: Record<string, MedidasFaixa> = {}
  for (const [chave, m] of medidas) {
    saida[chave] = {
      arte: m.arte,
      faixaMm: [r2(m.faixaMm[0]), r2(m.faixaMm[1])], figuraMm: [r2(m.figuraMm[0]), r2(m.figuraMm[1])],
      abaMm: r2(m.abaMm), celulaMm: r2(m.celulaMm), formaAba: m.formaAba, baseMm: m.baseMm,
      desvioBaseMm: r2(m.desvioBaseMm), reduzida: m.reduzida, cabe: m.cabe,
    }
  }
  return { arquivo, folhas: nFolhas, faixas, medidas: saida, avisos }
}
