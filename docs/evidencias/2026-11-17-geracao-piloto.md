# Geração de teste da lista piloto — duas metades, borda grossa (17/11/2026)

Pedido do usuário: gerar a lista exemplo com duas metades e borda grossa para testar a geração.

## Como reproduzir (na raiz do projeto, PC Windows 11 desta sessão)

```text
PY=C:/Users/Matheus/AppData/Local/Python/pythoncore-3.14-64/python.exe
$PY -I prototipo/gerar.py prototipo/lista-piloto.json --modo duas-metades --estilo borda --saida saidas/piloto-duas-metades-borda
$PY -I prototipo/fatiar_cli.py saidas/piloto-duas-metades-borda/figuras-duas-metades-borda.3mf --saida saidas/piloto-duas-metades-borda/fatiamento-cli/figuras
$PY -I prototipo/fatiar_cli.py saidas/piloto-duas-metades-borda/bases-duas-metades-borda.3mf --saida saidas/piloto-duas-metades-borda/fatiamento-cli/bases
```

Dependência nova: `manifold3d` (pip, Python 3.14). Geração em ~4 s.

## Resultado

- 14 modelos → 28 metades + 14 bases. Figuras em 1 placa (3,7 MB), bases em 1 placa (0,03 MB).
- Malhas fechadas e consistentes (manifold3d + trimesh). Corpo Z 0–1,2 mm; relevo 1,2–1,6 mm.
- IoU frente × verso espelhado: 0,983–0,996. Contorno do verso = frente espelhada por construção.
- Escala do PDF: altura com borda e travessa ≈ 37 mm (Infantry/Veteran), 35 mm (Biker), 57 mm (OGRE).
- Furos Ø2,0 × 0,8 mm, 2 por metade, por transformada de distância (parede ≥ 1 mm).
- Traço preto < 0,4 mm: 15–30% da área preta, conforme a arte.
- Arma passa da base: OGRE 1,6 mm (base 40), Veteran 0,9 mm (base 25).
- **Bambu Studio CLI, perfil A1 0,4 de teste**: figuras OK — 28 objetos, 8 camadas, 1 troca (Z 1,4 mm, filamento 2), ~469 min; bases OK — 14 objetos, 20 camadas, 0 trocas, ~235 min. Purga suposta (200/600 mm³).
- Substituições de teste (não decididas pelo usuário): OGRE Minigun para Gatling; 2 Biker Pistol + 1 Biker Lance.

## Modo peça única (mesma noite, estilo borda)

`--modo peca-unica`: face da mesa com o desenho P/B da **frente** (espelhado no modelo para ser lido por baixo), núcleo branco, relevo preto com a arte do **verso** em cima; lingueta simples de 1,2 mm e fenda de 1,45 mm.

- Seções da primeira figura: em Z 0,1 e 0,3 mm, branco 1020,6 + preto 921,6 = 1942,2 mm² (silhueta inteira); de 0,6 a 1,1 mm só branco (1942,2); em 1,4 mm só relevo preto (953,1). Interseção entre partes: 0 mm³.
- Fatiador (CLI, perfil A1 de teste): figuras OK — 14 objetos, 8 camadas, **3 trocas** (Z 0,2 → preto; 0,4 → branco; 1,4 → preto), ~354 min; bases OK — 14 objetos, sem troca, ~236 min. 3MF de figuras: 5,2 MB.
- Comparação: duas metades = 1 troca por placa e ~469 min para 28 metades; peça única = 3 trocas e ~354 min para 14 peças.
- Uma execução da CLI travou sem CPU por 10 min (processo que não pôde ser encerrado nem com `taskkill`); `fatiar_cli.py` agora usa tempo limite de 300 s com nova tentativa.

## O que a CLI do Bambu exige (aprendizado para o exportador do site)

Observado com Bambu Studio 02.0x no Windows; cada item foi isolado por teste:

1. 3MF **sem** `<metadata name="Application">BambuStudio…` é importado como genérico: fatia, mas **ignora o filamento de cada parte** (tudo sai numa cor).
2. Com a marca Bambu, a estrutura precisa seguir a do próprio Bambu:
   - `BambuStudio:3mfVersion`, extensão de produção (`requiredextensions="p"`), malhas em `3D/Objects/object_k.model` + `3D/_rels/3dmodel.model.rels`;
   - **ids de malhas e de objetos montados num único espaço global** (ids repetidos entre arquivos fazem o Bambu misturar malhas: "fora da mesa" e "G-code conflicts");
   - UUIDs no padrão do Bambu (`…-61cb-…` objeto, `…-71cb-…` cópia, `…-81cb-…` malha, `…-b206-…` componente, `…-b1ec-…` item, build fixo);
   - `model_settings.config` com parte por id de malha, `extruder` por parte, `mesh_stat`, placa com `model_instance` e `filament_map_mode`;
   - cópias = objetos separados apontando para a malha do primeiro (arquivo não cresce).
3. Projeto Bambu **sem `project_settings.config` derruba a CLI** (0xC0000005). Não se sabe se a interface aceita; por isso o arquivo limpo vai acompanhado de uma cópia com perfil de teste.
4. A CLI não resolve `inherits` dos perfis do sistema (A1 virava mesa 200 × 200, sem G-code de troca); perfis resolvidos à mão quebram o fatiamento (-100). Solução no `fatiar_cli.py`: exportar com perfis do sistema e corrigir só mesa e modelos de G-code.
5. A exportação de projeto pela CLI descarta filamentos não usados; listas de filamento precisam ser completadas para 2.
6. A torre de purga padrão da A1 fica em x=15, y=220 (largura 35); a disposição reserva essa área.

## Limites

Não houve abertura na interface do Bambu Studio nem impressão. Ver `saidas/piloto-duas-metades-borda/LEIA-ME.md`.
