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
