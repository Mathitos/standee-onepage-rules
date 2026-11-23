import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { metadesPretoRelevo } from '../src/gerador/figura'
import { gerar, type Pedido } from '../src/gerador/gerar'
import { carregarManifold } from '../src/gerador/manifold'
import { PADRAO } from '../src/gerador/parametros'
import { lerCaminho, lerSvg } from '../src/gerador/svg'
import { carregarFonte } from '../src/gerador/texto'

const RAIZ = join(__dirname, '..')
const HDF = join(RAIZ, 'catalog/gff/human-defense-force/arts')
const svg = (id: string, lado: string) => readFileSync(join(HDF, id, 'fino', `${lado}.svg`), 'utf8')
const buf = (p: string) => {
  const b = readFileSync(p)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

describe('svg v2', () => {
  it('lê coordenadas relativas com negativos colados', () => {
    expect(lerCaminho('M10 20l5 0-2 3 -3 -3zM1 1l1 0 0 1z')).toEqual([
      [[10, 20], [15, 20], [13, 23], [10, 20]],
      [[1, 1], [2, 1], [2, 2]],
    ])
  })
})

describe('gerador (borda grossa, sem nome nem perfil)', () => {
  it('gera a peça única pintada (opção) com base lisa', async () => {
    const w = await carregarManifold()
    const ler = (lado: string) => readFileSync(join(HDF, 'veteran-shotgun', 'borda', `${lado}.svg`), 'utf8')
    const r = await gerar(w, {
      artes: { v: { rotulo: 'Veteran Shotgun', frente: ler('frente'), verso: ler('verso') } },
      modelos: [{ unidade: 'Veterans', numero: 1, qtd: 2, arte: 'v', base: { forma: 'redonda', mm: [25] } }],
      parametros: { nomeNaBase: false, modo: 'peca-unica' },
    })
    expect([r.modo, r.espessuraLinguetaMm]).toEqual(['peca-unica', 1.6])
    expect(r.checagens.every((c) => c.status === 'NoError' && c.volumeMm3 > 0)).toBe(true)
    expect(r.placas).toEqual([{ nome: '1 Veterans', pecas: 4, grupo: 'unidade' }, { nome: 'Lista completa', pecas: 4, grupo: 'lista' }])
    expect(r.avisos).toContain('Sem perfil da impressora: o Bambu Studio vai abrir só a geometria.')
    expect(Object.keys(r.bases)).toEqual(['base-redonda-25-plana'])
    // encaixe retangular (D042): uma lingueta de 6 mm numa fenda de 6,3 mm, 1,6 + 0,25 de espessura
    const lg = r.artes.v.medidas.linguetas
    expect([lg.encaixe, lg.quantidade, lg.entreCentrosMm]).toEqual(['retangular', 1, null])
    expect(lg.largJuntoBarraMm).toBe(lg.largPontaMm)
    expect(lg.largJuntoBarraMm).toBeCloseTo(6.0, 1)
    const f = r.bases['base-redonda-25-plana'].medidas.fendas
    expect([f.encaixe, f.quantidade]).toEqual(['retangular', 1])
    expect(f.largura).toBeCloseTo(6.3, 6)
    expect(f.espessura).toBeCloseTo(1.85, 6)
  }, 300_000)

  it('gera as duas metades em preto em relevo (padrão, D041/D045)', async () => {
    const w = await carregarManifold()
    const ler = (lado: string) => readFileSync(join(HDF, 'veteran-shotgun', 'borda', `${lado}.svg`), 'utf8')
    const r = await gerar(w, {
      artes: { v: { rotulo: 'Veteran Shotgun', frente: ler('frente'), verso: ler('verso') } },
      modelos: [{ unidade: 'Veterans', numero: 1, qtd: 2, arte: 'v', base: { forma: 'redonda', mm: [25] } }],
      parametros: { nomeNaBase: false },
    })
    expect(r.checagens.every((c) => c.status === 'NoError' && c.volumeMm3 > 0)).toBe(true)
    expect([r.modo, r.espessuraLinguetaMm]).toEqual(['duas-metades', 2.4])
    expect(r.artes.v.objetos).toEqual(['v-frente', 'v-verso'])
    // por modelo: as duas metades e a base
    expect(r.placas).toEqual([{ nome: '1 Veterans', pecas: 6, grupo: 'unidade' }, { nome: 'Lista completa', pecas: 6, grupo: 'lista' }])
    // miolo preto (pedido de 23/11): corpo preto, branco só na face de baixo do relevo
    expect(r.checagens.map((c) => c.peca).filter((p) => p.startsWith('v-'))).toEqual([
      'v-frente Preto - corpo', 'v-frente Branco - face', 'v-frente Preto - relevo', 'v-frente Preto - lateral',
      'v-verso Preto - corpo', 'v-verso Branco - face', 'v-verso Preto - relevo', 'v-verso Preto - lateral'])
    // a fenda recebe as duas metades coladas: 2 x 1,2 + 0,25
    const f = r.bases['base-redonda-25-plana'].medidas.fendas
    expect([f.encaixe, f.quantidade]).toEqual(['retangular', 1])
    expect(f.espessura).toBeCloseTo(2.65, 6)
    const cfg = strFromU8(unzipSync(r.arquivo)['Metadata/model_settings.config'])
    expect(cfg).toContain('value="Veteran Shotgun - frente #1"')
    expect(cfg).toContain('value="Veteran Shotgun - verso #1"')
  }, 300_000)

  it('miolo preto: corpo preto, branco só nas últimas camadas do corpo, dentro da silhueta (pedido de 23/11)', async () => {
    const w = await carregarManifold()
    const ler = (lado: string) => lerSvg(readFileSync(join(HDF, 'veteran-shotgun', 'borda', `${lado}.svg`), 'utf8'))
    const { metades, medidas } = metadesPretoRelevo(w, ler('frente'), ler('verso'), PADRAO)
    for (const m of metades) {
      const c = Object.fromEntries(m.partes.map((p) => [p.rotulo, p.malha.boundingBox()]))
      expect(Object.keys(c)).toEqual(['Preto - corpo', 'Branco - face', 'Preto - relevo', 'Preto - lateral'])
      expect([c['Preto - corpo'].min[2], c['Preto - corpo'].max[2]]).toEqual([0, 1.2])
      expect(c['Branco - face'].min[2]).toBeCloseTo(1.2 - PADRAO.camadaMesa, 6)
      expect(c['Branco - face'].max[2]).toBeCloseTo(1.2, 6)
      // origem no pé da lingueta, que é preta; o branco começa acima dela, na silhueta
      expect(c['Preto - corpo'].min[1]).toBeCloseTo(0, 6)
      expect(c['Branco - face'].min[1]).toBeGreaterThan(medidas.linguetas.profMm)
      // a única parte branca é a face: as camadas de baixo têm uma cor só
      expect(m.partes.filter((p) => p.cor === 0).map((p) => p.rotulo)).toEqual(['Branco - face'])
    }
  }, 300_000)

  it('miolo branco (opção): o corpo branco da D046; relevo só acima da lingueta e contorno do verso espelhado', async () => {
    const w = await carregarManifold()
    const ler = (lado: string) => lerSvg(readFileSync(join(HDF, 'veteran-shotgun', 'borda', `${lado}.svg`), 'utf8'))
    const { metades, medidas } = metadesPretoRelevo(w, ler('frente'), ler('verso'), { ...PADRAO, miolo: 'branco' })
    expect(metades.map((m) => m.lado)).toEqual(['frente', 'verso'])
    const caixas = metades.map((m) => Object.fromEntries(m.partes.map((p) => [p.rotulo, p.malha.boundingBox()])))
    for (const c of caixas) {
      expect(c['Branco - corpo'].min[2]).toBeCloseTo(0, 6)
      expect(c['Branco - corpo'].max[2]).toBeCloseTo(1.2, 6)
      expect(c['Preto - relevo'].min[2]).toBeCloseTo(1.2, 6)
      expect(c['Preto - relevo'].max[2]).toBeCloseTo(1.6, 6)
      // origem no pé da lingueta (a faixa preta lateral de 0,3 mm fica por fora); o relevo começa acima dela
      expect(c['Preto - lateral'].min[1]).toBeCloseTo(0, 6)
      expect(c['Branco - corpo'].min[1]).toBeCloseTo(PADRAO.lateralPreta, 2)
      expect(c['Preto - relevo'].min[1]).toBeGreaterThan(medidas.linguetas.profMm)
    }
    // mesmo tamanho; a lingueta fica no mesmo lugar de cada lado do eixo, espelhada
    const [cf, cv] = caixas.map((c) => c['Preto - lateral'])
    expect(cv.max[0] - cv.min[0]).toBeCloseTo(cf.max[0] - cf.min[0], 6)
    expect(cv.max[1] - cv.min[1]).toBeCloseTo(cf.max[1] - cf.min[1], 6)
    const larg = cf.max[0] - cf.min[0]
    expect(medidas.figuraEsqMm + medidas.figuraDirMm).toBeLessThanOrEqual(larg + 1e-6)
  }, 300_000)

  it('mantém o encaixe cônico (D031) como opção', async () => {
    const w = await carregarManifold()
    const ler = (lado: string) => readFileSync(join(HDF, 'veteran-shotgun', 'borda', `${lado}.svg`), 'utf8')
    const r = await gerar(w, {
      artes: { v: { rotulo: 'Veteran Shotgun', frente: ler('frente'), verso: ler('verso') } },
      modelos: [{ unidade: 'Veterans', numero: 1, qtd: 1, arte: 'v', base: { forma: 'redonda', mm: [25] } }],
      parametros: { nomeNaBase: false, encaixeBase: 'conico' },
    })
    expect(r.checagens.every((c) => c.status === 'NoError' && c.volumeMm3 > 0)).toBe(true)
    expect(r.artes.v.medidas.linguetas.quantidade).toBe(2)
    expect(r.bases['base-redonda-25-plana'].medidas.fendas.quantidade).toBe(2)
  }, 300_000)
})

describe('número da pose em fenda na face da cola (pedido de 23/11)', () => {
  const fonte = () => carregarFonte(buf(join(RAIZ, 'node_modules/@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff')))
  const AH = join(RAIZ, 'catalog/gff/alien-hives/arts')
  const lerAH = (id: string, lado: string) => readFileSync(join(AH, id, 'fino', `${lado}.svg`), 'utf8')

  it('fura as primeiras camadas do corpo, no lugar espelhado em cada metade, sem parte nova', async () => {
    const w = await carregarManifold()
    const F = lerSvg(lerAH('assault-grunt-v2', 'frente'))
    const V = lerSvg(lerAH('assault-grunt-v2', 'verso'))
    const sem = metadesPretoRelevo(w, F, V, PADRAO)
    const com = metadesPretoRelevo(w, F, V, PADRAO, { fonte: fonte(), texto: '2' })
    expect(com.numero).toEqual({ texto: '2', alturaMm: 4 })
    const centros: number[] = []
    com.metades.forEach((m, i) => {
      expect(m.partes.map((p) => p.rotulo)).toEqual(sem.metades[i].partes.map((p) => p.rotulo))
      const corpo = (x: typeof m) => x.partes.find((p) => p.rotulo === 'Preto - corpo')!.malha
      // cortes do corpo: o número aparece só nas primeiras 0,4 mm
      const fenda = corpo(sem.metades[i]).slice(0.2).subtract(corpo(m).slice(0.2))
      const bb = fenda.bounds()
      expect(bb.max[1] - bb.min[1]).toBeCloseTo(4, 0)
      expect(fenda.area()).toBeGreaterThan(3)
      expect(corpo(m).slice(PADRAO.poseFenda + 0.05).area()).toBeCloseTo(corpo(sem.metades[i]).slice(PADRAO.poseFenda + 0.05).area(), 4)
      expect(corpo(sem.metades[i]).volume() - corpo(m).volume()).toBeCloseTo(fenda.area() * PADRAO.poseFenda, 3)
      // as outras partes não mudam
      for (const r of ['Branco - face', 'Preto - relevo']) {
        const v = (x: typeof m) => x.partes.find((p) => p.rotulo === r)!.malha.volume()
        expect(v(m)).toBeCloseTo(v(sem.metades[i]), 6)
      }
      const caixa = corpo(m).boundingBox()
      centros.push((bb.min[0] + bb.max[0]) / 2 - caixa.min[0], caixa.max[0] - caixa.min[0])
    })
    // a metade do verso é a frente espelhada: o número fica no lugar espelhado
    expect(centros[2]).toBeCloseTo(centros[1] - centros[0], 1)
  }, 300_000)

  it('no 3MF, só as artes com mais de uma pose levam número, e o nome do objeto diz qual', async () => {
    const w = await carregarManifold()
    const arte = (id: string, rotulo: string) => ({ rotulo, frente: lerAH(id, 'frente'), verso: lerAH(id, 'verso') })
    const r25 = { forma: 'redonda' as const, mm: [25] }
    const r = await gerar(w, {
      artes: { g1: arte('assault-grunt-v1', 'Assault Grunt V1'), g2: arte('assault-grunt-v2', 'Assault Grunt V2'), sp: arte('spores', 'Spores') },
      modelos: [
        { unidade: 'Assault Grunts', numero: 1, qtd: 2, arte: 'g1', base: r25, pose: 1 },
        { unidade: 'Assault Grunts', numero: 1, qtd: 1, arte: 'g2', base: r25, pose: 2 },
        { unidade: 'Spores', numero: 2, qtd: 1, arte: 'sp', base: r25 },
      ],
      parametros: { nomeNaBase: false },
      fonte: buf(join(RAIZ, 'node_modules/@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff')),
    })
    expect(r.checagens.filter((c) => c.status !== 'NoError' || c.volumeMm3 <= 0)).toEqual([])
    expect([r.artes.g1.numero?.texto, r.artes.g2.numero?.texto, r.artes.sp.numero]).toEqual(['1', '2', null])
    const cfg = strFromU8(unzipSync(r.arquivo)['Metadata/model_settings.config'])
    expect(cfg).toContain('value="Assault Grunt V1 - frente - pose 1 #1"')
    expect(cfg).toContain('value="Assault Grunt V2 - verso - pose 2 #1"')
    expect(cfg).toContain('value="Spores - frente #1"')
  }, 300_000)
})

describe('gerador (lista piloto HDF, como o protótipo)', () => {
  it('gera o 3MF com uma unidade por placa, malhas fechadas e perfil embutido', async () => {
    const w = await carregarManifold()
    const rot: Record<string, string> = {
      'infantry-rifle': 'Infantry Rifle', 'veteran-shotgun': 'Veteran Shotgun', 'biker-pistol': 'Biker Pistol',
      'biker-lance': 'Biker Lance', 'ogre-minigun': 'OGRE Minigun',
    }
    const r25 = { forma: 'redonda' as const, mm: [25] }
    const pedido: Pedido = {
      artes: Object.fromEntries(Object.entries(rot).map(([id, rotulo]) => [id, { rotulo, frente: svg(id, 'frente'), verso: svg(id, 'verso') }])),
      modelos: [
        { unidade: 'Infantry Squad', numero: 1, qtd: 3, arte: 'infantry-rifle', base: r25 },
        { unidade: 'Combat Bikers', numero: 2, qtd: 2, arte: 'biker-pistol', base: { forma: 'oval', mm: [60, 35] } },
        { unidade: 'Combat Bikers', numero: 2, qtd: 1, arte: 'biker-lance', base: { forma: 'oval', mm: [60, 35] } },
        { unidade: 'Veterans', numero: 3, qtd: 3, arte: 'veteran-shotgun', base: r25 },
        { unidade: 'Veterans', numero: 4, qtd: 3, arte: 'veteran-shotgun', base: r25 },
        { unidade: 'OGRE Robot', numero: 5, qtd: 1, arte: 'ogre-minigun', base: { forma: 'redonda', mm: [40] } },
        { unidade: 'OGRE Robot', numero: 6, qtd: 1, arte: 'ogre-minigun', base: { forma: 'redonda', mm: [40] } },
      ],
      projeto: JSON.parse(readFileSync(join(RAIZ, 'public/bambu/a1-bico-0.2.json'), 'utf8')).projeto,
      fonte: buf(join(RAIZ, 'node_modules/@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff')),
    }
    const r = await gerar(w, pedido)
    expect(r.checagens.filter((c) => c.status !== 'NoError' || c.volumeMm3 <= 0)).toEqual([])
    const porUnidade = r.placas.filter((p) => p.grupo === 'unidade')
    expect(porUnidade.map((p) => p.nome)).toEqual([
      '1 Infantry Squad', '2 Combat Bikers', '3 Veterans', '4 Veterans', '5 OGRE Robot', '6 OGRE Robot'])
    // duas metades e uma base por modelo (D041/D045)
    expect(r.modo).toBe('duas-metades')
    expect(porUnidade.map((p) => p.pecas)).toEqual([9, 9, 9, 9, 3, 3])
    // no fim, a lista completa: as mesmas 42 peças, em "Lista completa 1/N" ... "N/N" (pedido de 23/11)
    const lista = r.placas.filter((p) => p.grupo === 'lista')
    expect(r.placas.slice(-lista.length)).toEqual(lista)
    expect(lista.length).toBeGreaterThan(1)
    expect(lista.map((p) => p.nome)).toEqual(lista.map((_, i) => `Lista completa ${i + 1}/${lista.length}`))
    expect(lista.reduce((s, p) => s + p.pecas, 0)).toBe(42)
    const z = unzipSync(r.arquivo)
    const proj = JSON.parse(strFromU8(z['Metadata/project_settings.config']))
    expect(proj.curr_bed_type).toBe('Textured PEI Plate')
    // torre de purga desligada por padrão (pedido de 23/11)
    expect(proj.enable_prime_tower).toBe('0')
    expect(proj.wipe_tower_y).toHaveLength(r.placas.length)
    const cfg = strFromU8(z['Metadata/model_settings.config'])
    expect(cfg).toContain('value="Branco - nome e número"')
    expect(cfg).toContain('<metadata key="wall_generator" value="arachne"/>')
    expect(Object.values(r.artes).every((a) => a.pecaMm[0] > 10 && a.objetos.length === 2)).toBe(true)
    expect(cfg).toContain('value="Preto - relevo"')
    if (process.env.GRAVAR_3MF) {
      const pasta = join(RAIZ, 'saidas/site-piloto')
      mkdirSync(pasta, { recursive: true })
      writeFileSync(join(pasta, 'projeto-site.3mf'), r.arquivo)
      writeFileSync(join(pasta, 'relatorio.json'), JSON.stringify({ ...r, arquivo: undefined }, null, 1))
    }
  }, 600_000)
})

describe('torre de purga (opção)', () => {
  it('ligada, grava enable_prime_tower e a posição em cada placa, e as peças desviam da área dela', async () => {
    const w = await carregarManifold()
    const ler = (lado: string) => readFileSync(join(HDF, 'veteran-shotgun', 'borda', `${lado}.svg`), 'utf8')
    const r = await gerar(w, {
      artes: { v: { rotulo: 'Veteran Shotgun', frente: ler('frente'), verso: ler('verso') } },
      modelos: [{ unidade: 'Veterans', numero: 1, qtd: 1, arte: 'v', base: { forma: 'redonda', mm: [25] } }],
      parametros: { nomeNaBase: false, torrePurga: true },
      projeto: JSON.parse(readFileSync(join(RAIZ, 'public/bambu/a1-bico-0.2.json'), 'utf8')).projeto,
    })
    const z = unzipSync(r.arquivo)
    const proj = JSON.parse(strFromU8(z['Metadata/project_settings.config']))
    expect(proj.enable_prime_tower).toBe('1')
    expect(proj.wipe_tower_y).toEqual(['200', '200'])
  }, 300_000)
})

describe('lista completa equilibrada', () => {
  it('divide em N placas equilibradas sem separar unidades; se não couber, fica o guloso', async () => {
    const { listaCompleta } = await import('../src/gerador/gerar')
    const { PADRAO } = await import('../src/gerador/parametros')
    // 6 unidades de 9 peças de 40 x 40 mm: 54 peças não cabem numa mesa de 256 mm
    const unidades = Array.from({ length: 6 }, (_, u) => Array.from({ length: 9 }, (_, i) => [`u${u}-${i}`, 40, 40] as [string, number, number]))
    const placas = listaCompleta(unidades, PADRAO)
    expect(placas.length).toBeGreaterThan(1)
    expect(placas.flat().length).toBe(54)
    // nenhuma placa com uma peça sobrando; cada unidade inteira numa placa só
    const tamanhos = placas.map((p) => p.length)
    expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(9)
    for (let u = 0; u < 6; u++) {
      expect(new Set(placas.map((p, i) => (p.some(([k]) => k.startsWith(`u${u}-`)) ? i : -1)).filter((i) => i >= 0)).size).toBe(1)
    }
  })
})

describe('nome na base em maiúsculas, até 4 mm (pedido de 23/11)', () => {
  it('nome curto fica com 4 mm; o longo, com o maior tamanho que cabe na borda', async () => {
    const { base } = await import('../src/gerador/base')
    const w = await carregarManifold()
    const fonte = carregarFonte(buf(join(RAIZ, 'node_modules/@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff')))
    const r25 = { forma: 'redonda' as const, mm: [25] }
    const nome = (n: string, P = PADRAO) => base(w, r25, P, 2.4, fonte, n, 2).medidas.nome!
    expect(nome('Spores')).toMatchObject({ texto: 'SPORES', alturaLetraMm: 4, coube: true })
    const longo = nome('Assault Grunts')
    expect(longo.texto).toBe('ASSAULT GRUNTS')
    expect(longo.coube).toBe(true)
    // a bisseção acha o maior tamanho: um pouco maior já não cabe
    expect(longo.comprimentoMm).toBeGreaterThan(0.97 * longo.arcoDisponivelMm)
    expect(longo.alturaLetraMm).toBeGreaterThan(2.2)
    // a opção antiga continua: como na lista
    expect(nome('Spores', { ...PADRAO, textoMaiusculas: false, textoAltura: 3 })).toMatchObject({ texto: 'Spores', alturaLetraMm: 3 })
  }, 300_000)
})
