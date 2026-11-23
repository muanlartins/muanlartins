"""Celeste's chapters on the camera filter (public/stream/filtros/celeste/cenarios.js): a chapter's own scenery, read
from the installed game as it is, into public/stream/privado/celeste/fases/ (gitignored: never committed or published).

  uv run --no-project --with pillow python3 scripts/celeste_arte.py 1-ForsakenCity [<map>…]   (or --todos)

For the map named (Content/Maps/<map>.bin), it writes:
  <map>.png   every texture its stylegrounds draw (the parallax backgrounds behind the level and the layers over it)
              and every decal of the chapter's folders (PASTAS; a B or C side has its A side's), each whole
              (its frame, padding included, so it sits where the game puts it), packed with straight alpha
  <map>.json  where each is in it (`pecas`: name → [x, y, w, h]), the stylegrounds in the game's order (`fundos`
              behind, `frentes` over: each parallax's attributes as the map has them, an effect by its name) and
              each room's place in the map (`salas`: name → [x, y, w, h], in the game's pixels)

Textures come from Content/Graphics/Atlases: Gameplay (Gameplay.meta, Gameplay0.data) or, by name, Misc's own files.
A .data is the game's run-length format (width, height, alpha or not, then runs of one colour, premultiplied).
Read-only; never deletes anything. Luan not live (it's light, but it reads ~70 MB off the game).
"""

import json
import struct
import sys
from pathlib import Path

from PIL import Image

CELESTE = Path("/mnt/c/Program Files (x86)/Steam/steamapps/common/Celeste/Content")
ATLASES = CELESTE / "Graphics/Atlases"
ROOT = Path(__file__).resolve().parent.parent
# Resolved: a worktree's is a link to the shared checkout's.
PRIVADO = (ROOT / "public/stream/privado").resolve()
if not PRIVADO.exists():
    PRIVADO = Path.home() / "repos/muanlartins/public/stream/privado"
OUT = PRIVADO / "celeste/fases"
LARGURA = 1024  # the packed PNG's width
ATLAS = {}  # each atlas page as it's read, kept for the next map
# Each chapter's decals (Gameplay's decals/<folder>/), by its A side's map.
PASTAS = {
    "0-Intro": ["0-prologue"],
    "1-ForsakenCity": ["1-forsakencity"],
    "2-OldSite": ["2-oldsite"],
    "3-CelestialResort": ["3-resort"],
    "4-GoldenRidge": ["4-cliffside"],
    "5-MirrorTemple": ["5-temple", "5-temple-dark"],
    "6-Reflection": ["6-reflection"],
    "7-Summit": ["7-summit"],
    "8-Epilogue": ["8-epilogue", "0-prologue"],
    "9-Core": ["9-core"],
    "LostLevels": ["10-farewell"],
}


class Leitor:
    def __init__(self, b):
        self.b, self.i = b, 0

    def u8(self):
        self.i += 1
        return self.b[self.i - 1]

    def un(self, fmt):
        v = struct.unpack_from(fmt, self.b, self.i)[0]
        self.i += struct.calcsize(fmt)
        return v

    def texto(self):
        # .NET's BinaryReader string: a 7-bit length, then UTF-8.
        n = s = 0
        while True:
            c = self.u8()
            n |= (c & 0x7F) << s
            s += 7
            if c < 0x80:
                break
        self.i += n
        return self.b[self.i - n : self.i].decode("utf-8", "replace")


def indice(nome):
    """An atlas' .meta: name → (its .data, x, y, w, h, frame x, frame y, frame w, frame h)."""
    r = Leitor((ATLASES / f"{nome}.meta").read_bytes())
    r.un("<i"), r.texto(), r.un("<i")
    out = {}
    for _ in range(r.un("<h")):
        data = r.texto()
        for _ in range(r.un("<h")):
            caminho = r.texto().replace("\\", "/")
            out[caminho] = (data, *struct.unpack_from("<8h", r.b, r.i))
            r.i += 16
    return out


