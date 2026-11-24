"""Checks a camera filter's one-offs without OBS or a camera: public/stream/filtros.html in a headless browser,
on a virtual clock, with screenshots at chosen moments of each one-off, the sounds it played and any errors.

  uv run -q --with playwright --with pillow python scripts/filtros_teste.py sage
  uv run -q --with playwright --with pillow python scripts/filtros_teste.py sage barreira:0.5,1,2,7.5 cura
  uv run -q --with playwright --with pillow python scripts/filtros_teste.py phoenix flash --video=clip.y4m

Each argument after the filter is a one-off (the dock's `acao`, as in filtros-painel.html) with the virtual
seconds after it starts to take a screenshot at; a one-off with no times gets 0.5, 1, 2, 4 and 7. Without any, every
one-off the filter's entry lists (public/stream/filtros/<folder>/index.js, `acoes`) is run.

The headless browser draws on the CPU (SwiftShader) at well under one frame a second, so every animation frame moves
the page's clock (performance.now) on by exactly 1/30 s: timings play as they would live, only slower. The camera is
Chrome's fake one (a green test card, no face or hands, so positions fall back to the page's defaults), or a video
given with --video= (Y4M or MJPEG: `ffmpeg -ss 1500 -i "<live>/… Câmera.mkv" -t 6 -vf fps=30 -pix_fmt yuv420p clip.y4m`), for
the agents' looks, gestures and the body mask; a live's Câmera.mkv is already framed, so add --params=zoom=1
(--params= adds anything to the page's URL: zoom=1&fundo=…).

--visita=<s> sends each one-off as the Efeitos dock's visit does ({ visita: { filtro, acao, ate, desde } }, `ate` s seconds
after it's sent, as the Lance ruim's: `sigma lance:0.2,1,3,4.5 --visita=4`), and --escolha=<id> sets the Filtros dock's
choice first (`nenhum`, as during a live with no filter on: the visit then opens the camera itself); Date.now follows
the virtual clock too.

A filter that follows a game (Celeste's, from the MuanlartinsLink mod) is tried with the game's stand-in:
--jogo=celeste starts scripts/celeste-mod/simular.py step by step on a free port and points the page at it
(?celeste-jogo=…); an argument starting with @ is then one of its steps (public/stream/celeste-sequencia.json's names)
with the seconds to take screenshots at, sent instead of a one-off (`@entra:1 @dash:0.1,0.3 @morte:0.3,1.2,2.5`).

The page is served from this checkout's public/ on a free port, with stream/privado/ (the game's files, never
committed) from the shared checkout when this one is a worktree without it. Out: the screenshots and a contact sheet
(folha.png) in a new folder under ~/.cache/muanlartins/filtros-teste/, printed at the end. Heavy on the CPU: it
refuses while Luan is live. Never deletes anything.
"""

import asyncio
import functools
import http.server
import json
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SHARED = Path.home() / "repos/muanlartins"
PRIVADO = PUBLIC / "stream/privado"
if not PRIVADO.exists():
    PRIVADO = SHARED / "public/stream/privado"
OUT = Path.home() / ".cache/muanlartins/filtros-teste"
DEFAULT_TIMES = [0.5, 1, 2, 4, 7]
# The games' stand-ins: the script, and the page's parameter for its address.
JOGOS = {"celeste": (ROOT / "scripts/celeste-mod/simular.py", "celeste-jogo")}
# The headless shell and the libraries it needs that WSL lacks (unpacked there without sudo).
DEPS = Path.home() / ".local/lib/chromium-deps/root/usr/lib/x86_64-linux-gnu"
CLOCK = """(() => {
  let vt = performance.now()
  const v0 = vt, d0 = Date.now()
  performance.now = () => vt
  Date.now = () => Math.round(d0 + vt - v0)
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => raf(() => { vt += 1000 / 30; cb(vt) })
})()"""
# Math.random from a seed (--semente=N, 1 by default), so two runs of the same page draw the same particles: a
# change that shouldn't change the picture can be checked against a run from before it.
RANDOM = """((seed) => {
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
})(%d)"""
# Every sound the page plays, with when and whether it loops.
SOUNDS = """() => {
  window.__sons = []
  const s = window.filtros.sfx, play = s.play
  s.play = (name, o = {}) => { window.__sons.push([name, performance.now(), o.loop ? "loop" : ""]); return play(name, o) }
}"""


