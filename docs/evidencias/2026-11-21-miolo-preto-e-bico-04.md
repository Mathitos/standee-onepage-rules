# Miolo preto no acabamento pintado (D036) e Infantry com bico 0,4 — 21/11/2026

## Pedido

"gera 1 infantry com bico de 0.4, e arruma que as peças estão com o filamento branco, quero q seja o preto e branco só aonde precisa"

## Miolo preto (D036)

- **Acabamento pintado (peça única sem relevo e metade pintada):** a peça agora é preta. O branco fica só nas áreas brancas do desenho, rente à face, com 0,4 mm de fundo (`--face-mm`).
  - Na peça única, isso vale nas duas faces.
  - Na metade pintada, vale só na face da mesa.
- **Branco só dentro da silhueta da arte:** a barra sob os pés e as linguetas ficam pretas.
  - A primeira versão deixava as duas brancas nas faces; o G-code mostrou e a regra foi corrigida.
- `--miolo branco` volta ao corpo branco anterior.
- Os acabamentos com relevo preto (preto em relevo, nas metades e na peça única) continuam com corpo branco, porque o relevo preto precisa de fundo branco.
- **Lateral preta (D034):** continua, mas quase não tem o que recortar. O contorno da arte já é preto, e na Infantry a faixa ficou com 0,2 mm³.
- **Volume da Infantry em peça única:** 523 mm³ de preto e 160 mm³ de branco, ou seja, 77% preta.
  - Antes, o corpo era branco e o preto ficava só nas linhas e na lateral.

### Trocas e tempo (CLI do Bambu Studio 02.07.01.57, A1 bico 0,2, volumes de purga supostos)

Com o miolo preto, as camadas do meio da figura têm só preto. Só as camadas com desenho branco pedem troca.

| Projeto | Antes (miolo branco) | Agora (miolo preto) |
|---|---|---|
| Lista completa, 14 figuras e 14 bases, 1 placa | 16 trocas, 852,8 min, 20,6 + 27,4 g | 8 trocas, 816,0 min, 10,2 + 33,7 g |
| Teste de peça única, 5 artes e 5 bases | 16 trocas, 420 min | 8 trocas, 382,7 min |
| Teste das metades, placa 3 (pintado, 2 metades) | 12 trocas, 96 min | 4 trocas, 57,5 min |

### Risco

- **Branco sobre preto:** o branco do desenho fica com 0,4 mm sobre o preto.
  - A pesquisa de 18/11 achou relatos de que branco fino sobre preto fica acinzentado (0,6 mm ou mais, talvez 1,0 mm; sem teste controlado).
  - O nome das bases usa o mesmo 0,4 mm de branco sobre preto, e o usuário disse que as bases "ficaram mt boas".
  - Se a figura sair acinzentada, `--face-mm 0.6` aprofunda o branco.
- **Ganho do outro lado:** o preto da face oposta não aparece mais através do branco, porque atrás do branco agora há preto, não branco fino.

## Infantry com bico 0,4

- **Saída:** `saidas/teste-infantry-bico-04/projeto-peca-unica-fino.3mf`.
  - 1 Infantry Rifle em peça única sem relevo, contorno fino e miolo preto.
  - A base redonda de 25 mm vem com o nome e o número 1.
  - Perfil embutido: A1 bico 0,4, 0.20mm Standard, PLA Basic.
- **Geometria:** é a mesma da versão para bico 0,2. O bico muda só o perfil embutido e as métricas do relatório.
- **CLI:** "Success", 10 camadas de 0,2 mm, 4 trocas (z 0,2, 0,4, 1,4 e 1,6) e 19,6 min.
- **Comparação:** a mesma Infantry com bico 0,2 deu 20 camadas, 8 trocas e 82,3 min.
- **1ª camada no G-code** (`2026-11-21-infantry-bico-02-vs-04.png`):
  - com o bico 0,4, as linhas finas engrossam e parte dos vãos fica sem material, nos dois tons;
  - os detalhes da arma e do rosto se perdem.
  - Nesses vãos, o preto da camada de baixo deve aparecer; não foi verificado.
- **Camadas do meio:** a figura sai toda preta, e a base com preenchimento esparso.

## Não verificado

- Impressão: o tom do branco de 0,4 mm sobre preto e a nitidez com bico 0,4.
- Volumes de purga reais.
