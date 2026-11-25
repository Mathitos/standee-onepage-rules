import { useEffect, useMemo, useRef, useState } from 'react'
import type { NormalizedArmyList } from '../armyforge/types'
import { manterEscolhas, posesDa, resolvida, sugerir, type PlanoUnidade } from '../catalogo/associar'
import type { ArteEnviada } from '../catalogo/arteEnviada'
import type { BasesFaccao } from '../catalogo/basesArmyBook'
import {
  carregarArtes, carregarBases, carregarIndice, carregarManifesto, estiloDisponivel, faccaoDaLista, normalizar, urlArte, urlRotulo,
} from '../catalogo/carregar'
import type { ArteCatalogo, ArtesFaccao, Estilo, FaccaoIndice, IndiceCatalogo, ManifestoFaccao } from '../catalogo/tipos'
import { nomeBase, type BaseSpec } from '../gerador/base'
import { EnvioArte } from './EnvioArte'
import { EtapaGerar } from './EtapaGerar'

/** Arte enviada pelo usuário, com o endereço local da prévia (o SVG da frente). */
export type Enviada = ArteEnviada & { url: string }

/** Tamanhos comuns de base. A escolha é do usuário quando o catálogo não traz a base da unidade (D015). */
const BASES_COMUNS: BaseSpec[] = [
  ...[20, 25, 28, 32, 40, 50, 60, 80, 100, 130].map((d) => ({ forma: 'redonda' as const, mm: [d] })),
  ...[[60, 35], [75, 42], [90, 52], [105, 70], [120, 92], [170, 105]].map((mm) => ({ forma: 'oval' as const, mm })),
]

function rotuloBase(b: BaseSpec) {
  return b.forma === 'redonda' ? `redonda ${b.mm[0]} mm` : `oval ${b.mm[0]}×${b.mm[1]} mm`
}

