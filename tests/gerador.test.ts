import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { metadesPretoRelevo } from '../src/gerador/figura'
import { gerar, type Pedido } from '../src/gerador/gerar'
import { carregarManifold } from '../src/gerador/manifold'
import { PADRAO } from '../src/gerador/parametros'
import { lerCaminho, lerSvg } from '../src/gerador/svg'

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
    expect(r.placas).toEqual([{ nome: '1 Veterans', pecas: 4 }])
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
    expect(r.placas).toEqual([{ nome: '1 Veterans', pecas: 6 }])
    expect(r.checagens.map((c) => c.peca).filter((p) => p.startsWith('v-'))).toEqual([
      'v-frente Branco - corpo', 'v-frente Preto - relevo', 'v-frente Preto - lateral',
      'v-verso Branco - corpo', 'v-verso Preto - relevo', 'v-verso Preto - lateral'])
    // a fenda recebe as duas metades coladas: 2 x 1,2 + 0,25
    const f = r.bases['base-redonda-25-plana'].medidas.fendas
    expect([f.encaixe, f.quantidade]).toEqual(['retangular', 1])
    expect(f.espessura).toBeCloseTo(2.65, 6)
    const cfg = strFromU8(unzipSync(r.arquivo)['Metadata/model_settings.config'])
    expect(cfg).toContain('value="Veteran Shotgun - frente #1"')
    expect(cfg).toContain('value="Veteran Shotgun - verso #1"')
  }, 300_000)

  it('põe o relevo só acima da lingueta e espelha o contorno do verso', async () => {
    const w = await carregarManifold()
    const ler = (lado: string) => lerSvg(readFileSync(join(HDF, 'veteran-shotgun', 'borda', `${lado}.svg`), 'utf8'))
    const { metades, medidas } = metadesPretoRelevo(w, ler('frente'), ler('verso'), PADRAO)
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
    expect(r.placas.map((p) => p.nome)).toEqual([
      '1 Infantry Squad', '2 Combat Bikers', '3 Veterans', '4 Veterans', '5 OGRE Robot', '6 OGRE Robot'])
    // duas metades e uma base por modelo (D041/D045)
    expect(r.modo).toBe('duas-metades')
    expect(r.placas.map((p) => p.pecas)).toEqual([9, 9, 9, 9, 3, 3])
    const z = unzipSync(r.arquivo)
    const proj = JSON.parse(strFromU8(z['Metadata/project_settings.config']))
    expect(proj.curr_bed_type).toBe('Textured PEI Plate')
    expect(proj.wipe_tower_y).toEqual(['200', '200', '200', '200', '200', '200'])
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
