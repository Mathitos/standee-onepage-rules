import { describe, expect, it } from 'vitest'
import { arteDeCinza, contornos, silhuetaDe, tintaDe, type Cinza } from '../src/catalogo/arteEnviada'
import { secao } from '../src/gerador/figura'
import { gerar } from '../src/gerador/gerar'
import { carregarManifold } from '../src/gerador/manifold'
import { S } from '../src/gerador/parametros'
import { lerSvg } from '../src/gerador/svg'

/** Tela branca com retângulos pretos [x0, y0, x1, y1] (inclusive). */
function tela(w: number, h: number, pretos: [number, number, number, number][]): Cinza {
  const dados = new Uint8Array(w * h).fill(255)
  for (const [x0, y0, x1, y1] of pretos) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dados[y * w + x] = 0
  return { dados, w, h }
}

/** Figura: contorno preto de 4 px de 100 x 260 px, com um traço no meio e "pés" na base. */
function figura(): Cinza {
  return tela(140, 300, [
    [20, 20, 119, 23], [20, 276, 119, 279], [20, 20, 23, 279], [116, 20, 119, 279], // contorno
    [40, 140, 99, 143], // traço interno
  ])
}

const soma = (m: Uint8Array) => m.reduce((s, v) => s + v, 0)

describe('arte enviada: imagem -> contrato v2', () => {
  it('silhueta cheia (buraco preenchido) e tinta só no traço', () => {
    const c = figura()
    const sil = silhuetaDe(c)
    expect(soma(sil)).toBe(100 * 260)
    const tinta = tintaDe(c, sil)
    // todo o traço desenhado vira tinta; o desfoque de 0,035 mm com limiar 200 (o do catálogo, para
    // traço fino não quebrar) engrossa borda nítida em ~1 px de cada lado, dentro da silhueta
    const desenhado = 2 * 100 * 4 + 2 * 252 * 4 + 60 * 4
    expect(c.dados.every((v, i) => v !== 0 || tinta[i] === 1)).toBe(true)
    expect(soma(tinta)).toBeLessThan(desenhado * 1.4)
    // o miolo longe do traço fica sem tinta
    expect(tinta[80 * 140 + 70]).toBe(0)
  })

  it('contornos pelos centros dos pixels: meio pixel para fora dá a área exata, com buracos', async () => {
    const w = await carregarManifold()
    const W = 60
    const H = 50
    // anel: quadrado 40 x 30 com buraco 20 x 10, mais um quadrado solto dentro do buraco
    const m = new Uint8Array(W * H)
    const pinta = (x0: number, y0: number, x1: number, y1: number, v: number) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y * W + x] = v
    }
    pinta(10, 10, 49, 39, 1)
    pinta(20, 20, 39, 29, 0)
    pinta(27, 23, 32, 26, 1)
    const polys = contornos(m, W, H)
    expect(polys.length).toBe(3)
    const area = secao(w, polys, H).area() / (S * S)
    // exata, mais 1 px²: o buraco perde 0,25 px² em cada canto, porque a borda de buraco corta o canto na
    // diagonal (8-conexa), como no cv2.findContours do importador
    expect(area).toBeCloseTo(40 * 30 - 20 * 10 + 6 * 4 + 1, 3)
    expect(polys.every((p) => p.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)))).toBe(true)
  })

  it('o SVG sai no contrato v2: o leitor do gerador lê silhueta e tinta', async () => {
    const w = await carregarManifold()
    const a = arteDeCinza('enviada-1', 'Minha arte', figura(), null)
    expect(a.tamanhoMm).toEqual([Math.round(100 * S * 100) / 100, Math.round(260 * S * 100) / 100])
    expect(a.versoProprio).toBe(false)
    const f = lerSvg(a.frente)
    const v = lerSvg(a.verso)
    expect([f.largura, f.altura, v.largura, v.altura]).toEqual([140, 300, 140, 300])
    expect(secao(w, f.silhueta, f.altura).area() / (S * S)).toBeCloseTo(100 * 260, 0)
    expect(f.tinta.length).toBeGreaterThan(1)
    // sem verso, o verso é a frente espelhada: mesma área
    expect(secao(w, v.silhueta, v.altura).area()).toBeCloseTo(secao(w, f.silhueta, f.altura).area(), 6)
  })

  it('sem figura, avisa', () => {
    expect(() => arteDeCinza('x', 'x', tela(50, 50, []), null)).toThrow(/não achei a figura/)
  })

  it('a arte enviada vira as duas metades e a base no 3MF', async () => {
    const w = await carregarManifold()
    const a = arteDeCinza('enviada-1', 'Minha arte', figura(), null)
    const r = await gerar(w, {
      artes: { [a.id]: { rotulo: a.rotulo, frente: a.frente, verso: a.verso } },
      modelos: [{ unidade: 'Grunt Veteran', numero: 1, qtd: 1, arte: a.id, base: { forma: 'redonda', mm: [25] } }],
      parametros: { nomeNaBase: false },
    })
    expect(r.checagens.every((c) => c.status === 'NoError' && c.volumeMm3 > 0)).toBe(true)
    expect(r.placas[0]).toEqual({ nome: '1 Grunt Veteran', pecas: 3, grupo: 'unidade' })
    expect(r.artes[a.id].objetos).toEqual(['enviada-1-frente', 'enviada-1-verso'])
  }, 300_000)
})
