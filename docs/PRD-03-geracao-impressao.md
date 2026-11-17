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
| Lingueta: largura × profundidade | 6 × 3 mm |
| Espessura da lingueta | Igual ao corpo; nas metades, 2 × corpo depois de unidas |
| Folga total da fenda na largura | 0,3 mm |
| Folga total da fenda na espessura | 0,25 mm |
| Altura da base | 4 mm |

**Escala (D014):** padrão = escala de impressão do PDF a 100%, `mm = px × 25,4 / 300`. Medidas do PDF HDF: Infantry ≈ 34 mm de altura, Biker ≈ 32 × 40 mm, OGRE ≈ 54 × 37 mm. Não normalizar pela altura nem fixar 40 mm. Multiplicador global só por escolha explícita, registrado no projeto.

As dimensões externas da base vêm do catálogo; não herdar o retângulo 25 × 16 mm do protótipo. Não aumentar a base oficial para acomodar arte: sinalizar quando a figura excede a base e permitir ajuste explícito. O estilo borda grossa (D012) acrescenta ~1,2 mm por lado; refazer a checagem.

## Frente e verso

- A silhueta da frente define o contorno. Para alinhar, o verso é comparado com a frente espelhando-o pelo eixo da dobra e é recortado pelo contorno correspondente (a frente na peça única; a frente espelhada na metade traseira). IoU frente × verso espelhado abaixo de 0,95 (proposto) exige revisão. Medido no piloto: 0,97–0,99.
- Exatamente um espelhamento entre a imagem do PDF e cada face vista de baixo:
  - Peça única: arte de cima no sentido do PDF; arte da face da mesa espelhada uma vez, porque é vista por baixo.
  - Duas metades: cada arte no sentido do PDF, na face de cima da sua metade. O contorno da metade traseira é a silhueta da frente espelhada, para coincidir quando a peça for virada e unida.
- Peça única: qual arte vai na face da mesa e qual no relevo ainda não foi decidido; proposta: frente na face da mesa.
- Casos assimétricos (arma de um lado só) são obrigatórios nos testes visuais.

## Cores

- **Peça única**: camada inferior (0 a 0,4 mm) com preto e branco coplanares em Z=0; núcleo branco; relevo preto acima do núcleo. Substitui o protótipo em que o preto atravessava o corpo inteiro e exigia troca de cor em todas as camadas.
- **Duas metades**: corpo branco de Z=0 até a espessura do corpo; relevo preto acima.
- Sem interseções volumétricas, fendas entre cores ou partes flutuantes. Ilhas de uma cor são aceitáveis quando ligadas pela outra no objeto composto.
- Linhas mais finas que o bico se perdem: informar no relatório, sem engrossar tudo em silêncio. A borda grossa reduz o problema no contorno.

## Duas metades — detalhes (D011)

- Cada metade leva meia lingueta; unidas, formam uma lingueta de 2 × corpo que entra em uma fenda única da base (2 × corpo + folga).
- Encaixe, a decidir no cupom físico:
  - **E1 — furos + pino solto + cola**: furos cegos nas faces de colagem das duas metades e um pino separado (pedaço de filamento 1,75 mm ou pino impresso à parte). Pinos não podem sair da face da mesa, que ficaria sem apoio; por isso as duas metades têm furo.
  - **E2 — só cola**, alinhando pelo contorno e pela fenda da base.
- Posição dos furos: automática pela transformada de distância da silhueta (regiões largas, como o torso), nunca em armas ou partes finas, espelhada na metade traseira e visível na prévia. Profundidade ≤ corpo − 0,4 mm. Diâmetro e folga calibrados no cupom.
- O requisito de desenho P/B na face da mesa (D002) não se aplica a esse modo: a face fica oculta.
- Riscos: montagem manual (14 modelos = 28 metades), linha de junção visível na lateral, partes finas com meia espessura até a colagem, desalinhamento sem pinos.

## Bases e encaixe

- A lingueta nasce no centro do apoio dos pés, não no centro de uma caixa delimitadora dominada por uma arma lateral.
- Travessa discreta pode unir pés e lingueta, sempre visível na prévia.
- Base circular/oval com fundo fechado abaixo da fenda; verificar espessura mínima do fundo e margens laterais. Oval 60x35 tratada como elipse até confirmação.
- Mostrar dimensões nominais e folgas totais, distinguindo-as de folga por lado.
- Incluir cupom de teste antes da produção em lote: fenda simples e dupla, furos e pinos.

## Saídas

STL: uma malha por peça (cada metade separada), monocromática, em mm, nomeada por unidade/variante/peça; manifesto com quantidades. STL não transporta cores.

3MF Bambu: componentes nomeados (modelo, metade, cor), filamento por parte, cópias e bases; disposição sem sobreposição, dentro da mesa e com a área da torre de purga livre. Reutilizar malhas nas cópias. Organizar múltiplas placas quando necessário. Não embutir perfil de impressora errado nem comandos de impressão. A estrutura precisa seguir a do próprio Bambu Studio (ids globais, UUIDs no padrão, `model_settings.config` com filamento por parte); detalhes e testes em `evidencias/2026-11-17-geracao-piloto.md`. Figuras e bases saem em arquivos separados: bases numa cor só, sem torre.

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
