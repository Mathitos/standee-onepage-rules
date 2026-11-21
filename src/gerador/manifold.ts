/**
 * manifold-3d (WebAssembly), a mesma biblioteca do protótipo Python (D018). As chamadas passam
 * pelo coletor do próprio pacote: `liberar()` apaga todos os objetos criados desde a última
 * vez. O gerador copia as malhas para arrays comuns antes de liberar.
 */
import Module from 'manifold-3d'
import type { ManifoldToplevel } from 'manifold-3d'
import { cleanup, garbageCollectManifold } from 'manifold-3d/lib/garbage-collector.js'

let instancia: Promise<ManifoldToplevel> | null = null

/** `wasmUrl`: endereço do manifold.wasm no navegador (no Node, o pacote acha sozinho). */
export function carregarManifold(wasmUrl?: string): Promise<ManifoldToplevel> {
  instancia ??= Module(wasmUrl ? { locateFile: () => wasmUrl } : undefined).then((w) => {
    w.setup()
    return garbageCollectManifold(w)
  })
  return instancia
}

export const liberar = cleanup

/** Malha em arrays comuns (fora da memória do WebAssembly). */
export interface Malha {
  /** x, y, z por vértice */
  vertices: Float32Array
  /** 3 índices por triângulo */
  triangulos: Uint32Array
}
