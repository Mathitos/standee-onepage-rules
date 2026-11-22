import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { unzlibSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { parseShareText } from '../src/armyforge/parseShareText'
import { modelosDoPlano, modelosParaPapel, sugerir } from '../src/catalogo/associar'
import type { ManifestoFaccao } from '../src/catalogo/tipos'
import { distribuir, gerarPapel, PADRAO_PAPEL, type ArtePapel, type ModeloPapel } from '../src/papel/folhas'

const RAIZ = join(__dirname, '..')
const arte = (faccao: string, id: string, estilo = 'fino'): ArtePapel => {
  const ler = (lado: string) => readFileSync(join(RAIZ, 'catalog/gff', faccao, 'arts', id, estilo, `${lado}.svg`), 'utf8')
  const artes = JSON.parse(readFileSync(join(RAIZ, 'catalog/gff', faccao, 'artes.json'), 'utf8')) as { artes: { id: string; rotulo: string | null }[] }
  return { rotulo: artes.artes.find((a) => a.id === id)?.rotulo ?? id, frente: ler('frente'), verso: ler('verso') }
}
const buf = (p: string) => {
  const b = readFileSync(p)
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}
const fonte = () => buf(join(RAIZ, 'node_modules/@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff'))

/** Lê o PDF de volta: objetos pelo xref, páginas e conteúdos descomprimidos. */
function lerPdf(pdf: Uint8Array) {
  const txt = strFromU8(pdf, true)
  const inicio = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(txt)![1])
  const xref = txt.slice(inicio)
  const [, primeiro, n] = /^xref\n(\d+) (\d+)\n/.exec(xref)!.map(Number)
  const linhas = xref.split('\n').slice(2, 2 + n)
  const objetos = new Map<number, number>()
  linhas.forEach((l, i) => {
    if (l.endsWith('n ')) objetos.set(primeiro + i, Number(l.slice(0, 10)))
  })
  const corpo = (id: number) => {
    const at = objetos.get(id)!
    expect(txt.startsWith(`${id} 0 obj\n`, at)).toBe(true)
    return txt.slice(at, txt.indexOf('endobj', at))
  }
  const fluxo = (id: number) => {
    const at = objetos.get(id)!
    const c = corpo(id)
    const len = Number(/\/Length (\d+)/.exec(c)![1])
    const ini = at + c.indexOf('stream\n') + 7
    return strFromU8(unzlibSync(pdf.subarray(ini, ini + len)))
  }
  return { txt, objetos, corpo, fluxo }
}

const piloto: ModeloPapel[] = [
  { unidade: 'Infantry Squad', numero: 1, qtd: 3, arte: 'infantry-rifle' },
  { unidade: 'Combat Bikers', numero: 2, qtd: 3, arte: 'biker-pistol' },
  { unidade: 'Veterans', numero: 3, qtd: 3, arte: 'veteran-shotgun' },
  { unidade: 'Veterans', numero: 4, qtd: 3, arte: 'veteran-shotgun' },
  { unidade: 'OGRE Robot', numero: 5, qtd: 1, arte: 'ogre-minigun' },
  { unidade: 'OGRE Robot', numero: 6, qtd: 1, arte: 'ogre-minigun' },
]
const artesPiloto = Object.fromEntries([...new Set(piloto.map((m) => m.arte))].map((id) => [id, arte('human-defense-force', id)]))

