// Shared by the overlays: the camera frame, the name plate, the mark and the
// Twitch chat. Plain script, no build: OBS loads these pages as they are.

const params = new URLSearchParams(location.search)
const SVG = "http://www.w3.org/2000/svg"

// Pages are laid out at 1920×1080 and scaled to the browser source's width, so
// they stay sharp on any canvas size.
const stage = document.querySelector(".stage")
if (stage) {
  const fit = () => (stage.style.transform = `scale(${innerWidth / 1920})`)
  fit()
  addEventListener("resize", fit)
}

/** Twitch channel whose chat the overlays show (?canal=). */
const CHANNEL = (params.get("canal") || "muanlartins").toLowerCase()

/**
 * Draws the camera frame around `hole`, an element placed and sized exactly
 * where the camera is. The band sits outside it, `band` px wide. Its top-left
 * and bottom-right corners are cut at 45° (the mark's 180° symmetry); the cut
 * is 2 × band, the most that still covers the camera's corners, which OBS
 * draws square underneath. On the Klein ground, `fill` darkens the band to navy
 * so it still reads as a frame.
 *
 * The returned element has glint(), to catch the eye now and then: a sheen
 * crossing the band at 45°, from the top-left cut to the bottom-right one.
 */
function frame(hole, { band = 12, fill = "#002fa7" } = {}) {
  const w = hole.offsetWidth
  const h = hole.offsetHeight
  const t = band
  const cut = 2 * t
  // A band of even width: the inner cut is the outer one moved t inwards along the diagonal.
  const innerCut = cut - 2 * t + t * Math.SQRT2
  const octagon = (x0, y0, x1, y1, c) =>
    `M${x0 + c} ${y0}H${x1}V${y1 - c}L${x1 - c} ${y1}H${x0}V${y0 + c}Z`
  const outer = octagon(-t, -t, w + t, h + t, cut)
  const inner = octagon(0, 0, w, h, innerCut)
  const middle = octagon(-t / 2, -t / 2, w + t / 2, h + t / 2, (cut + innerCut) / 2)

  // Each streak is a bright head with two fading tails behind it, all ending at the same point.
  const tails = [
    [70, 1],
    [180, 0.45],
    [340, 0.15],
  ]
  const streak = (color, start) =>
    tails
      .map(
        ([length, opacity]) =>
          `<path class="streak" d="${middle}" pathLength="1000" fill="none" stroke="${color}" stroke-opacity="${opacity}"
            stroke-width="${t * 0.34}" stroke-dasharray="${length} ${1000 - length}"
            style="--from:${start + length - tails[0][0]}"/>`,
      )
      .join("")

  // The glint's sheen runs along x + y = constant, SHEEN px across, in a rect that slides along the diagonal.
  const SHEEN = 90
  const reach = w + h + 4 * t

  const uid = `f${Math.random().toString(36).slice(2, 8)}`
  const el = document.createElement("div")
  el.className = "frame"
  el.style.cssText = `left:${hole.offsetLeft}px;top:${hole.offsetTop}px;width:${w}px;height:${h}px`
  el.innerHTML = `<svg xmlns="${SVG}" width="${w}" height="${h}">
    <defs>
      <pattern id="${uid}l" width="12" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 0L12 12M0 12L12 0" stroke="#85a7ff" stroke-opacity="0.3" stroke-width="1"/>
      </pattern>
      <clipPath id="${uid}c"><path d="${outer}${inner}" clip-rule="evenodd"/></clipPath>
      <linearGradient id="${uid}g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${SHEEN}" y2="${SHEEN}">
        <stop offset="0" stop-color="#f4f5f7" stop-opacity="0"/>
        <stop offset="0.5" stop-color="#f4f5f7" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#f4f5f7" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${outer}${inner}" fill="${fill}" fill-rule="evenodd"/>
    <g clip-path="url(#${uid}c)">
      <rect x="${-t}" y="${-t}" width="${w + 2 * t}" height="${h + 2 * t}" fill="url(#${uid}l)"/>
      ${streak("#f4f5f7", 0)}${streak("#85a7ff", -500)}
      <rect class="glint" x="${-reach}" y="${-reach}" width="${2 * reach}" height="${2 * reach}" fill="url(#${uid}g)"/>
    </g>
    <path d="${inner}" fill="none" stroke="#85a7ff" stroke-opacity="0.7" stroke-width="1.5"/>
  </svg>`
  hole.after(el)

  // The sheen spans x + y = SHEEN ± SHEEN, moved by 2 × the translation. The band runs from the top-left
  // cut, x + y = 0, to the bottom-right one, x + y = w + h: start wholly before it and end wholly past it.
  const glint = el.querySelector(".glint")
  const from = -SHEEN - t
  const to = (w + h) / 2 + t
  // At rest it waits off the band, where the animation starts and returns to.
  glint.style.transform = `translate(${from}px, ${from}px)`
  el.glint = () =>
    glint.animate([{ transform: `translate(${from}px, ${from}px)` }, { transform: `translate(${to}px, ${to}px)` }], {
      duration: 1300,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
    })
  return el
}

