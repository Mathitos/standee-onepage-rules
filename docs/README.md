# Standee Forge — plano de implementação

Versão 1.0 · 17/11/2026 · Responsável pelo produto: Matheus Anzzulin

Aplicativo para transformar listas do Army Forge em standees imprimíveis, usando um catálogo revisado de artes e bases. Hospedagem preferida: GitHub Pages. Este pacote é o plano; não representa um site já implementado.

## Ordem de leitura

1. `STATUS.md`: ponto atual e próximo passo.
2. `PRD-01-produto.md`: experiência completa e escopo.
3. `PRD-02-catalogo-importacao.md`: artes, listas e bases.
4. `PRD-03-geracao-impressao.md`: geometria, cores e exportação.
5. `PRD-04-skill-importacao-pdf.md`: skill que transforma um PDF em pacote de artes.
6. `ARQUITETURA.md`: componentes e decisões técnicas propostas.
7. `IMPLEMENTACAO.md`: tarefas, dependências e gates.
8. `WORKFLOW.md`: execução e retomada após perda de contexto.
9. `DECISOES.md`: decisões aceitas, propostas e pendentes.

## O que precisamos do usuário

| Momento | Informação/ação | Motivo |
|---|---|---|
| Antes da publicação | Conta/organização e nome do repositório GitHub; conectar GitHub ou fornecer um checkout autenticado | Publicar sem compartilhar tokens no chat |
| Antes da validação de impressão | Impressora e diâmetro do bico que serão usados | Verificar detalhes finos e dimensões reais da mesa |
| Agora | Abrir `saidas/piloto-duas-metades-borda/figuras-…3mf` no Bambu Studio e, se possível, imprimir uma figura + base | Validar interface, encaixe e legibilidade do teste |
| A cada PDF importado | Anexar o PDF numa sessão, conferir o relatório da skill e aprovar ou corrigir rótulos e aliases | Nomes do PDF diferem dos nomes atuais |
| Ao montar a lista no site | Escolher substitutas onde não há arte (OGRE Gatling, Bikers) | D013 |
| Antes de publicar imagens | Definir uso pessoal ou público e fornecer autorização/licença aplicável, se houver | Decidir se as artes podem acompanhar o site |
| Depois do primeiro arquivo validado no fatiador | Imprimir uma amostra e informar ajuste do encaixe e legibilidade | A validação digital não mede tolerância física |

Não é necessário fornecer outros PDFs para iniciar: já existe Human Defense Force local. Novas facções entram depois do piloto. Não pedir senha, token pessoal ou credenciais do Army Forge. Podemos desenvolver localmente antes de conectar o GitHub.

## Premissas para começar sem bloquear

- Idioma inicial: português; nome provisório: Standee Forge.
- Piloto: Human Defense Force, usando a lista compartilhada informada.
- Site público pode conter código e metadados aprovados; por padrão as imagens são importadas e armazenadas localmente no navegador até verificar licença.
- A1 e AMS Lite são contexto anterior, mas o perfil e bico devem ser confirmados antes dos testes físicos.
- Nenhum tamanho oficial de base será inventado. Ausência ou ambiguidade exige revisão explícita.
- Nenhuma integração online será declarada funcional antes do teste real.

## Referências já consultadas

- Lista piloto: https://army-forge.onepagerules.com/share?id=QSGxDO-P48YX&name=Human_Defense%20Force
- Bases oficiais: https://www.onepagerules.com/news/base-size-recommendations-now-available-in-army-forge
- Fação: https://army-forge.onepagerules.com/army-info/grimdark-future/z65fgu0l29i4lnlu?armyName=Human+Defense+Force
- Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Termos das artes: https://www.onepagerules.com/terms-conditions

Em 17/11/2026 a API do Army Forge foi capturada: é pública, mas não envia cabeçalhos CORS, então o site não lê o link. O MVP importa o texto do "Share as Text" (D010). Evidências em `evidencias/`; revisão do plano em `REVISAO-2026-11-17.md`.
