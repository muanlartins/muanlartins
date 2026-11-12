// The camera filters' trackers (MediaPipe), in a worker of their own so that filtros.html's frame never waits on
// them: each tracking call ends by reading its answer back from the GPU, which used to stall the page's whole frame
// (four of them took a 4070 down to ~15 fps, 2026-11-12). The page sends a frame (an ImageBitmap) with what it wants
// from it and gets back the answers, the frame's time and how long each took; one frame at a time, the newest wins.
// MediaPipe loads its wasm's loader with importScripts, which a module worker refuses: the same, by a synchronous
// request (allowed in workers) and an indirect eval, so its ModuleFactory lands on the worker's global.
self.importScripts = (...urls) => {
  for (const url of urls) {
    const x = new XMLHttpRequest()
    x.open("GET", url, false)
    x.send()
    ;(0, eval)(x.responseText)
  }
}

import { FilesetResolver, GestureRecognizer, HandLandmarker, ImageSegmenter, FaceLandmarker, PoseLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/vision_bundle.mjs"

const MODELS = "https://storage.googleapis.com/mediapipe-models/"
const MW = 256
let tasks = {}
let delegate = ""
let small = null
let smallCtx = null
let MH = 144

async function load({ cpu, which, gestos }) {
  const files = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm")
  const make = (Task, path, opts, d) => Task.createFromOptions(files, { baseOptions: { modelAssetPath: MODELS + path, delegate: d }, runningMode: "VIDEO", ...opts })
  const all = async (d) => {
    delegate = d
    const out = {}
    const jobs = []
    if (which.includes("maos"))
      jobs.push(
        (gestos
          ? make(GestureRecognizer, "gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task", { numHands: 2 }, d)
          : make(HandLandmarker, "hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", { numHands: 2 }, d)
        ).then((t) => (out.maos = t)),
      )
    if (which.includes("corpo"))
      jobs.push(make(ImageSegmenter, "image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite", { outputConfidenceMasks: true, outputCategoryMask: false }, d).then((t) => (out.corpo = t)))
    if (which.includes("rosto"))
      jobs.push(make(FaceLandmarker, "face_landmarker/face_landmarker/float16/1/face_landmarker.task", { numFaces: 1, outputFacialTransformationMatrixes: true }, d).then((t) => (out.rosto = t)))
    if (which.includes("ombros"))
      jobs.push(make(PoseLandmarker, "pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task", { numPoses: 1 }, d).then((t) => (out.ombros = t)))
    await Promise.all(jobs)
    return out
  }
  try {
    tasks = await all(cpu ? "CPU" : "GPU")
  } catch (e) {
    console.warn("GPU failed, trying CPU", e)
    tasks = await all("CPU")
  }
}

function track({ bitmap, t, quer }) {
  const ms = {}
  const out = { type: "resultado", t, ms }
  const time = (k, fn) => {
    const t0 = performance.now()
    out[k] = fn()
    ms[k] = performance.now() - t0
  }
  try {
    if (quer.maos && tasks.maos) {
      time("maos", () => {
        const r = tasks.maos.recognizeForVideo ? tasks.maos.recognizeForVideo(bitmap, t) : tasks.maos.detectForVideo(bitmap, t)
        return { landmarks: r.landmarks || [], handedness: r.handedness || r.handednesses || [], gestures: r.gestures || [] }
      })
    }
    if (quer.rosto && tasks.rosto) {
      time("rosto", () => {
        const r = tasks.rosto.detectForVideo(bitmap, t)
        const mat = r.facialTransformationMatrixes?.[0]
        return mat ? { matrix: Array.from(mat.data), landmarks: r.faceLandmarks?.[0] || null } : null
      })
    }
    if (quer.ombros && tasks.ombros) {
      time("ombros", () => {
        const r = tasks.ombros.detectForVideo(bitmap, t)
        return { landmarks: r.landmarks?.[0] || null, world: r.worldLandmarks?.[0] || null }
      })
    }
    if ((quer.corpo || quer.fundo) && tasks.corpo) {
      time("corpo", () => {
        MH = Math.round((MW * bitmap.height) / bitmap.width)
        if (!small || small.height !== MH) {
          small = new OffscreenCanvas(MW, MH)
          smallCtx = small.getContext("2d", { willReadFrequently: true })
        }
        smallCtx.drawImage(bitmap, 0, 0, MW, MH)
        const r = tasks.corpo.segmentForVideo(small, t)
        const m = r.confidenceMasks?.[0]
        let res = null
        if (m) {
          const f = m.getAsFloat32Array()
          const mask = new Uint8Array(MW * MH)
          for (let i = 0; i < f.length; i++) mask[i] = (f[i] * 255) | 0
          res = { mask, w: MW, h: MH }
          // The frame's top half, small, for checking the background plate against it (the page asks now and then).
          if (quer.fundo) res.topo = smallCtx.getImageData(0, 0, MW, MH >> 1).data
        }
        r.close()
        return res
      })
    }
  } catch (e) {
    out.erro = `${e?.name || ""} ${e?.message || e}`
  }
  bitmap.close()
  const transfer = []
  if (out.corpo?.mask) transfer.push(out.corpo.mask.buffer)
  if (out.corpo?.topo) transfer.push(out.corpo.topo.buffer)
  postMessage(out, transfer)
}

onmessage = async ({ data }) => {
  if (data.type === "carregar") {
    try {
      await load(data)
      postMessage({ type: "pronto", delegate, tarefas: Object.keys(tasks) })
    } catch (e) {
      postMessage({ type: "falha", erro: `${e?.name || ""} ${e?.message || e}` })
    }
  }
  if (data.type === "quadro") track(data)
}
