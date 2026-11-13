"""Checks a camera filter's one-offs without OBS or a camera: public/stream/filtros.html in a headless browser,
on a virtual clock, with screenshots at chosen moments of each one-off, the sounds it played and any errors.

  uv run -q --with playwright --with pillow python scripts/filtros_teste.py sage
  uv run -q --with playwright --with pillow python scripts/filtros_teste.py sage barreira:0.5,1,2,7.5 cura
  uv run -q --with playwright --with pillow python scripts/filtros_teste.py phoenix flash --video=clip.y4m

Each argument after the filter is a one-off (the dock's `acao`, as in filtros-painel.html) with the virtual
seconds after it starts to take a screenshot at; a one-off with no times gets 0.5, 1, 2, 4 and 7. Without any, every
one-off the filter has in filtros-painel.html's FILTROS is run.

The headless browser draws on the CPU (SwiftShader) at well under one frame a second, so every animation frame moves
the page's clock (performance.now) on by exactly 1/30 s: timings play as they would live, only slower. The camera is
Chrome's fake one (a green test card, no face or hands, so positions fall back to the page's defaults), or a video
given with --video= (Y4M or MJPEG: `ffmpeg -ss 1500 -i "<live>/… Câmera.mkv" -t 6 -vf fps=30 -pix_fmt yuv420p clip.y4m`), for
the agents' looks, gestures and the body mask; a live's Câmera.mkv is already framed, so add --params=zoom=1
(--params= adds anything to the page's URL: zoom=1&fundo=…).

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
# The headless shell and the libraries it needs that WSL lacks (unpacked there without sudo).
DEPS = Path.home() / ".local/lib/chromium-deps/root/usr/lib/x86_64-linux-gnu"
CLOCK = """(() => {
  let vt = performance.now()
  performance.now = () => vt
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => raf(() => { vt += 1000 / 30; cb(vt) })
})()"""
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
    """The one-offs filtros-painel.html lists for a filter, from its FILTROS."""
    text = (PUBLIC / "stream/filtros-painel.html").read_text()
    # A filter on one line, or spread over several.
    m = re.search(r'\{ id: "%s",([^\n]*)\},?\n' % re.escape(filtro), text) or re.search(r'id: "%s",(.*?)\n        \}' % re.escape(filtro), text, re.S)
    if not m:
        raise SystemExit(f"{filtro}: not in filtros-painel.html's FILTROS")
    return re.findall(r'\["(\w+)", "\w*", "', m.group(1))


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


async def run(filtro, plan, video, params):
    port = serve()
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
        t_start = await page.evaluate("performance.now()")
        for acao, times in plan:
            t0 = await page.evaluate(f"(() => {{ window.filtros.acao({json.dumps(acao)}); return performance.now() }})()")
            for s in times:
                await page.wait_for_function(f"performance.now() >= {t0 + s * 1000}", timeout=1800000, polling=50)
                shot = folder / f"{acao}-{s:05.2f}s.png"
                # (A frame can take minutes when something else loads the CPU.)
                await page.screenshot(path=str(shot), timeout=600000)
                shots.append(shot)
            # Room for it to end before the next.
            await page.wait_for_function(f"performance.now() >= {t0 + (max(times) + 3) * 1000}", timeout=1800000, polling=200)
        sounds = await page.evaluate("window.__sons")
        hud = await page.evaluate("document.getElementById('hud')?.textContent || ''")
        await browser.close()
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
    if not args:
        raise SystemExit(__doc__)
    if live():
        raise SystemExit("Luan is live: not now (it loads the CPU for minutes)")
    filtro, rest = args[0], args[1:]
    plan = []
    for a in rest or dock_actions(filtro):
        name, _, times = a.partition(":")
        plan.append((name, [float(t) for t in times.split(",")] if times else DEFAULT_TIMES))
    asyncio.run(run(filtro, plan, video, params))


if __name__ == "__main__":
    main()
