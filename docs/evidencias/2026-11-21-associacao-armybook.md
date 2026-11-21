# Associação das 22 facções com o army book (21/11/2026)

Pedido do usuário: "busque o armybook das outras 21, a ideia é gerar baseado na lista do army forge apenas". Decisão D040.

## Army books

- **Como os ids foram achados:** pela listagem pública de livros oficiais do Army Forge (`/api/army-books?filters=official&gameSystemSlug=…`), sem login, casando o nome exato da facção.
- **Ids dos sistemas:** conferidos pelo `gameSystemId` e pelo `gameSystemSlug` que vêm em cada resposta:
  - 2 Grimdark Future
  - 3 Firefight
  - 4 Age of Fantasy
  - 5 AoF Skirmish
- **Downloads:** foram 43, todos v3.6.0. As 21 facções novas vieram nos dois sistemas do seu lado; o HDF já tinha o gs3 e ganhou o gs2. Houve 1 s de pausa entre requisições.
- **Unidades entre sistemas:** o id da unidade é o mesmo nos dois sistemas e só o nome muda. No HDF, os 13 ids do Firefight estão todos no GF, 6 com outro nome ("OGRE Robots"/"OGRE Robot"). O GF e o AoF têm unidades a mais (veículos, monstros).
- **Bases:** são iguais nos dois sistemas em todas as unidades das 22 facções.
- **Nome no Army Forge:** "Saurian Starhost" se chama "Saurian Starhosts" lá. O índice do site agora guarda os nomes dos army books (`exercitos`).

## Mapeamento

- **Quem mapeou:** 9 agentes em paralelo, de 2 a 3 facções cada. Eles leram as folhas `work/rotulos-NN.png` e o `work/unidades-armybook.json` (gerado por `unidades.py`, com o `genericName`) e validaram com `montar.py --so-validar`.
- **Por que tantos alias-proposed:** os rótulos do PDF usam nomes antigos ou genéricos ("Brute Lord" para "Kemba Brute Boss", cujo genericName é "Brute Leader"). Por isso a maioria ficou alias-proposed, com a justificativa em `notas`.
- **Ajuda das lojas:** vários heróis foram identificados pelos links de produto que o army book traz nas opções. Exemplo: "Waheni Hunt Master (Raid Master)".

Totais: 1137 candidatos, sendo 396 mapped, 717 alias-proposed, 22 unmapped e 2 ignoradas (cópias de borda de Fanatic V1/V2 no Blessed Sisters). Ficaram 1135 artes nos manifestos.

## Cobertura com listas do army book

`tests/cobertura.test.ts` monta, para cada facção e sistema, uma lista com todas as unidades do army book no equipamento padrão e roda a associação do site. O relatório vai para `saidas/cobertura.json` com `COBERTURA=1`.

Como ler as duas últimas colunas: unidades do livro → unidades com arte no PDF → unidades prontas (arte e base escolhidas sozinhas).