/**
 * The name plate: the small mark and a line of text, on the frame's bottom
 * edge. Returns attention(), which wipes the line out and back in.
 */
function plate(el, html) {
  el.classList.add("plate")
  el.innerHTML = `<img src="/brand/mark-small-clear.svg" alt=""><span class="line">${html}</span>`
  const line = el.querySelector(".line")
  return () => {
    line.classList.remove("swap")
    void line.offsetWidth
    line.classList.add("swap")
  }
}

/** Rocket League's ranks, as the emblems in /ranks/ are named. Divisions (I–IV) don't apply to the first and last. */
const RANKS = [
  ["unranked", "Sem ranque"],
  ...["bronze", "silver", "gold", "platinum", "diamond", "champion", "grand-champion"].flatMap((tier, t) =>
    ["I", "II", "III"].map((n, i) => [
      `${tier}-${i + 1}`,
      `${["Bronze", "Prata", "Ouro", "Platina", "Diamante", "Campeão", "Grande Campeão"][t]} ${n}`,
    ]),
  ),
  ["supersonic-legend", "Lenda Supersônica"],
]
const DIVISIONS = ["I", "II", "III", "IV"]
const rankName = (tier) => (RANKS.find(([id]) => id === tier) || [, tier])[1]
const hasDivisions = (tier) => tier !== "unranked" && tier !== "supersonic-legend"

/**
 * The record plate: the rank of the mode being played, with the mode and its
 * points (MMR) under it, and the day's wins and losses in that mode, on the frame's top edge, flush right, the name plate turned 180°.
 * It shows what the "Partidas" dock (partidas.html) sends through OBS
 * (obs-browser's emit_event), and hides when nothing has come for a minute.
 */
function recordPlate(el, hole, band) {
  el.classList.add("plate", "turned")
  el.hidden = true
  el.innerHTML = `<img alt=""><span class="rank"></span><span class="line"></span>`
  const [emblem, rank, line] = el.children
  const place = () => {
    el.style.left = `${hole.offsetLeft + hole.offsetWidth + band - el.offsetWidth}px`
    el.style.top = `${hole.offsetTop - band - 26}px`
  }
  let state, lines = [], shown = 0, heard = 0
  const write = (text) => {
    line.classList.remove("swap")
    void line.offsetWidth
    line.classList.add("swap")
    // The swap wipes the line out at 45% of its 0.7 s; the new text goes in then.
    setTimeout(() => ((line.innerHTML = text), place()), 315)
  }
  addEventListener("muanlartins-partidas", ({ detail }) => {
    heard = Date.now()
    const before = JSON.stringify(state)
    state = detail
    const { show, mode, tier, division, mmr, wins, losses, streak, points } = state
    // Set on every message, so the plate comes back after a silence hid it, even with nothing new.
    el.hidden = !show || (!tier && !wins && !losses)
    if (JSON.stringify(state) === before) return
    emblem.hidden = !tier
    if (tier) emblem.src = `/ranks/${tier}.webp`
    rank.innerHTML =
      (tier ? `${rankName(tier)}${hasDivisions(tier) && division ? ` <small>div ${DIVISIONS[division - 1]}</small>` : ""}` : "") +
      `<span class="points">Ranqueada ${mode}${mmr != null ? ` · ${mmr} pts` : ""}</span>`
    lines = [`Hoje ${wins}V <span class="accent">·</span> ${losses}D`]
    if (streak >= 2) lines.push(`${streak} vitórias seguidas`)
    if (points) lines.push(`${points > 0 ? "+" : ""}${points} pts hoje`)
    line.innerHTML = lines[0]
    shown = 0
    place()
  })
  // Every 5 s, when the day has a streak to tell, the line swaps between the record and the streak.
  setInterval(() => {
    if (lines.length > 1) write(lines[(shown = (shown + 1) % lines.length)])
    if (Date.now() - heard > 60000) el.hidden = true
  }, 5000)
}

