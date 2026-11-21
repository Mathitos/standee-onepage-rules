/**
 * Associação lista × catálogo (PRD-02). Com manifesto revisado, a unidade é achada pelo nome e
 * a arte pela arma (equipmentTags contidas no equipamento da variante); a base vem do army book
 * (D015). Sem correspondência, a escolha fica com o usuário, vendo as artes (D013): nada de
 * substituição automática.
 */
import type { NormalizedArmyList, UnitGroup } from '../armyforge/types'
import type { BaseSpec } from '../gerador/base'
import type { ModeloPedido } from '../gerador/gerar'
import { normalizar } from './carregar'
import type { ManifestoFaccao } from './tipos'

export type Origem = 'manifesto' | 'usuario'

export interface EscolhaVariante {
  arte: string | null
  origem: Origem | null
  /** alias ainda não aprovado pelo usuário (manifesto agent-proposed) */
  aliasProposto?: boolean
}

export interface PlanoUnidade {
  /** linha do cabeçalho da unidade no texto: chave estável enquanto o texto não muda */
  linha: number
  unidade: UnitGroup
  unitKey: string | null
  base: BaseSpec | null
  baseOrigem: Origem | null
  variantes: EscolhaVariante[]
}

export function baseDoManifesto(b: ManifestoFaccao['units'][number]['base'] | undefined): BaseSpec | null {
  if (!b?.dimensionsMm?.length) return null
  if (b.shape === 'round') return { forma: 'redonda', mm: [b.dimensionsMm[0]] }
  if (b.shape === 'oval' && b.dimensionsMm.length >= 2) return { forma: 'oval', mm: [b.dimensionsMm[0], b.dimensionsMm[1]] }
  return null
}

export function sugerir(lista: NormalizedArmyList, manifesto: ManifestoFaccao | null): PlanoUnidade[] {
  return lista.units.map((u) => {
    const un = manifesto?.units.find((x) => x.names.some((n) => normalizar(n) === normalizar(u.name)))
    const base = baseDoManifesto(un?.base)
    const variantes = u.variants.map((v): EscolhaVariante => {
      if (!un || !manifesto) return { arte: null, origem: null }
      const equip = new Set(v.equipment.map((e) => normalizar(e.replace(/^\d+x\s+/, ''))))
      let melhor: ManifestoFaccao['arts'][number] | null = null
      let pontos = 0
      for (const a of manifesto.arts) {
        if (a.unitKey !== un.unitKey || a.cosmetic || a.mappingStatus === 'unmapped' || !a.equipmentTags.length) continue
        const tags = a.equipmentTags.map(normalizar)
        if (!tags.every((t) => equip.has(t))) continue
        if (tags.length > pontos) {
          melhor = a
          pontos = tags.length
        }
      }
      return melhor
        ? { arte: melhor.artId, origem: 'manifesto', aliasProposto: melhor.mappingStatus === 'alias-proposed' }
        : { arte: null, origem: null }
    })
    return { linha: u.line, unidade: u, unitKey: un?.unitKey ?? null, base, baseOrigem: base ? 'manifesto' : null, variantes }
  })
}

export function resolvida(p: PlanoUnidade): boolean {
  return !!p.base && p.variantes.every((v) => !!v.arte)
}

/**
 * Modelos para o gerador. Numeração na ordem da lista, com "2x" como duas unidades (D035):
 * 2x Veterans viram 3 e 4. Unidades não resolvidas ficam de fora (e numeradas mesmo assim, para
 * os números baterem com a lista).
 */
export function modelosDoPlano(plano: PlanoUnidade[]): { modelos: ModeloPedido[]; omitidas: string[] } {
  const modelos: ModeloPedido[] = []
  const omitidas: string[] = []
  let numero = 1
  for (const p of plano) {
    const ok = resolvida(p)
    if (!ok) omitidas.push(p.unidade.name)
    for (let c = 0; c < p.unidade.copies; c++, numero++) {
      if (!ok) continue
      p.unidade.variants.forEach((v, i) => {
        if (v.modelsPerUnit > 0) {
          modelos.push({ unidade: p.unidade.name, numero, qtd: v.modelsPerUnit, arte: p.variantes[i].arte!, base: p.base! })
        }
      })
    }
  }
  return { modelos, omitidas }
}
