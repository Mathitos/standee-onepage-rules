import type { BasesFaccao } from './basesArmyBook'
import type { ArteCatalogo, ArtesFaccao, Estilo, FaccaoIndice, IndiceCatalogo, ManifestoFaccao } from './tipos'

/** Relativo à página: funciona no GitHub Pages em qualquer subcaminho. */
export const BASE_CATALOGO = './catalogo'

const cache = new Map<string, Promise<unknown>>()

function json<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    const p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
      return r.json()
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return cache.get(url) as Promise<T>
}

export async function texto(url: string): Promise<string> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
  return r.text()
}

export const carregarIndice = () => json<IndiceCatalogo>(`${BASE_CATALOGO}/index.json`)
export const carregarArtes = (f: FaccaoIndice) => json<ArtesFaccao>(`${BASE_CATALOGO}/${f.caminho}/artes.json`)
export const carregarManifesto = (f: FaccaoIndice) =>
  f.manifesto ? json<ManifestoFaccao>(`${BASE_CATALOGO}/${f.caminho}/manifest.json`) : Promise.resolve(null)
/** Bases de todas as unidades dos army books; sem o arquivo, a base fica só a do manifesto. */
export const carregarBases = (f: FaccaoIndice) =>
  f.bases ? json<BasesFaccao>(`${BASE_CATALOGO}/${f.caminho}/bases.json`).catch(() => null) : Promise.resolve(null)

export const urlArte = (f: FaccaoIndice, id: string, estilo: Estilo, lado: 'frente' | 'verso') =>
  `${BASE_CATALOGO}/${f.caminho}/arts/${id}/${estilo}/${lado}.svg`

export const urlRotulo = (f: FaccaoIndice, a: ArteCatalogo) => (a.rotuloImg ? `${BASE_CATALOGO}/${f.caminho}/${a.rotuloImg}` : null)

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Pasta do catálogo para o código de sistema do cabeçalho da lista: GF e GFF usam as artes de
 * ficção científica (gff); AOF, AOFS e AOFR, as de fantasia (aof). Os códigos são os nomes do
 * enum de sistemas do Army Forge em maiúsculas (vistos no código público do site em 21/11; "GFF"
 * também num texto real em 17/11).
 */
export function familiaDoSistema(codigo: string | null | undefined): 'gff' | 'aof' | null {
  const c = (codigo ?? '').toUpperCase()
  if (/^GFF?$/.test(c)) return 'gff'
  if (/^AOF[SR]?$/.test(c)) return 'aof'
  return null
}

/**
 * Facção do catálogo com o nome do exército da lista (nome da facção ou do army book) e do mesmo
 * sistema: "Daemons of Change" existe no GF e no AoF com army books e artes diferentes.
 */
export function faccaoDaLista(
  indice: IndiceCatalogo,
  exercito: string | null | undefined,
  codigoSistema?: string | null,
): FaccaoIndice | null {
  if (!exercito) return null
  // lista com nome próprio: "Minha lista - Human Defense Force"; vale o army book depois do " - "
  const partes = exercito.split(' - ')
  const alvos = new Set(partes.map((_, i) => normalizar(partes.slice(i).join(' - '))))
  const mesmas = indice.faccoes.filter((f) => [f.faccao, ...(f.exercitos ?? [])].some((n) => alvos.has(normalizar(n))))
  const familia = familiaDoSistema(codigoSistema)
  if (!familia) return mesmas[0] ?? null
  return mesmas.find((f) => f.sistema === familia) ?? null
}

/** Estilo disponível mais próximo do pedido (algumas artes só existem num estilo). */
export function estiloDisponivel(a: ArteCatalogo, pedido: Estilo): Estilo | null {
  if (a.estilos[pedido]) return pedido
  const outro: Estilo = pedido === 'fino' ? 'borda' : 'fino'
  return a.estilos[outro] ? outro : null
}
