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
- [ ] T004 — Criar repositório/checkout com este pacote em `docs/`; configurar build mínimo e checks.
- [ ] T005 — Definir schemas: ArmyList (do texto), catálogo (unidades × artes × estilos), BaseSpec (com valor bruto), Project (substituições, estilo, modo físico). Incluir unknown/none/ambiguous.
- [ ] T006 — Parser do texto e testes: `Nx`, vírgulas dentro de parênteses, distribuição parcial, versão diferente, linha não reconhecida, CRLF/aspas, total de pontos.
- [ ] T007 — Criar a skill `importar-artes-pdf` (D017, PRD-04): `SKILL.md` + scripts de faixas, recorte, orientação, deduplicação, pareamento de estilos, IoU, escala, snapshot do army book, escrita/validação do pacote e folhas de contato; `.gitignore` das imagens. Sem OCR e sem tela de rotulagem.
- [ ] T008 — Rodar a skill no PDF HDF numa sessão própria e aprovar o relatório. Aceite: piloto nos dois estilos (Infantry Rifle, Veteran Shotgun, Biker Pistol, Biker Lance e as 4 artes de OGRE) e rótulos iguais à leitura manual.
- [ ] T009 — Gravar no catálogo as bases do piloto já capturadas (25 / 25 / 60x35 / 40, army book v3.6.0) e a escala do PDF. Confirmar geometria elíptica da oval.
- [ ] T010 — IN_PROGRESS. Protótipo Python de referência (`prototipo/gerar.py`, manifold3d) gera a lista piloto no modo duas metades, estilo borda: 3MF Bambu + STL + prévias + relatório. Falta: modo peça única, port para worker no navegador.
- [ ] T011 — IN_PROGRESS. Base redonda/oval (elipse) com fenda dupla no protótipo; checks de dimensão no relatório. Falta fenda simples (peça única) e confirmação da elipse.
- [ ] T012 — IN_PROGRESS. Fatiamento automatizado pela CLI (`prototipo/fatiar_cli.py`): figuras e bases do piloto passaram, 1 troca a 1,4 mm. Falta abrir na interface do Bambu Studio (arquivo sem perfil) e conferir visualmente. Evidência: `evidencias/2026-11-17-geracao-piloto.md`.
- [ ] T013 — UI: carregar pacote gerado pela skill, colar texto, revisão de linhas, associação, substituição com imagem, estilo, pose, quantidade, prévia, pendências e download.
- [ ] T014 — Persistência local, import/export de projeto, migrações e erro de quota.
- [ ] T015 — Instâncias reutilizadas no 3MF, separação em placas e verificação de colisão/limites.
- [ ] T016 — Testar jornada com lista piloto, contagens e equipamentos; comparar manifesto e fatiador.
- [ ] T017 — Cupom de encaixe e teste físico pelo usuário; incorporar calibração aprovada.
- [ ] T018 — Validar licenças dos assets a publicar, configurar Pages, publicar e testar URL final/subpath.
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
