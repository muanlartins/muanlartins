#!/usr/bin/env python3
"""Desenha um look numa folha PNG, com o fotógrafo da arquibancada (fotografo), num Chromium headless.

  render.py look.json                       frente, três-quartos, lado e costas
  render.py T1:... --poses todas            mais todas as poses (parado, cima, aceno, palmas, triste, pisca)
  render.py look.json --arquibancada        mais como lê na arquibancada: cabeça de 63 e 17 px, zoom 4×, entre outros
  render.py look.json --rosto               mais a cabeça de perto
  --angulos frente,lado | todos | nenhum    quais ângulos (frente, tres-quartos, lado, costas)
  --saida arquivo.png                       onde gravar (padrão: scripts/torcedor/saida/<nome do JSON>.png)
Imprime antes os mesmos avisos do validar.py. Não roda com o OBS ao vivo ou gravando (sai com 3).
"""
# The page is the fan's own modules (public/stream/torcedor3d/, what OBS's overlays load) and folha.js, served from
# this checkout through Playwright's routing: no server, no copy. three.js is npm's (node_modules, the 0.182 the
# overlays take from jsDelivr), so it renders offline; without node_modules it falls back to jsDelivr. On WSL the
# headless shell draws on the GPU through Mesa's D3D12 (the libraries it lacks unpacked without sudo in
# ~/.local/lib/chromium-deps); elsewhere, on Chromium's own software GL.
import argparse, base64, mimetypes, os, pathlib, sys
from motor import KIT, RAIZ, SAIDA, AO_VIVO, ao_vivo, validar, resumo, kb

ANGULOS = ["frente", "tres-quartos", "lado", "costas"]
POSES = ["parado", "cima", "aceno", "palmas", "triste", "pisca"]
BASE = "http://torcedor.local"
DEPS = pathlib.Path.home() / ".local/lib/chromium-deps/root/usr/lib/x86_64-linux-gnu"
WSL = pathlib.Path("/usr/lib/wsl/lib")
CDN_THREE = "https://cdn.jsdelivr.net/npm/three@0.182.0/build/"


def three():
    """npm's three.js build folder: this checkout's, else the main checkout's (a worktree before pnpm install)."""
    for raiz in (RAIZ, pathlib.Path.home() / "repos/muanlartins"):
        d = raiz / "node_modules/three/build"
        if (d / "three.module.js").is_file():
            return d
    return None


def navegador():
    """(executable or None, args, env) for the headless shell: the GPU through D3D12 on WSL, software GL elsewhere."""
    shells = sorted(pathlib.Path.home().glob(".cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell"))
    env = dict(os.environ)
    libs = [str(d) for d in (DEPS, WSL) if d.is_dir()]
    if libs:
        env["LD_LIBRARY_PATH"] = ":".join(libs + ([env["LD_LIBRARY_PATH"]] if env.get("LD_LIBRARY_PATH") else []))
    args = []
    if WSL.is_dir():
        env.update(GALLIUM_DRIVER="d3d12", MESA_D3D12_DEFAULT_ADAPTER_NAME="NVIDIA")
        args = ["--use-angle=gl-egl", "--ignore-gpu-blocklist", "--enable-gpu"]
    return (str(shells[-1]) if shells else None), args, env


def pagina(pasta_three):
    mapa = "/three/three.module.js" if pasta_three else CDN_THREE + "three.module.js"
    return ("<!doctype html><html><head><meta charset='utf-8'>"
            "<style>@font-face{font-family:'Space Grotesk';src:url(/stream/space-grotesk.ttf) format('truetype');font-weight:300 700}</style>"
            f"<script type='importmap'>{{\"imports\":{{\"three\":\"{mapa}\"}}}}</script></head><body>"
            "<script type='module'>\n"
            "import { folha } from '/kit/folha.js'\n"
            "window.folha = folha\n"
            # The shirt number and the labels are in Space Grotesk: wait for it, as the editor does.
            "await Promise.all(['400 14px', '500 13px', '600 13px', '600 20px', '700 20px'].map((f) => document.fonts.load(f + ' \"Space Grotesk\"'))).catch(() => {})\n"
            "window.pronto = true\n</script></body></html>")


def arquivo(caminho, pasta_three):
    """The file a page path stands for: /stream/ is public/stream/, /kit/ this folder, /three/ npm's build."""
    raizes = {"stream": RAIZ / "public/stream", "kit": KIT, "three": pasta_three}
    topo, _, resto = caminho.lstrip("/").partition("/")
    base = raizes.get(topo)
    if not base or not resto:
        return None
    f = (base / resto).resolve()
    return f if f.is_file() and f.is_relative_to(base.resolve()) else None


