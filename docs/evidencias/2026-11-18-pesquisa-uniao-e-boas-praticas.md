# Pesquisa: união das metades e boas práticas FDM — 18/11/2026

Duas pesquisas na web feitas por subagentes. O usuário as pediu ao recusar o gabarito por arte: não quer imprimir um gabarito para um standee que talvez use uma vez só.

Legenda: **[F]** = verificado na fonte; **[S]** = só no trecho do buscador; **[I]** = inferência.

Limites das fontes:
- Reddit, Printables e Cults3D bloquearam o acesso; deles só vimos trechos da busca.
- MakerWorld, wiki e fórum da Bambu e o código do Bambu Studio foram lidos.

## Achado central sobre a união

- **[I] Na versão em relevo, as duas faces de colar são faces da mesa.** Nenhuma feição impressa aponta para a interface. Então só alinha com:
  - peça solta;
  - gabarito externo;
  - a base;
  - uma dobradiça ligando as metades.
- **[I] Na versão pintada (desenho na face da mesa), as faces de colar ficam em cima.** Isso permite pino numa metade e rasgo na outra, impressos junto. As duas faces visíveis saem com o mesmo acabamento, o da mesa.
- **[F] Nenhum standee dupla face com metades coladas e registro integrado foi encontrado.**
  - O HybridMini (OPR) é peça única, plugada na base sem cola: makerworld.com/models/2689436.
  - O EasyMiniature cola metades costas com costas, sem registro: makerworld.com/models/1749060.

## Alternativas de união

| Alternativa | Serve para | Peça extra | Risco | Fonte principal |
|---|---|---|---|---|
| A. Pino + rasgo impressos nas faces de colar | pintado | não | baixo-médio | Sovol (folgas), Hackaday 2023 (pino + rasgo, chanfros) |
| B. "Copo": aro numa metade, a outra cai dentro (cola, ou pausa + aba) | pintado | não | médio | Derpy Charm, makerworld.com/models/2072011 |
| C. Dobradiça fina entre as linguetas, dobra 180° e cola | relevo e pintado | não | médio-alto (PLA racha; dobrar morno) | Hackaday 2022, guias de dobradiça |
| D. Base como gabarito (lingueta na fenda + ombros apoiados) + prendedor | todas | não | médio | sem fonte; [I] |
| E. Gabarito universal com entalhes padronizados no pé | todas | uma vez | médio | [I] |
| F. Moldura sacrificial com furos para alfinete | relevo | não | médio | Hackaday 2017 |
| G. Chaveta chata impressa solta em bolsos | relevo | sim | médio | Sovol |
| H. Pausar e virar a peça | — | — | alto, desaconselhado | fórum Bambu |
| I. Peça única + placa lisa + ironing no topo | — | não | baixo, mas os lados continuam diferentes | wiki Bambu |
| J. Fita dupla face / escolha da cola | complemento | — | — | 3M 467MP; CA × epóxi |
| K. Snap-fit / cauda de andorinha | — | — | inviável em 1,2 mm | Hubs |

Folgas citadas (PLA, ponto de partida; sempre calibrar com cupom):

| Caso | Folga | Fonte |
|---|---|---|
| Press-fit | 0,05–0,15 mm por lado | Sovol [F] |
| Deslizante | 0,15–0,25 mm por lado | Sovol [F] |
| Chave em rasgo | 0,15 mm por lado | MakerWorld 3498211 [F] |
| Gabarito | 0,2 mm, com chanfro de 0,5 mm | fórum Bambu [F] |

## Boas práticas que afetam o projeto

1. **Detalhe mínimo.**
   - [F] Padrões do Bambu Studio: `min_feature_size` 25% do bico (abaixo disso o traço some) e `min_bead_width` 85% (o que passa vira 0,17 mm no bico 0,2 e 0,34 no 0,4). Os perfis da A1 vêm em classic. Wiki: wall-generator.
   - [F] Medido numa A1 mini com bico 0,4: parede de 0,1–0,3 mm não imprime; fendas de 0,2–0,5 mm saem 0,1 mm mais estreitas.
   - [I] No inlay, valem mínimos para traço e para vão:
     - bico 0,2: ~0,2–0,25 mm;
     - bico 0,4: ~0,4–0,5 mm.
2. **Opacidade.**
   - [F] O branco é o mais translúcido: TD de 3 a 7 no HueForge, contra 0,2 a 0,6 do preto.
   - [F] Relatos no fórum: branco precisa de 0,6 mm ou mais, talvez 1,0 mm. Não há teste controlado.
   - [I] Branco com 0,4 mm sobre preto tende a ficar cinza. Isso vale para o nome na base e para o branco em relevo.
   - [I] Preto embutido sobre corpo branco cobre bem com 2 camadas, que é a situação do modo pintado.
3. **Placa lisa.** [F] Para inlay e texto na face da mesa, a placa lisa dá mais nitidez que a texturizada.
4. **Elephant foot.**
   - [F] A1 usa 0,075 mm. Partes do mesmo objeto não abrem fresta entre cores.
   - [I] Na base impressa de cabeça para baixo, o estreitamento cai na boca da fenda: chanfro de 0,3–0,5 mm.
5. **Fenda × lingueta.** [I] Folga total de +0,15–0,20 mm (justo) ou +0,25–0,35 mm (deslizante); calibrar com um cupom de 2,50–2,70 mm.
6. **Texto.** [F] Cartão de fontes na face da mesa (makerworld.com/models/687205): com bico 0,2, Arial de 2 mm é legível; com bico 0,4, Arial Bold de 4–5 mm é bom e 3 mm fica no limite.
7. **Trocas e purga.**
   - [F] Trocas por camada = cores na camada − 1.
   - [F] Misturar peças com cores em alturas diferentes multiplica a purga.
   - [F] O bico 0,2 purga devagar, a cerca de 2 mm³/s.
   - [F] A torre sobe até a última troca.
8. **Topo em relevo.** [F] "Only one wall on top surfaces", que vem ligado no perfil, deixa artefato na base do relevo. Recomenda-se desligar.

Fontes completas: nos relatórios dos subagentes desta sessão, resumidos aqui. Links principais: wiki.bambulab.com (wall-generator, line-width, elephant-foot, prime-tower, reduce-wasting-during-filament-change, ironing), forum.bambulab.com/t/17554, sparklab.unbc.ca/?p=680, sovol3d.com (tolerâncias), hackaday.com 2023/04/29 e 2022/05/01, makerworld.com (2689436, 1749060, 2072011, 3498211, 687205, 1788875).