/** Valorant's competitive tiers by Riot's number (3 Iron 1 … 27 Radiant), as the emblems in /ranks/valorant/ are named. */
const VALORANT_TIERS = [
  ...["iron", "bronze", "silver", "gold", "platinum", "diamond", "ascendant", "immortal"].flatMap((tier, t) =>
    [1, 2, 3].map((n) => [
      `${tier}-${n}`,
      `${["Ferro", "Bronze", "Prata", "Ouro", "Platina", "Diamante", "Ascendente", "Imortal"][t]} ${n}`,
    ]),
  ),
  ["radiant", "Radiante"],
]
const valorantTier = (tier) => (tier >= 3 ? VALORANT_TIERS[tier - 3] : null)
const VALORANT_MAPS = { Ascent: "Ascent", Bonsai: "Split", Canyon: "Fracture", Duality: "Bind", Foxtrot: "Breeze",
  Jam: "Lotus", Juliett: "Sunset", Pitt: "Pearl", Port: "Icebox", Triad: "Haven", Infinity: "Abyss", Rook: "Corrode",
  Plummet: "Summit", Range: "Range", RangeV2: "Range", HURM_Alley: "District", HURM_Bowl: "Kasbah", HURM_Helix: "Drift",
  HURM_HighTide: "Glitch", HURM_Yard: "Piazza" } // Riot's code names (valorant-api.com/v1/maps)

/**
 * The record plate in Valorant's scene (jogo.html?jogo=valorant), the same plate as Rocket League's: Luan's rank,
 * the queue and the map, and the day's wins and losses in competitive, or the score while a match is on. It hears
 * scripts/valorant.py on this PC (`address`), which reads the Riot Client. The day's record is kept in this source's
 * storage, so reloading the scene keeps it.
 */
function valorantPlate(el, hole, band, address) {
  el.classList.add("plate", "turned")
  el.hidden = true
  el.innerHTML = `<img alt=""><span class="rank"></span><span class="line"></span>`
  const [emblem, rank, line] = el.children
  const place = () => {
    el.style.left = `${hole.offsetLeft + hole.offsetWidth + band - el.offsetWidth}px`
    el.style.top = `${hole.offsetTop - band - 26}px`
  }
  const today = () => new Date().toLocaleDateString("en-CA")
  let day = { date: today(), wins: 0, losses: 0 }
  try {
    const saved = JSON.parse(localStorage.getItem("valorant:dia"))
    if (saved?.date === today()) day = saved
  } catch {}
  const state = { tier: null, rr: null, phase: "menu", map: null, queue: null, score: null }
  const QUEUES = { competitive: "Competitiva", unrated: "Sem classificação", swiftplay: "Frenético", premier: "Premier" }
  const draw = () => {
    if (day.date !== today()) day = { date: today(), wins: 0, losses: 0 }
    const known = valorantTier(state.tier)
    emblem.hidden = !known
    if (known) emblem.src = `/ranks/valorant/${known[0]}.webp`
    const rr = known && state.rr != null && `${state.rr} RR`
    const where = [rr, QUEUES[state.queue], state.phase !== "menu" && (VALORANT_MAPS[state.map] ?? state.map)].filter(Boolean).join(" · ")
    rank.innerHTML = (known ? known[1] : "") + (where ? `<span class="points">${where}</span>` : "")
    line.innerHTML =
      state.phase === "partida" && state.score
        ? `${state.score[0]} <span class="accent">–</span> ${state.score[1]}`
        : `Hoje ${day.wins}V <span class="accent">·</span> ${day.losses}D`
    el.hidden = !known && !day.wins && !day.losses
    place()
  }
  const source = new EventSource(`${address}/eventos`)
  source.onmessage = ({ data }) => {
    const event = JSON.parse(data)
    if (event.tipo === "ranque") Object.assign(state, { tier: event.tier, rr: event.rr ?? null })
    if (event.tipo === "fase") {
      Object.assign(state, { phase: event.fase, map: event.mapa, queue: event.fila })
      if (event.fase === "partida") state.score = state.score ?? [0, 0]
      else state.score = null
    }
    if (event.tipo === "rodada") state.score = event.placar.split("–").map(Number)
    if (event.tipo === "partida" && state.queue === "competitive") {
      day[event.vitoria ? "wins" : "losses"]++
      try {
        localStorage.setItem("valorant:dia", JSON.stringify(day))
      } catch {}
    }
    draw()
  }
}

