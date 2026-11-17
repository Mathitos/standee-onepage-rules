# Checkpoint atual — 17/11/2026 (noite, trabalho autônomo)

## Objetivo

Site (GitHub Pages) que gera standees STL/3MF a partir de listas do Army Forge. Planejamento revisado com o usuário. Repositório git local criado; site com a etapa 1 (importar lista); protótipo Python gera e valida 3MF nos dois modos e dois estilos.

## Repositório

- Git local em `C:\Users\Matheus\Desktop\dev\standee-onepage-rules`, branch `main`, **sem remoto** (o usuário cria o repositório no GitHub e faz o push). Commits pequenos; ver `git log`.
- Fora do git (`.gitignore`, D006): `*.pdf`, `saidas/`, imagens/snapshots do catálogo, `docs/evidencias/**/armybook-*.json`.
- `npm run check` (tipos + 19 testes) e `npm run build` passam localmente. Workflow `.github/workflows/pages.yml`: checks em push/PR, deploy da `main` no Pages. **Ainda não rodou no GitHub.**
- `npm audit`: 0 vulnerabilidades em dependências de produção; alerta "high" de ReDoS no `picomatch` só em ferramentas de desenvolvimento (não corrigido às cegas).

## Estado real

- **Importação**: API do Army Forge sem CORS; MVP importa o "Share as Text" (D010). Parser em `src/armyforge/parseShareText.ts` com testes (T006). Tela da etapa 1 em `src/ui/App.tsx`, testada no navegador embutido (desktop e 375 px).
- **Lista piloto**: Infantry Squad 1×3, Combat Bikers 1×3, Veterans 2×3, OGRE Robot 2×1 → 14 modelos, 780 pts.
- **PDF**: `prototipo/pdf_grade.py` extrai 218 linhas (109 por estilo), rótulo fora da tabela nos dois estilos.
- **Geração (protótipo Python)**: `prototipo/gerar.py --modo duas-metades|peca-unica --estilo borda|fino`. Saídas em `saidas/piloto-<modo>-<estilo>/` com LEIA-ME. Fatiador do Bambu (CLI, perfil A1 0,4 de teste) aceitou: duas metades = 1 troca/placa; peça única = 3 trocas/placa. Detalhes: `evidencias/2026-11-17-geracao-piloto.md`.
- Substituições usadas só no teste: OGRE Minigun no lugar de Gatling; Bikers 2 Pistol + 1 Lance.
- **Não validado**: abrir na interface do Bambu Studio, impressão física, workflow no GitHub.
- **Skill `importar-artes-pdf` pronta (T007)** em `.claude/skills/importar-artes-pdf/`. Rodada no PDF HDF: 69 artes pareadas (fino × borda). Pacote parcial em `catalog/gff/human-defense-force/` com as 8 artes do piloto (`revisao.json` e `manifest.json` no git; imagens e ZIP fora). Revisão completa (T008) pendente.
- Achado: 13 artes têm frente e verso com silhuetas diferentes (capas dos Storm Troopers); política de contorno pendente do usuário (PRD-03).
- Processo `bambu-studio.exe` PID 37008 (17/11 18:34) veio de uma execução da CLI que travou e não pôde ser encerrado nem com `taskkill`; reiniciar o Windows deve limpar. Há ainda PIDs 32380 (16/11 20:11) e 13004 (17/11 16:10), de origem não verificada (podem ser a interface aberta); não foram tocados.

## Localização

- PDF: `C:\Users\Matheus\Downloads\Human_Defense_Force_-_BW.pdf` (SHA-256 `b17c9ba4…d719fc`)
- Python: `C:\Users\Matheus\AppData\Local\Python\pythoncore-3.14-64\python.exe` (3.14.4) com numpy, opencv, scipy, scikit-image, trimesh, pymupdf, manifold3d. Aliases `python`/`py` não confiáveis.
- Node 24 / npm 12. Bambu Studio: `C:\Program Files\Bambu Studio\bambu-studio.exe`.
- Protótipos antigos (substituídos): `C:\Users\Matheus\Documents\Codex\2026-11-17\new-chat`.

## Próxima ação

1. **Usuário**: criar o repositório no GitHub, `git remote add origin …`, `git push -u origin main`, ativar Pages (Settings → Pages → Source: GitHub Actions) e conferir o site publicado.
2. **Usuário**: abrir no Bambu Studio `saidas/piloto-duas-metades-borda/figuras-duas-metades-borda.3mf` (e, se quiser, a peça única) e imprimir uma figura + base.
3. **Usuário**: decidir aliases propostos (Rifle → Battle Rifle, Baton → Shock Baton, Axe → Energy Axe, "Lance") e a política de silhuetas diferentes (capas).
4. Agente: T008 (revisar os 61 candidatos restantes numa sessão própria com a skill), T002 (casos especiais do texto), T005 (schemas do catálogo e do projeto no site), depois a etapa 2 do site (carregar o pacote ZIP e associar artes).

## Perguntas abertas

- Resultado da abertura e da impressão (pinos, fenda, legibilidade).
- GitHub (nome do repositório, público ou privado), uso pessoal/público das artes, impressora e bico. Não pedir tokens ou senhas.
