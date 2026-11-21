import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { gerar, type Pedido } from '../src/gerador/gerar'
import { carregarManifold } from '../src/gerador/manifold'
import { lerCaminho } from '../src/gerador/svg'

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
  it('gera uma figura com base lisa', async () => {
    const w = await carregarManifold()
    const ler = (lado: string) => readFileSync(join(HDF, 'veteran-shotgun', 'borda', `${lado}.svg`), 'utf8')
    const r = await gerar(w, {
      artes: { v: { rotulo: 'Veteran Shotgun', frente: ler('frente'), verso: ler('verso') } },
      modelos: [{ unidade: 'Veterans', numero: 1, qtd: 2, arte: 'v', base: { forma: 'redonda', mm: [25] } }],
      parametros: { nomeNaBase: false },
    })
    expect(r.checagens.every((c) => c.status === 'NoError' && c.volumeMm3 > 0)).toBe(true)
    expect(r.placas).toEqual([{ nome: '1 Veterans', pecas: 4 }])
    expect(r.avisos).toContain('Sem perfil da impressora: o Bambu Studio vai abrir só a geometria.')
    expect(Object.keys(r.bases)).toEqual(['base-redonda-25-plana'])
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
    expect(r.placas.map((p) => p.pecas)).toEqual([6, 6, 6, 6, 2, 2])
    const z = unzipSync(r.arquivo)
    const proj = JSON.parse(strFromU8(z['Metadata/project_settings.config']))
    expect(proj.curr_bed_type).toBe('Textured PEI Plate')
    expect(proj.wipe_tower_y).toEqual(['200', '200', '200', '200', '200', '200'])
    const cfg = strFromU8(z['Metadata/model_settings.config'])
    expect(cfg).toContain('value="Branco - nome e número"')
    expect(cfg).toContain('<metadata key="wall_generator" value="arachne"/>')
    // espessura da figura: 1,6 mm (peça única pintada)
    expect(Object.values(r.artes).every((a) => a.pecaMm[0] > 10)).toBe(true)
    if (process.env.GRAVAR_3MF) {
      const pasta = join(RAIZ, 'saidas/site-piloto')
      mkdirSync(pasta, { recursive: true })
      writeFileSync(join(pasta, 'projeto-site.3mf'), r.arquivo)
      writeFileSync(join(pasta, 'relatorio.json'), JSON.stringify({ ...r, arquivo: undefined }, null, 1))
    }
  }, 600_000)
})
