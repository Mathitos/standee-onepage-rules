import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseShareText } from '../src/armyforge/parseShareText'
import { modelosDoPlano, resolvida, sugerir } from '../src/catalogo/associar'
import { faccaoDaLista } from '../src/catalogo/carregar'
import type { ManifestoFaccao } from '../src/catalogo/tipos'

const RAIZ = join(__dirname, '..')
const texto = readFileSync(join(RAIZ, 'tests/fixtures/armyforge/piloto-share-as-text.txt'), 'utf8')
const manifesto = JSON.parse(readFileSync(join(RAIZ, 'catalog/gff/human-defense-force/manifest.json'), 'utf8')) as ManifestoFaccao

describe('associação com o catálogo', () => {
  const lista = parseShareText(texto)

  it('acha a facção pelo nome do exército', () => {
    const indice = { faccoes: [{ sistema: 'gff', slug: 'human-defense-force', caminho: 'gff/human-defense-force', faccao: 'Human Defense Force', artes: 69, manifesto: true }] }
    expect(faccaoDaLista(indice, lista.header?.armyName)?.slug).toBe('human-defense-force')
    expect(faccaoDaLista(indice, 'Robot Legions')).toBeNull()
  })

  it('sugere arte pela arma e base pelo army book; sem arte correspondente, fica pendente (D013)', () => {
    const plano = sugerir(lista, manifesto)
    const por = Object.fromEntries(plano.map((p) => [p.unidade.name, p]))
    expect(por['Infantry Squad'].variantes[0]).toMatchObject({ arte: 'infantry-rifle', origem: 'manifesto', aliasProposto: true })
    expect(por['Veterans'].variantes[0]).toMatchObject({ arte: 'veteran-shotgun', aliasProposto: false })
    expect(por['Combat Bikers'].base).toEqual({ forma: 'oval', mm: [60, 35] })
    expect(por['OGRE Robot'].variantes[0].arte).toBeNull()      // Gatling Gun: não há arte
    expect(resolvida(por['OGRE Robot'])).toBe(false)
  })

  it('numera na ordem da lista com "2x" como duas unidades (D035) e omite as pendentes', () => {
    const { modelos, omitidas } = modelosDoPlano(sugerir(lista, manifesto))
    expect(omitidas).toEqual(['OGRE Robot'])
    expect(modelos.map((m) => [m.unidade, m.numero, m.qtd])).toEqual([
      ['Infantry Squad', 1, 3], ['Combat Bikers', 2, 3], ['Veterans', 3, 3], ['Veterans', 4, 3],
    ])
  })

  it('sem manifesto, nada é sugerido', () => {
    const plano = sugerir(lista, null)
    expect(plano.every((p) => p.base === null && p.variantes.every((v) => v.arte === null))).toBe(true)
    expect(modelosDoPlano(plano).modelos).toEqual([])
  })
})
