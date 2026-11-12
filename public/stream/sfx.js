// The camera filters' sound effects (filtros.html): each moment of an ability is a cue, a short file made from the
// game's own sounds by scripts/filtros_sons.py into privado/sons/<cue>/NN.ogg (gitignored, served from WSL like the
// models), listed in privado/sons/index.json. A cue with several files plays one at random, never the same twice in
// a row (as the game's random containers do).
//
// OBS: the page's sound reaches the stream only with the "Filtros" source's "Control audio via OBS" on
// (reroute_audio, brand/twitch/obs.py); otherwise the browser plays it straight to Windows' speakers.
//
//   const sfx = createSfx()
//   sfx.preload("phoenix-")                       // decode a filter's cues as it comes on (sfx.keep drops the rest)
//   sfx.play("phoenix-flash-pop", { pan: 0.3 })   // a one-off; pan from -1 (left) to 1, gain, offset (s), delay (s)
//   const h = sfx.play("phoenix-fire", { loop: true, gain: 0 })
//   h.set({ gain: 0.8, pan: -0.2 })               // smoothly
//   h.stop(0.3)                                   // faded out over 0.3 s
//   sfx.stopAll(0.2); sfx.on = false              // the dock's switch

export function createSfx({ base = "privado/sons/", volume = 1 } = {}) {
  const ctx = new AudioContext()
  const out = ctx.createGain()
  out.gain.value = volume
  out.connect(ctx.destination)
  let index = {}
  const ready = fetch(base + "index.json")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((j) => (index = j))
  const buffers = new Map() // cue → its AudioBuffers once decoded (null while loading)
  const last = new Map() // cue → the file played last
  const live = new Set()
  let on = true

  async function load(name) {
    if (buffers.has(name)) return
    buffers.set(name, null)
    const cue = index[name]
    if (!cue) return buffers.delete(name)
    try {
      const decoded = await Promise.all(
        cue.files.map((f) =>
          fetch(`${base}${name}/${f}`)
            .then((r) => r.arrayBuffer())
            .then((b) => ctx.decodeAudioData(b)),
        ),
      )
      if (buffers.has(name)) buffers.set(name, decoded)
    } catch (e) {
      console.warn("som", name, e)
      buffers.delete(name)
    }
  }
  // A filter's cues, decoded ahead (decoding at the moment would make the first one late).
  const preload = (prefix) => ready.then(() => Object.keys(index).filter((k) => k.startsWith(prefix)).forEach(load))
  // Only these prefixes' cues stay decoded (they take some memory).
  const keep = (...prefixes) => [...buffers.keys()].filter((k) => !prefixes.some((p) => k.startsWith(p))).forEach((k) => buffers.delete(k))

  const clampPan = (p) => Math.max(-1, Math.min(1, p || 0))
  const quiet = { stop() {}, set() {} }

  /** Plays a cue now (or after `delay` s); a loop waits for its files, a one-off that isn't ready is skipped. */
  function play(name, { gain = 1, pan = 0, loop = false, offset = 0, delay = 0 } = {}) {
    if (!on) return quiet
    const list = buffers.get(name)
    if (!list?.length) {
      if (!loop) {
        load(name)
        return quiet
      }
      // A loop asked before its file is in: it starts once it is, unless stopped first.
      const later = { stopped: false, real: null, gain, pan }
      load(name).then(() => {
        if (!later.stopped && on && buffers.get(name)?.length) later.real = play(name, { gain: later.gain, pan: later.pan, loop, offset })
      })
      return {
        stop: (fade) => ((later.stopped = true), later.real?.stop(fade)),
        set: (v) => (later.real ? later.real.set(v) : Object.assign(later, v)),
      }
    }
    ctx.resume()
    let i = Math.floor(Math.random() * list.length)
    if (list.length > 1 && i === last.get(name)) i = (i + 1) % list.length
    last.set(name, i)
    const src = ctx.createBufferSource()
    src.buffer = list[i]
    src.loop = loop
    const g = ctx.createGain()
    g.gain.value = gain
    const p = ctx.createStereoPanner()
    p.pan.value = clampPan(pan)
    src.connect(g).connect(p).connect(out)
    const t0 = ctx.currentTime + delay
    src.start(t0, loop ? offset % src.buffer.duration : Math.min(offset, src.buffer.duration))
    const h = {
      stop(fade = 0.12) {
        if (h.done) return
        h.done = true
        const t = ctx.currentTime
        g.gain.cancelScheduledValues(t)
        g.gain.setValueAtTime(g.gain.value, t)
        g.gain.linearRampToValueAtTime(0, t + fade)
        src.stop(t + fade + 0.02)
      },
      set({ gain: v, pan: q } = {}) {
        if (h.done) return
        const t = ctx.currentTime
        if (v !== undefined) g.gain.setTargetAtTime(v, t, 0.05)
        if (q !== undefined) p.pan.setTargetAtTime(clampPan(q), t, 0.05)
      },
    }
    live.add(h)
    src.onended = () => {
      h.done = true
      live.delete(h)
    }
    return h
  }

  function stopAll(fade = 0.15) {
    for (const h of live) h.stop(fade)
  }

  return {
    play,
    preload,
    keep,
    stopAll,
    ready,
    get on() {
      return on
    },
    set on(v) {
      on = !!v
      if (!on) stopAll(0.1)
    },
    set volume(v) {
      out.gain.value = v
    },
  }
}