| Facção | Artes | mapped | alias-proposed | unmapped | ignorar | Unidades | GF / AoF | GFF / Skirmish |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Beastmen | 52 | 9 | 42 | 1 | 0 | 12 | 20 → 12 → 12 | 14 → 12 → 12 |
| Daemons of Change | 28 | 1 | 27 | 0 | 0 | 9 | 19 → 9 → 8 | 14 → 9 → 8 |
| Daemons of Lust | 22 | 0 | 22 | 0 | 0 | 6 | 19 → 6 → 5 | 13 → 6 → 5 |
| Daemons of Plague | 26 | 13 | 13 | 0 | 0 | 6 | 16 → 6 → 5 | 11 → 6 → 5 |
| Daemons of War | 25 | 12 | 11 | 2 | 0 | 7 | 19 → 7 → 4 | 14 → 7 → 4 |
| Duchies of Vinci | 51 | 22 | 29 | 0 | 0 | 14 | 25 → 14 → 11 | 20 → 14 → 11 |
| Human Empire | 79 | 31 | 47 | 1 | 0 | 13 | 22 → 13 → 10 | 14 → 13 → 10 |
| Mummified Undead | 56 | 16 | 35 | 5 | 0 | 16 | 26 → 16 → 14 | 16 → 14 → 12 |
| Ratmen | 50 | 14 | 33 | 3 | 0 | 13 | 23 → 13 → 11 | 17 → 13 → 11 |
| Saurians | 51 | 24 | 27 | 0 | 0 | 15 | 27 → 15 → 15 | 20 → 13 → 13 |
| Shadow Stalkers | 39 | 19 | 19 | 1 | 0 | 15 | 23 → 15 → 15 | 16 → 15 → 15 |
| Vampiric Undead | 56 | 36 | 20 | 0 | 0 | 20 | 35 → 20 → 18 | 26 → 20 → 18 |
| Wood Elves | 79 | 37 | 42 | 0 | 0 | 21 | 29 → 21 → 16 | 22 → 21 → 16 |
| Alien Hives | 41 | 13 | 25 | 3 | 0 | 16 | 41 → 16 → 15 | 22 → 13 → 12 |
| Blessed Sisters | 83 | 29 | 51 | 3 | 2 | 18 | 29 → 18 → 13 | 19 → 17 → 13 |
| Dwarf Guilds | 71 | 19 | 52 | 0 | 0 | 14 | 27 → 14 → 13 | 16 → 14 → 13 |
| Eternal Dynasty | 61 | 15 | 45 | 1 | 0 | 11 | 26 → 11 → 6 | 16 → 10 → 5 |
| High Elf Fleets | 70 | 12 | 58 | 0 | 0 | 17 | 28 → 17 → 15 | 18 → 17 → 15 |
| Human Defense Force | 69 | 42 | 25 | 2 | 0 | 12 | 28 → 12 → 11 | 13 → 12 → 11 |
| Jackals | 44 | 10 | 34 | 0 | 0 | 9 | 18 → 9 → 8 | 13 → 9 → 8 |
| Robot Legions | 36 | 11 | 25 | 0 | 0 | 18 | 32 → 18 → 14 | 18 → 14 → 10 |
| Saurian Starhost | 46 | 11 | 35 | 0 | 0 | 16 | 23 → 16 → 14 | 17 → 14 → 12 |

Por sistema (unidades → com arte → prontas):

| Sistema | Unidades | Com arte | Prontas |
|---|---:|---:|---:|
| GF | 252 | 131 | 109 |
| GFF | 152 | 120 | 99 |
| AoF | 303 | 167 | 144 |
| AoF Skirmish | 217 | 163 | 140 |
| **Total** | **924** | **581** | **492** |

Leitura da tabela:

- **Sem arte no PDF:** são sobretudo veículos, monstros e unidades novas do GF e do AoF. O site não tem o que sugerir.
- **Com arte mas não prontas** (89): quase todas são heróis. As artes deles no PDF mostram uma melhoria (Captain, Shaman, montaria) ou uma arma diferente da padrão. Com a melhoria na lista, a arte entra. No equipamento padrão, o usuário escolhe (D013).
  - Exemplos: Battle Master e Champion (Human Empire, Ratmen), Champion of X (demônios), Glade Leader e Grove Champion (Wood Elves), High Sister (Blessed Sisters), Robot Lord.
  - O Eternal Dynasty é o mais fraco (6/26 e 5/16): Scouts, Ninja e ONI só têm artes de armas trocadas.
- **Ressalva:** a lista de teste usa o equipamento padrão. Listas reais costumam ter melhorias, e aí a cobertura muda nos dois sentidos.

## Site

- **Facção pelo sistema** (`familiaDoSistema`, `faccaoDaLista`): GF/GFF vão para `catalog/gff`, e AOF/AOFS/AOFR para `catalog/aof`. Listas com nome próprio ("Nome - Army book") também funcionam.
  - De onde vem o formato do cabeçalho: do código público do Army Forge, `++ ${nome - }${army book} (v…) [${CÓDIGO} …pts] [N Units] ++`. O código é o nome do sistema em maiúsculas (gf, gff, aof, aofs, aofr…).
  - O mesmo código mostra que a linha de regras traz os itens e as montarias, e que o nome da unidade pode ser um nome próprio dado pelo usuário. Esse caso não é resolvido: fica para o usuário escolher.
- **Escolha da arte** (`associar.ts`):
  - tags procuradas no equipamento e nas regras;
  - "A|B" aceita qualquer uma das alternativas;
  - sem nenhuma tag, entra a arte genérica (`equipmentTags` vazio).
- **Testado no site compilado** (preview local):
  - Lista de Beastmen AoF Skirmish montada do army book, com nome próprio: 5/5 unidades prontas. 3MF de 5 placas, 14,4 MB, em 8,6 s.
  - Lista HDF com cabeçalho `[GF …]`, nome próprio e "OGRE Robots" no plural: 3/3 prontas. 3MF de 3 placas, 7,8 MB, em 4,9 s.
  - Nenhum erro no console nos dois casos.
  - O gerador avisou que algumas figuras do AoF passam da borda da base, por exemplo o Centaur, 21 mm além da oval 60×35. Os avisos já existiam; as artes estão na escala do PDF.
