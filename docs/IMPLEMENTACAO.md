# Plano de implementação e gates

Status permitidos: TODO, IN_PROGRESS, BLOCKED, DONE. DONE exige evidência. Os tempos são esforço indicativo, não promessa de execução numa única sessão. Revisado em 17/11/2026 (ver `REVISAO-2026-11-17.md`).

| Etapa | Escopo | Dependências | Evidência para concluir |
|---|---|---|---|
| M0 — descoberta | Formato do texto, impressão, licença, schema inicial, forma física (D011) | Nenhuma | Contrato capturado (feito); fixtures de texto; decisão D011 |
| M1 — catálogo piloto | Skill de importação (PRD-04) e pacote HDF: recortes, rótulos, estilos, frente/verso, escala e bases | M0 | Skill rodada no PDF HDF; pacote aprovado cobrindo a lista piloto, nos dois estilos |
| M2 — geração no browser | Uma figura + base + cores + downloads, no(s) modo(s) de D011 | Fixtures de M1 ou sintéticas | Arquivos abrem e fatiam corretamente |
| M3 — jornada completa | Colar texto, matching, substituição, estilos, quantidades, poses, persistência | M0/M1/M2 | Lista piloto → 14 modelos corretos |
| M4 — lote e publicação | Placas, cancelamento, performance, CI e Pages | M3 + acesso GitHub | Build publicado e fluxo real testado |
| M5 — expansão | Mais facções, importação por link (proxy + termos), OCR, otimizações | MVP validado | Novos pacotes e regressões aprovados |

## Backlog ordenado