export function EtapaArtes({ lista }: { lista: NormalizedArmyList }) {
  const [indice, setIndice] = useState<IndiceCatalogo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [faccao, setFaccao] = useState<FaccaoIndice | null>(null)
  const [artes, setArtes] = useState<ArtesFaccao | null>(null)
  const [manifesto, setManifesto] = useState<ManifestoFaccao | null>(null)
  const [bases, setBases] = useState<BasesFaccao | null>(null)
  const [plano, setPlano] = useState<PlanoUnidade[]>([])
  const [estilo, setEstilo] = useState<Estilo>('fino')
  const [galeria, setGaleria] = useState<{ linha: number; variante: number } | null>(null)
  const [enviadas, setEnviadas] = useState<Enviada[]>([])
  const contadorEnviadas = useRef(0)

  useEffect(() => {
    carregarIndice().then(setIndice, (e) => setErro(`Catálogo indisponível: ${e.message}`))
  }, [])

  // facção pelo nome do exército da lista
  useEffect(() => {
    if (indice) setFaccao(faccaoDaLista(indice, lista.header?.armyName, lista.header?.systemCode))
  }, [indice, lista.header?.armyName, lista.header?.systemCode])

  useEffect(() => {
    setArtes(null)
    setManifesto(null)
    setBases(null)
    if (!faccao) return
    let vivo = true
    Promise.all([carregarArtes(faccao), carregarManifesto(faccao), carregarBases(faccao)]).then(
      ([a, m, b]) => {
        if (!vivo) return
        setArtes(a)
        setManifesto(m)
        setBases(b)
      },
      (e) => setErro(`Falha ao carregar ${faccao.faccao}: ${e.message}`),
    )
    return () => {
      vivo = false
    }
  }, [faccao])

  // refaz as sugestões ao atualizar a lista ou trocar de facção. Na mesma facção, mantém as
  // escolhas feitas à mão nas unidades que continuam na lista; em outra, elas não valem
  const faccaoDoPlano = useRef<string | null>(null)
  useEffect(() => {
    const novo = sugerir(lista, manifesto, bases)
    const caminho = faccao?.caminho ?? null
    const mesma = faccaoDoPlano.current === caminho
    faccaoDoPlano.current = caminho
    setPlano((anterior) => (mesma ? manterEscolhas(novo, anterior) : novo))
  }, [lista, manifesto, bases, faccao])

  const porId = useMemo(() => new Map((artes?.artes ?? []).map((a) => [a.id, a])), [artes])
  const enviadaPorId = useMemo(() => new Map(enviadas.map((a) => [a.id, a])), [enviadas])
  // altura padrão da arte enviada: a mediana das figuras da facção, no estilo escolhido
  const alturaPadraoMm = useMemo(() => {
    const alturas = (artes?.artes ?? [])
      .map((a) => { const e = estiloDisponivel(a, estilo); return e ? a.estilos[e]?.tamanhoMm[1] : undefined })
      .filter((v): v is number => typeof v === 'number' && v > 0)
      .sort((x, y) => x - y)
    return alturas.length ? Math.round(alturas[Math.floor(alturas.length / 2)] * 2) / 2 : 35
  }, [artes, estilo])
  const resolvidas = plano.filter(resolvida).length

  const atualizar = (linha: number, f: (p: PlanoUnidade) => PlanoUnidade) =>
    setPlano((ps) => ps.map((p) => (p.linha === linha ? f(p) : p)))

  return (
    <section className="painel etapa-artes" aria-labelledby="titulo-artes">
      <h2 id="titulo-artes">2. Artes e bases</h2>
      {erro && <p className="erro-carga">{erro}</p>}
      {indice && (
        <div className="linha-controles">
          <label>
            Facção do catálogo{' '}
            <select
              value={faccao?.caminho ?? ''}
              onChange={(e) => setFaccao(indice.faccoes.find((f) => f.caminho === e.target.value) ?? null)}
            >
              <option value="">— escolha —</option>
              {indice.faccoes.map((f) => (
                <option key={f.caminho} value={f.caminho}>
                  {f.faccao} ({f.sistema === 'aof' ? 'fantasia' : 'sci-fi'}, {f.artes} artes)
                </option>
              ))}
            </select>
          </label>
          <label>
            Estilo da arte{' '}
            <select value={estilo} onChange={(e) => setEstilo(e.target.value as Estilo)}>
              <option value="fino">contorno fino</option>
              <option value="borda">borda grossa</option>
            </select>
          </label>
          <span className="contagem">
            {resolvidas}/{plano.length} unidades prontas
          </span>
        </div>
      )}
      {faccao && !artes && !erro && <p className="vazio">Carregando artes de {faccao.faccao}…</p>}
      {indice && !faccao && (
        <p className="vazio">
          Nenhuma facção do catálogo com o nome “{lista.header?.armyName ?? '?'}”. Escolha uma acima para usar as artes dela.
        </p>
      )}
      {faccao && artes && (
        <>
          {!manifesto && (
            <p className="ajuda">
              As artes desta facção ainda não foram associadas às unidades do army book: escolha a arte de cada grupo de
              modelos pela figura e a base de cada unidade.
            </p>
          )}
          <div className="tabela-rolagem">
            <table className="tabela-artes">
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Modelos e arte</th>
                  <th>Base</th>
                </tr>
              </thead>
              <tbody>
                {plano.map((p) => (
                  <tr key={p.linha} className={resolvida(p) ? '' : 'pendente'}>
                    <td>
                      <b>{p.unidade.name}</b>
                      <div className="detalhe">
                        {p.unidade.copies > 1 ? `${p.unidade.copies} unidades × ${p.unidade.modelsPerUnit}` : `${p.unidade.modelsPerUnit} modelos`}
                      </div>
                    </td>
                    <td>
                      <ul className="variantes-arte">
                        {p.unidade.variants.map((v, i) => {
                          const esc = p.variantes[i]
                          const a = esc.arte ? porId.get(esc.arte) : undefined
                          const enviada = esc.arte ? enviadaPorId.get(esc.arte) : undefined
                          return (
                            <li key={i}>
                              <span className="qtd">{v.modelsPerUnit * p.unidade.copies}×</span>{' '}
                              <span className="equip">{v.equipment.join(' + ') || 'sem arma listada'}</span>
                              <button type="button" className="escolher" onClick={() => setGaleria({ linha: p.linha, variante: i })}>
                                {a ? (
                                  <Miniatura faccao={faccao} arte={a} estilo={estilo} pequena />
                                ) : enviada ? (
                                  <MiniaturaEnviada arte={enviada} pequena />
                                ) : (
                                  'Escolher arte'
                                )}
                              </button>
                              {a && esc.origem === 'manifesto' && (
                                <span className={`selo ${esc.aliasProposto ? 'revisar' : 'ok'}`}>
                                  {esc.aliasProposto ? 'sugerida (alias)' : 'do catálogo'}
                                </span>
                              )}
                              {esc.arte && (() => {
                                const poses = posesDa(esc.arte, manifesto)
                                return poses.length > 1 && v.modelsPerUnit * p.unidade.copies > 1 ? (
                                  <div className="detalhe" title="Os modelos da unidade alternam entre as poses do catálogo; cada metade leva o número da pose em fenda na face de colar">
                                    alterna {poses.length} poses: {poses.map((ps) => porId.get(ps.arte)?.rotulo ?? ps.arte).join(', ')}
                                  </div>
                                ) : null
                              })()}
                            </li>
                          )
                        })}
                      </ul>
                    </td>
                    <td>
                      <select
                        value={p.base ? nomeBase(p.base) : ''}
                        onChange={(e) => {
                          const b = BASES_COMUNS.find((x) => nomeBase(x) === e.target.value) ?? null
                          atualizar(p.linha, (q) => ({ ...q, base: b, baseOrigem: b ? 'usuario' : null, baseUpgrade: null, baseAmbigua: false }))
                        }}
                      >
                        <option value="">— escolha —</option>
                        {p.base && !BASES_COMUNS.some((x) => nomeBase(x) === nomeBase(p.base!)) && (
                          <option value={nomeBase(p.base)}>{rotuloBase(p.base)}</option>
                        )}
                        {BASES_COMUNS.map((b) => (
                          <option key={nomeBase(b)} value={nomeBase(b)}>
                            {rotuloBase(b)}
                          </option>
                        ))}
                      </select>
                      {(p.baseOrigem === 'manifesto' || p.baseOrigem === 'armybook') && (
                        <div className="detalhe">do army book{p.baseUpgrade ? `, com ${p.baseUpgrade}` : ''}</div>
                      )}
                      {p.baseAmbigua && (
                        <div className="detalhe atencao">a lista pode ter mais de uma montaria: confira a base</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <EtapaGerar lista={lista} plano={plano} faccao={faccao} artes={artes} manifesto={manifesto} estilo={estilo} enviadas={enviadas} />
        </>
      )}
      {galeria && faccao && artes && (
        <Galeria
          faccao={faccao}
          artes={artes.artes}
          estilo={estilo}
          unitKey={plano.find((p) => p.linha === galeria.linha)?.unitKey ?? null}
          titulo={(() => {
            const p = plano.find((q) => q.linha === galeria.linha)!
            const v = p.unidade.variants[galeria.variante]
            return `${p.unidade.name} — ${v.equipment.join(' + ') || 'sem arma listada'}`
          })()}
          onEscolher={(id) => {
            atualizar(galeria.linha, (p) => ({
              ...p,
              variantes: p.variantes.map((v, i) => (i === galeria.variante ? { arte: id, origem: 'usuario' } : v)),
            }))
            setGaleria(null)
          }}
          enviadas={enviadas}
          alturaPadraoMm={alturaPadraoMm}
          proximoId={() => `enviada-${++contadorEnviadas.current}`}
          onEnviar={(a) => {
            const url = URL.createObjectURL(new Blob([a.frente], { type: 'image/svg+xml' }))
            setEnviadas((xs) => [...xs, { ...a, url }])
            atualizar(galeria.linha, (p) => ({
              ...p,
              variantes: p.variantes.map((v, i) => (i === galeria.variante ? { arte: a.id, origem: 'usuario' } : v)),
            }))
            setGaleria(null)
          }}
          onFechar={() => setGaleria(null)}
        />
      )}
    </section>
  )
}

function Miniatura({ faccao, arte, estilo, pequena }: { faccao: FaccaoIndice; arte: ArteCatalogo; estilo: Estilo; pequena?: boolean }) {
  const e = estiloDisponivel(arte, estilo)
  const rot = urlRotulo(faccao, arte)
  return (
    <span className={`miniatura${pequena ? ' pequena' : ''}`}>
      {e && <img src={urlArte(faccao, arte.id, e, 'frente')} alt="" loading="lazy" />}
      <span className="legenda">
        {arte.rotulo ?? (rot ? <img className="rotulo-img" src={rot} alt={`rótulo impresso de ${arte.id}`} /> : arte.id)}
        {e && e !== estilo && <span className="aviso-estilo">só {e === 'fino' ? 'contorno fino' : 'borda grossa'}</span>}
      </span>
    </span>
  )
}

/** Prévia da arte enviada: o SVG gerado da frente (silhueta branca, traço preto). */
function MiniaturaEnviada({ arte, pequena }: { arte: Enviada; pequena?: boolean }) {
  return (
    <span className={`miniatura${pequena ? ' pequena' : ''}`}>
      <img src={arte.url} alt="" />
      <span className="legenda">
        {arte.rotulo}
        <span className="aviso-estilo">enviada{arte.versoProprio ? '' : ', verso espelhado'}</span>
      </span>
    </span>
  )
}

function Galeria(props: {
  faccao: FaccaoIndice
  artes: ArteCatalogo[]
  estilo: Estilo
  unitKey: string | null
  titulo: string
  onEscolher: (id: string) => void
  onFechar: () => void
  enviadas: Enviada[]
  alturaPadraoMm: number
  proximoId: () => string
  onEnviar: (a: ArteEnviada) => void
}) {
  const [busca, setBusca] = useState('')
  const [soUnidade, setSoUnidade] = useState(!!props.unitKey)
  const lista = props.artes.filter((a) => {
    if (soUnidade && props.unitKey && a.unitKey !== props.unitKey) return false
    if (!busca.trim()) return true
    const alvo = normalizar(busca)
    return normalizar(`${a.rotulo ?? ''} ${a.id} ${a.equipmentTags.join(' ')}`).includes(alvo)
  })
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && props.onFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [props])
  return (
    <div className="galeria-fundo" role="dialog" aria-modal="true" aria-label={`Escolher arte: ${props.titulo}`} onClick={props.onFechar}>
      <div className="galeria" onClick={(e) => e.stopPropagation()}>
        <div className="galeria-topo">
          <div>
            <h3>Escolher arte</h3>
            <p className="detalhe">{props.titulo}</p>
          </div>
          <button type="button" className="secundario" onClick={props.onFechar}>
            Fechar
          </button>
        </div>
        <div className="linha-controles">
          <input type="search" placeholder="Buscar pelo rótulo ou id" value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus />
          {props.unitKey && (
            <label>
              <input type="checkbox" checked={soUnidade} onChange={(e) => setSoUnidade(e.target.checked)} /> só desta unidade
            </label>
          )}
          <span className="contagem">{lista.length} artes</span>
        </div>
        <details className="envio-arte">
          <summary>Nenhuma serve? Enviar uma arte própria</summary>
          <EnvioArte alturaPadraoMm={props.alturaPadraoMm} proximoId={props.proximoId} onEnviar={props.onEnviar} />
        </details>
        <div className="grade-artes">
          {props.enviadas.map((a) => (
            <button key={a.id} type="button" className="cartao-arte" onClick={() => props.onEscolher(a.id)}>
              <MiniaturaEnviada arte={a} />
              <span className="id-arte">{a.tamanhoMm[1]} mm de altura</span>
            </button>
          ))}
          {lista.map((a) => (
            <button key={a.id} type="button" className="cartao-arte" onClick={() => props.onEscolher(a.id)}>
              <Miniatura faccao={props.faccao} arte={a} estilo={props.estilo} />
              <span className="id-arte">{a.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
