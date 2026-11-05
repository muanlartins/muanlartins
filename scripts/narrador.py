"""The stream's voices, during the live only, on a stream-only audio track ("Live", track 5) so they stay out
of the recording and of the YouTube VOD: the goal narrator for the crowd overlay (public/stream/torcida.html)
and the Pix alerts' voices for the Pix overlay (public/stream/pix.html). edge-tts reads a line in pt-BR and
Applio's RVC turns it into the chosen voice; a viewer's recorded message is transcribed by whisper and turned
into that voice, or kept as their own.

    ~/.local/share/applio/.venv/bin/python scripts/narrador.py

Windows starts it at login ("Narrador muanlartins.vbs" in the Startup folder runs it in WSL, logging to
~/.cache/muanlartins/narrador.log). Runs in WSL on the GPU, from anywhere (it moves into Applio's folder to
import it), and keeps the models loaded.

    POST /falar {"texto", "voz"?}             the WAV; Galvão when no voice is given. Each line is kept, so
                                              the openers the overlay asks for when it loads come back at once.
    POST /gravacao {"id", "dados", "voz"?}    a recording (base64, any format ffmpeg reads): {"texto", "audio"},
                                              the transcript and the WAV (base64), loudness-normalized.
    GET /                                     says it's up.

Setup, once: Applio 3.7.1 in ~/.local/share/applio with its venv (engine requirements, CUDA torch, edge-tts) and
its prerequisite models; each voice in ~/.local/share/muanlartins/vozes/<id>, unzipped and checked with
handoff/piloto/unpack_check.py (community models: Applio loads them with weights_only=True). whisper.cpp on
the Windows side, as for the lives (scripts/live.py).
"""

import asyncio
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

sys.path.insert(0, str(Path(__file__).resolve().parent))
from windows import PROGRAMS, TEMP, run, to_windows  # noqa: E402

APPLIO = Path.home() / ".local" / "share" / "applio"
VOZES = Path.home() / ".local" / "share" / "muanlartins" / "vozes"
WHISPER = PROGRAMS / "whisper"
# id: (edge-tts voice, model and index in VOZES/<id>/x/, semitones). No model: the TTS as it is. The ids are the
# ones the site's /pix offers (content/pix.ts); "propria" keeps a recording as the viewer recorded it.
VOZ = {
    "antonio": ("pt-BR-AntonioNeural", None, None, 0),
    "francisca": ("pt-BR-FranciscaNeural", None, None, 0),
    "galvao": ("pt-BR-AntonioNeural", "Download/Galvao.pth", "Download/added_IVF392_Flat_nprobe_1_Galvao_v2.index", 0),
    "bob": ("pt-BR-AntonioNeural", "bobesponja.pth", "added_IVF176_Flat_nprobe_1_bobesponja_v2.index", 6),
    "patrick": ("pt-BR-AntonioNeural", "patrickbr.pth", "added_IVF133_Flat_nprobe_1_patrickbr_v2.index", 0),
    "lula": ("pt-BR-AntonioNeural", "lulamoluscov2.pth", "added_IVF269_Flat_nprobe_1_lulamoluscov2_v2.index", 0),
    "madruga": ("pt-BR-AntonioNeural", "seuMadrugaHarv.pth", "added_IVF123_Flat_nprobe_1_seuMadrugaHarv_v2.index", 0),
    "chaves": ("pt-BR-AntonioNeural", "model.pth", "model.index", 0),
    "silvio": ("pt-BR-AntonioNeural", "SilvioSantos.pth", "added_IVF386_Flat_nprobe_1_SilvioSantos_v2.index", 0),
    "faustao": ("pt-BR-AntonioNeural", "Faustao.pth", "added_IVF607_Flat_nprobe_1_Faustao_v2.index", 0),
    "picapau": ("pt-BR-AntonioNeural", "model.pth", "model.index", 6),
    "goku": ("pt-BR-AntonioNeural", "Goku.pth", "added_IVF500_Flat_nprobe_1_Goku_v2.index", 0),
    "cid": ("pt-BR-AntonioNeural", "cidmoreira.pth", "added_IVF273_Flat_nprobe_1_cidmoreira_v2.index", 0),
    "datena": ("pt-BR-AntonioNeural", "Datena.pth", "added_IVF280_Flat_nprobe_1_Datena_v2.index", 0),
}
# RVC comes out hot (peaks well over full scale); every line is brought to the same peak, under the alerts.
PICO = 0.7
# A recording can be anything from a whisper to a shout: EBU R128 brings it to the lines' loudness.
LOUDNORM = "loudnorm=I=-16:TP=-2:LRA=11"
CACHE = Path.home() / ".cache" / "muanlartins" / "narrador"
PORT = 8788
# The overlay is served by the site; Chrome asks before a public page reaches a local address.
ORIGINS = {"https://muanlartins.com.br", "https://muanlartins.com", "http://localhost:3000", "http://localhost:8130"}

os.chdir(APPLIO)
sys.path.insert(0, str(APPLIO))
import edge_tts  # noqa: E402
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from rvc.infer.infer import VoiceConverter  # noqa: E402

converter_rvc = VoiceConverter()
lock = Lock()


def converter(entrada: Path, saida: Path, voz: str):
    """entrada in the voice's model, into saida (a WAV)."""
    _, pth, index, tom = VOZ[voz]
    with lock:
        converter_rvc.convert_audio(audio_input_path=str(entrada), audio_output_path=str(saida),
                                    model_path=str(VOZES / voz / "x" / pth), index_path=str(VOZES / voz / "x" / index),
                                    pitch=tom, f0_method="rmvpe", index_rate=0.5, protect=0.33, export_format="WAV")


