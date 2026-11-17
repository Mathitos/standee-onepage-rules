# Workflow de execução e retomada

Objetivo: continuar o projeto após compactação, fim de contexto ou nova sessão, sem depender do histórico do chat. Não existe garantia de aviso antes de a sessão acabar; checkpoints devem ocorrer continuamente.

## Início de toda sessão

1. Ler `STATUS.md`, `IMPLEMENTACAO.md` e `DECISOES.md`.
2. Confirmar diretório/repositório e branch. Ler instruções locais aplicáveis.
3. Verificar `git status` e último commit antes de editar. Não sobrescrever trabalho do usuário.
4. Localizar arquivos e resultados citados no checkpoint. Caminhos da máquina anterior podem não existir.
5. Escolher uma tarefa pequena, marcar IN_PROGRESS e definir evidência de aceite antes de implementar.
6. Ler somente PRDs/ADRs necessários; não repetir pesquisas concluídas sem motivo de atualização.

## Ciclo de trabalho

Uma tarefa deve ter um resultado verificável: contrato capturado, uma tela funcional, uma figura exportada ou um teste que passou. Ao concluir:

1. Executar os checks proporcionais à mudança.
2. Salvar artefatos e resultados duráveis. Não depender de arquivos temporários ou processos em background.
3. Fazer commit local quando houver repositório; incluir apenas arquivos relevantes. Nunca incluir credenciais, PDF privado ou assets não aprovados.
4. Atualizar tarefas, estado e decisões. Registrar commit/hash e caminhos, sem alegar push quando só houve commit.
5. Atualizar `STATUS.md` com próximo comando/ação e pendências.
6. Se remoto autenticado estiver disponível e sincronização estiver no escopo autorizado, sincronizar. Caso contrário, registrar commits somente locais e produzir snapshot portátil.

## Quando fazer checkpoint

- Ao terminar qualquer tarefa ou gate.
- Antes de iniciar uma operação longa.
- Depois de alterar contrato, arquitetura ou requisito.
- Antes de pedir informação ao usuário ou encerrar a resposta.
- Ao perceber redução de contexto. Não esperar uma mensagem de limite de tokens.

## Conteúdo obrigatório do checkpoint

```markdown
Data/hora:
Objetivo atual:
Branch / último commit / sincronizado?:
Tarefa em andamento:
Arquivos alterados ainda sem commit:
O que funciona (com evidência):
O que falhou (erro e tentativas relevantes):
Decisões aceitas desde o último checkpoint:
Bloqueios e quem resolve:
Próxima ação exata:
Comando para reproduzir/testar:
Artefatos e caminhos:
Processos em execução (não presumir que sobreviverão):
```

Manter STATUS curto: estado atual, não diário inteiro. Mover histórico para `HISTORICO.md`. Não registrar segredos, tokens, cookies, URLs assinadas ou dados desnecessários.

## Ao receber uma nova solicitação no meio da implementação

Registrar a alteração no PRD e uma decisão. Preservar requisitos anteriores que não conflitem. Reabrir tarefas afetadas e seus testes. Não tratar perguntas de status como cancelamento do projeto.

## Handoff entre sessões

Copiar este texto para uma nova conversa, junto com o repositório ou o pacote atualizado:

> Continue o projeto Standee Forge a partir do repositório/pasta informado. Leia primeiro docs/session/STATUS.md (ou STATUS.md na raiz do pacote), IMPLEMENTACAO.md e DECISOES.md. Preserve as decisões aceitas, confira git status e retome a próxima tarefa com seu critério de aceite. Não reconstrua o plano do zero, não marque integrações como prontas sem evidência e atualize o checkpoint ao concluir cada tarefa. A meta é gerar standees a partir de listas do Army Forge, com catálogo revisado, bases corretas, desenho plano na face inferior e relevo preto na superior, exportando STL e 3MF para Bambu Studio.

## Recuperação de execução interrompida

- Confirmar se processos ainda existem; não presumir conclusão por falta de erro no chat.
- Arquivos de saída devem ser escritos em temporário e renomeados atomicamente após validação.
- Reutilizar cache por hash/versionamento. Não baixar ou gerar tudo novamente sem necessidade.
- Se houver resultado parcial, validar antes de reaproveitar.
- Nenhuma tarefa fica DONE apenas porque foi iniciada, porque o modelo disse que terminou ou porque um arquivo existe.
