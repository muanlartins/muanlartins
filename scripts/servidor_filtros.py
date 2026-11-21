"""The camera filters' server: public/ on port 8126, started at Windows login by "Filtros muanlartins.vbs" in Startup
(log ~/.cache/muanlartins/filtros.log). OBS's "Filtros" source and the Filtros dock load their pages from here, since
the agents' models and the game's effects (public/stream/privado, out of git) never go to the site.

It's python's http.server, but every answer says Cache-Control: no-cache, so OBS's browser asks again on each load (a
304 when nothing changed). Plain http.server sends only Last-Modified, and Chromium then reuses a page for a tenth of
its age without asking: on 2026-11-18 OBS, restarted, ran filtros.html from its cache, not the one on disk.

    python3 scripts/servidor_filtros.py [port]
"""

import functools
import http.server
import sys
from pathlib import Path


class SemCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8126
    public = Path(__file__).resolve().parents[1] / "public"
    handler = functools.partial(SemCache, directory=str(public))
    http.server.ThreadingHTTPServer(("0.0.0.0", port), handler).serve_forever()