def falar(texto: str, voz: str = "galvao") -> Path:
    """The line in the voice, as a WAV, rendered once."""
    voz = voz if voz in VOZ else "antonio"
    chave = texto if voz == "galvao" else f"{voz}\n{texto}"  # Galvão's lines keep their old cache
    saida = CACHE / f"{hashlib.sha256(chave.encode()).hexdigest()[:20]}.wav"
    if saida.exists():
        return saida
    tts, pth, _, _ = VOZ[voz]
    with tempfile.TemporaryDirectory(dir=CACHE) as tmp:
        base = Path(tmp) / "base.mp3"
        asyncio.run(edge_tts.Communicate(texto, tts, rate="+12%" if voz == "galvao" else "+5%").save(str(base)))
        if pth:
            converter(base, Path(tmp) / "voz.wav", voz)
        else:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(base), str(Path(tmp) / "voz.wav")], check=True)
        audio, taxa = sf.read(Path(tmp) / "voz.wav", dtype="float32")
        sf.write(Path(tmp) / "pronta.wav", audio * (PICO / max(float(np.abs(audio).max()), 1e-6)), taxa, subtype="PCM_16")
        (Path(tmp) / "pronta.wav").replace(saida)
    return saida


def transcrever(wav: Path) -> str:
    """What the recording says, by whisper on the Windows side (it reads Windows paths)."""
    stem = TEMP / f"muanlartins-pix-{wav.parent.name}"
    copia = stem.with_suffix(".wav")
    copia.write_bytes(wav.read_bytes())
    try:
        run(WHISPER / "whisper-cli.exe", "-m", to_windows(WHISPER / "models" / "ggml-large-v3-turbo-q5_0.bin"),
            "-l", "pt", "-mc", "0", "--vad", "-vm", to_windows(WHISPER / "models" / "ggml-silero-v5.1.2.bin"),
            "-oj", "-of", to_windows(stem), "-np", to_windows(copia), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        resultado = json.loads(stem.with_suffix(".json").read_text(encoding="utf-8"))
        return " ".join(" ".join(s["text"].split()) for s in resultado["transcription"]).strip()
    finally:
        copia.unlink(missing_ok=True)
        stem.with_suffix(".json").unlink(missing_ok=True)


def gravacao(id: str, dados: bytes, voz: str | None) -> tuple[str, Path]:
    """A viewer's recorded message: its transcript, and the WAV to play (in the voice, if one was chosen)."""
    voz = voz if voz in VOZ and VOZ[voz][1] else None
    nome = hashlib.sha256(f"{id}\n{voz}".encode()).hexdigest()[:20]
    saida, texto = CACHE / f"{nome}.wav", CACHE / f"{nome}.txt"
    if saida.exists() and texto.exists():
        return texto.read_text(encoding="utf-8"), saida
    with tempfile.TemporaryDirectory(dir=CACHE) as tmp:
        tmp = Path(tmp)
        (tmp / "entrada").write_bytes(dados)
        ffmpeg = ["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "entrada"), "-t", "30", "-ac", "1"]
        subprocess.run([*ffmpeg, "-ar", "16000", str(tmp / "whisper.wav")], check=True)
        subprocess.run([*ffmpeg, "-ar", "48000", "-af", LOUDNORM, str(tmp / "voz.wav")], check=True)
        palavras = transcrever(tmp / "whisper.wav")
        if voz:
            converter(tmp / "voz.wav", tmp / "convertida.wav", voz)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "convertida.wav"), "-af", LOUDNORM,
                            "-ar", "48000", str(tmp / "pronta.wav")], check=True)
        else:
            (tmp / "voz.wav").replace(tmp / "pronta.wav")
        texto.write_text(palavras, encoding="utf-8")
        (tmp / "pronta.wav").replace(saida)
    return palavras, saida


class Pedido(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.responder(204, b"")

    def do_GET(self):
        self.responder(200, b'{"ok": true}', "application/json")

    def do_POST(self):
        try:
            pedido = json.loads(self.rfile.read(int(self.headers["content-length"])))
            inicio = time.time()
            if self.path == "/gravacao":
                palavras, wav = gravacao(str(pedido["id"])[:40], base64.b64decode(pedido["dados"]), pedido.get("voz"))
                print(f"{time.time() - inicio:4.1f}s  gravação {pedido.get('voz') or 'própria'}: {palavras}", flush=True)
                corpo = json.dumps({"texto": palavras, "audio": base64.b64encode(wav.read_bytes()).decode()})
                return self.responder(200, corpo.encode(), "application/json")
            texto = str(pedido["texto"]).strip()[:400]
            audio = falar(texto, pedido.get("voz") or "galvao").read_bytes()
            print(f"{time.time() - inicio:4.1f}s  {pedido.get('voz') or 'galvao'}: {texto}", flush=True)
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
    # Recordings and Pix lines are kept a week (the alert may be replayed); the openers are asked for again.
    for velho in CACHE.glob("*"):
        if velho.is_file() and time.time() - velho.stat().st_mtime > 7 * 86400:
            velho.unlink()
    # Taking the port first: a second copy (started again at login) stops here, before loading anything.
    servidor = ThreadingHTTPServer(("127.0.0.1", PORT), Pedido)
    falar("É gol!")  # loads the models before the first goal
    print(f"Narrador em http://127.0.0.1:{PORT}", flush=True)
    servidor.serve_forever()
