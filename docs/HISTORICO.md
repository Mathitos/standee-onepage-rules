# Histórico de checkpoints

## 17/11/2026 — planejamento inicial

Criados três PRDs, arquitetura proposta, backlog de 19 tarefas, decisões e procedimento de retomada. Nenhuma tarefa de implementação do site marcada como concluída. Preservados os requisitos do desenho na face inferior, relevo superior e encaixe. Registradas lacunas de API, catálogo, escala, bases, fatiamento e publicação.

## 17/11/2026 (tarde) — T001 e revisão do plano

Contrato real do Army Forge capturado pela aba de rede e repetido via curl; CORS bloqueado comprovado no navegador; lista piloto resolvida contra o army book (equipamentos e bases). PDF analisado: raster sem texto, dois estilos de página, frente/verso distintos e escala impressa consistente. Usuário pediu revisão do planejamento antes da implementação; revisão em `REVISAO-2026-11-17.md`, PRDs ainda não alterados.

## 17/11/2026 (noite) — decisões do usuário incorporadas

Usuário respondeu à revisão: importação por texto colado (D010), dois estilos do PDF como variantes (D012), substituição de variante escolhida com imagem (D013) e propôs imprimir frente e verso separados com relevo dos dois lados (D011, em avaliação contra D002). PRD-01/02/03, ARQUITETURA, IMPLEMENTACAO, DECISOES, README e STATUS atualizados. T001 marcada como DONE; T002 em andamento; criada T020 (protótipo e cupom para decidir D011).

## 17/11/2026 (noite) — catálogo via skill

Usuário decidiu que rotulagem e importação de imagens serão uma skill do Claude Code, rodada pelo agente uma sessão por PDF, exportando o pacote para o projeto (D017, substitui D016). Criado `PRD-04-skill-importacao-pdf.md`; PRD-02, ARQUITETURA, IMPLEMENTACAO (T007/T008/T013), README e STATUS ajustados. Verificado que cada linha do PDF é uma faixa independente de 4 células com dobra no centro da página.

## 17/11/2026 (noite) — primeira geração de teste

Usuário decidiu que peça única ou duas metades é opção de geração (D011) e pediu a lista exemplo em duas metades com borda grossa. Criados `prototipo/pdf_grade.py` (recorte por faixa; corrigidas as regras do rótulo fora da tabela e da dobra deslocada), `prototipo/gerar.py` (manifold3d; 3MF no formato do Bambu, STL, prévias) e `prototipo/fatiar_cli.py` (validação pela CLI do Bambu). Depois de isolar 6 exigências do formato 3MF do Bambu, figuras e bases do piloto fatiaram com perfil A1 de teste: 28 metades, 1 troca de filamento a 1,4 mm. Interface do Bambu e impressão física ainda não verificadas.

## 17/11/2026 (noite) — repositório e trabalho autônomo

Usuário saiu do PC e pediu para seguir implementando com git. Criado repositório local (`main`, sem remoto; artes/PDF/saídas fora do git). Site: Vite + React + TypeScript + Vitest, parser do "Share as Text" com 19 testes (T006), tela da etapa 1 testada no navegador, workflow de checks e deploy no Pages. Protótipo: modo peça única e estilo contorno fino, os quatro combinados aceitos pelo fatiador do Bambu (CLI); contorno fino perde muito traço no bico 0,4. Skill `importar-artes-pdf` (T007) construída e rodada no PDF HDF: 69 artes pareadas; revisão parcial com as 8 artes do piloto. Achado: capas dos Storm Troopers deixam frente e verso com silhuetas diferentes (decisão pendente).

## 17/11/2026 (noite) — artes no git como vetores

Usuário decidiu que as artes vão para o git e para o site (paper minis gratuitos da OPR), mas o PDF não (D006). Pediu as artes vetorizadas e mapeadas como assets (D020). Como o PDF HDF é raster, a skill agora traça os recortes em SVG (mm, silhueta + tinta, verso alinhado à frente espelhada) com `scripts/vetor.py`; `montar.py` grava os SVGs, mede a fidelidade e renderiza as folhas de contato a partir deles. Pacote piloto refeito: 8 artes, 32 SVGs, 3,6 MB; silhueta IoU ≥ 0,998, diferenças da tinta só na faixa de 1 px da borda; SVGs conferidos no navegador. O gerador do protótipo ainda lê o PDF.

## 17/11/2026 (noite) — teste na interface do Bambu, traço mínimo e base nova

Usuário abriu o 3MF na interface: aviso de versão antiga e linhas internas sumindo depois do fatiamento. Medido: traços internos com mediana de 0,17–0,24 mm (70–82% do comprimento abaixo de 0,4 mm). Criado `prototipo/previa_gcode.py` para ver o G-code por filamento; comparadas três variantes no fatiador: atual (pontilhado), traço mínimo 0,45 mm (linhas contínuas) e relevo negativo (o branco fecha os vãos, descartado). Traço mínimo virou padrão proposto (D023). O gerador passou a gravar a versão 02.07.01.57 do Bambu Studio. Usuário pediu base de 2 mm com fenda vazada (D021) e nome da unidade na borda como opção (D022); implementado e fatiado pela CLI. Saídas piloto regeradas com traço mínimo e nome na base.
