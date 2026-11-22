"""A stand-in for the Celeste link (MuanlartinsLink), without the game: serves on 127.0.0.1:8797 what the mod would,
from the scripted sequence in public/stream/celeste-sequencia.json (the one jogo.html?jogo=celeste&demo plays):
a chapter entered, dashes, a refill, a death and the respawn, strawberries, a feather, a room, the chapter's end, then
every chapter one after another (the camera filter's ambient for each).

  python3 scripts/celeste-mod/simular.py              plays the sequence in real time, over and over
  python3 scripts/celeste-mod/simular.py --passo      sends a step only when asked: GET /passo?nome=<step> (or the
                                                      next one with no name), for scripts/filtros_teste.py
  --porta=N   another port (the real mod's is 8797; the test uses a free one)

  GET /eventos   server-sent events: the state at once, then every event and state, as the mod sends them
  GET /estado    the state now      GET /passos   the steps' names

Each step sends its events, then the state with its changes merged in (null takes a field out); the chapter's and
the file's clocks run while tempo.correndo, as the game's. Never writes anything.
"""

import json
import queue
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

SEQUENCIA = Path(__file__).resolve().parents[2] / "public/stream/celeste-sequencia.json"
seq = json.loads(SEQUENCIA.read_text())
passos = seq["passos"]
estado = json.loads(json.dumps(seq["inicio"]))
desde = time.monotonic()  # when the clocks were last set
clientes = set()
trava = threading.Lock()
proximo = 0


def juntar(a, b, topo=True):
    """b merged into a: objects field by field, anything else replaced; None takes the field out (at the top it stays,
    as null, as the mod sends "capitulo": null in the menus)."""
    for k, v in b.items():
        if v is None:
            if topo:
                a[k] = None
            else:
                a.pop(k, None)
        elif isinstance(v, dict) and isinstance(a.get(k), dict):
            juntar(a[k], v, False)
        else:
            a[k] = json.loads(json.dumps(v))


def agora():
    """The state with its clocks as they are now."""
    e = json.loads(json.dumps(estado))
    t = e.get("tempo", {})
    if t.get("correndo"):
        dt = int((time.monotonic() - desde) * 1000)
        for k in ("capitulo", "arquivo"):
            if t.get(k) is not None:
                t[k] += dt
    return e


def mandar(msg):
    linha = f"data: {json.dumps(msg, ensure_ascii=False)}\n\n".encode()
    with trava:
        for q in list(clientes):
            q.put(linha)


def passo(i):
    """Sends step i: its events, then the state with its changes."""
    global estado, desde
    p = passos[i]
    for ev in p.get("eventos", []):
        mandar(ev)
    with trava:
        estado = agora()
        desde = time.monotonic()
        juntar(estado, p.get("estado", {}))
    mandar(agora())
    return p


class Pedido(BaseHTTPRequestHandler):
    def cabecalhos(self, codigo, tipo=None):
        self.send_response(codigo)
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-private-network", "true")
        if tipo:
            self.send_header("content-type", tipo)

    def do_OPTIONS(self):
        self.cabecalhos(204)
        self.send_header("access-control-allow-methods", "GET, OPTIONS")
        self.send_header("access-control-allow-headers", "*")
        self.end_headers()

    def json(self, valor):
        self.cabecalhos(200, "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(valor, ensure_ascii=False).encode())

    def do_GET(self):
        global proximo
        url = urlparse(self.path)
        if url.path == "/estado":
            return self.json(agora())
        if url.path == "/passos":
            return self.json([p["nome"] for p in passos])
        if url.path == "/passo":
            nome = parse_qs(url.query).get("nome", [None])[0]
            i = next((k for k, p in enumerate(passos) if p["nome"] == nome), None) if nome else proximo
            if i is None:
                self.cabecalhos(404, "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(f"no step {nome!r}".encode())
                return
            p = passo(i)
            proximo = (i + 1) % len(passos)
            return self.json({"passo": p["nome"], "espera": p.get("espera", 0)})
        if url.path != "/eventos":
            self.cabecalhos(404)
            self.end_headers()
            return
        self.cabecalhos(200, "text/event-stream; charset=utf-8")
        self.send_header("cache-control", "no-store")
        self.end_headers()
        meu = queue.Queue()
        meu.put(f"retry: 2000\n\ndata: {json.dumps(agora(), ensure_ascii=False)}\n\n".encode())
        with trava:
            clientes.add(meu)
        try:
            while True:
                try:
                    self.wfile.write(meu.get(timeout=15))
                except queue.Empty:
                    self.wfile.write(b": ainda aqui\n\n")
                self.wfile.flush()
        except OSError:
            pass
        finally:
            with trava:
                clientes.discard(meu)

    def log_message(self, *a):
        pass


def tocar():
    """The sequence in real time, over and over."""
    global proximo
    while True:
        p = passo(proximo)
        proximo = (proximo + 1) % len(passos)
        time.sleep(p.get("espera", 1))


def main():
    porta = int(next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--porta=")), "8797"))
    manual = "--passo" in sys.argv
    if any(a in ("-h", "--help") for a in sys.argv):
        raise SystemExit(__doc__)
    servidor = ThreadingHTTPServer(("127.0.0.1", porta), Pedido)
    servidor.daemon_threads = True
    print(f"simulando o Celeste em http://127.0.0.1:{porta}/eventos ({'passo a passo' if manual else 'em tempo real'})", flush=True)
    if not manual:
        threading.Thread(target=tocar, daemon=True).start()
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
