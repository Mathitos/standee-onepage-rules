# Tempo de impressão da lista completa — 19/11/2026

## Pedido

O usuário viu ~14 h na lista completa em peça única sem relevo e perguntou se dá para acelerar sem perder qualidade.

## Onde vai o tempo

Projeto: `saidas/lista-completa-peca-unica-sem-relevo/projeto-peca-unica-fino.3mf`, com 14 figuras e 14 bases numa placa. Fatiado pela CLI do Bambu Studio 02.07.01.57, com A1 bico 0,2, camada de 0,1 mm e volumes de purga supostos (200 e 600 mm³).

- **Total:** 852,8 min (14,2 h), 16 trocas, 20,6 g de branco e 27,4 g de preto.
- **Teto de vazão:** o perfil do PLA Basic com bico 0,2 limita a vazão a 2 mm³/s. Só o volume extrudado daria 5,3 h nesse teto.
- **Tempo por camada** (marcas M73 do G-code):

| Camadas | O que têm | Tempo |
|---|---|---:|
| z 0,1 (1ª) | desenho da frente + nome e número das bases | 141 min |
| z 0,2–0,4 | desenho da frente | 76–79 min cada |
| z 0,5–1,2 | miolo branco com lateral preta + bases | 12–30 min cada |
| z 1,3–1,6 | desenho do verso | 65–74 min cada |
| z 1,7–2,0 | só bases | 11–12 min cada |

- **Peso das faces:** as 8 camadas com desenho somam 653 min, 76% do total. Cada linha preta e cada área branca entre linhas é uma ilha com parede própria.
- **Por tipo de movimento** (modelo simples, reescalado para o tempo de cada camada):
  - parede externa: 33%;
  - deslocamentos: 24%;
  - preenchimento sólido: 13%;
  - parede interna: 11%;
  - purga: 5%;
  - retração: 4%;
  - torre: 1%.

## Variantes fatiadas

Mesma placa e mesma CLI; todas deram "Success" e nenhum aviso.

| Variante | Tempo | Diferença | Filamento (branco + preto) | O que muda na peça |
|---|---:|---:|---:|---|
| Atual | 852,8 min | — | 20,6 + 27,4 g | — |
| Bases com 4 camadas de topo, em vez de 8 | 820,5 min | −32 min | 20,6 + 23,0 g | mais preenchimento esparso dentro da base; o topo impresso é a face de baixo no jogo |
| Desenho com 0,3 mm de espessura em cada face | 767,9 min | −85 min | 21,6 + 26,3 g | linhas pretas mais rasas |
| Desenho com 0,2 mm em cada face | 682,8 min | −170 min | 22,7 + 25,2 g | idem, mais raso |
| 0,3 mm + bases com 4 camadas de topo | 735,8 min | −117 min | 21,6 + 21,9 g | |
| 0,2 mm + bases com 4 camadas de topo | 650,5 min | −202 min | 22,7 + 20,8 g | |
| Sem levantar o bico nos deslocamentos | 788,3 min | −65 min | igual | bico pode arrastar nas camadas impressas |
| Levantando o bico só acima de 1,55 mm | 796,4 min | −56 min | igual | idem, menos na última camada da figura |
| 0,2 mm + bases com 4 de topo + levantar só acima de 1,55 | 623,8 min | −229 min | 22,7 + 20,8 g | |
| 1ª camada 1,5x mais rápida | 832,4 min | −20 min | igual | aderência da camada mais delicada |
| Camada de 0,12 mm | 808,0 min | −45 min | 20,6 + 28,3 g | 17 camadas; espessuras arredondadas para múltiplos de 0,12 |

- **Bases com 4 camadas de topo:** testadas como ajuste por objeto no 3MF. O gerador ainda não grava isso.
- **Espessura do desenho:** nova opção `--face-mm` no gerador; o padrão continua 0,4.
  - Com 0,2 mm por face, o branco entre a face da frente e o preto do verso passa de 1,2 para 1,4 mm. Isso deve reduzir o preto aparecendo através do branco.
  - Por outro lado, a linha preta fica com 0,2 mm de preto sobre o branco do miolo. Não se sabe se continua tão escura.

## Não verificado

- Impressão real de qualquer variante.
- Volumes de purga reais, que o Bambu Studio do usuário calcula pelas cores.
- Bico 0,4 só para as bases: não medido. Exige trocar o bico, e o texto de 3 mm perderia definição.
