#!/usr/bin/env python3
"""O esquema, curto o bastante para ler inteiro, ou um campo em detalhe. O JSON inteiro sai com --json.

  esquema.py                 todos os campos, um por linha, por aba e grupo (tipo, opções ou faixa, padrão)
  esquema.py olho chapeu     esses campos em detalhe; uma palavra que não é chave procura nos rótulos e opções
  esquema.py pecas           os campos de uma lista (pecas, desenhos, mechas)
  esquema.py torcida clubs   o time, a frase e os stickers; os clubes e a camisa de cada um
  esquema.py --json          o esquema inteiro em JSON (feito agora a partir do esquema.js, nunca uma cópia)
"""
import argparse, json, sys, unicodedata
from motor import chamar

a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
a.add_argument("chaves", nargs="*", help="chaves ou palavras pra procurar")
a.add_argument("--json", action="store_true", help="o esquema inteiro em JSON")
o = a.parse_args()
E = chamar("esquema")
if o.json:
    print(json.dumps(E, ensure_ascii=False, indent=1))
    sys.exit(0)


def faixa(c):
    if c["type"] == "op":
        return " | ".join(x["id"] for x in c["options"])
    if c["type"] == "num":
        return f"{c['min']}..{c['max']}" + (" inteiro" if c["step"] == 1 else "")
    if c["type"] == "cor":
        return f"#rrggbb (paleta {c['palette']})"
    return "true | false"


def linha(c):
    s = f"  {c['key']:<10} {c['type']:<3} {faixa(c)}  [padrão {json.dumps(c['default'], ensure_ascii=False)}]  {c['label']}"
    return s + (f"  ({c['shownWhen']})" if c.get("shownWhen") else "")


semAcento = lambda s: unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()
listas = {k: v for k, v in E["lists"].items()}
if not o.chaves:
    por = {c["key"]: c for c in E["fields"]}
    for aba in E["tabs"]:
        print(f"== {aba['name']}")
        for g in aba["groups"]:
            print(f"-- {g['name']}")
            for k in g["keys"]:
                print(linha(por[k]))
        for l in aba.get("lists", []):
            print(f"-- lista {l} (máx. {listas[l]['max']} itens, cada um um objeto com:)")
            for c in listas[l]["fields"]:
                print(linha(c))
    print(f"\nLimites: {json.dumps(E['limits'])} · código até {E['format']['maxChars']} caracteres")
    print("Torcida: " + ", ".join(E["torcida"]) + " (esquema torcida)")
    print("Modelos: " + ", ".join(m["name"] for m in E["presets"]))
    print("Clubes: " + ", ".join(c["name"] for c in E["clubs"]) + " (esquema clubs: a camisa de cada um)")
    print("Coordenadas e formas: scripts/torcedor/torcedor esquema --json (seção coordinates) ou scripts/torcedor/README.md")
    sys.exit(0)

todos = [(c, None) for c in E["fields"]] + [(c, l) for l in listas for c in listas[l]["fields"]]


def detalhe(c, l=None):
    onde = f" · {c['tab']} › {c['group']}" if c.get("tab") else ""
    print(f"{(l + '[].') if l else ''}{c['key']}{onde} · {c['label']} · {c['type']} · padrão {json.dumps(c['default'], ensure_ascii=False)}")
    if c["type"] == "op":
        print("  opções: " + ", ".join(f"{x['id']} ({x['label']})" for x in c["options"]))
    elif c["type"] == "num":
        print(f"  de {c['min']} a {c['max']}" + (", inteiro" if c["step"] == 1 else ""))
    elif c["type"] == "cor":
        print(f"  #rrggbb; paleta {c['palette']}: " + ", ".join(f"{x['hex']} {x['name']}" for x in E["palettes"][c["palette"]]))
    if c.get("shownWhen"):
        print(f"  {c['shownWhen']}")


for q in o.chaves:
    if q == "torcida":
        for k, v in E["torcida"].items():
            print(f"  {k:<10} {v}")
        continue
    if q in ("clubs", "clubes"):
        for c in E["clubs"]:
            print(f"  {c['name']:<20} {json.dumps(c['look'], ensure_ascii=False)}")
        continue
    if q in listas:
        print(f"lista {q}: até {listas[q]['max']} itens, cada um um objeto com:")
        for c in listas[q]["fields"]:
            print(linha(c))
        continue
    exatos = [(c, l) for c, l in todos if c["key"] == q]
    achados = exatos or [(c, l) for c, l in todos if semAcento(q) in semAcento(" ".join([c["label"], c.get("keywords", ""), *(x["label"] + " " + x["id"] for x in c.get("options", []))]))]
    if not achados:
        print(f"{q}: nada")
    for c, l in achados:
        detalhe(c, l)
