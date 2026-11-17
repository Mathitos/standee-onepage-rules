import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { distribuir, dividirNivelSuperior, lerEquipamento, parseShareText } from '../src/armyforge/parseShareText'

const piloto = readFileSync(new URL('./fixtures/armyforge/piloto-share-as-text.txt', import.meta.url), 'utf8')
const agora = new Date('2026-11-17T20:00:00Z')

describe('lista piloto (captura real de 17/11/2026)', () => {
  const lista = parseShareText(piloto, { agora })

  it('lê o cabeçalho', () => {
    expect(lista.header).toEqual({
      armyName: 'Human Defense Force',
      armyVersion: '3.6.0',
      systemCode: 'GFF',
      points: 780,
      declaredUnits: 6,
    })
  })

  it('expande cópias: 6 unidades, 14 modelos, 780 pts, sem alertas', () => {
    expect(lista.totals).toEqual({ units: 6, models: 14, points: 780 })
    expect(lista.issues).toEqual([])
    expect(lista.unrecognized).toEqual([])
  })

  it('separa grupos, cópias e modelos', () => {
    expect(lista.units.map((u) => [u.name, u.copies, u.modelsPerUnit, u.pointsPerUnit])).toEqual([
      ['Infantry Squad', 1, 3, 85],
      ['Combat Bikers', 1, 3, 115],
      ['Veterans', 2, 3, 140],
      ['OGRE Robot', 2, 1, 150],
    ])
  })

  it('resolve o equipamento de cada modelo', () => {
    const variantes = Object.fromEntries(lista.units.map((u) => [u.name, u.variants]))
    expect(variantes['Infantry Squad']).toEqual([{ equipment: ['Battle Rifle', 'Strike'], modelsPerUnit: 3 }])
    expect(variantes['Combat Bikers']).toEqual([{ equipment: ['Pistol', 'Hunting Lance'], modelsPerUnit: 3 }])
    expect(variantes['Veterans']).toEqual([{ equipment: ['Strike', 'Shotgun'], modelsPerUnit: 3 }])
    expect(variantes['OGRE Robot']).toEqual([{ equipment: ['Gatling Gun', 'Strike'], modelsPerUnit: 1 }])
    expect(lista.units.every((u) => u.distribution === 'uniform' && !u.needsReview)).toBe(true)
  })

  it('mantém vírgulas dentro do perfil da arma', () => {
    const veterans = lista.units.find((u) => u.name === 'Veterans')!
    expect(veterans.equipment[1]).toMatchObject({ count: 3, name: 'Shotgun', profile: '12", A4, AP(1)' })
  })

  it('lê regras com e sem contagem', () => {
    const bikers = lista.units.find((u) => u.name === 'Combat Bikers')!
    expect(bikers.rules.map((r) => [r.count, r.name])).toEqual([
      [3, 'Fast'],
      [3, 'Hold the Line'],
      [null, 'Tough(3)'],
    ])
  })

  it('preserva o texto original e a data da importação', () => {
    expect(lista.source.rawText).toBe(piloto)
    expect(lista.source.importedAt).toBe('2026-11-17T20:00:00.000Z')
  })
})

