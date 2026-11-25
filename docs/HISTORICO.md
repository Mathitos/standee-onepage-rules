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

## 18/11/2026 — a base como guia, com 2 encaixes

Pesquisa de união e boas práticas feita por subagentes (`evidencias/2026-11-18-pesquisa-uniao-e-boas-praticas.md`). Proposto o pintado com pino e rasgo, depois a base como guia com uma fenda justa. O usuário decidiu por 2 encaixes: depender de ajuste justo é ruim porque varia com a impressora de quem imprime, e 2 encaixes evitam desvio de inclinação. Implementado com linguetas e fendas cônicas (D031): a centragem não depende da folga, e as duas linguetas seguram a inclinação. O gabarito saiu do padrão. Conferido nas malhas com `prototipo/verificar_encaixe.py`; projeto de teste regerado e fatiado pela CLI.

## 18/11/2026 — peça única sem relevo

O usuário imprimiu o teste anterior. Na Infantry, os detalhes da arma em preto em relevo saíram misturados, embora no fatiador parecessem melhores. Medido: vãos brancos de 0,1–0,25 mm entre as linhas, e no G-code o preto já cobre 14,7% do branco dessa região. Propostos relevo mais baixo, um vão mínimo no desenho e uma placa de comparação. O usuário pediu uma versão sem relevo em peça única: desenho rente nas duas faces, 1,6 mm, bases com fenda própria (D032). No G-code o preto cobre 5,8% do branco da arma; fatiado pela CLI, com 9 trocas na placa de figuras. O usuário sugeriu pôr as bases na mesma placa, já que há troca de cor em várias camadas. Fatiado pela CLI nos três casos: na peça única, com ou sem relevo, juntar dá o mesmo tempo e filamento, e vira uma impressão só; nas metades, juntar dobra as trocas. Ficou automático só na peça única (D033).

## 18/11/2026 — lateral preta

O usuário viu na impressão as laterais brancas e pediu o preto. Medido o contorno preto da arte na borda (mediana de 0,30–0,36 mm na Infantry): uma faixa preta de 0,3 mm na borda, em toda a altura, deixa a lateral preta sem mexer no miolo nem nas faces (D034). Na peça única não custou trocas; nas metades, a placa de figuras foi de 1 para 13 trocas, e com isso juntar as bases passou a compensar ali também. A torre das figuras em y = 220 saía da mesa e foi para y = 200. Testes e pilotos regerados; os testes foram fatiados pela CLI.

## 19/11/2026 — número da unidade na base

O usuário aprovou as bases do teste impresso e pediu o número da unidade na lista do lado oposto ao nome (1 Infantry Squad, 2 Combat Bikers, 3 e 4 Veterans, 5 e 6 OGRE Robot). O número foi para a borda de trás, com o mesmo tratamento do nome, lido por trás (D035). As listas ganharam `"numero"`; na piloto, Veterans e OGRE Robot viraram uma entrada por unidade. Peça única de teste regerada e fatiada pela CLI, sem troca a mais; pilotos e teste das metades regerados.

## 21/11/2026 — miolo preto e Infantry com bico 0,4

O usuário pediu a peça em preto, com branco só onde precisa, e uma Infantry para bico 0,4. No acabamento pintado, o miolo passou a preto e o branco ficou só nas áreas brancas do desenho (D036). A primeira versão deixava barra e linguetas brancas; o G-code mostrou, e o branco passou a ficar só dentro da silhueta da arte. Com o miolo preto, só as camadas com desenho pedem troca: a lista completa foi de 16 para 8 trocas. A Infantry com bico 0,4 fatiou em 19,6 min, com perda de detalhe visível no G-code. Testes pintados e lista completa regerados.

## 21/11/2026 — uma unidade por placa

O usuário decidiu manter o bico 0,2 e pediu o 3MF com uma unidade por placa, com as bases (D037). Virou o padrão do gerador. Medido pela CLI na lista completa: 6 placas e 48 trocas, 17,4 h no total, contra 13,6 h numa placa só; a diferença é a purga das trocas repetidas em cada placa. Saídas regeradas.

## 21/11/2026 — bases descolando

O usuário perdeu 4 bases e 1 Biker, descolados no meio da impressão da lista completa. O 3MF trazia "Cool Plate" (padrão da exportação pela CLI) e o G-code aquecia a mesa a 35 °C; o modelo A1 usa Textured PEI, com 65 °C para o PLA Basic. O gerador passou a gravar o tipo de placa padrão da impressora e a centralizar as peças na mesa. Saídas regeradas; G-code conferido com `M190 S65`.