describe('folhas de papel A4 (D044)', () => {
  it('gera um PDF A4 válido com uma faixa por modelo, dentro da área útil e sem sobreposição', () => {
    const r = gerarPapel({ modelos: piloto, artes: artesPiloto, titulo: 'Human Defense Force', fonte: fonte(), data: new Date(0) })
    expect(r.faixas).toHaveLength(14)
    expect(r.avisos).toEqual([])
    const pdf = lerPdf(r.arquivo)
    expect(pdf.txt.startsWith('%PDF-1.4\n')).toBe(true)
    expect(pdf.corpo(2)).toContain(`/Count ${r.folhas}`)
    const paginas = [...pdf.objetos.keys()].filter((id) => /\/Type \/Page /.test(pdf.corpo(id)))
    expect(paginas).toHaveLength(r.folhas)
    for (const id of paginas) expect(pdf.corpo(id)).toContain('/MediaBox [0 0 595.276 841.89]')
    // cada arte usada vira dois formulários (frente e verso), reutilizados em todas as cópias
    const forms = [...pdf.objetos.keys()].filter((id) => /\/Subtype \/Form/.test(pdf.corpo(id)))
    expect(forms).toHaveLength(2 * Object.keys(artesPiloto).length)
    const usos = paginas.map((id) => (pdf.fluxo(id + 1).match(/ Do Q/g) ?? []).length)
    expect(usos.reduce((a, b) => a + b, 0)).toBe(28)

    const P = PADRAO_PAPEL
    const util = [210 - 2 * P.margemMm, 297 - 2 * P.margemMm - P.rodapeMm]
    for (const f of r.faixas) {
      const [w, l] = r.artes[f.arte].faixaMm
      expect(f.x).toBeGreaterThanOrEqual(P.margemMm - 1e-6)
      expect(f.y).toBeGreaterThanOrEqual(P.margemMm - 1e-6)
      expect(f.x + w).toBeLessThanOrEqual(P.margemMm + util[0] + 0.01)
      expect(f.y + l).toBeLessThanOrEqual(P.margemMm + util[1] + 0.01)
      for (const g of r.faixas) {
        if (g === f || g.folha !== f.folha) continue
        const [w2, l2] = r.artes[g.arte].faixaMm
        // faixaMm sai arredondado a 0,01 mm; as posições usam o valor exato
        const e = 0.006
        const separadas = f.x + w <= g.x + e || g.x + w2 <= f.x + e || f.y + l <= g.y + e || g.y + l2 <= f.y + e
        expect(separadas).toBe(true)
      }
    }
    if (process.env.GRAVAR_PDF) {
      const pasta = join(RAIZ, 'saidas/papel-piloto')
      mkdirSync(pasta, { recursive: true })
      writeFileSync(join(pasta, 'piloto-fino-a4.pdf'), r.arquivo)
      writeFileSync(join(pasta, 'relatorio.json'), JSON.stringify({ ...r, arquivo: undefined }, null, 1))
    }
  })

  it('mantém a escala do PDF a 100% (D014) e as medidas de faixa da OPR', () => {
    const r = gerarPapel({ modelos: piloto, artes: artesPiloto })
    const inf = r.artes['infantry-rifle']
    // a Infantry Rifle tem ~35 mm no PDF da OPR; a célula da OPR tem 40 mm e as abas 20 mm
    expect(inf.figuraMm[1]).toBeGreaterThan(34.5)
    expect(inf.figuraMm[1]).toBeLessThan(35.2)
    expect(inf.celulaMm).toBeCloseTo(inf.figuraMm[1] + 5.5, 6)
    expect(inf.abaMm).toBe(20)
    expect(inf.faixaMm[1]).toBeCloseTo(2 * inf.celulaMm + 40, 1)
    expect(inf.faixaMm[0]).toBe(30)
    // o formulário desenha os px da arte a 25,4/600 mm, sem outra escala
    const pdf = lerPdf(r.arquivo)
    const conteudo = pdf.fluxo([...pdf.objetos.keys()].find((id) => /\/Type \/Page /.test(pdf.corpo(id)))! + 1)
    expect(conteudo).toContain('2.834646 0 0 -2.834646 0 841.8898 cm')
    expect(conteudo).toContain('q 0.0423333 0 0 0.0423333 ')
    expect(conteudo).toContain('q -0.0423333 0 0 -0.0423333 ')
  })

  it('cabe mais de uma faixa por linha e mais de uma linha por folha', () => {
    const r = gerarPapel({ modelos: [{ unidade: 'Infantry Squad', numero: 1, qtd: 10, arte: 'infantry-rifle' }], artes: artesPiloto })
    expect(r.folhas).toBe(1)
    expect(new Set(r.faixas.map((f) => f.y)).size).toBe(2)
  })

  it('encurta abas e folga das artes muito altas e avisa', () => {
    const grande = arte('alien-hives', 'winged-prime-spine-guns', 'borda')
    const r = gerarPapel({ modelos: [{ unidade: 'Winged Prime', numero: 1, qtd: 1, arte: 'g' }], artes: { g: { ...grande, rotulo: 'Winged Prime' } } })
    expect(r.artes.g.cabe).toBe(true)
    expect(r.artes.g.reduzida).toBe(true)
    expect(r.artes.g.figuraMm[1]).toBeGreaterThan(120)
    expect(r.folhas).toBe(1)
    expect(r.avisos[0]).toMatch(/^Winged Prime: abas de/)
  })

  it('distribui na primeira linha com espaço, em qualquer folha', () => {
    // 3 de 55 numa linha de 196; a quarta abre outra linha; a de 30 volta para a primeira
    expect(distribuir([[55, 100], [55, 100], [55, 100], [55, 100], [30, 100]], [196, 275])).toEqual([
      [0, 0, 0], [0, 55, 0], [0, 110, 0], [0, 0, 100], [0, 165, 0],
    ])
    expect(distribuir([[95, 200], [95, 200]], [196, 275])).toEqual([[0, 0, 0], [0, 95, 0]])
    expect(distribuir([[150, 200], [150, 200]], [196, 275])).toEqual([[0, 0, 0], [1, 0, 0]])
  })

  it('no papel, unidade sem base entra; sem arte, fica de fora', () => {
    const texto = readFileSync(join(RAIZ, 'tests/fixtures/armyforge/piloto-share-as-text.txt'), 'utf8')
    const manifesto = JSON.parse(readFileSync(join(RAIZ, 'catalog/gff/human-defense-force/manifest.json'), 'utf8')) as ManifestoFaccao
    const plano = sugerir(parseShareText(texto), manifesto)
    const semBase = plano.map((p) => (p.unidade.name === 'Veterans' ? { ...p, base: null } : p))
    expect(modelosDoPlano(semBase).omitidas).toEqual(['Veterans', 'OGRE Robot'])
    const papel = modelosParaPapel(semBase)
    expect(papel.omitidas).toEqual(['OGRE Robot'])
    expect(papel.modelos.map((m) => [m.unidade, m.numero, m.qtd])).toEqual([
      ['Infantry Squad', 1, 3], ['Combat Bikers', 2, 3], ['Veterans', 3, 3], ['Veterans', 4, 3],
    ])
  })
})
