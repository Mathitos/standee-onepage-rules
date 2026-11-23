# Pesquisa: encaixe da figura na base em FDM — 22/11/2026

Pesquisa na web sobre como segurar a lingueta da figura na fenda da base sem depender de ajuste justo calibrado. Continua `2026-11-18-pesquisa-uniao-e-boas-praticas.md` (união das metades) sem repetir o que está lá. Feita por um subagente, a pedido do usuário ("podemos disparar um subagent para pesquisar melhores praticas na modelagem para esse tipo de situação de encaixe para impressors fdm").

**Revisão do agente principal (22/11):**
- **Contas refeitas e confirmadas:**
  - deformação da mola: 0,24%, 0,73% e 1,22%;
  - força: 0,20, 0,60 e 1,00 N;
  - retenção: de 0,05 a 0,76 N;
  - peso da figura: ~1 g;
  - ângulo do D031: 26,6° por face;
  - limites de autotravamento: 6,8° e 20,8°;
  - altura de assento: 0,20 e 0,84 mm;
  - inclinação com a folga atual: 7,5° e 4,6 mm.
- **Fonte do atrito conferida:** o resumo de Santana, Alves e Costa Sabino Netto, *Proc. IMechE Part L*, 2020, traz a faixa de 0,12 a 0,38 para o PLA, medida em plano inclinado e dependente do ângulo dos filamentos. A página da editora bloqueou o acesso; li o resumo pelo [registro da Crossref](https://api.crossref.org/works/10.1177/1464420720978997).
- **Não conferido:** as outras fontes, uma a uma.

**Legenda das fontes:**
- **[F]** fabricante ou documentação: Bambu (wiki, perfis e código do Bambu Studio, ficha do filamento), Prusa, Protolabs, Fictiv, Sovol, apostila de engenharia;
- **[E]** ensaio ou medição publicada;
- **[C]** comunidade: fórum, Reddit, Printables, MakerWorld, Thingiverse, guia de makerspace universitário;
- **[I]** inferência minha, sem fonte;
- **(trecho)**: só vi o trecho do buscador. Printables, MakerWorld, Thingiverse, 3dgo, MyMiniFactory, Reddit e Paizo recusaram o acesso automático.

**Folga:** "total" = fenda − lingueta; "por lado" = metade disso. O projeto usa total. As fontes misturam as duas; cada número abaixo diz qual.

## 1. Pergunta e contexto

- **Pergunta:** como a figura fica presa na base sem cair, em impressoras diferentes, sem calibrar ajuste justo.
- **Hoje (D042):**
  - lingueta reta de 6,0 × 1,9 mm;
  - espessura T = 2,4 mm (metades coladas) ou 1,6 mm (peça única);
  - fenda vazada de 6,3 × (T + 0,25) mm, sem chanfro;
  - base de 2 mm, impressa de cabeça para baixo; a boca da fenda fica na primeira camada.
- **Histórico:** as primeiras versões retas seguravam na A1 do usuário. O cônico (D031) caía.
- **Restrições:** sem gabarito por arte, sem pino de filamento. Cola só como opção.

## 2. Folgas

| Fonte | Tipo | Bico | Fala da Bambu? | Pressão | Justo / atrito | Deslizante | Base |
|---|---|---|---|---|---|---|---|
| Sovol | [F] blog de fabricante, sem ensaio | 0,4 | não | 0,05–0,15 | — | 0,2–0,3; PLA 0,15–0,25 | por lado |
| CCI/UAL, para H2D Pro | [C] makerspace | não diz | sim (H2D Pro) | 0–0,05 | alinhamento 0,10–0,15; removível 0,15–0,20 | 0,15–0,20 | por lado |
| CCI/UAL, para Ultimaker S7 | [C] makerspace | não diz | não | 0,2 | 0,2 a 0,3 | 0,3 ou mais | por lado |
| UF Makerspace, Prusa MK4/XL | [C] makerspace | não diz | não | — | 0,15–0,20 | 0,20–0,25 | não diz |
| Prusa | [F] | não diz | não | — | — | ≥ 0,3 para peças móveis; impressora precisa "a pelo menos 0,2 mm" | não diz |
| Protolabs Network (Hubs) | [F] | FDM em geral | não | — | — | snap-fit em FDM: 0,5 | não diz |
| Fórum Bambu (3dEd) | [C] | 0,4 | sim | 0,05 | 0,1 (justo, sai fácil) | 0,2 | não diz |
| MakerWorld 3498211 (pesquisa de 18/11) | [C] | — | sim | — | chave em rasgo: 0,15 | — | por lado |

**Erros medidos que consomem a folga:**

| Medida | Resultado | Condição | Fonte |
|---|---|---|---|
| Furo M6, exemplo do wiki | 0,24 mm menor no diâmetro | sem compensação | wiki Bambu [F] |
| Furos de Ø5 a Ø25 | ~0,15 mm menores, quase sem depender do tamanho; fendas retas quase exatas (+0,02) | sem X × Y consistente | MakerWorld 3361229 [C] (trecho) |
| Furos de 2 a 200 mm e aberturas retangulares | ~0,2 mm menores | bico 0,4 | fórum Bambu, 3dEd [C] |
| Aberturas retangulares | sem desvio | bico 0,4 | mesmo fórum, outro usuário [C] |
| Medidas externas no XY | −0,12 mm, desvio-padrão 0,03–0,04 | X1C, bico 0,4, camada 0,2, PLA Basic, 500 peças | Byczuk et al., euspen 2026 [E] |
| Altura (Z) | +0,05 mm | mesmo ensaio | [E] |
| Pinos redondos | ~0,20 mm menores | H2C, **bico 0,2** | fórum Bambu [C] |
| Quadrado de 5 mm | 5,05 mm | H2C, bico 0,4 | mesmo fórum [C] |
| Furos de 8 mm, H2D × P1S | H2D 0,3–0,5 mm menor que a P1S; no H2D, furo quadrado −0,2 e redondo −0,4 | mesma peça | fórum Bambu [C] |

**O que isso diz do nosso encaixe:**
- **Largura:** +0,30 total = 0,15 por lado. Fica entre "alinhamento" e "removível" (CCI) ou no começo do deslizante (Sovol, PLA). Não é encaixe de retenção.
- **Espessura:** +0,25 total = 0,125 por lado. Fica entre pressão e alinhamento.
- **[I] Numa Bambu típica, a folga real da espessura muda muito.**
  - A fenda perde de 0 a 0,24 mm.
  - A lingueta ganha ~0,05 mm em Z, ou ~0,1 mm nas metades, mais a cola.
  - A folga real vai de ~+0,2 mm (solta) a ~−0,1 mm (interferência).
  - Isso explicaria por que a versão reta segurava na A1 do usuário e pode soltar ou travar em outra máquina.
- **Bico 0,2:** nenhuma tabela de folga é para ele. Há um único dado com bico 0,2 (pinos no H2C, −0,20 mm). Um remix de Gloomhaven recomenda bico 0,2 por causa das folgas apertadas (MakerWorld 2229371, trecho).

## 3. Orientação e compensações

### 3.1 Fenda vertical na base (plano XY da base)

- **Como sai:** a fenda é um furo fechado em todas as camadas e tende a sair menor.
  - Faixa: de 0 a −0,24 mm no total (tabela da seção 2).
  - Duas fontes veem formas retas sofrendo menos que redondas: MakerWorld 3361229 e o H2D (quadrado −0,2, redondo −0,4) [C]. Outra vê −0,2 também em retângulos [C].
  - Varia entre impressoras da mesma marca (H2D × P1S) [C].
- **Compensação:**
  - folga no modelo, que o projeto já faz;
  - "X-Y hole compensation" do Bambu Studio [F]:
    - cresce furos sem mexer no contorno externo;
    - o diâmetro cresce o dobro do valor;
    - só age em caminhos fechados, e a nossa fenda é fechada em todas as camadas [I];
    - é ajuste por objeto (`PrintObjectConfig` no código do Bambu Studio) [F]. O gerador já grava ajustes por objeto no 3MF (`wall_generator`);
    - vem 0 nos perfis da A1 [F].
  - **[I] Nenhuma das duas corrige a dispersão entre impressoras.** Ambas mudam só a média.

### 3.2 Espessura da lingueta (eixo Z da figura)

- **Como sai:** em camadas.
  - O perfil A1 com bico 0,2 usa camada de 0,1 e primeira camada de 0,1 mm, com traço de 0,22 mm [F, perfil do Bambu Studio 02.07.01.57].
  - 1,2, 1,6 e 2,4 mm são múltiplos de 0,1 e de 0,2. O fatiador reproduz a espessura nominal [I].
- **Erros em Z:**
  - altura +0,05 mm no ensaio da X1C [E];
  - primeira camada esmagada (Z-offset baixo) encurta a peça [C];
  - a face da mesa na Textured PEI copia a textura. O revestimento tem 0,075 mm [F], mas não achei medida da rugosidade;
  - nas metades: duas peças, duas faces de cima e a cola no meio [I].
- **Compensação:** o fatiador não compensa espessura de peça, só a altura de camada [I]. Logo, a espessura não deve ser o ajuste que segura a figura [I].

### 3.3 Pé de elefante na boca da fenda

- **Wiki Bambu [F]:**
  - alarga a camada 1, às vezes as primeiras;
  - exemplo medido sem compensação: +0,09 e +0,11 mm por lado;
  - o valor muda com o tipo de placa.
- **Perfis da A1** (bicos 0,2 e 0,4): `elefant_foot_compensation` = 0,075 mm [F, perfil 02.07.01.57].
- **Comunidade:** a compensação também alarga os furos na primeira camada [C].
- **Na base de cabeça para baixo,** o pé de elefante estreita a boca, que é a face de cima no jogo.
- **Compensação:**
  - chanfro na entrada, ou na base de uma peça que trava perto do fundo [F, Sovol];
  - a compensação de pé de elefante melhora a tolerância de algumas regiões [F, Prusa];
  - a pesquisa de 18/11 sugeriu chanfro de 0,3–0,5 mm [I];
  - [I] com camada de 0,1 basta chanfro de 0,2 mm, ou alívio de 0,1 mm por lado nas 2 primeiras camadas.
- **Hipótese [I]:** nas primeiras versões, sem chanfro, o pé de elefante na boca apertava a lingueta como uma nervura. O chanfro de 0,3 do D031 tirou esse aperto. Não verificado.

## 4. Geometrias de retenção

| Geometria | Como funciona | Cabe no nosso caso? (base 2 mm; lingueta 1,6–2,4) | Risco | Fonte |
|---|---|---|---|---|
| A. Nervuras de esmagamento (crush ribs) | 3 ou mais nervuras arredondadas tocam a lingueta; só elas deformam | Cabe. Nervuras verticais nas paredes longas, desenhadas no XY da base, o eixo mais preciso [I] | A parede da base é rígida: a janela de tolerância fica estreita [I]. Um teste no Printables diz que as nervuras funcionam mais pela parede que dobra do que pelo esmagamento (trecho). PLA é quebradiço [F]. Uso único, não voltam [C]. Aperto demais quebrou bases [C] (trecho) | Protolabs [F]; Marginally Clever / Hackaday [C]; Printables 43636 (trecho); DigiKey [C] |
| B. Saliência ou detente (snap) | ressalto na lingueta passa por um ponto estreito e cai num rebaixo | Ressalto de 0,1–0,2 mm cabe (1–2 camadas nas faces de cima). Rebaixo embaixo da base é fácil (últimas camadas). **Só funciona se algo flexionar** [I] | Sem flexão é interferência pura, igual a A [I]. Hubs: PLA pouco indicado para snap; evitar cantiléver crescendo em Z; folga de 0,5 em FDM [F] | Protolabs Network [F]; Fictiv [F] |
| C. Lingueta com fenda (mola na figura) | lingueta partida em dois dedos que fecham ao entrar | **Não cabe.** Os dedos teriam ~2 mm. Ex.: t 1,0, L 2,0, δ 0,15 → deformação de 5,6%, contra ~1,5% de limite [I com fórmula da Fictiv e ficha Bambu] | quebra; nas metades, os dedos ficariam em duas peças coladas | Fictiv [F]; ficha PLA Basic [F] |
| D. Mola na base (flexure) | lâmina fina ao lado da fenda, solta numa ponta, empurra a lingueta contra a parede oposta | **Cabe.** Lâmina no plano XY da base, com 2 mm de altura e 6–8 mm de comprimento. A figura não muda [I] | Fenda de alívio visível no topo [I]. O alívio pode fundir: relatado numa base de paper mini [C]. PLA relaxa 11–14% em 500 s [E]. Bico 0,2 dá camadas mais fracas [F], mas a lâmina dobra no XY | UF Makerspace [C]; base "compliant" (Thangs) [C]; contas com Fictiv e ficha Bambu [F] |
| E. Cunha com interferência | lingueta cônica entra até apertar | Cabe, mas não trava: ver 4.1 | ângulo grande não trava; ângulo pequeno faz a altura de assento variar muito | apostila NPTEL [F]; Santana 2020 [E] |
| F. Lingueta mais funda com trava | a lingueta atravessa a base e prende embaixo | A base de 2 mm limita (D021). Prender embaixo é o caso B. Subir uma parede no topo exige imprimir a base de pé, e o nome sai da face da mesa (D022/D027) [I] | conflita com o nome na base | bases comerciais com parede de 3–5 mm: Game Crafter [F]; MakerWorld 2170812 (trecho) |
| G. Rabo de andorinha ou T deslizante | a figura entra de lado num trilho em T | Tecnicamente cabe: aba em camadas extras na ponta da lingueta e trilho aberto até a borda [I] | rasgo visível até a borda; sai deslizando. Em 18/11 a cauda de andorinha foi julgada inviável em 1,2 mm para unir metades (Hubs) | [I] |
| H. Ímã | ímã na base atrai algo na figura | **Não cabe:** a figura de PLA não tem parte ferrosa; a base tem 2 mm; peça extra [I] | compra, cola, pausa na impressão | MakerWorld: bolso com profundidade em múltiplos da camada, Ø + 0,15 mm para pressão [C] (trecho) |
| I. Cola | CA na fenda | sempre cabe | permanente | — |

### 4.1 Por que o encaixe cônico soltou

- **Condição de autotravamento:**
  - uma cunha fica presa sem força externa só se o ângulo incluído for menor que 2φ, com φ = arctan μ [F, NPTEL];
  - numa lingueta simétrica, isso vale por face: tan α < μ, sendo α o ângulo de cada lado [I, da mesma dedução];
  - o cone Morse, que se prende sozinho, tem ~1,49° por lado [C, Wikipedia].
- **Atrito do PLA:**
  - estático entre peças impressas: **0,12 a 0,38**, medido em plano inclinado, conforme o ângulo dos filamentos nas faces [E, Santana, Alves e Costa 2020];
  - então φ vai de **6,8° a 20,8°**.
- **D031:**
  - 0,5 mm por mm de cada lado dá α = 26,6° por face (53° incluído);
  - 26,6° > 20,8°: não trava nem no melhor atrito. **Confirma a hipótese, com o número corrigido:** o limite do PLA impresso fica entre ~7° e ~21° por face, não num valor único.
- **[I] Duas causas a mais:**
  - não havia pré-carga em direção alguma. Havia 0,25 mm de folga na espessura, e a barra parava 0,15 mm acima da base. Só o peso (~1 g) apoiava a lingueta;
  - se as paredes inclinadas apertassem, a cunha empurraria a lingueta para fora, com força N·(sen α − μ·cos α) > 0.
- **[I] Uma cunha que trava também não serve.** O assento varia Δh = Δ / tan α para um erro Δ por lado:

| α por face | Altura de assento por 0,1 mm/lado de erro |
|---|---|
| 26,6° (D031) | 0,20 mm |
| 20,8° (limite com μ = 0,38) | 0,26 mm |
| 6,8° (limite com μ = 0,12) | 0,84 mm |
| 1,49° (Morse) | 3,8 mm |

Para travar com qualquer PLA, a barra poderia ficar ~1 mm acima da base em outra impressora.

## 5. O que outros projetos de base de standee fazem

| Projeto | Como segura | Números ou relato | Fonte |
|---|---|---|---|
| The Game Crafter, base de 25 mm (plástico injetado) | fenda que aperta o cartão | fenda de 19 mm; aba de 18,5 × 3 mm; só garantem com o cartão deles | [F] |
| Base hexagonal de Gloomhaven (Thingiverse 2734104) | "dentes" levemente salientes na fenda | muito solta, não se levanta pelo standee; muito justa, estraga o papelão | [C] (trecho) |
| Remix Gloomhaven 2E (MakerWorld 2229371) | fenda justa no papelão | papelão de ~2,2 mm; vão de ~1,9 mm quebrou as bases; recomenda bico 0,2 | [C] (trecho) |
| Base de Frosthaven (via 3dgo) | tolerância justa, sem cola; lixar se não entrar | — | [C] (trecho) |
| Base de Gloomhaven com contador (Printables 713977) | — | pede impressora perfeitamente calibrada; camada de 0,15 | [C] (trecho) |
| Compliant Paper Miniature Base (Thingiverse 5215397, lida no Thangs) | dobra-se a base para abrir o suporte; solta, ela aperta o papel | segura o bastante para um jogo; às vezes as pontas da abertura fundem e é preciso abrir com chave de fenda | [C] |
| Token stands (Printables 180017) | fenda de clipe | fenda de 0,25 mm para cartolina | [C] (trecho) |
| Base de 25 mm (Printables 264627) | fenda estreita | 0,6 mm; o autor diz que serve melhor em resina que em FDM | [C] (trecho) |
| Base personalizável (MakerWorld 2170812) | paredes de suporte altas | base de 3 mm; parede do suporte de 5 mm (padrão) | [C] (trecho) |
| Meeple & Standee Stand (Printables 1764469) | fenda por atrito; base alargada na direção da fenda | tomba mais fácil em volta da linha da fenda | [C] (trecho) |
| HybridMini da OPR (MakerWorld 2689436) | encaixa na base sem cola e solta depois do jogo | geometria não vista | [C] (trecho) |
| r/PrintedMinis | fenda folgada: colar calços de plástico de blister | — | [C] (trecho) |

**Padrões:**
- Quase todas seguram papel ou papelão. O papelão é compressível e absorve a tolerância [I]. A nossa lingueta é PLA rígido.
- As que usam fenda justa pedem impressora calibrada, lixa ou reimpressão [C].
- A única que segura sem calibrar usa flexão: a base "compliant" [C].
- Bases comerciais e algumas impressas sobem paredes de 3–5 mm para alongar o apoio [F/C].
- **Não achei base impressa com lingueta rígida de PLA e retenção medida.**

## 6. Cupom de tolerância proposto

**O que as fontes recomendam:**
- calibrar com o mesmo perfil de processo e filamento, e repetir ao trocar de material [F, wiki Bambu];
- refazer o pé de elefante ao trocar de placa [F, wiki Bambu];
- passos de 0,05 mm: um teste para A1 usa 0,05 a 0,30 [C, MakerWorld 2820462 (trecho)]. Outro usa 0,1, 0,15, 0,2, 0,3 e 0,4, em duas orientações [C, Printables 740643 (trecho)];
- dizer no rótulo se a folga é por lado ou total; um cupom do MakerWorld rotula por lado [C, 2330729 (trecho)].

**Proposta [I]:**
- **Peça 1, régua de fendas:**
  - barra de 2,0 mm de altura, impressa de cabeça para baixo como a base, com a boca na mesa e o mesmo chanfro;
  - 9 fendas vazadas de 6,3 mm de largura, com espessura T + (−0,10, −0,05, 0, +0,05, +0,10, +0,15, +0,20, +0,25, +0,30) mm. A folga é **total**;
  - passo de 9 mm, o que dá uma régua de ~85 × 10 × 2 mm;
  - número em centésimos ("-10" a "30") rebaixado 0,4 mm na face de cima da impressão, com letra de 3 mm;
  - opcional: uma segunda régua girada 90° na placa, para ver a diferença entre X e Y.
- **Peça 2, chave:**
  - lingueta de teste igual à da figura: barra de 10 × 3 mm e lingueta de 6,0 × 1,9 mm;
  - impressa deitada no modo do usuário: peça única de 1,6 mm, ou duas metades de 1,2 mm coladas;
  - ou usar uma figura já impressa.
- **Se a opção 1 (mola) for adotada:** a régua vira 6 células com mola: lâmina de 0,6 e 0,8 mm × pré-carga de 0,15, 0,30 e 0,45 mm.
- **Teste:**
  1. empurrar a chave com o dedo em cada fenda;
  2. anotar: não entra / entra e segura de cabeça para baixo / entra e cai;
  3. escolher a fenda mais folgada que ainda segura de cabeça para baixo depois de 5 encaixes;
  4. conferir de novo no dia seguinte, por causa da relaxação do PLA;
  5. digitar o número no site, no campo "folga da espessura (total)".
- **Limite:** vale só para aquela impressora, filamento e placa. Não substitui uma geometria que tolere erro.

## 7. Recomendação para o nosso caso

### Opção 1 (principal): mola na base

A figura não muda. A base ganha uma lâmina que empurra a lingueta contra a parede oposta.

| Item | Valor inicial | Origem |
|---|---|---|
| Lingueta | igual à D042: 6,0 × 1,9 × T | sem mudança |
| Fenda | 6,3 × (T + 0,25), como na D042 | D042 |
| Mola | cantiléver no plano XY, paralelo à parede longa da fenda, atrás da figura | [I]; Hubs e Fictiv mandam deixar a flexão no XY [F] |
| Comprimento livre L | 7 mm, até o centro do ressalto | [I] |
| Espessura da lâmina t | 0,8 mm (testar 0,6) | [I] |
| Altura | 2,0 mm, a base inteira | [I]; Hubs pede clipe de 5 mm de largura ou mais [F], aqui não cabe |
| Raio na raiz | 0,4 mm (0,5 × t) | Hubs [F] |
| Fenda de alívio | 0,5 mm; 0,6 mm se o bico for 0,4 | [I]; fusão relatada [C] |
| Ressalto | 1,5 mm de comprimento, no meio da fenda, entrada a 30° | [I] |
| Pré-carga nominal | 0,30 mm: ressalto a T − 0,30 da parede oposta (2,10 mm nas metades; 1,30 mm na peça única) | [I] |
| Janela | ±0,20 mm (δ de 0,10 a 0,50 mm) | [I]; cobre a faixa da seção 2 |
| Boca | chanfro de 0,2 mm, ou alívio de 0,1 mm por lado nas 2 primeiras camadas | [I]; seção 3.3 |

**Contas.** As fórmulas e os dados têm fonte; os resultados são [I].
- Deformação ε = 1,5·t·δ / L² [F, Fictiv]. Com t = 0,8 e L = 7: 0,24% (δ 0,1), 0,73% (δ 0,3), 1,22% (δ 0,5).
- **Limite:**
  - Fictiv aceita 4–8% para snap em PLA [F];
  - a ficha Bambu dá 39 MPa de tração e 2680 MPa de módulo no XY [F]. 39/2680 ≈ 1,46% [I];
  - usei 1,46% como teto, para a mola não deformar de vez.
- Força P = 3·E·I·δ / L³, com I = b·t³/12 e E = 2680 MPa [F]: 0,20 N (δ 0,1), 0,60 N (δ 0,3), 1,00 N (δ 0,5).
- **Retenção:**
  - atrito nas duas faces: 2·μ·P, com μ de 0,12 a 0,38 [E], dá de 0,05 a 0,76 N;
  - a figura pesa ~1 g ≈ 0,01 N [I, estimativa: ~330 mm² × 2,4 mm de PLA];
  - segura de cabeça para baixo com folga de 5× no pior caso [I].
- **Balanço:**
  - a pré-carga mantém a lingueta encostada numa parede, então ela não balança na espessura [I];
  - hoje, 0,25 mm de folga em 1,9 mm deixa inclinar até 7,5°, ~4,6 mm no topo de uma figura de 35 mm [I].
- **Relaxação:** o PLA perde 11–14% da tensão em 500 s [E]. A margem acima cobre perder metade da força [I].

**O que exige do gerador:**
- `base.ts` e `gerar.py` (`fendas`, `base`):
  - subtrair a fenda de alívio em L ou J;
  - somar o ressalto ao contorno da fenda;
  - novo modo `encaixeBase: 'mola'` como padrão, mantendo `reto` e `conico`.
- Conferir a distância do alívio ao nome e ao número da base (D022/D035) e à borda. Trocar de lado se colidir.
- A figura não muda (`figura.ts` intacto).
- `verificar_encaixe.py`: aceitar a interferência de projeto no ressalto e relatar a pré-carga.
- Teste novo: fenda com ressalto e alívio, e a pré-carga nas duas espessuras (1,85 e 2,65).
- **Metades (E4):** a mola também segura as metades durante a colagem na base. Cuidar para a cola não escorrer até a base [I].

### Opção 2: mola com ressalto na lingueta (trava positiva)

- **Tudo da opção 1, mais:**
  - ressalto na lingueta de 0,15–0,20 mm de altura (2 camadas de 0,1), **só na face voltada para a mola**:
    - nas metades, na face de fora da metade de trás;
    - na peça única, a mola vai do lado da face de cima;
  - o ressalto fica entre 1,5 e 1,9 mm abaixo da barra;
  - o perfil do ressalto está no XY da figura, com entrada a 30° e retorno a 45°;
  - rebaixo na mola: alargar 0,3 mm nas últimas 0,5 mm da impressão, que são o fundo da base no jogo;
  - lâmina de 0,6 mm. O δ máximo vai a ~0,7 mm, com ε de 1,29% (L 7).
- **Retenção** W = P·(μ + tan α) / (1 − μ·tan α) [F, Fictiv]:
  - com retorno a 45°, W = 1,3 a 2,2 × P;
  - só com atrito, W = 0,24 a 0,76 × P [I].
- **Exige** mudar a figura e a base.
- **Risco:** o ressalto pode quebrar, porque o bico 0,2 dá camadas mais fracas [F].

### Opção 3: nervuras de esmagamento, sem mola (mudança mínima)

- **Nervuras:**
  - 3 nervuras em meia-cana de raio 0,3 mm;
  - duas numa parede longa (x = ±2 mm) e uma na outra (x = 0);
  - Protolabs pede 3 ou mais, arredondadas [F].
- **Interferência nominal:** 0,10 mm total, com a crista a T − 0,10 da parede oposta e a fenda em T + 0,25.
- As nervuras começam 0,3 mm abaixo da boca.
- **Exige** do gerador só o contorno da fenda.
- **Não atende bem o pedido [I].** A parede rígida deixa a janela estreita. Precisa da régua da seção 6 e de um campo de aperto no site.

**Em qualquer opção:** cola como opção. Manter o reto da D042 como "solto, para colar".

### O que tem fonte e o que é inferência

- **Com fonte:**
  - folgas e erros medidos (seção 2);
  - pé de elefante e compensações (seção 3);
  - atrito estático do PLA e condição de autotravamento;
  - fórmulas de cantiléver e de snap;
  - módulo e resistência do PLA Basic;
  - relaxação;
  - padrões das bases de papel e papelão.
- **Inferência:**
  - todas as medidas da mola, do ressalto e das nervuras;
  - forças, deformações e janelas calculadas;
  - peso da figura;
  - a hipótese do pé de elefante como nervura;
  - por que a versão reta segurava na A1.
- **Sem fonte nenhuma:**
  - números de crush rib para FDM;
  - tabela de folga para bico 0,2;
  - rugosidade da Textured PEI;
  - retenção medida de base de standee.

## 8. Fontes

**Bambu Lab [F]**
- Wiki, compensação de furo e contorno XY: https://wiki.bambulab.com/en/software/bambu-studio/xy-hole-contour-compensation
- Wiki, pé de elefante: https://wiki.bambulab.com/en/software/bambu-studio/parameter/elephant-foot
- Wiki, FAQ do bico 0,2: https://wiki.bambulab.com/en/knowledge-sharing/02-mm-nozzle-FAQ
- Ficha técnica PLA Basic: https://cdn.shopify.com/s/files/1/0380/5149/files/Bambu_PLA_Basic_Technical_Data_Sheet.pdf
- Placa Dual-Texture PEI (revestimento de 0,075 mm), trecho: https://asia.store.bambulab.com/collections/bambu-build-plates/products/bambu-dual-texture-pei-plate
- Código do Bambu Studio, `PrintConfig.hpp` (`xy_hole_compensation` e `elefant_foot_compensation` em `PrintObjectConfig`): https://github.com/bambulab/BambuStudio/blob/master/src/libslic3r/PrintConfig.hpp
- Perfis de processo (`0.10mm Standard @BBL A1 0.2 nozzle.json`, `fdm_process_single_0.10_nozzle_0.2.json`), lidos na instalação 02.07.01.57 em `C:\Program Files\Bambu Studio\resources\profiles\BBL\process`: https://github.com/bambulab/BambuStudio/tree/master/resources/profiles/BBL/process

**Outros fabricantes e documentação [F]**
- Prusa, modelar para impressão 3D: https://help.prusa3d.com/article/modeling-with-3d-printing-in-mind_164135
- Prusa, compensação de pé de elefante: https://help.prusa3d.com/article/elephant-foot-compensation_114487
- Protolabs Network (Hubs), snap-fit em impressão 3D: https://www.hubs.com/knowledge-base/how-design-snap-fit-joints-3d-printing/
- Protolabs, nervuras de esmagamento (injeção): https://www.protolabs.com/resources/design-tips/adding-crush-ribs-to-molded-parts/
- Fictiv, projeto de snap-fit: https://www.fictiv.com/articles/how-to-design-snap-fit-components
- Sovol, folgas em FDM: https://www.sovol3d.com/blogs/news/fdm-3d-printing-tolerances-clearances-how-to-design-parts-that-fit
- The Game Crafter, base de 25 mm: https://www.thegamecrafter.com/parts/paper-miniature-base-25mm-black
- NPTEL (IIT), atrito em cunhas: https://archive.nptel.ac.in/content/storage2/courses/112105164/lec16.pdf

**Ensaios [E]**
- Byczuk et al., "Dimensional accuracy and IT7 fits in FDM-printed PLA elements", euspen 2026: https://www.euspen.eu/knowledge-base/ICE26126.pdf
- Santana, Alves e Costa, atrito estático entre peças impressas (PLA 0,12–0,38), 2020: https://doi.org/10.1177/1464420720978997
- Bertocco et al., relaxação de PLA impresso, Materials 2022: https://pmc.ncbi.nlm.nih.gov/articles/PMC9147248/

**Comunidade [C]**
- CCI/UAL, folga e tolerância: https://wiki.cci.arts.ac.uk/books/digital-fabrication-lab/page/design-the-clearance-and-tolerance-readme
- UF Makerspace, tolerâncias na MK4 e XL: https://makerspace.uflib.ufl.edu/services/3dprocess/recommended-software-for-3d-printing/designing-for-3d-printing-tolerances-on-the-mk4-and-xl/
- Fórum Bambu, furos menores que o projeto: https://forum.bambulab.com/t/did-you-know-printed-holes-can-come-out-smaller-than-designed/261780
- Fórum Bambu, furos no H2D × P1S: https://forum.bambulab.com/t/undersized-holes-on-h2d-compared-to-p1s/206484
- Fórum Bambu, pinos menores com bico 0,2: https://forum.bambulab.com/t/repeatable-2mm-undersizing-of-cylindrical-studs/260456
- Hackaday, nervuras de esmagamento: https://hackaday.com/2020/10/15/adding-crush-ribs-to-3d-printed-parts-for-a-better-press-fit/
- Marginally Clever, nervuras de esmagamento: https://www.marginallyclever.com/2020/09/have-you-heard-of-crush-ribs/
- DigiKey Maker.io, dicas de tolerância: https://www.digikey.co.za/en/maker/blogs/2026/10-smart-3d-printing-tips-tolerances-holes-and-slicer-tricks
- Wikipedia, cone de máquina (Morse 1,49°): https://en.wikipedia.org/wiki/Machine_taper
- Compliant Paper Miniature Base (Thangs; original Thingiverse 5215397): https://thangs.com/designer/Be%20Inspired%20with%20Dominic/3d-model/Compliant%20Paper%20Miniature%20Base-49050

**Comunidade, só trecho do buscador [C] (trecho)**
- Printables 43636, teste de nervuras: https://www.printables.com/model/43636-test-print-crush-ribs-version04
- Printables 740643, teste de tolerância: https://www.printables.com/model/740643-tolerance-test
- Printables 180017, token stands: https://www.printables.com/model/180017-3000-token-stands
- Printables 264627, base de standee: https://www.printables.com/model/264627-standee-base-for-cardboard-miniatures
- Printables 713977, base de Gloomhaven com contador: https://www.printables.com/model/713977-gloomhaven-standee-base-with-counter
- Printables 1764469, Meeple & Standee Stand (via 3dgo): https://3dgo.app/models/printables/1764469
- Thingiverse 2734104, base hexagonal de Gloomhaven (via 3dgo): https://3dgo.app/models/thingiverse/2734104
- MakerWorld 2229371, remix de Gloomhaven 2E: https://makerworld.com/models/2229371
- MakerWorld 2170812, base personalizável: https://makerworld.com/models/2170812
- MakerWorld 2689436, HybridMini: https://makerworld.com/models/2689436
- MakerWorld 3361229, calibre de precisão: https://makerworld.com/en/models/3361229
- MakerWorld 2330729, calibre de folga por lado: https://makerworld.com/en/models/2330729-precision-clearance-test-gauge
- MakerWorld 2820462, teste de folga para A1: https://makerworld.com/en/models/2820462
- MakerWorld, post sobre bolsos de ímã: https://makerworld.com/en/community/post/968465
- r/PrintedMinis, calços na fenda (espelho): https://lr.us.psf.lt/r/PrintedMinis/comments/1d55j8n/how_to_secure_a_large_figure_and_keep_it_removable
