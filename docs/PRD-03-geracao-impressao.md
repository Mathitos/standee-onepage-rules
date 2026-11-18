# PRD 03 — geometria e exportação

Revisado em 17/11/2026: D008 substituída (frente/verso distintos), D011 em avaliação (duas metades), D012 (estilos) e D014 (escala do PDF).

## Resultado esperado

Cada modelo usa a arte de frente e a arte de verso do PDF, tem lingueta central sob os pés e uma base separada com forma/medida revisada e fenda compatível. A forma física é uma opção escolhida na geração, como o estilo (D011):

| | Peça única (D002) | Duas metades (D011) |
|---|---|---|
| Peças por modelo | 1 + base | 2 + base (+ pinos, se usados) |
| Face na mesa | Uma arte em preto e branco desde a 1ª camada, visível | Face de colagem, oculta, sem arte |
| Face de cima | A outra arte em relevo preto | Relevo preto nas duas metades: frente e verso |
| Cores por camada | Duas cores nas camadas inferiores; branco no núcleo; preto no relevo | Branco no corpo; preto só no relevo. Uma troca de filamento por placa se as metades têm a mesma espessura (confirmado no fatiador em 17/11: 1 troca a 1,4 mm para 28 metades); possível sem AMS, com pausa manual |
| Montagem | Encaixar na base | Unir metades (pino e/ou cola) e encaixar na base |
| Espessura montada | ~1,6 mm (1,2 + 0,4) | 2 × (corpo + 0,4); 2,4–3,2 mm a calibrar |

## Parâmetros e escala

Defaults iniciais, sujeitos a calibração:

| Parâmetro | Valor inicial |
|---|---:|
| Espessura do corpo (peça única) | 1,2 mm |
| Espessura do corpo por metade | 0,8–1,2 mm, mínimo a definir no cupom |
| Relevo | 0,4 mm |
| Linguetas (D031) | 2, cônicas: 4,0 mm junto à barra → 2,1 mm na ponta, 1,9 mm de profundidade (≤ altura da base, D021), 12,02 mm entre centros em todas as artes |
| Espessura da lingueta | Igual ao corpo; nas metades, 2 × corpo depois de unidas |
| Fendas (D031) | 2, vazadas, com a conicidade das linguetas: 3,85 mm na boca → 1,85 mm no fundo; chanfro de 0,3 mm na boca. Sem folga na largura: a lingueta assenta nas paredes inclinadas e a barra para a 0,15 mm da base |
| Folga total da fenda na espessura | 0,25 mm |
| Altura da base | 2 mm, fenda vazada (D021) |
| Desenho | traço do PDF lido a 600 dpi, sem engrossar (D024); paredes Arachne gravadas em cada objeto do 3MF (D025) |
| Nome na base (opcional, D022/D027) | branco embutido nas primeiras 0,4 mm de uma base preta impressa de cabeça para baixo; letra 3 mm, reduz até 1,8 mm |
| Acabamento das metades (D028) | preto em relevo (padrão), branco em relevo ou pintado (rente, na face da mesa) |

**Escala (D014):** padrão = escala de impressão do PDF a 100%, `mm = px × 25,4 / dpi` (a arte do PDF HDF é JPEG de 600 dpi). Medidas do PDF HDF: Infantry ≈ 34 mm de altura, Biker ≈ 32 × 40 mm, OGRE ≈ 54 × 37 mm. Não normalizar pela altura nem fixar 40 mm. Multiplicador global só por escolha explícita, registrado no projeto.

As dimensões externas da base vêm do catálogo; não herdar o retângulo 25 × 16 mm do protótipo. Não aumentar a base oficial para acomodar arte: sinalizar quando a figura excede a base e permitir ajuste explícito. O estilo borda grossa (D012) acrescenta ~1,2 mm por lado; refazer a checagem.

## Frente e verso

