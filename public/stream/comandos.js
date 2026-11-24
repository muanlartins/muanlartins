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
 * The moves are the page's to draw (both stands are arquibancada3d.js since the 3D fan): this file only says who
 * moves how, and when they may. A name with accents counts as without them (!dança is !danca).
 *
 * Comandos.criar({ pessoa, pausado, falar, frase, mover, ola }) gives comando(login, text), true when the text was
 * one of these commands (moved or not, so the page knows not to show it as a balloon):
 *   pessoa(login)    → the person, when their fan is on the stand, or nothing
 *   pausado()        → true while the stand is busy (a goal's party or mourning): commands wait
 *   falar(p, text)   → their line at the rail
 *   frase(p)         → their arrival shout ("" when they have none)
 *   mover(p, move)   → "pula", "danca" or "comemora" (their own celebration)
 *   ola(p)           → a wave out from them
 */
window.Comandos = (() => {
  const ESPERA_MS = 8000
  const GRITO_MS = 30000
  const OLA_MS = 15000

  /** "!Dança agora" → "danca". */
  const nome = (texto) =>
    String(texto)
      .trim()
      .split(/\s/)[0]
      .slice(1)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")

  function criar({ pessoa, pausado = () => false, falar = () => {}, frase = () => "", mover = () => {}, ola: onda = () => {} }) {
    const vez = new Map() // `${login} ${group}` → when they last used one of the group
    let ultimaOla = 0

    const ACOES = {
      pula: { grupo: "mexe", espera: ESPERA_MS, fazer: (p) => mover(p, "pula") },
      danca: { grupo: "mexe", espera: ESPERA_MS, fazer: (p) => mover(p, "danca") },
      comemora: { grupo: "mexe", espera: ESPERA_MS, fazer: (p) => mover(p, "comemora") },
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
          onda(p)
        },
      },
    }

    return function comando(login, texto) {
      const qual = nome(texto)
      const acao = ACOES[qual]
      if (!acao) return false
      const p = pessoa(login)
      if (!p || pausado()) return true
      const chave = `${p.login ?? login} ${acao.grupo ?? qual}`
      if (acao.espera && Date.now() - (vez.get(chave) || 0) < acao.espera) return true
      if (acao.fazer(p) !== false && acao.espera) vez.set(chave, Date.now())
      return true
    }
  }

  return { criar, nome }
})()
