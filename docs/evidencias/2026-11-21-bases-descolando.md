# Bases descolando da mesa — 21/11/2026

## Relato

- O usuário imprimiu a lista completa numa placa só, com 14 figuras e 14 bases.
- Perdeu 4 bases e 1 Biker, que descolaram da mesa no meio da impressão.

## Causa provável: mesa a 35 °C

- Os 3MF gerados até aqui tinham `curr_bed_type = Cool Plate` no `project_settings.config`. Com isso, o G-code aquecia a mesa a 35 °C: `M190 S35` no G-code fatiado pela CLI em 19/11.
- **Origem:** a exportação de perfil pela CLI do Bambu (`perfil_bambu.project_settings`) sai com "Cool Plate" por padrão, e o gerador não trocava isso.
- **O que os perfis do Bambu Studio 02.07.01.57 pedem:**
  - o modelo da impressora (`Bambu Lab A1.json`) usa `default_bed_type = Textured PEI Plate`;
  - o PLA Basic da A1 vai a 65 °C nas placas PEI (`textured_plate_temp` e `hot_plate_temp` = 65), contra 35 °C na Cool Plate.
- **Ressalva:** não se sabe se o usuário trocou o tipo de placa no Bambu Studio antes de imprimir. Se não trocou, a impressão rodou com a mesa a 35 °C.

## Correções

- **Tipo de placa:** `perfil_bambu.project_settings` passa a gravar o `default_bed_type` do modelo da impressora. Na A1, é "Textured PEI Plate".
  - Conferido nas 6 placas da lista completa, fatiadas pela CLI: `M190 S65` e `curr_bed_type = Textured PEI Plate`.
  - Todas as saídas foram regeradas com isso.
- **Peças no centro da mesa:** o empacotador punha as peças a partir do canto da frente, a 8 mm da borda. Agora o conjunto vai para o centro da mesa e recua para a frente se bater na área da torre.
  - Com uma unidade por placa (D037), as peças ocupam pouco espaço e ficam longe das bordas.
  - Isso é uma precaução: não há medição de temperatura nas bordas da mesa da A1.
- **Tempo:** sem mudança relevante (lista completa: 1044,7 min, 48 trocas).

## Placa do usuário

- Em 21/11, o usuário disse que usa a Textured PEI na A1. Ela bate com o tipo de placa que o gerador grava agora, então não há o que trocar no Bambu Studio.

## Não verificado

- Impressão com a mesa a 65 °C.
- Brim: o perfil usa `auto_brim`, e não foi alterado. Um brim seguraria mais, mas deixaria rebarba na borda da face de cima da base, que é a face da mesa na impressão.
