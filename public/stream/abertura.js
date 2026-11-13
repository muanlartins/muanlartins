// The live's opening, in the Anúncios dock (anuncios.html gives it Twitch, OBS and the stream's state through
// Abertura.iniciar). Both read the agenda (the profile API's GET /agenda, which Luan edits at /canal/agenda):
//
// - Title and category: from 90 minutes before a scheduled live until it ends, the channel's Twitch title and
//   category become the live's (its own title, or its game's), once per live, so the "went live" notification already
//   says it; a change Luan makes by hand afterwards stays. Needs the scope channel:manage:broadcast.
// - The Instagram story (story.js draws it): once the stream is on and a game scene has been on air for a moment (or
//   10 minutes in, whatever the scene), the dock takes OBS's screenshots of the camera and the game, draws the story,
//   puts the JPEG on the profile API for Instagram to fetch (PUT /canal/story, with the channel's Twitch token) and
//   publishes it with Instagram's API (Instagram Login: a long-lived token pasted once, refreshed here every day).
//   A scheduled live posts on its own after a 30 s countdown (Não postar stops it); a live outside the agenda (a test)
//   only with "Postar story". One story per live. "Prévia" draws it without posting.
;(function () {
  const PERFIL = new URLSearchParams(location.search).get("perfil") ?? "https://wtpv8afsak.execute-api.us-east-1.amazonaws.com"
  const IG = "https://graph.instagram.com/v24.0"
  const ESCOPO = "channel:manage:broadcast"
  const ANTES = 90 * 60e3
  const CONTAGEM = 30e3
  const CENA_FIRME = 8e3
  const SEM_CENA = 10 * 60e3
  // Each game's capture in OBS (brand/twitch/obs.py), for the story's background; any other game uses the scene.
  const CAPTURAS = { "rocket-league": "Rocket League", valorant: "Captura · Valorant" }
  const CAMERA = "Câmera"
  const jogoNaCena = (cena) => / \+ chat$/.test(cena) || cena.startsWith("Lance ruim")

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

  // aplicado: the live whose title went to Twitch; postados: the latest stories, [{ em, erro?, pulado? }] (a story
  // posted or skipped since the stream started is this live's, so reloading the dock never posts twice).
  const cfg = { story: true, aplicado: "", postados: [], ...ler("abertura", {}) }
  if (!Array.isArray(cfg.postados)) cfg.postados = []
  const registrar = (o) => {
    cfg.postados = [...cfg.postados, { em: Date.now(), ...o }].slice(-10)
    salvar()
  }
  const resolvido = (inicio) => cfg.postados.some((p) => !p.erro && p.em >= (inicio || Date.now()) - 60e3)
  const ig = { token: "", id: "", usuario: "", renovado: 0, ...ler("abertura-instagram", {}) }
  const salvar = () => gravar("abertura", cfg)
  const salvarIg = () => gravar("abertura-instagram", ig)

  let host = null
  let agenda = []
  let agendaErro = ""
  let tituloEstado = ""
  let story = { fase: "", ate: 0, msg: "", previa: "" }
  let cenaDesde = 0
  let cenaVista = ""

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
  /** The live on air or within 90 minutes, days off skipped. */
  function daVez(agora = Date.now()) {
    const o = agenda.find((o) => !o.folga && Date.parse(o.fim) > agora)
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

  // --- Instagram ----------------------------------------------------------------------------------------------------
  async function igGet(path, params = {}) {
    const r = await fetch(`${IG}${path}?${new URLSearchParams({ ...params, access_token: ig.token })}`)
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error?.message || `Instagram ${r.status}`)
    return j
  }
  async function igPost(path, params) {
    const r = await fetch(`${IG}${path}`, { method: "POST", body: new URLSearchParams({ ...params, access_token: ig.token }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error?.message || `Instagram ${r.status}`)
    return j
  }
  /** Who the token is; a long-lived token lasts 60 days and is renewed here once a day while OBS is open. */
  async function conferirIg() {
    if (!ig.token) return desenhar()
    try {
      if (Date.now() - ig.renovado > 86_400e3) {
        const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(ig.token)}`)
        const j = await r.json().catch(() => ({}))
        if (r.ok && j.access_token) Object.assign(ig, { token: j.access_token, renovado: Date.now() })
      }
      const me = await igGet("/me", { fields: "user_id,username" })
      Object.assign(ig, { id: me.user_id, usuario: me.username, erro: "" })
    } catch (e) {
      ig.erro = e.message
    }
    salvarIg()
    desenhar()
  }

  // --- the story ----------------------------------------------------------------------------------------------------
  function carregar(dataUrl) {
    return new Promise((ok) => {
      if (!dataUrl) return ok(null)
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => ok(null)
      i.src = dataUrl
    })
  }
  async function screenshot(sourceName, imageWidth) {
    const r = await host.pedir("GetSourceScreenshot", { sourceName, imageFormat: "jpg", imageWidth, imageCompressionQuality: 92 })
    return carregar(r?.imageData)
  }
  /** The story of now: the camera, the game (its capture, else the scene on air) and the live from the agenda. */
  async function montar() {
    const { cena } = host.estado()
    const o = daVez()
    const camera = await screenshot(CAMERA, 1280)
    const jogo = (o && CAPTURAS[o.jogo] && (await screenshot(CAPTURAS[o.jogo], 960))) || (cena && (await screenshot(cena, 960)))
    if (!camera && !jogo) throw new Error("o OBS não deu as imagens")
    return Story.desenhar({ camera, jogo, titulo: o?.titulo, nomeJogo: o?.nome, base: location.href })
  }
  async function previa() {
    try {
      const canvas = await montar()
      story.previa = canvas.toDataURL("image/jpeg", 0.8)
      story.msg = "Prévia (não postada)."
    } catch (e) {
      story.msg = `Prévia: ${e.message}`
    }
    desenhar()
  }
  async function postar() {
    const { tw } = host.estado()
    if (story.fase === "postando") return
    story = { ...story, fase: "postando", msg: "Montando o story…" }
    desenhar()
    try {
      if (!ig.token || !ig.id) throw new Error("conecte o Instagram")
      if (!tw.token) throw new Error("conecte a Twitch")
      const canvas = await montar()
      story.previa = canvas.toDataURL("image/jpeg", 0.8)
      const blob = await Story.jpeg(canvas)
      story.msg = "Enviando a imagem…"
      desenhar()
      const up = await fetch(`${PERFIL}/canal/story`, { method: "PUT", headers: { authorization: `Bearer ${tw.token}`, "content-type": "image/jpeg" }, body: blob })
      if (!up.ok) throw new Error(`a API recusou a imagem (${up.status})`)
      const { url } = await up.json()
      story.msg = "Publicando no Instagram…"
      desenhar()
      const { id: container } = await igPost(`/${ig.id}/media`, { image_url: url, media_type: "STORIES" })
      for (let n = 0; n < 15; n++) {
        const { status_code } = await igGet(`/${container}`, { fields: "status_code" })
        if (status_code === "FINISHED") break
        if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`o Instagram não processou (${status_code})`)
        await new Promise((r) => setTimeout(r, 2000))
      }
      await igPost(`/${ig.id}/media_publish`, { creation_id: container })
      registrar({})
      story = { ...story, fase: "postado", msg: `Story postado às ${hora(Date.now())}.` }
    } catch (e) {
      registrar({ erro: e.message })
      story = { ...story, fase: "erro", msg: `Story: ${e.message}` }
    }
    desenhar()
  }

  /** Every second: when the stream is on, wait for a game scene, count down, post. */
  function vigiar() {
    const { aoVivo, inicio, cena } = host.estado()
    const now = Date.now()
    if (cena !== cenaVista) {
      cenaVista = cena
      cenaDesde = now
    }
    if (!aoVivo) {
      if (story.fase === "esperando" || story.fase === "contando") story = { ...story, fase: "", msg: "" }
      return
    }
    if (resolvido(inicio) || story.fase === "postando" || story.fase === "postado" || story.fase === "erro" || story.fase === "pulado") return
    const agendada = Boolean(daVez(inicio || now))
    if (!cfg.story || !agendada) {
      story.fase = "manual"
      story.msg = !cfg.story ? "Story automático desligado." : "Live fora da agenda: story só se você mandar."
      return
    }
    const pronta = (jogoNaCena(cena) && now - cenaDesde > CENA_FIRME) || now - (inicio || now) > SEM_CENA
    if (story.fase !== "contando") {
      if (!pronta) {
        story.fase = "esperando"
        story.msg = "Story assim que entrar numa cena de jogo."
        return
      }
      story.fase = "contando"
      story.ate = now + CONTAGEM
    }
    if (now >= story.ate) postar()
  }

  // --- the dock -----------------------------------------------------------------------------------------------------
  function desenhar() {
    if (!host) return
    const o = daVez()
    const prox = agenda.find((x) => !x.folga && Date.parse(x.fim) > Date.now())
    $("ab-live").textContent = o
      ? `${o.nome} · ${o.titulo}`
      : prox
        ? `Próxima: ${new Date(prox.inicio).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} ${hora(Date.parse(prox.inicio))}, ${prox.nome}`
        : agendaErro || "—"
    $("ab-titulo").textContent = o ? tituloEstado || "…" : "fora do horário de uma live"
    $("ab-story").checked = cfg.story
    const contando = story.fase === "contando"
    $("ab-msg").textContent = contando ? `Story em ${Math.max(0, Math.ceil((story.ate - Date.now()) / 1000))} s.` : story.msg
    $("ab-pular").hidden = !contando
    $("ab-postar").hidden = !(contando || story.fase === "manual" || story.fase === "erro")
    $("ab-postar").textContent = contando ? "Postar agora" : story.fase === "erro" ? "Tentar de novo" : "Postar story"
    $("ab-img").hidden = !story.previa
    if (story.previa) $("ab-img").src = story.previa
    $("ig-status").textContent = !ig.token ? "Instagram desconectado" : ig.erro ? `Instagram: ${ig.erro}` : ig.usuario ? `Instagram: @${ig.usuario}` : "Instagram: conferindo…"
    $("ig-status").className = ig.usuario && !ig.erro ? "status on" : "status"
  }

  function iniciar(h) {
    host = h
    $("ab-story").onchange = (e) => {
      cfg.story = e.target.checked
      salvar()
      desenhar()
    }
    $("ab-postar").onclick = () => postar()
    $("ab-pular").onclick = () => {
      registrar({ pulado: true })
      story = { ...story, fase: "pulado", msg: "Story desta live: não." }
      desenhar()
    }
    $("ab-previa").onclick = () => previa()
    $("ig-salvar").onclick = () => {
      const token = $("ig-token").value.trim()
      if (!token) return
      Object.assign(ig, { token, id: "", usuario: "", renovado: Date.now(), erro: "" })
      $("ig-token").value = ""
      salvarIg()
      conferirIg()
    }
    $("ig-sair").onclick = () => {
      Object.assign(ig, { token: "", id: "", usuario: "", renovado: 0, erro: "" })
      salvarIg()
      desenhar()
    }
    if (h.demo) {
      agenda = [{ inicio: new Date(Date.now() - 6e5).toISOString(), fim: new Date(Date.now() + 6e6).toISOString(), nome: "Rocket League", titulo: "Ranqueadas de Rocket League", folga: false }]
      tituloEstado = "Definido às 14:02"
      story = { fase: "contando", ate: Date.now() + 21e3, msg: "", previa: "" }
      setInterval(desenhar, 500)
      return desenhar()
    }
    const ciclo = async () => {
      await lerAgenda()
      await aplicarTitulo().catch(() => {})
      desenhar()
    }
    ciclo()
    setInterval(ciclo, 60e3)
    setInterval(() => {
      vigiar()
      desenhar()
    }, 1000)
    conferirIg()
    setInterval(conferirIg, 6 * 3600e3)
  }

  window.Abertura = { iniciar, aplicarTitulo }
})()
