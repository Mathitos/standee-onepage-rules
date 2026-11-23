# Encaixe retangular de volta e conferência da escala (22/11/2026)

## Relato e pedidos do usuário

> "o encaixe chanfrado ficou ruim, a peça fica caindo da base, melhor deixar como estava nas primeiras versoes com o encaixe retangular"

> "e tenho a impressao que as miniaturas nào ficaram do mesmo tamanho que ficaria se tivesse impresso os standees em papel A4, ficaram muito pequenas"

## Encaixe retangular (D042)

**O que o usuário imprimiu:** a peça com as duas linguetas cônicas e as duas fendas cônicas com chanfro na boca (D031). A peça soltava e caía da base.

**O que voltou** é o encaixe das primeiras versões do protótipo (antes de `c5d3e1b`), com os mesmos números do código daquela época (`ec70dcc`):

| | Primeiras versões (17–18/11) | Agora (D042) |
|---|---|---|
| Linguetas | 1, central, reta | 1, central, reta |
| Largura da lingueta | 6,0 mm | 6,0 mm (6,01 mm, em pixels de 600 dpi) |
| Profundidade | 1,9 mm | 1,9 mm (1,91 mm) |
| Fenda | 1, vazada, reta, sem chanfro | 1, vazada, reta, sem chanfro |
| Largura da fenda | lingueta + 0,3 mm | 6,3 mm |
| Espessura da fenda | lingueta + 0,25 mm | metades: 2,4 + 0,25 = 2,65 mm; peça única pintada: 1,6 + 0,25 = 1,85 mm |

- **Posição:** a lingueta fica no meio do apoio dos pés, como antes. A barra sob os pés é alargada se a figura for mais estreita que a lingueta mais 0,5 mm de cada lado.
- **O cônico continua como opção:**
  - no protótipo, `--encaixe-base conico`;
  - no site, `encaixeBase: 'conico'` nos parâmetros (sem controle na tela).
- **Metades:** o modo `--encaixe base` (a base guia a colagem das metades) continua o padrão. A fenda reta tem 0,3 mm de folga na largura e não centra sozinha como a cônica.
- **Mudou em:**
  - protótipo: `prototipo/gerar.py` (`Param.encaixe_base`, `corpo_com_lingueta`, `fendas`, `base`);
  - verificador: `prototipo/verificar_encaixe.py`, que agora aceita 1 ou 2 linguetas;
  - site: `src/gerador/parametros.ts`, `figura.ts` e `base.ts`, mais o texto da etapa 3 em `src/ui/EtapaGerar.tsx`.

### Verificação

**Teste das duas metades regerado:** `saidas/teste-duas-metades/projeto-duas-metades-fino.3mf`, mesmo comando da D041.
- **Relatório:** lingueta de 6,01 × 1,91 mm, sem conicidade. Fenda "uma, vazada e retangular" de 6,3 × 2,65 × 2,0 mm.
- **Malhas:** nenhuma falha.
- **Prévia da placa:** uma lingueta central sob os pés.

**`verificar_encaixe.py` nas malhas** (corte vertical pela fenda: `saidas/teste-duas-metades/previas/encaixe-corte.png`):
- A lingueta entra e a barra assenta na base: folga barra–base de 0,005 mm, ou seja, encosta. A ponta fica 0,09 mm acima da mesa.
- Deslocada 0,1 mm para o lado, a peça não sobe, porque a fenda tem folga.
- Inclinada 1° no plano da figura, a peça sobe 0,16 mm (a barra apoia na base).
- Com a impressora alargando a lingueta 0,1 mm por lado, ela ainda entra centrada, mas não tem mais folga para o lado.

**Fatiamento pela CLI** (`prototipo/fatiar_cli.py --bico 0.2`): "Success".

| Placa | Trocas | Tempo |
|---|---:|---:|
| 1 (pintado) | 4 | 55,4 min |
| 2 (branco em relevo) | 9 | 87,7 min |

As trocas ficam nas mesmas alturas de antes.

**Site:**
- `npm run check` passa: tipos e 34 testes.
  - O teste da borda grossa confere a lingueta de 6,0 mm e a fenda de 6,3 × 1,85 mm.
  - Um teste novo gera com `encaixeBase: 'conico'` e acha 2 linguetas e 2 fendas.
- **Lista piloto pelo site** (`GRAVAR_3MF=1`, `saidas/site-piloto/projeto-site.3mf`): CLI "Success" nas 6 placas, com 8, 9, 9, 9, 8 e 8 trocas.

**Não verificado:**
- A interface do Bambu e a impressão.
- Se a folga de 0,3 mm na largura e 0,25 mm na espessura segura a peça na A1 do usuário. Ela é a mesma das primeiras versões, que o usuário prefere.

**Outras saídas:** as pastas de `saidas/` fora `teste-duas-metades/` e `site-piloto/` ainda têm o encaixe cônico (`saidas/LEIA-ME.md` avisa).

## Escala: medida, sem mudança

O usuário achou as miniaturas pequenas em comparação com o PDF impresso em A4. Medido no PDF da HDF (`Human_Defense_Force_-_BW.pdf`, página 6, Infantry Rifle em contorno fino, linha 0):

| O quê | Medida |
|---|---|
| Página | 210,0 × 297,0 mm (A4), sem rotação |
| Imagem da página | 4960 × 7016 px, ocupando a página inteira: 600 dpi exatos |
| Células da faixa (rótulo, frente, verso, aba) | 19,98 / 40,01 / 39,96 / 19,98 mm |
| Altura da faixa | 35,05 mm |
| Figura da frente no papel | dos pés, na linha de fora, até a cabeça a 35,05 mm; a célula tem 40 mm, então sobram ~5 mm de papel em branco acima da cabeça |
| Figura no 3MF do teste (relatório e malhas) | 35,09 mm do apoio dos pés ao topo; a peça tem 18,88 × 37,04 mm com a lingueta |
| SVG do site (`infantry-rifle/fino/frente.svg`) | 820 px a 600 dpi = 34,71 mm de desenho |

**Conclusão:**
- A figura impressa tem a altura da figura no PDF impresso em A4 a 100% (D014).
- No papel, a peça montada é o retângulo inteiro da célula, de 40 mm, com ~5 mm de papel em branco acima da cabeça. A peça impressa é recortada na silhueta e tem 35 mm. Pode ser essa a diferença percebida, mas o usuário não disse com o que comparou.
- Impresso com "ajustar à página", o papel sairia um pouco menor, não maior.

**Nada foi mudado:** a D014 só aceita multiplicador de escala por escolha explícita do usuário. Pergunta aberta no STATUS: com o que o usuário comparou e se quer um multiplicador (ex.: 40/35 ≈ 1,14 para a figura ocupar a altura da célula).
