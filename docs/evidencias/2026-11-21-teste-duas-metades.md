# Volta às duas metades: teste da Infantry Rifle (21/11/2026, noite)

## Relato e pedido do usuário

> "a qualidade da peça unica ficou muito ruim, vamos ter que voltar a ideia das 2 metades, quero um arquivo de teste de uma versao da peça desenhada só na primeira camada, e uma com a parte branca em relevo, pode ser do infantry squad, uma versao em cada plate do arquivo"

O usuário imprimiu a peça única pintada (D032/D036) e reprovou a qualidade. Ele não detalhou o defeito. O teste abaixo compara duas versões em duas metades coladas.

## O que foi gerado

- **Arquivo:** `saidas/teste-duas-metades/projeto-duas-metades-fino.3mf` (fora do git; prévias em `previas/`; fatiamento em `fatiamento-cli/`).
- **Lista:** `prototipo/lista-teste-duas-metades.json`. Tem uma Infantry Rifle em contorno fino por acabamento, cada uma com a sua base redonda de 25 mm.
- **Comando:**

```bash
python -I prototipo/gerar.py prototipo/lista-teste-duas-metades.json --modo duas-metades --estilo fino --face-mm 0.1 --nome-na-base --saida saidas/teste-duas-metades
```

| Placa | Versão | Como foi feita | Metade |
|---|---|---|---|
| 1 "1 Infantry Squad - pintado, sem relevo" | Desenho só na primeira camada | Acabamento `pintado` com `--face-mm 0.1`. A metade é preta e o branco do desenho fica só nos primeiros 0,1 mm, na face que encosta na mesa (miolo preto, D036). | 1,2 mm |
| 2 "1 Infantry Squad - branco em relevo" | Parte branca em relevo | Acabamento `branco-relevo` (D028). A metade é preta, com 0,4 mm de branco em relevo por cima e as linhas pretas como sulcos. | 1,2 + 0,4 mm |

- **Por que 0,1 mm:** no perfil do bico 0,2 (`0.10mm Standard @BBL A1 0.2 nozzle`), a primeira camada e as demais têm 0,1 mm. Então `--face-mm 0.1` põe o desenho exatamente na primeira camada.
- **Bases:** as duas são iguais, de 2 mm, com o nome e o número 1 em branco embutidos em 0,4 mm (D027/D035).
- **Regra do usuário:** cada placa tem uma unidade com a sua base (CLAUDE.md, D037).

## Mudança no gerador

Com `--placas unidade` (D037), modelos da mesma unidade com acabamentos diferentes caíam na mesma placa. Isso mistura as cores em todas as camadas: no teste de 18/11, a placa da Infantry nos três acabamentos tinha 16 trocas.

Agora `prototipo/gerar.py` faz uma placa por (número da unidade, unidade, acabamento), cada uma com as bases dos seus modelos:
- O nome da placa ganha o acabamento só quando a unidade tem mais de um ("1 Infantry Squad - branco em relevo").
- A ordem segue o número da unidade e, dentro dela, a ordem dos modelos na lista.
- **Efeito no teste antigo:** a lista `lista-teste-acabamento.json` passa de 4 para 6 placas (a Infantry em três). Ela ainda não foi regerada.

## Verificação

**Geometria, lida das malhas do 3MF:**

| Peça | Faixa em z | Espessura |
|---|---|---|
| Metade pintada, corpo preto | -0,6 a 0,6 | 1,2 mm |
| Metade pintada, branco "desenho na mesa" | -0,6 a -0,5 | 0,1 mm |
| Metade em relevo, corpo preto | -0,8 a 0,4 | 1,2 mm |
| Metade em relevo, branco | 0,4 a 0,8 | 0,4 mm |

- A lateral preta (D034) acompanha o branco em cada versão.
- Nenhuma falha de malha.

**Fatiamento pela CLI** (`prototipo/fatiar_cli.py --bico 0.2`): "Success".

| Placa | Camadas | Trocas | Altura das trocas (mm) | Tempo |
|---|---:|---:|---|---:|
| 1 | 20 | 4 | 0,1 / 0,2 / 0,3 / 0,4 | 55,7 min |
| 2 | 20 | 9 | de 0,1 a 0,4 e de 1,3 a 1,6 | 88,1 min |

- **Placa 1:** o branco da figura fica só na camada 1. As trocas das camadas 2 a 4 vêm do nome da base (0,4 mm).
- **Placa 2:** as trocas de 0,1 a 0,4 mm vêm da base, e as de 1,3 a 1,6 mm vêm do relevo branco.

**Como colar:**
- metade pintada: pela face de cima da impressão, a que não tem desenho;
- metade em relevo: pela face lisa, a que ficou na mesa;
- depois, as duas juntas nas fendas da base (`saidas/LEIA-ME.md`).

## Não verificado e consequências

- **Não verificado:** a interface do Bambu Studio e a impressão.
- **Risco na placa 1:** uma camada de 0,1 mm de branco sobre preto pode sair acinzentada. É o mesmo risco registrado em D036, maior com 1 camada do que com 4.
- **O site ainda gera a peça única pintada (D039).** Se o teste aprovar uma das versões, o gerador do site precisa do modo duas metades:
  - port das metades e da base com a fenda das metades, que é diferente da fenda da peça única;
  - escolha do acabamento;
  - uma placa por unidade e acabamento.