def imagem(caminho):
    """A .data as an RGBA image (straight alpha)."""
    b = caminho.read_bytes()
    w, h = struct.unpack_from("<ii", b)
    alfa = b[8] == 1
    px = bytearray(w * h * 4)
    i, p, fim = 9, 0, w * h * 4
    while p < fim:
        n = b[i] * 4
        if alfa:
            a = b[i + 1]
            cor = bytes((b[i + 4], b[i + 3], b[i + 2], a)) if a else b"\0\0\0\0"
            i += 5 if a else 2
        else:
            cor = bytes((b[i + 3], b[i + 2], b[i + 1], 255))
            i += 4
        px[p : p + n] = cor * (n // 4)
        p += n
    # Premultiplied in the file: "RGBa" is Pillow's name for that.
    return Image.frombytes("RGBa", (w, h), bytes(px)).convert("RGBA")


def mapa(nome):
    """A map's element tree (Celeste's BinaryPacker): {"n": name, "a": attributes, "c": children}."""
    r = Leitor((CELESTE / f"Maps/{nome}.bin").read_bytes())
    assert r.texto() == "CELESTE MAP", nome
    r.texto()
    nomes = [r.texto() for _ in range(r.un("<h"))]

    def valor(t):
        if t == 0:
            return r.u8() != 0
        if t in (1, 2, 3, 4):
            return [r.u8, lambda: r.un("<h"), lambda: r.un("<i"), lambda: r.un("<f")][t - 1]()
        if t == 5:
            return nomes[r.un("<h")]
        if t == 6:
            return r.texto()
        n = r.un("<h")  # 7: run-length text (count, character)
        s = "".join(chr(r.b[r.i + k + 1]) * r.b[r.i + k] for k in range(0, n, 2))
        r.i += n
        return s

    def elemento():
        nome = nomes[r.un("<h")]
        atributos = {}
        for _ in range(r.u8()):
            k = nomes[r.un("<h")]
            atributos[k] = valor(r.u8())
        return {"n": nome, "a": atributos, "c": [elemento() for _ in range(r.un("<h"))]}

    return elemento()


def filho(e, nome):
    return next((c for c in e["c"] if c["n"] == nome), {"c": []})


def estilos(lista, herda=None):
    """Stylegrounds in order; an `apply` group's attributes go down to its children."""
    out = []
    for e in lista["c"]:
        if e["n"] == "apply":
            out += estilos(e, {**(herda or {}), **e["a"]})
        else:
            out.append({"tipo": e["n"], **(herda or {}), **e["a"]})
    return out


def empacotar(pecas):
    """Shelves, tallest first, a pixel apart: name → (x, y)."""
    x = y = alto = 0
    onde = {}
    for nome, im in sorted(pecas.items(), key=lambda t: -t[1].height):
        if x + im.width > LARGURA:
            x, y, alto = 0, y + alto + 1, 0
        onde[nome] = (x, y)
        x += im.width + 1
        alto = max(alto, im.height)
    return onde, y + alto


def extrair(nome, jogo):
    # 1H-ForsakenCity, 1X-ForsakenCity: the B and C sides of 1-ForsakenCity.
    a = nome[0] + nome[2:] if nome[1:2] in ("H", "X") else nome
    pastas = PASTAS.get(a, [])
    m = mapa(nome)
    estilo = filho(m, "Style")
    fundos, frentes = estilos(filho(estilo, "Backgrounds")), estilos(filho(estilo, "Foregrounds"))
    salas = {}
    for s in filho(m, "levels")["c"]:
        a = s["a"]
        salas[a["name"].removeprefix("lvl_")] = [a["x"], a["y"], a["width"], a["height"]]

    pedidas = {e["texture"] for e in fundos + frentes if e["tipo"] == "parallax"}
    pedidas |= {k for k in jogo if any(k.startswith(f"decals/{p}/") for p in pastas)}
    pecas = {}
    for k in sorted(pedidas):
        if k in jogo:
            data, x, y, w, h, fx, fy, fw, fh = jogo[k]
            if data not in ATLAS:
                ATLAS[data] = imagem(ATLASES / f"{data}.data")
            inteira = Image.new("RGBA", (fw, fh))
            inteira.paste(ATLAS[data].crop((x, y, x + w, y + h)), (-fx, -fy))
            pecas[k] = inteira
        elif (ATLASES / f"Misc/{k}.data").exists():
            pecas[k] = imagem(ATLASES / f"Misc/{k}.data")
        else:
            print(f"não achei {k}", file=sys.stderr)

    onde, altura = empacotar(pecas)
    folha = Image.new("RGBA", (LARGURA, altura))
    for k, im in pecas.items():
        folha.paste(im, onde[k])
    OUT.mkdir(parents=True, exist_ok=True)
    folha.save(OUT / f"{nome}.png", optimize=True)
    indice_json = {
        "mapa": nome,
        "tamanho": [LARGURA, altura],
        "pecas": {k: [*onde[k], im.width, im.height] for k, im in sorted(pecas.items())},
        "fundos": fundos,
        "frentes": frentes,
        "salas": salas,
    }
    (OUT / f"{nome}.json").write_text(json.dumps(indice_json, ensure_ascii=False, indent=1) + "\n")
    print(f"{OUT / nome}.png: {len(pecas)} peças em {LARGURA}×{altura}, {len(salas)} salas, {len(fundos)} fundos, {len(frentes)} frentes")


def main():
    nomes = sys.argv[1:]
    if nomes == ["--todos"]:
        nomes = sorted(p.stem for p in (CELESTE / "Maps").glob("*.bin"))
    if not nomes:
        sys.exit(__doc__)
    jogo = indice("Gameplay")
    for nome in nomes:
        extrair(nome, jogo)


if __name__ == "__main__":
    main()
