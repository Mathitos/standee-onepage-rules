import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseShareText } from '../src/armyforge/parseShareText'
import { manterEscolhas, modelosDoPlano, modelosParaPapel, posesDa, resolvida, sugerir } from '../src/catalogo/associar'
import { basesDosArmyBooks, itemComBaseDaLista, type LivroArmyForge } from '../src/catalogo/basesArmyBook'
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

/** Os snapshots dos army books de uma facção, como o plugin do Vite lê para gravar bases.json. */
function livros(caminho: string): LivroArmyForge[] {
  const pasta = join(RAIZ, 'catalog', caminho, 'armybook')
  return readdirSync(pasta)
    .filter((f) => /-gs\d+-v[^/]*\.json$/.test(f) && !f.endsWith('.resumo.json'))
    .map((f) => JSON.parse(readFileSync(join(pasta, f), 'utf8')) as LivroArmyForge)
}

describe('base do army book para unidade sem arte no manifesto (Alien Hives)', () => {
  const manifestoAH = JSON.parse(readFileSync(join(RAIZ, 'catalog/gff/alien-hives/manifest.json'), 'utf8')) as ManifestoFaccao
  const basesAH = basesDosArmyBooks(livros('gff/alien-hives'))
  // a lista do usuário de 23/11 (captura de tela): Grunt Veteran não tem arte no PDF
  const lista = parseShareText([
    '++ Alien Hives (v3.6.0) [GFF 300pts] [5 Units] ++', '',
    'Grunt Veteran [1] Q4+ D5+ | 45pts | Hero, Tough(3)', 'Spike-Shooter (18", A3), Claws (A3)', '',
    'Spores [3] Q6+ D6+ | 30pts | 3x Fearless', '3x Strike (A1)', '',
    '2x Assault Grunts [3] Q5+ D5+ | 60pts | 3x Furious', '3x Razor Claws (A3)', '',
    'Hive Swarm [1] Q6+ D6+ | 45pts | Tough(6)', 'Toxin Claws (A6)',
  ].join('\n'))

  it('Grunt Veteran não está no manifesto, mas está no army book com base de 25 mm', () => {
    expect(manifestoAH.units.some((u) => u.names.includes('Grunt Veteran'))).toBe(false)
    expect(basesAH.unidades.find((u) => u.nomes.includes('Grunt Veteran'))?.base).toMatchObject({ shape: 'round', dimensionsMm: [25] })
  })

  it('sem bases.json a base fica vazia; com ele, vem do army book (mesmo com a arte escolhida à mão)', () => {
    const sem = Object.fromEntries(sugerir(lista, manifestoAH).map((p) => [p.unidade.name, p]))
    expect(sem['Grunt Veteran'].base).toBeNull()
    const plano = sugerir(lista, manifestoAH, basesAH)
    const por = Object.fromEntries(plano.map((p) => [p.unidade.name, p]))
    expect(por['Grunt Veteran']).toMatchObject({ base: { forma: 'redonda', mm: [25] }, baseOrigem: 'armybook' })
    expect(por['Assault Grunts']).toMatchObject({ base: { forma: 'redonda', mm: [25] }, baseOrigem: 'manifesto' })
    expect(por['Hive Swarm'].base).toEqual({ forma: 'redonda', mm: [40] })
    // o usuário escolhe a arte que faltava: a unidade fica pronta para o 3MF e para o papel
    const escolhido = plano.map((p) =>
      p.unidade.name === 'Grunt Veteran' ? { ...p, variantes: p.variantes.map(() => ({ arte: 'warrior-ravager-gun', origem: 'usuario' as const })) } : p)
    expect(resolvida(escolhido.find((p) => p.unidade.name === 'Grunt Veteran')!)).toBe(true)
    expect(modelosDoPlano(escolhido).modelos[0]).toMatchObject({ unidade: 'Grunt Veteran', base: { forma: 'redonda', mm: [25] } })
    expect(modelosParaPapel(escolhido).modelos[0].base).toEqual({ forma: 'redonda', mm: [25] })
  })

  it('todas as unidades de todos os army books têm base, menos as sem base redonda no Army Forge ("none" ou em branco)', () => {
    const pastas = readdirSync(join(RAIZ, 'catalog')).flatMap((s) => readdirSync(join(RAIZ, 'catalog', s)).map((f) => `${s}/${f}`))
    let total = 0
    for (const c of pastas) {
      let ls: LivroArmyForge[]
      try {
        ls = livros(c)
      } catch {
        continue
      }
      for (const u of basesDosArmyBooks(ls).unidades) {
        total++
        if (u.base.shape === 'unknown') expect(['none', ''], `${c} ${u.nomes[0]}`).toContain(u.base.raw)
      }
    }
    expect(total).toBeGreaterThan(500)
  })
})

