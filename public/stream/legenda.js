// Live captions, over the stand (torcida.html): what Luan says, from scripts/legenda.py on this PC (whisper on the
// GPU, a second or so behind). The "Partidas" dock switches them on and off ("Legendas ao vivo"); only while on does
// the page listen, and only while someone listens does legenda.py hear the microphone. The line being said shows in
// Klein claro and turns white when it ends; the last one fades a few seconds after he stops. Two rows at most: a long
// line keeps its end. ?legenda= the service's address, ?legenda=0 for none.
const Legenda = (() => {
  const params = new URLSearchParams(location.search)
  const SERVICO = params.get("legenda") ?? "http://127.0.0.1:8790"
  const SOME_MS = 4000

  const el = document.createElement("p")
  el.className = "legenda"
  el.setAttribute("aria-live", "polite")
  document.querySelector(".stage").append(el)

  let fonte = null
  let some = 0
  let escondidaAte = 0

  // Words off the start until the line fits its two rows.
  function caber(texto) {
    const palavras = texto.split(" ")
    el.textContent = texto
    while (palavras.length > 1 && el.scrollHeight > el.clientHeight + 1) {
      palavras.shift()
      el.textContent = "… " + palavras.join(" ")
    }
  }

  function mostrar(texto, final) {
    caber(texto)
    el.classList.toggle("final", final)
    el.classList.add("visivel")
    clearTimeout(some)
    some = setTimeout(() => el.classList.remove("visivel"), final ? SOME_MS : SOME_MS * 2)
  }

  return {
    ligar(ligado) {
      if (SERVICO === "0" || !!fonte === ligado) return
      if (!ligado) {
        fonte.close()
        fonte = null
        el.classList.remove("visivel")
        return
      }
      // EventSource reconnects by itself while legenda.py is down or starting.
      fonte = new EventSource(`${SERVICO}/legendas`)
      fonte.onmessage = ({ data }) => {
        const { texto, final } = JSON.parse(data)
        if (texto) mostrar(texto, final)
      }
    },
    /** Out of the way for a while: the stand's banners use the same place. */
    esconder(ms) {
      escondidaAte = Math.max(escondidaAte, Date.now() + ms)
      el.classList.add("escondida")
      setTimeout(() => Date.now() >= escondidaAte && el.classList.remove("escondida"), ms + 20)
    },
    /** For the demo. */
    mostrar,
    get ligada() {
      return !!fonte
    },
  }
})()
