"""Grava o project_settings da A1 (bicos 0,2 e 0,4) para o site embutir no 3MF (D026, D039).

Uso (na raiz): python -I prototipo/perfil_para_site.py
Saída: public/bambu/a1-bico-<bico>.json, com os perfis de origem e o project_settings.config
que o protótipo grava. Os valores vêm do Bambu Studio instalado (perfil_bambu); a placa é a
padrão da impressora (Textured PEI na A1).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import perfil_bambu as B  # noqa: E402

destino = Path(__file__).resolve().parents[1] / 'public' / 'bambu'
destino.mkdir(parents=True, exist_ok=True)
for bico in ('0.2', '0.4'):
    perfis, projeto = B.para_bico(bico)
    saida = {'bico': float(bico), 'perfis': list(perfis), 'projeto': projeto}
    alvo = destino / f'a1-bico-{bico}.json'
    alvo.write_text(json.dumps(saida, ensure_ascii=False, separators=(',', ':')), encoding='utf-8', newline='\n')
    print(alvo, round(alvo.stat().st_size / 1024, 1), 'KB', projeto.get('curr_bed_type'))
