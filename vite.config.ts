import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'
import { basesDosArmyBooks, type LivroArmyForge } from './src/catalogo/basesArmyBook.ts'

const CATALOGO = resolve(import.meta.dirname, 'catalog')
// só o que é público vai para o site: índice, manifesto e artes (D006/D039); work/, review/ e build/ nunca
const PERMITIDO =
  /^[a-z0-9-]+\/[a-z0-9-]+\/(artes\.json|manifest\.json|arts\/[a-z0-9-]+\/((fino|borda)\/(frente|verso)\.svg|rotulo\.png))$/
const TIPOS: Record<string, string> = { json: 'application/json', svg: 'image/svg+xml', png: 'image/png' }

/** Snapshots dos army books da facção (armybook/*-gs<N>-v<versão>.json, sem os resumos). */
function arquivosArmyBook(pastaFaccao: string): string[] {
  const pasta = join(pastaFaccao, 'armybook')
  if (!existsSync(pasta)) return []
  return readdirSync(pasta).filter((f) => /-gs\d+-v[^/]*\.json$/.test(f) && !f.endsWith('.resumo.json')).sort().map((f) => join(pasta, f))
}

/**
 * catalogo/<sistema>/<facção>/bases.json: a base de todas as unidades dos army books, não só das
 * que têm arte no manifesto (D015). Os army books em si não vão para o site.
 */
function basesJson(pastaFaccao: string) {
  return basesDosArmyBooks(arquivosArmyBook(pastaFaccao).map((f) => JSON.parse(readFileSync(f, 'utf8')) as LivroArmyForge))
}

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
      const arqManifesto = join(pasta, slug, 'manifest.json')
      const m = existsSync(arqManifesto) ? JSON.parse(readFileSync(arqManifesto, 'utf8')) : null
      const livros: { name?: string }[] = m ? (m.armyBooks ?? [m.armyBook]) : []
      faccoes.push({
        sistema, slug, caminho: `${sistema}/${slug}`, faccao: a.faccao, artes: a.artes.length,
        manifesto: !!m,
        bases: arquivosArmyBook(join(pasta, slug)).length > 0,
        exercitos: [...new Set(livros.map((l) => l?.name).filter(Boolean))],
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
        const b = /^([a-z0-9-]+\/[a-z0-9-]+)\/bases\.json$/.exec(m[1])
        if (b && arquivosArmyBook(join(CATALOGO, b[1])).length) {
          res.setHeader('Content-Type', TIPOS.json)
          res.end(JSON.stringify(basesJson(join(CATALOGO, b[1]))))
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
      const indice = indiceCatalogo()
      writeFileSync(join(destino, 'index.json'), JSON.stringify(indice))
      for (const f of indice.faccoes) {
        if (f.bases) writeFileSync(join(destino, String(f.caminho), 'bases.json'), JSON.stringify(basesJson(join(CATALOGO, String(f.caminho)))))
      }
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