describe('tolerância a clipboard', () => {
  it('aceita CRLF, aspas tipográficas e espaços extras', () => {
    const sujo = piloto.replace(/\n/g, '\r\n').replace(/"/g, '”').replace(/\| 85pts/, '|   85pts')
    const lista = parseShareText(sujo, { agora })
    expect(lista.totals).toEqual({ units: 6, models: 14, points: 780 })
    expect(lista.issues).toEqual([])
    expect(lista.units[0].equipment[0].profile).toBe('24", A2')
  })
})

describe('distribuição de armas', () => {
  it('upgrade parcial vira partição proposta (2 rifle + 1 flamer), revisão obrigatória', () => {
    const r = distribuir(3, lerEquipamento('2x Battle Rifle (24", A2), 1x Flamer (12", A1, Blast(3)), 3x Strike (A2)'))
    expect(r.distribution).toBe('partition')
    expect(r.variants).toEqual([
      { equipment: ['Battle Rifle', 'Strike'], modelsPerUnit: 2 },
      { equipment: ['Flamer', 'Strike'], modelsPerUnit: 1 },
    ])
  })

  it('arma sem prefixo conta 1 e, se sobra modelo, a distribuição é ambígua', () => {
    const r = distribuir(3, lerEquipamento('Pistol (12", A2), 3x Strike (A2)'))
    expect(r.distribution).toBe('ambiguous')
    expect(r.variants).toEqual([
      { equipment: ['Pistol', 'Strike'], modelsPerUnit: 1 },
      { equipment: ['Strike'], modelsPerUnit: 2 },
    ])
  })

  it('mais armas especiais que modelos é ambíguo', () => {
    const r = distribuir(2, lerEquipamento('2x Pistol, 1x Flamer, 2x Strike'))
    expect(r.distribution).toBe('ambiguous')
  })

  it('múltiplos por modelo continuam uniformes', () => {
    const r = distribuir(3, lerEquipamento('6x Pistol (12", A2), 3x Strike (A2)'))
    expect(r).toEqual({ distribution: 'uniform', variants: [{ equipment: ['2x Pistol', 'Strike'], modelsPerUnit: 3 }] })
  })
})

describe('falhas exigem revisão, sem valores fictícios', () => {
  it('texto vazio', () => {
    const lista = parseShareText('   \n  ', { agora })
    expect(lista.issues.map((i) => i.kind)).toEqual(['empty'])
    expect(lista.units).toEqual([])
  })

  it('sem cabeçalho', () => {
    const lista = parseShareText('Infantry Squad [3] Q5+ D5+ | 85pts | Tough(3)\n3x Battle Rifle (24", A2)', { agora })
    expect(lista.issues.map((i) => i.kind)).toContain('missing-header')
    expect(lista.totals.models).toBe(3)
  })

  it('soma de pontos e de unidades divergentes do cabeçalho', () => {
    const texto = piloto.replace('[GFF 780pts] [6 Units]', '[GFF 800pts] [7 Units]')
    const kinds = parseShareText(texto, { agora }).issues.map((i) => i.kind)
    expect(kinds).toEqual(['points-mismatch', 'units-mismatch'])
  })

  it('linha estranha aparece como não reconhecida, com número da linha', () => {
    const texto = piloto.replace('3x Strike (A2), 3x Shotgun (12", A4, AP(1))', '3x Strike (A2), 3x Shotgun (12", A4, AP(1))\nJoined to: Veterans')
    const lista = parseShareText(texto, { agora })
    expect(lista.unrecognized).toEqual([{ line: 11, text: 'Joined to: Veterans' }])
    expect(lista.totals.models).toBe(14)
  })

  it('unidade sem linha de equipamento', () => {
    const lista = parseShareText('++ X (v1.0) [GF 100pts] [1 Units] ++\n\nGrunt [1] Q5+ D5+ | 100pts | Tough(3)', { agora })
    expect(lista.issues.map((i) => i.kind)).toEqual(['missing-equipment'])
    expect(lista.units[0].needsReview).toBe(true)
  })

  it('segundo exército é sinalizado', () => {
    const lista = parseShareText(`${piloto}\n++ Outro (v1.0) [GFF 100pts] [1 Units] ++\n`, { agora })
    expect(lista.issues.some((i) => i.kind === 'unrecognized-line' && i.message.includes('mais de um exército'))).toBe(true)
  })
})

describe('utilitários', () => {
  it('divide só vírgulas de nível superior', () => {
    expect(dividirNivelSuperior('A (1, 2), B (x(3), y), C')).toEqual(['A (1, 2)', 'B (x(3), y)', 'C'])
  })
})