- A silhueta da frente define o contorno. Para alinhar, o verso é comparado com a frente espelhando-o pelo eixo da dobra e é recortado pelo contorno correspondente (a frente na peça única; a frente espelhada na metade traseira). IoU frente × verso espelhado abaixo de 0,95 (proposto) exige revisão. Medido no piloto: 0,97–0,99.
- Exatamente um espelhamento entre a imagem do PDF e cada face vista de baixo:
  - Peça única: arte de cima no sentido do PDF; arte da face da mesa espelhada uma vez, porque é vista por baixo.
  - Duas metades: cada arte no sentido do PDF, na face de cima da sua metade. O contorno da metade traseira é a silhueta da frente espelhada, para coincidir quando a peça for virada e unida.
- Peça única: qual arte vai na face da mesa e qual no relevo ainda não foi decidido; proposta: frente na face da mesa.
- Casos assimétricos (arma de um lado só) são obrigatórios nos testes visuais.
- **Pendente de decisão do usuário — silhuetas diferentes**: no PDF HDF, 13 de 69 artes têm frente × verso abaixo de 0,95; nos Storm Troopers com capa chega a 0,40–0,62, porque a capa do verso se abre para outro lado. Usar só a silhueta da frente cortaria a capa do verso. Opções: (a) contorno = união das duas silhuetas, deixando área branca sem desenho do lado que não tem capa; (b) manter a frente e aceitar o corte; (c) escolha por arte. Até decidir, o gerador usa a frente e o relatório marca essas artes.

## Cores

- **Peça única**: camada inferior (0 a 0,4 mm) com preto e branco coplanares em Z=0; núcleo branco; relevo preto acima do núcleo. Substitui o protótipo em que o preto atravessava o corpo inteiro e exigia troca de cor em todas as camadas.
- **Duas metades**: corpo branco de Z=0 até a espessura do corpo; relevo preto acima.
- Sem interseções volumétricas, fendas entre cores ou partes flutuantes. Ilhas de uma cor são aceitáveis quando ligadas pela outra no objeto composto.
- Os traços internos da arte têm ~0,1 mm (medido a 600 dpi em 18/11), mais finos que qualquer bico. O desenho é lido na resolução nativa do PDF e vai para a malha sem engrossar (D024); o fatiador com paredes Arachne (D025) imprime cada linha com a largura mínima do cordão, contínua. Com paredes classic as linhas somem ou viram contas de pontos. Engrossar no gerador (traço mínimo pelo esqueleto, por igual ou redesenho) escureceu o desenho no G-code e foi descartado como padrão; `--traco engrossado` fica como opção. Relevo negativo também não funciona: o branco fecha os vãos finos.

## Duas metades — detalhes (D011)

- Cada metade leva meia espessura das duas linguetas; unidas, formam linguetas de 2 × corpo que entram nas duas fendas da base (2 × corpo + folga na espessura).
- Encaixe, a decidir no cupom físico:
  - **E1 — furos + pino solto + cola**: furos cegos nas faces de colagem das duas metades e um pino separado (pedaço de filamento 1,75 mm ou pino impresso à parte). Pinos não podem sair da face da mesa, que ficaria sem apoio; por isso as duas metades têm furo.
  - **E2 — só cola**, alinhando pelo contorno e pela fenda da base.
  - **E4 — a base como guia (padrão, D031)**: duas linguetas cônicas em duas fendas cônicas. Cola nas faces (longe da barra), as duas metades entram juntas na base e são empurradas até assentar: cada lingueta centra sozinha, e as duas juntas seguram a inclinação. Não depende de folga justa nem de peça extra, e serve nos três acabamentos.
  - **E3 — gabarito de colagem (opção, D029)**: bandeja impressa com bolso no contorno da peça (lingueta incluída, folga 0,2 mm, fundo 2,2 mm). A primeira metade entra de face para baixo e a segunda vai por cima; as paredes alinham as duas. Um gabarito por arte, reutilizável; furo no fundo para empurrar a peça. O usuário descartou E1 por ser inviável cortar pinos de 1,5 mm.
