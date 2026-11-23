/** Arquivos do catálogo servidos em ./catalogo/ (ver vite.config.ts e exportar_web.py). */

export interface FaccaoIndice {
  sistema: string
  slug: string
  caminho: string
  faccao: string
  artes: number
  manifesto: boolean
  /** nomes do exército no Army Forge (dos army books do manifesto), ex. "Saurian Starhosts" */
  exercitos?: string[]
  /** há bases.json: as bases de todas as unidades dos army books da facção */
  bases?: boolean
}

export interface IndiceCatalogo {
  faccoes: FaccaoIndice[]
}

export interface EstiloArte {
  telaMm: [number, number]
  tamanhoMm: [number, number]
  iouFrenteVerso: number
  pagina: number
  copias: number
}

export interface ArteCatalogo {
  id: string
  candidato: string
  /** rótulo transcrito na revisão; null = ainda não lido (só a imagem do rótulo impresso) */
  rotulo: string | null
  rotuloImg: string | null
  unitKey: string | null
  equipmentTags: string[]
  cosmetic: string | null
  status: string
  estilos: Partial<Record<Estilo, EstiloArte>>
  pendencias: string[]
}

export type Estilo = 'fino' | 'borda'

export interface ArtesFaccao {
  contrato: number
  dpi: number
  packId: string
  faccao: string
  sistema: string
  pdf: { nome: string; sha256: string; paginas: number }
  manifesto: string | null
  artes: ArteCatalogo[]
}

/** Base como no manifest.json: medida do army book (D015); "unknown" quando não há ("none"). */
export interface BaseManifesto {
  shape: 'round' | 'oval' | 'unknown'
  dimensionsMm: number[] | null
  raw: string | null
}

/** Subconjunto do manifest.json (PRD-02) usado para associar a lista. */
export interface ManifestoFaccao {
  units: {
    unitKey: string
    names: string[]
    base: BaseManifesto
  }[]
  arts: {
    artId: string
    pdfLabel: string
    unitKey: string | null
    equipmentTags: string[]
    cosmetic: string | null
    mappingStatus: string
  }[]
}
