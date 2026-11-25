/**
 * Site atualizado com a página aberta. Os arquivos do build têm hash no nome, e cada deploy no
 * GitHub Pages apaga os da versão anterior. Numa aba aberta antes do deploy, o worker do gerador
 * (ou o módulo do PDF) não carrega mais, e o navegador só avisa "erro", sem motivo: o site
 * mostrava "Falhou: falha no worker" (relato do usuário em 24/11, com a lista que gera normalmente
 * numa aba nova).
 */

/** Script de entrada do build no HTML, ex.: assets/index-CnNFnQ_b.js. */
const ENTRADA = /assets\/index-[\w-]+\.js/

/**
 * O HTML publicado agora aponta para outro script de entrada que não o desta página? Sem script
 * de entrada com hash (servidor de desenvolvimento) ou sem HTML legível, responde que não.
 */
export function entradaMudou(htmlPublicado: string, srcDestaPagina: string | null | undefined): boolean {
  const publicada = htmlPublicado.match(ENTRADA)?.[0]
  const atual = srcDestaPagina?.match(ENTRADA)?.[0]
  return !!publicada && !!atual && publicada !== atual
}

/** Busca o index.html publicado, sem cache, e compara com o script que esta página carregou. */
export async function siteAtualizado(): Promise<boolean> {
  const src = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]')?.src
  if (!src) return false
  try {
    const r = await fetch(new URL('./', location.href), { cache: 'no-store' })
    return r.ok && entradaMudou(await r.text(), src)
  } catch {
    return false
  }
}

export const MENSAGEM_ATUALIZADO =
  'O site foi atualizado depois que esta página abriu, e a versão antiga do gerador não existe mais. ' +
  'Recarregue a página e gere de novo: o texto da lista fica salvo, mas as artes escolhidas à mão ' +
  'precisam ser escolhidas de novo.'
