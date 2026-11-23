import { useState } from 'react'
import { arteDeCinza, caixa, cinzaDeRgba, MARGEM_PX, silhuetaDe, type ArteEnviada, type Cinza } from '../catalogo/arteEnviada'
import { S } from '../gerador/parametros'

/** Carrega a imagem do arquivo (PNG, JPG, WebP, SVG...) sem enviar nada para fora do navegador. */
function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`não consegui abrir ${arquivo.name} como imagem`))
    }
    img.src = url
  })
}

/** Desenha um recorte da imagem numa tela branca W x H e devolve o cinza. */
function desenhar(img: HTMLImageElement, recorte: [number, number, number, number], destino: [number, number, number, number], W: number, H: number): Cinza {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, W, H)
  g.imageSmoothingQuality = 'high'
  g.drawImage(img, ...recorte, ...destino)
  return cinzaDeRgba(g.getImageData(0, 0, W, H).data, W, H)
}

/**
 * Acha a figura na imagem inteira (a silhueta, desenhada com a altura do alvo) e devolve o recorte
 * dela na imagem original, para redesenhar só a figura com a altura pedida.
 */
function recorteDaFigura(img: HTMLImageElement, alvoPx: number, lado: string): [number, number, number, number] {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih) throw new Error(`a imagem da ${lado} está vazia`)
  const k = alvoPx / ih
  const W = Math.max(1, Math.round(iw * k))
  const c = desenhar(img, [0, 0, iw, ih], [0, 0, W, alvoPx], W, alvoPx)
  const cx = caixa(silhuetaDe(c), W, alvoPx)
  if (!cx) throw new Error(`não achei a figura na ${lado}: use desenho escuro em fundo branco ou transparente`)
  return [cx[0] / k, cx[1] / k, (cx[2] - cx[0] + 1) / k, (cx[3] - cx[1] + 1) / k]
}

/**
 * Envio de arte própria (pedido de 23/11): a imagem vira os SVGs do contrato v2 no navegador, na
 * escala de 600 dpi, com a figura da altura pedida. Sem verso, o verso é a frente espelhada.
 */
export function EnvioArte(props: { alturaPadraoMm: number; proximoId: () => string; onEnviar: (a: ArteEnviada) => void }) {
  const [frente, setFrente] = useState<File | null>(null)
  const [verso, setVerso] = useState<File | null>(null)
  const [altura, setAltura] = useState(props.alturaPadraoMm)
  const [estado, setEstado] = useState<{ fase: 'parado' } | { fase: 'processando' } | { fase: 'erro'; mensagem: string }>({ fase: 'parado' })

  async function enviar() {
    if (!frente) return
    setEstado({ fase: 'processando' })
    try {
      // deixa o aviso "processando" aparecer antes da conta, que roda nesta aba
      await new Promise((r) => setTimeout(r, 0))
      const alvoPx = Math.round(altura / S)
      const imgF = await carregarImagem(frente)
      const rf = recorteDaFigura(imgF, alvoPx, 'frente')
      const dw = Math.max(1, Math.round((rf[2] * alvoPx) / rf[3]))
      const W = dw + 2 * MARGEM_PX
      const H = alvoPx + 2 * MARGEM_PX
      const cinzaF = desenhar(imgF, rf, [MARGEM_PX, MARGEM_PX, dw, alvoPx], W, H)
      let cinzaV: Cinza | null = null
      if (verso) {
        // o verso com a mesma altura de figura, centrado na tela da frente
        const imgV = await carregarImagem(verso)
        const rv = recorteDaFigura(imgV, alvoPx, 'imagem do verso')
        const dwv = Math.max(1, Math.round((rv[2] * alvoPx) / rv[3]))
        cinzaV = desenhar(imgV, rv, [Math.round((W - dwv) / 2), MARGEM_PX, dwv, alvoPx], W, H)
      }
      const rotulo = frente.name.replace(/\.[^.]+$/, '')
      props.onEnviar(arteDeCinza(props.proximoId(), rotulo, cinzaF, cinzaV))
      setEstado({ fase: 'parado' })
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e instanceof Error ? e.message : String(e) })
    }
  }

  return (
    <div className="envio-arte-corpo">
      <p className="ajuda">
        Desenho escuro em fundo branco ou transparente, como os paper minis: o traço vira o relevo preto e o contorno da figura
        vira a peça. A imagem não sai deste navegador.
      </p>
      <div className="linha-controles">
        <label>
          Frente{' '}
          <input type="file" accept="image/*" onChange={(e) => setFrente(e.target.files?.[0] ?? null)} />
        </label>
        <label>
          Verso (opcional){' '}
          <input type="file" accept="image/*" onChange={(e) => setVerso(e.target.files?.[0] ?? null)} />
        </label>
        <label>
          Altura da figura{' '}
          <input
            type="number"
            min={10}
            max={200}
            step={0.5}
            value={altura}
            onChange={(e) => setAltura(Number(e.target.value) || props.alturaPadraoMm)}
            className="numero-curto"
          />{' '}
          mm
        </label>
      </div>
      <p className="detalhe">
        Sem verso, o verso é a frente espelhada. A altura padrão é a mediana das artes desta facção ({String(props.alturaPadraoMm).replace('.', ',')} mm).
      </p>
      <div className="botoes">
        <button type="button" onClick={enviar} disabled={!frente || estado.fase === 'processando' || !(altura >= 10)}>
          {estado.fase === 'processando' ? 'Convertendo…' : 'Usar esta arte'}
        </button>
      </div>
      {estado.fase === 'erro' && <p className="erro-carga">Falhou: {estado.mensagem}</p>}
    </div>
  )
}
