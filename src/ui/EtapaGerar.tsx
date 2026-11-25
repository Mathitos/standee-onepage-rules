import fonteUrl from '@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff?url'
import { useRef, useState } from 'react'
import type { NormalizedArmyList } from '../armyforge/types'
import { modelosDoPlano, modelosParaPapel, type PlanoUnidade } from '../catalogo/associar'
import { estiloDisponivel, texto, urlArte } from '../catalogo/carregar'
import type { ArtesFaccao, Estilo, FaccaoIndice, ManifestoFaccao } from '../catalogo/tipos'
import { gerarNoWorker, type Geracao } from '../gerador/cliente'
import type { ArtePedido, Resultado } from '../gerador/gerar'
import type { ResultadoPapel } from '../papel/folhas'
import type { Enviada } from './EtapaArtes'
import { MENSAGEM_ATUALIZADO, siteAtualizado } from './versao'

type Estado =
  | { fase: 'parado' }
  | { fase: 'preparando' }
  | { fase: 'gerando'; feito: number; total: number; etapa: string }
  | { fase: 'pronto'; resultado: Resultado; url: string; nome: string }
  | { fase: 'erro'; mensagem: string; atualizado: boolean }

type EstadoPapel =
  | { fase: 'parado' }
  | { fase: 'gerando' }
  | { fase: 'pronto'; resultado: ResultadoPapel; url: string; nome: string }
  | { fase: 'erro'; mensagem: string; atualizado: boolean }

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Mensagem da falha e, se o site mudou com a página aberta, verifica isso para pedir que recarregue. */
async function falha(e: unknown): Promise<{ fase: 'erro'; mensagem: string; atualizado: boolean }> {
  const mensagem = e instanceof Error ? e.message : String(e)
  return { fase: 'erro', mensagem, atualizado: mensagem !== 'cancelado' && (await siteAtualizado()) }
}

function Falha(props: { mensagem: string; atualizado: boolean }) {
  if (!props.atualizado) return <p className="erro-carga">Falhou: {props.mensagem}</p>
  return (
    <div className="erro-carga">
      <p>{MENSAGEM_ATUALIZADO}</p>
      <button type="button" onClick={() => location.reload()}>
        Recarregar a página
      </button>
    </div>
  )
}

