import { describe, expect, it } from 'vitest'
import { entradaMudou } from '../src/ui/versao'

// relato de 24/11: aba aberta antes do deploy, o worker antigo não existe mais e o site dizia só
// "Falhou: falha no worker"
describe('site atualizado com a página aberta', () => {
  const publicado = '<script type="module" crossorigin src="/standee-onepage-rules/assets/index-CnNFnQ_b.js"></script>'

  it('outro script de entrada publicado: mudou', () => {
    expect(entradaMudou(publicado, 'https://mathitos.github.io/standee-onepage-rules/assets/index-Bx9_k2aQ.js')).toBe(true)
  })

  it('o mesmo script: não mudou', () => {
    expect(entradaMudou(publicado, 'https://mathitos.github.io/standee-onepage-rules/assets/index-CnNFnQ_b.js')).toBe(false)
  })

  it('servidor de desenvolvimento ou HTML sem script de entrada: não diz que mudou', () => {
    expect(entradaMudou(publicado, undefined)).toBe(false)
    expect(entradaMudou('<html>erro 503</html>', 'https://x/assets/index-CnNFnQ_b.js')).toBe(false)
  })
})
