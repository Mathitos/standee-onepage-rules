# Registro de decisões

| ID | Estado | Decisão / justificativa |
|---|---|---|
| D001 | Aceita pelo usuário; entrada revista por D010 | Preferência por GitHub Pages; saída STL ou 3MF. A entrada por link foi substituída por texto exportado no MVP |
| D002 | Aceita pelo usuário; vale para o modo peça única (D011) | Desenho também na face plana encostada na mesa; relevo preto superior; encaixe central |
| D003 | Aceita pelo usuário | Bases devem seguir formato/medidas recomendados para a unidade quando confirmados |
| D004 | Aceita para iniciar | Piloto Human Defense Force e lista QSGxDO-P48YX |
| D005 | Proposta, reforçada por T001 | Aplicação estática com worker e **sem servidor no MVP** (D010 dispensa chamadas ao Army Forge) |
| D006 | **Decidida pelo usuário** (17/11) | As artes vão para o git e para o site; o PDF não. Motivo do usuário: os paper minis são distribuídos de graça pela OPR para testar os jogos; a OPR vende os modelos 3D. Consulta em 17/11: os termos do site da OPR dão uso pessoal a patronos e não citam paper minis; os pacotes gratuitos não trazem termos. O PDF fica fora por tamanho (61 MB) e por não ser necessário depois da extração |
| D007 | Revista em 17/11 | Na importação por texto não há IDs: chave = nome da unidade + versão do army book + equipamento. IDs do Army Forge ficam no catálogo quando conhecidos. Aliases revisados; matching incerto exige revisão |
| D008 | **Substituída** em 17/11 | Repetir a mesma arte espelhada no verso. O PDF tem vista de frente e de verso para cada modelo (silhuetas coincidem 97–99% espelhadas); MVP usa artes distintas |
| D009 | Proposta | Gerar 3MF com instâncias reutilizadas para reduzir tamanho e custo de geração |
| D010 | **Aceita pelo usuário** (17/11) | Importação do MVP por texto colado do "Share as Text" do Army Forge. Link direto fora do MVP: API sem CORS (evidência T001); proxy só após verificar termos |
| D011 | **Aceita pelo usuário** (17/11) | Forma física é opção na geração, como o estilo (D012): peça única (D002: desenho na face da mesa + relevo em cima) ou duas metades (relevo nas duas faces visíveis, unidas por encaixe). Detalhes em PRD-03 |
| D012 | **Aceita pelo usuário** (17/11) | Mapear os dois estilos do PDF (contorno fino p2–31; borda grossa p32–61) como variantes, como as de arma. A geração usa o estilo escolhido pelo usuário |
| D013 | **Aceita pelo usuário** (17/11) | Variante não encontrada nas artes mapeadas: o usuário escolhe a substituta, vendo a imagem dela. Nunca substituir automaticamente |
| D014 | Proposta (revisão 17/11) | Escala física padrão = escala de impressão do PDF a 100% (300 dpi). Multiplicador global só por escolha explícita. Abandona a altura fixa de 40 mm dos testes |
| D015 | Proposta (revisão 17/11) | Bases vêm do catálogo, capturadas do army book pelo curador com versão e data, porque o texto não traz bases. Versão diferente na lista → alerta e revisão |
| D016 | **Substituída por D017** | Catálogo por recorte de grade + rotulagem manual em tela; OCR opcional |
| D019 | Adotada no esqueleto (17/11), reversível | Site em Vite + React + TypeScript + Vitest, publicado pelo GitHub Actions no Pages com caminhos relativos. Repositório local em `main`; o usuário faz o push |
| D018 | Proposta (17/11) | Geometria por polígonos extrudados com manifold3d (Python no protótipo; existe build WebAssembly para o site). Substitui marching cubes do protótipo antigo: 28 metades em 3,7 MB contra 36 MB para 8 peças |
| D020 | **Aceita pelo usuário** (17/11) | Artes do catálogo são vetores: a skill extrai do PDF e grava SVG em mm por arte, estilo e face (`silhueta` + `tinta`), mapeados no `manifest.json`. O PDF HDF é raster (300 dpi), então o vetor é traçado com o mesmo método do gerador (contorno do pixel, 0,5 px). Medido no piloto: IoU da silhueta ≥ 0,998; toda diferença da tinta fica na faixa de 1 px da borda (< 0,085 mm). Frente e verso têm a mesma tela e o verso já vem alinhado: espelhar em x o sobrepõe à frente. Contrato em `.claude/skills/importar-artes-pdf/scripts/vetor.py` |
| D017 | **Aceita pelo usuário** (17/11) | Rotulagem e importação das imagens são uma skill do Claude Code executada pelo agente, uma sessão por PDF; o pacote é exportado para dentro do projeto. Scripts fazem recorte e medidas; o agente lê rótulos e propõe o mapeamento. Sem tela de rotulagem no site e sem OCR. Especificação em PRD-04 |

## Decisões ainda pendentes

- Contorno quando frente e verso têm silhuetas diferentes (capas dos Storm Troopers): união, só frente ou escolha por arte (PRD-03).
- Aliases propostos na revisão parcial do piloto: Rifle → Battle Rifle, Baton → Shock Baton, Axe → Energy Axe e "Lance" (Heavy, Hunting ou Anti-Tank).
- Mecanismo de encaixe das metades (pino solto, só cola ou outro), após cupom físico.
- Geometria da base oval 60x35: elipse (suposição) — confirmar.
- Repositório, conta/organização GitHub e visibilidade do código.
- Termos de uso da API do Army Forge, se um dia houver importação por link (fora do MVP).
- Perfil de impressora e bico para o teste de impressão.

Resolvidas em 17/11 com evidência: contrato do Army Forge e CORS (T001); bases do piloto (army book v3.6.0); cobertura do piloto no PDF (ver `evidencias/2026-11-17-pdf-hdf.md`; lacunas tratadas por D013).

Criar ADR curto para decisões técnicas relevantes: contexto, opções, escolha, motivo, consequências e evidência. Decisões propostas não devem aparecer como aprovadas pelo usuário em retomadas.
