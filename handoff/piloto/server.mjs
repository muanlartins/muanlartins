// Pix pilot. The viewer fills /pix (name, message, value) and gets a Pix QR with unique cents (R$ 10,07);
// the phone POSTs the bank's notification to /pix; a match brings the viewer's name and message to the overlay (/).
// The reservation part is what the Lambda will do in the real version.
import { createServer } from "node:http";
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const DIR = new URL(".", import.meta.url).pathname;
const PORT = 8787;
const TOKEN = (() => {
  try {
    return readFileSync(DIR + "token.txt", "utf8").trim();
  } catch {
    const t = randomBytes(9).toString("base64url");
    appendFileSync(DIR + "token.txt", t);
    return t;
  }
})();

// Same merchant fields as Inter's own QR for this key, which abbreviates them.
// The receiver as the bank's own QR has it (key, merchant name ≤25, city ≤15), in pix.json next to this file: never committed.
const PIX = JSON.parse(readFileSync(DIR + "pix.json", "utf8"));
const RESERVA_MS = 15 * 60 * 1000;
const MINIMO = 1;
const reaisDe = (valor) => Number(valor.replace(",", "."));

// Voices come from voz.py (edge-tts in pt-BR, then Applio's RVC for the characters), running on :8788.
// The audio plays inside the page, so OBS captures it like the chime (the browser's speechSynthesis talks to the OS directly, which OBS can't route).
const VOZ = "http://127.0.0.1:8788";
async function falar(texto, voz) {
  try {
    const r = await fetch(VOZ, { method: "POST", body: JSON.stringify({ texto, voz }) });
    return (await r.json()).audio ?? null;
  } catch {
    return null;
  }
}
function locucao(nome, valor, mensagem) {
  const [reais, centavos] = valor.split(",").map(Number);
  const quanto = [reais && `${reais} ${reais === 1 ? "real" : "reais"}`, centavos && `${centavos} ${centavos === 1 ? "centavo" : "centavos"}`].filter(Boolean).join(" e ");
  return `${nome} mandou ${quanto || "um Pix"}. ${mensagem}`;
}

const clients = new Set();
const recent = new Map();
const reservas = new Map();
const ativos = new Map();

// Only incoming Pix: Inter's "Pix recebido · NAME te enviou um Pix de R$ x,yy …", plus "Você recebeu um Pix de R$ x,yy de NAME" for fake test notifications.
// Anything else from the bank (a Pix you sent, a purchase) carries no valor and never shows.
const FORMATS = [
  /(?:Pix recebido\s+)?(?<nome>[^\n]+?)\s+te enviou um Pix de R\$\s?(?<valor>[\d.]+,\d{2})/,
  /Você recebeu um Pix de R\$\s?(?<valor>[\d.]+,\d{2}) de (?<nome>[^\n.]+)/,
];

function parse(text) {
  const g = FORMATS.map((f) => text.match(f)?.groups).find(Boolean);
  if (!g) return {};
  const primeiroNome = g.nome.trim().split(/\s+/)[0].toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return { valor: g.valor.replaceAll(".", ""), nome: g.nome.trim(), primeiroNome };
}

