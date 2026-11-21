"""Passo 2 da skill: baixa o army book do Army Forge (só leitura) e resume para o mapeamento.

Uso:
  python -I armybook.py --share QSGxDO-P48YX --saida catalog/gff/human-defense-force
  python -I armybook.py --army-book z65fgu0l29i4lnlu --sistema 3 --saida catalog/gff/human-defense-force

Grava <saida>/armybook/<id>-gs<sistema>-v<versão>.json (snapshot, fora do git) e um
.resumo.json com unidades, tamanhos, bases (valor bruto), armas e opções de troca.
Uma requisição por army book; sem login. API não documentada: pode mudar.
"""
import argparse
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

API = 'https://army-forge.onepagerules.com/api'
# código do share -> id do sistema na API; só o que foi verificado (17/11/2026)
SISTEMAS = {'gff': 3}
# ids para --sistema conferidos pelo gameSystemId/gameSystemSlug da resposta (21/11/2026):
# 2 grimdark-future, 3 grimdark-future-firefight, 4 age-of-fantasy, 5 age-of-fantasy-skirmish.
# Baixe os dois de cada lado (GF e GFF; AoF e AoF Skirmish): as listas podem vir de qualquer um.


def baixar(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'standee-forge-catalogo/0.1', 'Accept': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def resumir(livro):
    pacotes = {p['uid']: p for p in livro.get('upgradePackages', [])}
    unidades = []
    for u in livro.get('units', []):
        opcoes = []
        for uid in u.get('upgrades', []):
            for sec in pacotes.get(uid, {}).get('sections', []):
                for op in sec.get('options', []):
                    opcoes.append({'secao': sec.get('label'), 'ganha': [g.get('name') for g in op.get('gains', [])]})
        unidades.append({
            'id': u['id'],
            'nome': u['name'],
            'tamanho': u.get('size'),
            'bases': u.get('bases'),
            'armas': [w['name'] for w in u.get('weapons', [])],
            'itens': [{'nome': i['name'], 'bases': i.get('bases')} for i in u.get('items', [])],
            'opcoes': opcoes,
        })
    return {
        'armyBook': {'id': livro.get('uid'), 'nome': livro.get('name'), 'versao': livro.get('versionString'),
                     'modificadoEm': livro.get('modifiedAt'), 'sistema': livro.get('gameSystemSlug'),
                     'sistemaId': livro.get('gameSystemId')},
        'baixadoEm': date.today().isoformat(),
        'unidades': unidades,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--share', help='id de uma lista compartilhada (descobre army book e sistema)')
    ap.add_argument('--army-book', help='id do army book')
    ap.add_argument('--sistema', type=int, help='id do sistema na API (GFF = 3)')
    ap.add_argument('--saida', type=Path, required=True)
    a = ap.parse_args()

    if a.share:
        lista = baixar(f'{API}/share/{a.share}')
        ids = sorted({u['armyId'] for u in lista.get('units', [])})
        sistema = a.sistema or SISTEMAS.get(lista.get('gameSystem'))
        if sistema is None:
            sys.exit(f'sistema "{lista.get("gameSystem")}" sem id verificado: pergunte ao usuário e use --sistema')
    elif a.army_book and a.sistema:
        ids, sistema = [a.army_book], a.sistema
    else:
        sys.exit('informe --share ou --army-book com --sistema')

    pasta = a.saida / 'armybook'
    pasta.mkdir(parents=True, exist_ok=True)
    resumos = []
    for i in ids:
        livro = baixar(f'{API}/army-books/{i}?gameSystem={sistema}')
        nome = f'{i}-gs{sistema}-v{livro.get("versionString", "x")}'
        (pasta / f'{nome}.json').write_text(json.dumps(livro, ensure_ascii=False), encoding='utf-8')
        resumo = resumir(livro)
        (pasta / f'{nome}.resumo.json').write_text(json.dumps(resumo, indent=2, ensure_ascii=False), encoding='utf-8')
        resumos.append({'arquivo': str(pasta / f'{nome}.json'), 'resumo': str(pasta / f'{nome}.resumo.json'),
                        'nome': resumo['armyBook']['nome'], 'versao': resumo['armyBook']['versao'],
                        'unidades': len(resumo['unidades'])})
    print(json.dumps(resumos, ensure_ascii=False))


if __name__ == '__main__':
    main()
