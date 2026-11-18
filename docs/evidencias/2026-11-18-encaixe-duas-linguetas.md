# Encaixe pela base com 2 linguetas cônicas (D031) — 18/11/2026

## Pedido

- O usuário recusou o gabarito por arte (D029): é desperdício para um standee usado talvez uma vez.
- Ele decidiu por 2 encaixes na base: depender de ajuste justo é ruim porque varia com a tolerância da impressora de quem imprime, e 2 encaixes evitam desvio de inclinação.

## Como ficou

- **Linguetas:** duas por figura, cônicas.
  - Largura: 4,0 mm junto à barra, 2,1 mm na ponta; profundidade 1,9 mm.
  - Cada lado estreita 0,5 mm por mm de profundidade (cerca de 27°).
  - Ficam a 12,02 mm entre centros em todas as artes, simétricas em volta do centro do apoio dos pés. Assim qualquer base do mesmo tamanho serve a qualquer figura.
  - Se a figura for estreita, a barra sob os pés alarga até cobrir as duas linguetas. Teste sintético: uma figura de 6 mm ganhou barra de 17,1 mm. Nenhuma das 5 artes do teste precisou alargar; a mais estreita, a Infantry, tem barra de 18,5 mm.
- **Fendas:** duas, vazadas, com a mesma conicidade.
  - Largura: 3,85 mm na boca e 1,85 mm no fundo; espessura 2,65 mm para a lingueta unida de 2,4 mm.
  - Chanfro de 0,3 mm na boca, que é a face da mesa da base impressa de cabeça para baixo, contra o pé de elefante.
- **Por que não depende de folga justa:**
  - Empurrada, cada lingueta encosta nas duas paredes inclinadas e fica centrada.
  - A barra para a 0,15 mm da base.
  - Se a impressora errar a largura, muda só essa altura, não o centro (tabela abaixo).
  - Com as duas linguetas assentadas, a figura não inclina.
- **Opções:** o gabarito (D029) e os furos para pino continuam como `--encaixe gabarito` e `--encaixe pinos`.

## Conferência nas malhas (`prototipo/verificar_encaixe.py`)

Método: a metade da frente é cortada no meio da espessura e a base num plano vertical pelas fendas; a figura é posta de pé e afundada até encostar. Resultado igual nas 5 artes do teste e nos pilotos em duas metades e peça única:

| Medida | Resultado |
|---|---|
| Distância entre as linguetas | 12,023 mm (igual à das fendas) |
| Folga barra–base com as linguetas assentadas | 0,159 mm |
| Deslocar 0,05 mm para o lado | exige subir 0,099 mm |
| Deslocar 0,10 mm para o lado | exige subir 0,199 mm |
| Inclinar 0,5° | exige subir 0,062 mm |
| Inclinar 1,0° | exige subir 0,149 mm (OGRE e Bikers: 0,149 a 0,154) |

Simulação da impressora errando a largura, aplicada nas linguetas; equivale ao erro contrário nas fendas:

| Erro por lado | Folga barra–base | Deslocar 0,05 mm exige subir |
|---|---|---|
| −0,10 mm | 0,034 mm | 0,099 mm |
| −0,05 mm | 0,097 mm | 0,099 mm |
| +0,05 mm | 0,222 mm | 0,099 mm |
| +0,10 mm | 0,284 mm | 0,099 mm |

- **Limite:** se as linguetas saírem mais de ~0,12 mm por lado mais estreitas que as fendas, a barra encosta na base antes das paredes inclinadas. Aí sobra folga lateral igual ao que passar desse limite.
- **Tendência:** em FDM, furos e fendas costumam sair menores e peças maiores. Isso aumenta a folga entre a barra e a base, sem tirar a centragem.

Corte com as linguetas assentadas (Infantry): `2026-11-18-encaixe-duas-linguetas-corte.png`.

## No G-code (CLI do Bambu Studio 02.07.01.57, A1 bico 0,2)

Projeto de teste `saidas/teste-acabamento/projeto-duas-metades-fino.3mf`, regerado: 4 placas, sem "Gabaritos".

Base da Infantry, medida na prévia do G-code, que desenha cada cordão com sua largura (`2026-11-18-encaixe-duas-linguetas-gcode.png`):

| Camada | Largura da fenda | Modelo | Espessura |
|---|---|---|---|
| 1 (boca, com chanfro) | 4,45 mm | 4,45 | 3,30 mm |
| z 1,1 | 2,80 mm | 2,80 | 2,67 mm |
| z 2,0 (última) | 1,90 mm | 1,90 | 2,67 mm |

- Centros das fendas a −6,00 e +6,02 mm.
- Linguetas da Infantry: 2,30 mm a 0,2 mm da ponta (modelo 2,30) e 3,67 a 3,70 mm a 1,6 mm da ponta (modelo 3,70).

| Placa | Conteúdo | Trocas | Tempo |
|---|---|---:|---:|
| 1 | preto em relevo, 5 artes | 1 | 253 min |
| 2 | branco em relevo | 1 | 40 min |
| 3 | pintado | 5 | 64 min |
| 4 | 7 bases com nome | 5 | 149 min |

**Ferramenta corrigida:** `fatiar_cli.py` trocava todo o `project_settings` do arquivo pelo do perfil, inclusive a posição da torre, que é por placa. A placa de bases, cuja torre fica em y = 200 no arquivo (D027), passava a ter a torre em y = 220 e a CLI recusava: "Found G-code outside of the printable area". Agora a posição da torre vem do arquivo.

## Não verificado

Impressão real: assento, centragem com a tolerância da A1 do usuário e aparência da folga de ~0,15 mm entre a barra e a base.
