/**
 * Parâmetros do gerador do site: o caminho padrão do protótipo (prototipo/gerar.py) que o
 * usuário imprime hoje — peça única pintada (D032) com miolo preto (D036), lateral preta (D034),
 * base com duas fendas cônicas (D031), nome e número na base (D022/D027/D035), uma unidade por
 * placa (D037), perfil da A1 embutido (D026) e paredes Arachne (D025). Valores e nomes
 * seguem `Param` do protótipo.
 */

/** Resolução da arte: os SVG do catálogo (contrato v2) estão em pixels de 600 dpi. */
export const DPI = 600
/** mm por pixel da arte */
export const S = 25.4 / DPI

export interface Parametros {
  /** espessura do corpo sem relevo; a peça pintada tem corpo + relevo (1,6 mm) */
  corpo: number
  relevo: number
  /** espessura do desenho rente em cada face (--face-mm) */
  camadaMesa: number
  /** preto (D036): branco só nas áreas brancas do desenho; branco: miolo branco */
  miolo: 'preto' | 'branco'
  linguetaLarg: number
  linguetaEntre: number
  linguetaConicidade: number
  linguetaFolgaBarra: number
  linguetaProf: number
  barraSobra: number
  bocaChanfro: number
  travessa: number
  contatoMm: number
  /** mm de faixa preta na lateral da figura (D034); 0 desliga */
  lateralPreta: number
  folgaEsp: number
  baseAltura: number
  /** gerador de paredes gravado em cada objeto do 3MF; '' = o do perfil */
  paredes: string
  nomeNaBase: boolean
  numeroNaBase: boolean
  numeroAltura: number
  textoAltura: number
  textoMin: number
  textoCamada: number
  textoMargem: number
  textoEngorda: number
  textoArcoGraus: number
  mesa: number
  margemMesa: number
  espaco: number
  /** torre de purga das placas com bases (D027/D034) */
  torrePosBases: [number, number]
  /** área da mesa deixada livre para a torre: x0, y0, x1, y1 */
  torreXyxyBases: [number, number, number, number]
}

export const PADRAO: Parametros = {
  corpo: 1.2,
  relevo: 0.4,
  camadaMesa: 0.4,
  miolo: 'preto',
  linguetaLarg: 4.0,
  linguetaEntre: 12.0,
  linguetaConicidade: 0.5,
  linguetaFolgaBarra: 0.15,
  linguetaProf: 1.9,
  barraSobra: 0.5,
  bocaChanfro: 0.3,
  travessa: 0.5,
  contatoMm: 1.0,
  lateralPreta: 0.3,
  folgaEsp: 0.25,
  baseAltura: 2.0,
  paredes: 'arachne',
  nomeNaBase: true,
  numeroNaBase: true,
  numeroAltura: 3.0,
  textoAltura: 3.0,
  textoMin: 1.8,
  textoCamada: 0.4,
  textoMargem: 0.6,
  textoEngorda: 0.06,
  textoArcoGraus: 140,
  mesa: 256,
  margemMesa: 8,
  espaco: 4,
  torrePosBases: [15, 200],
  torreXyxyBases: [0, 190, 70, 256],
}

/** Espessura da peça que entra na fenda: a peça única pintada inteira. */
export function espessuraPeca(P: Parametros): number {
  return P.corpo + P.relevo
}

/** Meia distância entre as linguetas em px (a mesma em todas as artes). */
export function meioEntrePx(P: Parametros): number {
  return Math.round(P.linguetaEntre / 2 / S)
}

/** Distância real entre os centros das linguetas (múltiplo de 2 px), usada também nas fendas. */
export function entreLinguetasMm(P: Parametros): number {
  return 2 * meioEntrePx(P) * S
}
