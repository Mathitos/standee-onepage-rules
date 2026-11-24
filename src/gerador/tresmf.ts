/**
 * Projeto 3MF no formato do Bambu Studio, com várias placas: port de prototipo/gerar.py
 * escrever_3mf(). Cada cópia é um objeto com arquivo 3D/Objects/object_k.model; a malha fica só
 * no arquivo da primeira cópia e as demais apontam para ela. Ids de malhas e de objetos
 * montados compartilham um espaço global (ids repetidos fazem o Bambu misturar malhas). Sem
 * `projeto` (project_settings.config) o Bambu diz que o 3MF é de versão antiga e carrega só a
 * geometria (D026). A placa i fica em (coluna, -linha) x mesa x 1,2 (PartPlate.cpp).
 */
import { strToU8, zipSync } from 'fflate'
import type { Malha } from './manifold'

export interface ParteMalha {
  malha: Malha
  cor: 0 | 1
  rotulo: string
}

export interface Objeto3mf {
  nome: string
  partes: ParteMalha[]
}

/** [nome da placa, [chave do objeto, x, y]] com x/y do canto da peça na placa (mm) */
export type Placa3mf = [string, [string, number, number][]]

export interface Opcoes3mf {
  /** ajustes de impressão por objeto, ex.: { wall_generator: 'arachne' } (D025) */
  ajustes?: Record<string, string> | null
  projeto?: Record<string, unknown> | null
  mesa: number
  /** posição da torre de purga em cada placa (null = a do perfil) */
  torres?: ([number, number] | null)[]
  /** liga ou desliga a torre de purga no projeto (enable_prime_tower); omitido = a do perfil */
  torrePurga?: boolean
  versaoBambu?: string
}

const NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
const NS_BBL = 'http://schemas.bambulab.com/package/2021'
const NS_P = 'http://schemas.microsoft.com/3dmanufacturing/production/2015/06'
const CABECALHO =
  `<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" xmlns="${NS}" ` +
  `xmlns:BambuStudio="${NS_BBL}" xmlns:p="${NS_P}" requiredextensions="p">\n` +
  '<metadata name="BambuStudio:3mfVersion">1</metadata>\n'
const REL_3DMODEL = 'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel'

const hex = (n: number, d: number) => n.toString(16).padStart(d, '0')
const UUID_OBJ = (k: number) => `${hex(k, 8)}-61cb-4c03-9d28-80fed5dfa1dc`
const UUID_OBJ_COPIA = (k: number) => `${hex(k, 8)}-71cb-4c03-9d28-80fed5dfa1dc`
const UUID_MALHA = (k: number, p: number) => `${hex(k, 4)}${hex(p, 4)}-81cb-4c03-9d28-80fed5dfa1dc`
const UUID_COMP = (k: number, p: number) => `${hex(k, 4)}${hex(p, 4)}-b206-40ff-9872-83e8017abed1`
const UUID_ITEM = (k: number) => `${hex(k, 8)}-b1ec-4553-aec9-835e5b724bb4`
const UUID_BUILD = '2c7c17d8-22b5-4d84-8835-1976022ea369'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Colunas da grade de placas do Bambu Studio (PartPlate.hpp, compute_colum_count). */
export function colunasDePlacas(n: number): number {
  const v = Math.sqrt(n)
  const r = Math.round(v)
  return v > r ? r + 1 : r
}

function malhaXml(k: number, p: number, mid: number, m: Malha, dx: number, dy: number, dz: number) {
  const v = m.vertices
  const t = m.triangulos
  const partes: string[] = [`<object id="${mid}" p:UUID="${UUID_MALHA(k, p)}" type="model"><mesh><vertices>`]
  for (let i = 0; i < v.length; i += 3) {
    partes.push(`<vertex x="${(v[i] - dx).toFixed(4)}" y="${(v[i + 1] - dy).toFixed(4)}" z="${(v[i + 2] - dz).toFixed(4)}"/>`)
  }
  partes.push('</vertices><triangles>')
  for (let i = 0; i < t.length; i += 3) partes.push(`<triangle v1="${t[i]}" v2="${t[i + 1]}" v3="${t[i + 2]}"/>`)
  partes.push('</triangles></mesh></object>\n')
  return { xml: partes.join(''), faces: t.length / 3 }
}

