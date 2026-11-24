#!/usr/bin/env python3
"""O kit como API HTTP local, só em 127.0.0.1 (um navegador fica aberto, então os renders depois do primeiro são rápidos).

  GET  /esquema.json   o esquema (feito do esquema.js na hora em que a API sobe)
  POST /validar        corpo: um look (JSON), {"codigo": "T1:..."} ou o código puro → JSON (look, enxuto, codigo, avisos...)
  POST /render         corpo: um look ou um código, opções na query (?angulos=frente,lado&poses=todas&arquibancada=1&rosto=1)
                       ou {"look": {...} | "codigo": "T1:...", "angulos": ..., "poses": ..., "arquibancada": true, "rosto": true}
                       → image/png, com os headers X-Torcedor-Codigo e X-Torcedor-Avisos (quantos; a lista sai no /validar)
                       → 503 enquanto o OBS estiver ao vivo ou gravando
Suba pelo scripts/torcedor/torcedor servidor [--porta 8177]; Ctrl+C para (ou um SIGTERM no PID dele).
"""
import argparse, json, signal, sys, urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from motor import AO_VIVO, ao_vivo, chamar, kb
from render import Renderizador, opcoes

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--porta", type=int, default=8177)
o = ap.parse_args()

ESQUEMA = json.dumps(chamar("esquema"), ensure_ascii=False).encode()
AJUDA = __doc__.encode()
OPCOES = ("angulos", "poses", "rosto", "arquibancada", "altura", "titulo")


def entrada(corpo, query):
    """(the look as text for the engine, the sheet's options) from either body shape."""
    try:
        d = json.loads(corpo)
    except ValueError:
        d = None
    if isinstance(d, dict) and ("look" in d or "codigo" in d):
        texto = json.dumps(d["look"], ensure_ascii=False) if "look" in d else str(d["codigo"])
        return texto, {k: d[k] for k in OPCOES if k in d}
    q = {k: v[-1] for k, v in urllib.parse.parse_qs(query).items() if k in OPCOES}
    for k in ("rosto", "arquibancada"):
        if k in q:
            q[k] = q[k] not in ("0", "false", "nao", "")
    return corpo, q


class API(BaseHTTPRequestHandler):
    def responder(self, status, corpo, tipo="application/json; charset=utf-8", extra={}):
        self.send_response(status)
        self.send_header("Content-Type", tipo)
        self.send_header("Content-Length", str(len(corpo)))
        for k, v in extra.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(corpo)

    def json(self, status, d):
        self.responder(status, json.dumps(d, ensure_ascii=False).encode())

    def do_GET(self):
        p = urllib.parse.urlparse(self.path).path
        if p == "/esquema.json":
            return self.responder(200, ESQUEMA)
        if p == "/":
            return self.responder(200, AJUDA, "text/plain; charset=utf-8")
        self.json(404, {"erro": "não tem isso aqui; veja GET /"})

    def do_POST(self):
        # One bad request answers with an error; it never takes the server down.
        try:
            self.postar()
        except Exception as e:
            self.json(500, {"ok": False, "erro": f"{type(e).__name__}: {e}"})

    def postar(self):
        u = urllib.parse.urlparse(self.path)
        corpo = self.rfile.read(int(self.headers.get("Content-Length") or 0)).decode("utf-8", "replace")
        if u.path not in ("/validar", "/render"):
            return self.json(404, {"erro": "não tem isso aqui; veja GET /"})
        texto, op = entrada(corpo, u.query)
        r = chamar("validar", texto, sair=False)
        if u.path == "/validar" or not r["ok"]:
            return self.json(200 if r["ok"] else 400, r)
        try:
            op = opcoes(**op, subtitulo=f"{kb(r['bytes'])} · código com {r['caracteres']} caracteres")
        except (ValueError, TypeError) as e:
            return self.json(400, {"ok": False, "erro": str(e)})
        # Luan may go live with the API up: every render asks OBS again (an answer holds 20 s).
        if ao_vivo(cache=20):
            return self.json(503, {"ok": False, "erro": AO_VIVO})
        png = rd.folha(r["look"], **op)
        self.responder(200, png, "image/png", {"X-Torcedor-Codigo": r["codigo"], "X-Torcedor-Avisos": str(len(r["avisos"]))})


def parar(*_):
    raise KeyboardInterrupt


if ao_vivo():
    print(AO_VIVO, file=sys.stderr)
    sys.exit(3)
# Stopped by its PID (SIGTERM), it still closes the browser.
signal.signal(signal.SIGTERM, parar)
try:
    http = HTTPServer(("127.0.0.1", o.porta), API)
except OSError as e:
    sys.exit(f"A porta {o.porta} não está livre ({e.strerror}). Escolha outra com --porta.")
rd = Renderizador()
print(f"Torcedor: http://127.0.0.1:{o.porta}/ (Ctrl+C para)", flush=True)
try:
    http.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    http.server_close()
    rd.fechar()
