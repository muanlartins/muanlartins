"""The camera filters' server: public/ on port 8126, started at Windows login by "Filtros muanlartins.vbs" in Startup
(log ~/.cache/muanlartins/filtros.log). OBS's "Filtros" source and the Filtros dock load their pages from here, since
the agents' models and the game's effects (public/stream/privado, out of git) never go to the site.

It's python's http.server, but every answer says Cache-Control: no-cache, so OBS's browser asks again on each load (a
304 when nothing changed). Plain http.server sends only Last-Modified, and Chromium then reuses a page for a tenth of
its age without asking: on 2026-11-18 OBS, restarted, ran filtros.html from its cache, not the one on disk.

    python3 scripts/servidor_filtros.py [port] [--espelho <dir>]

--espelho is for fitting a look with Claude watching (filtros/ajuste.js): filtros.html?ajuste&espelho posts what it
draws, its entry and its console's errors here every 2 s (<dir>/quadro.jpg, <dir>/entrada.txt, <dir>/erros.txt), and reloads when <dir>/versao changes
(`date +%s%N > <dir>/versao`). It listens on 127.0.0.1 only then. Never on 8126, OBS's.
"""

import functools
import http.server
import sys
from pathlib import Path

ESPELHO: Path | None = None
ARQUIVOS = {"/__espelho/quadro": "quadro.jpg", "/__espelho/entrada": "entrada.txt", "/__espelho/erros": "erros.txt"}


class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if ESPELHO and self.path == "/__espelho/versao":
            versao = ESPELHO / "versao"
            corpo = versao.read_bytes().strip() if versao.exists() else b"0"
            self.send_response(200)
            self.send_header("Content-Length", str(len(corpo)))
            self.end_headers()
            self.wfile.write(corpo)
            return
        super().do_GET()

    def do_POST(self):
        nome = ARQUIVOS.get(self.path)
        if not ESPELHO or not nome:
            self.send_error(404)
            return
        # Only the page this serves writes here: not another site open in his browser.
        origem = self.headers.get("Origin")
        porta = self.server.server_address[1]
        if origem not in (None, f"http://localhost:{porta}", f"http://127.0.0.1:{porta}"):
            self.send_error(403)
            return
        tamanho = int(self.headers.get("Content-Length", 0))
        if not 0 <= tamanho <= 8 << 20:
            self.send_error(413)
            return
        corpo = self.rfile.read(tamanho)
        temp = ESPELHO / f".{nome}"
        temp.write_bytes(corpo)
        temp.replace(ESPELHO / nome)
        self.send_response(204)
        self.end_headers()

    def log_request(self, code="-", size="-"):
        if not self.path.startswith("/__espelho/"):
            super().log_request(code, size)


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--espelho" in args:
        i = args.index("--espelho")
        ESPELHO = Path(args[i + 1])
        ESPELHO.mkdir(parents=True, exist_ok=True)
        del args[i : i + 2]
    port = int(args[0]) if args else 8126
    public = Path(__file__).resolve().parents[1] / "public"
    handler = functools.partial(SemCache, directory=str(public))
    # With the mirror (it takes writes, and his camera), this PC only.
    host = "127.0.0.1" if ESPELHO else "0.0.0.0"
    http.server.ThreadingHTTPServer((host, port), handler).serve_forever()
