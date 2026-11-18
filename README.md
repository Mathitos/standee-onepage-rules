# Standee Forge

Transforma listas do [Army Forge](https://army-forge.onepagerules.com) (One Page Rules) em standees imprimíveis: figura recortada com relevo preto, lingueta sob os pés e base separada no tamanho recomendado, exportados em 3MF (Bambu Studio, duas cores) ou STL.

> Projeto em andamento. Hoje o site faz só a **etapa 1** (importar e conferir a lista). A geração de 3MF/STL existe num protótipo Python fora do site (`prototipo/`).

## Estado

| Parte | Situação |
|---|---|
| Importar lista ("Share as Text") | Site, com testes |
| Catálogo de artes a partir do PDF | Skill `importar-artes-pdf` pronta, artes em SVG; pacote HDF com 8 de 69 artes revisadas |
| Geração 3MF/STL | Protótipo Python, validado no fatiador do Bambu (CLI) |
| Geração no navegador | Não iniciado |

Detalhes: [`docs/STATUS.md`](docs/STATUS.md). Plano e decisões: [`docs/README.md`](docs/README.md).

## Rodar o site localmente

Requer Node 24.

```bash
npm ci
npm run dev
```

```bash
npm run check   # tipos + testes
npm run build   # gera dist/
```

## Publicar no GitHub Pages

1. Crie o repositório no GitHub e faça push da branch `main`.
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` roda checks e build em todo push/PR e publica a `main`. O site usa caminhos relativos, então funciona em `https://<usuario>.github.io/<repositorio>/`.

## Artes e licença

As artes vêm dos PDFs gratuitos de miniaturas de papel da OPR (D006). A skill extrai as artes como **vetores SVG em mm** e as grava em `catalog/` com o mapeamento (D020); esses arquivos vão para o git e para o site. O **PDF não entra no git** (`*.pdf` no `.gitignore`), nem as saídas geradas (`saidas/`) e os intermediários da skill (`work/`, `review/`, `build/`).

## Estrutura

```text
src/armyforge/   importação da lista (parser + tipos)
src/ui/          telas
tests/           testes (Vitest) e fixtures
prototipo/       gerador Python de referência (recorte do PDF, 3MF/STL, fatiamento)
.claude/skills/  skill importar-artes-pdf (PDF da OPR -> pacote do catálogo)
catalog/         por facção: manifesto, revisão, army book e artes em SVG
docs/            PRDs, decisões, status, evidências
```
