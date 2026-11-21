/**
 * Leitura dos SVG do catálogo, contrato v2 (`.claude/skills/importar-artes-pdf/scripts/vetor.py`):
 * viewBox em pixels de 600 dpi, path#silhueta e path#tinta só com M, l relativos e z, vértices
 * inteiros nos centros dos pixels do contorno. Sem DOM: roda também no Web Worker e no Node.
 */

/** Polígono em pixels (centros), y para baixo, como na imagem. */
export type Poligono = [number, number][]

export interface FaceSvg {
  largura: number
  altura: number
  silhueta: Poligono[]
  tinta: Poligono[]
}

export function lerCaminho(d: string): Poligono[] {
  const polys: Poligono[] = []
  for (const sub of d.split('M')) {
    const nums = sub.match(/-?\d+/g)
    if (!nums || nums.length < 6) continue
    let x = Number(nums[0])
    let y = Number(nums[1])
    const p: Poligono = [[x, y]]
    for (let i = 2; i + 1 < nums.length; i += 2) {
      x += Number(nums[i])
      y += Number(nums[i + 1])
      p.push([x, y])
    }
    if (p.length >= 3) polys.push(p)
  }
  return polys
}

export function lerSvg(texto: string): FaceSvg {
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(texto)
  if (!vb || !/data-contrato="2"/.test(texto)) {
    throw new Error('SVG fora do contrato v2 (viewBox em px de 600 dpi)')
  }
  const caminho = (id: string) => {
    const m = new RegExp(`<path id="${id}"[^>]*\\sd="([^"]*)"`).exec(texto)
    return m ? lerCaminho(m[1]) : []
  }
  const face = { largura: Number(vb[1]), altura: Number(vb[2]), silhueta: caminho('silhueta'), tinta: caminho('tinta') }
  if (!face.silhueta.length) throw new Error('SVG sem silhueta')
  return face
}
