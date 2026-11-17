/**
 * Contrato da lista importada (PRD-02, ARQUITETURA: NormalizedArmyList).
 * Fonte no MVP: texto do "Share as Text" do Army Forge (D010). O texto não traz
 * IDs nem bases; esses dados vêm do catálogo (D015).
 */

export interface EquipmentItem {
  /** quantidade na unidade (texto "3x"); sem prefixo = 1 */
  count: number
  name: string
  /** conteúdo entre parênteses, ex.: `24", A2` */
  profile: string | null
  raw: string
}

export interface RuleItem {
  count: number | null
  name: string
  raw: string
}

/** Combinação de equipamento usada por um grupo de modelos da unidade. */
export interface ModelVariant {
  equipment: string[]
  modelsPerUnit: number
}

/**
 * uniform   — todos os modelos iguais;
 * partition — as contagens fecham exatamente o número de modelos (proposta segura, mas confirmar);
 * ambiguous — não dá para distribuir só pelas contagens; exige revisão.
 */
export type Distribution = 'uniform' | 'partition' | 'ambiguous'

export interface UnitGroup {
  /** linha (1-based) do cabeçalho da unidade no texto */
  line: number
  /** "2x Veterans" → 2 unidades idênticas */
  copies: number
  name: string
  modelsPerUnit: number
  quality: number
  defense: number
  pointsPerUnit: number
  rules: RuleItem[]
  equipment: EquipmentItem[]
  variants: ModelVariant[]
  distribution: Distribution
  needsReview: boolean
}

export interface ArmyListHeader {
  armyName: string
  armyVersion: string | null
  systemCode: string | null
  points: number | null
  declaredUnits: number | null
}

export type IssueKind =
  | 'empty'
  | 'missing-header'
  | 'points-mismatch'
  | 'units-mismatch'
  | 'unrecognized-line'
  | 'missing-equipment'
  | 'distribution-review'

export interface ImportIssue {
  kind: IssueKind
  message: string
  line?: number
}

export interface NormalizedArmyList {
  source: { kind: 'army-forge-share-as-text'; rawText: string; importedAt: string }
  header: ArmyListHeader | null
  units: UnitGroup[]
  totals: { units: number; models: number; points: number }
  issues: ImportIssue[]
  unrecognized: { line: number; text: string }[]
}
