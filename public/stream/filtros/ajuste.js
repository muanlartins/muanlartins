// The fitting aid for visuais.js's looks placed by numbers (`modo: "fixo"`): filtros.html?modo=<id>&ajuste in a
// browser with the camera (localhost:8126). A small panel over the page with each piece's numbers (size, position,
// rotation, which of the model's parts it takes), his hair erased round it, his face and hands back over it and the
// Santa hat's place; every change shows on him at once. The keyboard nudges the piece picked under "Teclado".
// "Copiar" copies the finished entry, to paste into visuais.js in place of the one it started from. filtros.html
// imports this only with ?ajuste, so OBS never draws it.
//
// Fitting with Claude watching: with ?ajuste&espelho, on a server started with --espelho <dir>
// (scripts/servidor_filtros.py), the page sends what it draws, the entry as it stands and its console's errors every
// 2 s (<dir>/quadro.jpg, <dir>/entrada.txt, <dir>/erros.txt) and reloads itself when <dir>/versao changes, so Claude can change the look and see it on him.

// Each piece's units, ranges and the keyboard's steps: the head in the face's centimetres, the shoulders in his
// shoulders' widths (1 is the distance between them).
const PECAS = {
  cabeca: { titulo: "Cabeça", un: "cm", tamanho: [2, 80], posicao: [-40, 40], passo: 0.1, casas: 1, tecla: 0.5 },
  ombros: { titulo: "Ombros", un: "× ombros", tamanho: [0.1, 4], posicao: [-2, 2], passo: 0.01, casas: 3, tecla: 0.02 },
}
const EIXOS = ["x", "y", "z"]
const POSICAO = ["Lado (x)", "Altura (y)", "Frente (z)"]
const ROTACAO = ["Inclina (x)", "Gira (y)", "Deita (z)"]
// What `rostoPorCima` and `maosPorCima` can be, as the panel says them.
const POR_CIMA = [
  [true, "da roupa"],
  ["tudo", "da roupa e da cabeça"],
  [false, "de nada"],
]
// The entry's own keys this panel writes; the others (nome, jogo, rosto, trim…) are copied as they are.
const DO_PAINEL = new Set(["modo", "url", "cabeca", "ombros", "apagar", "rostoPorCima", "maosPorCima", "gorro"])

const CSS = `
#ajuste { position: fixed; top: 8px; right: 8px; z-index: 10; width: 310px; max-height: calc(100vh - 16px); overflow: auto;
  font: 13px/1.35 system-ui, sans-serif; color: #eef0ff; background: rgba(14, 16, 30, 0.9); border-radius: 8px;
  box-shadow: 0 4px 18px #0008; }
#ajuste .topo { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px; background: rgb(14, 16, 30); }
#ajuste.fechado .corpo { display: none; }
#ajuste .corpo { padding: 0 10px 10px; }
#ajuste fieldset { margin: 8px 0 0; padding: 4px 8px 8px; border: 1px solid #ffffff26; border-radius: 6px; }
#ajuste legend { padding: 0 4px; font-weight: 600; color: #ffd76a; }
#ajuste .num { display: grid; grid-template-columns: 80px 1fr 64px; gap: 6px; align-items: center; margin-top: 3px; }
#ajuste input[type="number"], #ajuste input[type="text"], #ajuste select, #ajuste textarea { min-width: 0; padding: 2px 4px;
  font: inherit; color: inherit; background: #0009; border: 1px solid #ffffff38; border-radius: 4px; }
#ajuste input[type="range"] { width: 100%; min-width: 0; margin: 0; }
#ajuste .linha { display: flex; gap: 6px; align-items: center; margin-top: 6px; }
#ajuste .linha > input[type="text"], #ajuste .linha > select { flex: 1; }
#ajuste .erro { border-color: #ff5a6a; }
#ajuste .aviso { color: #ffa070; }
#ajuste .partes { max-height: 150px; overflow: auto; }
#ajuste .parte { font: 11px/1.4 ui-monospace, monospace; word-break: break-all; opacity: 0.5; }
#ajuste .parte.usada { opacity: 1; }
#ajuste button { padding: 3px 10px; font: inherit; color: #10131f; background: #ffd76a; border: 0; border-radius: 4px; cursor: pointer; }
#ajuste .topo button { padding: 0 6px; font-size: 16px; color: inherit; background: none; }
#ajuste textarea { box-sizing: border-box; width: 100%; margin-top: 6px; font: 11px/1.35 ui-monospace, monospace; resize: vertical; }
#ajuste .dica { margin: 4px 0 0; font-size: 11px; opacity: 0.75; }
#ajuste p { margin: 6px 0 0; }
#ajuste .ok { margin-left: 6px; color: #8dffa0; }
`

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v)
    else if (k in e) e[k] = v
    else e.setAttribute(k, v)
  }
  e.append(...kids.flat().filter((k) => k != null && k !== false))
  return e
}
const arred = (x, casas) => +Number(x).toFixed(casas)