## 21/11/2026 — artes P&B de todas as facções

O usuário baixou os PDFs de todas as facções que achou e pediu as artes P&B de todas, de GF e de AoF. Nos sets, as P&B ficam entre as coloridas; foram juntadas num PDF por facção. O detector de grade, calibrado no HDF, perdia figuras de página inteira (faixa vertical), abas de outras larguras, tabelas estreitas e faixas com uma linha a mais ou a menos; a detecção foi ampliada, com uma trava contra as capas, e o HDF continuou idêntico. 22 facções extraídas: 1152 candidatos, 954 pares (D038).

Um agente revisor independente, pedido pelo usuário, achou 23 artes perdidas: tabelas estreitas ao lado de largas no Ratmen, e poses diferentes agrupadas como cópia, com rótulos diferentes ou cabeças trocadas. Também achou silhuetas quebradas no contorno fino do Eternal Dynasty. A grade passou a juntar as tabelas estreitas. A silhueta passou ao limiar 200. Uma cópia agora exige o mesmo rótulo impresso e o mesmo desenho, medido em cinza com desfoque, dentro da silhueta e sem o preto sólido. A calibração descartou duas versões da medida que separavam cópias idênticas. As 42 faixas apontadas voltaram, e o HDF ficou idêntico.

## 21/11/2026 — gerador de 3MF no site

O usuário pediu para começar a página que gera o 3MF, para publicar no GitHub Pages. O caminho padrão do protótipo foi portado para TypeScript e roda no navegador com manifold-3d em WebAssembly (D039). O site lê a arte de SVG a 600 dpi exportados para todas as artes das 22 facções, não do PDF. Na lista piloto, o 3MF do site tem as mesmas medidas do protótipo e fatiou na CLI do Bambu. No navegador, 14 modelos levaram 6,7 s.

## 21/11/2026 — associação pela lista do Army Forge

O usuário pediu os army books das outras 21 facções, para o site gerar só a partir da lista do Army Forge. Os ids saíram da listagem pública de livros oficiais; cada livro foi baixado nos dois sistemas do seu lado, porque a mesma unidade muda de nome (singular no Firefight e no Skirmish) e o GF e o AoF têm unidades a mais. Nove agentes leram os rótulos das 22 facções em paralelo e casaram com o army book: os rótulos usam nomes antigos, então a maior parte ficou como alias proposto, com a justificativa (o `genericName` do army book e os links de produto ajudaram). O site passou a achar a facção pelo sistema da lista e a escolher a arte pelas armas, itens e montarias do modelo, com arte genérica quando o rótulo não tem arma (D040). Com as listas do army book no equipamento padrão, 492 das 581 unidades com arte saem prontas; o resto é quase todo herói cuja arte mostra uma melhoria.

## 21/11/2026 (noite) — volta às duas metades

O usuário imprimiu a peça única pintada e reprovou a qualidade; pediu para voltar às duas metades coladas e um teste com duas versões da Infantry, uma por placa: desenho só na primeira camada e branco em relevo. Gerado `saidas/teste-duas-metades/projeto-duas-metades-fino.3mf` (pintado com `--face-mm 0.1` e branco em relevo, cada um com a sua base); o gerador passou a separar em placas os acabamentos diferentes da mesma unidade. Fatiado pela CLI: 4 trocas e 56 min; 9 trocas e 88 min. Não impresso. O site continua gerando a peça única até o resultado (D041).

## 22/11/2026 — encaixe retangular de volta e escala conferida

O usuário imprimiu o encaixe cônico e relatou que a peça caía da base; pediu o encaixe retangular das primeiras versões. Voltou no protótipo e no site com os números de antes: uma lingueta central reta de 6,0 × 1,9 mm numa fenda reta 0,3 mm mais larga e 0,25 mm mais grossa, sem chanfro; o cônico ficou como opção (D042). O teste das duas metades foi regerado, conferido nas malhas e fatiado pela CLI; o site passou nos 34 testes e a lista piloto fatiou sem erro. O usuário também achou as miniaturas pequenas perto do PDF impresso em A4. Medido no PDF e no 3MF: a figura tem 35 mm nos dois, dentro de uma célula de papel de 40 mm. A escala não mudou (D014): falta o usuário dizer com o que comparou e se quer um multiplicador.

## 22/11/2026 — pesquisa de encaixe em FDM

