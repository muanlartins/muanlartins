#!/usr/bin/env python3
"""JSON ↔ código T1, com o normalizar/codigo/lerCodigo de verdade do esquema.js.

  codigo.py look.json          imprime o código T1 (o look é normalizado antes, como no editor)
  codigo.py T1:...             imprime o look em JSON (só o que difere do padrão)
  codigo.py T1:... --completo  todos os campos
Os avisos vão pro stderr: o stdout é só o código ou o JSON. Para o relatório inteiro, use validar.py.
"""
import argparse, json, sys
from motor import validar

a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
a.add_argument("entrada", help="arquivo JSON, código T1, link com #t=, JSON inline ou - (stdin)")
a.add_argument("--completo", action="store_true", help="ao ler um código, mostra todos os campos")
o = a.parse_args()

r = validar(o.entrada)
n = len(r["avisos"])
if n:
    print(f"{n} aviso(s); veja com validar.py:", file=sys.stderr)
    for x in r["avisos"]:
        print(f"  - {x['mensagem']}", file=sys.stderr)
if not r["cabe"]:
    print(f"o código tem {r['caracteres']} caracteres, acima do limite de {r['limite']}", file=sys.stderr)
if r["origem"] == "codigo":
    print(json.dumps(r["look"] if o.completo else r["enxuto"], ensure_ascii=False, indent=1))
else:
    print(r["codigo"])
