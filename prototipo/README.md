# Protótipo de referência (Python)

Não é o site. Serve para validar geometria, formato 3MF e fatiamento antes do port para o navegador, e o recorte será a base da skill `importar-artes-pdf`.

| Arquivo | Função |
|---|---|
| `pdf_grade.py` | Detecta faixas da tabela (a 300 dpi), recorta rótulo/frente/verso (na resolução pedida; a arte do HDF é 600 dpi) e gera silhueta (PRD-04) |
| `gerar.py` | Lista resolvida → um projeto 3MF Bambu (placas "Figuras" e "Bases", perfil da A1 embutido, D026), STL, prévias e relatório (PRD-03). `--modo duas-metades\|peca-unica`, `--estilo borda\|fino`, `--bico` (padrão 0,2), `--traco original\|engrossado` (D024), `--paredes arachne\|classic\|perfil` (D025), `--acabamento preto-relevo\|branco-relevo\|pintado` (D028; na peça única, preto-relevo ou pintado sem relevo, D032), `--encaixe base|gabarito|pinos` (padrão base, D031; D029), `--encaixe-base retangular|mola|conico` (padrão retangular, D042; mola testada e reprovada, D043, com `--mola-lamina MM`; cônico, D031; a lista pode pedir `"bases_teste"` por modelo, com encaixe, lâmina e rótulo de cada base), \|gabarito\|pinos` (padrão base, D031; D029), `--estilo fino` por padrão (D030), `--nome-na-base` (D022; com o número da unidade na borda de trás, D035, `--sem-numero` desliga), `--face-mm MM` (espessura do desenho rente em cada face, padrão 0,4), `--miolo preto\|branco` (pintado: peça preta com branco só no desenho, padrão, D036), `--lateral-preta MM` (faixa preta na borda, padrão 0,3, D034), `--placas unidade\|acabamento` (padrão unidade: uma placa por unidade, com as bases, D037), `--bases-junto auto\|sim\|nao` (com `--placas acabamento`: bases na placa das figuras; auto = na peça única ou com lateral preta, D033), `--relevo negativo` (experimental), `--so ARTE` (diagnóstico) |
| `perfil_bambu.py` | `project_settings.config` da A1 (bico 0,2 ou 0,4, branco/preto) gerado pela CLI do Bambu com os valores dos perfis de sistema; cache em `prototipo/.cache/` (fora do git) |
| `fatiar_cli.py` | Fatia um 3MF com a CLI do Bambu Studio numa cópia com o perfil de sistema (valores resolvidos copiados por cima) e resume trocas de filamento. `--bico 0.2\|0.4` escolhe os perfis da A1 |
| `verificar_encaixe.py` | Corta as malhas geradas e põe a figura de pé na base: mede a folga barra–base com as linguetas assentadas, quanto a figura sobe se deslocada ou inclinada, e o efeito de um erro de largura da impressora (D031). `--png` desenha o corte |
| `previa_gcode.py` | Desenha o G-code fatiado visto de cima, por filamento, com a largura de cada cordão, para ver se o desenho sobrevive ao fatiamento |
| `lista-piloto.json` | Lista piloto resolvida, com as substituições de teste marcadas |
| `lista-teste-peca-unica.json` | Teste de impressão: 1 miniatura de cada arte em peça única sem relevo (D032) |
| `lista-teste-acabamento.json` | Teste de impressão: 1 miniatura de cada arte e a Infantry Rifle nos três acabamentos (campo `acabamento` por modelo) |
| `lista-teste-duas-metades.json` | Teste de 21/11: Infantry Rifle em duas metades, pintado (com `--face-mm 0.1`, desenho só na primeira camada) e branco em relevo; com `--placas unidade`, cada acabamento da mesma unidade vai numa placa própria, com a sua base |
| `lista-teste-mola.json` | Teste de 22/11 (D043): Infantry Rifle em duas metades, preto em relevo (D045), com três bases na mesma placa (`bases_teste`): RETA, MOLA 0,8 e MOLA 0,6, rótulo na borda de trás. Impresso: a RETA ficou melhor |

Comandos e resultados: `docs/evidencias/2026-11-17-geracao-piloto.md`. Python: `C:/Users/Matheus/AppData/Local/Python/pythoncore-3.14-64/python.exe -I` (com `manifold3d`).
