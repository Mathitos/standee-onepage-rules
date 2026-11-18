"""Valida um 3MF gerado fatiando-o com a CLI do Bambu Studio (gate T012, parte automatizável).

Uso: python -I prototipo/fatiar_cli.py ARQUIVO.3mf --saida PASTA [--maquina "Bambu Lab A1 0.4 nozzle"]

Observado em 17/11/2026 (Bambu Studio 02.0x, Windows):
- a CLI cai (0xC0000005) ao abrir projeto Bambu sem Metadata/project_settings.config;
- carregando os perfis do sistema, a CLI não resolve "inherits" (A1 vira mesa 200x200);
- perfis "resolvidos" à mão fazem o fatiamento falhar (-100).
Por isso o project_settings vem de perfil_bambu.project_settings (exportação pela CLI + valores
dos perfis resolvidos + 2 filamentos) e é gravado numa CÓPIA de teste, por cima do que o arquivo
trouxer. Não substitui abrir na interface nem imprimir. Volumes de purga são suposição (só
afetam estimativa de tempo/material).
"""
import argparse
import copy
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import perfil_bambu as B  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('arquivo', type=Path)
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--bico', choices=['0.2', '0.4'], help='atalho: máquina, processo e filamento da A1 com este bico')
    ap.add_argument('--maquina', default='Bambu Lab A1 0.4 nozzle')
    ap.add_argument('--processo', default='0.20mm Standard @BBL A1')
    ap.add_argument('--filamento', default='Bambu PLA Basic @BBL A1')
    ap.add_argument('--ajuste', action='append', default=[],
                    help='sobrescreve um ajuste na cópia de teste, ex.: brim_type=no_brim (diagnóstico)')
    a = ap.parse_args()
    if a.bico:
        a.maquina, a.processo, a.filamento = B.A1[a.bico]
    a.saida.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix='fatiar_'))
    zorig = zipfile.ZipFile(a.arquivo)
    original = {n: zorig.read(n) for n in zorig.namelist()}
    base, trocados = B.project_settings(a.maquina, a.processo, a.filamento)
    proj = copy.deepcopy(base)
    for aj in a.ajuste:
        k, v = aj.split('=', 1)
        proj[k] = json.loads(v) if v.startswith('[') else v

    # 3) cópia de teste = arquivo original + project_settings
    teste = tmp / 'teste.3mf'
    with zipfile.ZipFile(teste, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, d in original.items():
            if n != 'Metadata/project_settings.config':
                z.writestr(n, d)
        z.writestr('Metadata/project_settings.config', json.dumps(proj))

    # 4) fatiar e resumir; guarda a cópia validada (com perfil de teste) ao lado do resultado
    shutil.copy(teste, a.saida / f'{a.arquivo.stem}-com-perfil-teste.3mf')
    rc = B.cli(['--slice', '0', '--outputdir', str(a.saida), str(teste)])
    resultado = json.loads((a.saida / 'result.json').read_text(encoding='utf-8'))
    resumo = {'arquivo': a.arquivo.name, 'perfis': [a.maquina, a.processo, a.filamento], 'ajustes': a.ajuste,
              'mesa': proj.get('printable_area'), 'purga_suposta_mm3': B.PURGA_SUPOSTA,
              'arquivo_trazia_perfil': 'Metadata/project_settings.config' in original, 'codigo_saida': rc,
              'perfil_aplicado': {k: proj.get(k) for k in ('nozzle_diameter', 'layer_height', 'line_width',
                                                           'outer_wall_line_width', 'wall_generator')},
              'chaves_do_perfil_copiadas': trocados,
              'retorno': resultado.get('return_code'), 'mensagem': resultado.get('error_string'), 'placas': []}
    for pl in resultado.get('sliced_plates', []):
        gcode = (a.saida / f'plate_{pl["id"]}.gcode').read_text(encoding='utf-8', errors='replace')
        # troca = "M620 S<n>A" (carga no AMS) depois da primeira camada; S255 é a descarga final
        z_atual, trocas = None, []
        for linha in gcode.splitlines():
            if linha.startswith('; Z_HEIGHT:'):
                z_atual = float(linha.split(':')[1])
            elif z_atual is not None and re.match(r'M620 S(\d+)A', linha):
                n = int(re.match(r'M620 S(\d+)A', linha)[1])
                if n != 255:
                    trocas.append((z_atual, n + 1))
        resumo['placas'].append({
            'placa': pl['id'], 'objetos': len(pl.get('objects', [])),
            'camadas': gcode.count('\n; CHANGE_LAYER'),
            'filamentos_no_cabecalho': (re.search(r'^; filament: (.*)$', gcode, flags=re.M) or [None, None])[1],
            'trocas_de_filamento': len(trocas),
            'trocas_z_mm_e_filamento': trocas[:12],
            'M620_carga_ams': len(re.findall(r'^M620 S\d+A', gcode, flags=re.M)),
            'tempo_estimado_min': round(pl.get('total_predication', 0) / 60, 1),
            'aviso': pl.get('warning_message'),
        })
    (a.saida / 'resumo.json').write_text(json.dumps(resumo, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(resumo, ensure_ascii=False))


if __name__ == '__main__':
    main()
