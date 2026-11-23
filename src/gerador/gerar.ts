/**
 * Gera o projeto 3MF de uma lista resolvida, no caminho padrão do protótipo: duas metades em
 * preto em relevo (D041/D045; a peça única pintada fica como opção), lateral preta, base com
 * nome e número, uma unidade por placa (D037), perfil da A1 embutido (D026). Roda no Web Worker
 * do site e no Node (testes). Port de prototipo/gerar.py main().
 */
import type { ManifoldToplevel } from 'manifold-3d'
import { base, nomeBase, type BaseSpec, type MedidasBase } from './base'
import { metadesPretoRelevo, paraMalha, pecaUnicaPintada, type MedidasCorpo, type Parte } from './figura'
import { liberar } from './manifold'
import { espessuraPeca, PADRAO, type Parametros } from './parametros'
import { empacotar } from './placas'
import { lerSvg } from './svg'
import { carregarFonte } from './texto'
import { escrever3mf, type Objeto3mf, type ParteMalha, type Placa3mf } from './tresmf'

export const VERSAO_GERADOR = 'site-0.1'

export interface ModeloPedido {
  unidade: string
  /** posição da unidade na lista (D035); unidades repetidas têm números diferentes */
  numero: number
  qtd: number
  /** chave em Pedido.artes */
  arte: string
  base: BaseSpec
}

export interface ArtePedido {
  rotulo: string
  /** textos dos SVG (contrato v2) */
  frente: string
  verso: string
}

export interface Pedido {
  modelos: ModeloPedido[]
  artes: Record<string, ArtePedido>
  parametros?: Partial<Parametros>
  /** project_settings.config da impressora (public/bambu/*.json, campo "projeto") */
  projeto?: Record<string, unknown> | null
  /** fonte do nome na base (woff/ttf/otf) */
  fonte?: ArrayBuffer | null
}

export interface Checagem {
  peca: string
  status: string
  volumeMm3: number
  genus: number
}

export interface Resultado {
  arquivo: Uint8Array
  modo: Parametros['modo']
  /** espessura da lingueta que entra na fenda (as metades coladas, ou a peça única) */
  espessuraLinguetaMm: number
  placas: { nome: string; pecas: number }[]
  /** pecaMm: a caixa de cada metade (as duas têm a mesma) ou da peça única; objetos: chaves no 3MF */
  artes: Record<string, { pecaMm: [number, number]; medidas: MedidasCorpo; objetos: string[] }>
  bases: Record<string, { dimMm: [number, number]; medidas: MedidasBase }>
  checagens: Checagem[]
  avisos: string[]
  tempoMs: number
  versao: string
}

export type Progresso = (feito: number, total: number, etapa: string) => void

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function chaveBase(m: ModeloPedido, P: Parametros): string {
  let k = `base-${nomeBase(m.base)}-plana`
  if (P.nomeNaBase) k += (P.numeroNaBase ? `-${m.numero}` : '') + `-${slug(m.unidade)}`
  return k
}

/** Converte as partes para malhas comuns, confere cada uma e devolve a caixa (x, y) do conjunto. */
function fechar(nome: string, partes: Parte[], checagens: Checagem[]) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  const malhas: ParteMalha[] = []
  for (const p of partes) {
    const bb = p.malha.boundingBox()
    x0 = Math.min(x0, bb.min[0])
    y0 = Math.min(y0, bb.min[1])
    x1 = Math.max(x1, bb.max[0])
    y1 = Math.max(y1, bb.max[1])
    checagens.push({ peca: `${nome} ${p.rotulo}`, status: p.malha.status(), volumeMm3: Math.round(p.malha.volume() * 100) / 100, genus: p.malha.genus() })
    malhas.push({ malha: paraMalha(p.malha), cor: p.cor, rotulo: p.rotulo })
  }
  return { malhas, dim: [Math.round((x1 - x0) * 100) / 100, Math.round((y1 - y0) * 100) / 100] as [number, number] }
}

