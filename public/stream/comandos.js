/*
 * The stand's chat commands, shared by the crowd overlay (torcida.html) and the end credits (creditos.html):
 * whoever types one in the chat moves their own fan. The list of every command, these and the chat bot's, with
 * what each does, is comandos.json (the site's /canal/comandos, the Twitch panel and StreamElements read it).
 *
 *   !pula      three jumps                                  \
 *   !danca     a sway, arms taking turns                     > one of the three every 8 s per person
 *   !comemora  their own goal celebration, from /perfil     /
 *   !grito     their arrival shout, from /perfil, again     once every 30 s per person
 *   !ola       a wave across the whole stand, out from them one at a time for everyone, every 15 s
 *
 * The moves are classes on the fan's element (.pula, .danca, .ola, .comemora), drawn by torcedor.css; the page
 * calls Comandos.fim(el) when its .pose's animation ends, which takes them off. A name with accents counts as
 * without them (!dança is !danca).
 *
 * Comandos.criar({ pessoa, todos, pausado, falar, frase }) gives comando(login, text), true when the text was
 * one of these commands (moved or not, so the page knows not to show it as a balloon):
 *   pessoa(login)  → the person, with .el, their fan, or nothing
 *   todos()        → everyone in the stand, for the wave
 *   pausado()      → true while the stand is busy (a goal's party or mourning): commands wait
 *   falar(p, text) → a balloon over their fan
 *   frase(p)       → their arrival shout ("" when they have none)
 */
const Comandos = (() => {
  const ESPERA_MS = 8000
  const GRITO_MS = 30000
  const OLA_MS = 15000
  const MOVES = ["pula", "danca", "ola", "comemora"]

  /** "!Dança agora" → "danca". */
  const nome = (texto) =>
    String(texto)
      .trim()
      .split(/\s/)[0]
      .slice(1)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")

  function criar({ pessoa, todos, pausado = () => false, falar = () => {}, frase = () => "" }) {
    const vez = new Map() // `${login} ${group}` → when they last used one of the group
    let ultimaOla = 0

    function mexer(p, classe) {
      fim(p.el)
      void p.el.offsetWidth
      p.el.classList.add(classe, "foco")
    }

    const ACOES = {
      pula: { grupo: "mexe", espera: ESPERA_MS, fazer: (p) => mexer(p, "pula") },
      danca: { grupo: "mexe", espera: ESPERA_MS, fazer: (p) => mexer(p, "danca") },
      // Their own celebration, at once: in a stand it otherwise waits for its place in the ripple (--onda).
      comemora: {
        grupo: "mexe",
        espera: ESPERA_MS,
        fazer(p) {
          mexer(p, "comemora")
          p.el.style.setProperty("--onda", "0ms")
        },
      },
      grito: {
        espera: GRITO_MS,
        fazer(p) {
          const texto = frase(p)
          if (!texto) return false
          falar(p, texto)
        },
      },
      ola: {
        espera: 0,
        fazer(p) {
          if (Date.now() - ultimaOla < OLA_MS) return false
          ultimaOla = Date.now()
          const x0 = Number(p.el.style.getPropertyValue("--x"))
          p.el.classList.add("foco")
          for (const outro of todos()) {
            const el = outro?.el
            if (!el) continue
            el.style.setProperty("--atraso-ola", `${Math.abs(Number(el.style.getPropertyValue("--x")) - x0) * 1.4}ms`)
            el.classList.remove("ola")
            void el.offsetWidth
            el.classList.add("ola")
          }
        },
      },
    }

    return function comando(login, texto) {
      const qual = nome(texto)
      const acao = ACOES[qual]
      if (!acao) return false
      const p = pessoa(login)
      if (!p?.el || pausado()) return true
      const chave = `${p.login ?? login} ${acao.grupo ?? qual}`
      if (acao.espera && Date.now() - (vez.get(chave) || 0) < acao.espera) return true
      if (acao.fazer(p) !== false && acao.espera) vez.set(chave, Date.now())
      return true
    }
  }

  /** A move ended: the fan back to standing, and back in the next goal's ripple. */
  function fim(el) {
    el.classList.remove(...MOVES)
    el.style.removeProperty("--onda")
  }

  return { criar, fim, nome }
})()
