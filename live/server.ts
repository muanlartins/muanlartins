/**
 * Pix donations for the stream, running on this machine.
 *
 *   Donation page  http://localhost:4100           what viewers open (localhost only until a tunnel exposes it)
 *   Overlay        http://localhost:4101/overlay   an OBS browser source
 *   Studio         http://localhost:4101/studio    unmatched payments, history, tests
 *
 * The phone forwards each "Pix received" notification to
 * POST http://<this machine on the LAN>:4101/api/notifications with the
 * PHONE_TOKEN from live/.env. See live/README.md.
 */
import { readFileSync } from "node:fs"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import QRCode from "qrcode"
import { parsePix } from "./notification.ts"
import { brCode } from "./pix.ts"
import { Store, type Donation, type Payment } from "./store.ts"

const here = (path: string) => new URL(path, import.meta.url)

try {
  process.loadEnvFile(here(".env"))
} catch {
  console.warn("No live/.env: copy live/.env.example and fill it in.")
}

const env = process.env
const config = {
  recipient: { key: env.PIX_KEY ?? "", name: env.PIX_NAME ?? "", city: env.PIX_CITY ?? "" },
  phoneToken: env.PHONE_TOKEN ?? "",
  minCents: Number(env.MIN_CENTS ?? 1),
  publicPort: Number(env.PUBLIC_PORT ?? 4100),
  studioPort: Number(env.STUDIO_PORT ?? 4101),
}

const LIMITS = { nickname: 32, message: 200, maxCents: 1_000_000 }

const store = new Store(here("data/donations.json").pathname)

const ASSETS: Record<string, [URL, string]> = {
  "/assets/brand.css": [here("pages/brand.css"), "text/css"],
  "/assets/space-grotesk.ttf": [here("../brand/fonts/SpaceGrotesk.ttf"), "font/ttf"],
  "/assets/mark.svg": [here("../public/brand/mark-small-clear.svg"), "image/svg+xml"],
}

function send(res: ServerResponse, status: number, body: unknown, type = "application/json") {
  res.writeHead(status, { "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store" })
  res.end(type === "application/json" ? JSON.stringify(body) : body)
}

function page(res: ServerResponse, name: string) {
  send(res, 200, readFileSync(here(`pages/${name}.html`)), "text/html")
}

function asset(res: ServerResponse, path: string) {
  const [file, type] = ASSETS[path]
  send(res, 200, readFileSync(file), type)
}

async function body(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString("utf8")
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Every string inside a forwarded notification, since each forwarder app shapes its payload its own way. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (value && typeof value === "object") return Object.values(value).flatMap(strings)
  return []
}

/** "5", "5,00", "5.00", "1.234,56" → cents. */
function cents(amount: unknown) {
  const text = String(amount ?? "").trim().replace(/^R\$\s*/, "")
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Math.round(Number(normalized) * 100) : NaN
}

// Server-sent events to the overlay and the studio.
const listeners = new Set<ServerResponse>()

