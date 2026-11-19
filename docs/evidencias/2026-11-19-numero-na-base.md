# Número da unidade na base (D035) — 19/11/2026

## Pedido

- O usuário disse que "as bases ficaram mt boas na impressão de teste double sided".
- Pediu o número da unidade na lista do lado oposto ao nome, com este exemplo:
  1 Infantry Squad, 2 Combat Bikers, 3 Veterans, 4 Veterans, 5 OGRE Robot, 6 OGRE Robot.
- O exemplo é a ordem da lista do Army Forge (`2026-11-17-T001-armyforge/share-as-text.txt`). Lá, "2x Veterans" e "2x OGRE Robot" são duas unidades cada, e cada uma ganha seu número.

## Como ficou

- Com `--nome-na-base`, o número fica na borda de trás, centrado, do lado oposto ao nome.
  - Tem o mesmo tratamento do nome: branco, embutido nas primeiras 0,4 mm e rente à face de cima, com o topo dos algarismos voltado para o centro.
  - O nome é lido pela frente da figura e o número por trás.
  - Só o número, sem "#". Algarismos de 3 mm (`numero_altura`), na mesma fonte do nome.
  - `--sem-numero` desliga.
- **Numeração:** campo `"numero"` em cada modelo da lista.
  - Se nenhum modelo tiver o campo, o gerador numera os nomes de unidade na ordem em que aparecem. Nesse caso, duas unidades com o mesmo nome ficariam com o mesmo número.
  - Se só alguns modelos tiverem o campo, o gerador para com erro.
- **Listas:**
  - **Piloto:** Veterans, que estava com qtd 6, virou duas entradas de 3 (números 3 e 4). OGRE Robot, com qtd 2, virou 5 e 6. Os dois Bikers ficaram com o 2.
  - **Testes:** têm 1 miniatura de cada arte. Das unidades repetidas, vale o número da primeira: Veterans 3, OGRE Robot 5.
- **Arquivos:** bases com números diferentes são objetos diferentes no 3MF, por exemplo `base-redonda-25-3-veterans` e `base-redonda-25-4-veterans`.

## No G-code (CLI do Bambu Studio 02.07.01.57, A1 bico 0,2, volumes de purga supostos)

`saidas/teste-peca-unica-sem-relevo/projeto-peca-unica-fino.3mf`, uma placa com figuras e bases:

| | Camadas | Trocas | Tempo | Mensagem |
|---|---:|---:|---:|---|
| Antes (D034) | 20 | 16 | 420 min | Success |
| Com o número | 20 | 16 | 420,8 min | Success, sem aviso |

- As trocas das bases já existiam nessas camadas, por causa do nome. O número não acrescenta nenhuma.
- Na 1ª e na 4ª camada das bases 1 e 3, o número sai inteiro, em cordões brancos. A imagem `2026-11-19-numero-na-base.png` mostra:
  - em cima, o modelo de cinco bases visto de cima no jogo;
  - embaixo, o G-code espelhado para a mesma vista.
- Os pilotos e o teste das metades foram regerados sem falha de malha, mas não foram fatiados.

## Não verificado

- Impressão real: legibilidade dos algarismos de 3 mm.
- 6 e 9: com o topo para o centro, um 6 visto pela frente da base parece um 9.
