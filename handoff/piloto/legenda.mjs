// Live captions pilot: plays a stretch of a VOD in real time (to the speakers and to us at the same time),
// and every second sends what was said since the last line ended to whisper.cpp (:8789), then the text to the
// pilot server, which hands it to the overlay. On Windows the input is the microphone instead of a file.
// node legenda.mjs <video> <start, e.g. 47:50> [seconds]   (SOM=0 keeps the speakers quiet)
import { spawn } from "node:child_process";

const [video, inicio = "47:50", duracao = "180"] = process.argv.slice(2);
const TAXA = 16000;
const PASSO_MS = 1000;
const MAX_S = 8;
const SILENCIO_RMS = 500;

const ff = spawn("ffmpeg", ["-loglevel", "error", "-re", "-ss", inicio, "-t", duracao, "-i", video, "-vn", "-ac", "1", "-ar", String(TAXA),
  "-f", "s16le", "pipe:1", ...(process.env.SOM === "0" ? [] : ["-f", "audiotoolbox", "-"])]);
let buffer = Buffer.alloc(0);
ff.stdout.on("data", (d) => (buffer = Buffer.concat([buffer, d])));
ff.on("close", () => process.exit(0));

function wav(pcm) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(TAXA, 24); h.writeUInt32LE(TAXA * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
const rms = (pcm) => {
  let s = 0;
  for (let i = 0; i + 1 < pcm.length; i += 2) s += pcm.readInt16LE(i) ** 2;
  return Math.sqrt(s / Math.max(1, pcm.length / 2));
};
// Whisper's classic inventions on near-silence.
const ALUCINACOES = /^(e aí\.?|obrigad[oa]\.?|tchau\.?|legendas? .*|\[.*\]|\(.*\))$/i;

async function transcrever(pcm) {
  const form = new FormData();
  form.append("file", new Blob([wav(pcm)], { type: "audio/wav" }), "a.wav");
  form.append("response_format", "text");
  form.append("language", "pt");
  const t = (await (await fetch("http://127.0.0.1:8789/inference", { method: "POST", body: form })).text()).replace(/\s+/g, " ").trim();
  return ALUCINACOES.test(t) ? "" : t;
}

async function enviar(texto, final, ms) {
  await fetch("http://127.0.0.1:8787/legenda", { method: "POST", body: JSON.stringify({ texto, final, ms }) }).catch(() => {});
  console.log(`${final ? "■" : "·"} ${ms}ms ${texto}`);
}

let ocupado = false;
setInterval(async () => {
  if (ocupado || buffer.length < TAXA * 2 * 0.8) return;
  ocupado = true;
  const pcm = buffer;
  const fimSilencioso = rms(pcm.subarray(-TAXA * 2 * 0.6)) < SILENCIO_RMS;
  const cheio = pcm.length >= TAXA * 2 * MAX_S;
  const t0 = Date.now();
  const texto = rms(pcm) < SILENCIO_RMS ? "" : await transcrever(pcm);
  // A line ends at a pause or after MAX_S seconds; then the buffer starts over with what came in meanwhile.
  const final = (fimSilencioso && pcm.length > TAXA * 2 * 1.5) || cheio;
  if (texto) await enviar(texto, final, Date.now() - t0);
  if (final || !texto) buffer = buffer.subarray(pcm.length);
  ocupado = false;
}, PASSO_MS);