export async function gerar(w: ManifoldToplevel, pedido: Pedido, progresso?: Progresso): Promise<Resultado> {
  const t0 = Date.now()
  const P: Parametros = { ...PADRAO, ...pedido.parametros }
  const fonte = pedido.fonte ? carregarFonte(pedido.fonte) : null
  if (P.nomeNaBase && !fonte) throw new Error('nome na base pedido sem fonte')
  const avisos: string[] = []
  const checagens: Checagem[] = []
  const objetos: Record<string, Objeto3mf> = {}
  const artes: Resultado['artes'] = {}
  const bases: Resultado['bases'] = {}
  const usadas = [...new Set(pedido.modelos.map((m) => m.arte))]
  const basesUsadas = [...new Map(pedido.modelos.map((m) => [chaveBase(m, P), m])).values()]
  const total = usadas.length + basesUsadas.length + 1
  let feito = 0
  const passo = async (etapa: string) => {
    progresso?.(++feito, total, etapa)
    await new Promise((r) => setTimeout(r, 0))   // deixa as mensagens de progresso saírem
  }

  for (const chave of usadas) {
    const a = pedido.artes[chave]
    if (!a) throw new Error(`arte ${chave} não enviada`)
    try {
      if (P.modo === 'duas-metades') {
        const { metades, medidas } = metadesPretoRelevo(w, lerSvg(a.frente), lerSvg(a.verso), P)
        const chaves: string[] = []
        let dim: [number, number] = [0, 0]
        for (const { lado, partes } of metades) {
          const k = `${chave}-${lado}`
          const f = fechar(k, partes, checagens)
          objetos[k] = { nome: `${a.rotulo} - ${lado}`, partes: f.malhas }
          chaves.push(k)
          dim = [Math.max(dim[0], f.dim[0]), Math.max(dim[1], f.dim[1])]
        }
        artes[chave] = { pecaMm: dim, medidas, objetos: chaves }
      } else {
        const { partes, medidas } = pecaUnicaPintada(w, lerSvg(a.frente), lerSvg(a.verso), P)
        const { malhas, dim } = fechar(chave, partes, checagens)
        objetos[chave] = { nome: a.rotulo, partes: malhas }
        artes[chave] = { pecaMm: dim, medidas, objetos: [chave] }
      }
    } finally {
      liberar()
    }
    await passo(`figura ${a.rotulo}`)
  }

  const esp = espessuraPeca(P)
  for (const m of basesUsadas) {
    const kb = chaveBase(m, P)
    const nome = P.nomeNaBase ? m.unidade : null
    const num = P.nomeNaBase && P.numeroNaBase ? m.numero : null
    try {
      const { partes, medidas } = base(w, m.base, P, esp, fonte, nome, num)
      const { malhas, dim } = fechar(kb, partes, checagens)
      const rotulo = `Base ${nomeBase(m.base)}` + (num != null ? ` - ${num} ${nome}` : nome ? ` - ${nome}` : '')
      objetos[kb] = { nome: rotulo, partes: malhas }
      bases[kb] = { dimMm: dim, medidas }
      if (medidas.nome && !medidas.nome.coube) avisos.push(`O nome "${nome}" não coube na base ${nomeBase(m.base)}, mesmo com letras de ${P.textoMin} mm.`)
    } finally {
      liberar()
    }
    await passo(`base ${nomeBase(m.base)}${nome ? ' ' + nome : ''}`)
  }

  for (const m of pedido.modelos) {
    const art = artes[m.arte]
    const meio = m.base.mm[0] / 2
    const sobra = Math.max(art.medidas.figuraEsqMm, art.medidas.figuraDirMm) - meio
    const aviso = `${pedido.artes[m.arte].rotulo}: a figura passa ${sobra.toFixed(1)} mm da borda da base ${nomeBase(m.base)} (${m.unidade}).`
    // "2x Assault Grunts" são duas unidades com a mesma arte e base: um aviso basta
    if (sobra > 0 && !avisos.includes(aviso)) avisos.push(aviso)
  }

  // D037: uma placa por unidade da lista, figuras e bases juntas, na ordem do número
  const porUnidade = new Map<string, { numero: number; unidade: string; pecas: [string, number, number][] }>()
  for (const m of pedido.modelos) {
    const k = `${m.numero}\u0000${m.unidade}`
    if (!porUnidade.has(k)) porUnidade.set(k, { numero: m.numero, unidade: m.unidade, pecas: [] })
    const g = porUnidade.get(k)!
    for (let i = 0; i < m.qtd; i++) {
      // as duas metades têm a mesma caixa (o contorno do verso é o da frente espelhado)
      for (const k of artes[m.arte].objetos) g.pecas.push([k, ...artes[m.arte].pecaMm])
      const kb = chaveBase(m, P)
      g.pecas.push([kb, ...bases[kb].dimMm])
    }
  }
  const placas: Placa3mf[] = []
  const torres: ([number, number] | null)[] = []
  const info: Resultado['placas'] = []
  for (const g of [...porUnidade.values()].sort((A, B) => A.numero - B.numero)) {
    const grupo = empacotar(g.pecas, P, P.torreXyxyBases)
    grupo.forEach((pl, i) => {
      const nome = `${g.numero} ${g.unidade}` + (grupo.length > 1 ? ` (${i + 1}/${grupo.length})` : '')
      placas.push([nome, pl.map(([k, x, y]) => [k, x, y] as [string, number, number])])
      torres.push(P.torrePosBases)
      info.push({ nome, pecas: pl.length })
      // nada sobreposto nem fora da mesa
      pl.forEach(([, x1, y1, w1, h1], j) => {
        if (x1 < 0 || y1 < 0 || x1 + w1 > P.mesa || y1 + h1 > P.mesa) throw new Error(`peça fora da mesa na placa ${nome}`)
        for (const [, x2, y2, w2, h2] of pl.slice(j + 1)) {
          if (!(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1)) throw new Error(`peças sobrepostas na placa ${nome}`)
        }
      })
    })
  }
  const arquivo = escrever3mf(objetos, placas, {
    ajustes: P.paredes ? { wall_generator: P.paredes } : null,
    projeto: pedido.projeto ?? null,
    mesa: P.mesa,
    torres,
  })
  if (!pedido.projeto) avisos.push('Sem perfil da impressora: o Bambu Studio vai abrir só a geometria.')
  const ruins = checagens.filter((c) => c.status !== 'NoError' || !(c.volumeMm3 > 0))
  if (ruins.length) avisos.push(`Malhas com problema: ${ruins.map((c) => c.peca).join(', ')}`)
  await passo('3MF')
  return {
    arquivo, modo: P.modo, espessuraLinguetaMm: Math.round(esp * 100) / 100, placas: info, artes, bases, checagens, avisos,
    tempoMs: Date.now() - t0, versao: VERSAO_GERADOR,
  }
}
