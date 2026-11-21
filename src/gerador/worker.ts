/** Web Worker da geração: a interface não trava enquanto o manifold monta as malhas. */
import { gerar, type Pedido } from './gerar'
import { carregarManifold } from './manifold'

interface Escopo {
  postMessage(msg: unknown, transfer?: Transferable[]): void
  onmessage: ((e: MessageEvent<{ pedido: Pedido; wasmUrl: string }>) => void) | null
}
const escopo = self as unknown as Escopo

escopo.onmessage = async (e) => {
  try {
    const w = await carregarManifold(e.data.wasmUrl)
    const r = await gerar(w, e.data.pedido, (feito, total, etapa) => escopo.postMessage({ tipo: 'progresso', feito, total, etapa }))
    escopo.postMessage({ tipo: 'pronto', resultado: r }, [r.arquivo.buffer as ArrayBuffer])
  } catch (err) {
    escopo.postMessage({ tipo: 'erro', mensagem: err instanceof Error ? err.message : String(err) })
  }
}
