/**
 * Cobertura do catálogo: para cada facção com manifesto e cada army book baixado (os dois sistemas),
 * monta uma lista com todas as unidades no equipamento padrão e vê quantas o site resolve sozinho
 * (unidade achada, base do army book e arte). Relatório no console e, com COBERTURA=1, em
 * saidas/cobertura.json. Não falha por cobertura baixa: o PDF não tem arte de toda unidade.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { NormalizedArmyList, UnitGroup } from '../src/armyforge/types'
import { resolvida, sugerir } from '../src/catalogo/associar'
import type { ManifestoFaccao } from '../src/catalogo/tipos'

const RAIZ = join(__dirname, '..')
const CATALOGO = join(RAIZ, 'catalog')

interface UnidadeLivro {
  id: string
  name: string
  size: number
  weapons?: { name: string }[]
  items?: { name: string }[]
  rules?: { name: string }[]
}

function listaPadrao(livro: { name: string; units: UnidadeLivro[] }): NormalizedArmyList {
  const units = livro.units.map((u, i) => ({
    line: i + 1, copies: 1, name: u.name, modelsPerUnit: u.size, quality: 0, defense: 0, pointsPerUnit: 0,
    rules: [...(u.rules ?? []), ...(u.items ?? [])].map((r) => ({ count: null, name: r.name, raw: r.name })),
    equipment: [], variants: [{ equipment: (u.weapons ?? []).map((w) => w.name), modelsPerUnit: u.size }],
    distribution: 'uniform', needsReview: false,
  })) as unknown as UnitGroup[]
  return { units, header: { armyName: livro.name, armyVersion: null, systemCode: null, points: null, declaredUnits: null } } as NormalizedArmyList
}

describe('cobertura do catálogo com listas do army book', () => {
  it('relata quantas unidades saem prontas em cada sistema', () => {
    const linhas: Record<string, unknown>[] = []
    for (const sistema of readdirSync(CATALOGO)) {
      for (const slug of readdirSync(join(CATALOGO, sistema))) {
        const pasta = join(CATALOGO, sistema, slug)
        if (!existsSync(join(pasta, 'manifest.json'))) continue
        const m = JSON.parse(readFileSync(join(pasta, 'manifest.json'), 'utf8')) as ManifestoFaccao & {
          armyBooks?: { id: string; version: string; gameSystemId: number }[]
        }
        for (const ab of m.armyBooks ?? []) {
          const arq = join(pasta, 'armybook', `${ab.id}-gs${ab.gameSystemId}-v${ab.version}.json`)
          if (!existsSync(arq)) continue
          const livro = JSON.parse(readFileSync(arq, 'utf8'))
          const plano = sugerir(listaPadrao(livro), m)
          const prontas = plano.filter(resolvida)
          linhas.push({
            faccao: `${sistema}/${slug}`, sistema: `gs${ab.gameSystemId}`, unidades: plano.length,
            noCatalogo: plano.filter((p) => p.unitKey).length, prontas: prontas.length,
            semArte: plano.filter((p) => p.unitKey && !resolvida(p)).map((p) => p.unidade.name),
            foraDoCatalogo: plano.filter((p) => !p.unitKey).map((p) => p.unidade.name),
          })
        }
      }
    }
    console.table(linhas.map(({ semArte, foraDoCatalogo, ...r }) => r))
    if (process.env.COBERTURA) {
      mkdirSync(join(RAIZ, 'saidas'), { recursive: true })
      writeFileSync(join(RAIZ, 'saidas', 'cobertura.json'), JSON.stringify(linhas, null, 1))
    }
    expect(linhas.length).toBeGreaterThan(0)
  })
})
