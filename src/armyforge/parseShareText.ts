/**
 * Parser do texto "Share as Text" do Army Forge (D010, PRD-02).
 *
 * Formato observado em 17/11/2026 (docs/evidencias/2026-11-17-T001-armyforge/share-as-text.txt):
 *   ++ Human Defense Force (v3.6.0) [GFF 780pts] [6 Units] ++
 *
 *   2x Veterans [3] Q4+ D5+ | 140pts | 3x Hold the Line, Tough(3)
 *   3x Strike (A2), 3x Shotgun (12", A4, AP(1))
 *
 * Regras: "Nx" agrupa unidades idênticas e os pontos são por unidade; vírgulas dentro
 * de parênteses pertencem à arma; linha não reconhecida nunca é descartada em silêncio.
 */
import type {
  ArmyListHeader,
  Distribution,
  EquipmentItem,
  ImportIssue,
  ModelVariant,
  NormalizedArmyList,
  RuleItem,
  UnitGroup,
} from './types'

const HEADER_RE =
  /^\+\+\s*(.+?)\s*(?:\(v([^)]+)\))?\s*\[\s*([A-Za-z]+)\s+(\d+)\s*pts\s*\](?:\s*\[\s*(\d+)\s*units?\s*\])?\s*\+\+$/i
const UNIT_RE =
  /^(?:(\d+)\s*x\s+)?(.+?)\s*\[(\d+)\]\s*Q(\d+)\+\s*D(\d+)\+\s*\|\s*(\d+)\s*pts\s*(?:\|\s*(.*))?$/i
const ITEM_RE = /^(?:(\d+)\s*x\s+)?(.+?)\s*(?:\((.*)\))?$/i
const MAX_CHARS = 200_000

/** Normaliza quebras de linha e caracteres que o clipboard costuma trocar. */
export function normalizarTexto(texto: string): string {
  return texto
    .replace(/\r\n?/g, '\n')
    .replace(/[“”„″]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/[   ]/g, ' ')
    .replace(/\t/g, ' ')
}

/** Divide por vírgulas que não estão dentro de parênteses. */
export function dividirNivelSuperior(texto: string): string[] {
  const partes: string[] = []
  let nivel = 0
  let atual = ''
  for (const ch of texto) {
    if (ch === '(') nivel++
    else if (ch === ')') nivel = Math.max(0, nivel - 1)
    if (ch === ',' && nivel === 0) {
      partes.push(atual)
      atual = ''
    } else {
      atual += ch
    }
  }
  partes.push(atual)
  return partes.map((p) => p.trim()).filter(Boolean)
}

export function lerEquipamento(linha: string): EquipmentItem[] {
  return dividirNivelSuperior(linha).map((raw) => {
    const m = ITEM_RE.exec(raw)
    return {
      count: m?.[1] ? Number(m[1]) : 1,
      name: (m?.[2] ?? raw).trim(),
      profile: m?.[3]?.trim() || null,
      raw,
    }
  })
}

export function lerRegras(texto: string): RuleItem[] {
  return dividirNivelSuperior(texto).map((raw) => {
    const m = /^(\d+)\s*x\s+(.+)$/i.exec(raw)
    return { count: m ? Number(m[1]) : null, name: (m ? m[2] : raw).trim(), raw }
  })
}

/**
 * Propõe variantes de modelo a partir das contagens (PRD-02 "Distribuição").
 * Itens com contagem múltipla do número de modelos são comuns a todos; os demais
 * são especiais. Se os especiais fecham o número de modelos, cada um vira uma
 * variante (proposta segura, ainda assim revisada). Caso contrário, é ambíguo.
 */
export function distribuir(
  modelos: number,
  equipamento: EquipmentItem[],
): { variants: ModelVariant[]; distribution: Distribution } {
  if (equipamento.length === 0) {
    return { variants: [{ equipment: [], modelsPerUnit: modelos }], distribution: 'ambiguous' }
  }
  const comum = new Set(equipamento.filter((e) => e.count >= modelos && e.count % modelos === 0))
  const especiais = equipamento.filter((e) => !comum.has(e))
  const nome = (e: EquipmentItem) => (comum.has(e) && e.count !== modelos ? `${e.count / modelos}x ${e.name}` : e.name)
  const comuns = equipamento.filter((e) => comum.has(e)).map(nome)
  if (especiais.length === 0) {
    return { variants: [{ equipment: comuns, modelsPerUnit: modelos }], distribution: 'uniform' }
  }
  const soma = especiais.reduce((s, e) => s + e.count, 0)
  const porEspecial = especiais.map((esp) => ({
    equipment: equipamento.filter((e) => comum.has(e) || e === esp).map(nome),
    modelsPerUnit: esp.count,
  }))
  if (soma === modelos) return { variants: porEspecial, distribution: 'partition' }
  if (soma < modelos) {
    return {
      variants: [...porEspecial, { equipment: comuns, modelsPerUnit: modelos - soma }],
      distribution: 'ambiguous',
    }
  }
  return {
    variants: [{ equipment: equipamento.map((e) => `${e.count}x ${e.name}`), modelsPerUnit: modelos }],
    distribution: 'ambiguous',
  }
}

