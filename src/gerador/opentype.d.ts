// Tipos mínimos do opentype.js 2.0 (o pacote não traz .d.ts), só o que o gerador usa.
declare module 'opentype.js' {
  export interface PathCommand {
    type: 'M' | 'L' | 'Q' | 'C' | 'Z'
    x?: number
    y?: number
    x1?: number
    y1?: number
    x2?: number
    y2?: number
  }
  export interface Glyph {
    index: number
    advanceWidth?: number
    getPath(x: number, y: number, fontSize: number): { commands: PathCommand[] }
  }
  export interface Font {
    unitsPerEm: number
    ascender: number
    descender: number
    charToGlyph(c: string): Glyph
    /** contorno do texto, y para baixo, linha de base em y (folhas de papel) */
    getPath(text: string, x: number, y: number, fontSize: number): { commands: PathCommand[] }
    getAdvanceWidth(text: string, fontSize: number): number
  }
  export function parse(buffer: ArrayBuffer): Font
}
