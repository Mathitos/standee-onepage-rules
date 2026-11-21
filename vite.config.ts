import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'

const CATALOGO = resolve(import.meta.dirname, 'catalog')
// só o que é público vai para o site: índice, manifesto e artes (D006/D039); work/, review/ e build/ nunca
const PERMITIDO =
  /^[a-z0-9-]+\/[a-z0-9-]+\/(artes\.json|manifest\.json|arts\/[a-z0-9-]+\/((fino|borda)\/(frente|verso)\.svg|rotulo\.png))$/
const TIPOS: Record<string, string> = { json: 'application/json', svg: 'image/svg+xml', png: 'image/png' }

/** catalogo/index.json: as facções com artes exportadas (catalog/<sistema>/<facção>/artes.json). */
function indiceCatalogo() {
  const faccoes: Record<string, unknown>[] = []
  if (!existsSync(CATALOGO)) return { faccoes }
  for (const sistema of readdirSync(CATALOGO)) {
    const pasta = join(CATALOGO, sistema)
    if (!statSync(pasta).isDirectory()) continue
    for (const slug of readdirSync(pasta)) {
      const arq = join(pasta, slug, 'artes.json')
      if (!existsSync(arq)) continue
      const a = JSON.parse(readFileSync(arq, 'utf8'))
      faccoes.push({
        sistema, slug, caminho: `${sistema}/${slug}`, faccao: a.faccao, artes: a.artes.length,
        manifesto: existsSync(join(pasta, slug, 'manifest.json')),
      })
    }
  }
  faccoes.sort((x, y) => String(x.faccao).localeCompare(String(y.faccao)))
  return { faccoes }
}

function catalogo(): Plugin {
  let saida = 'dist'
  return {
    name: 'standee-forge-catalogo',
    configResolved(c) {
      saida = resolve(c.root, c.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /^\/catalogo\/([^?#]*)/.exec(decodeURIComponent(req.url ?? ''))
        if (!m) return next()
        if (m[1] === 'index.json') {
          res.setHeader('Content-Type', TIPOS.json)
          res.end(JSON.stringify(indiceCatalogo()))
          return
        }
        const arq = join(CATALOGO, m[1])
        if (!PERMITIDO.test(m[1]) || !existsSync(arq)) {
          res.statusCode = 404
          res.end()
          return
        }
        res.setHeader('Content-Type', TIPOS[m[1].split('.').pop()!] ?? 'application/octet-stream')
        res.end(readFileSync(arq))
      })
    },
    closeBundle() {
      const destino = join(saida, 'catalogo')
      mkdirSync(destino, { recursive: true })
      cpSync(CATALOGO, destino, {
        recursive: true,
        filter: (src) => {
          const rel = relative(CATALOGO, src).split(sep).join('/')
          if (!rel) return true
          if (statSync(src).isDirectory()) return !/(^|\/)(work|review|build|armybook)(\/|$)/.test(rel)
          return PERMITIDO.test(rel)
        },
      })
      writeFileSync(join(destino, 'index.json'), JSON.stringify(indiceCatalogo()))
    },
  }
}

// base relativa: funciona no GitHub Pages em qualquer subcaminho (/<repo>/)
export default defineConfig({
  base: './',
  plugins: [react(), catalogo()],
  worker: { format: 'es' },
  // otimizadas já na partida: descobertas só quando o worker abre, recarregavam a página no meio da geração
  optimizeDeps: { include: ['fflate', 'opentype.js', 'manifold-3d', 'manifold-3d/lib/garbage-collector.js'] },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
