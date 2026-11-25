/**
 * Bases de todas as unidades dos army books de uma facção (D015). O manifesto só traz as
 * unidades que têm arte no PDF; as outras (ex.: Grunt Veteran no Alien Hives) ficavam sem base
 * no site, mesmo com a medida no army book. O plugin do Vite grava isto em
 * catalogo/<sistema>/<facção>/bases.json a partir de catalog/<sistema>/<facção>/armybook/; os
 * testes chamam a mesma função. Port de montar.py base_de().
 */
import type { UnitGroup } from '../armyforge/types'
// com extensão: o vite.config.ts também lê este arquivo
import { normalizar } from './carregar.ts'
import type { BaseManifesto } from './tipos'

/** Ganho de um upgrade no army book: arma, regra ou item (com o que ele dá em `content`). */
interface GanhoArmyForge {
  type?: string
  name?: string
  rating?: number | string | null
  bases?: { round?: string | null } | null
  content?: GanhoArmyForge[]
}

/** O que é lido do snapshot do army book do Army Forge (armybook/*-gs<N>-v<versão>.json). */
export interface LivroArmyForge {
  name?: string
  versionString?: string
  gameSystemId?: number
  units?: {
    id: string
    name: string
    bases?: { round?: string | null } | null
    rules?: { name: string; rating?: number | string | null }[]
    weapons?: { name: string }[]
    upgrades?: string[]
  }[]
  upgradePackages?: { uid: string; sections?: { options?: { gains?: GanhoArmyForge[] }[] }[] }[]
}

export interface RegraNota {
  nome: string
  nota: number | null
}

/**
 * Item de upgrade que troca a base da unidade (montaria, carruagem: "Disc of Change" põe o
 * Champion of Change, de 25 mm, numa base de 40 mm). O texto da lista do Army Forge não traz o
 * nome do item, só as regras e as armas que ele dá (getListAsText/getAllUpgradedRules, no código
 * público do site, lido em 25/11): por isso elas vão junto.
 */
export interface ItemComBase {
  nome: string
  base: BaseManifesto
  regras: RegraNota[]
  armas: string[]
}

/** A unidade num sistema do Army Forge (id), quando ela tem itens que trocam a base. */
export interface UnidadeNoSistema {
  sistema: number | null
  regras: RegraNota[]
  armas: string[]
  itensComBase: ItemComBase[]
}

export interface BasesFaccao {
  livros: { nome: string | null; versao: string | null; sistema: number | null }[]
  /** uma entrada por unidade (id do Army Forge), com os nomes dela em todos os sistemas */
  unidades: { armyForgeUnitId: string; nomes: string[]; base: BaseManifesto; sistemas?: UnidadeNoSistema[] }[]
}

const nota = (r: number | string | null | undefined): number | null => {
  const n = Number(r)
  return r != null && Number.isFinite(n) ? n : null
}

/** Itens dos upgrades da unidade com base diferente da dela, com as regras e armas que dão. */
function itensComBase(u: NonNullable<LivroArmyForge['units']>[number], pacotes: Map<string, NonNullable<LivroArmyForge['upgradePackages']>[number]>): ItemComBase[] {
  const porNome = new Map<string, ItemComBase>()
  for (const uid of u.upgrades ?? []) {
    for (const s of pacotes.get(uid)?.sections ?? []) {
      for (const o of s.options ?? []) {
        for (const g of o.gains ?? []) {
          const base = baseDoBruto(g.bases?.round)
          if (!g.name || base.shape === 'unknown' || g.bases?.round === u.bases?.round || porNome.has(g.name)) continue
          const c = g.content ?? []
          porNome.set(g.name, {
            nome: g.name,
            base,
            regras: c.filter((x) => x.type === 'ArmyBookRule' && x.name).map((x) => ({ nome: x.name!, nota: nota(x.rating) })),
            armas: c.filter((x) => x.type === 'ArmyBookWeapon' && x.name).map((x) => x.name!),
          })
        }
      }
    }
  }
  return [...porNome.values()]
}

/** montar.py base_de(): "25" = redonda; "60x35" = oval (maior x menor); o resto ("none") = desconhecida. */
export function baseDoBruto(raw: string | null | undefined): BaseManifesto {
  if (raw == null) return { shape: 'unknown', dimensionsMm: null, raw: null }
  const s = String(raw).trim().toLowerCase()
  if (/^\d+(\.\d+)?$/.test(s)) return { shape: 'round', dimensionsMm: [Number(s)], raw: String(raw) }
  const m = /^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)$/.exec(s)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    return { shape: 'oval', dimensionsMm: [Math.max(a, b), Math.min(a, b)], raw: String(raw) }
  }
  return { shape: 'unknown', dimensionsMm: null, raw: String(raw) }
}

