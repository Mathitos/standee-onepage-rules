# Standee Forge

Transforma listas do [Army Forge](https://army-forge.onepagerules.com) (One Page Rules) em standees imprimíveis: figura recortada com relevo preto, lingueta sob os pés e base separada no tamanho recomendado, exportados em 3MF (Bambu Studio, duas cores) ou STL.

> Projeto em andamento. O site importa a lista, deixa escolher a arte e a base de cada unidade e **gera o 3MF no navegador** (peça única pintada, uma unidade por placa, perfil da Bambu Lab A1). O protótipo Python (`prototipo/`) continua como referência.

## Estado

| Parte | Situação |
|---|---|
| Importar lista ("Share as Text") | Site, com testes |
| Catálogo de artes a partir do PDF | 22 facções (9 sci-fi, 13 de fantasia), 1137 artes em SVG a 600 dpi; só o HDF tem rótulos e unidades associados (8 artes) |
| Escolha de arte e base | Site: automática onde há associação; nas outras facções, o usuário escolhe pela figura |
| Geração no navegador | Site (Web Worker + manifold-3d): 3MF do Bambu com perfil da A1; lista piloto conferida contra o protótipo e fatiada pela CLI |
| Geração 3MF/STL em Python | Protótipo de referência, validado no fatiador do Bambu (CLI) |

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

As artes vêm dos PDFs gratuitos de miniaturas de papel da OPR (D006). A skill extrai as artes como **vetores SVG** (600 dpi, D020/D039) e as grava em `catalog/`, com o índice `artes.json` e o mapeamento; esses arquivos vão para o git e para o site (cerca de 300 MB de SVG, ~80 MB compactados). O **PDF não entra no git** (`*.pdf` no `.gitignore`), nem as saídas geradas (`saidas/`) e os intermediários da skill (`work/`, `review/`, `build/`).

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