describe('Atualizar a lista mantém as escolhas feitas à mão', () => {
  const manifestoAH = JSON.parse(readFileSync(join(RAIZ, 'catalog/gff/alien-hives/manifest.json'), 'utf8')) as ManifestoFaccao
  const basesAH = basesDosArmyBooks(livros('gff/alien-hives'))
  const texto = (linhas: string[]) => parseShareText(['++ Alien Hives (v3.6.0) [GFF 300pts] [3 Units] ++', '', ...linhas].join('\n'))
  const grunt = ['Grunt Veteran [1] Q4+ D5+ | 45pts | Hero, Tough(3)', 'Spike-Shooter (18", A3), Claws (A3)', '']
  const spores = ['Spores [3] Q6+ D6+ | 30pts | 3x Fearless', '3x Strike (A1)', '']

  it('com unidade nova antes (as linhas mudam), a arte e a base escolhidas continuam', () => {
    const antes = sugerir(texto([...grunt, ...spores]), manifestoAH, basesAH).map((p) =>
      p.unidade.name === 'Grunt Veteran'
        ? { ...p, variantes: p.variantes.map(() => ({ arte: 'warrior-ravager-gun', origem: 'usuario' as const })) }
        : { ...p, base: { forma: 'redonda' as const, mm: [32] }, baseOrigem: 'usuario' as const })
    const hive = ['Hive Swarm [1] Q6+ D6+ | 45pts | Tough(6)', 'Toxin Claws (A6)', '']
    const depois = manterEscolhas(sugerir(texto([...hive, ...grunt, ...spores]), manifestoAH, basesAH), antes)
    const por = Object.fromEntries(depois.map((p) => [p.unidade.name, p]))
    expect(por['Grunt Veteran'].variantes[0]).toEqual({ arte: 'warrior-ravager-gun', origem: 'usuario' })
    expect(por['Spores']).toMatchObject({ base: { forma: 'redonda', mm: [32] }, baseOrigem: 'usuario' })
    expect(por['Hive Swarm'].baseOrigem).toBe('manifesto')
  })

  it('se a arma da variante mudou, a arte volta à sugestão', () => {
    const antes = sugerir(texto(grunt), manifestoAH, basesAH).map((p) => ({
      ...p, variantes: p.variantes.map(() => ({ arte: 'warrior-ravager-gun', origem: 'usuario' as const })),
    }))
    const outra = ['Grunt Veteran [1] Q4+ D5+ | 45pts | Hero, Tough(3)', 'Heavy Razor Claws (A4)', '']
    const depois = manterEscolhas(sugerir(texto(outra), manifestoAH, basesAH), antes)
    expect(depois[0].variantes[0].origem).not.toBe('usuario')
  })
})

