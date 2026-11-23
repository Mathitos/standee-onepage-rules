/**
 * Bases de todas as unidades dos army books de uma facção (D015). O manifesto só traz as
 * unidades que têm arte no PDF; as outras (ex.: Grunt Veteran no Alien Hives) ficavam sem base
 * no site, mesmo com a medida no army book. O plugin do Vite grava isto em
 * catalogo/<sistema>/<facção>/bases.json a partir de catalog/<sistema>/<facção>/armybook/; os
 * testes chamam a mesma função. Port de montar.py base_de().
 */
import type { BaseManifesto } from './tipos'

/** O que é lido do snapshot do army book do Army Forge (armybook/*-gs<N>-v<versão>.json). */
export interface LivroArmyForge {
  name?: string
  versionString?: string
  gameSystemId?: number
  units?: { id: string; name: string; bases?: { round?: string | null } | null }[]
}

export interface BasesFaccao {
  livros: { nome: string | null; versao: string | null; sistema: number | null }[]
  /** uma entrada por unidade (id do Army Forge), com os nomes dela em todos os sistemas */
  unidades: { armyForgeUnitId: string; nomes: string[]; base: BaseManifesto }[]
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
    for (const u of l.units ?? []) {
      const e = porId.get(u.id)
      if (e) {
        if (!e.nomes.includes(u.name)) e.nomes.push(u.name)
      } else {
        porId.set(u.id, { armyForgeUnitId: u.id, nomes: [u.name], base: baseDoBruto(u.bases?.round) })
      }
    }
  }
  return {
    livros: livros.map((l) => ({ nome: l.name ?? null, versao: l.versionString ?? null, sistema: l.gameSystemId ?? null })),
    unidades: [...porId.values()],
  }
}
