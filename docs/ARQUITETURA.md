# Arquitetura proposta

## Implantação

Frontend estático no GitHub Pages. Catálogo público permitido como JSON e assets versionados; pacotes pessoais em IndexedDB. Geração de malha/exportação em Web Worker, com WebAssembly se benchmarks justificarem. O GitHub Pages não executará o Python por requisição.

T001 comprovou que a API do Army Forge não envia cabeçalhos CORS: o Pages não consegue ler o link. O MVP não chama o Army Forge; a lista entra como texto colado (D010) e bases/IDs vêm do catálogo (D015). Não há servidor. Uma função intermediária (por exemplo Cloudflare Worker) para o modo link fica fora do MVP e depende de verificar termos de uso; nunca usar proxy público genérico.

## Stack

Adotada no esqueleto em 17/11/2026 (D019): Vite 8, React 19, TypeScript 7, Vitest 5, Node 24. Geometria no navegador ainda não iniciada; candidata: manifold-3d (WebAssembly), a mesma biblioteca do protótipo Python (D018).

### Stack proposta originalmente

- TypeScript, Vite, React para interface e estado do projeto.
- Web Worker para malhas e arquivos; mensagens com job ID, progresso, cancelamento e erros.
- IndexedDB para imagens e projetos locais; JSON versionado para catálogo/manifestos.
- Visualizador 3D baseado em Three.js, a confirmar na implementação.
- Python nos scripts da skill de catálogo (D017, PRD-04) e como referência de testes, não como runtime do Pages.
- CI no GitHub Actions: checks, testes, build e deploy do artefato estático, respeitando subdiretório do repositório.

Antes de escolher bibliotecas geométricas/3MF, verificar manutenção, licença, compatibilidade com navegador e preservação de partes/cores no Bambu Studio. Não migrar o algoritmo cegamente.

## Módulos

| Módulo | Entrada | Saída |
|---|---|---|
| armyforge-adapter | Texto "Share as Text" colado | Lista normalizada, linhas não reconhecidas e proveniência |
| catalog | Pacote versionado | Assets e metadados validados |
| matcher | Modelos/equipamentos + catálogo | Associações e pendências |
| geometry-worker | Masks, escala, cores, encaixe | Malhas e relatório geométrico |
| base-generator | Forma, medidas, fenda | Base fechada |
| plate-layout | Instâncias e perfil de mesa | Placas sem colisão |
| exporters | Malhas, cores e instâncias | STL/3MF/ZIP |
| project-store | Estado versionado | Projeto local e backup exportável |

## Contratos

`NormalizedArmyList`: gameSystem, armyBookRefs, source, capturedAt, groups, warnings.
`ModelRequest`: unitRef, equipment, count, variants, sourceGroupId.
`ResolvedModel`: assetId/version, physicalScale, baseSpec, quantity, overrides, reviewStatus.
`GenerationJob`: projectSnapshotHash, settings, resolvedModels, printerBed; snapshot imutável.
`GenerationResult`: downloads, manifest, geometryChecks, warnings, duration; registrar versão do gerador.

Usar schemas validados e migrações versionadas. Não armazenar tokens, cookies ou credenciais nos arquivos do projeto.

## Integração e proteção operacional

- Army Forge: o site não faz requisições no MVP. O curador consulta o army book ao montar o catálogo e grava versão e data.
- Proxy futuro, se aprovado: allowlist de domínio/rotas, limite de tamanho e tempo, cache, validação de resposta e rate limiting. Não aceitar URL arbitrária.
- Texto colado: limite de tamanho, parser sem `eval`/regex catastrófica, nenhum HTML interpretado.
- Upload de pacote: limites de arquivos/tamanho, evitar ZIP traversal e decompression bombs, aceitar formatos de imagem conhecidos.
- Texto não reconhecido, versão diferente do catálogo e pacote ausente são estados distintos na UI.
- Arquivos pesados não entram automaticamente no repositório. Avaliar limite real de assets após o pacote piloto.

## Organização futura do repositório

```text
docs/                   PRDs, ADRs e workflow
docs/session/           STATUS, tarefas e histórico
src/armyforge/          adaptador de lista
src/catalog/            schemas e matching
src/geometry/           geração e worker
src/export/             STL e 3MF
src/ui/                 telas
.claude/skills/importar-artes-pdf/   skill de catálogo: SKILL.md + scripts Python (PRD-04)
catalog/<sistema>/<faccao>/          manifest.json versionado; arts/, armybook/, review/, build/ no .gitignore até D006
tests/fixtures/         casos pequenos e permitidos
.github/workflows/      build e deploy
```

Fixtures não devem embutir todo o PDF ou artes não liberadas no repositório público. Fixtures geométricas sintéticas podem testar a exportação sem depender de arte OPR.