O usuário pediu um subagente para pesquisar boas práticas de encaixe em FDM. Resultado em `evidencias/2026-11-22-pesquisa-encaixe-fdm.md`. O encaixe cônico soltou porque a cunha de 26,6° por face passa do ângulo de autotravamento do PLA impresso (atrito de 0,12 a 0,38, conferido no resumo do artigo) e não tinha pré-carga. A folga do encaixe reto é de alinhamento; ele segurar na A1 do usuário deve depender da folga real ficar perto de zero. A recomendação é uma mola na base, que empurra a lingueta contra a parede oposta e tolera ±0,20 mm de erro da impressora sem mudar a figura. As medidas da mola são inferência e precisam de teste impresso. Nada foi implementado.

## 22/11/2026 — teste da mola na base

O usuário pediu para testar a mola recomendada pela pesquisa. O protótipo ganhou `--encaixe-base mola`: a mesma figura e a mesma fenda do encaixe retangular, com uma lâmina atrás da fenda cujo ressalto aperta a lingueta 0,30 mm contra a parede da frente (D043). Os vãos em volta da lâmina ficaram com 0,6 mm, não os 0,5 da pesquisa, porque a ponta da lâmina anda mais que o ressalto. A lista agora pode pedir bases de teste na placa do modelo. Gerado um teste numa placa: a Infantry em duas metades com as bases RETA, MOLA 0,8 e MOLA 0,6. Conferido nas malhas e no G-code; a CLI fatiou com 4 trocas em 77,7 min. Falta imprimir; o padrão continua o retangular e o site não mudou.

## 22/11/2026 — standees de papel em A4

O usuário pediu para imprimir a lista também em papel A4, nas medidas certas e com várias minis por folha. A etapa 3 do site ganhou "Papel A4 (PDF)": uma faixa dobrável por modelo, no formato do PDF da OPR (aba, frente, verso girado 180°, aba), em pé, várias por folha e na escala do PDF a 100% (D044). O PDF é escrito no navegador, sem dependência nova. A lista piloto coube em 2 folhas; medida num leitor independente, a Infantry tem a mesma largura do PDF da OPR e 0,17 mm a menos de altura, diferença que já vem do SVG do catálogo. O site gerou o PDF da lista de exemplo sem erro, no desktop e a 375 px. Falta imprimir em papel. Outra sessão registrou ao mesmo tempo o teste da mola como D043.

## 22/11/2026 — conferência de tamanho do papel: minis e bases

O usuário pediu para conferir se as bases e as minis ficam do tamanho certo impressas em A4. As minis batem com o PDF da OPR, medidas nos dois PDFs a 600 dpi em 4 artes e 2 estilos: a largura fica igual e a altura até 0,17 mm diferente, diferença que vem do SVG do catálogo. As bases do catálogo batem com o army book nas 298 unidades. Mas as abas da faixa eram retângulos de 20 mm, e a pegada não tinha nada a ver com a base. Agora cada aba é meia base, centrada nos pés; dobradas para fora, as duas formam a base do army book, conferida no PDF com até 0,03 mm de diferença. 10 das 2096 artes, figuras muito altas com base grande, não cabem com a meia base e ficam com abas retangulares e aviso.

## 22/11/2026 (noite) — acabamento preto em relevo e teste da mola regerado

O usuário disse que, no fim, o contorno preto em relevo ficou melhor e pediu o teste de encaixe com uma mini nesse estilo (D045). O preto em relevo já era o padrão do protótipo. O teste da mola foi regerado com a Infantry em duas metades nesse acabamento; as três bases (RETA, MOLA 0,8, MOLA 0,6) não mudaram, e o relevo não chega à lingueta. A CLI fatiou com 13 trocas em 131,5 min, contra 4 trocas e 77,7 min com a mini pintada, por causa da lateral preta no corpo branco. Falta imprimir.

## 22/11/2026 (noite) — resultado do teste da mola

O usuário imprimiu o teste da mola e respondeu: "o encaixe reto sem mola ficou melhor". A mola (D043) foi reprovada e fica só como opção do protótipo; o padrão continua o encaixe retangular das primeiras versões (D042), que o site já usa. Com o acabamento (preto em relevo, D045) e o encaixe decididos, o próximo passo do agente é levar as duas metades para o site. O motivo da escolha não foi descrito, nem se o reto segura bem a figura.

## 22/11/2026 (noite) — duas metades no site

