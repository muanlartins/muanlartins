#!/usr/bin/env node
// Talks to OBS on the stream PC from WSL, through obs-websocket v5.
//
//   node scripts/obs.mjs status                                   # live? recording? fps, skipped frames, CPU
//   node scripts/obs.mjs '[["GetSceneList", {}], ["GetStats", {}]]'   # any requests, in order
//
// The address is Windows as WSL sees it (the default route); OBS_HOST overrides it. The password is read
// from OBS's own config on Windows and never printed; overlay URLs' keys (#chave=, #obs=) are masked in the
// output. Requests that change OBS (scenes, inputs, recording) are Luan's call: ask first, and never while
// he's live unless he asked for that very change.

import { execSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

const host = process.env.OBS_HOST ?? execSync("ip route").toString().match(/default via (\S+)/)?.[1]
const config = "/mnt/c/Users/muanl/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json"
const password = JSON.parse(readFileSync(config, "utf8")).server_password

const STATUS = [
  ["GetStreamStatus", {}],
  ["GetRecordStatus", {}],
  ["GetStats", {}],
  ["GetCurrentProgramScene", {}],
  ["GetProfileList", {}],
]
const arg = process.argv[2] ?? "status"
const requests = arg === "status" ? STATUS : JSON.parse(arg)

const sha = (text) => createHash("sha256").update(text).digest("base64")
const socket = new WebSocket(`ws://${host}:4455`)
const results = []
let sent = 0

const timer = setTimeout(() => {
  console.error(`OBS didn't answer at ${host}:4455: is it open, with the WebSocket server on?`)
  process.exit(1)
}, 8000)

socket.onerror = () => {
  console.error(`Couldn't reach OBS at ${host}:4455: is it open?`)
  process.exit(1)
}

socket.onmessage = (event) => {
  const { op, d } = JSON.parse(event.data)
  if (op === 0) {
    const auth = d.authentication && sha(sha(password + d.authentication.salt) + d.authentication.challenge)
    socket.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, ...(auth ? { authentication: auth } : {}) } }))
  } else if (op === 2) next()
  else if (op === 7) {
    results.push([d.requestType, d.requestStatus.result ? "ok" : `FAIL ${d.requestStatus.comment ?? d.requestStatus.code}`, d.responseData])
    next()
  }
}

function next() {
  if (sent < requests.length) {
    const [requestType, requestData] = requests[sent++]
    socket.send(JSON.stringify({ op: 6, d: { requestType, requestId: String(sent), requestData } }))
    return
  }
  clearTimeout(timer)
  socket.close()
  console.log(arg === "status" ? summary() : mask(JSON.stringify(results, null, 1)))
}

const mask = (text) => text.replace(/#(chave|obs)=[^"\s]*/g, "#$1=…")

function summary() {
  const [stream, record, stats, scene, profiles] = results.map(([, , data]) => data ?? {})
  return [
    `live: ${stream.outputActive ? `yes, ${stream.outputTimecode}` : "no"} · recording: ${record.outputActive ? `yes, ${record.outputTimecode}` : "no"}`,
    `scene: ${scene.currentProgramSceneName ?? "?"} · profile: ${profiles.currentProfileName ?? "?"}`,
    // RLR's studio switches to the Shorts profile to record shorts and back afterwards; a live needs the live's.
    profiles.currentProfileName === "Shorts" ? "⚠ OBS is still on the Shorts profile (1080×1920): switch back to the live's before going live" : "",
    `fps ${stats.activeFps?.toFixed(1)} · cpu ${stats.cpuUsage?.toFixed(1)}% · render skipped ${stats.renderSkippedFrames}/${stats.renderTotalFrames} · encode skipped ${stats.outputSkippedFrames}/${stats.outputTotalFrames}`,
    stream.outputActive ? `stream skipped ${stream.outputSkippedFrames}/${stream.outputTotalFrames} · congestion ${stream.outputCongestion?.toFixed(2)}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}