def live():
    """Whether Luan is live (OBS answering and streaming); OBS closed counts as not live."""
    obs = SHARED / "scripts/obs.mjs"
    if not obs.exists():
        return False
    r = subprocess.run(["node", str(obs), "status"], capture_output=True, text=True, timeout=30)
    first = (r.stdout or "").splitlines()[:1]
    return bool(first) and first[0].startswith("live:") and not first[0].startswith("live: no")


def dock_actions(filtro):
    """The one-offs a filter's entry lists (its `acoes`, from its folder under public/stream/filtros/)."""
    js = "const { lista } = await import(process.argv[1]); console.log(JSON.stringify(await lista()))"
    url = (PUBLIC / "stream/filtros/index.js").as_uri()
    out = subprocess.run(["node", "--input-type=module", "-e", js, url], capture_output=True, text=True, check=True).stdout
    f = next((f for f in json.loads(out) if f["id"] == filtro), None)
    if not f:
        raise SystemExit(f"{filtro}: no such filter in public/stream/filtros/")
    return [a[0] for a in f.get("acoes", [])]


class Handler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split("?", 1)[0].split("#", 1)[0]
        if p.startswith("/stream/privado/"):
            return str(PRIVADO / p[len("/stream/privado/"):])
        return super().translate_path(path)

    def log_message(self, *a):
        pass


def serve():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(PUBLIC)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server.server_address[1]


