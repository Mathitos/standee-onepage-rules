"""Valida um 3MF gerado fatiando-o com a CLI do Bambu Studio (gate T012, parte automatizável).

Uso: python -I prototipo/fatiar_cli.py ARQUIVO.3mf --saida PASTA [--maquina "Bambu Lab A1 0.4 nozzle"]

Observado em 17/11/2026 (Bambu Studio 02.0x, Windows), e por isso este roteiro:
- a CLI cai (0xC0000005) ao abrir projeto Bambu sem Metadata/project_settings.config;
- carregando os perfis do sistema, a CLI não resolve "inherits" (A1 vira mesa 200x200);
- perfis "resolvidos" à mão fazem o fatiamento falhar (-100);
- ao exportar projeto, a CLI descarta filamentos não usados (fica 1 filamento).
Então: pedimos à CLI um project_settings a partir dos perfis do sistema, corrigimos a mesa
com o valor do perfil-pai, completamos 2 filamentos (branco/preto) e injetamos tudo numa
CÓPIA de teste. O arquivo entregue continua sem perfil. Não substitui abrir na interface
nem imprimir. Volumes de purga usados aqui são suposição (só afetam estimativa de tempo/material).
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

EXE = Path(r'C:/Program Files/Bambu Studio/bambu-studio.exe')
PERFIS = EXE.parent / 'resources/profiles/BBL'
PURGA_SUPOSTA = ['0', '200', '600', '0']   # branco->preto, preto->branco (mm3), suposição


def resolver(pasta, nome):
    d = json.loads((PERFIS / pasta / f'{nome}.json').read_text(encoding='utf-8'))
    pai = d.pop('inherits', None)
    base = resolver(pasta, pai) if pai else {}
    base.update(d)
    return base


def cli(args):
    return subprocess.run([str(EXE), *args], capture_output=True, text=True).returncode


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('arquivo', type=Path)
    ap.add_argument('--saida', type=Path, required=True)
    ap.add_argument('--maquina', default='Bambu Lab A1 0.4 nozzle')
    ap.add_argument('--processo', default='0.20mm Standard @BBL A1')
    ap.add_argument('--filamento', default='Bambu PLA Basic @BBL A1')
    ap.add_argument('--ajuste', action='append', default=[],
                    help='sobrescreve um ajuste na cópia de teste, ex.: brim_type=no_brim (diagnóstico)')
    a = ap.parse_args()
    a.saida.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix='fatiar_'))
    ajustes = f'{PERFIS / "machine" / (a.maquina + ".json")};{PERFIS / "process" / (a.processo + ".json")}'
    fil = PERFIS / 'filament' / f'{a.filamento}.json'
    filamentos = f'{fil};{fil}'

    # 1) cópia genérica -> projeto exportado pela CLI -> project_settings
    zorig = zipfile.ZipFile(a.arquivo)
    original = {n: zorig.read(n) for n in zorig.namelist()}
    generico = tmp / 'generico.3mf'
    with zipfile.ZipFile(generico, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, d in original.items():
            if n == '3D/3dmodel.model':
                d = re.sub(rb'<metadata name="Application">[^<]*</metadata>', b'', d)
            z.writestr(n, d)
    rc = cli(['--outputdir', str(tmp), '--export-3mf', 'exportado.3mf', '--load-settings', ajustes,
              '--load-filaments', filamentos, str(generico)])
    exportado = tmp / 'exportado.3mf'
    if rc != 0 or not exportado.exists():
        sys.exit(f'exportação de perfil falhou: {rc}')
    proj = json.loads(zipfile.ZipFile(exportado).read('Metadata/project_settings.config'))

    # 2) correções: mesa do perfil-pai; dois filamentos
    maquina = resolver('machine', a.maquina)
    for k in ('printable_area', 'printable_height', 'bed_exclude_area', 'machine_start_gcode',
              'machine_end_gcode', 'change_filament_gcode', 'layer_change_gcode', 'time_lapse_gcode'):
        if k in maquina:
            proj[k] = maquina[k]
    proj['enable_prime_tower'] = resolver('process', a.processo).get('enable_prime_tower', '1')
    chaves_fil = set(resolver('filament', a.filamento)) | {'filament_settings_id', 'filament_colour', 'filament_ids'}
    for k, v in list(proj.items()):
        if k in chaves_fil and isinstance(v, list) and len(v) == 1:
            proj[k] = v * 2
    proj['filament_colour'] = ['#FFFFFF', '#000000']
    proj['flush_volumes_matrix'] = PURGA_SUPOSTA
    if isinstance(proj.get('flush_volumes_vector'), list) and len(proj['flush_volumes_vector']) == 2:
        proj['flush_volumes_vector'] = proj['flush_volumes_vector'] * 2
    for aj in a.ajuste:
        k, v = aj.split('=', 1)
        proj[k] = json.loads(v) if v.startswith('[') else v

    # 3) cópia de teste = arquivo original + project_settings
    teste = tmp / 'teste.3mf'
    with zipfile.ZipFile(teste, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, d in original.items():
            z.writestr(n, d)
        z.writestr('Metadata/project_settings.config', json.dumps(proj))

    # 4) fatiar e resumir; guarda a cópia validada (com perfil de teste) ao lado do resultado
    import shutil
    shutil.copy(teste, a.saida / f'{a.arquivo.stem}-com-perfil-teste.3mf')
    rc = cli(['--slice', '0', '--outputdir', str(a.saida), str(teste)])
    resultado = json.loads((a.saida / 'result.json').read_text(encoding='utf-8'))
    resumo = {'arquivo': a.arquivo.name, 'perfis': [a.maquina, a.processo, a.filamento], 'ajustes': a.ajuste,
              'mesa': proj.get('printable_area'), 'purga_suposta_mm3': PURGA_SUPOSTA, 'codigo_saida': rc,
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
