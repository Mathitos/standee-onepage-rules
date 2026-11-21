import { useEffect, useMemo, useState } from 'react'
import { parseShareText } from '../armyforge/parseShareText'
import type { ImportIssue, NormalizedArmyList, UnitGroup } from '../armyforge/types'
import exemplo from '../../tests/fixtures/armyforge/piloto-share-as-text.txt?raw'
import { EtapaArtes } from './EtapaArtes'

const CHAVE_TEXTO = 'standee-forge:texto-lista'

function lerSalvo(): string {
  try {
    return localStorage.getItem(CHAVE_TEXTO) ?? ''
  } catch {
    return ''
  }
}

function salvar(texto: string) {
  try {
    localStorage.setItem(CHAVE_TEXTO, texto)
  } catch {
    // armazenamento indisponível (aba anônima, quota): o app segue funcionando
  }
}

const ETAPAS = [
  { nome: 'Importar lista', pronta: true },
  { nome: 'Artes e bases', pronta: true },
  { nome: 'Gerar 3MF', pronta: true },
]

export function App() {
  const [texto, setTexto] = useState(lerSalvo)
  const [usandoExemplo, setUsandoExemplo] = useState(false)
  useEffect(() => salvar(texto), [texto])
  const lista = useMemo(() => (texto.trim() ? parseShareText(texto) : null), [texto])

  return (
    <div className="pagina">
      <header className="topo">
        <div>
          <h1>Standee Forge</h1>
          <p className="sub">Standees imprimíveis a partir de listas do Army Forge · protótipo</p>
        </div>
        <ol className="etapas" aria-label="Etapas">
          {ETAPAS.map((e, i) => (
            <li key={e.nome} className={i === 0 || (lista && lista.units.length > 0) ? 'ativa' : e.pronta ? '' : 'futura'}>
              <span className="num">{i + 1}</span>
              {e.nome}
              {!e.pronta && <span className="breve">em breve</span>}
            </li>
          ))}
        </ol>
      </header>

      <main className="grade">
        <section className="painel entrada" aria-labelledby="titulo-entrada">
          <h2 id="titulo-entrada">1. Cole a lista</h2>
          <p className="ajuda">
            No Army Forge, abra a lista e use <b>⋮ → Share List → Share as Text</b>. Cole o texto abaixo.
          </p>
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setUsandoExemplo(false)
            }}
            placeholder={'++ Exército (v1.0) [GFF 500pts] [4 Units] ++\n\nUnidade [3] Q5+ D5+ | 85pts | ...\n3x Arma (24", A2), ...'}
            spellCheck={false}
            aria-label="Texto da lista exportada do Army Forge"
          />
          <div className="botoes">
            <button
              type="button"
              className="secundario"
              onClick={() => {
                setTexto(exemplo)
                setUsandoExemplo(true)
              }}
            >
              Usar lista de exemplo
            </button>
            <button type="button" className="secundario" onClick={() => setTexto('')} disabled={!texto}>
              Limpar
            </button>
          </div>
          {usandoExemplo && (
            <p className="aviso-exemplo">
              Exemplo: lista piloto Human Defense Force capturada em 17/11/2026. Não é a sua lista.
            </p>
          )}
          <p className="privacidade">O texto fica só neste navegador; nada é enviado.</p>
        </section>

        <section className="painel resultado" aria-labelledby="titulo-resultado" aria-live="polite">
          <h2 id="titulo-resultado">Lista interpretada</h2>
          {lista ? <Resultado lista={lista} /> : <p className="vazio">Cole um texto para ver unidades, modelos e armas.</p>}
        </section>
      </main>

      {lista && lista.units.length > 0 && <EtapaArtes lista={lista} />}

      <footer className="rodape">
        Tudo roda neste navegador: a lista, as artes escolhidas e a geração do 3MF não saem do seu computador. Artes dos
        paper minis da One Page Rules; listas do Army Forge.
      </footer>
    </div>
  )
}