class Renderizador:
    """One browser and one page, kept open: servidor.py reuses it for every render."""

    def __init__(self):
        from playwright.sync_api import sync_playwright
        self.pw = sync_playwright().start()
        exe, args, env = navegador()
        self.b = self.pw.chromium.launch(executable_path=exe, args=args, env=env)
        self.pg = self.b.new_page()
        self.pg.set_default_timeout(120000)
        self.erros = []
        self.pg.on("pageerror", lambda e: self.erros.append(str(e)))
        self.pg.on("console", lambda m: self.erros.append(m.text) if m.type == "error" else None)
        pasta = three()
        html = pagina(pasta)

        def servir(rota):
            caminho = rota.request.url[len(BASE):].split("?")[0]
            if caminho == "/render.html":
                return rota.fulfill(body=html, content_type="text/html; charset=utf-8")
            f = arquivo(caminho, pasta)
            if not f:
                return rota.fulfill(status=404, body="")
            tipo = "text/javascript" if f.suffix in (".js", ".mjs") else (mimetypes.guess_type(f.name)[0] or "application/octet-stream")
            rota.fulfill(body=f.read_bytes(), content_type=tipo)

        self.pg.route(BASE + "/**", servir)
        self.pg.goto(BASE + "/render.html")
        try:
            self.pg.wait_for_function("() => window.pronto", timeout=60000)
        except Exception:
            self.fechar()
            sys.exit("A página de render não carregou" + ("" if pasta else " (sem node_modules, o three.js vem da internet: tem rede?)") + ". " + " | ".join(self.erros[:3]))

    def folha(self, look, **op):
        url = self.pg.evaluate("([l, o]) => folha(l, o)", [look, op])
        return base64.b64decode(url.split(",", 1)[1])

    def fechar(self):
        self.b.close()
        self.pw.stop()


def lista(texto, validos, nome):
    if texto in ("todos", "todas"):
        return list(validos)
    if texto in ("", "nenhum", "nenhuma"):
        return []
    itens = [x.strip() for x in texto.split(",") if x.strip()]
    ruins = [x for x in itens if x not in validos]
    if ruins:
        raise ValueError(f"{nome} desconhecido(s): {', '.join(ruins)}. Valem: {', '.join(validos)}")
    return itens


def opcoes(angulos="todos", poses="", rosto=False, arquibancada=False, altura=340, titulo="", subtitulo=""):
    """The sheet's options, checked (render.py's flags and servidor.py's JSON both come through here)."""
    a = lista(angulos, ANGULOS, "ângulo") if isinstance(angulos, str) else angulos
    p = lista(poses, POSES, "pose") if isinstance(poses, str) else poses
    for x, v, nome in ((a, ANGULOS, "ângulo"), (p, POSES, "pose")):
        if any(i not in v for i in x):
            raise ValueError(f"{nome} desconhecido; valem: {', '.join(v)}")
    if not (a or p or rosto or arquibancada):
        a = ANGULOS
    return {"angulos": a, "poses": p, "rosto": bool(rosto), "arquibancada": bool(arquibancada), "altura": max(120, min(800, int(altura))), "titulo": str(titulo), "subtitulo": subtitulo}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada", help="arquivo JSON, código T1, link com #t=, JSON inline ou - (stdin)")
    ap.add_argument("--angulos", default="todos", help="frente,tres-quartos,lado,costas | todos | nenhum")
    ap.add_argument("--poses", default="", help="parado,cima,aceno,palmas,triste,pisca | todas")
    ap.add_argument("--arquibancada", action="store_true", help="como fica na arquibancada (cabeças de 63 e 17 px)")
    ap.add_argument("--rosto", action="store_true", help="a cabeça de perto")
    ap.add_argument("--altura", type=int, default=340, help="altura de cada quadro em px (padrão 340)")
    ap.add_argument("--titulo", default="", help="título no topo da folha")
    ap.add_argument("--saida", help="arquivo PNG (padrão: scripts/torcedor/saida/<nome>.png)")
    o = ap.parse_args()

    r = validar(o.entrada)
    resumo(r)
    try:
        op = opcoes(o.angulos, o.poses, o.rosto, o.arquibancada, o.altura, o.titulo, f"{kb(r['bytes'])} · código com {r['caracteres']} caracteres")
    except ValueError as e:
        sys.exit(str(e))
    # Never while Luan is on air: the browser's GPU work costs the stream frames.
    if ao_vivo():
        print(AO_VIVO, file=sys.stderr)
        sys.exit(3)
    p = pathlib.Path(o.entrada)
    nome = p.stem if not o.entrada.strip().startswith(("T1:", "{", "[")) and p.is_file() else "torcedor"
    saida = pathlib.Path(o.saida) if o.saida else SAIDA / f"{nome}.png"
    saida.parent.mkdir(parents=True, exist_ok=True)
    rd = Renderizador()
    png = rd.folha(r["look"], **op)
    erros = rd.erros
    rd.fechar()
    saida.write_bytes(png)
    w, h = int.from_bytes(png[16:20], "big"), int.from_bytes(png[20:24], "big")
    print(f"Folha: {saida.resolve()} ({w}×{h} px)")
    if erros:
        print("Erros na página: " + " | ".join(sorted(set(erros))[:5]))
    print(f"Código: {r['codigo']}")
