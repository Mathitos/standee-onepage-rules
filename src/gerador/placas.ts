/** Disposição das peças na mesa, port de prototipo/gerar.py empacotar() e centralizar(). */
import type { Parametros } from './parametros'

/** [chave, x, y, largura, altura] em mm da mesa */
export type Colocada = [string, number, number, number, number]
export type Retangulo = [number, number, number, number]

/** Alguma peça da placa entra no retângulo (x0, y0, x1, y1)? */
export function invadeArea(placa: Colocada[], r: Retangulo): boolean {
  return placa.some(([, x, y, w, h]) => !(x + w <= r[0] || x >= r[2] || y + h <= r[1] || y >= r[3]))
}

/**
 * Empacota deixando livre a área da torre de purga (P.torreXyxyBases): com a torre ligada,
 * sempre; desligada, quando isso não custa uma placa a mais (pedido do usuário em 23/11), para
 * que a torre ligada depois no Bambu Studio já tenha lugar sem arrumar as peças.
 */
export function longeDaTorre(empacotarCom: (reservado?: Retangulo) => Colocada[][], P: Parametros): Colocada[][] {
  const livre = empacotarCom(P.torreXyxyBases)
  if (P.torrePurga) return livre
  const solto = empacotarCom()
  return livre.length <= solto.length ? livre : solto
}

/**
 * Prateleiras simples, da peça mais alta para a mais baixa; o que não couber vai para outra
 * placa. `reservado` (x0, y0, x1, y1) fica livre (torre de purga). Cada placa vai para o centro.
 * Peça que nem numa placa vazia cabe fora de `reservado` (mais alta e mais larga que o espaço em
 * volta dele) vai para o canto da placa por cima da área: antes, o laço abria placas vazias sem
 * parar até acabar a memória (revisão de 25/11; com a torre desligada desde a D050). Quem chama
 * vê a área ocupada com invadeArea e avisa.
 */
export function empacotar(pecas: [string, number, number][], P: Parametros, reservado?: Retangulo): Colocada[][] {
  const util = P.mesa - 2 * P.margemMesa
  const m = P.margemMesa
  const bate = (x: number, y: number, w: number, h: number) =>
    !!reservado && !(x + m + w <= reservado[0] || x + m >= reservado[2] || y + m + h <= reservado[1] || y + m >= reservado[3])
  const placas: Colocada[][] = []
  let atual: Colocada[] = []
  let x = 0
  let y = 0
  let altLinha = 0
  const ordem = pecas.map((p, i) => [p, i] as const).sort((A, B) => B[0][2] - A[0][2] || A[1] - B[1])
  for (const [[chave, w, h]] of ordem) {
    if (w > util || h > util) throw new Error(`${chave} não cabe na mesa`)
    let ignorarReserva = false
    for (;;) {
      if (x + w > util) {
        x = 0
        y = y + altLinha + P.espaco
        altLinha = 0
      }
      if (y + h > util) {
        // placa vazia e mesmo assim sem lugar: só a área reservada atrapalha
        if (atual.length) placas.push(atual)
        else ignorarReserva = true
        atual = []
        x = y = altLinha = 0
        continue
      }
      if (!ignorarReserva && bate(x, y, w, h)) {
        x = reservado![2] - m + P.espaco
        continue
      }
      break
    }
    atual.push([chave, x + m, y + m, w, h])
    x += w + P.espaco
    altLinha = Math.max(altLinha, h)
  }
  placas.push(atual)
  return placas.map((pl) => centralizar(pl, P, reservado))
}

/** Leva o conjunto para o centro da mesa; se bater na torre, aproxima da frente até não bater. */
export function centralizar(placa: Colocada[], P: Parametros, reservado?: Retangulo): Colocada[] {
  if (!placa.length) return placa
  const x0 = Math.min(...placa.map((p) => p[1]))
  const y0 = Math.min(...placa.map((p) => p[2]))
  const x1 = Math.max(...placa.map((p) => p[1] + p[3]))
  const y1 = Math.max(...placa.map((p) => p[2] + p[4]))
  const dx = Math.max(0, P.mesa / 2 - (x0 + x1) / 2)
  const dy0 = Math.max(0, P.mesa / 2 - (y0 + y1) / 2)
  const bate = (dy: number) =>
    !!reservado && placa.some(([, x, y, w, h]) =>
      !(x + dx + w <= reservado[0] || x + dx >= reservado[2] || y + dy + h <= reservado[1] || y + dy >= reservado[3]))
  for (let passo = 0; passo <= 20; passo++) {
    const dy = dy0 * (1 - passo / 20)
    if (!bate(dy)) return placa.map(([k, x, y, w, h]) => [k, x + dx, y + dy, w, h] as Colocada)
  }
  return placa
}