- Posição dos furos: automática pela transformada de distância da silhueta (regiões largas, como o torso), nunca em armas ou partes finas, espelhada na metade traseira e visível na prévia. Profundidade ≤ corpo − 0,4 mm. Diâmetro e folga calibrados no cupom.
- O requisito de desenho P/B na face da mesa (D002) não se aplica a esse modo: a face fica oculta.
- Riscos: montagem manual (14 modelos = 28 metades), linha de junção visível na lateral, partes finas com meia espessura até a colagem, desalinhamento sem pinos.

## Bases e encaixe

- As duas linguetas ficam simétricas em volta do centro do apoio dos pés, não do centro de uma caixa delimitadora dominada por uma arma lateral. A distância entre elas é a mesma em todas as artes (D031); se a figura for estreita, a travessa alarga até cobri-las.
- Travessa discreta pode unir pés e lingueta, sempre visível na prévia.
- Base circular/oval de 2 mm com duas fendas vazadas e cônicas (D021/D031); as linguetas não chegam à mesa. Oval 60x35 tratada como elipse até confirmação.
- Nome da unidade (opcional, D022/D027): só o nome da unidade, na borda da frente, com o topo das letras voltado para o centro, num arco de 140°. A base é preta e impressa de cabeça para baixo; o nome fica embutido em branco nas primeiras camadas, rente à face de cima, para não colidir com o standee e sair com o acabamento da mesa. Se não couber, a letra diminui até 1,8 mm e o relatório avisa; nunca corta o nome. Uma base por unidade quando ligado.
- Mostrar dimensões nominais e folgas totais, distinguindo-as de folga por lado.
- Antes da produção em lote, confirmar numa impressão o assento das linguetas cônicas (barra a ~0,15 mm da base).

## Saídas

STL: uma malha por peça (cada metade separada), monocromática, em mm, nomeada por unidade/variante/peça; manifesto com quantidades. STL não transporta cores.

3MF Bambu: componentes nomeados (modelo, metade, cor), filamento por parte, cópias e bases; disposição sem sobreposição, dentro da mesa e com a área da torre de purga livre. Reutilizar malhas nas cópias. Organizar múltiplas placas quando necessário. Um projeto só, com figuras e bases em placas diferentes (D026), e `project_settings.config` da impressora/bico escolhidos (sem ele o Bambu carrega só a geometria); sem comandos de impressão. A estrutura precisa seguir a do próprio Bambu Studio (ids globais, UUIDs no padrão, `model_settings.config` com filamento por parte); detalhes e testes em `evidencias/2026-11-17-geracao-piloto.md`. Placa de bases numa cor só, sem torre; placa de figuras com a área da torre livre.

Manifesto: peças por modelo, estilo, substituições escolhidas e, no modo duas metades, instruções de montagem.

Projeto local: parâmetros, texto importado, IDs/versões dos assets, associações, estilos, substituições e overrides suficientes para regenerar; imagens podem acompanhar exportação pessoal opcional.

## Aceite técnico

- Todas as malhas fechadas, orientação consistente, sem triângulos degenerados ou volume negativo.
- Verificar unidades, bounding boxes e tolerâncias; quantização documentada.
- Peça única: a primeira camada contém as duas cores e a soma das regiões equivale à silhueta.
- Duas metades: camadas do corpo só brancas, relevo só preto; contornos das metades coincidem após espelhamento; furos alinhados.
- Frente/verso/lingueta conferidos visualmente com casos assimétricos.
- STL e 3MF representam as mesmas dimensões e quantidades.
- Reabrir 3MF no Bambu Studio e fatiar: filamentos atribuídos, cores nas camadas esperadas, relevo final, ausência de reparos inesperados, componentes alinhados. No modo duas metades, confirmar o número de trocas de filamento por placa.
- Verificar detalhes finos no bico informado; informar perdas ao usuário.
- Imprimir uma figura e o cupom; registrar material, bico, perfil, folga e resultado.

A checagem por código não substitui a validação no Bambu Studio. Os arquivos anteriores passaram por checks geométricos, mas não completaram esse gate.