- [x] T001 — DONE 17/11. Contrato real da lista piloto, CORS bloqueado, ID inválido → 404 `null`. Sem teste de carga (proposital). Evidência: `evidencias/2026-11-17-T001-armyforge/`.
- [ ] T002 — IN_PROGRESS. "Share as Text" da lista piloto capturado (`share-as-text.txt`). Falta capturar exemplos reais de: upgrade parcial, herói anexado, unidade combinada, item que troca base, nome personalizado e lista com aliados. Montar no editor do Army Forge sem login e salvar como fixtures.
- [ ] T003 — Confirmar perfil de impressão e política de publicação das artes. Registrar defaults e pendências.
- [ ] T004 — IN_PROGRESS. Repositório git local criado (branch `main`, commits pequenos), `.gitignore` sem PDF/saídas/intermediários (artes SVG entram, D006/D020), Vite + React + TypeScript + Vitest, workflow de checks e deploy no Pages. Falta: o usuário criar o repositório no GitHub, fazer push e ativar Pages (Source: GitHub Actions); confirmar o workflow verde.
- [ ] T005 — IN_PROGRESS. Tipos da lista importada em `src/armyforge/types.ts` (NormalizedArmyList, UnitGroup, ModelVariant, ImportIssue). Faltam catálogo (unidades × artes × estilos), BaseSpec e Project.
- [x] T006 — DONE 17/11 para o formato capturado. `src/armyforge/parseShareText.ts` + 19 testes (`npm run check`): `Nx`, vírgulas dentro de parênteses, distribuição parcial/ambígua, CRLF/aspas, pontos e unidades divergentes, linha não reconhecida, sem cabeçalho, segundo exército. Novos formatos da T002 viram novos testes. Comparação de versão com o catálogo fica para quando o catálogo existir.
- [x] T007 — DONE 17/11. Skill em `.claude/skills/importar-artes-pdf/` (SKILL.md + extrair/armybook/montar). No HDF: 60 páginas de arte (30 por estilo), capa e instruções ignoradas, 218 linhas → 69 artes pareadas, idempotente, folhas de rótulo e de contato legíveis, validação de `revisao.json` com erros claros. Artes gravadas como SVG em mm (D020, `scripts/vetor.py`), versionadas.
- [ ] T008 — IN_PROGRESS. Revisão parcial pelo agente: 8 de 69 artes (piloto + 4 OGRE), rótulos conferidos nas folhas; 4 aliases propostos e OGRE Minigun `unmapped`. Falta revisar os outros 61 candidatos numa sessão própria e o usuário aprovar (`montar.py --aprovado`).
- [ ] T009 — IN_PROGRESS. Bases do piloto no `manifest.json` vindas do army book v3.6.0 (25 / 25 / oval 60×35 / 40) e escala do PDF (`mmPerPx`). Falta confirmar a geometria elíptica da oval.
- [ ] T010 — IN_PROGRESS. Protótipo Python de referência (`prototipo/gerar.py`, manifold3d) gera a lista piloto nos dois modos (duas metades e peça única) e nos dois estilos: 3MF Bambu + STL + prévias + relatório. Opções: traço mínimo (D023), relevo negativo (experimental, descartado), nome na base (D022). Falta: port para worker no navegador.
- [ ] T011 — IN_PROGRESS. Base redonda/oval (elipse) de 2 mm com fenda vazada (D021), dupla (metades) ou simples (peça única), e nome da unidade opcional na borda (D022), no protótipo; fatiada pela CLI. Falta confirmar a elipse, calibrar folgas no cupom e escolher fonte livre para o site.
- [ ] T012 — IN_PROGRESS. Fatiamento automatizado pela CLI (`prototipo/fatiar_cli.py`) e desenho do G-code por filamento (`prototipo/previa_gcode.py`). Usuário abriu na interface em 17/11: aviso de versão antiga (gerador passou a gravar 02.07.01.57; falta confirmar) e linhas internas sumindo (corrigido com traço mínimo, D023). Falta reabrir na interface e imprimir. Evidência: `evidencias/2026-11-17-geracao-piloto.md`.
- [ ] T013 — IN_PROGRESS. Etapa 1 pronta: colar texto, ver totais, armas por modelo, alertas, linhas não reconhecidas, baixar JSON; texto salvo no navegador. Faltam: ler o catálogo do repositório (artes SVG), associação, substituição com imagem, estilo, modo, pose, quantidade, prévia e download dos arquivos.
- [ ] T014 — Persistência local, import/export de projeto, migrações e erro de quota.
- [ ] T015 — Instâncias reutilizadas no 3MF, separação em placas e verificação de colisão/limites.
- [ ] T016 — Testar jornada com lista piloto, contagens e equipamentos; comparar manifesto e fatiador.
- [ ] T017 — Cupom de encaixe e teste físico pelo usuário; incorporar calibração aprovada.
- [ ] T018 — Configurar Pages, publicar e testar URL final/subpath. Publicação das artes decidida pelo usuário (D006).
- [ ] T019 — Preparar guia de cadastro de facções e issues de melhorias pós-MVP.
- [ ] T020 — Cupom de calibração dos dois modos: fenda simples e dupla, furos/pinos (E1) e só cola (E2). D011 já decidido (os dois modos são opção); o cupom define folgas. Primeira impressão de teste: lista piloto em duas metades (já gerada).

## Regras de avanço

- Importação por link está fora do MVP e não pode ser apresentada como disponível.
- Catálogo faltante não bloqueia fixture sintética, mas bloqueia o aceite da lista piloto.
- T010/T011 só fecham com os dois modos (D011) e os dois estilos (D012).
- Acesso GitHub faltante não bloqueia desenvolvimento local; bloqueia somente publicação.
- Impressão física faltante não bloqueia beta identificada, mas bloqueia afirmar que o encaixe foi validado fisicamente.
- Interface bonita, ZIP válido e malha fechada isoladamente não encerram o gate do fatiador.

## Testes prioritários

1. Contagem: `2x Veterans [3]` gera 6 instâncias, não 2 nem 3.
2. Upgrade parcial: uma arma especial em 3 modelos gera uma variante especial e duas comuns, com confirmação.
3. Exportação: cores nas camadas esperadas para o modo; relevo preservado no topo.
4. Frente/verso: contornos coincidem após espelhamento; um único espelhamento por face vista de baixo.
5. Forma: diâmetro/eixos da base dentro da tolerância, fenda com fundo fechado.
6. Substituição: variante sem arte não gera arquivo até o usuário escolher; escolha aparece no manifesto.
7. Layout: projeto maior que uma mesa é distribuído sem redimensionamento automático.
8. Falhas: texto inválido, versão diferente e pacote ausente exigem revisão, sem valores fictícios.
9. Retomada: exportar projeto, fechar app, reimportar e obter mesmas quantidades/medidas/cores/estilos/substituições.