function Resultado({ lista }: { lista: NormalizedArmyList }) {
  const h = lista.header
  const pontosOk = h?.points == null || h.points === lista.totals.points
  return (
    <>
      <dl className="cartoes">
        <div>
          <dt>Exército</dt>
          <dd>
            {h?.armyName ?? '—'}
            {h?.armyVersion && <span className="versao">v{h.armyVersion}</span>}
          </dd>
        </div>
        <div>
          <dt>Sistema</dt>
          <dd>{h?.systemCode ?? '—'}</dd>
        </div>
        <div>
          <dt>Modelos</dt>
          <dd className="destaque">{lista.totals.models}</dd>
        </div>
        <div>
          <dt>Unidades</dt>
          <dd>{lista.totals.units}</dd>
        </div>
        <div className={pontosOk ? '' : 'erro'}>
          <dt>Pontos</dt>
          <dd>
            {lista.totals.points}
            {h?.points != null && !pontosOk && <span className="versao">cabeçalho: {h.points}</span>}
          </dd>
        </div>
      </dl>

      {lista.issues.length > 0 && <Alertas issues={lista.issues} />}

      <div className="tabela-rolagem">
        <table>
          <thead>
            <tr>
              <th>Unidade</th>
              <th className="num">Modelos</th>
              <th>Armas por modelo</th>
              <th className="num">Pts</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lista.units.map((u) => (
              <LinhaUnidade key={u.line} u={u} />
            ))}
          </tbody>
        </table>
      </div>

      {lista.unrecognized.length > 0 && (
        <details className="nao-reconhecidas" open>
          <summary>Linhas não reconhecidas ({lista.unrecognized.length})</summary>
          <ul>
            {lista.unrecognized.map((l) => (
              <li key={l.line}>
                <span className="linha">linha {l.line}</span> <code>{l.text}</code>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="botoes">
        <button type="button" className="secundario" onClick={() => baixarJson(lista)}>
          Baixar lista normalizada (JSON)
        </button>
      </div>
    </>
  )
}

function LinhaUnidade({ u }: { u: UnitGroup }) {
  const total = u.copies * u.modelsPerUnit
  return (
    <tr>
      <td>
        <b>{u.name}</b>
        <div className="detalhe">
          {u.copies > 1 ? `${u.copies} unidades × ${u.modelsPerUnit}` : `${u.modelsPerUnit} por unidade`} · Q{u.quality}+
          D{u.defense}+
        </div>
      </td>
      <td className="num">{total}</td>
      <td>
        <ul className="variantes">
          {u.variants.map((v, i) => (
            <li key={i}>
              <span className="qtd">{v.modelsPerUnit * u.copies}×</span> {v.equipment.join(' + ') || 'sem arma listada'}
            </li>
          ))}
        </ul>
      </td>
      <td className="num">{u.copies * u.pointsPerUnit}</td>
      <td>
        {u.needsReview ? (
          <span className="selo revisar" title="As contagens não definem sozinhas a arma de cada modelo">
            revisar
          </span>
        ) : (
          <span className="selo ok">ok</span>
        )}
      </td>
    </tr>
  )
}

const ROTULO: Record<ImportIssue['kind'], string> = {
  empty: 'Vazio',
  'missing-header': 'Cabeçalho',
  'points-mismatch': 'Pontos',
  'units-mismatch': 'Unidades',
  'unrecognized-line': 'Linha',
  'missing-equipment': 'Equipamento',
  'distribution-review': 'Revisar',
}

function Alertas({ issues }: { issues: ImportIssue[] }) {
  return (
    <ul className="alertas">
      {issues.map((i, k) => (
        <li key={k} className={i.kind === 'distribution-review' ? 'atencao' : 'erro'}>
          <span className="tipo">{ROTULO[i.kind]}</span>
          {i.message}
          {i.line ? <span className="linha"> (linha {i.line})</span> : null}
        </li>
      ))}
    </ul>
  )
}

function baixarJson(lista: NormalizedArmyList) {
  const blob = new Blob([JSON.stringify(lista, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const nome = (lista.header?.armyName ?? 'lista').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  a.href = url
  a.download = `${nome}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
