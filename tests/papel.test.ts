import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { unzlibSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { parseShareText } from '../src/armyforge/parseShareText'
import { modelosDoPlano, modelosParaPapel, sugerir } from '../src/catalogo/associar'
import type { ManifestoFaccao } from '../src/catalogo/tipos'
import type { BaseSpec } from '../src/gerador/base'
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

// bases do army book v3.6.0 (manifest.json): 25, oval 60 x 35, 25, 40
const r25: BaseSpec = { forma: 'redonda', mm: [25] }
const oval: BaseSpec = { forma: 'oval', mm: [60, 35] }
const r40: BaseSpec = { forma: 'redonda', mm: [40] }
const piloto: ModeloPapel[] = [
  { unidade: 'Infantry Squad', numero: 1, qtd: 3, arte: 'infantry-rifle', base: r25 },
  { unidade: 'Combat Bikers', numero: 2, qtd: 3, arte: 'biker-pistol', base: oval },
  { unidade: 'Veterans', numero: 3, qtd: 3, arte: 'veteran-shotgun', base: r25 },
  { unidade: 'Veterans', numero: 4, qtd: 3, arte: 'veteran-shotgun', base: r25 },
  { unidade: 'OGRE Robot', numero: 5, qtd: 1, arte: 'ogre-minigun', base: r40 },
  { unidade: 'OGRE Robot', numero: 6, qtd: 1, arte: 'ogre-minigun', base: r40 },
]

/** Primeira meia base de baixo no conteúdo: "x y m x y l x0 y0 l" seguido de duas cúbicas. */
function meiaBaseDeBaixo(conteudo: string) {
  const re = /(\S+) (\S+) m (\S+) (\S+) l (\S+) (\S+) l\n(?:\S+ ){4}(\S+) (\S+) c\n(?:\S+ ){4}(\S+) (\S+) c\n/
  const m = re.exec(conteudo)
  if (!m) throw new Error('meia base não achada')
  const n = m.slice(1).map(Number)
  return { inicio: [n[4], n[5]], meio: [n[6], n[7]], fim: [n[8], n[9]] }
}
const primeiraPagina = (pdf: ReturnType<typeof lerPdf>) => pdf.fluxo([...pdf.objetos.keys()].find((id) => /\/Type \/Page /.test(pdf.corpo(id)))! + 1)
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
      const [w, l] = r.medidas[f.chave].faixaMm
      expect(f.x).toBeGreaterThanOrEqual(P.margemMm - 1e-6)
      expect(f.y).toBeGreaterThanOrEqual(P.margemMm - 1e-6)
      expect(f.x + w).toBeLessThanOrEqual(P.margemMm + util[0] + 0.01)
      expect(f.y + l).toBeLessThanOrEqual(P.margemMm + util[1] + 0.01)
      for (const g of r.faixas) {
        if (g === f || g.folha !== f.folha) continue
        const [w2, l2] = r.medidas[g.chave].faixaMm
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

  it('mantém a escala do PDF a 100% (D014) e a célula da OPR; as abas são meia base do army book', () => {
    const r = gerarPapel({ modelos: piloto, artes: artesPiloto })
    const inf = r.medidas['infantry-rifle|redonda-25']
    // a Infantry Rifle tem ~35 mm no PDF da OPR; a célula da OPR tem 40 mm
    expect(inf.figuraMm[1]).toBeGreaterThan(34.5)
    expect(inf.figuraMm[1]).toBeLessThan(35.2)
    expect(inf.celulaMm).toBeCloseTo(inf.figuraMm[1] + 5.5, 6)
    // cada aba é meia base de 25 mm: 12,5 mm de profundidade
    expect([inf.formaAba, inf.baseMm, inf.abaMm]).toEqual(['base', [25, 25], 12.5])
    expect(inf.faixaMm[1]).toBeCloseTo(2 * inf.celulaMm + 25, 1)
    expect(inf.faixaMm[0]).toBe(30)
    const bk = r.medidas['biker-pistol|oval-60x35']
    expect([bk.formaAba, bk.baseMm, bk.abaMm]).toEqual(['base', [60, 35], 17.5])
    expect(bk.faixaMm[0]).toBeGreaterThanOrEqual(60)
    const og = r.medidas['ogre-minigun|redonda-40']
    expect([og.formaAba, og.abaMm]).toEqual(['base', 20])
    // a base inteira fica dentro da faixa
    for (const m of Object.values(r.medidas)) expect(Math.abs(m.desvioBaseMm) + m.baseMm![0] / 2).toBeLessThanOrEqual(m.faixaMm[0] / 2 + 0.01)
    // o formulário desenha os px da arte a 25,4/600 mm, sem outra escala
    const pdf = lerPdf(r.arquivo)
    const conteudo = primeiraPagina(pdf)
    expect(conteudo).toContain('2.834646 0 0 -2.834646 0 841.8898 cm')
    expect(conteudo).toContain('q 0.0423333 0 0 0.0423333 ')
    expect(conteudo).toContain('q -0.0423333 0 0 -0.0423333 ')
    // a meia base de baixo da primeira faixa (Infantry) no PDF: 25 mm de diâmetro, 12,5 de fundo
    const mb = meiaBaseDeBaixo(conteudo)
    expect(mb.fim[0] - mb.inicio[0]).toBeCloseTo(25, 2)
    expect(mb.fim[1]).toBeCloseTo(mb.inicio[1], 3)
    expect(mb.meio[1] - mb.inicio[1]).toBeCloseTo(12.5, 2)
    expect(mb.meio[0]).toBeCloseTo((mb.inicio[0] + mb.fim[0]) / 2, 3)
  })

  it('a oval 60 x 35 sai com 60 mm no plano da figura e 17,5 mm em cada aba', () => {
    const r = gerarPapel({ modelos: [{ unidade: 'Combat Bikers', numero: 2, qtd: 1, arte: 'biker-pistol', base: oval }], artes: artesPiloto })
    const mb = meiaBaseDeBaixo(primeiraPagina(lerPdf(r.arquivo)))
    expect(mb.fim[0] - mb.inicio[0]).toBeCloseTo(60, 2)
    expect(mb.meio[1] - mb.inicio[1]).toBeCloseTo(17.5, 2)
  })

  it('sem base, abas retangulares de 20 mm como no PDF da OPR, com aviso', () => {
    const r = gerarPapel({ modelos: [{ unidade: 'Veterans', numero: 3, qtd: 1, arte: 'veteran-shotgun' }], artes: artesPiloto })
    const m = r.medidas['veteran-shotgun|sem-base']
    expect([m.formaAba, m.abaMm, m.baseMm]).toEqual(['retangulo', 20, null])
    expect(m.faixaMm[1]).toBeCloseTo(2 * m.celulaMm + 40, 1)
    expect(r.avisos).toEqual(['Veterans: sem base escolhida; abas retangulares de 20 mm, como no PDF da OPR.'])
  })

  it('cabe mais de uma faixa por linha e mais de uma linha por folha', () => {
    const r = gerarPapel({ modelos: [{ unidade: 'Infantry Squad', numero: 1, qtd: 10, arte: 'infantry-rifle' }], artes: artesPiloto })
    expect(r.folhas).toBe(1)
    expect(new Set(r.faixas.map((f) => f.y)).size).toBe(2)
  })

  it('arte muito alta: encurta a folga e, se a meia base não couber, usa abas retangulares e avisa', () => {
    const grande = arte('alien-hives', 'winged-prime-spine-guns', 'borda')
    const base: BaseSpec = { forma: 'redonda', mm: [60] }
    const r = gerarPapel({ modelos: [{ unidade: 'Winged Prime', numero: 1, qtd: 1, arte: 'g', base }], artes: { g: { ...grande, rotulo: 'Winged Prime' } } })
    const m = r.medidas['g|redonda-60']
    expect([m.cabe, m.reduzida, m.formaAba]).toEqual([true, true, 'retangulo'])
    expect(m.figuraMm[1]).toBeGreaterThan(120)
    expect(m.abaMm).toBeGreaterThanOrEqual(12)
    expect(r.folhas).toBe(1)
    expect(r.avisos[0]).toMatch(/^Winged Prime: a base redonda de 60 mm não coube na folha junto com a figura; abas retangulares de /)
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
    expect(papel.modelos.map((m) => [m.unidade, m.numero, m.qtd, m.base])).toEqual([
      ['Infantry Squad', 1, 3, r25], ['Combat Bikers', 2, 3, oval], ['Veterans', 3, 3, null], ['Veterans', 4, 3, null],
    ])
  })
})
