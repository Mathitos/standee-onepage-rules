# T001 — contrato observado do Army Forge (17/11/2026, ~19:40 UTC)

Captura feita no navegador embutido (aba de rede) e repetida via `curl` no PC Windows 11 desta sessão (edge Cloudflare GRU). Nenhum login; nenhuma credencial usada.

## Endpoints usados pela própria página de compartilhamento

| Requisição | Status | Observação |
|---|---|---|
| `GET /api/share/QSGxDO-P48YX` | 200 JSON | Lista com IDs apenas (sem nomes de arma/unidade resolvidos) |
| `GET /api/army-books/z65fgu0l29i4lnlu?gameSystem=3` | 200 JSON (125 KB) | Army book GFF v3.6.0, `modifiedAt` 2026-11-04 |
| `GET /api/rules/common/3` | 200 JSON (31 KB) | Regras comuns do sistema 3 (não salvo) |
| `GET /api/account/lists` | 401 | Sem sessão; irrelevante para listas compartilhadas |

Base: `https://army-forge.onepagerules.com`. API não documentada publicamente; pode mudar sem aviso.

## Acesso, CORS e erros

- Acesso público sem autenticação: `curl` retorna 200 com JSON (arquivos `*.headers.txt`).
- **CORS bloqueado**: nenhuma resposta traz `Access-Control-Allow-Origin`; `OPTIONS` retorna 204 só com `allow: GET, HEAD, OPTIONS`.
- Prova no navegador: `fetch` a partir de `https://example.com` falhou com "No 'Access-Control-Allow-Origin' header is present". `mode: no-cors` devolve resposta opaca (ilegível).
- Consequência: um site no GitHub Pages **não consegue** ler o link diretamente. Modo link exige função intermediária ou importação manual.
- ID inexistente (`/api/share/ZZZZZZ-ZZZZZ`): **404** com corpo `null`.
- Nenhum cabeçalho de rate limit observado; Cloudflare na frente (`cf-cache-status: DYNAMIC`).

## Payload de share (resumo)

`gameSystem: "gff"`, `pointsLimit: 800`, `modelCount: 14`, `activationCount: 6`, `modified: 2026-11-17T19:03:01.532Z`.
`units[]` tem 6 entradas: `id` (unidade no army book), `selectionId`, `armyId`, `combined`, `joinToUnit`, `selectedUpgrades[{upgradeId (seção), optionId, instanceId}]`.

## Lista resolvida contra o army book

| Entradas | Unidade (`id`) | Modelos | Equipamento resolvido | Base `round` / `square` | Pts |
|---|---|---:|---|---|---:|
| 1 | Infantry Squad (`_nbz3zj`) | 3 | 3× Battle Rifle, 3× Strike | `25` / `20` | 85 |
| 1 | Combat Bikers (`UoYLgB-`) | 3 | "Replace all Battle Rifles and Strikes" → 3× Pistol + 3× Hunting Lance | `60x35` / `50x25` | 95+20 |
| 2 | Veterans (`SScXOqX`) | 3 cada = 6 | "Replace any Battle Rifle" escolhido 3× por unidade → 3× Shotgun cada | `25` / `20` | 2×(110+30) |
| 2 | OGRE Robot (`44TuRY_`) | 1 cada = 2 | "Replace Shock Batons and Combat Shield" → Gatling Gun + Strike | `40` / `40` | 2×(145+5) |

Total 14 modelos e 780 pts, igual à interface. "800" é o `pointsLimit`, não divergência.

Pontos de atenção no formato:
- Tamanho usado é `size` do army book pedido com `gameSystem=3`; existem também `sizeSkirmish` e `originalSize` com outros valores.
- Base oval vem dentro da chave `round` como string `"60x35"`. Bases são strings, não números.
- Itens podem ter `bases` próprias (ex.: `Combat Shield.bases: null`) — mecanismo de troca de base por equipamento.
- As duas entradas de Veterans repetem os mesmos `instanceId`s (lista duplicada no editor); não usar `instanceId` como chave global.

## Exportações existentes (T002, parcial)

Strings no bundle da interface: "Share as Link", "Share as File", "Share as Text", "Download PDF", "Print". Conteúdo dos formatos **não** foi capturado. Um clique acidental abriu o editor (`/list/.../build/undefined`) no navegador embutido; nada foi salvo em conta (sem login).

## Arquivos

- `share-QSGxDO-P48YX.json`, `share.headers.txt`
- `armybook-z65fgu0l29i4lnlu-gff-v3.6.0.json`, `armybook.headers.txt` — conteúdo da OPR, versionado desde a decisão D006 (17/11).
- `share-as-text.txt` — exportação "Share as Text" enviada pelo usuário em 17/11 (formato usado no MVP, D010).
