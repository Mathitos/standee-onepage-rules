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

## 18/11/2026 — desenho fiel ao original: 600 dpi e paredes Arachne

Usuário fatiou com bico 0,2 e o desenho ficou estranho (linhas grossas, quebradas, pontos brancos). Achados: a arte do PDF é JPEG de 600 dpi e era lida a 300 dpi (traços de ~0,1 mm quebravam, e o traço mínimo engrossava os pedaços); a CLI do Bambu fatiava com valores genéricos em vez do perfil; a prévia do G-code tinha três artefatos (desretração como ponto, arco minúsculo como volta inteira, linha ~2 px mais larga); os perfis de sistema da A1 usam paredes classic, que fazem contas de pontos em linhas da largura do bico. Corrigidas as ferramentas e comparadas, no G-code com o perfil real: engorda 0 a 0,08 mm, redesenho só das linhas que cabem, e paredes classic × Arachne. Melhor resultado nos bicos 0,2 e 0,4: traço do PDF a 600 dpi sem engrossar + Arachne gravado em cada objeto do 3MF (D024, D025; D023 substituída). Saídas piloto regeradas. Os SVGs do catálogo (D020) também foram traçados a 300 dpi e precisam ser refeitos.

## 18/11/2026 — projeto único com perfil embutido

Usuário abriu o 3MF novo: ainda "generated by an old version of Bambu Studio, loading geometry data only" e "printer … not consistent with preset in project file". No código do Bambu Studio (Plater.cpp, `load_files`), 3MF do Bambu sem `project_settings.config` cai no ramo de versão antiga e perde os ajustes do projeto. Usuário pediu figuras e bases no mesmo projeto, em placas diferentes. Criado `prototipo/perfil_bambu.py` (project_settings da A1 pela CLI + perfis resolvidos, em cache), o gerador passou a gravar um projeto só com placas "Figuras" e "Bases" (posição de placa como em PartPlate.cpp) e o perfil embutido (D026). A CLI fatiou os projetos como estão, sem injeção: Arachne por objeto respeitado, 1 troca nas figuras em duas metades, bases sem troca.

## 18/11/2026 — base com nome embutido e teste de acabamentos

Usuário pediu o nome em branco numa base preta, sem relevo (colidiria com o standee) e na primeira camada (melhor acabamento). A base passou a ser impressa de cabeça para baixo, com o nome embutido e espelhado nas primeiras 0,4 mm (D027). A placa de bases ganhou duas cores; a torre cresceu e passava da borda em y = 220, então a das bases fica em y = 200 (por placa). Usuário pediu um projeto de teste com 1 miniatura de cada arte e a Infantry Rifle em três acabamentos: preto em relevo, branco em relevo e pintado sem relevo (D028). No G-code, o branco em relevo ficou melhor sem alargar os sulcos (0 mm) do que com 0,03 a 0,08 mm. Projeto de teste e saídas piloto regerados e fatiados pela CLI como estão.

## 18/11/2026 — gabarito de colagem e contorno fino

Usuário: cortar filamento para pinos de 1,5 mm é inviável; pediu grampo ou peça intermediária de guia. Criado o gabarito de colagem: bandeja com bolso no contorno da peça, um por arte, numa placa "Gabaritos"; as metades deixaram de ter furos (D029). Usuário pediu os próximos testes em contorno fino; virou o padrão do gerador (D030). Projeto de teste regerado em contorno fino e fatiado pela CLI, 5 placas.