// EMV BRCode (BCB's "Pix copia e cola"): ID + 2-digit length + value, closed by a CRC16-CCITT.
const emv = (id, v) => id + String(v.length).padStart(2, "0") + v;
function crc16(s) {
  let crc = 0xffff;
  for (const b of Buffer.from(s)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
export function brcode(valor) {
  const s =
    emv("00", "01") +
    emv("01", "11") +
    emv("26", emv("00", "br.gov.bcb.pix") + emv("01", PIX.chave)) +
    emv("52", "0000") +
    emv("53", "986") +
    (valor ? emv("54", valor.replace(",", ".")) : "") +
    emv("58", "BR") +
    emv("59", PIX.nome) +
    emv("60", PIX.cidade) +
    emv("62", emv("05", "***")) +
    "6304";
  return s + crc16(s);
}

// The fewest extra cents possible: R$ 10 is R$ 10,00 while nobody else holds it, then 10,01, 10,02…
// A value frees up as soon as its Pix arrives or its reservation expires, so the next viewer starts from ,00 again.
// The form polls its reservation by id, since its value may already belong to someone else.
function reservar({ nome, mensagem, valor, voz }) {
  const agora = Date.now();
  for (const [v, id] of ativos) if (reservas.get(id).expira < agora) ativos.delete(v);
  const reais = Math.floor(Number(String(valor).replace(",", ".")) || 0);
  if (reais < MINIMO) return { erro: `O valor mínimo é R$ ${MINIMO}.` };
  let centavos = 0;
  while (centavos < 100 && ativos.has(`${reais},${String(centavos).padStart(2, "0")}`)) centavos++;
  if (centavos === 100) return { erro: "Muitos Pix pendentes nesse valor. Tente outro valor." };
  const v = `${reais},${String(centavos).padStart(2, "0")}`;
  const id = randomBytes(8).toString("base64url");
  reservas.set(id, { valor: v, nome: String(nome ?? "").trim().slice(0, 25), mensagem: String(mensagem ?? "").trim().slice(0, 200), voz, expira: agora + RESERVA_MS, pago: false });
  ativos.set(v, id);
  // Rendered now, while the viewer pays, so the alert doesn't wait for the voice.
  const r = reservas.get(id);
  if (r.mensagem) r.audio = falar(locucao(r.nome || "Anônimo", v, r.mensagem), r.voz);
  return { id, valor: v, brcode: brcode(v), expira: agora + RESERVA_MS };
}

// The crowd (torcida.html). In the real thing the list comes from presenca.html (who is in the chat) and Σ from the Lambda;
// here it's made up, and /simular stands in for the Stats API's GoalScored, saves, and chat joins and leaves.
const NICKS = ["pedrinho_rl", "ana.boost", "kaio", "flipreset", "duda", "zeca_aereo", "lu_mendes", "rafa", "bia.gc", "tavinho", "mari", "joaopedro", "nina", "gui_plat", "léo", "cacau", "vini", "teté", "bruno_s", "jujuba", "otavio", "rê", "fefe", "malu", "dante", "sofia_rl", "caio", "lipe", "babi", "nico"];
const RANKS = ["bronze-2", "silver-1", "gold-3", "platinum-2", "diamond-1", "diamond-3", "champion-2", "grand-champion-1"];
let proximoId = 1;
function pessoa(patrono = Math.random() < 0.25) {
  const nome = NICKS[Math.floor(Math.random() * NICKS.length)];
  const r = patrono ? Math.floor(Math.random() * RANKS.length) : -1;
  return { id: String(proximoId++), nome, rank: patrono ? RANKS[r] : null, sigma: patrono ? (r + 1) * 120 + Math.floor(Math.random() * 100) : Math.floor(Math.random() * 40) };
}
const torcida = new Map();
for (let i = 0; i < 44; i++) {
  const p = pessoa(i < 9);
  torcida.set(p.id, p);
}
const emitir = (evento, dados) => {
  for (const c of clients) c.write(`event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`);
};

// The roulette: a patron present, picked with odds proportional to Σ.
function sortear() {
  const pats = [...torcida.values()].filter((p) => p.rank);
  let x = Math.random() * pats.reduce((t, p) => t + p.sigma, 0);
  return pats.find((p) => (x -= p.sigma) < 0) ?? null;
}

const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
function narracaoGol(velocidade, dedicado) {
  const abre = pick([
    "Olha o que ele fez! É gol! É gol do Luan!",
    "Haja coração, amigo! É gol do Luan!",
    "Vai que é sua, Luan! E é gol!",
    "Que pancada! É gol, é gol, é gol do Luan!",
  ]);
  const vel = velocidade >= 100 ? `${velocidade} quilômetros por hora, que bomba!` : `A bola entrou a ${velocidade} quilômetros por hora!`;
  return [abre, vel, dedicado && `Esse gol é do ${dedicado.nome}!`].filter(Boolean).join(" ");
}
const narracaoContra = () => pick(["Ih, amigo... tomou. Bola pra frente, Luan.", "Não dá pra acreditar. Gol deles.", "Acontece. Respira e vamos pra cima!"]);

async function narrar(texto) {
  const audio = await falar(texto, "galvao");
  if (audio) emitir("narracao", { audio, texto });
}

function simular(tipo) {
  if (tipo === "gol" || tipo === "gol-dedicado") {
    const velocidade = 55 + Math.floor(Math.random() * 70);
    const dedicado = tipo === "gol-dedicado" ? sortear() : null;
    emitir("torcida", { tipo: "gol", nosso: true, velocidade, dedicado });
    narrar(narracaoGol(velocidade, dedicado));
    return { velocidade, dedicado: dedicado?.nome };
  }
  if (tipo === "gol-deles") {
    emitir("torcida", { tipo: "gol", nosso: false });
    narrar(narracaoContra());
    return {};
  }
  if (tipo === "defesa") return emitir("torcida", { tipo: "defesa" }), {};
  if (tipo === "chegada" || tipo === "chegada-patrono") {
    const p = pessoa(tipo === "chegada-patrono");
    torcida.set(p.id, p);
    emitir("torcida", { tipo: "chegada", pessoa: p });
    return p;
  }
  if (tipo === "saida") {
    const p = pick([...torcida.values()]);
    if (p) torcida.delete(p.id), emitir("torcida", { tipo: "saida", id: p.id });
    return p ?? {};
  }
  return null;
}

function body(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        const j = JSON.parse(raw);
        resolve({ raw, json: j, title: j.title ?? "", text: j.text ?? "", app: j.app ?? "" });
      } catch {
        const f = new URLSearchParams(raw);
        resolve(f.has("text") ? { raw, title: f.get("title") ?? "", text: f.get("text"), app: f.get("app") ?? "" } : { raw, title: "", text: raw, app: "" });
      }
    });
  });
}