/**
 * The Pix call inside `el`: the QR code to the site's /pix and what it's for (the copy is a draft for Luan). It
 * catches the light now, and then every 3 minutes.
 */
function chamada(el) {
  el.classList.add("chamada")
  el.innerHTML = `<div class="luz"></div><img src="/stream/pix-qr.svg" alt="" />
    <div><p class="pix">Pix com voz</p><p class="convite">Sua mensagem lida aqui na live</p><p class="site">muanlartins.com.br/pix</p></div>`
  const brilhar = () =>
    el.querySelector(".luz").animate([{ transform: "translateX(-100%)" }, { transform: "translateX(100%)" }], { duration: 1400, easing: "cubic-bezier(0.65, 0, 0.35, 1)" })
  setTimeout(brilhar, 1500)
  setInterval(brilhar, 180000)
}

/** Runs `actions` in turn, one every `seconds`: the overlays' now-and-then movement. */
function alternate(seconds, ...actions) {
  let i = 0
  setInterval(() => actions[i++ % actions.length](), seconds * 1000)
}

/**
 * Puts the mark (brand/logo/mark.svg) inside `el`, inlined so its strokes can
 * be animated. Returns its two copies' paths, the visible stroke and the gaps
 * it cuts in the other copy, so they can be drawn together.
 */
