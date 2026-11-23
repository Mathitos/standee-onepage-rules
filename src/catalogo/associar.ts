/**
 * Associação lista × catálogo (PRD-02). Com manifesto revisado, a unidade é achada pelo nome (os
 * nomes dos army books de todos os sistemas: "OGRE Robot" no Firefight, "OGRE Robots" no GF) e a
 * arte pela arma: vence a arte da unidade com mais equipmentTags, todas presentes no equipamento
 * ou nas regras do modelo (montarias e itens aparecem nas regras); "A|B" aceita qualquer uma. Se nenhuma servir, vale a arte
 * genérica da unidade: a que o PDF rotulou sem arma (equipmentTags vazio). A base vem do army
 * book (D015): do manifesto, ou de bases.json para as unidades que não têm arte no PDF e por isso
 * não estão no manifesto, mesmo com a arte escolhida à mão. Sem correspondência, a escolha fica
 * com o usuário, vendo as artes (D013): arte de outra arma não entra sozinha.
 */
import type { NormalizedArmyList, UnitGroup } from '../armyforge/types'
import type { BaseSpec } from '../gerador/base'
import type { ModeloPedido } from '../gerador/gerar'
import type { ModeloPapel } from '../papel/folhas'
import type { BasesFaccao } from './basesArmyBook'
import { normalizar } from './carregar'
import type { BaseManifesto, ManifestoFaccao } from './tipos'

/** manifesto: sugestão do catálogo; armybook: base de bases.json; usuario: escolha na tela */
export type Origem = 'manifesto' | 'armybook' | 'usuario'

export interface EscolhaVariante {
  arte: string | null
  origem: Origem | null
  /** alias ainda não aprovado pelo usuário (manifesto agent-proposed) */
  aliasProposto?: boolean
}

export interface PlanoUnidade {
  /** linha do cabeçalho da unidade no texto: chave estável enquanto o texto não muda */
  linha: number
  unidade: UnitGroup
  unitKey: string | null
  base: BaseSpec | null
  baseOrigem: Origem | null
  variantes: EscolhaVariante[]
}

export function baseDoManifesto(b: BaseManifesto | undefined): BaseSpec | null {
  if (!b?.dimensionsMm?.length) return null
  if (b.shape === 'round') return { forma: 'redonda', mm: [b.dimensionsMm[0]] }
  if (b.shape === 'oval' && b.dimensionsMm.length >= 2) return { forma: 'oval', mm: [b.dimensionsMm[0], b.dimensionsMm[1]] }
  return null
}

export function sugerir(lista: NormalizedArmyList, manifesto: ManifestoFaccao | null, bases: BasesFaccao | null = null): PlanoUnidade[] {
  return lista.units.map((u) => {
    const mesmoNome = (n: string) => normalizar(n) === normalizar(u.name)
    const un = manifesto?.units.find((x) => x.names.some(mesmoNome))
    const doManifesto = baseDoManifesto(un?.base)
    const base = doManifesto ?? baseDoManifesto(bases?.unidades.find((x) => x.nomes.some(mesmoNome))?.base)
    const baseOrigem: Origem | null = doManifesto ? 'manifesto' : base ? 'armybook' : null
    const variantes = u.variants.map((v): EscolhaVariante => {
      if (!un || !manifesto) return { arte: null, origem: null }
      const equip = new Set([
        ...v.equipment.map((e) => normalizar(e.replace(/^\d+x\s+/, ''))),
        ...u.rules.map((r) => normalizar(r.name)),
      ])
      const daUnidade = manifesto.arts.filter((a) => a.unitKey === un.unitKey && !a.cosmetic && a.mappingStatus !== 'unmapped')
      let melhor: ManifestoFaccao['arts'][number] | null = null
      let pontos = 0
      for (const a of daUnidade) {
        if (!a.equipmentTags.length) continue
        // "Firepowder Pistol|Matchlock Pistol": qualquer uma das alternativas serve
        const tags = a.equipmentTags.map((t) => t.split('|').map(normalizar))
        if (!tags.every((alt) => alt.some((t) => equip.has(t)))) continue
        if (tags.length > pontos) {
          melhor = a
          pontos = tags.length
        }
      }
      melhor ??= daUnidade.find((a) => !a.equipmentTags.length) ?? null
      return melhor
        ? { arte: melhor.artId, origem: 'manifesto', aliasProposto: melhor.mappingStatus === 'alias-proposed' }
        : { arte: null, origem: null }
    })
    return { linha: u.line, unidade: u, unitKey: un?.unitKey ?? null, base, baseOrigem, variantes }
  })
}