function caixa(partes: ParteMalha[]) {
  const lo = [Infinity, Infinity, Infinity]
  const hi = [-Infinity, -Infinity, -Infinity]
  for (const { malha } of partes) {
    const v = malha.vertices
    for (let i = 0; i < v.length; i += 3) {
      for (let j = 0; j < 3; j++) {
        if (v[i + j] < lo[j]) lo[j] = v[i + j]
        if (v[i + j] > hi[j]) hi[j] = v[i + j]
      }
    }
  }
  return { lo, hi }
}

export function escrever3mf(objetos: Record<string, Objeto3mf>, placas: Placa3mf[], op: Opcoes3mf): Uint8Array {
  const versao = op.versaoBambu ?? '02.07.01.57'
  const extraCfg = Object.entries(op.ajustes ?? {}).map(([k, v]) => `<metadata key="${k}" value="${esc(v)}"/>`).join('')
  // convenção do Bambu: malha centrada na origem; a posição vai no item
  const centros: Record<string, { c: number[]; meio: number[] }> = {}
  for (const [chave, obj] of Object.entries(objetos)) {
    const { lo, hi } = caixa(obj.partes)
    const c = lo.map((l, i) => (l + hi[i]) / 2)
    centros[chave] = { c, meio: c.map((v, i) => v - lo[i]) }
  }
  const arquivos: Record<string, string> = {}
  const rels: string[] = []
  const dono: Record<string, { k: number; mids: number[]; faces: number[] }> = {}
  const contagem: Record<string, number> = {}
  const recursos: string[] = []
  const cfg: string[] = []
  const build: string[] = []
  const cortes: string[] = []
  let proximoId = 1
  const passo = op.mesa * 1.2
  const cols = colunasDePlacas(placas.length)
  const itens: [number, string, number, number][] = []
  const instancias: string[][] = placas.map(() => [])
  placas.forEach(([, lista], ip) => {
    const ox = (ip % cols) * passo
    const oy = -Math.floor(ip / cols) * passo
    for (const [chave, x, y] of lista) itens.push([ip, chave, x + ox, y + oy])
  })
  itens.forEach(([ip, chave, x, y], idx) => {
    const k = idx + 1
    const obj = objetos[chave]
    const { c, meio } = centros[chave]
    const arq = `3D/Objects/object_${k}.model`
    rels.push(`<Relationship Target="/${arq}" Id="rel-${k}" Type="${REL_3DMODEL}"/>`)
    let uuidObj: string
    if (!(chave in dono)) {
      const mids = obj.partes.map((_, i) => proximoId + i)
      proximoId += obj.partes.length
      const blocos = obj.partes.map((p, i) => malhaXml(k, i, mids[i], p.malha, c[0], c[1], c[2]))
      dono[chave] = { k, mids, faces: blocos.map((b) => b.faces) }
      arquivos[arq] = `${CABECALHO}<resources>\n${blocos.map((b) => b.xml).join('')}</resources>\n<build/>\n</model>\n`
      uuidObj = UUID_OBJ(k)
      contagem[chave] = 1
    } else {
      arquivos[arq] = `${CABECALHO}<resources>\n</resources>\n<build/>\n</model>\n`
      uuidObj = UUID_OBJ_COPIA(k)
      contagem[chave] += 1
    }
    const oid = proximoId++
    const { k: kDono, mids, faces } = dono[chave]
    const comps = mids
      .map((mid, p) => `<component p:path="/3D/Objects/object_${kDono}.model" objectid="${mid}" ` +
        `p:UUID="${UUID_COMP(k, p)}" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>`)
      .join('')
    recursos.push(`<object id="${oid}" p:UUID="${uuidObj}" type="model"><components>${comps}</components></object>\n`)
    const partesCfg = mids
      .map((mid, i) =>
        `<part id="${mid}" subtype="normal_part"><metadata key="name" value="${esc(obj.partes[i].rotulo)}"/>` +
        '<metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>' +
        `<metadata key="extruder" value="${obj.partes[i].cor + 1}"/>` +
        `<mesh_stat face_count="${faces[i]}" edges_fixed="0" degenerate_facets="0" facets_removed="0" ` +
        'facets_reversed="0" backwards_edges="0"/></part>')
      .join('')
    const totalFaces = faces.reduce((s, f) => s + f, 0)
    cfg.push(`<object id="${oid}"><metadata key="name" value="${esc(obj.nome)} #${contagem[chave]}"/>` +
      `<metadata key="extruder" value="1"/>${extraCfg}<metadata face_count="${totalFaces}"/>${partesCfg}</object>\n`)
    build.push(`<item objectid="${oid}" p:UUID="${UUID_ITEM(oid)}" ` +
      `transform="1 0 0 0 1 0 0 0 1 ${(x + meio[0]).toFixed(3)} ${(y + meio[1]).toFixed(3)} ${meio[2].toFixed(3)}" printable="1"/>\n`)
    instancias[ip].push('<model_instance>' + `<metadata key="object_id" value="${oid}"/>` +
      '<metadata key="instance_id" value="0"/>' + `<metadata key="identify_id" value="${100 + k}"/></model_instance>`)
    cortes.push(`<object id="${oid}"><cut_id id="0" check_sum="1" connectors_cnt="0"/></object>`)
  })
  const principal = `${CABECALHO}<metadata name="Application">BambuStudio-${versao}</metadata>\n` +
    `<resources>\n${recursos.join('')}</resources>\n` +
    `<build p:UUID="${UUID_BUILD}">\n${build.join('')}</build>\n</model>\n`
  const xmlPlacas = placas
    .map(([nomeP], ip) =>
      `<plate><metadata key="plater_id" value="${ip + 1}"/><metadata key="plater_name" value="${esc(nomeP)}"/>` +
      '<metadata key="locked" value="false"/><metadata key="filament_map_mode" value="Auto For Flush"/>' +
      `<metadata key="gcode_file" value=""/>${instancias[ip].join('')}</plate>\n`)
    .join('')
  const config = `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n${cfg.join('')}${xmlPlacas}<assemble>\n</assemble>\n</config>\n`
  arquivos['Metadata/cut_information.xml'] = `<?xml version="1.0" encoding="utf-8"?>\n<objects>${cortes.join('')}</objects>\n`
  arquivos['Metadata/filament_sequence.json'] = JSON.stringify(
    Object.fromEntries(placas.map((_, i) => [`plate_${i + 1}`, { nozzle_sequence: [], optimal_assignment: [], sequence: [] }])))
  if (op.projeto) {
    const projeto: Record<string, unknown> = { ...op.projeto }
    if (op.torrePurga != null) {
      projeto.enable_prime_tower = op.torrePurga ? '1' : '0'
      // Ao abrir o projeto, o Bambu Studio volta ao valor do perfil do sistema toda chave do
      // processo que não estiver em different_settings_to_system (a primeira posição é a do
      // processo; PresetCollection::load_external_preset). Sem isso, a torre desligada voltava
      // ligada (relato do usuário em 23/11). Os projetos que ele mesmo salva com a torre
      // desligada trazem "enable_prime_tower" nessa lista.
      const dif = projeto.different_settings_to_system
      if (Array.isArray(dif) && dif.length) {
        const chaves = new Set(String(dif[0]).split(';').filter(Boolean))
        chaves.add('enable_prime_tower')
        projeto.different_settings_to_system = [[...chaves].sort().join(';'), ...dif.slice(1)]
      }
    }
    ;(['wipe_tower_x', 'wipe_tower_y'] as const).forEach((k, i) => {   // um valor por placa (PartPlate.cpp)
      const atual = projeto[k]
      if (Array.isArray(atual) && atual.length) {
        const padrao = atual[0]
        projeto[k] = placas.map((_, n) => {
          const t = op.torres?.[n]
          return t ? String(t[i]) : padrao
        })
      }
    })
    arquivos['Metadata/project_settings.config'] = JSON.stringify(projeto, null, 4)
  }
  const zip: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="gcode" ContentType="text/x.gcode"/></Types>'),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="${REL_3DMODEL}"/></Relationships>`),
    '3D/3dmodel.model': strToU8(principal),
    '3D/_rels/3dmodel.model.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels.join('') + '</Relationships>'),
  }
  for (const [nome, xml] of Object.entries(arquivos)) zip[nome] = strToU8(xml)
  zip['Metadata/model_settings.config'] = strToU8(config)
  zip['Metadata/slice_info.config'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><config><header><header_item key="X-BBL-Client-Type" value="slicer"/><header_item key="X-BBL-Client-Version" value="${versao}"/></header></config>`)
  return zipSync(zip, { level: 6 })
}