/** The panel, handed what of the engine it fits with (filtros.html, at the end). */
export function criarAjuste(m) {
  document.head.append(el("style", { textContent: CSS }))
  const painel = el("div", { id: "ajuste" })
  document.body.append(painel)
  let mostrado = ""
  let teclado = "cabeca"
  // What writes the numbers into the inputs again (after the keyboard, Desfazer, the G key).
  let sincronizar = []
  const sincroniza = () => sincronizar.forEach((f) => f())
  // Each look's numbers as it loaded, for "Desfazer tudo".
  const iniciais = {}
  const atual = () => (m.AGENTS[m.modo]?.modo === "fixo" ? m.AGENTS[m.modo] : null)

  // ---------- the controls ----------
  function numero(rotulo, get, set, [min, max], passo, casas) {
    const r = el("input", { type: "range", min, max, step: passo })
    const n = el("input", { type: "number", step: passo })
    r.addEventListener("input", () => {
      set(Number(r.value))
      n.value = arred(r.value, casas)
    })
    n.addEventListener("input", () => {
      if (n.value === "" || !Number.isFinite(+n.value)) return
      set(+n.value)
      r.value = n.value
    })
    sincronizar.push(() => {
      r.value = get()
      n.value = arred(get(), casas)
    })
    return el("div", { className: "num" }, el("span", {}, rotulo), r, n)
  }
  function caixa(rotulo, get, set) {
    const c = el("input", { type: "checkbox", onchange: () => set(c.checked) })
    sincronizar.push(() => (c.checked = get()))
    return el("label", { className: "linha" }, c, rotulo)
  }
  function porCima(a, rotulo, chave) {
    const s = el("select", { onchange: () => (a[chave] = POR_CIMA[s.selectedIndex][0]) }, POR_CIMA.map(([, t]) => el("option", {}, t)))
    sincronizar.push(() => (s.selectedIndex = Math.max(0, POR_CIMA.findIndex(([v]) => v === (a[chave] ?? true)))))
    return el("label", { className: "linha" }, rotulo, s)
  }

  // ---------- the sections ----------
  function secaoPeca(a, nome) {
    const p = a.pecas[nome]
    const P = PECAS[nome]
    const mudou = () => m.ajustar(a, nome)
    const s = el("fieldset", {}, el("legend", {}, P.titulo))
    s.append(el("p", { className: "dica" }, `Tamanho: o lado mais longo; posição: ${nome === "cabeca" ? "do centro do rosto" : "do meio dos ombros"} (${P.un}); rotação em graus`))
    s.append(numero("Tamanho", () => p.tamanho, (v) => ((p.tamanho = v), mudou()), P.tamanho, P.passo, P.casas))
    EIXOS.forEach((_, i) => s.append(numero(POSICAO[i], () => p.posicao[i], (v) => ((p.posicao[i] = v), mudou()), P.posicao, P.passo, P.casas)))
    EIXOS.forEach((_, i) => s.append(numero(ROTACAO[i], () => p.rotacao[i], (v) => ((p.rotacao[i] = v), mudou()), [-180, 180], 1, 1)))
    // Which of the model's parts: a RegExp as in visuais.js (/Hair|Hat/), applied on Enter.
    const campo = el("input", { type: "text", value: p.partes ? String(p.partes) : "", placeholder: "todas (ex.: /Hair|Hat/)" })
    campo.addEventListener("change", () => {
      const txt = campo.value.trim()
      let re = null
      try {
        const lit = txt.match(/^\/(.*)\/([a-z]*)$/s)
        if (txt) re = lit ? new RegExp(lit[1], lit[2]) : new RegExp(txt)
      } catch {
        campo.classList.add("erro")
        return
      }
      p.partes = re
      m.refazer(a, nome)
      montar()
    })
    s.append(el("label", { className: "linha" }, "Partes", campo))
    if (p.vazia) s.append(el("p", { className: "aviso" }, "Nenhuma parte do modelo bate com esse filtro."))
    const malhas = []
    p.fonte.traverse((o) => o.isMesh && malhas.push(o))
    s.append(
      el(
        "details",
        {},
        el("summary", {}, `Partes do modelo (${malhas.length}): nomes, nós e material`),
        el(
          "div",
          { className: "partes" },
          malhas.map((o) => {
            const nomes = m.nomesDe(o)
            const usada = !p.partes || nomes.some((n) => m.bate(p.partes, n))
            return el("div", { className: usada ? "parte usada" : "parte" }, `${usada ? "✓" : "·"} ${nomes.join(" · ")}`)
          }),
        ),
      ),
    )
    if (nome === "cabeca") s.append(caixa("A cabeça dele esconde a parte de trás", () => p.oclusor !== false, (v) => ((p.oclusor = v), mudou())))
    return s
  }
  function secaoPorCima(a) {
    return el(
      "fieldset",
      {},
      el("legend", {}, "Ele"),
      caixa("Apagar o cabelo dele em volta", () => a.apagar !== false, (v) => (a.apagar = v ? undefined : false)),
      porCima(a, "Rosto por cima", "rostoPorCima"),
      porCima(a, "Mãos por cima", "maosPorCima"),
    )
  }
  function secaoGorro(a) {
    const s = el("fieldset", {}, el("legend", {}, "Gorro de Natal"), caixa("Mostrar o gorro (G)", () => m.gorro.want, (v) => (m.gorro.want = v)))
    if (!a.hatBox) {
      s.append(el("p", { className: "dica" }, "Sem peça na cabeça: o gorro fica na cabeça dele."))
      return s
    }
    // Where it sits by itself (a little under the piece's top, as wide as it), as [up, size].
    const auto = () => {
      const [y, k] = m.hatOnLook({ id: a.id, hatBox: a.hatBox })
      return [arred(y - m.HAT_Y, 1), arred(k, 2)]
    }
    s.append(caixa("Lugar próprio", () => !!a.gorro, (v) => ((a.gorro = v ? auto() : undefined), montar())))
    if (!a.gorro) s.append(el("p", { className: "dica" }, "Automático: um pouco abaixo do alto da peça, da largura dela."))
    else {
      s.append(numero("Subir (cm)", () => a.gorro[0], (v) => (a.gorro[0] = v), [-20, 40], 0.1, 1))
      s.append(numero("Tamanho", () => a.gorro[1], (v) => (a.gorro[1] = v), [0.2, 3], 0.01, 2))
    }
    return s
  }
  function secaoTeclado(a) {
    const s = el("fieldset", {}, el("legend", {}, "Teclado"))
    const linha = el("div", { className: "linha" }, "Move:")
    for (const nome of Object.keys(a.pecas)) {
      const r = el("input", { type: "radio", name: "ajuste-tecla", checked: teclado === nome, onchange: () => (teclado = nome) })
      linha.append(el("label", {}, r, ` ${PECAS[nome].titulo}`))
    }
    s.append(linha, el("p", { className: "dica" }, "← → ↑ ↓ move · PgUp PgDn frente e trás · + − tamanho · [ ] gira · com Shift, 5×"))
    return s
  }
  function secaoCopiar(a) {
    const area = el("textarea", { readOnly: true, rows: 9, wrap: "off" })
    const ok = el("span", { className: "ok" })
    const copiar = el("button", {}, "Copiar")
    copiar.addEventListener("click", async () => {
      area.value = entrada(a)
      area.select()
      try {
        await navigator.clipboard.writeText(area.value)
        ok.textContent = "Copiado: cole em visuais.js"
      } catch {
        ok.textContent = document.execCommand("copy") ? "Copiado: cole em visuais.js" : "Selecionado: Ctrl+C"
      }
    })
    const desfazer = el("button", { onclick: () => desfazerTudo(a) }, "Desfazer tudo")
    return el("fieldset", {}, el("legend", {}, "A entrada"), el("div", { className: "linha" }, copiar, desfazer, ok), area)
  }

  // ---------- the entry, as text for visuais.js ----------
  function entrada(a) {
    const lit = (x) =>
      x instanceof RegExp ? String(x) : Array.isArray(x) ? `[${x.map(lit).join(", ")}]` : typeof x === "object" && x ? JSON.stringify(x) : typeof x === "string" ? JSON.stringify(x) : String(x)
    const out = [`  ${/^[A-Za-z_$][\w$]*$/.test(a.id) ? a.id : JSON.stringify(a.id)}: {`, `    modo: "fixo",`]
    if (a.url) out.push(`    url: ${lit(a.url)},`)
    for (const [k, x] of Object.entries(m.VISUAIS[a.id] || {})) if (!DO_PAINEL.has(k)) out.push(`    ${k}: ${lit(x)},`)
    for (const [nome, p] of Object.entries(a.pecas)) {
      const c = PECAS[nome].casas
      const campos = []
      if (p.url !== a.url) campos.push(`url: ${lit(p.url)}`)
      if (p.partes) campos.push(`partes: ${p.partes}`)
      campos.push(`tamanho: ${arred(p.tamanho, c)}`, `posicao: ${lit(p.posicao.map((x) => arred(x, c)))}`, `rotacao: ${lit(p.rotacao.map((x) => arred(x, 1)))}`)
      if (p.escala.some((x) => x !== 1)) campos.push(`escala: ${lit(p.escala)}`)
      if (p.oclusor === false) campos.push("oclusor: false")
      out.push(`    ${nome}: { ${campos.join(", ")} },`)
    }
    if (a.apagar === false) out.push("    apagar: false,")
    for (const k of ["rostoPorCima", "maosPorCima"]) if (a[k] !== undefined && a[k] !== true) out.push(`    ${k}: ${lit(a[k])},`)
    if (a.gorro) out.push(`    gorro: [${arred(a.gorro[0], 1)}, ${arred(a.gorro[1], 2)}],`)
    out.push("  },")
    return out.join("\n")
  }
  const copia = (a) => ({
    pecas: Object.fromEntries(Object.entries(a.pecas).map(([n, p]) => [n, { partes: p.partes, tamanho: p.tamanho, posicao: [...p.posicao], rotacao: [...p.rotacao], escala: [...p.escala], oclusor: p.oclusor }])),
    apagar: a.apagar,
    rostoPorCima: a.rostoPorCima,
    maosPorCima: a.maosPorCima,
    gorro: a.gorro && [...a.gorro],
  })
  function desfazerTudo(a) {
    const c = copia(iniciais[a.id])
    for (const [nome, v] of Object.entries(c.pecas)) {
      const p = a.pecas[nome]
      const outras = String(p.partes) !== String(v.partes)
      Object.assign(p, v)
      if (outras) m.refazer(a, nome)
      else m.ajustar(a, nome)
    }
    Object.assign(a, { apagar: c.apagar, rostoPorCima: c.rostoPorCima, maosPorCima: c.maosPorCima, gorro: c.gorro })
    montar()
  }

  // ---------- the panel ----------
  function montar() {
    sincronizar = []
    const fechar = el("button", { title: "Esconder ou mostrar", onclick: () => painel.classList.toggle("fechado") }, "–")
    const corpo = el("div", { className: "corpo" })
    painel.replaceChildren(el("div", { className: "topo" }, el("b", {}, "Ajuste do visual"), fechar), corpo)
    const fixos = Object.values(m.AGENTS).filter((a) => a.modo === "fixo")
    if (!fixos.length) return corpo.append(el("p", {}, 'Nenhum visual com modo: "fixo" em visuais.js.'))
    const qual = el("select", { onchange: () => m.setMode(qual.value) }, el("option", { value: "nenhum" }, "nenhum"))
    for (const a of fixos) qual.append(el("option", { value: a.id, selected: a.id === m.modo }, a.nome || a.id))
    corpo.append(el("label", { className: "linha" }, "Visual", qual))
    const a = atual()
    if (!a) return corpo.append(el("p", {}, "Escolha um visual."))
    if (!a.ready) return corpo.append(el("p", {}, "Carregando o modelo…"))
    iniciais[a.id] ??= copia(a)
    if (!a.pecas[teclado]) teclado = Object.keys(a.pecas)[0]
    for (const nome of Object.keys(a.pecas)) corpo.append(secaoPeca(a, nome))
    corpo.append(secaoPorCima(a), secaoGorro(a), secaoTeclado(a), secaoCopiar(a))
    sincroniza()
  }
  // The look on and whether it's loaded, as the dock or a key changes them; the inputs follow the G key too.
  setInterval(() => {
    const a = atual()
    const agora = `${m.modo}:${!!a?.ready}`
    if (agora !== mostrado) {
      mostrado = agora
      montar()
    } else if (!painel.contains(document.activeElement)) sincroniza()
  }, 300)

  // ---------- ?espelho: the picture and the numbers to the fitting server, a reload when it says ----------
  // Only on localhost: the frames are his camera, and go to whoever serves the page.
  if (new URLSearchParams(location.search).has("espelho") && ["localhost", "127.0.0.1"].includes(location.hostname)) {
    const manda = (nome, corpo) => fetch(`/__espelho/${nome}`, { method: "POST", body: corpo }).catch(() => {})
    // The page's errors and warnings too (<dir>/erros.txt, the latest first in each send).
    const erros = []
    const anota = (...xs) => {
      erros.unshift(`${new Date().toLocaleTimeString()} ${xs.map((x) => (x instanceof Error ? x.stack || x.message : typeof x === "object" ? JSON.stringify(x)?.slice(0, 400) : String(x))).join(" ")}`.slice(0, 4000))
      erros.length = Math.min(erros.length, 40)
    }
    for (const k of ["error", "warn"]) {
      const orig = console[k].bind(console)
      console[k] = (...xs) => (anota(k, ...xs), orig(...xs))
    }
    addEventListener("error", (e) => anota("erro", e.error || e.message))
    addEventListener("unhandledrejection", (e) => anota("promessa", e.reason))
    setInterval(() => erros.length && manda("erros", erros.join("\n")), 2000)
    setInterval(() => {
      m.canvas.toBlob((b) => b && manda("quadro", b), "image/jpeg", 0.85)
      const a = atual()
      if (a?.ready) manda("entrada", entrada(a))
    }, 2000)
    let versao = null
    setInterval(async () => {
      const v = await fetch("/__espelho/versao", { cache: "no-store" }).then((r) => (r.ok ? r.text() : null), () => null)
      if (v == null) return
      if (versao != null && v !== versao) location.reload()
      versao = v
    }, 1000)
  }

  // ---------- the keyboard ----------
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, select, textarea")) return
    const a = atual()
    const p = a?.ready && a.pecas[teclado]
    if (!p) return
    const k = e.shiftKey ? 5 : 1
    const d = PECAS[teclado].tecla * k
    const passo = {
      ArrowLeft: () => (p.posicao[0] -= d),
      ArrowRight: () => (p.posicao[0] += d),
      ArrowUp: () => (p.posicao[1] += d),
      ArrowDown: () => (p.posicao[1] -= d),
      PageUp: () => (p.posicao[2] += d),
      PageDown: () => (p.posicao[2] -= d),
      "+": () => (p.tamanho += PECAS[teclado].tecla),
      "=": () => (p.tamanho += d),
      "-": () => (p.tamanho = Math.max(PECAS[teclado].tamanho[0], p.tamanho - d)),
      _: () => (p.tamanho = Math.max(PECAS[teclado].tamanho[0], p.tamanho - d)),
      "[": () => (p.rotacao[1] -= 5 * k),
      "{": () => (p.rotacao[1] -= 5 * k),
      "]": () => (p.rotacao[1] += 5 * k),
      "}": () => (p.rotacao[1] += 5 * k),
    }[e.key]
    if (!passo) return
    e.preventDefault()
    passo()
    m.ajustar(a, teclado)
    sincroniza()
  })
}
