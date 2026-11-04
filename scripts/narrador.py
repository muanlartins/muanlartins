"""The goal narrator's voice, for the crowd overlay (public/stream/torcida.html), during the live only: edge-tts
reads the line in pt-BR and Applio's RVC turns it into the narrator. The overlay plays it on a stream-only audio
track ("Live", track 5), so it stays out of the recording and of the YouTube VOD.

    ~/.local/share/applio/.venv/bin/python scripts/narrador.py

Windows starts it at login ("Narrador muanlartins.vbs" in the Startup folder runs it in WSL, logging to
~/.cache/muanlartins/narrador.log). Runs in WSL on the GPU, from anywhere (it moves into Applio's folder to import it), and keeps the models loaded.
POST /falar {"texto"} answers with the WAV; each line is kept, so the openers the overlay asks for when it loads
come back at once on a goal. GET / says it's up.

Setup, once: Applio 3.7.1 in ~/.local/share/applio with its venv (engine requirements, CUDA torch, edge-tts) and
its prerequisite models; the voice in ~/.local/share/muanlartins/vozes/galvao, unzipped and checked with
handoff/piloto/unpack_check.py (a community model: Applio loads it with weights_only=True).
"""

import asyncio
import hashlib
import json
import os
import sys
import tempfile
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

APPLIO = Path.home() / ".local" / "share" / "applio"
VOZ = Path.home() / ".local" / "share" / "muanlartins" / "vozes" / "galvao" / "x" / "Download"
MODEL, INDEX = VOZ / "Galvao.pth", VOZ / "added_IVF392_Flat_nprobe_1_Galvao_v2.index"
TTS = "pt-BR-AntonioNeural"
# RVC comes out hot (peaks well over full scale); every line is brought to the same peak, under the alerts.
PICO = 0.7
CACHE = Path.home() / ".cache" / "muanlartins" / "narrador"
PORT = 8788
# The overlay is served by the site; Chrome asks before a public page reaches a local address.
ORIGINS = {"https://muanlartins.com.br", "https://muanlartins.com", "http://localhost:8130"}

os.chdir(APPLIO)
sys.path.insert(0, str(APPLIO))
import edge_tts  # noqa: E402
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from rvc.infer.infer import VoiceConverter  # noqa: E402

converter = VoiceConverter()
lock = Lock()


def falar(texto: str) -> Path:
    """The line in the narrator's voice, as a WAV, rendered once."""
    saida = CACHE / f"{hashlib.sha256(texto.encode()).hexdigest()[:20]}.wav"
    if saida.exists():
        return saida
    with tempfile.TemporaryDirectory(dir=CACHE) as tmp:
        base = Path(tmp) / "base.mp3"
        asyncio.run(edge_tts.Communicate(texto, TTS, rate="+12%").save(str(base)))
        with lock:
            converter.convert_audio(audio_input_path=str(base), audio_output_path=str(Path(tmp) / "voz.wav"),
                                    model_path=str(MODEL), index_path=str(INDEX), pitch=0, f0_method="rmvpe",
                                    index_rate=0.5, protect=0.33, export_format="WAV")
        voz, taxa = sf.read(Path(tmp) / "voz.wav", dtype="float32")
        sf.write(Path(tmp) / "pronta.wav", voz * (PICO / max(float(np.abs(voz).max()), 1e-6)), taxa, subtype="PCM_16")
        (Path(tmp) / "pronta.wav").replace(saida)
    return saida


class Pedido(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.responder(204, b"")

    def do_GET(self):
        self.responder(200, b'{"ok": true}', "application/json")

    def do_POST(self):
        try:
            texto = str(json.loads(self.rfile.read(int(self.headers["content-length"])))["texto"]).strip()[:300]
            inicio = time.time()
            audio = falar(texto).read_bytes()
            print(f"{time.time() - inicio:4.1f}s  {texto}", flush=True)
            self.responder(200, audio, "audio/wav")
        except Exception as erro:  # a bad line mustn't take the narrator down mid-live
            print(f"erro: {erro}", flush=True)
            self.responder(500, json.dumps({"erro": str(erro)}).encode(), "application/json")

    def responder(self, code, corpo, tipo=None):
        self.send_response(code)
        origem = self.headers.get("origin")
        if origem in ORIGINS:
            self.send_header("access-control-allow-origin", origem)
            self.send_header("access-control-allow-headers", "content-type")
            self.send_header("access-control-allow-private-network", "true")
        if tipo:
            self.send_header("content-type", tipo)
        self.send_header("content-length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    CACHE.mkdir(parents=True, exist_ok=True)
    # Taking the port first: a second copy (started again at login) stops here, before loading anything.
    servidor = ThreadingHTTPServer(("127.0.0.1", PORT), Pedido)
    falar("É gol!")  # loads the models before the first goal
    print(f"Narrador em http://127.0.0.1:{PORT}", flush=True)
    servidor.serve_forever()
