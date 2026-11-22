/**
 * Folhas A4 de standees de papel (D044): uma faixa dobrável por modelo da lista, no formato do PDF
 * da OPR (rótulo | frente | verso | aba), em pé e várias por folha, na escala do PDF a 100% (D014):
 * a arte vem dos SVG do catálogo (600 dpi) sem redimensionar.
 *
 * Faixa, de cima para baixo:
 *   aba de trás (rótulo girado 180°) | verso girado 180°, pés na dobra de cima |
 *   dobra do meio (sobre a cabeça) | frente em pé, pés na dobra de baixo | aba da frente (rótulo)
 * Dobrada no meio, a metade de cima cai atrás da frente. O giro de 180° no papel equivale ao
 * espelho em x que alinha o verso à frente (D020: x -> W - 1 - x nos centros dos pixels), então
 * as silhuetas coincidem e dá para colar e recortar no contorno (método 2 da OPR) ou montar em
 * tenda (método 1).
 */
import { parse, type Font, type PathCommand } from 'opentype.js'
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
  /** abas das pontas da faixa (rótulo e aba de colar ou de apoio) */
  abaMm: number
  abaMinMm: number
  /** papel acima da cabeça, em cada metade */
  folgaCabecaMm: number
  folgaCabecaMinMm: number
  /** papel de cada lado da figura */
  ladoMm: number
  larguraMinMm: number
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

export interface FaixaArte {
  /** largura × comprimento da faixa inteira */
  faixaMm: [number, number]
  /** largura × altura da figura (frente com o verso espelhado por cima) */
  figuraMm: [number, number]
  abaMm: number
  celulaMm: number
  /** aba ou folga menor que o padrão para caber na folha */
  reduzida: boolean
  cabe: boolean
}

export interface PosicaoFaixa {
  folha: number
  x: number
  y: number
  arte: string
  numero: number
  unidade: string
}

export interface ResultadoPapel {
  arquivo: Uint8Array
  folhas: number
  faixas: PosicaoFaixa[]
  artes: Record<string, FaixaArte>
  avisos: string[]
}

const r2 = (n: number) => Math.round(n * 100) / 100
/** mm nos avisos, com vírgula: 14,37 */
const mm = (n: number) => String(r2(n)).replace('.', ',')

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

interface Medida extends FaixaArte {
  /** largura da tela em px (frente e verso iguais) */
  telaPx: number
  /** linha dos pés na tela, px contínuos (borda de baixo do pixel mais baixo) */
  pesPx: number
  /** meio da figura em x, px (centros) */
  centroPx: number
}