def sheet(shots, path):
    W, H, cols = 480, 270, 4
    out = Image.new("RGB", (W * cols, H * ((len(shots) + cols - 1) // cols)))
    for i, f in enumerate(shots):
        im = Image.open(f).convert("RGB").resize((W, H))
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 170, 16), fill=(0, 0, 0))
        d.text((4, 3), f.stem, fill=(255, 255, 0))
        out.paste(im, ((i % cols) * W, (i // cols) * H))
    out.save(path)


def stand_in(jogo):
    """Starts a game's stand-in step by step on a free port; returns the process, its base URL and the page's
    parameter for it."""
    import socket
    import urllib.request

    script, param = JOGOS[jogo]
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        porta = s.getsockname()[1]
    proc = subprocess.Popen([sys.executable, str(script), "--passo", f"--porta={porta}"], stdout=subprocess.DEVNULL)
    base = f"http://127.0.0.1:{porta}"
    for _ in range(50):
        try:
            urllib.request.urlopen(f"{base}/passos", timeout=1).read()
            return proc, base, f"{param}={base}/eventos"
        except OSError:
            time.sleep(0.1)
    proc.terminate()
    raise SystemExit(f"{script.name} didn't start")


def step(base, name):
    """Sends the stand-in's step `name`."""
    import urllib.parse
    import urllib.request

    return json.loads(urllib.request.urlopen(f"{base}/passo?nome={urllib.parse.quote(name)}", timeout=5).read())


async def run(filtro, plan, video, params, seed, jogo=None, visita=None, escolha=None):
    port = serve()
    sim = None
    if jogo:
        sim, sim_base, sim_param = stand_in(jogo)
        params = f"{params}&{sim_param}" if params else sim_param
    folder = OUT / f"{filtro}-{time.strftime('%Y%m%d-%H%M%S')}"
    folder.mkdir(parents=True)
    args = ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    if video:
        args.append(f"--use-file-for-fake-video-capture={Path(video).resolve()}")
    if DEPS.exists():
        os.environ["LD_LIBRARY_PATH"] = f"{DEPS}:{os.environ.get('LD_LIBRARY_PATH', '')}"
    shots = []
    async with async_playwright() as p:
        # The headless shell already downloaded, if any (a newer Playwright would want its own).
        shells = sorted((Path.home() / ".cache/ms-playwright").glob("chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell"))
        browser = await p.chromium.launch(args=args, executable_path=str(shells[-1]) if shells else None)
        page = await browser.new_page(viewport={"width": 960, "height": 540})
        await page.add_init_script(CLOCK)
        await page.add_init_script(RANDOM % seed)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:300]))
        # (MediaPipe logs its own notes as errors: "INFO: …", "W1112 …".)
        page.on("console", lambda m: m.type == "error" and not re.match(r"(INFO|W\d{4})[: ]", m.text) and errors.append(m.text[:300]))
        await page.goto(f"http://127.0.0.1:{port}/stream/filtros.html?debug&cam=fake&modo={filtro}" + (f"&{params}" if params else ""))
        print("loading the page and its models (a few minutes on the CPU)…", flush=True)
        # The page, then its trackers (hands, body, face, shoulders: they load from MediaPipe's CDN).
        await page.wait_for_function("window.filtros && window.filtros.vfx && window.filtros.trackers", timeout=900000, polling=1000)
        await page.wait_for_timeout(5000)
        await page.evaluate(SOUNDS)
        if escolha:
            # The Filtros dock's choice, then long enough for the page to let go of the camera if it's none.
            await page.evaluate(f"dispatchEvent(new CustomEvent('muanlartins-filtro', {{ detail: {{ filtro: {json.dumps(escolha)} }} }}))")
            t = await page.evaluate("performance.now()")
            await page.wait_for_function(f"performance.now() >= {t + 4000}", timeout=1800000, polling=200)
        t_start = await page.evaluate("performance.now()")
        for acao, times in plan:
            if acao.startswith("@"):
                # The stand-in's step: the page hears it within a frame or so.
                step(sim_base, acao[1:])
                t0 = await page.evaluate("performance.now()")
            elif visita is not None:
                # As the Efeitos dock sends it (obs-browser's emit_event), with the moment's end.
                v = f"{{ filtro: {json.dumps(filtro)}, acao: {json.dumps(acao)}, ate: Date.now() + {visita * 1000}, desde: Date.now() }}"
                t0 = await page.evaluate(f"(() => {{ dispatchEvent(new CustomEvent('muanlartins-filtro', {{ detail: {{ visita: {v} }} }})); return performance.now() }})()")
            else:
                t0 = await page.evaluate(f"(() => {{ window.filtros.acao({json.dumps(acao)}); return performance.now() }})()")
            for s in times:
                await page.wait_for_function(f"performance.now() >= {t0 + s * 1000}", timeout=1800000, polling=50)
                shot = folder / f"{len(shots):02d}-{acao.replace('@', 'jogo-')}-{s:05.2f}s.png"
                # (A frame can take minutes when something else loads the CPU.)
                await page.screenshot(path=str(shot), timeout=600000)
                shots.append(shot)
            # Room for it to end before the next (a game's step goes on at once: the next step is the test's timing).
            if not acao.startswith("@"):
                await page.wait_for_function(f"performance.now() >= {t0 + (max(times) + 3) * 1000}", timeout=1800000, polling=200)
        sounds = await page.evaluate("window.__sons")
        hud = await page.evaluate("document.getElementById('hud')?.textContent || ''")
        await browser.close()
    if sim:
        sim.terminate()
    for name, t, loop in sounds:
        print(f"  {(t - t_start) / 1000:7.2f} s  {name} {loop}")
    print("page:", hud.replace("\n", " | ")[:400])
    print("errors:" if errors else "no errors", *sorted(set(errors))[:20], sep="\n  ")
    sheet(shots, folder / "folha.png")
    print(f"screenshots: {folder}  (contact sheet: {folder / 'folha.png'})")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    video = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--video=")), None)
    params = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--params=")), "")
    seed = int(next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--semente=")), "1"))
    jogo = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--jogo=")), None)
    visita = next((float(a.split("=", 1)[1]) for a in sys.argv[1:] if a.startswith("--visita=")), None)
    escolha = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--escolha=")), None)
    if jogo and jogo not in JOGOS:
        raise SystemExit(f"--jogo= one of: {', '.join(JOGOS)}")
    if not args:
        raise SystemExit(__doc__)
    if live():
        raise SystemExit("Luan is live: not now (it loads the CPU for minutes)")
    filtro, rest = args[0], args[1:]
    plan = []
    for a in rest or dock_actions(filtro):
        name, _, times = a.partition(":")
        plan.append((name, [float(t) for t in times.split(",")] if times else DEFAULT_TIMES))
    if any(a.startswith("@") for a, _ in plan) and not jogo:
        raise SystemExit("@steps need --jogo=")
    asyncio.run(run(filtro, plan, video, params, seed, jogo, visita, escolha))


if __name__ == "__main__":
    main()
