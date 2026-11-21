import fonteUrl from '@fontsource/barlow-semi-condensed/files/barlow-semi-condensed-latin-700-normal.woff?url'
import { useRef, useState } from 'react'
import type { NormalizedArmyList } from '../armyforge/types'
import { modelosDoPlano, type PlanoUnidade } from '../catalogo/associar'
import { estiloDisponivel, texto, urlArte } from '../catalogo/carregar'
import type { ArtesFaccao, Estilo, FaccaoIndice } from '../catalogo/tipos'
import { gerarNoWorker, type Geracao } from '../gerador/cliente'
import type { ArtePedido, Resultado } from '../gerador/gerar'

type Estado =
  | { fase: 'parado' }
  | { fase: 'preparando' }
  | { fase: 'gerando'; feito: number; total: number; etapa: string }
  | { fase: 'pronto'; resultado: Resultado; url: string; nome: string }
  | { fase: 'erro'; mensagem: string }

export function EtapaGerar(props: { lista: NormalizedArmyList; plano: PlanoUnidade[]; faccao: FaccaoIndice; artes: ArtesFaccao; estilo: Estilo }) {
  const [nomeNaBase, setNomeNaBase] = useState(true)
  const [numero, setNumero] = useState(true)
  const [bico, setBico] = useState<'0.2' | '0.4'>('0.2')
  const [miolo, setMiolo] = useState<'preto' | 'branco'>('preto')
  const [soResolvidas, setSoResolvidas] = useState(false)
  const [estado, setEstado] = useState<Estado>({ fase: 'parado' })
  const geracao = useRef<Geracao | null>(null)

  const { modelos, omitidas } = modelosDoPlano(props.plano)
  const totalModelos = modelos.reduce((s, m) => s + m.qtd, 0)
  const podeGerar = modelos.length > 0 && (omitidas.length === 0 || soResolvidas)
  const ocupado = estado.fase === 'preparando' || estado.fase === 'gerando'

  async function iniciar() {
    if (estado.fase === 'pronto') URL.revokeObjectURL(estado.url)
    setEstado({ fase: 'preparando' })
    try {
      const porId = new Map(props.artes.artes.map((a) => [a.id, a]))
      const usadas = [...new Set(modelos.map((m) => m.arte))]
      const artes: Record<string, ArtePedido> = {}
      await Promise.all(usadas.map(async (id) => {
        const a = porId.get(id)
        const e = a && estiloDisponivel(a, props.estilo)
        if (!a || !e) throw new Error(`a arte ${id} não está em ${props.faccao.faccao}; escolha de novo`)
        const [frente, verso] = await Promise.all([
          texto(urlArte(props.faccao, id, e, 'frente')), texto(urlArte(props.faccao, id, e, 'verso')),
        ])
        artes[id] = { rotulo: a.rotulo ?? id, frente, verso }
      }))
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
      const nome = `${(props.lista.header?.armyName ?? 'standees').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${props.estilo}.3mf`
      const url = URL.createObjectURL(new Blob([resultado.arquivo as BlobPart], { type: 'model/3mf' }))
      setEstado({ fase: 'pronto', resultado, url, nome })
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e instanceof Error ? e.message : String(e) })
    } finally {
      geracao.current = null
    }
  }

  return (
    <div className="etapa-gerar" aria-labelledby="titulo-gerar">
      <h2 id="titulo-gerar">3. Gerar o 3MF</h2>
      <p className="ajuda">
        Peça única pintada (desenho nas duas faces, miolo preto), base preta com fendas e uma unidade por placa, com o perfil
        da Bambu Lab A1 (filamento 1 branco, filamento 2 preto, Textured PEI).
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
      {omitidas.length > 0 && (
        <div className="aviso-omitidas">
          <p>
            Sem arte ou base escolhida: <b>{omitidas.join(', ')}</b>.
          </p>
          <label>
            <input type="checkbox" checked={soResolvidas} onChange={(e) => setSoResolvidas(e.target.checked)} /> gerar só as
            unidades prontas
          </label>
        </div>
      )}
      <div className="botoes">
        <button type="button" onClick={iniciar} disabled={!podeGerar || ocupado}>
          Gerar 3MF ({totalModelos} {totalModelos === 1 ? 'modelo' : 'modelos'})
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
    </div>
  )
}