const json = (res, code, o) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(o) + "\n");
};
const page = (res, file) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(readFileSync(DIR + file));
};

if (process.argv[2] !== "--no-listen")
  createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    if (req.method === "GET" && url.pathname === "/") return page(res, "overlay.html");
    if (req.method === "GET" && url.pathname === "/pix") return page(res, "form.html");
    if (req.method === "GET" && url.pathname === "/torcida") return page(res, "torcida.html");
    if (req.method === "GET" && url.pathname === "/controles") return page(res, "controles.html");
    if (req.method === "GET" && url.pathname === "/torcida/estado") return json(res, 200, [...torcida.values()]);
    if (req.method === "GET" && url.pathname === "/fundo.jpg") {
      res.writeHead(200, { "content-type": "image/jpeg" });
      return res.end(readFileSync(DIR + "fundo.jpg"));
    }
    if (req.method === "POST" && url.pathname === "/legenda") {
      emitir("legenda", (await body(req)).json ?? {});
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/simular") {
      const r = simular(url.searchParams.get("tipo"));
      return r ? json(res, 200, r) : json(res, 400, { erro: "tipo" });
    }
    if (req.method === "GET" && url.pathname === "/vozes") return json(res, 200, await fetch(VOZ).then((r) => r.json()).catch(() => ({})));
    if (req.method === "GET" && /^\/audio\/[\w-]+\.wav$/.test(url.pathname) && existsSync(DIR + url.pathname)) {
      res.writeHead(200, { "content-type": "audio/wav" });
      return res.end(readFileSync(DIR + url.pathname));
    }
    if (req.method === "POST" && url.pathname === "/ouvir") {
      const { nome, mensagem, valor, voz } = (await body(req)).json ?? {};
      const audio = await falar(locucao(String(nome || "Anônimo").slice(0, 25), `${Math.floor(Number(valor) || 0)},00`, String(mensagem ?? "").slice(0, 200)), voz);
      return audio ? json(res, 200, { audio }) : json(res, 500, { erro: "Não deu para gerar a voz." });
    }
    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      res.write(": ok\n\n");
      clients.add(res);
      return req.on("close", () => clients.delete(res));
    }
    if (req.method === "POST" && url.pathname === "/reservar") {
      const r = reservar((await body(req)).json ?? {});
      return json(res, r.erro ? 400 : 200, r);
    }
    if (req.method === "GET" && url.pathname === "/reserva") {
      const r = reservas.get(url.searchParams.get("id"));
      return json(res, 200, { pago: !!r?.pago, expirada: !r || (!r.pago && r.expira < Date.now()) });
    }
    if (req.method === "POST" && url.pathname === "/pix") {
      if (req.headers["x-token"] !== TOKEN && url.searchParams.get("t") !== TOKEN) return json(res, 401, { erro: "token" });
      const n = await body(req);
      const at = new Date().toISOString();
      const full = `${n.title} ${n.text}`.trim();
      const p = parse(full);
      const abaixo = p.valor && reaisDe(p.valor) < MINIMO;
      const dup = recent.has(full) && Date.now() - recent.get(full) < 15000;
      recent.set(full, Date.now());
      const r = !dup && p.valor ? reservas.get(ativos.get(p.valor)) : undefined;
      const reserva = r && r.expira >= Date.now() ? r : undefined;
      if (reserva) {
        reserva.pago = true;
        ativos.delete(p.valor);
      }
      const alerta = { at, valor: p.valor, nome: reserva ? reserva.nome || "Anônimo" : p.primeiroNome ?? "Alguém", mensagem: reserva?.mensagem ?? "" };
      if (reserva?.audio) alerta.audio = await reserva.audio;
      appendFileSync(DIR + "log.jsonl", JSON.stringify({ at, title: n.title, text: n.text, ...p, dup, reserva: !!reserva }) + "\n");
      console.log(at, dup ? "DUP" : "", JSON.stringify(full), "→", p, reserva ? "RESERVA" : "");
      for (const c of clients) c.write(`event: bruto\ndata: ${JSON.stringify({ at, texto: full || "(vazio)", valor: p.valor, nome: alerta.nome, reserva: !!reserva, dup, abaixo })}\n\n`);
      if (!dup && p.valor && !abaixo) for (const c of clients) c.write(`data: ${JSON.stringify(alerta)}\n\n`);
      return json(res, 200, { ok: true, dup, reserva: !!reserva, ...p });
    }
    res.writeHead(404);
    res.end();
  }).listen(PORT, "0.0.0.0", () => console.log(`pix piloto on :${PORT}`));
