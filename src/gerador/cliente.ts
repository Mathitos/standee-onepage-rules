/** Lado da página: abre um worker por geração e o encerra no fim (libera a memória do WebAssembly). */
import wasmUrl from 'manifold-3d/manifold.wasm?url'
import type { Pedido, Resultado } from './gerar'

export interface Geracao {
  promessa: Promise<Resultado>
  cancelar: () => void
}

export function gerarNoWorker(pedido: Pedido, aoProgresso: (feito: number, total: number, etapa: string) => void): Geracao {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  let rejeitar: (e: Error) => void = () => {}
  const promessa = new Promise<Resultado>((resolve, reject) => {
    rejeitar = reject
    worker.onmessage = (e) => {
      const m = e.data
      if (m.tipo === 'progresso') aoProgresso(m.feito, m.total, m.etapa)
      else {
        worker.terminate()
        if (m.tipo === 'pronto') resolve(m.resultado)
        else reject(new Error(m.mensagem))
      }
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e.message || 'falha no worker'))
    }
  })
  worker.postMessage({ pedido, wasmUrl: new URL(wasmUrl, location.href).href })
  return {
    promessa,
    cancelar: () => {
      worker.terminate()
      rejeitar(new Error('cancelado'))
    },
  }
}
