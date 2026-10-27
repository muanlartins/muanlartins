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
  const bots = new Set(["nightbot", "streamelements", "streamlabs", "moobot", "fossabot", "wizebot", "sery_bot"])

  function show({ id, user, name, text, emotes, broadcaster, action }) {
    if (bots.has(user) || text.startsWith("!")) return
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

  let delay = 1000
  function connect() {
    const ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443")
    ws.onopen = () => {
      delay = 1000
      ws.send("CAP REQ :twitch.tv/tags twitch.tv/commands")
      ws.send("PASS SCHMOOPIIE")
      ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 80000)}`)
      ws.send(`JOIN #${CHANNEL}`)
    }
    ws.onmessage = ({ data }) => {
      for (const line of data.split("\r\n")) {
        if (line.startsWith("PING")) ws.send(`PONG :${parseIrc(line).trailing}`)
        else if (line) handle(line)
      }
    }
    ws.onclose = () => {
      setTimeout(connect, delay)
      delay = Math.min(delay * 2, 30000)
    }
  }

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
  connect()

  // The last messages before the page loaded, so it opens like Twitch's own chat. Twitch's IRC has no
  // history; recent-messages.robotty.de keeps it, already without what moderators removed. If it's
  // down or slow, the chat just starts empty.
  async function history() {
    const url = `https://recent-messages.robotty.de/api/v2/recent-messages/${CHANNEL}?limit=20&hide_moderation_messages=true&hide_moderated_messages=true`
    const { messages = [] } = await (await fetch(url, { signal: AbortSignal.timeout(5000) })).json()
    messages.forEach(apply)
  }
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
    ["rafa_rl", "boa noite!! chegando agora"],
    ["muanlartins", "fala rafa, bem-vindo! hoje é treino de air dribble", true],
    ["giovana.gc", "esse half flip foi limpo demais Kappa", false, "25:32-36"],
    ["tiagoboost", "qual a sensibilidade do teu controle?"],
    ["platinadinho", "ainda não consigo fazer o wave dash, alguma dica?"],
    ["lucas_ssl", "a shadow defense mudou meu jogo, sério"],
    ["rafa_rl", "GG"],
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
Object.assign(window, { params, frame, plate, alternate, mark, drawCopy, chat })
