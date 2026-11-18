# Protótipo de referência (Python)

Não é o site. Serve para validar geometria, formato 3MF e fatiamento antes do port para o navegador, e o recorte será a base da skill `importar-artes-pdf`.

| Arquivo | Função |
|---|---|
| `pdf_grade.py` | Detecta faixas da tabela, recorta rótulo/frente/verso e gera silhueta (PRD-04) |
| `gerar.py` | Lista resolvida → peças, bases, 3MF Bambu, STL, prévias e relatório (PRD-03). `--modo duas-metades\|peca-unica`, `--estilo borda\|fino`, `--traco-min` (padrão 0,45, D023), `--nome-na-base` (D022), `--relevo negativo` (experimental) |
| `fatiar_cli.py` | Fatia um 3MF com a CLI do Bambu Studio numa cópia com perfil de teste e resume trocas de filamento |
| `previa_gcode.py` | Desenha o G-code fatiado visto de cima, por filamento, para ver se o desenho sobrevive ao fatiamento |
| `lista-piloto.json` | Lista piloto resolvida, com as substituições de teste marcadas |

Comandos e resultados: `docs/evidencias/2026-11-17-geracao-piloto.md`. Python: `C:/Users/Matheus/AppData/Local/Python/pythoncore-3.14-64/python.exe -I` (com `manifold3d`).
