#!/usr/bin/env python3
"""Confere um look como o editor: normalizar() do esquema.js de verdade, e diz em palavras o que mudou.

  validar.py look.json             avisos, o look como fica salvo (só o que difere do padrão) e o código T1
  validar.py T1:...                o mesmo para um código (ou um link com #t=T1:...)
  validar.py '{"topo":"afro"}'     JSON inline; '-' lê do stdin
  --completo                       o look normalizado inteiro (todos os campos)
  --json                           tudo num JSON (look, enxuto, codigo, avisos, semEfeito, dicas...)
Saída 0 = leu (mesmo com avisos); 2 = entrada ilegível.
"""
import argparse, json, sys
from motor import validar, resumo

a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
a.add_argument("entrada", help="arquivo JSON, código T1, link com #t=, JSON inline ou - (stdin)")
a.add_argument("--completo", action="store_true", help="mostra o look normalizado inteiro")
a.add_argument("--json", action="store_true", help="saída em JSON")
o = a.parse_args()

r = validar(o.entrada)
if o.json:
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0)
resumo(r)
print()
print("Look normalizado" + ("" if o.completo else " (só o que difere do padrão)") + ":")
print(json.dumps(r["look"] if o.completo else r["enxuto"], ensure_ascii=False, indent=1))
print()
print("Código:")
print(r["codigo"])