describe('poses alternadas (pedido de 23/11)', () => {
  const man = (pasta: string) => JSON.parse(readFileSync(join(RAIZ, 'catalog', pasta, 'manifest.json'), 'utf8')) as ManifestoFaccao
  const manifestoAH = man('gff/alien-hives')
  const ids = (arte: string, m: ManifestoFaccao) => posesDa(arte, m).map((p) => [p.arte, p.numero])

  it('acha as poses do catálogo, começando pela escolhida e com o número fixo de cada uma', () => {
    expect(ids('assault-grunt-v1', manifestoAH)).toEqual([['assault-grunt-v1', 1], ['assault-grunt-v2', 2]])
    expect(ids('assault-grunt-v2', manifestoAH)).toEqual([['assault-grunt-v2', 2], ['assault-grunt-v1', 1]])
    expect(ids('snatcher-v1', manifestoAH)).toEqual([['snatcher-v1', 1], ['snatcher-v2', 2]])
    // variantes de cabeça com o mesmo rótulo são poses; os drones A, B e C vêm em artes de um estilo só
    expect(ids('ninja-sword-a', man('gff/eternal-dynasty')).map(([a]) => a)).toEqual(['ninja-sword-a', 'ninja-sword-b', 'ninja-sword-c'])
    expect(ids('drone-a', man('gff/eternal-dynasty')).map(([a]) => a)).toEqual(['drone-a', 'drone-b', 'drone-c'])
  })

  it('cópia da mesma figura não é pose: marcada (copiaDe) ou de um estilo só com o rótulo de outra', () => {
    expect(ids('warrior-spine-gun-1', manifestoAH)).toEqual([['warrior-spine-gun-1', 1]])
    expect(ids('spores', manifestoAH)).toEqual([['spores', 1]])
    expect(ids('hunter-sword-a043', man('aof/beastmen'))).toEqual([['hunter-sword-a043', 1]])
    // escolhida a cópia de borda grossa da Ver. 1, ela fica no lugar da Ver. 1
    expect(ids('hound-ver-1-borda', man('aof/daemons-of-war'))).toEqual([['hound-ver-1-borda', 1], ['hound-ver-2', 2]])
  })

  it('arte sem correspondência, enviada ou sem manifesto tem uma pose só', () => {
    expect(ids('warrior-barb-gun', manifestoAH)).toEqual([['warrior-barb-gun', 1]])
    expect(ids('enviada-1', manifestoAH)).toEqual([['enviada-1', 1]])
    expect(posesDa('assault-grunt-v1', null)).toEqual([{ arte: 'assault-grunt-v1', numero: 1 }])
  })

  it('alterna as poses entre os modelos, contando pelas cópias ("2x"), no 3MF e no papel', () => {
    const lista = parseShareText([
      '++ Alien Hives (v3.6.0) [GFF 300pts] [3 Units] ++', '',
      'Spores [3] Q6+ D6+ | 30pts | 3x Fearless', '3x Strike (A1)', '',
      '2x Assault Grunts [3] Q5+ D5+ | 60pts | 3x Furious', '3x Razor Claws (A3)', '',
      'Shooter Grunts [5] Q5+ D5+ | 60pts | 5x Fearless', '5x Spike-Shooter (18", A3), 5x Claws (A1)',
    ].join('\n'))
    const plano = sugerir(lista, manifestoAH)
    expect(plano.map((p) => p.variantes[0].arte)).toEqual(['spores', 'assault-grunt-v1', 'shooter-grunt-v1'])
    const { modelos } = modelosDoPlano(plano, manifestoAH)
    expect(modelos.map((m) => [m.numero, m.arte, m.qtd, m.pose ?? null])).toEqual([
      [1, 'spores', 3, null],
      [2, 'assault-grunt-v1', 2, 1], [2, 'assault-grunt-v2', 1, 2],
      [3, 'assault-grunt-v1', 1, 1], [3, 'assault-grunt-v2', 2, 2],
      [4, 'shooter-grunt-v1', 3, 1], [4, 'shooter-grunt-v2', 2, 2],
    ])
    expect(modelosParaPapel(plano, manifestoAH).modelos.map((m) => [m.arte, m.qtd])).toEqual(modelos.map((m) => [m.arte, m.qtd]))
    // sem o manifesto, como antes: uma arte por variante
    expect(modelosDoPlano(plano).modelos.map((m) => [m.numero, m.arte, m.qtd])).toEqual([
      [1, 'spores', 3], [2, 'assault-grunt-v1', 3], [3, 'assault-grunt-v1', 3], [4, 'shooter-grunt-v1', 5]])
  })
})

