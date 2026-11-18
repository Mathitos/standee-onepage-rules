# PRD 01 — produto e experiência

## Problema e objetivo

Hoje o usuário precisa recortar personagens, relacionar nomes, gerar relevo, pintar partes e construir bases manualmente. O produto deve transformar uma lista de exército em um conjunto de miniaturas 2D, com quantidades e equipamentos conferíveis antes da exportação.

Usuário inicial: hobbyista com impressora FDM e, opcionalmente, sistema multicolorido. O primeiro caso é Human Defense Force em Grimdark Future: Firefight.

## Jornada principal

1. Colar o texto do "Share as Text" do Army Forge (D010).
2. Mostrar sistema, facção, versão do army book, unidades, número de modelos e equipamentos; destacar linhas não reconhecidas.
3. Usar as artes do catálogo embutido no site (SVG no repositório, D020) ou de um pacote local.
4. Exibir uma linha por variante com imagem de frente e verso, quantidade, base e estado da associação.
5. Resolver associações ausentes/ambíguas: escolher a variante substituta vendo a imagem (D013) e distribuir poses entre cópias.
6. Escolher o estilo da arte (contorno fino ou borda grossa, D012), ajustar parâmetros de impressão e conferir frente, verso e encaixe.
7. Gerar, acompanhar progresso e baixar 3MF Bambu ou ZIP com STL.

## Requisitos funcionais

- RF01: importação não altera a lista original no Army Forge.
- RF02: diferenciar número de unidades e número de modelos; expandir multiplicadores sem duplicar upgrades.
- RF03: uma escopeta em um grupo não transforma todos os modelos em portadores de escopeta.
- RF04: permitir trocar arte e quantidade, mostrando divergências em relação à lista original.
- RF05: desconhecidos aparecem como pendências, nunca como substituições silenciosas.
- RF06: permitir exportar somente modelos resolvidos mediante escolha explícita e relatório dos omitidos.
- RF07: guardar projeto local e exportar/importar um arquivo de projeto para outra máquina.
- RF08: restaurar configurações, quantidades e associações após recarregar a página.
- RF09: distinguir modelo imprimível, arquivo fatiado e impressão física; o MVP não envia jobs à impressora.
- RF10: mensagens claras quando o pacote de artes ou a rede estiver indisponível.
- RF11: variante sem arte mapeada oferece as artes disponíveis com imagem; a escolha fica registrada como substituição (D013).
- RF12: estilo da arte (contorno fino ou borda grossa) escolhido por projeto, com troca por linha (D012).
- RF13: o texto colado é preservado no projeto; linhas não reconhecidas nunca são descartadas em silêncio.

## Escopo do MVP

- Uma facção; lista piloto completa, com 14 modelos se a lista permanecer igual à observada.
- Importação por texto colado; seleção de poses, estilos e bases circulares/ovais.
- 3MF com duas cores e STL monocromático.
- Arte de frente e de verso distintas, como no PDF (D008 substituída).
- Forma física escolhida na geração (D011): peça única com desenho na face da mesa e relevo em cima (D002) ou duas metades com relevo nas duas faces visíveis. Ver PRD-03.
- Lingueta, encaixe e base separada.
- Aplicação desktop primeiro, com interface utilizável em tela menor.

Fora do MVP: importação por link (exige proxy e verificação de termos), todas as facções prontas, contas e colaboração em nuvem, geração de miniatura 3D volumétrica por IA, edição do Army Forge, G-code, envio à impressora e sincronização automática de catálogo sem revisão.

## Critérios de aceite de produto

- Texto da lista piloto (captura de 17/11/2026) interpretado como Infantry Squad 1×3 (Battle Rifle), Combat Bikers 1×3 (Pistol + Hunting Lance), Veterans 2×3 (Shotgun) e OGRE Robot 2×1 (Gatling Gun): 14 modelos, 780 pts. Se a lista online mudar, registrar nova captura e justificar a diferença.
- O usuário vê as 14 miniaturas antes de baixar e consegue identificar equipamento e base de cada uma.
- Unidade sem arte nunca gera uma silhueta genérica sem consentimento.
- Todos os arquivos baixados abrem; 3MF preserva cores, componentes, escala e número de instâncias.
- Geração não congela a interface: worker, progresso e cancelamento.
- Falha de importação mostra o que não foi reconhecido e permite corrigir, sem apresentar uma lista demonstrativa como se fosse a lista do usuário.

## Qualidade e desempenho

Registrar tempos, memória aproximada e tamanho do download no computador de teste. Meta inicial de geração: até 60 segundos para 14 modelos na qualidade padrão, sujeita ao benchmark do spike. Cancelamento deve responder em até 2 segundos. Não reduzir resolução silenciosamente para atingir metas.