/**
 * Ao atualizar a lista na mesma facção, mantém o que o usuário escolheu à mão (arte de cada
 * variante e base) nas unidades que continuam nela: mesmo nome e mesmas armas na variante.
 * Unidades de mesmo nome casam na ordem da lista. O resto vem da sugestão nova.
 */
export function manterEscolhas(novo: PlanoUnidade[], anterior: PlanoUnidade[]): PlanoUnidade[] {
  const porNome = new Map<string, PlanoUnidade[]>()
  for (const q of anterior) {
    const k = normalizar(q.unidade.name)
    porNome.set(k, [...(porNome.get(k) ?? []), q])
  }
  const armas = (u: UnitGroup, i: number) => u.variants[i]?.equipment.join('|')
  return novo.map((p) => {
    const q = porNome.get(normalizar(p.unidade.name))?.shift()
    if (!q) return p
    const baseManual = q.baseOrigem === 'usuario'
    return {
      ...p,
      base: baseManual ? q.base : p.base,
      baseOrigem: baseManual ? q.baseOrigem : p.baseOrigem,
      variantes: p.variantes.map((v, i) =>
        q.variantes[i]?.origem === 'usuario' && armas(q.unidade, i) === armas(p.unidade, i) ? q.variantes[i] : v),
    }
  })
}

export function resolvida(p: PlanoUnidade): boolean {
  return !!p.base && p.variantes.every((v) => !!v.arte)
}

/**
 * Poses da arte (pedido do usuário em 23/11): as figuras diferentes que o catálogo tem para a
 * mesma unidade, as mesmas armas e o mesmo cosmético, como "Assault Grunt V1" e "V2", na ordem do
 * manifesto. Não contam como pose as cópias da mesma figura: a marcada com `copiaDe` na revisão
 * (cópia que o recorte não juntou) e a arte de um estilo só com o rótulo de outra do grupo (a
 * mesma figura impressa no outro estilo, como "hunter-sword-a043", só borda grossa). Arte sem
 * correspondência (unmapped), enviada ou fora do manifesto tem uma pose só: ela mesma.
 * Devolve as poses começando pela arte escolhida e o número de cada uma (1, 2...), que é a
 * ordem no catálogo e não muda com a escolha.
 */
export function posesDa(arte: string, manifesto: ManifestoFaccao | null): { arte: string; numero: number }[] {
  const so = [{ arte, numero: 1 }]
  const a = manifesto?.arts.find((x) => x.artId === arte)
  if (!manifesto || !a || !a.unitKey || a.mappingStatus === 'unmapped') return so
  const armas = (x: ManifestoArte) => x.equipmentTags.map(normalizar).sort().join('\u0000')
  const grupo = manifesto.arts.filter((x) =>
    x.unitKey === a.unitKey && x.cosmetic === a.cosmetic && x.mappingStatus !== 'unmapped' && armas(x) === armas(a))
  const figuras: { arte: string; rotulo: string; estilos: Set<string>; membros: string[] }[] = []
  for (const x of grupo) {
    if (x.copiaDe) {
      figuras.find((f) => f.membros.includes(x.copiaDe!))?.membros.push(x.artId)
      continue
    }
    const est = new Set(Object.keys(x.styles ?? {}))
    const mesma = est.size === 1 && figuras.find((f) => f.rotulo === x.pdfLabel && (f.estilos.size === 2 || ![...est].some((e) => f.estilos.has(e))))
    if (mesma) {
      est.forEach((e) => mesma.estilos.add(e))
      mesma.membros.push(x.artId)
    } else {
      figuras.push({ arte: x.artId, rotulo: x.pdfLabel, estilos: est, membros: [x.artId] })
    }
  }
  const i = figuras.findIndex((f) => f.membros.includes(arte))
  if (figuras.length < 2 || i < 0) return so
  const poses = figuras.map((f, k) => ({ arte: k === i ? arte : f.arte, numero: k + 1 }))
  return [...poses.slice(i), ...poses.slice(0, i)]
}