- **Testes:** 33 passam (`npx vitest run`), `tsc` sem erros, build com 312 MB em `dist/` e 22 facções no índice, todas com manifesto.

## Problemas achados e corrigidos

- **Folhas de rótulo velhas:** 11 folhas `rotulos-NN.png` de uma extração anterior com mais candidatos sobraram em `work/` em 10 facções, com ids que não existem mais. Os agentes as descartaram e eu as apaguei. O `extrair.py` agora limpa as folhas antigas antes de gravar.
- **Seções de opções perdidas:** a primeira versão de `work/unidades-armybook.json` perdia seções de opções com o mesmo rótulo ("Upgrade with one" aparece várias vezes por unidade). O `unidades.py` agora junta todas. O validador sempre leu os army books inteiros.
- **Armas ambíguas:** o primeiro agente deixou sem tag as artes de arma ambígua, o que as transformava em arte genérica. Foi criada a tag "A|B" e 17 artes foram convertidas (Human Empire, Daemons of Change, Daemons of Lust). Os outros agentes já usaram "A|B". O "Lance" antigo do HDF virou "Heavy Lance|Hunting Lance|Anti-Tank Lance".
- **Reexportação sem retraçar:** os SVGs da exportação anterior do mesmo PDF são reaproveitados pelo id do candidato, de modo que as 22 facções foram renomeadas em segundos. Numa cópia, o Robot Legions saiu idêntico byte a byte.

## Pendências e pontos para o usuário

- **Aprovar os aliases:** são 717 alias-proposed. O relatório de cada facção está em `catalog/<sistema>/<facção>/review/relatorio.md` (fora do git), com folhas de contato. Depois de aprovar, rode `montar.py --aprovado`.
- **Heróis cuja arte é uma melhoria:**
  - No Blessed Sisters e no Robot Legions, "X Superior" e "X Overseer" foram lidos como a opção Superior/Overseer do herói. O genericName sugere outra leitura: seria o próprio herói líder. Tirar a tag faria dessas artes a genérica do herói.
  - O mesmo vale para "Captain" e similares em outras facções.
- **Empate entre artes:** duas artes com o mesmo número de tags empatam e vence a primeira. Exemplos:
  - Duchies of Vinci: um Vinci Leader com Captain + Automa-Horse + Handbow pega "Captain Handbow", não "Horse Captain".
  - HDF: "Biker Leader Lance" empata com "Biker Leader".
- **Item de um modelo só:** itens como Hologram Platform, Combat Bike ou Field Radio aparecem nas regras da unidade inteira. Uma arte com essa tag vai para todos os modelos da variante.
- **Cópias de estilo único sem par:** várias facções têm candidatos que existem num estilo só e repetem outra arte (sufixos `-borda`, `-so-borda`, `-copia-2`). Exemplos: Jetbikes do High Elf Fleets, a072–a079 do Human Empire, a039–a044 dos Jackals. Elas aparecem duplicadas na galeria. O pareamento da extração não as juntou.
- **Unmapped (22), por motivo:**
  - Arma que a unidade não tem no army book:
    - Mummified Undead: King's Guard Spear, Guardian Spear 1–3 e Guardian Bow 3 (a figura segura uma haste).
    - Celestial com armas pesadas (Blessed Sisters, 3 artes).
    - Infantry Sniper Rifle e OGRE Minigun (HDF).
    - Elite Spear (Beastmen).
    - Beast Rider Spear (Daemons of War).
    - Horse Marksman Sargeant Sniper (Human Empire).
  - Armas com nomes antigos sem correspondência:
    - Warrior Spitter Gun, Warrior Barb Gun e Prime Gunner Spitter Gun (Alien Hives).
    - Ogre Spiked Knuckles e Storm Ogre Fists (Ratmen).
  - Figura sem dono decidível:
    - Army Standard (Shadow Stalkers).
    - Hunter (Eternal Dynasty).
    - Beast Champion (Daemons of War).
    - Rat Master (Ratmen).
- **Não verificado:**
  - abrir os 3MF novos no Bambu Studio e imprimir;
  - publicar no Pages;
  - listas reais do AoF (o texto de teste foi montado do army book no formato lido no código do Army Forge);
  - listas com unidades juntadas (heróis em unidades) e com nomes próprios de unidade.
