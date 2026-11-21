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

export const urlArte = (f: FaccaoIndice, id: string, estilo: Estilo, lado: 'frente' | 'verso') =>
  `${BASE_CATALOGO}/${f.caminho}/arts/${id}/${estilo}/${lado}.svg`

export const urlRotulo = (f: FaccaoIndice, a: ArteCatalogo) => (a.rotuloImg ? `${BASE_CATALOGO}/${f.caminho}/${a.rotuloImg}` : null)

export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Facção do catálogo com o mesmo nome do exército da lista, se houver. */
export function faccaoDaLista(indice: IndiceCatalogo, exercito: string | null | undefined): FaccaoIndice | null {
  if (!exercito) return null
  const alvo = normalizar(exercito)
  return indice.faccoes.find((f) => normalizar(f.faccao) === alvo) ?? null
}

/** Estilo disponível mais próximo do pedido (algumas artes só existem num estilo). */
export function estiloDisponivel(a: ArteCatalogo, pedido: Estilo): Estilo | null {
  if (a.estilos[pedido]) return pedido
  const outro: Estilo = pedido === 'fino' ? 'borda' : 'fino'
  return a.estilos[outro] ? outro : null
}