async function mark(el) {
  const uid = `m${Math.random().toString(36).slice(2, 8)}`
  const source = await (await fetch("/brand/mark.svg")).text()
  el.innerHTML = source.replace(/id="/g, `id="${uid}`).replace(/url\(#/g, `url(#${uid}`)
  const svg = el.querySelector("svg")
  svg.removeAttribute("width")
  svg.removeAttribute("height")
  const copies = { branco: [], claro: [] }
  const visible = [...svg.querySelectorAll(":scope > path")]
  for (const path of svg.querySelectorAll("path")) {
    const twin = visible.find((v) => v.getAttribute("d") === path.getAttribute("d"))
    const copy = twin.getAttribute("stroke").toLowerCase() === "#f4f5f7" ? "branco" : "claro"
    path.setAttribute("pathLength", "1")
    copies[copy].push(path)
  }
  return copies
}

/** Draws a copy of the mark up to `progress` (0 → 1). */
function drawCopy(paths, progress) {
  // A gap longer than the path, so the square caps don't leave a dot before the stroke starts.
  for (const path of paths) {
    path.style.strokeDasharray = "1 1.1"
    path.style.strokeDashoffset = String(1.02 * (1 - progress))
  }
}

/**
 * Twitch chat, read anonymously over IRC (no login, read-only), opening with
 * the last 20 messages (history() below). New messages come in at the bottom; with `keep`, each fades out after that many seconds.
 * Commands (!…) and the usual bots are left out. ?demo fills it with sample
 * messages to set the scene up offline.
 */
function chat(box, { keep = 0, max = 40 } = {}) {
  box.classList.add("chat")

  function show({ id, user, name, text, emotes, broadcaster, action }) {
    if (BOTS.has(user) || text.startsWith("!")) return
    // The history and the live connection can both bring the same message.
    if (id && box.querySelector(`[data-id="${CSS.escape(id)}"]`)) return
    const el = document.createElement("div")
    el.className = "message"
    el.classList.toggle("broadcaster", broadcaster)
    el.classList.toggle("action", action)
    el.dataset.id = id
    el.dataset.user = user
    const who = document.createElement("span")
    who.className = "name"
    if (broadcaster) who.innerHTML = `<img src="/brand/mark-small-clear.svg" alt="">`
    who.append(name)
    const body = document.createElement("span")
    body.className = "text"
    body.append(...withEmotes(text, emotes))
    el.append(who, body)
    box.append(el)
    while (box.children.length > max) box.firstElementChild.remove()
    if (keep) setTimeout(() => remove(el), keep * 1000)
  }

  function remove(el) {
    el.classList.add("out")
    el.addEventListener("animationend", () => el.remove(), { once: true })
  }

  // Twitch gives emote positions in code points: "25:0-4,12-16/1902:6-10".
  function withEmotes(text, emotes) {
    const chars = Array.from(text)
    const spans = []
    for (const group of emotes ? emotes.split("/") : []) {
      const [id, ranges] = group.split(":")
      for (const range of ranges.split(",")) {
        const [start, end] = range.split("-").map(Number)
        spans.push({ id, start, end })
      }
    }
    spans.sort((a, b) => a.start - b.start)
    const nodes = []
    let at = 0
    for (const { id, start, end } of spans) {
      if (start > at) nodes.push(chars.slice(at, start).join(""))
      const img = document.createElement("img")
      img.className = "emote"
      img.src = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`
      img.alt = chars.slice(start, end + 1).join("")
      nodes.push(img)
      at = end + 1
    }
    if (at < chars.length) nodes.push(chars.slice(at).join(""))
    return nodes
  }

  if (params.has("demo")) return demo(show)

  function apply(line) {
    const { tags, prefix, command, trailing } = parseIrc(line)
    if (command === "PRIVMSG") {
      const action = trailing.startsWith("\u0001ACTION ") && trailing.endsWith("\u0001")
      show({
        id: tags.id,
        user: prefix.split("!")[0],
        name: tags["display-name"] || prefix.split("!")[0],
        text: action ? trailing.slice(8, -1) : trailing,
        emotes: tags.emotes,
        broadcaster: (tags.badges || "").includes("broadcaster/"),
        action,
      })
    } else if (command === "CLEARMSG") {
      box.querySelectorAll(`[data-id="${CSS.escape(tags["target-msg-id"] || "")}"]`).forEach(remove)
    } else if (command === "CLEARCHAT") {
      const selector = trailing ? `[data-user="${CSS.escape(trailing)}"]` : ".message"
      box.querySelectorAll(selector).forEach(remove)
    }
  }

  // Live lines that arrive while the history loads wait for it, so the order holds.
  let waiting = []
  const handle = (line) => (waiting ? waiting.push(line) : apply(line))
  history()
    .catch(() => {})
    .finally(() => {
      const live = waiting
      waiting = null
      live.forEach(apply)
    })
  irc(handle)

  // The last messages before the page loaded, so it opens like Twitch's own chat. Twitch's IRC has no
  // history; recent-messages.robotty.de keeps it, already without what moderators removed. If it's
  // down or slow, the chat just starts empty.
  async function history() {
    const url = `https://recent-messages.robotty.de/api/v2/recent-messages/${CHANNEL}?limit=20&hide_moderation_messages=true&hide_moderated_messages=true`
    const { messages = [] } = await (await fetch(url, { signal: AbortSignal.timeout(5000) })).json()
    messages.forEach(apply)
  }
}

// Accounts that sit in every channel's chat, plus the chat bots: never shown, never in the crowd.
const BOTS = new Set([
  "nightbot", "streamelements", "streamlabs", "moobot", "fossabot", "wizebot", "sery_bot", "soundalerts",
  "commanderroot", "lurxx", "drapsnatt", "anotherttvviewer", "aliceydra", "kattah", "d0nk7", "01ella",
  "regressz", "electricallongboard", "smallstreamersdccommunity", "streamstickers", "pokemoncommunitygame",
  "kofistreambot", "tangiabot", "own3d", "frostytoolsdotcom", "creatisbot", "blerp", "streamholics",
])

/**
 * The channel's chat, read anonymously, reconnecting with backoff: each line goes to `apply`. With
 * `membership`, Twitch also sends who joins and leaves (only viewers logged in with the chat open, in
 * batches about 10 s late) and, on connecting, who is already there (353). `onStatus(connected)` follows
 * the connection.
 */
function irc(apply, { membership = false, onStatus = () => {} } = {}) {
  let delay = 1000
  function connect() {
    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443")
    ws.onopen = () => {
      delay = 1000
      ws.send(`CAP REQ :twitch.tv/tags twitch.tv/commands${membership ? " twitch.tv/membership" : ""}`)
      ws.send("PASS SCHMOOPIIE")
      ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`)
      ws.send(`JOIN #${CHANNEL}`)
      onStatus(true)
    }
    ws.onmessage = ({ data }) => {
      for (const line of data.split("\r\n")) {
        if (line.startsWith("PING")) ws.send(`PONG :${parseIrc(line).trailing}`)
        else if (line) apply(line)
      }
    }
    ws.onclose = () => {
      onStatus(false)
      setTimeout(connect, delay)
      delay = Math.min(delay * 2, 30000)
    }
  }
  connect()
}

function parseIrc(line) {
  const tags = {}
  let rest = line
  if (rest.startsWith("@")) {
    const space = rest.indexOf(" ")
    for (const pair of rest.slice(1, space).split(";")) {
      const at = pair.indexOf("=")
      const value = at < 0 ? "" : pair.slice(at + 1)
      tags[at < 0 ? pair : pair.slice(0, at)] = value.replace(/\\(.)/g, (_, c) => ({ s: " ", ":": ";", r: "\r", n: "\n" })[c] ?? c)
    }
    rest = rest.slice(space + 1)
  }
  let prefix = ""
  if (rest.startsWith(":")) {
    const space = rest.indexOf(" ")
    prefix = rest.slice(1, space)
    rest = rest.slice(space + 1)
  }
  const colon = rest.indexOf(" :")
  const [command, ...middle] = (colon < 0 ? rest : rest.slice(0, colon)).split(" ")
  // The last parameter can come without its colon when it has no spaces: Twitch always sends the colon,
  // the history service doesn't ("PRIVMSG #canal oi"). The first parameter is the channel.
  const trailing = colon < 0 ? (middle.length > 1 ? middle[middle.length - 1] : "") : rest.slice(colon + 2)
  return { tags, prefix, command, trailing }
}

function demo(show) {
  const samples = [
    ["rafa", "boa noite!! chegando agora"],
    ["muanlartins", "fala rafa, bem-vindo! hoje tem ranqueada", true],
    ["giovana.gc", "essa jogada foi limpa demais Kappa", false, "25:29-33"],
    ["tiago.mendes", "qual a tua sensibilidade?"],
    ["marinamarina", "alguma dica pra quem tá começando?"],
    ["lucas_s", "esse conceito mudou meu jogo, sério"],
    ["rafa", "GG"],
  ]
  let i = 0
  const next = () => {
    const [user, text, broadcaster = false, emotes = ""] = samples[i % samples.length]
    show({ id: String(i), user, name: user, text, emotes, broadcaster, action: false })
    i++
  }
  for (let k = 0; k < 4; k++) next()
  setInterval(next, 3000)
}

// What the pages call.
Object.assign(window, { params, frame, plate, recordPlate, valorantPlate, RANKS, DIVISIONS, rankName, hasDivisions, alternate, mark, drawCopy, chat, BOTS, irc, parseIrc })

/**
 * The VAR's state from a "muanlartins-var" event: the Efeitos dock sends it as JSON text in `estado` (obs-websocket
 * keeps only arrays of objects, so the options and votes would arrive empty); a page's own ?demo sends it as is.
 */
function varDe(detail) {
  if (typeof detail?.estado !== "string") return detail ?? null
  try {
    return JSON.parse(detail.estado)
  } catch {
    return null
  }
}

/**
 * The VAR's replay, the same in var.html (the clip on stream) and the Efeitos dock (its preview, the clock both
 * follow). The slow motion around the play: plays at the replay's speed, eases down to `lenta` from `antes` seconds
 * before the play, holds until `depois` seconds after, eases back; and zooms by `zoom` meanwhile (Valorant: on the
 * crosshair, the screen's middle). Like Rocket League's own goal replays.
 */
const FOCO = { antes: 1.1, depois: 0.8, rampa: 0.4, lenta: 0.5, zoom: 1.35 }

/** How far into the slow motion the clip is at `t` seconds: 0 outside it, 1 in it, eased between. */
function focoPeso(t, foco) {
  if (!foco?.ligado || foco.t == null) return 0
  const a = foco.t - FOCO.antes
  const b = foco.t + FOCO.depois
  const r = FOCO.rampa
  const suave = (x) => x * x * (3 - 2 * x)
  if (t <= a - r || t >= b + r) return 0
  if (t < a) return suave((t - (a - r)) / r)
  if (t > b) return suave(1 - (t - b) / r)
  return 1
}

/** The playback rate at clip time `t`: the replay's speed (`base`, 1 = 100%) slowed by the play's slow motion. */
function replayTaxa(t, r) {
  const w = focoPeso(t, r?.foco)
  return (r?.base ?? 1) * (1 - w * (1 - FOCO.lenta))
}

/**
 * Where the replay should be now: the dock's last snapshot ({ t, em, tocando, base, foco, duracao }: clip time `t` at
 * epoch ms `em`) carried forward at the rates above, looping. Both sides compute it the same way, so a page only seeks
 * when it drifts.
 */
function replayPosicao(r, agora = Date.now()) {
  const s = roteiroAgora(r, agora)
  if (s) return s.t
  if (!r || r.t == null) return 0
  let t = r.t
  if (!r.tocando) return t
  let resta = Math.min(30, Math.max(0, (agora - r.em) / 1000))
  const passo = 1 / 60
  while (resta > 0) {
    const dt = Math.min(passo, resta)
    t += dt * replayTaxa(t, r)
    resta -= dt
    if (r.duracao && t >= r.duracao) t -= r.duracao
  }
  return t
}

/**
 * The VAR's script, which plays on its own (Luan doesn't steer the replay live, 2026-11-12): after `espera` s for the
 * clip to load, the play's stretch once at full speed, again at `lenta`, again both if there's time; for the vote's
 * last `telaFim` s the closing screen, the clip frozen on the play while the last votes come in. The stretch ends
 * `depois` s after the play (the clip's end without one) and is as long as the two passes that fit in the vote.
 * r.roteiro = { de, ate, congela } in clip seconds, { inicio, fim } in epoch ms; null once Luan touches the dock's player.
 */
const ROTEIRO = { espera: 1, lenta: 0.5, depois: 2.5, telaFim: 8, rampa: 0.4 }

/** The script for a VAR opening `agora` with a vote of `votoMs`, over a clip of `duracao` s with its play at `alvo` s. */
function roteiroPara(duracao, alvo, votoMs, agora = Date.now()) {
  const fimClip = Math.max(0.5, duracao - 0.05)
  const livre = votoMs / 1000 - ROTEIRO.espera - ROTEIRO.telaFim
  const w = Math.min(fimClip, Math.max(3, livre / (1 + 1 / ROTEIRO.lenta)))
  const de = Math.max(0, Math.min(fimClip, alvo != null ? alvo + ROTEIRO.depois : fimClip) - w)
  const ate = Math.min(fimClip, de + w)
  return {
    de: Math.round(de * 100) / 100, ate: Math.round(ate * 100) / 100, congela: alvo ?? ate,
    inicio: agora + ROTEIRO.espera * 1000, fim: agora + votoMs - ROTEIRO.telaFim * 1000,
  }
}

/**
 * Where the script is at `agora`: { fase: "espera" | "normal" | "lenta" | "fim", t (clip s), taxa, tocando, peso (0–1,
 * how far into the slow pass, eased: the picture's slow-motion look and Valorant's zoom) }, or null without a script.
 */
function roteiroAgora(r, agora = Date.now()) {
  const s = r?.roteiro
  if (!s) return null
  if (agora >= s.fim) return { fase: "fim", t: s.congela, taxa: 1, tocando: false, peso: 0 }
  if (agora < s.inicio) return { fase: "espera", t: s.de, taxa: 1, tocando: false, peso: 0 }
  const w = Math.max(0.5, s.ate - s.de)
  const lenta = w / ROTEIRO.lenta
  const e = ((agora - s.inicio) / 1000) % (w + lenta)
  if (e < w) return { fase: "normal", t: s.de + e, taxa: 1, tocando: true, peso: 0 }
  const x = e - w
  const suave = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v))
  const peso = suave(x / ROTEIRO.rampa) * suave((lenta - x) / ROTEIRO.rampa)
  return { fase: "lenta", t: s.de + x * ROTEIRO.lenta, taxa: ROTEIRO.lenta, tocando: true, peso }
}

/** Whether the replay is playing now: the script's pass, or the dock's play/pause once Luan took over. */
function replayTocando(r, agora = Date.now()) {
  const s = roteiroAgora(r, agora)
  return s ? s.tocando : !!r?.tocando
}