export interface OpcoesParser {
  agora?: Date
}

export function parseShareText(textoBruto: string, opcoes: OpcoesParser = {}): NormalizedArmyList {
  const importedAt = (opcoes.agora ?? new Date()).toISOString()
  const issues: ImportIssue[] = []
  const unrecognized: { line: number; text: string }[] = []
  const units: UnitGroup[] = []
  let header: ArmyListHeader | null = null

  const texto = normalizarTexto(textoBruto.slice(0, MAX_CHARS))
  if (textoBruto.length > MAX_CHARS) {
    issues.push({ kind: 'unrecognized-line', message: `Texto cortado em ${MAX_CHARS} caracteres.` })
  }
  if (!texto.trim()) {
    issues.push({ kind: 'empty', message: 'Nenhum texto para importar.' })
  }

  let atual: UnitGroup | null = null
  let equipamentoLido = false
  texto.split('\n').forEach((original, i) => {
    const n = i + 1
    const linha = original.trim().replace(/\s+/g, ' ')
    if (!linha) {
      atual = null
      return
    }
    const h = HEADER_RE.exec(linha)
    if (h) {
      atual = null
      if (header) {
        unrecognized.push({ line: n, text: original })
        issues.push({
          kind: 'unrecognized-line',
          line: n,
          message: 'Segundo cabeçalho de exército: listas com mais de um exército ainda não são suportadas.',
        })
        return
      }
      header = {
        armyName: h[1].trim(),
        armyVersion: h[2]?.trim() ?? null,
        systemCode: h[3].toUpperCase(),
        points: Number(h[4]),
        declaredUnits: h[5] ? Number(h[5]) : null,
      }
      return
    }
    const u = UNIT_RE.exec(linha)
    if (u) {
      atual = {
        line: n,
        copies: u[1] ? Number(u[1]) : 1,
        name: u[2].trim(),
        modelsPerUnit: Number(u[3]),
        quality: Number(u[4]),
        defense: Number(u[5]),
        pointsPerUnit: Number(u[6]),
        rules: u[7] ? lerRegras(u[7]) : [],
        equipment: [],
        variants: [],
        distribution: 'ambiguous',
        needsReview: true,
      }
      units.push(atual)
      equipamentoLido = false
      return
    }
    if (atual && !equipamentoLido) {
      atual.equipment = lerEquipamento(linha)
      equipamentoLido = true
      return
    }
    unrecognized.push({ line: n, text: original })
    issues.push({ kind: 'unrecognized-line', line: n, message: `Linha não reconhecida: "${linha}"` })
  })

  for (const u of units) {
    const { variants, distribution } = distribuir(u.modelsPerUnit, u.equipment)
    u.variants = variants
    u.distribution = distribution
    u.needsReview = distribution !== 'uniform'
    if (u.equipment.length === 0) {
      issues.push({ kind: 'missing-equipment', line: u.line, message: `${u.name}: sem linha de equipamento.` })
    } else if (u.needsReview) {
      issues.push({
        kind: 'distribution-review',
        line: u.line,
        message:
          distribution === 'partition'
            ? `${u.name}: distribuição de armas proposta; confirme.`
            : `${u.name}: não dá para distribuir as armas só pelas contagens; revise.`,
      })
    }
  }

  const totals = {
    units: units.reduce((s, u) => s + u.copies, 0),
    models: units.reduce((s, u) => s + u.copies * u.modelsPerUnit, 0),
    points: units.reduce((s, u) => s + u.copies * u.pointsPerUnit, 0),
  }
  const cab = header as ArmyListHeader | null
  if (texto.trim() && !cab) {
    issues.push({ kind: 'missing-header', message: 'Cabeçalho "++ Exército (vX) [SISTEMA pts] ++" não encontrado.' })
  }
  if (cab?.points != null && cab.points !== totals.points) {
    issues.push({
      kind: 'points-mismatch',
      message: `Cabeçalho diz ${cab.points} pts, mas as unidades somam ${totals.points} pts.`,
    })
  }
  if (cab?.declaredUnits != null && cab.declaredUnits !== totals.units) {
    issues.push({
      kind: 'units-mismatch',
      message: `Cabeçalho diz ${cab.declaredUnits} unidades, mas foram lidas ${totals.units}.`,
    })
  }

  return {
    source: { kind: 'army-forge-share-as-text', rawText: textoBruto, importedAt },
    header: cab,
    units,
    totals,
    issues,
    unrecognized,
  }
}
