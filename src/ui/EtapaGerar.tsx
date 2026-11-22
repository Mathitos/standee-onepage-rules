import fonteUrl from '@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff?url'
import { useRef, useState } from 'react'
import type { NormalizedArmyList } from '../armyforge/types'
import { modelosDoPlano, modelosParaPapel, type PlanoUnidade } from '../catalogo/associar'
import { estiloDisponivel, texto, urlArte } from '../catalogo/carregar'
import type { ArtesFaccao, Estilo, FaccaoIndice } from '../catalogo/tipos'
import { gerarNoWorker, type Geracao } from '../gerador/cliente'
import type { ArtePedido, Resultado } from '../gerador/gerar'
import type { ResultadoPapel } from '../papel/folhas'

type Estado =
  | { fase: 'parado' }
  | { fase: 'preparando' }
  | { fase: 'gerando'; feito: number; total: number; etapa: string }
  | { fase: 'pronto'; resultado: Resultado; url: string; nome: string }
  | { fase: 'erro'; mensagem: string }

type EstadoPapel =
  | { fase: 'parado' }
  | { fase: 'gerando' }
  | { fase: 'pronto'; resultado: ResultadoPapel; url: string; nome: string }
  | { fase: 'erro'; mensagem: string }

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export function EtapaGerar(props: { lista: NormalizedArmyList; plano: PlanoUnidade[]; faccao: FaccaoIndice; artes: ArtesFaccao; estilo: Estilo }) {
  const [nomeNaBase, setNomeNaBase] = useState(true)
  const [numero, setNumero] = useState(true)
  const [bico, setBico] = useState<'0.2' | '0.4'>('0.2')
  const [miolo, setMiolo] = useState<'preto' | 'branco'>('preto')
  const [soResolvidas, setSoResolvidas] = useState(false)
  const [estado, setEstado] = useState<Estado>({ fase: 'parado' })
  const [papel, setPapel] = useState<EstadoPapel>({ fase: 'parado' })
  const geracao = useRef<Geracao | null>(null)

  const { modelos, omitidas } = modelosDoPlano(props.plano)
  const totalModelos = modelos.reduce((s, m) => s + m.qtd, 0)
  const podeGerar = modelos.length > 0 && (omitidas.length === 0 || soResolvidas)
  const ocupado = estado.fase === 'preparando' || estado.fase === 'gerando'
  // no papel a base não importa (D044): só fica de fora a unidade sem arte
  const doPapel = modelosParaPapel(props.plano)
  const totalPapel = doPapel.modelos.reduce((s, m) => s + m.qtd, 0)
  const podePapel = doPapel.modelos.length > 0 && (doPapel.omitidas.length === 0 || soResolvidas) && papel.fase !== 'gerando'
  const nomeLista = (props.lista.header?.armyName ?? 'standees').toLowerCase().replace(/[^a-z0-9]+/g, '-')

  /** Textos dos SVG das artes usadas, no estilo escolhido (ou no outro, se a arte só tiver um). */
  async function baixarArtes(ids: string[]): Promise<Record<string, ArtePedido>> {
    const porId = new Map(props.artes.artes.map((a) => [a.id, a]))
    const artes: Record<string, ArtePedido> = {}
    await Promise.all([...new Set(ids)].map(async (id) => {
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
        { modelos, artes, projeto: perfil.projeto, fonte, parametros: { nomeNaBase, numeroNaBase: numero, miolo } },
        (feito, total, etapa) => setEstado({ fase: 'gerando', feito, total, etapa }),
      )
      geracao.current = g
      setEstado({ fase: 'gerando', feito: 0, total: 1, etapa: 'iniciando' })
      const resultado = await g.promessa
      const nome = `${nomeLista}-${props.estilo}.3mf`
      const url = URL.createObjectURL(new Blob([resultado.arquivo as BlobPart], { type: 'model/3mf' }))
      setEstado({ fase: 'pronto', resultado, url, nome })
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e instanceof Error ? e.message : String(e) })
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
      setPapel({ fase: 'erro', mensagem: e instanceof Error ? e.message : String(e) })
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
                ? ` No papel a base não importa: só ${doPapel.omitidas.join(', ')} fica de fora.`
                : ' No papel a base não importa: todas entram.')}
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
          Peça única pintada (desenho nas duas faces, miolo preto), base preta com fendas e uma unidade por placa, com o
          perfil da Bambu Lab A1 (filamento 1 branco, filamento 2 preto, Textured PEI).
        </p>
        <div className="linha-controles">
          <label>
            <input type="checkbox" checked={nomeNaBase} onChange={(e) => setNomeNaBase(e.target.checked)} /> nome da unidade na base
          </label>
          <label>
            <input type="checkbox" checked={numero} disabled={!nomeNaBase} onChange={(e) => setNumero(e.target.checked)} /> número da
            unidade na lista
          </label>
          <label>
            Bico{' '}
            <select value={bico} onChange={(e) => setBico(e.target.value as '0.2' | '0.4')}>
              <option value="0.2">0,2 mm</option>
              <option value="0.4">0,4 mm</option>
            </select>
          </label>
          <label>
            Miolo{' '}
            <select value={miolo} onChange={(e) => setMiolo(e.target.value as 'preto' | 'branco')}>
              <option value="preto">preto (branco só no desenho)</option>
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
          (estado.mensagem === 'cancelado' ? <p className="vazio">Geração cancelada.</p> : <p className="erro-carga">Falhou: {estado.mensagem}</p>)}
        {estado.fase === 'pronto' && (
          <div className="pronto">
            <a className="botao" href={estado.url} download={estado.nome}>
              Baixar {estado.nome} ({(estado.resultado.arquivo.byteLength / 1e6).toFixed(1)} MB)
            </a>
            <p className="detalhe">
              {estado.resultado.placas.length} placas, gerado em {(estado.resultado.tempoMs / 1000).toFixed(1)} s:{' '}
              {estado.resultado.placas.map((p) => `${p.nome} (${p.pecas} peças)`).join(' · ')}
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
          na linha cheia, dobre nas tracejadas e cole a frente no verso. Na impressão, escolha <b>tamanho real</b> ou escala 100%, não
          “ajustar à página”, e confira a régua de 50 mm no rodapé.
        </p>
        <div className="botoes">
          <button type="button" onClick={iniciarPapel} disabled={!podePapel}>
            Gerar PDF A4 ({plural(totalPapel, 'modelo', 'modelos')})
          </button>
        </div>
        {papel.fase === 'gerando' && <p className="vazio">Montando as folhas…</p>}
        {papel.fase === 'erro' && <p className="erro-carga">Falhou: {papel.mensagem}</p>}
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