describe('base da montaria ou carruagem da lista (revisão de 25/11)', () => {
  // O texto da lista do Army Forge não traz o nome do item, só as regras que ele dá (Tough soma,
  // as outras com nota ficam com a maior) e as armas: getListAsText e getAllUpgradedRules, no
  // código público do site, lido em 25/11. As listas abaixo seguem essa regra.
  const manifestoMU = JSON.parse(readFileSync(join(RAIZ, 'catalog/aof/mummified-undead/manifest.json'), 'utf8')) as ManifestoFaccao
  const basesMU = basesDosArmyBooks(livros('aof/mummified-undead'))
  const manifestoDC = JSON.parse(readFileSync(join(RAIZ, 'catalog/aof/daemons-of-change/manifest.json'), 'utf8')) as ManifestoFaccao
  const basesDC = basesDosArmyBooks(livros('aof/daemons-of-change'))
  const campeao = (cabecalho: string, regras: string, armas: string, m: ManifestoFaccao, b: typeof basesMU, nome = 'Royal Champion') =>
    sugerir(parseShareText([cabecalho, '', `${nome} [1] Q3+ D4+ | 150pts | ${regras}`, armas].join('\n')), m, b)[0]
  const MU = '++ Mummified Undead (v3.6.0) [AOFS 150pts] [1 Units] ++'

  it('o army book traz as montarias do Royal Champion com a base e o que elas dão', () => {
    const rc = basesMU.unidades.find((u) => u.nomes.includes('Royal Champion'))!
    const skirmish = rc.sistemas!.find((s) => s.sistema === 5)!
    expect(skirmish.itensComBase.find((i) => i.nome === 'Royal Snake')).toEqual({
      nome: 'Royal Snake', base: { shape: 'oval', dimensionsMm: [75, 46], raw: '75x46' },
      regras: [{ nome: 'Impact', nota: 6 }, { nome: 'Tough', nota: 9 }], armas: [],
    })
    expect(skirmish.itensComBase.find((i) => i.nome === 'Royal Beast')).toMatchObject({ regras: [{ nome: 'Fast', nota: null }], armas: ['Heavy Claws'] })
  })

  it('Royal Snake (Impact(6), Tough(9) a mais) põe o Royal Champion na oval de 75 x 46 mm', () => {
    const p = campeao(MU, 'Hero, Tough(18), Royal Legion, Impact(6)', 'Dual Hand Weapons (A8)', manifestoMU, basesMU)
    expect(p).toMatchObject({ base: { forma: 'oval', mm: [75, 46] }, baseOrigem: 'armybook', baseUpgrade: 'Royal Snake', baseAmbigua: false })
  })

  it('Royal Beast (Fast e Heavy Claws) dá a oval de 60 x 35 mm', () => {
    const p = campeao(MU, 'Hero, Tough(9), Royal Legion, Fast', 'Dual Hand Weapons (A8), Heavy Claws (A2, AP(1))', manifestoMU, basesMU)
    expect(p).toMatchObject({ base: { forma: 'oval', mm: [60, 35] }, baseUpgrade: 'Royal Beast' })
  })

  it('sem montaria, a base é a da unidade: a lista do usuário de 24/11 (Venom Expert dá só uma regra)', () => {
    const p = campeao(MU, 'Hero, Tough(9), Royal Legion, Bane in Melee Aura', 'Dual Hand Weapons (A8)', manifestoMU, basesMU)
    expect(p).toMatchObject({ base: { forma: 'redonda', mm: [25] }, baseUpgrade: null, baseAmbigua: false })
  })

  it('Champion of Change no Disc of Change (AoF): 40 mm em vez de 25; a carruagem não se confunde', () => {
    const AOF = '++ Daemons of Change (v3.6.0) [AOF 150pts] [1 Units] ++'
    const disco = campeao(AOF, 'Hero, Tough(6), Changebound, Fast, Strider', 'Dual Hand Weapons (A4), Strike (A3)', manifestoDC, basesDC, 'Champion of Change')
    expect(disco).toMatchObject({ base: { forma: 'redonda', mm: [40] }, baseUpgrade: 'Disc of Change' })
    const carro = campeao(AOF, 'Hero, Tough(9), Changebound, Armor(3), Fast, Impact(4), Strider', 'Dual Hand Weapons (A4), Screechers (A2, AP(1))', manifestoDC, basesDC, 'Champion of Change')
    expect(carro).toMatchObject({ base: { forma: 'oval', mm: [120, 92] }, baseUpgrade: 'Screecher Chariot' })
    const sem = campeao(AOF, 'Hero, Tough(3), Changebound', 'Dual Hand Weapons (A4)', manifestoDC, basesDC, 'Champion of Change')
    expect(sem).toMatchObject({ base: { forma: 'redonda', mm: [25] }, baseUpgrade: null })
  })

  it('em todos os army books, unidade sem upgrade nenhum não é tomada por montada', () => {
    const pastas = readdirSync(join(RAIZ, 'catalog')).flatMap((s) => readdirSync(join(RAIZ, 'catalog', s)).map((f) => `${s}/${f}`))
    const codigo: Record<number, string> = { 2: 'GF', 3: 'GFF', 4: 'AOF', 5: 'AOFS' }
    let comMontaria = 0
    for (const c of pastas) {
      let ls: LivroArmyForge[]
      try {
        ls = livros(c)
      } catch {
        continue
      }
      const bases = basesDosArmyBooks(ls)
      for (const l of ls) {
        for (const u of l.units ?? []) {
          const entrada = bases.unidades.find((x) => x.armyForgeUnitId === u.id)
          if (!entrada?.sistemas?.length) continue
          comMontaria++
          // a unidade como o Army Forge a escreve sem upgrade: regras e armas do próprio livro
          const grupo = {
            line: 1, copies: 1, name: u.name, modelsPerUnit: 1, quality: 4, defense: 4, pointsPerUnit: 0,
            rules: (u.rules ?? []).map((r) => ({ count: null, name: r.rating != null ? `${r.name}(${r.rating})` : r.name, raw: r.name })),
            equipment: (u.weapons ?? []).map((w) => ({ count: 1, name: w.name, profile: null, raw: w.name })),
            variants: [], distribution: 'uniform' as const, needsReview: false,
          }
          expect(itemComBaseDaLista(grupo, entrada, codigo[l.gameSystemId ?? 0]).item, `${c} ${u.name}`).toBeNull()
        }
      }
    }
    expect(comMontaria).toBeGreaterThan(50)
  })
})
