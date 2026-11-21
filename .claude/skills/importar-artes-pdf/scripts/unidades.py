"""Passo 2b da skill: junta as unidades de todos os army books baixados da facção, para o mapeamento.

Uso: python -I unidades.py --saida catalog/<sistema>/<faccao>

O mesmo army book vem em vários sistemas (GF e GFF; AoF e AoF Skirmish). O id da unidade é o
mesmo nos sistemas e o nome pode mudar ("OGRE Robots" / "OGRE Robot"); o GF e o AoF têm unidades
que o Firefight e o Skirmish não têm. Grava work/unidades-armybook.json (fora do git) com, por id:
nome em cada sistema, genericName (nome genérico antigo, que os rótulos do PDF costumam usar),
tamanho, bases, armas, itens e opções (seção -> nomes que ela dá). Falha se o arquivo não for do
sistema pedido ou se as bases diferirem entre sistemas.
"""
import argparse
import json
import sys
from pathlib import Path


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--saida', type=Path, required=True)
    a = ap.parse_args()
    unidades, livros, erros = {}, [], []
    for f in sorted((a.saida / 'armybook').glob('*-gs*-v*.json')):
        if f.name.endswith('.resumo.json'):
            continue
        d = json.loads(f.read_text(encoding='utf-8'))
        pedido = int(f.name.split('-gs')[1].split('-')[0])
        if d.get('gameSystemId') != pedido:
            erros.append(f'{f.name}: pedido gs{pedido}, veio gs{d.get("gameSystemId")}')
        gs = f'gs{d["gameSystemId"]} ({d["gameSystemSlug"]})'
        livros.append(f.name)
        pk = {p['uid']: p for p in d.get('upgradePackages', [])}
        for u in d['units']:
            e = unidades.setdefault(u['id'], {'armyForgeUnitId': u['id'], 'nomePorSistema': {}, 'genericName': u.get('genericName'),
                                               'tamanhoPorSistema': {}, 'bases': u.get('bases'),
                                               'armas': [w['name'] for w in u.get('weapons', [])],
                                               'itens': [i['name'] for i in u.get('items', [])], 'opcoes': {}})
            if e['bases'] != u.get('bases'):
                erros.append(f'{u["name"]}: bases diferem entre sistemas ({e["bases"]} x {u.get("bases")})')
            e['nomePorSistema'][gs] = u['name']
            e['tamanhoPorSistema'][gs] = u.get('size')
            for uid in u.get('upgrades', []):
                for sec in pk.get(uid, {}).get('sections', []):
                    ganhos = sorted({g.get('name') for op in sec.get('options', []) for g in op.get('gains', []) if g.get('name')})
                    if ganhos:
                        e['opcoes'][sec.get('label') or '?'] = sorted(set(e['opcoes'].get(sec.get('label') or '?', [])) | set(ganhos))
    if erros:
        sys.exit('\n'.join(erros))
    saida = a.saida / 'work' / 'unidades-armybook.json'
    saida.parent.mkdir(parents=True, exist_ok=True)
    saida.write_text(json.dumps({'nota': 'Unidades de todos os army books baixados, juntas pelo id. opcoes: seção -> nomes que ela dá.',
                                 'livros': livros, 'unidades': list(unidades.values())}, indent=1, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({'arquivo': str(saida), 'livros': livros, 'unidades': len(unidades)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