function broadcast(event: string, data: unknown) {
  for (const res of listeners) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function alert(donation?: Donation, payment?: Payment) {
  broadcast(
    "alert",
    donation
      ? { nickname: donation.nickname, message: donation.message, cents: donation.cents }
      : { nickname: null, message: null, cents: payment?.cents },
  )
}

function receive(text: string[]) {
  for (const line of text) {
    const pix = parsePix(line)
    if (!pix) continue
    const { payment, donation } = store.receive(pix)
    console.log(donation ? `Pix ${payment.cents}¢ paid ${donation.id}` : `Pix ${payment.cents}¢ unmatched`)
    if (donation) alert(donation)
    broadcast("update", {})
    return { matched: Boolean(donation) }
  }
}

const publicServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost")
  if (req.method === "GET" && url.pathname === "/") return page(res, "donate")
  if (req.method === "GET" && url.pathname in ASSETS) return asset(res, url.pathname)

  if (req.method === "POST" && url.pathname === "/api/donations") {
    if (!config.recipient.key) return send(res, 503, { error: "Doações indisponíveis no momento." })
    const input = await body(req)
    const nickname = String(input?.nickname ?? "").trim()
    const message = String(input?.message ?? "").trim()
    const amount = cents(input?.amount)
    if (!nickname || nickname.length > LIMITS.nickname)
      return send(res, 400, { error: `Escreva um apelido de até ${LIMITS.nickname} caracteres.` })
    if (message.length > LIMITS.message)
      return send(res, 400, { error: `A mensagem passa de ${LIMITS.message} caracteres.` })
    if (!(amount >= config.minCents && amount <= LIMITS.maxCents))
      return send(res, 400, { error: "Escreva um valor válido, como 5,00." })
    const donation = store.createDonation({ nickname, message, cents: amount, wall: input?.wall === true })
    broadcast("update", {})
    const code = brCode(config.recipient, donation.cents, donation.id)
    const qr = await QRCode.toString(code, { type: "svg", margin: 0, color: { dark: "#001447", light: "#0000" } })
    return send(res, 201, { id: donation.id, cents: donation.cents, code, qr })
  }

  const status = url.pathname.match(/^\/api\/donations\/([A-F0-9]+)$/)
  if (req.method === "GET" && status) {
    const donation = store.donation(status[1])
    return donation ? send(res, 200, { status: donation.status }) : send(res, 404, { error: "Doação não encontrada." })
  }

  send(res, 404, { error: "Not found" })
})

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"])

const studioServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost")

  // The only route open to the LAN: the phone, with its token.
  if (req.method === "POST" && url.pathname === "/api/notifications") {
    const token = req.headers.authorization?.replace(/^Bearer /, "") ?? url.searchParams.get("token")
    if (!config.phoneToken || token !== config.phoneToken) return send(res, 401, { error: "Bad token" })
    return send(res, 200, receive(strings(await body(req))) ?? { matched: false, ignored: true })
  }

  if (!LOOPBACK.has(req.socket.remoteAddress ?? "")) return send(res, 403, { error: "Studio is local only" })

  if (req.method === "GET" && (url.pathname === "/overlay" || url.pathname === "/studio"))
    return page(res, url.pathname.slice(1))
  if (req.method === "GET" && url.pathname in ASSETS) return asset(res, url.pathname)

  if (req.method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" })
    res.write(": connected\n\n")
    listeners.add(res)
    req.on("close", () => listeners.delete(res))
    return
  }
  if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, store.snapshot())
  if (req.method === "GET" && url.pathname === "/api/wall") return send(res, 200, store.wall())

  if (req.method === "POST") {
    const input = await body(req)
    switch (url.pathname) {
      case "/api/link": {
        const linked = store.link(input?.paymentId, input?.donationId)
        if (!linked) return send(res, 404, { error: "Payment or donation not found" })
        alert(linked.donation)
        break
      }
      case "/api/settle": {
        const payment = store.settle(input?.paymentId, input?.as === "anonymous" ? "anonymous" : "dismissed")
        if (!payment) return send(res, 404, { error: "Payment not found" })
        if (payment.anonymous) alert(undefined, payment)
        break
      }
      case "/api/hide":
        if (!store.setHidden(input?.donationId, input?.hidden === true)) return send(res, 404, { error: "Donation not found" })
        break
      case "/api/replay": {
        const donation = store.donation(input?.donationId)
        if (!donation) return send(res, 404, { error: "Donation not found" })
        alert(donation)
        return send(res, 200, {})
      }
      case "/api/test":
        return send(res, 200, receive([String(input?.text ?? "")]) ?? { matched: false, ignored: true })
      default:
        return send(res, 404, { error: "Not found" })
    }
    broadcast("update", {})
    return send(res, 200, {})
  }

  send(res, 404, { error: "Not found" })
})

// Keeps proxies and OBS from dropping idle event streams.
setInterval(() => listeners.forEach((res) => res.write(": ping\n\n")), 20_000)

publicServer.listen(config.publicPort, "127.0.0.1", () =>
  console.log(`Donation page  http://localhost:${config.publicPort}`),
)
studioServer.listen(config.studioPort, "0.0.0.0", () => {
  console.log(`Overlay        http://localhost:${config.studioPort}/overlay`)
  console.log(`Studio         http://localhost:${config.studioPort}/studio`)
})
