# Voice worker for the Pix pilot: edge-tts reads the text in pt-BR, Applio's RVC turns it into a character.
# Stays running so the models stay loaded. POST /falar {"texto", "voz"} -> {"audio": "/audio/<id>.wav"}.
# Run with Applio's venv, from Applio's folder:  .venv/bin/python ../pix-piloto/voz.py
import asyncio, json, os, secrets, sys, tempfile, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Lock

import edge_tts

sys.path.insert(0, os.getcwd())
from rvc.infer.infer import VoiceConverter

AQUI = os.path.dirname(os.path.abspath(__file__))
VOZES_DIR = os.path.join(AQUI, "..", "vozes")
AUDIO = os.path.join(AQUI, "audio")

# id: (name shown on the form, TTS voice, model folder, .pth, .index, pitch in semitones)
VOZES = {
    "antonio": ("Antônio (sem efeito)", "pt-BR-AntonioNeural", None, None, None, 0),
    "francisca": ("Francisca (sem efeito)", "pt-BR-FranciscaNeural", None, None, None, 0),
    "bob": ("Bob Esponja", "pt-BR-AntonioNeural", "bob", "bobesponja.pth", "added_IVF176_Flat_nprobe_1_bobesponja_v2.index", 6),
    "silvio": ("Silvio Santos", "pt-BR-AntonioNeural", "silvio", "SilvioSantos.pth", "added_IVF386_Flat_nprobe_1_SilvioSantos_v2.index", 0),
    "faustao": ("Faustão", "pt-BR-AntonioNeural", "faustao", "Faustao.pth", "added_IVF607_Flat_nprobe_1_Faustao_v2.index", 0),
    "madruga": ("Seu Madruga", "pt-BR-AntonioNeural", "madruga", "seuMadrugaHarv.pth", "added_IVF123_Flat_nprobe_1_seuMadrugaHarv_v2.index", 0),
    "galvao": ("Galvão Bueno", "pt-BR-AntonioNeural", "galvao", "Download/Galvao.pth", "Download/added_IVF392_Flat_nprobe_1_Galvao_v2.index", 0),
    "picapau": ("Pica-Pau", "pt-BR-AntonioNeural", "picapau", "model.pth", "model.index", 6),
}

vc = VoiceConverter()
lock = Lock()


def falar(texto, voz):
    nome, tts, pasta, pth, index, pitch = VOZES.get(voz, VOZES["antonio"])
    saida = os.path.join(AUDIO, f"{secrets.token_urlsafe(8)}.wav")
    with tempfile.TemporaryDirectory() as tmp:
        base = os.path.join(tmp, "base.mp3")
        asyncio.run(edge_tts.Communicate(texto, tts).save(base))
        if not pasta:
            os.system(f'afconvert -f WAVE -d LEI16@24000 "{base}" "{saida}"')
        else:
            with lock:
                vc.convert_audio(
                    audio_input_path=base,
                    audio_output_path=saida,
                    model_path=os.path.join(VOZES_DIR, pasta, "x", pth),
                    index_path=os.path.join(VOZES_DIR, pasta, "x", index),
                    pitch=pitch,
                    f0_method="rmvpe",
                    index_rate=0.5,
                    protect=0.33,
                    export_format="WAV",
                )
    return "/audio/" + os.path.basename(saida)


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        self.responder(200, {k: v[0] for k, v in VOZES.items()})

    def do_POST(self):
        pedido = json.loads(self.rfile.read(int(self.headers["content-length"])))
        inicio = time.time()
        try:
            audio = falar(pedido["texto"], pedido.get("voz", "antonio"))
            print(f"{pedido.get('voz')}: {time.time() - inicio:.1f}s", flush=True)
            self.responder(200, {"audio": audio})
        except Exception as e:
            self.responder(500, {"erro": str(e)})

    def responder(self, code, corpo):
        dados = json.dumps(corpo).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def log_message(self, *a):
        pass


ThreadingHTTPServer(("127.0.0.1", 8788), H).serve_forever()
