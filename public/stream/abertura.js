// The live's opening, in the Anúncios dock (anuncios.html gives it Twitch and the stream's state through
// Abertura.iniciar). It reads the agenda (the profile API's GET /agenda, which Luan edits at /canal/agenda):
//
// - Title and category: from 90 minutes before a scheduled live until it ends, the channel's Twitch title and
//   category become the live's (its own title, or its game's), once per live, so the "went live" notification already
//   says it; a change Luan makes by hand afterwards stays. Needs the scope channel:manage:broadcast.
// - The Discord server's ping: once the stream of a scheduled live has been on for 30 s, the profile API is told
//   (PUT /canal/discord/live, with the channel's Twitch token and the channel's title and game as Twitch has them
//   then) and its bot posts "Ao vivo agora" in #lives, pinging "Avisos de live" (infra/perfil/discord.mjs). Once per
//   stream start.
//
// The Instagram story it used to post when the stream opened was dropped on 2026-11-19: Luan posts it by hand.
;(function () {
  const PERFIL = new URLSearchParams(location.search).get("perfil") ?? "https://wtpv8afsak.execute-api.us-east-1.amazonaws.com"
  const ESCOPO = "channel:manage:broadcast"
  const ANTES = 90 * 60e3

  const $ = (id) => document.getElementById(id)
  const ler = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? d
    } catch {
      return d
    }
  }
  const gravar = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {}
  }
  const hora = (ms) => new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  // aplicado: the live whose title went to Twitch; discord: the stream start Discord heard about.
  const salvo = ler("abertura", {})
  const cfg = { aplicado: salvo.aplicado ?? "", discord: salvo.discord ?? "" }
  const salvar = () => gravar("abertura", cfg)
  // The story's Instagram token, if one was ever pasted, goes with it.
  try {
    localStorage.removeItem("abertura-instagram")
  } catch {}

  let host = null
  let agenda = []
  let agendaErro = ""
  let tituloEstado = ""
  let discordEstado = ""

  // --- the agenda ---------------------------------------------------------------------------------------------------
  async function lerAgenda() {
    try {
      const r = await fetch(`${PERFIL}/agenda`)
      if (!r.ok) throw new Error(r.status)
      agenda = (await r.json()).proximas || []
      agendaErro = ""
    } catch {
      agendaErro = "agenda fora do ar"
    }
  }
  /** The live on air or within 90 minutes. */
  function daVez(agora = Date.now()) {
    const o = agenda.find((o) => Date.parse(o.fim) > agora)
    return o && Date.parse(o.inicio) - ANTES <= agora ? o : null
  }
  const chaveDe = (o) => `${o.inicio}|${o.categoria}|${o.titulo}`

  // --- title and category -------------------------------------------------------------------------------------------
  async function aplicarTitulo() {
    const { tw } = host.estado()
    const o = daVez()
    if (!o) return (tituloEstado = "")
    if (!tw.user) return (tituloEstado = "Twitch desconectada")
    if (!tw.escopos?.includes(ESCOPO)) return (tituloEstado = "Conecte a Twitch de novo (permissão do título)")
    if (cfg.aplicado === chaveDe(o)) return
    const atual = (await host.helix("GET", `/channels?broadcaster_id=${tw.user.id}`)).body?.data?.[0]
    if (!atual) return (tituloEstado = "Não deu para ler o canal")
    if (atual.title !== o.titulo || (o.categoria && atual.game_id !== o.categoria)) {
      const r = await host.helix("PATCH", `/channels?broadcaster_id=${tw.user.id}`, { title: o.titulo, ...(o.categoria ? { game_id: o.categoria } : {}) })
      if (!r.ok) return (tituloEstado = `A Twitch recusou (${r.status})`)
    }
    cfg.aplicado = chaveDe(o)
    salvar()
    tituloEstado = `Definido às ${hora(Date.now())}`
  }

  // --- the Discord server's ping -------------------------------------------------------------------------------------
  async function avisarDiscord() {
    const { aoVivo, inicio, tw } = host.estado()
    if (!aoVivo || !inicio) return
    const chave = new Date(inicio).toISOString()
    if (cfg.discord === chave) return
    if (!daVez(inicio)) return (discordEstado = "live fora da agenda: sem aviso")
    if (Date.now() - inicio < 30e3) return (discordEstado = "avisa em instantes")
    if (!tw.user) return (discordEstado = "Twitch desconectada")
    const canal = (await host.helix("GET", `/channels?broadcaster_id=${tw.user.id}`)).body?.data?.[0]
    const r = await fetch(`${PERFIL}/canal/discord/live`, {
      method: "PUT",
      headers: { authorization: `Bearer ${tw.token}`, "content-type": "application/json" },
      body: JSON.stringify({ inicio: chave, titulo: canal?.title || daVez(inicio).titulo, jogo: canal?.game_name || daVez(inicio).nome }),
    })
    if (r.status === 503) return (discordEstado = "Discord ainda não ligado")
    if (!r.ok) return (discordEstado = `o site recusou (${r.status})`)
    const j = await r.json()
    cfg.discord = chave
    salvar()
    discordEstado = j.avisado ? `Avisado às ${hora(Date.now())}` : `não avisado (${j.motivo})`
  }

  // --- the dock -----------------------------------------------------------------------------------------------------
  function desenhar() {
    if (!host) return
    const o = daVez()
    const prox = agenda.find((x) => Date.parse(x.fim) > Date.now())
    $("ab-live").textContent = o
      ? `${o.nome} · ${o.titulo}`
      : prox
        ? `Próxima: ${new Date(prox.inicio).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} ${hora(Date.parse(prox.inicio))}, ${prox.nome}`
        : agendaErro || "—"
    $("ab-titulo").textContent = o ? tituloEstado || "…" : "fora do horário de uma live"
    $("ab-discord").textContent = host.estado().aoVivo ? discordEstado || "…" : "quando a live abrir"
  }

  function iniciar(h) {
    host = h
    if (h.demo) {
      agenda = [{ inicio: new Date(Date.now() - 6e5).toISOString(), fim: new Date(Date.now() + 6e6).toISOString(), nome: "Rocket League", titulo: "Ranqueadas de Rocket League" }]
      tituloEstado = "Definido às 14:02"
      discordEstado = "Avisado às 15:00"
      return desenhar()
    }
    const ciclo = async () => {
      await lerAgenda()
      await aplicarTitulo().catch(() => {})
      await avisarDiscord().catch((e) => (discordEstado = `erro: ${e.message}`))
      desenhar()
    }
    ciclo()
    setInterval(ciclo, 60e3)
    // The ping shouldn't wait for the minute: every 10 s it looks (it does nothing once this stream's was sent).
    setInterval(() => avisarDiscord().catch((e) => (discordEstado = `erro: ${e.message}`)).then(desenhar), 10e3)
  }

  window.Abertura = { iniciar, aplicarTitulo }
})()
