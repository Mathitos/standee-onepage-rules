# Checkpoint atual — 17/11/2026 (noite, trabalho autônomo)

## Objetivo

Site (GitHub Pages) que gera standees STL/3MF a partir de listas do Army Forge. Planejamento revisado com o usuário. Repositório git local criado; site com a etapa 1 (importar lista); protótipo Python gera e valida 3MF nos dois modos e dois estilos.

## Repositório

- Git local em `C:\Users\Matheus\Desktop\dev\standee-onepage-rules`, branch `main`, **sem remoto** (o usuário cria o repositório no GitHub e faz o push). Commits pequenos; ver `git log`.
- No git: artes vetorizadas (SVG) do catálogo, manifestos, revisões e snapshots do army book (D006 decidida, D020). Fora do git: `*.pdf`, `saidas/` e intermediários da skill (`work/`, `review/`, `build/`).
- `npm run check` (tipos + 19 testes) e `npm run build` passam localmente. Workflow `.github/workflows/pages.yml`: checks em push/PR, deploy da `main` no Pages. **Ainda não rodou no GitHub.**
- `npm audit`: 0 vulnerabilidades em dependências de produção; alerta "high" de ReDoS no `picomatch` só em ferramentas de desenvolvimento (não corrigido às cegas).

## Estado real

- **Importação**: API do Army Forge sem CORS; MVP importa o "Share as Text" (D010). Parser em `src/armyforge/parseShareText.ts` com testes (T006). Tela da etapa 1 em `src/ui/App.tsx`, testada no navegador embutido (desktop e 375 px).
- **Lista piloto**: Infantry Squad 1×3, Combat Bikers 1×3, Veterans 2×3, OGRE Robot 2×1 → 14 modelos, 780 pts.
- **PDF**: `prototipo/pdf_grade.py` extrai 218 linhas (109 por estilo), rótulo fora da tabela nos dois estilos.
- **Geração (protótipo Python)**: `prototipo/gerar.py --modo duas-metades|peca-unica --estilo borda|fino`. Saídas em `saidas/piloto-<modo>-<estilo>/` com LEIA-ME. Fatiador do Bambu (CLI, perfil A1 0,4 de teste) aceitou: duas metades = 1 troca/placa; peça única = 3 trocas/placa. Detalhes: `evidencias/2026-11-17-geracao-piloto.md`.
- Substituições usadas só no teste: OGRE Minigun no lugar de Gatling; Bikers 2 Pistol + 1 Lance.
- **Interface do Bambu (17/11, usuário)**: aviso "versão antiga" e linhas internas do desenho sumindo. Causa das linhas: traços de 0,17–0,24 mm, mais finos que o bico 0,4. Corrigido com traço mínimo 0,45 mm (D023, comparado no G-code) e versão 02.07.01.57 no 3MF. Falta o usuário reabrir os arquivos novos.
- **Base nova (D021/D022)**: 2 mm, fenda vazada, lingueta 1,9 mm; nome da unidade na borda (opção `--nome-na-base`, ligada nos arquivos de teste). Evidência: `evidencias/2026-11-17-traco-e-base.md`.
- **Não validado**: impressão física, workflow no GitHub.
- **Skill `importar-artes-pdf` pronta (T007)** em `.claude/skills/importar-artes-pdf/`. Rodada no PDF HDF: 69 artes pareadas (fino × borda). Pacote parcial em `catalog/gff/human-defense-force/` com as 8 artes do piloto, agora em SVG (D020): 32 arquivos, 3,6 MB, silhueta com IoU ≥ 0,998 e diferenças da tinta só na faixa de 1 px da borda; conferidos no navegador. Revisão completa (T008) pendente.
- Achado: 13 artes têm frente e verso com silhuetas diferentes (capas dos Storm Troopers); política de contorno pendente do usuário (PRD-03).
- Processo `bambu-studio.exe` PID 37008 (17/11 18:34) veio de uma execução da CLI que travou e não pôde ser encerrado nem com `taskkill`; reiniciar o Windows deve limpar. PIDs 32380 (16/11 20:11) e 13004 (17/11 16:10) são sessões da interface do Bambu Studio (logs `studio_*_32380`, `studio_*_13004`); não foram tocados.

## Localização

- PDF: `C:\Users\Matheus\Downloads\Human_Defense_Force_-_BW.pdf` (SHA-256 `b17c9ba4…d719fc`)
- Python: `C:\Users\Matheus\AppData\Local\Python\pythoncore-3.14-64\python.exe` (3.14.4) com numpy, opencv, scipy, scikit-image, trimesh, pymupdf, manifold3d. Aliases `python`/`py` não confiáveis.
- Node 24 / npm 12. Bambu Studio: `C:\Program Files\Bambu Studio\bambu-studio.exe`.
- Protótipos antigos (substituídos): `C:\Users\Matheus\Documents\Codex\2026-11-17\new-chat`.

## Próxima ação

1. **Usuário**: criar o repositório no GitHub, `git remote add origin …`, `git push -u origin main`, ativar Pages (Settings → Pages → Source: GitHub Actions) e conferir o site publicado.
2. **Usuário**: reabrir no Bambu Studio os arquivos regerados em `saidas/piloto-duas-metades-borda/` (traço mínimo, base de 2 mm com nome), confirmar se o aviso de versão sumiu e imprimir uma figura + base.
3. **Usuário**: decidir aliases propostos (Rifle → Battle Rifle, Baton → Shock Baton, Axe → Energy Axe, "Lance") e a política de silhuetas diferentes (capas).
4. Agente: T008 (revisar os 61 candidatos restantes numa sessão própria com a skill), T002 (casos especiais do texto), T005 (schemas do catálogo e do projeto no site), depois a etapa 2 do site (ler o catálogo do repositório, mostrar as artes em SVG e associar). O gerador do protótipo ainda lê o PDF; o port para o navegador deve ler os SVGs.

## Perguntas abertas

- Resultado da abertura e da impressão (pinos, fenda, legibilidade).
- GitHub (nome do repositório, público ou privado), uso pessoal/público das artes, impressora e bico. Não pedir tokens ou senhas.
