/**
 * Escritor mínimo de PDF 1.4: páginas do mesmo tamanho, conteúdo em operadores de desenho e
 * formulários (Form XObjects) reutilizáveis, todos os fluxos comprimidos (FlateDecode, fflate).
 * Sem fontes embutidas: o texto chega aqui já como contorno. Roda no navegador e no Node.
 */
import { zlibSync } from 'fflate'

/** pontos por mm (1 pt = 1/72 pol) */
export const PT = 72 / 25.4

export interface FormularioPdf {
  /** nome usado no conteúdo das páginas (`/<nome> Do`) */
  nome: string
  /** caixa do formulário no espaço dele: [x0, y0, x1, y1] */
  caixa: [number, number, number, number]
  conteudo: string
}

export interface DocumentoPdf {
  larguraPt: number
  alturaPt: number
  /** um fluxo de conteúdo por página */
  paginas: string[]
  formularios: FormularioPdf[]
  titulo?: string
  criador?: string
  data?: Date
}

/** Número curto: até `casas` casas (3), sem zeros à direita nem "-0". */
export function num(n: number, casas = 3): string {
  const s = n.toFixed(casas).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

/** Texto do dicionário Info em UTF-16BE com BOM, em hexadecimal (aceita acentos). */
function textoPdf(s: string): string {
  let h = 'FEFF'
  for (let i = 0; i < s.length; i++) h += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase()
  return `<${h}>`
}

function dataPdf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `(D:${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z)`
}

export function escreverPdf(doc: DocumentoPdf): Uint8Array {
  const enc = new TextEncoder()
  const partes: Uint8Array[] = []
  const deslocamentos: number[] = []
  let tamanho = 0
  const escrever = (b: Uint8Array | string) => {
    const u = typeof b === 'string' ? enc.encode(b) : b
    partes.push(u)
    tamanho += u.byteLength
  }
  const objeto = (id: number, corpo: string, fluxo?: Uint8Array) => {
    deslocamentos[id] = tamanho
    escrever(`${id} 0 obj\n${corpo}\n`)
    if (fluxo) {
      escrever('stream\n')
      escrever(fluxo)
      escrever('\nendstream\n')
    }
    escrever('endobj\n')
  }
  const comprimir = (s: string) => zlibSync(enc.encode(s), { level: 6 })

  // 1 catálogo, 2 árvore de páginas, 3 recursos, 4 info, depois formulários e páginas
  const idForm = (i: number) => 5 + i
  const idPagina = (i: number) => 5 + doc.formularios.length + 2 * i
  const total = 5 + doc.formularios.length + 2 * doc.paginas.length

  escrever('%PDF-1.4\n')
  escrever(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))   // marca de arquivo binário
  objeto(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const kids = doc.paginas.map((_, i) => `${idPagina(i)} 0 R`).join(' ')
  objeto(2, `<< /Type /Pages /Kids [${kids}] /Count ${doc.paginas.length} >>`)
  const xobj = doc.formularios.map((f, i) => `/${f.nome} ${idForm(i)} 0 R`).join(' ')
  objeto(3, `<< /ProcSet [/PDF] /XObject << ${xobj} >> >>`)
  const info = [
    doc.titulo ? `/Title ${textoPdf(doc.titulo)}` : '',
    doc.criador ? `/Creator ${textoPdf(doc.criador)} /Producer ${textoPdf(doc.criador)}` : '',
    `/CreationDate ${dataPdf(doc.data ?? new Date())}`,
  ].filter(Boolean).join(' ')
  objeto(4, `<< ${info} >>`)
  doc.formularios.forEach((f, i) => {
    const z = comprimir(f.conteudo)
    objeto(idForm(i), `<< /Type /XObject /Subtype /Form /FormType 1 /BBox [${f.caixa.map(num).join(' ')}] ` +
      `/Resources << /ProcSet [/PDF] >> /Filter /FlateDecode /Length ${z.byteLength} >>`, z)
  })
  const caixa = `[0 0 ${num(doc.larguraPt)} ${num(doc.alturaPt)}]`
  doc.paginas.forEach((c, i) => {
    objeto(idPagina(i), `<< /Type /Page /Parent 2 0 R /MediaBox ${caixa} /Resources 3 0 R /Contents ${idPagina(i) + 1} 0 R >>`)
    const z = comprimir(c)
    objeto(idPagina(i) + 1, `<< /Filter /FlateDecode /Length ${z.byteLength} >>`, z)
  })

  const inicioXref = tamanho
  let xref = `xref\n0 ${total}\n0000000000 65535 f \n`
  for (let id = 1; id < total; id++) xref += `${String(deslocamentos[id]).padStart(10, '0')} 00000 n \n`
  escrever(xref)
  escrever(`trailer\n<< /Size ${total} /Root 1 0 R /Info 4 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`)

  const saida = new Uint8Array(tamanho)
  let pos = 0
  for (const p of partes) {
    saida.set(p, pos)
    pos += p.byteLength
  }
  return saida
}