Com o acabamento e o encaixe decididos, o usuário pediu para levar as duas metades ao site (D046). O gerador do navegador agora faz por padrão as metades em preto em relevo, com o encaixe reto: dois objetos por figura e uma placa por unidade com as bases. A peça única pintada ficou como opção no seletor "Modo". No caminho, a lateral preta passou a cortar pelo miolo do contorno, o que acabou com lascas microscópicas no verso. Os volumes batem com o protótipo (até 0,45%), a lista piloto fatiou pela CLI sem erro (6 placas, 13 trocas cada) e o site gerou o 3MF no navegador embutido. Falta imprimir um 3MF do site.

## 23/11/2026 — site publicado no GitHub Pages

O usuário criou o repositório público `Mathitos/standee-onepage-rules` e ativou o Pages pelo GitHub Actions. O primeiro push pelo HTTPS parou pedindo login; o git deste PC usa o SSH do Windows, cujo agente tem a chave do GitHub, e o push foi pelo remoto SSH. O workflow passou na primeira execução (testes, build e deploy). No site publicado, a lista de exemplo gerou o 3MF em duas metades e o PDF A4 sem erros.

## 23/11/2026 — base pelo army book em toda unidade

Testando o site publicado com uma lista do Alien Hives, o usuário escolheu à mão a arte do Grunt Veteran, mas a base ficou em branco. O site só procurava a base no manifesto, que traz apenas as unidades com arte no PDF. O build agora gera, para cada facção, um `bases.json` com as bases de todas as unidades dos army books, e o site usa esse arquivo quando o manifesto não tem a unidade. As unidades sem base redonda no próprio army book continuam com a escolha manual.

## 23/11/2026 — botão "Atualizar" na lista

A pedido do usuário, o botão "Usar lista de exemplo" virou "Atualizar": o texto colado só é lido quando ele clica, e não a cada tecla. Ao atualizar, as artes e bases escolhidas à mão continuam nas unidades que seguem na lista.

## 23/11/2026 — torre de purga, lista completa e arte enviada

O usuário aprovou as placas por unidade e pediu três mudanças no site (D047). A torre de purga agora vem desligada, com opção para ligar. O 3MF ganhou, no fim, as placas da lista completa, divididas em placas equilibradas quando não cabe numa só. E a galeria ganhou o envio de arte própria: a imagem vira, no navegador, os mesmos SVGs do catálogo, com o tratamento do importador, e entra no 3MF e no papel. Testado com a lista piloto pela CLI e com uma lista do Alien Hives no site local.

## 23/11/2026 — poses alternadas, número da pose e miolo preto

O usuário imprimiu uma lista do Alien Hives: os 3 Spores saíram com a mesma arte (o PDF só tem uma), e o standee de corpo branco com lateral preta trocava de filamento em todas as camadas. Pediu as poses alternadas, com o número da pose em fenda nas primeiras camadas para casar frente e verso, e lembrou o combinado de peça preta com o branco só onde precisa (D036). Feito no site (D048): as poses do catálogo alternam entre os modelos, sem contar as cópias da mesma figura; o número vai na face da cola, espelhado; e as metades passaram a ter corpo preto e branco só na face de cima. Ao separar poses de cópias, a "Warrior Spine Gun" 2 se mostrou cópia da 1, e não outra pose.

## 23/11/2026 — nome da base em maiúsculas

O usuário mandou a foto de uma base dos Spores com o nome meio ilegível. As minúsculas tinham ~2,4 mm e embolaram na textura da mesa. Desenhei três opções e o usuário escolheu maiúsculas com até 4 mm (D049). O cálculo do tamanho passou a achar a maior altura que cabe, para os nomes longos não encolherem mais que o necessário.

## 23/11/2026 — torre de purga religada pelo Bambu Studio

O usuário desligou a torre no site, e o Bambu Studio abriu o projeto com a torre ligada, por cima das bases da "Lista completa". O 3MF baixado tinha `enable_prime_tower` = 0; o código-fonte do Bambu Studio mostrou que ele volta ao perfil do sistema as chaves que o projeto não lista em `different_settings_to_system`. O 3MF passou a listar a chave, e o empacotamento passou a deixar livre o canto da torre quando cabe, a pedido do usuário (D050). O teste pela CLI não tinha pegado o problema porque o script mantinha a chave do arquivo à força; agora segue a regra do Bambu Studio.

## 24/11/2026 — "falha no worker" depois do deploy

O usuário colou uma lista de Mummified Undead e o 3MF falhou com "falha no worker". A mesma lista gerou normalmente no site local e no publicado, numa aba nova. O worker da versão anterior não existe mais no site depois do deploy da D050, e um worker que aponta para ele falha sem mensagem, que é o que o site mostrava; é a causa provável, não confirmada com o usuário. O site passou a avisar que foi atualizado e a oferecer recarregar a página (D051).