type ManifestoArte = ManifestoFaccao['arts'][number]

/**
 * Modelos para o gerador. Numeração na ordem da lista, com "2x" como duas unidades (D035):
 * 2x Veterans viram 3 e 4. Unidades não resolvidas ficam de fora (e numeradas mesmo assim, para
 * os números baterem com a lista). Com o manifesto, os modelos de cada variante alternam entre as
 * poses da arte (posesDa): 5 Assault Grunts saem V1, V2, V1, V2, V1, e cada metade leva o número
 * da pose.
 */
export function modelosDoPlano(plano: PlanoUnidade[], manifesto: ManifestoFaccao | null = null): { modelos: ModeloPedido[]; omitidas: string[] } {
  return percorrer(plano, resolvida, manifesto, (p, numero, qtd, arte, pose) =>
    ({ unidade: p.unidade.name, numero, qtd, arte, base: p.base!, ...(pose ? { pose } : {}) }))
}

/**
 * Modelos para as folhas de papel (D044): a arte é obrigatória; a base, não (sem ela, as abas
 * saem retangulares, como no PDF da OPR). Mesma numeração e mesmas poses do 3MF.
 */
export function modelosParaPapel(plano: PlanoUnidade[], manifesto: ManifestoFaccao | null = null): { modelos: ModeloPapel[]; omitidas: string[] } {
  return percorrer(plano, (p) => p.variantes.every((v) => !!v.arte), manifesto, (p, numero, qtd, arte) => ({ unidade: p.unidade.name, numero, qtd, arte, base: p.base }))
}

function percorrer<T>(
  plano: PlanoUnidade[], ok: (p: PlanoUnidade) => boolean, manifesto: ManifestoFaccao | null,
  fazer: (p: PlanoUnidade, numero: number, qtd: number, arte: string, pose: number | null) => T,
): { modelos: T[]; omitidas: string[] } {
  const modelos: T[] = []
  const omitidas: string[] = []
  let numero = 1
  for (const p of plano) {
    const pronta = ok(p)
    if (!pronta) omitidas.push(p.unidade.name)
    for (let c = 0; c < p.unidade.copies; c++, numero++) {
      if (!pronta) continue
      p.unidade.variants.forEach((v, i) => {
        if (v.modelsPerUnit <= 0) return
        const poses = posesDa(p.variantes[i].arte!, manifesto)
        if (poses.length < 2) {
          modelos.push(fazer(p, numero, v.modelsPerUnit, p.variantes[i].arte!, null))
          return
        }
        // o modelo j fica com a pose j mod k, contando também pelas cópias ("2x"): dois heróis de
        // um modelo saem um com cada pose
        const qtd = poses.map(() => 0)
        for (let j = 0; j < v.modelsPerUnit; j++) qtd[(c * v.modelsPerUnit + j) % poses.length]++
        poses.forEach((ps, t) => {
          if (qtd[t] > 0) modelos.push(fazer(p, numero, qtd[t], ps.arte, ps.numero))
        })
      })
    }
  }
  return { modelos, omitidas }
}
