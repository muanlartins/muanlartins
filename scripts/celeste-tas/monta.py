# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Turns filmed takes (rodar.ps1) into a technique page's demonstration.

    uv run monta.py <takes folder> <demo> [--aplica]

demos.json has, per demo: `crop` ([x, y, width, height] on the game's 320x180 screen), `from` and `to` (TAS frames),
`takes` (the take's id on the page: its folder in the takes folder), `cover` ([take, frame]), `gauge` (a column of
quadros.tsv, if any) and `expect` per take: [frame, column, value] rows that must hold, so a take that stopped showing
what the page says never gets published. A dry run by default: --aplica writes public/celeste/tecnicas/<demo>/
(lib/celeste-demo.ts, `Footage`). It only writes over the demo's own files and never deletes.
"""
import csv
import json
import pathlib
import sys

import numpy as np
from PIL import Image

AQUI = pathlib.Path(__file__).resolve().parent
COLUNAS, COLUNAS_ELA, CORTE = 8, 10, 48


def preenche(m):
    """The mask with its holes filled: her outline's dark pixels on dark rock."""
    ys, xs = np.nonzero(m)
    if not len(xs):
        return m
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    c = np.pad(m[y0:y1, x0:x1], 1)
    fora, fila = np.zeros_like(c), [(0, 0)]
    while fila:
        y, x = fila.pop()
        if 0 <= y < c.shape[0] and 0 <= x < c.shape[1] and not c[y, x] and not fora[y, x]:
            fora[y, x] = True
            fila += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    cheia = m.copy()
    cheia[y0:y1, x0:x1] = ~fora[1:-1, 1:-1]
    return cheia


def tomada(pasta, demo):
    fim = (pasta / "fim.txt").read_text().strip()
    feitos, total = fim.removeprefix("end ").split("/") if fim.startswith("end ") else ("", "-")
    if feitos != total:
        raise SystemExit(f"{pasta.name}: the TAS didn't run to its end ({fim})")
    linhas = list(csv.DictReader(open(pasta / "quadros.tsv"), delimiter="\t"))
    if any(r["salto"] != "1" for r in linhas[1:]):
        raise SystemExit(f"{pasta.name}: a frame was skipped")
    onde = {int(r["frame"]): i for i, r in enumerate(linhas)}
    falta = [f for f in range(demo["from"], demo["to"] + 1) if f not in onde]
    if falta:
        raise SystemExit(f"{pasta.name}: frames {falta[0]}-{falta[-1]} weren't filmed")
    cheio, vazio = (np.memmap(pasta / f"{nome}.rgba", np.uint8, "r").reshape(-1, 180, 320, 4) for nome in ("quadros", "fundo"))
    return linhas, onde, cheio, vazio


def confere(nome, linhas, onde, esperado):
    errado = []
    for frame, coluna, valor in esperado:
        achado = linhas[onde[frame]][coluna] if frame in onde else None
        certo = achado == valor if isinstance(valor, str) else achado not in (None, "") and abs(float(achado) - valor) < 0.01
        if not certo:
            errado.append(f"{nome}: frame {frame} {coluna} is {achado}, expected {valor}")
    return errado


def monta(demo, pasta):
    linhas, onde, cheio, vazio = tomada(pasta, demo)
    cx, cy, w, h = demo["crop"]
    frames = range(demo["from"], demo["to"] + 1)
    cena = np.zeros(((len(frames) - 1) // COLUNAS * h + h, COLUNAS * w, 4), np.uint8)
    ela = np.zeros(((len(frames) - 1) // COLUNAS_ELA * CORTE + CORTE, COLUNAS_ELA * CORTE, 4), np.uint8)
    dados = {"cam": [], "feet": [], "cut": [], "keys": []}
    if demo.get("gauge"):
        dados["gauge"] = []
    pes, fora = (160, 90), 0
    for j, frame in enumerate(frames):
        i = onde[frame]
        r = linhas[i]
        cam = (round(float(r["camX"])), round(float(r["camY"])))
        viva = r["x"] != "" and r["morta"] == "0"
        if r["x"]:
            pes = (round(float(r["x"])) - cam[0], round(float(r["y"])) - cam[1])
        cena[j // COLUNAS * h:j // COLUNAS * h + h, j % COLUNAS * w:j % COLUNAS * w + w] = cheio[i, cy:cy + h, cx:cx + w]

        # Her: what differs from the same update drawn without her. Over 48, so not her light's halo.
        muda = preenche(np.abs(cheio[i].astype(int) - vazio[i].astype(int))[..., :3].sum(2) > 48)
        x0, y0 = pes[0] - CORTE // 2, pes[1] - CORTE + 12
        corte = ela[j // COLUNAS_ELA * CORTE:, j % COLUNAS_ELA * CORTE:][:CORTE, :CORTE]
        dentro = np.zeros_like(muda)
        for y in range(max(y0, 0), min(y0 + CORTE, 180)):
            for x in range(max(x0, 0), min(x0 + CORTE, 320)):
                dentro[y, x] = True
                if muda[y, x]:
                    corte[y - y0, x - x0] = cheio[i, y, x]
        if viva:
            fora = max(fora, int((muda & ~dentro).sum()))

        dados["cam"].append(cam)
        dados["feet"].append([round(float(r["x"]), 2), round(float(r["y"]), 2), round(float(r["altura"]))] if viva else None)
        dados["cut"].append([x0 - cx, y0 - cy])
        dados["keys"].append(int(r["teclas"]))
        if demo.get("gauge"):
            valor = r[demo["gauge"]]
            dados["gauge"].append(round(float(valor), 4) if valor else 0)
    return dados, Image.fromarray(cena).convert("RGB"), Image.fromarray(ela), fora


def main():
    argumentos = [a for a in sys.argv[1:] if a != "--aplica"]
    if len(argumentos) != 2:
        raise SystemExit(__doc__)
    tomadas, nome = pathlib.Path(argumentos[0]), argumentos[1]
    demo = json.loads((AQUI / "demos.json").read_text())[nome]

    errado = []
    for qual, pasta in demo["takes"].items():
        linhas, onde, _, _ = tomada(tomadas / pasta, demo)
        errado += confere(qual, linhas, onde, demo.get("expect", {}).get(qual, []))
    if errado:
        raise SystemExit("\n".join(errado))

    cx, cy, w, h = demo["crop"]
    filmagem = {
        "width": w, "height": h, "crop": [cx, cy], "from": demo["from"], "to": demo["to"],
        "sheet": {"columns": COLUNAS, "cutColumns": COLUNAS_ELA, "cutSize": CORTE}, "takes": {},
    }
    imagens = {}
    for qual, pasta in demo["takes"].items():
        dados, cena, ela, fora = monta(demo, tomadas / pasta)
        filmagem["takes"][qual] = dados
        imagens |= {f"{qual}-cena.webp": cena, f"{qual}-ela.webp": ela}
        print(f"{nome}/{qual}: ok, at most {fora} pixels of her outside the cut-out")
    qual, frame = demo["cover"]
    j = frame - demo["from"]
    imagens["capa.webp"] = imagens[f"{qual}-cena.webp"].crop((j % COLUNAS * w, j // COLUNAS * h, j % COLUNAS * w + w, j // COLUNAS * h + h))

    if "--aplica" not in sys.argv:
        print(f"dry run: {len(imagens) + 1} files for public/celeste/tecnicas/{nome}/ (--aplica writes them)")
        return
    saida = AQUI.parents[1] / "public/celeste/tecnicas" / nome
    saida.mkdir(parents=True, exist_ok=True)
    for arquivo, imagem in imagens.items():
        imagem.save(saida / arquivo, lossless=True, method=6)
    (saida / "dados.json").write_text(json.dumps(filmagem, separators=(",", ":")) + "\n")
    print(f"{saida}: {round(sum(a.stat().st_size for a in saida.iterdir()) / 1e6, 2)} MB")


if __name__ == "__main__":
    main()