/**
 * Junta as unidades de todos os army books da facção pelo id: o mesmo army book vem em vários
 * sistemas (GF e GFF; AoF e Skirmish), com o mesmo id e às vezes outro nome ("Support Grunts" e
 * "Support Grunt"). A base é a do primeiro livro em que a unidade aparece; a skill já recusa
 * bases diferentes entre sistemas (unidades.py).
 */
export function basesDosArmyBooks(livros: LivroArmyForge[]): BasesFaccao {
  const porId = new Map<string, BasesFaccao['unidades'][number]>()
  for (const l of livros) {
    const pacotes = new Map((l.upgradePackages ?? []).map((p) => [p.uid, p]))
    for (const u of l.units ?? []) {
      let e = porId.get(u.id)
      if (e) {
        if (!e.nomes.includes(u.name)) e.nomes.push(u.name)
      } else {
        e = { armyForgeUnitId: u.id, nomes: [u.name], base: baseDoBruto(u.bases?.round) }
        porId.set(u.id, e)
      }
      const itens = itensComBase(u, pacotes)
      if (itens.length) {
        ;(e.sistemas ??= []).push({
          sistema: l.gameSystemId ?? null,
          regras: (u.rules ?? []).map((r) => ({ nome: r.name, nota: nota(r.rating) })),
          armas: (u.weapons ?? []).map((w) => w.name),
          itensComBase: itens,
        })
      }
    }
  }
  return {
    livros: livros.map((l) => ({ nome: l.name ?? null, versao: l.versionString ?? null, sistema: l.gameSystemId ?? null })),
    unidades: [...porId.values()],
  }
}

/** Código do sistema no cabeçalho da lista -> id do sistema no Army Forge (D040). */
const SISTEMA_ID: Record<string, number> = { GF: 2, GFF: 3, AOF: 4, AOFS: 5 }

/**
 * Item que troca a base, reconhecido pelo que ele dá: no texto do Army Forge, as regras dos itens
 * entram na linha de regras (Tough soma; as outras com nota ficam com a maior) e as armas na de
 * equipamento. O item vale quando tudo o que ele dá está na lista e ao menos uma coisa não é da
 * própria unidade (Tough conta quando passa da soma). Achados com bases diferentes: ambíguo, e
 * a base fica a da unidade.
 */
export function itemComBaseDaLista(
  u: UnitGroup, entrada: BasesFaccao['unidades'][number] | undefined, codigoSistema: string | null | undefined,
): { item: ItemComBase | null; ambiguo: boolean } {
  const sistemas = entrada?.sistemas ?? []
  if (!sistemas.length) return { item: null, ambiguo: false }
  const id = codigoSistema ? SISTEMA_ID[codigoSistema.toUpperCase()] : undefined
  const doSistema = sistemas.filter((s) => s.sistema === id)
  const naLista = new Map<string, number | null>()
  for (const r of u.rules) {
    const m = /^(.*?)\s*\((\d+)\)$/.exec(r.name)
    naLista.set(normalizar(m ? m[1] : r.name), m ? Number(m[2]) : null)
  }
  const armasNaLista = new Set(u.equipment.map((e) => normalizar(e.name)))
  const achados: ItemComBase[] = []
  for (const s of doSistema.length ? doSistema : sistemas) {
    const daUnidade = new Map(s.regras.map((r) => [normalizar(r.nome), r.nota]))
    const armasDaUnidade = new Set(s.armas.map(normalizar))
    for (const it of s.itensComBase) {
      let proprio = false
      const regrasOk = it.regras.every((r) => {
        const n = normalizar(r.nome)
        if (!naLista.has(n)) return false
        const vista = naLista.get(n) ?? null
        if (r.nota != null) {
          if (vista == null) return false
          const minimo = n === 'tough' ? (daUnidade.get(n) ?? 0) + r.nota : r.nota
          if (vista < minimo) return false
          if (n === 'tough') proprio = true
        }
        if (!daUnidade.has(n)) proprio = true
        return true
      })
      const armasOk = it.armas.every((a) => {
        const n = normalizar(a)
        if (!armasNaLista.has(n)) return false
        if (!armasDaUnidade.has(n)) proprio = true
        return true
      })
      if (regrasOk && armasOk && proprio && !achados.some((x) => x.nome === it.nome)) achados.push(it)
    }
  }
  const bases = new Set(achados.map((i) => `${i.base.shape}:${i.base.dimensionsMm?.join('x')}`))
  if (bases.size === 1) return { item: achados[0], ambiguo: false }
  return { item: null, ambiguo: bases.size > 1 }
}
