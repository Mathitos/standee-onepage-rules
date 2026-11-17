# Checkpoint atual — 17/11/2026 (noite)

## Objetivo

Site (preferencialmente GitHub Pages) que gera standees STL/3MF a partir de listas do Army Forge. O site ainda não começou. Planejamento revisado com o usuário; primeira geração de teste feita com um protótipo Python.

## Estado real

- **Importação**: API do Army Forge pública, mas sem CORS (o Pages não lê o link). MVP importa o texto do "Share as Text" (D010). Exemplo real em `evidencias/2026-11-17-T001-armyforge/share-as-text.txt`. T001 DONE; T002 em andamento (faltam casos especiais).
- **Lista piloto**: Infantry Squad 1×3 (Battle Rifle), Combat Bikers 1×3 (Pistol + Hunting Lance), Veterans 2×3 (Shotgun), OGRE Robot 2×1 (Gatling Gun). 14 modelos, 780 de 800 pts. Bases: 25, 60x35, 25, 40 mm.
- **PDF**: raster 300 dpi sem texto. p2–31 contorno fino, p32–61 a mesma arte com borda grossa. Cada linha: aba | frente | verso | aba, frente e verso de mesma largura; rótulo é texto **fora da tabela**, nos dois estilos. `prototipo/pdf_grade.py` extrai 218 linhas (109 por estilo), todas com rótulo.
- **Decisões do usuário**: D010 texto; D011 peça única ou duas metades como **opção de geração**; D012 dois estilos como variantes; D013 substituição escolhida vendo a imagem; D017 catálogo via skill (PRD-04, ainda não construída).
- **Geração de teste (pedido do usuário)**: lista piloto em duas metades + borda grossa gerada por `prototipo/gerar.py` em `saidas/piloto-duas-metades-borda/`. Malhas fechadas; **fatiador Bambu (CLI, perfil A1 0,4 de teste) aceitou figuras e bases**, com 1 troca de filamento a 1,4 mm. Detalhes e aprendizados do formato 3MF do Bambu em `evidencias/2026-11-17-geracao-piloto.md`.
- Substituições usadas só no teste: OGRE Minigun no lugar de Gatling; Bikers 2 Pistol + 1 Lance.
- Não validado: abrir na interface do Bambu Studio (o arquivo sem perfil não pode ser testado na CLI), impressão física, modo peça única (não implementado), estilo fino (não gerado).
- Nenhum repositório git (nem local) e nenhum site publicado.

## Localização

- Projeto: `C:\Users\Matheus\Desktop\dev\standee-onepage-rules` (`docs/`, `prototipo/`, `saidas/`)
- Protótipos antigos: `C:\Users\Matheus\Documents\Codex\2026-11-17\new-chat` (substituídos por `prototipo/` para a geração)
- PDF: `C:\Users\Matheus\Downloads\Human_Defense_Force_-_BW.pdf` (SHA-256 `b17c9ba4…d719fc`)
- Python: `C:\Users\Matheus\AppData\Local\Python\pythoncore-3.14-64\python.exe` (3.14.4). Aliases `python`/`py` não confiáveis. Pacotes: numpy, opencv, scipy, scikit-image, trimesh, pymupdf, **manifold3d** (instalado em 17/11).
- Bambu Studio: `C:\Program Files\Bambu Studio\bambu-studio.exe` (CLI usada por `prototipo/fatiar_cli.py`).

## Próxima ação

1. Usuário abre `saidas/piloto-duas-metades-borda/figuras-duas-metades-borda.3mf` no Bambu Studio e, se possível, imprime uma figura + base (T012/T017). Se o arquivo sem perfil falhar, usar a cópia `fatiamento-cli/figuras/…-com-perfil-teste.3mf`.
2. Implementar o modo peça única e o estilo fino no protótipo (T010/T011), validando com `fatiar_cli.py`.
3. Construir a skill `importar-artes-pdf` (T007) a partir de `prototipo/pdf_grade.py`; depois T005/T006.

## Perguntas abertas

- Resultado da abertura e da impressão de teste (encaixe dos pinos, fenda, legibilidade do relevo).
- Pendentes anteriores, que não bloqueiam: GitHub, uso pessoal/público, impressora e bico. Não pedir tokens ou senhas.