/** Medidas da faixa de uma arte; encurta folga e abas se a faixa não couber na altura útil. */
export function medirFaixa(frente: FaceSvg, verso: FaceSvg, P: ParametrosPapel, util: [number, number]): Medida {
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
  const largura = Math.max(P.larguraMinMm, figW + 2 * P.ladoMm)
  let folga = P.folgaCabecaMm
  let aba = P.abaMm
  const comprimento = () => 2 * (figH + folga) + 2 * aba
  if (comprimento() > util[1]) folga = Math.max(P.folgaCabecaMinMm, (util[1] - 2 * aba) / 2 - figH)
  if (comprimento() > util[1]) aba = Math.max(P.abaMinMm, util[1] / 2 - figH - folga)
  return {
    faixaMm: [largura, comprimento()],
    figuraMm: [figW, figH],
    abaMm: aba,
    celulaMm: figH + folga,
    reduzida: folga < P.folgaCabecaMm || aba < P.abaMm,
    cabe: comprimento() <= util[1] + 1e-9 && largura <= util[0] + 1e-9,
    telaPx: W,
    pesPx,
    centroPx: (ux0 + ux1) / 2,
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

/** Duas linhas centradas numa aba: "3 Veterans" e o rótulo da arte. */
function rotuloAba(fonte: Font, l1: string, l2: string, x: number, y: number, w: number, aba: number) {
  const t1 = Math.min(3.6, aba * 0.2)
  const t2 = Math.min(2.8, aba * 0.16)
  const vao = 0.25 * t1 + 0.8
  const bloco = 0.7 * t1 + vao + 0.7 * t2
  const b1 = y + (aba - bloco) / 2 + 0.7 * t1
  const b2 = b1 + vao + 0.7 * t2
  return texto(fonte, l1, x + w / 2, b1, t1, 'centro', w - 3) + texto(fonte, l2, x + w / 2, b2, t2, 'centro', w - 3)
}

export function gerarPapel(pedido: PedidoPapel): ResultadoPapel {
  const P: ParametrosPapel = { ...PADRAO_PAPEL, ...pedido.parametros }
  const fonte = pedido.fonte ? parse(pedido.fonte) : null
  const [FW, FH] = P.folhaMm
  const util: [number, number] = [FW - 2 * P.margemMm, FH - 2 * P.margemMm - P.rodapeMm]
  const avisos: string[] = []

  const usadas = [...new Set(pedido.modelos.map((m) => m.arte))]
  const medidas = new Map<string, Medida>()
  const formularios: FormularioPdf[] = []
  const nomes = new Map<string, [string, string]>()
  usadas.forEach((chave, i) => {
    const a = pedido.artes[chave]
    if (!a) throw new Error(`arte ${chave} não enviada`)
    const frente = lerSvg(a.frente)
    const verso = lerSvg(a.verso)
    const m = medirFaixa(frente, verso, P, util)
    medidas.set(chave, m)
    if (!m.cabe) {
      avisos.push(`${a.rotulo}: a faixa de ${mm(m.faixaMm[0])} × ${mm(m.faixaMm[1])} mm não cabe numa folha A4 em tamanho real; ficou de fora.`)
      return
    }
    if (m.reduzida) {
      avisos.push(`${a.rotulo}: abas de ${mm(m.abaMm)} mm e ${mm(m.celulaMm - m.figuraMm[1])} mm de papel sobre a cabeça, menos que o padrão, para caber na folha.`)
    }
    const nf = `F${i}`
    const nv = `V${i}`
    formularios.push(formularioArte(nf, frente), formularioArte(nv, verso))
    nomes.set(chave, [nf, nv])
  })

  const copias: ModeloPapel[] = []
  for (const m of pedido.modelos) {
    if (!medidas.get(m.arte)!.cabe) continue
    for (let k = 0; k < m.qtd; k++) copias.push(m)
  }
  const pos = distribuir(copias.map((m) => medidas.get(m.arte)!.faixaMm), util)
  const nFolhas = pos.reduce((n, [k]) => Math.max(n, k + 1), 0)
  const paginas: string[][] = Array.from({ length: nFolhas }, () => [
    // mm, origem no canto de cima à esquerda, y para baixo
    `${num(PT, 6)} 0 0 ${num(-PT, 6)} 0 ${num(FH * PT, 4)} cm`,
  ])
  const faixas: PosicaoFaixa[] = []

  copias.forEach((m, i) => {
    const [k, ux, uy] = pos[i]
    const md = medidas.get(m.arte)!
    const [nf, nv] = nomes.get(m.arte)!
    const x = P.margemMm + ux
    const y = P.margemMm + uy
    const [w, L] = md.faixaMm
    const T = md.abaMm
    const C = md.celulaMm
    const ops = paginas[k]
    // dobras: tracejadas, cinza
    ops.push(`q 0.45 G ${num(P.linhaDobraMm)} w [1.2 0.8] 0 d`)
    for (const yy of [y + T, y + T + C, y + T + 2 * C]) ops.push(`${num(x)} ${num(yy)} m ${num(x + w)} ${num(yy)} l S`)
    ops.push('Q')
    // corte: contorno da faixa, linha cheia
    ops.push(`q 0 G ${num(P.linhaCorteMm)} w ${num(x)} ${num(y)} ${num(w)} ${num(L)} re S Q`)
    // arte: frente em pé com os pés na dobra de baixo; verso girado 180° com os pés na de cima
    const ox = x + w / 2 - md.centroPx * S
    ops.push(`q ${num(-S, 7)} 0 0 ${num(-S, 7)} ${num(ox + (md.telaPx - 1) * S, 4)} ${num(y + T + md.pesPx * S, 4)} cm /${nv} Do Q`)
    ops.push(`q ${num(S, 7)} 0 0 ${num(S, 7)} ${num(ox, 4)} ${num(y + T + 2 * C - md.pesPx * S, 4)} cm /${nf} Do Q`)
    if (fonte) {
      const l1 = `${m.numero} ${m.unidade}`
      const l2 = pedido.artes[m.arte].rotulo
      ops.push('q 0 g')
      ops.push(rotuloAba(fonte, l1, l2, x, y + T + 2 * C, w, T))
      // aba de trás: o mesmo rótulo girado 180° em volta do centro da aba (lido por trás)
      ops.push(`q -1 0 0 -1 ${num(2 * x + w)} ${num(2 * y + T)} cm`)
      ops.push(rotuloAba(fonte, l1, l2, x, y, w, T))
      ops.push('Q Q')
    }
    faixas.push({ folha: k, x, y, arte: m.arte, numero: m.numero, unidade: m.unidade })
  })

  // rodapé: título, instrução de impressão e régua de 50 mm para conferir a escala
  const titulo = pedido.titulo?.trim() || 'Standee Forge'
  paginas.forEach((ops, k) => {
    const y0 = FH - P.margemMm - P.rodapeMm
    const xd = FW - P.margemMm
    const xr = xd - 50
    const yr = y0 + 5
    ops.push(`q 0 G 0.2 w ${num(xr)} ${num(yr)} m ${num(xd)} ${num(yr)} l S`)
    for (let mm = 0; mm <= 50; mm += 5) {
      const h = mm % 50 === 0 ? 2.2 : mm % 10 === 0 ? 1.4 : 0.8
      ops.push(`${num(xr + mm)} ${num(yr)} m ${num(xr + mm)} ${num(yr - h)} l S`)
    }
    ops.push('Q')
    if (fonte) {
      const larg = xr - 8 - P.margemMm
      ops.push('q 0 g')
      ops.push(texto(fonte, `${titulo} · folha ${k + 1} de ${nFolhas} · Standee Forge`, P.margemMm, y0 + 3.6, 2.8, 'esq', larg))
      ops.push(texto(fonte, 'Imprima em tamanho real (100%), sem ajustar à página. Linha cheia: cortar. Tracejada: dobrar.',
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
  const artes: Record<string, FaixaArte> = {}
  for (const [chave, m] of medidas) {
    artes[chave] = {
      faixaMm: [r2(m.faixaMm[0]), r2(m.faixaMm[1])], figuraMm: [r2(m.figuraMm[0]), r2(m.figuraMm[1])],
      abaMm: r2(m.abaMm), celulaMm: r2(m.celulaMm), reduzida: m.reduzida, cabe: m.cabe,
    }
  }
  return { arquivo, folhas: nFolhas, faixas, artes, avisos }
}
