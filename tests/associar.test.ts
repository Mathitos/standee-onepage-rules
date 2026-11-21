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

describe('facção pelo sistema da lista', () => {
  const f = (sistema: string, slug: string, faccao: string, exercitos?: string[]) =>
    ({ sistema, slug, caminho: `${sistema}/${slug}`, faccao, artes: 1, manifesto: true, exercitos })
  const indice = {
    faccoes: [
      f('aof', 'daemons-of-change', 'Daemons of Change'),
      f('gff', 'daemons-of-change', 'Daemons of Change'),
      f('gff', 'saurian-starhost', 'Saurian Starhost', ['Saurian Starhosts']),
    ],
  }
  it('GF/GFF usam as artes de ficção científica; AOF/AOFS/AOFR, as de fantasia', () => {
    expect(faccaoDaLista(indice, 'Daemons of Change', 'GFF')?.caminho).toBe('gff/daemons-of-change')
    expect(faccaoDaLista(indice, 'Daemons of Change', 'GF')?.caminho).toBe('gff/daemons-of-change')
    expect(faccaoDaLista(indice, 'Daemons of Change', 'AOF')?.caminho).toBe('aof/daemons-of-change')
    expect(faccaoDaLista(indice, 'Daemons of Change', 'AOFS')?.caminho).toBe('aof/daemons-of-change')
  })
  it('lista com nome próprio ("Nome - Army book")', () => {
    expect(faccaoDaLista(indice, 'Torneio de sábado - Saurian Starhosts', 'GFF')?.slug).toBe('saurian-starhost')
  })
  it('acha pelo nome do army book e não troca de sistema', () => {
    expect(faccaoDaLista(indice, 'Saurian Starhosts', 'GFF')?.slug).toBe('saurian-starhost')
    expect(faccaoDaLista(indice, 'Saurian Starhosts', 'AOF')).toBeNull()
  })
})

describe('arte genérica da unidade e itens nas regras', () => {
  const m = {
    units: [
      { unitKey: 'warriors', names: ['Warriors', 'Warrior'], base: { shape: 'round' as const, dimensionsMm: [32], raw: '32' } },
      { unitKey: 'lord', names: ['Lord'], base: { shape: 'round' as const, dimensionsMm: [32], raw: '32' } },
      { unitKey: 'brutes', names: ['Brutes'], base: { shape: 'round' as const, dimensionsMm: [40], raw: '40' } },
    ],
    arts: [
      { artId: 'warrior-banner', pdfLabel: 'Warrior Banner', unitKey: 'warriors', equipmentTags: [], cosmetic: 'banner', mappingStatus: 'mapped' },
      { artId: 'warrior-spear', pdfLabel: 'Warrior Spear', unitKey: 'warriors', equipmentTags: ['Spear'], cosmetic: null, mappingStatus: 'mapped' },
      { artId: 'warrior', pdfLabel: 'Warrior', unitKey: 'warriors', equipmentTags: [], cosmetic: null, mappingStatus: 'alias-proposed' },
      { artId: 'lord', pdfLabel: 'Lord', unitKey: 'lord', equipmentTags: [], cosmetic: null, mappingStatus: 'mapped' },
      { artId: 'lord-boar', pdfLabel: 'Lord on Boar', unitKey: 'lord', equipmentTags: ['Great Boar'], cosmetic: null, mappingStatus: 'mapped' },
      { artId: 'brute-axe', pdfLabel: 'Brute Axe', unitKey: 'brutes', equipmentTags: ['Great Axe'], cosmetic: null, mappingStatus: 'mapped' },
    ],
  }
  const texto = [
    '++ Beastmen (v3.6.0) [AOFS 300pts] [5 Units] ++', '',
    'Warrior [3] Q5+ D5+ | 60pts | Furious', '3x Spear (A1, Counter)', '',
    'Warrior [3] Q5+ D5+ | 60pts | Furious', '3x Hand Weapon (A1)', '',
    'Lord [1] Q4+ D4+ | 60pts | Hero, Great Boar', 'Hand Weapon (A3)', '',
    'Lord [1] Q4+ D4+ | 60pts | Hero', 'Hand Weapon (A3)', '',
    'Brutes [3] Q4+ D4+ | 60pts | Tough(3)', '3x Hand Weapon (A2)',
  ].join('\n')
  const plano = sugerir(parseShareText(texto), m)
  const arte = (i: number) => plano[i].variantes[0].arte
  it('arma com arte própria vence; sem arte da arma, vale a genérica (nunca a de comando)', () => {
    expect(arte(0)).toBe('warrior-spear')
    expect(arte(1)).toBe('warrior')
  })
  it('montaria nas regras escolhe a arte montada', () => {
    expect(arte(2)).toBe('lord-boar')
    expect(arte(3)).toBe('lord')
  })
  it('só há arte de outra arma: fica para o usuário (D013)', () => {
    expect(arte(4)).toBeNull()
  })
})