export function EtapaGerar(props: {
  lista: NormalizedArmyList
  plano: PlanoUnidade[]
  faccao: FaccaoIndice
  artes: ArtesFaccao
  /** para alternar as poses de cada variante (posesDa) */
  manifesto: ManifestoFaccao | null
  estilo: Estilo
  /** artes enviadas pelo usuário: já vêm como SVG do contrato v2 */
  enviadas: Enviada[]
}) {
  const [nomeNaBase, setNomeNaBase] = useState(true)
  const [numero, setNumero] = useState(true)
  const [bico, setBico] = useState<'0.2' | '0.4'>('0.2')
  const [modo, setModo] = useState<'duas-metades' | 'peca-unica'>('duas-metades')
  const [miolo, setMiolo] = useState<'preto' | 'branco'>('preto')
  const [torre, setTorre] = useState(false)
  const [soResolvidas, setSoResolvidas] = useState(false)
  const [estado, setEstado] = useState<Estado>({ fase: 'parado' })
  const [papel, setPapel] = useState<EstadoPapel>({ fase: 'parado' })
  const geracao = useRef<Geracao | null>(null)

  const { modelos, omitidas } = modelosDoPlano(props.plano, props.manifesto)
  const totalModelos = modelos.reduce((s, m) => s + m.qtd, 0)
  const podeGerar = modelos.length > 0 && (omitidas.length === 0 || soResolvidas)
  const ocupado = estado.fase === 'preparando' || estado.fase === 'gerando'
  // no papel a base é opcional (D044): sem ela, abas retangulares; só fica de fora a unidade sem arte
  const doPapel = modelosParaPapel(props.plano, props.manifesto)
  const totalPapel = doPapel.modelos.reduce((s, m) => s + m.qtd, 0)
  const podePapel = doPapel.modelos.length > 0 && (doPapel.omitidas.length === 0 || soResolvidas) && papel.fase !== 'gerando'
  const nomeLista = (props.lista.header?.armyName ?? 'standees').toLowerCase().replace(/[^a-z0-9]+/g, '-')

  /** Textos dos SVG das artes usadas, no estilo escolhido (ou no outro, se a arte só tiver um). */
  async function baixarArtes(ids: string[]): Promise<Record<string, ArtePedido>> {
    const porId = new Map(props.artes.artes.map((a) => [a.id, a]))
    const enviada = new Map(props.enviadas.map((a) => [a.id, a]))
    const artes: Record<string, ArtePedido> = {}
    await Promise.all([...new Set(ids)].map(async (id) => {
      const env = enviada.get(id)
      if (env) {
        artes[id] = { rotulo: env.rotulo, frente: env.frente, verso: env.verso }
        return
      }
      const a = porId.get(id)
      const e = a && estiloDisponivel(a, props.estilo)
      if (!a || !e) throw new Error(`a arte ${id} não está em ${props.faccao.faccao}; escolha de novo`)
      const [frente, verso] = await Promise.all([
        texto(urlArte(props.faccao, id, e, 'frente')), texto(urlArte(props.faccao, id, e, 'verso')),
      ])
      artes[id] = { rotulo: a.rotulo ?? id, frente, verso }
    }))
    return artes
  }

  async function iniciar() {
    if (estado.fase === 'pronto') URL.revokeObjectURL(estado.url)
    setEstado({ fase: 'preparando' })
    try {
      const artes = await baixarArtes(modelos.map((m) => m.arte))
      const [perfil, fonte] = await Promise.all([
        fetch(`./bambu/a1-bico-${bico}.json`).then((r) => r.json()),
        fetch(fonteUrl).then((r) => r.arrayBuffer()),
      ])
      const g = gerarNoWorker(
        { modelos, artes, projeto: perfil.projeto, fonte, parametros: { modo, nomeNaBase, numeroNaBase: numero, miolo, torrePurga: torre } },
        (feito, total, etapa) => setEstado({ fase: 'gerando', feito, total, etapa }),
      )
      geracao.current = g
      setEstado({ fase: 'gerando', feito: 0, total: 1, etapa: 'iniciando' })
      const resultado = await g.promessa
      const nome = `${nomeLista}-${props.estilo}.3mf`
      const url = URL.createObjectURL(new Blob([resultado.arquivo as BlobPart], { type: 'model/3mf' }))
      setEstado({ fase: 'pronto', resultado, url, nome })
    } catch (e) {
      setEstado(await falha(e))
    } finally {
      geracao.current = null
    }
  }

  async function iniciarPapel() {
    if (papel.fase === 'pronto') URL.revokeObjectURL(papel.url)
    setPapel({ fase: 'gerando' })
    try {
      // carregado só aqui: o opentype.js não pesa na abertura do site
      const [artes, fonte, { gerarPapel }] = await Promise.all([
        baixarArtes(doPapel.modelos.map((m) => m.arte)),
        fetch(fonteUrl).then((r) => r.arrayBuffer()),
        import('../papel/folhas'),
      ])
      const resultado = gerarPapel({ modelos: doPapel.modelos, artes, fonte, titulo: props.lista.header?.armyName ?? undefined })
      const nome = `${nomeLista}-${props.estilo}-papel-a4.pdf`
      const url = URL.createObjectURL(new Blob([resultado.arquivo as BlobPart], { type: 'application/pdf' }))
      setPapel({ fase: 'pronto', resultado, url, nome })
    } catch (e) {
      setPapel(await falha(e))
    }
  }

  return (
    <div className="etapa-gerar" aria-labelledby="titulo-gerar">
      <h2 id="titulo-gerar">3. Gerar</h2>
      {omitidas.length > 0 && (
        <div className="aviso-omitidas">
          <p>
            Sem arte ou base escolhida: <b>{omitidas.join(', ')}</b>.
            {doPapel.omitidas.length < omitidas.length &&
              (doPapel.omitidas.length
                ? ` No papel, sem base, as abas saem retangulares: só ${doPapel.omitidas.join(', ')} fica de fora.`
                : ' No papel, sem base, as abas saem retangulares: todas entram.')}
          </p>
          <label>
            <input type="checkbox" checked={soResolvidas} onChange={(e) => setSoResolvidas(e.target.checked)} /> gerar só as
            unidades prontas
          </label>
        </div>
      )}

      <section className="saida" aria-labelledby="titulo-3mf">
        <h3 id="titulo-3mf">Impressão 3D (3MF)</h3>
        <p className="ajuda">
          {modo === 'duas-metades'
            ? `Cada figura em duas metades (${miolo === 'preto' ? 'corpo preto, branco só na face de cima' : 'corpo branco'}, desenho preto em relevo), para colar costas com costas; a lingueta das metades coladas entra na fenda reta da base preta, que também as alinha na colagem. Quando a unidade alterna poses, cada metade leva o número da pose em fenda na face de colar.`
            : 'Peça única pintada (desenho nas duas faces), na fenda reta da base preta.'}{' '}
          Uma placa por unidade e, no fim, a lista completa junta (em quantas placas forem precisas), com o perfil da Bambu Lab A1
          (filamento 1 branco, filamento 2 preto, Textured PEI).
        </p>
        <div className="linha-controles">
          <label>
            Modo{' '}
            <select value={modo} onChange={(e) => setModo(e.target.value as 'duas-metades' | 'peca-unica')}>
              <option value="duas-metades">duas metades, preto em relevo</option>
              <option value="peca-unica">peça única pintada</option>
            </select>
          </label>
          <label>
            <input type="checkbox" checked={nomeNaBase} onChange={(e) => setNomeNaBase(e.target.checked)} /> nome da unidade na base
          </label>
          <label>
            <input type="checkbox" checked={numero} disabled={!nomeNaBase} onChange={(e) => setNumero(e.target.checked)} /> número da
            unidade na lista
          </label>
          <label title="Sem a torre, a A1 purga a troca de cor pela calha de trás">
            <input type="checkbox" checked={torre} onChange={(e) => setTorre(e.target.checked)} /> torre de purga
          </label>
          <label>
            Bico{' '}
            <select value={bico} onChange={(e) => setBico(e.target.value as '0.2' | '0.4')}>
              <option value="0.2">0,2 mm</option>
              <option value="0.4">0,4 mm</option>
            </select>
          </label>
          <label title="Preto: as duas cores só se encontram nas camadas do branco, e não em todas">
            Miolo{' '}
            <select value={miolo} onChange={(e) => setMiolo(e.target.value as 'preto' | 'branco')}>
              <option value="preto">{modo === 'peca-unica' ? 'preto (branco só no desenho)' : 'preto (branco só na face)'}</option>
              <option value="branco">branco</option>
            </select>
          </label>
        </div>
        <div className="botoes">
          <button type="button" onClick={iniciar} disabled={!podeGerar || ocupado}>
            Gerar 3MF ({plural(totalModelos, 'modelo', 'modelos')})
          </button>
          {ocupado && (
            <button type="button" className="secundario" onClick={() => geracao.current?.cancelar()}>
              Cancelar
            </button>
          )}
        </div>
        {estado.fase === 'preparando' && <p className="vazio">Baixando artes e perfil…</p>}
        {estado.fase === 'gerando' && (
          <div className="progresso">
            <progress max={estado.total} value={estado.feito} />
            <span>{estado.etapa}</span>
          </div>
        )}
        {estado.fase === 'erro' &&
          (estado.mensagem === 'cancelado' ? <p className="vazio">Geração cancelada.</p> : <Falha {...estado} />)}
        {estado.fase === 'pronto' && (
          <div className="pronto">
            <a className="botao" href={estado.url} download={estado.nome}>
              Baixar {estado.nome} ({(estado.resultado.arquivo.byteLength / 1e6).toFixed(1)} MB)
            </a>
            <p className="detalhe">
              {plural(estado.resultado.placas.filter((p) => p.grupo === 'unidade').length, 'placa', 'placas')} por unidade e{' '}
              {plural(estado.resultado.placas.filter((p) => p.grupo === 'lista').length, 'placa', 'placas')} com a lista completa no fim,
              gerado em {(estado.resultado.tempoMs / 1000).toFixed(1)} s:{' '}
              {estado.resultado.placas.map((p) => `${p.nome} (${plural(p.pecas, 'peça', 'peças')})`).join(' · ')}
            </p>
            {estado.resultado.avisos.length > 0 && (
              <ul className="alertas">
                {estado.resultado.avisos.map((a, i) => (
                  <li key={i} className="atencao">
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="saida" aria-labelledby="titulo-papel">
        <h3 id="titulo-papel">Papel A4 (PDF)</h3>
        <p className="ajuda">
          Uma faixa por modelo, como no PDF da OPR, em tamanho real (a mesma escala do PDF impresso a 100%) e várias por folha. Recorte
          na linha cheia, dobre nas tracejadas e cole a frente no verso; as duas abas, dobradas para fora, formam a base da unidade na
          medida do army book. Na impressão, escolha <b>tamanho real</b> ou escala 100%, não
          “ajustar à página”, e confira a régua de 50 mm no rodapé.
        </p>
        <div className="botoes">
          <button type="button" onClick={iniciarPapel} disabled={!podePapel}>
            Gerar PDF A4 ({plural(totalPapel, 'modelo', 'modelos')})
          </button>
        </div>
        {papel.fase === 'gerando' && <p className="vazio">Montando as folhas…</p>}
        {papel.fase === 'erro' && <Falha {...papel} />}
        {papel.fase === 'pronto' && (
          <div className="pronto">
            <div className="botoes">
              <a className="botao" href={papel.url} download={papel.nome}>
                Baixar {papel.nome} ({Math.max(1, Math.round(papel.resultado.arquivo.byteLength / 1e3))} KB)
              </a>
              <a className="botao secundario" href={papel.url} target="_blank" rel="noopener">
                Abrir para imprimir
              </a>
            </div>
            <p className="detalhe">
              {plural(papel.resultado.folhas, 'folha', 'folhas')} A4, {plural(papel.resultado.faixas.length, 'faixa', 'faixas')}.
            </p>
            {papel.resultado.avisos.length > 0 && (
              <ul className="alertas">
                {papel.resultado.avisos.map((a, i) => (
                  <li key={i} className="atencao">
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
