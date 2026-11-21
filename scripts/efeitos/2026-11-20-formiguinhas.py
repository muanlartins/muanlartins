"""Limpei as formiguinhas (2026-11-20, match 9): the effects the roteiro can't express, for destaque.py's "extra".

Luan on the first cut (a drawn sticker of him with a broom): "poderia ser uma coisa mais animada, tipo varrendo o
octane literalmente, com efeitos sonoros de varrida… trabalho 3D de uma vassoura varrendo o modelo de Octane".
So the broom is real 3D (three.js in headless Chromium, built from primitives: a wooden handle, a red cap, a fan of
420 straw ribbons bent each frame by the stroke, red and green stitching) and the ants are the site's Octane
(public/models/octane.glb, Jako, CC BY 4.0) painted the opponents' orange, a few hand-spans long on the field.

- "eu tiro os defensores": a 45° wipe (the brand plate's cut) puts the game's half on the sweep's own stage (round 3,
  Luan: "ficou um pouco confuso a varrida em cima da gameplay"): a 3D Klein floor with the live backgrounds' lattice,
  lit where the ants are, under a night-blue backdrop; the ants pop up on it, scurrying in bursts like ants.
- "Pum!": the broom slams down where the goal replay shows his demolition (its BOOM, left of the field), flattening
  the two ants there, with a dust burst. Then two strokes to the right ("limpei as" / "formiguinhas do campo")
  launch every ant tumbling off the frame. His camera above leans with each stroke, the handle reaching his chest
  across the seam, so the broom is his. The teaser plays the same live seconds, so it gets the same sweep.
- The two demolitions before it: each opponent comes out of the explosion as a flattened Octane that splats on the
  screen like a bug on a windshield (and stays there until the replay).
- "que sujeira, hein?": the swept field sparkles, with a bell for each glint.
- "Flip! Flip!": motion arcs around the Octane on his head as it flips. "toma flip do Octane na cabeça": the ants
  come back and circle his head doing flips (the back half hidden behind the filter), bonk on "cabeça".
- His goal (round 3: "uma construção até a grande pancada, tipo quando os filmes criam uma antecipação"): from 1.5 s
  before his touch the colour drains, the frame closes in and pushes on the ball, a heart speeds up from ~83 to
  ~180 bpm under a riser, manga focus lines close in and a speedometer in the channel's look ticks up; on the touch
  (115 km/h in the session's log) a hit-stop (an inverted frame, a white one, the frozen hit shaking), a big hit,
  the colour back hot with a shock ring, the needle slamming past 110; on the explosion "110 KM/H" is stamped in the
  thumbnails' style with a burst.
- Every sound here is synthesised (straw scratching the floor and whooshing through the air, from the broom's own
  speed per frame; a straw slap; squeaks for each ant hit; plastic clicks as they bounce; a wet splat; bells;
  birds).

The 3D renders once, in setup, into Videos\\Shorts\\Partes\\formiguinhas\\3d-<recipe hash> (PNG sequences with
alpha, and a still of the sweep that becomes the cover's sticker, Partes\\formiguinhas\\capa-vassoura.png), and is
reused while CENA and DRIVER stay the same.
"""
import hashlib
import json
import math
import os
import subprocess
from pathlib import Path

import cv2
import numpy as np

from edicao import svf_bandpass

SLUG = "formiguinhas"
SR = 48000
DEMOS = [  # live second, where the explosion is on the frame, where the splat lands, its turn
    (4257.81, (520, 1500), (235, 1105), -18.0),
    (4259.85, (520, 1440), (805, 1065), 24.0),
]
SPARKLES = [(4272.22, 300, 1520, 130, 2093.0), (4272.34, 760, 1470, 110, 2637.0), (4272.46, 530, 1585, 150, 3136.0),
            (4272.58, 880, 1555, 100, 3520.0), (4272.70, 190, 1450, 95, 4186.0)]
FLY = (0.1, 0.34)  # a splat leaves the explosion and lands on the screen this long after the demolition
FLIPS = [(4377.42, 4377.67), (4378.22, 4378.47)]  # the filter upside down (frames of the live, 0.05 s apart)
FLIP_HEAD = (540, 433, 340, 310)  # the Octane on his head under the 1.3 punch-in: centre and the arcs' radii
ORBIT = (4380.45, 4381.38)  # the ants come in on "flip", the bonk on "cabeça"
ARC_H = 840  # the arcs stay in the camera's half
RING_Y = 340  # the ring's centre: the roof of the filter's Octane on his head, with no zoom (frame y)
SLAM = 4269.85  # "Pum!": the stretches holding it (the teaser and the payoff) get the stage
STAGE = (4268.56, 4268.76)  # the 45° wipe that puts the sweep on its own stage, just before the ants pop up
HORIZON_GLOW = (0, 36, 128)  # the stage's fog and its backdrop at the horizon
# his goal (round 3, Luan: "uma construção até a grande pancada, tipo quando os filmes criam uma antecipação")
B0, TT, GOAL = 4358.0, 4359.55, 4360.44  # the build starts; his touch (115 km/h, the session's log); the explosion
FREEZE = 0.15  # the hit-stop on his touch
AIM = (530, 1430)  # the push-in: between the ball coming down and his car (frame px)
TOUCH = (505, 1442)  # where the ball is hit, for the shock ring
GAUGE_AT = (540, 1080)  # the speedometer, over the stands
PLATE_AT = (540, 1180)  # "110 KM/H" stamped on the goal

CENA = r"""<!doctype html><html><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"http://local/three/build/three.module.js","three/addons/":"http://local/three/examples/jsm/"}}</script>
<script type="module">
// Formiguinhas (2026-11-20): a straw broom sweeping tiny Octanes like ants, rendered to transparent PNGs that the
// short's "extra" module lays over the frame. Time is the live's second; the frame is the short's 1080×1920.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const FW = 1080, FH = 1920;
const YC = 1350, F = 1400, PITCH = Math.atan(200 / 1400), CAMH = 1.5;  // horizon at y 1150
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = rng(20261120), rr = (a, b) => a + (b - a) * R();
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const easeIn = (x, p = 3) => Math.pow(clamp(x, 0, 1), p);
const easeOutBack = (x) => { x = clamp(x, 0, 1); const c = 2.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(2 * Math.atan(YC / F) * 180 / Math.PI, FW / (2 * YC), 0.05, 200);
cam.position.set(0, CAMH, 0);
cam.rotation.set(-PITCH, 0, 0);
cam.updateMatrixWorld();

// a ground point under a pixel of the frame, and a pixel of a world point
function groundAt(sx, sy) {
  const d = V((sx - FW / 2) / F, -(sy - YC) / F, -1).applyEuler(cam.rotation);
  const k = -CAMH / d.y;
  return V(d.x * k, 0, d.z * k);
}
function pixel(p) {
  const q = p.clone().sub(cam.position).applyEuler(new THREE.Euler(PITCH, 0, 0));  // undo the pitch
  return [FW / 2 + F * q.x / -q.z, YC - F * q.y / -q.z];
}

scene.add(new THREE.HemisphereLight(0xe6f0ff, 0x7a5a36, 1.5));
const sun = new THREE.DirectionalLight(0xfff0d8, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 4;
scene.add(sun, sun.target);
function aimSun(center) {
  sun.target.position.copy(center);
  sun.position.copy(center).add(V(-3.5, 9, 2.5));
  const c = sun.shadow.camera;
  c.left = -6; c.right = 6; c.top = 6; c.bottom = -6; c.near = 0.5; c.far = 30;
  c.updateProjectionMatrix();
}
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.4 }));
catcher.rotation.x = -Math.PI / 2;
catcher.receiveShadow = true;
scene.add(catcher);

// ------------------------------------------------------------------------------------------------ the Octane
let octane = null;
async function loadOctane(length) {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync("http://local/models/octane.glb");
  const root = gltf.scene;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(V(0, 0, 0)), center = box.getCenter(V(0, 0, 0));
  const k = length / size.x;
  root.position.set(-center.x * k, -box.min.y * k, -center.z * k);
  root.scale.setScalar(k);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  const holder = new THREE.Group();
  holder.add(root);
  holder.userData.length = length;
  octane = holder;
}
function makeAnt(color) {
  const a = octane.clone(true);
  a.traverse((o) => {
    if (o.isMesh && (o.material.name === "Octane_Body" || o.material.name === "Paint")) {
      o.material = o.material.clone();
      o.material.color = new THREE.Color(o.material.name === "Octane_Body" ? color : 0x222222);
      o.material.roughness = 0.35; o.material.metalness = 0.2;
    }
  });
  const g = new THREE.Group();  // g: position/heading; inner: squash (about the wheels); spin: tumbles about the middle
  const inner = new THREE.Group(), spin = new THREE.Group();
  const mid = octane.userData.length * 0.2;
  spin.position.y = mid; a.position.y = -mid;
  spin.add(a); inner.add(spin); g.add(inner);
  g.userData.inner = inner; g.userData.spin = spin;
  scene.add(g);
  return g;
}

// ------------------------------------------------------------------------------------------------ the broom
const FAN = 0.95, TOTAL = 3.5;  // the straw's length and the whole broom's, along its axis
const broom = new THREE.Group();  // local X = the fan's width, Y = the axis (up), Z = its thickness
scene.add(broom);
function woodTexture() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#b07a45"; g.fillRect(0, 0, 64, 512);
  const r = rng(7);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${90 + r() * 40},${55 + r() * 25},${25 + r() * 15},${0.25 + r() * 0.35})`;
    g.lineWidth = 1 + r() * 3;
    const x = r() * 64;
    g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 3, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
{
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 1, 20),
    new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 }));
  handle.name = "handle";
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.046, 0.16, 20),
    new THREE.MeshStandardMaterial({ color: 0xd8262b, roughness: 0.3 }));
  cap.name = "cap";
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xd8262b, roughness: 0.3 }));
  hook.name = "hook";
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.3, 0.3, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.85, side: THREE.DoubleSide }));
  neck.scale.z = 0.3;
  neck.position.y = FAN - 0.08;
  broom.add(handle, cap, hook, neck);
  for (const [y, color] of [[FAN - 0.17, 0xc8202a], [FAN - 0.26, 0x1f8a3a], [FAN - 0.35, 0xc8202a]]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.045, 32),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    const k = 0.3 + (FAN - 0.1 - y) * 0.55;  // the fan widens downwards
    band.scale.set(k, 1, k * 0.26);
    band.position.y = y;
    broom.add(band);
  }
  broom.traverse((o) => { if (o.isMesh) o.castShadow = true; });
}
// the straw: ribbons computed each frame in world space
const NS = 420, SEG = 6;
const strands = [];
for (let i = 0; i < NS; i++) {
  const s = clamp((i / (NS - 1)) * 2 - 1 + rr(-0.02, 0.02), -1, 1);
  strands.push({ s, q: rr(-1, 1), len: rr(0.0, 0.07), tone: rr(0.78, 1.12), dark: R() < 0.08, wob: rr(0, 6.28) });
}
const strawGeo = new THREE.BufferGeometry();
const strawPos = new Float32Array(NS * SEG * 6 * 3), strawCol = new Float32Array(NS * SEG * 6 * 3);
strawGeo.setAttribute("position", new THREE.BufferAttribute(strawPos, 3));
strawGeo.setAttribute("color", new THREE.BufferAttribute(strawCol, 3));
const straw = new THREE.Mesh(strawGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }));
straw.castShadow = true;
straw.frustumCulled = false;
scene.add(straw);

function poseBroom(tip, hands, vel, press, yaw = 0.45) {
  // tip: the straw's tip line centre (world); hands: where the axis points; vel: the tip's velocity; press: 0-1
  const u = hands.clone().sub(tip).normalize();
  const L = hands.distanceTo(tip) + 0.1;  // the handle goes on a little past the hands
  const hdl = broom.getObjectByName("handle"), cap = broom.getObjectByName("cap"), hook = broom.getObjectByName("hook");
  hdl.scale.y = L - FAN + 0.05; hdl.position.y = FAN - 0.05 + (L - FAN + 0.05) / 2;
  cap.position.y = L + 0.04; hook.position.y = L + 0.16;
  const w0 = V(Math.cos(yaw), 0, -Math.sin(yaw));
  const w = w0.sub(u.clone().multiplyScalar(w0.dot(u))).normalize();
  const n = u.clone().cross(w).normalize();
  broom.matrixAutoUpdate = false;
  broom.matrix.makeBasis(w, u, n).setPosition(tip);
  broom.matrixWorldNeedsUpdate = true;
  const hv = V(vel.x, 0, vel.z);
  const trail = hv.clone().multiplyScalar(-0.11);
  if (trail.length() > 0.42) trail.setLength(0.42);
  const camPos = cam.position;
  let p = 0;
  const col = new THREE.Color();
  for (const st of strands) {
    const root = tip.clone().addScaledVector(u, FAN - 0.12).addScaledVector(w, st.s * 0.34).addScaledVector(n, st.q * 0.08);
    const spread = 0.9 + 0.3 * press;
    const end = tip.clone().addScaledVector(u, st.len).addScaledVector(w, st.s * spread)
      .addScaledVector(n, st.q * (0.12 + 0.12 * press)).add(trail.clone().multiplyScalar(0.7 + 0.3 * Math.abs(st.q)));
    end.x += Math.sin(st.wob + st.s * 9) * 0.015; end.z += Math.cos(st.wob * 1.7) * 0.015;
    if (end.y < 0.004) end.y = 0.004 + Math.abs(st.q) * 0.004;
    const ctrl = root.clone().lerp(end, 0.5).addScaledVector(trail, 0.25);
    const pts = [];
    for (let k = 0; k <= SEG; k++) {
      const t = k / SEG, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      pts.push(V(root.x * a + ctrl.x * b + end.x * c, root.y * a + ctrl.y * b + end.y * c, root.z * a + ctrl.z * b + end.z * c));
    }
    const base = st.dark ? [0.48, 0.34, 0.16] : [0.86, 0.68, 0.34];
    for (let k = 0; k < SEG; k++) {
      const a = pts[k], b = pts[k + 1];
      const tan = b.clone().sub(a).normalize();
      const view = a.clone().sub(camPos).normalize();
      const side = tan.clone().cross(view).normalize();
      const wa = 0.011 * (1 - 0.45 * k / SEG), wb = 0.011 * (1 - 0.45 * (k + 1) / SEG);
      const q = [a.clone().addScaledVector(side, -wa), a.clone().addScaledVector(side, wa),
                 b.clone().addScaledVector(side, wb), b.clone().addScaledVector(side, -wb)];
      const tri = [q[0], q[1], q[2], q[0], q[2], q[3]];
      const shade = st.tone * (0.62 + 0.38 * (k + 0.5) / SEG);
      col.setRGB(base[0] * shade, base[1] * shade, base[2] * shade);
      for (const v of tri) {
        strawPos[p] = v.x; strawPos[p + 1] = v.y; strawPos[p + 2] = v.z;
        strawCol[p] = col.r; strawCol[p + 1] = col.g; strawCol[p + 2] = col.b;
        p += 3;
      }
    }
  }
  strawGeo.attributes.position.needsUpdate = true;
  strawGeo.attributes.color.needsUpdate = true;
  strawGeo.computeVertexNormals();
  return { u, w, n };
}
function hideBroom(hidden) { broom.visible = straw.visible = !hidden; }

// ------------------------------------------------------------------------------------------------ dust
function puffTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const r = rng(3);
  for (let i = 0; i < 9; i++) {
    const x = 64 + (r() - 0.5) * 40, y = 64 + (r() - 0.5) * 40, rad = 26 + r() * 22;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const PUFF = puffTexture();
const puffs = [];
for (let i = 0; i < 260; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF, color: 0xd9c29a, transparent: true, depthWrite: false }));
  s.visible = false; s.userData = { life: 0 };
  scene.add(s); puffs.push(s);
}
function emit(pos, vel, life, size, tint = 0xd9c29a) {
  const s = puffs.find((p) => !p.visible);
  if (!s) return;
  s.visible = true;
  s.position.copy(pos);
  s.material.color.set(tint);
  s.material.rotation = rr(0, 6.28);
  s.userData = { age: 0, life, size, vel: vel.clone(), spin: rr(-1.5, 1.5) };
}
function stepPuffs(dt) {
  for (const s of puffs) {
    if (!s.visible) continue;
    const d = s.userData;
    d.age += dt;
    if (d.age >= d.life) { s.visible = false; continue; }
    d.vel.multiplyScalar(Math.exp(-dt * 2.2));
    d.vel.y += dt * 0.25;
    s.position.addScaledVector(d.vel, dt);
    const k = d.age / d.life;
    s.scale.setScalar(d.size * (0.35 + 1.1 * Math.sqrt(k)));
    s.material.opacity = 0.62 * Math.pow(1 - k, 1.4) * Math.min(1, d.age / 0.05);
    s.material.rotation += d.spin * dt;
  }
}

// ------------------------------------------------------------------------------------------------ render
const out2d = document.createElement("canvas");
const g2d = out2d.getContext("2d");
function renderRegion(y0, h, name, tile = 620, x0 = 0, w = FW) {
  out2d.width = w; out2d.height = h;
  g2d.clearRect(0, 0, w, h);
  for (let y = 0; y < h; y += tile) {
    const th = Math.min(tile, h - y);
    renderer.setSize(w, th, false);
    cam.setViewOffset(FW, 2 * YC, x0, y0 + y, w, th);
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    g2d.drawImage(renderer.domElement, 0, y);
  }
  return window.savePng(name, out2d.toDataURL("image/png"));
}

// ================================================================================================ the sweep
const T = {
  pop: 4268.81, raise: 4269.42, top: 4269.6, slam: 4269.85, s1: 4269.96, s1e: 4270.47, s2: 4270.74, s2e: 4271.36,
  exit: 4271.72,
};
async function varrida(args) {
  await loadOctane(args.ant ?? 0.74);
  const t0 = args.de ?? 4268.7, t1 = args.ate ?? 4273.4, fps = 60, sub = 4;
  const y0 = args.y0 ?? 480, h = args.h ?? 1320;
  const only = args.so ? new Set(args.so) : null;
  // the field the ants stand on: a band of the game's half, in world coordinates
  const near = groundAt(540, 1640).z, far = groundAt(540, 1478).z;
  const mid = (near + far) / 2;
  aimSun(V(0, 0, mid));
  const zOf = (sy) => groundAt(540, sy).z;
  const xOf = (sx, z) => { const k = pixel(V(1, 0, z))[0] - pixel(V(0, 0, z))[0]; return (sx - FW / 2) / k; };
  const slamZ = zOf(1530), slamX = xOf(205, slamZ);
  const colors = [0xff7a1a, 0xff8c1f, 0xf36a12, 0xff9a30, 0xe85d10];
  const ants = [];
  const N = args.n ?? 11;
  for (let i = 0; i < N; i++) {
    const g = makeAnt(colors[i % colors.length]);
    let x, z, home = null;
    if (i < 2) { z = slamZ + (i ? 0.25 : -0.3); x = slamX + (i ? 0.15 : -0.2); home = V(x, 0, z); }
    else { z = far + (near - far) * (((i - 2) * 0.618 + 0.2) % 1); x = xOf(360 + 620 * (i - 2) / (N - 3) + rr(-25, 25), z); }
    ants.push({ g, p: V(x, 0, z), v: V(0, 0, 0), head: rr(0, 6.28), go: 0, wait: rr(0, 0.3), speed: 0, home,
      state: "hidden", born: T.pop + i * 0.035 + rr(0, 0.04), rot: new THREE.Euler(0, 0, 0, "YXZ"), av: V(0, 0, 0),
      flat: 0, hop: 0, vy: 0, id: i, corner: rr(700, 990) });
  }
  const events = { hits: [], bounces: [], squash: [], frames: [] };
  // the broom's path, in the frame's pixels where it touches the ground: the tip line's x, its lift, its depth
  const z1 = zOf(1545), z2 = zOf(1565);
  function path(t) {
    if (t < T.raise || t > T.exit + 0.4) return null;
    let sx, y, z;
    if (t < T.top) { const k = smooth((t - T.raise) / (T.top - T.raise)); sx = -380 + 420 * k; y = 2.6 - 1.0 * k; z = slamZ; }
    else if (t < T.slam) { const k = easeIn((t - T.top) / (T.slam - T.top), 2.6); sx = 40 + 165 * k; y = 1.6 * (1 - k); z = slamZ; }
    else if (t < T.s1) { sx = 205; y = 0; z = slamZ; }
    else if (t < T.s1e) { const k = smooth((t - T.s1) / (T.s1e - T.s1)); sx = 205 + 380 * k; y = 0; z = slamZ + (z1 - slamZ) * k; }
    else if (t < T.s2) { const k = smooth((t - T.s1e) / (T.s2 - T.s1e)); sx = 585 - 745 * k; y = 0.5 * Math.sin(Math.PI * k); z = z1 + (z2 - z1) * k; }
    else if (t < T.s2e) { const k = (t - T.s2) / (T.s2e - T.s2); sx = -160 + 1650 * (0.55 * k * k + 0.45 * k); y = 0; z = z2; }
    else { const k = smooth((t - T.s2e) / (T.exit + 0.4 - T.s2e)); sx = 1490 + 500 * k; y = 2.4 * k; z = z2; }
    return V(xOf(sx, z), y, z);
  }
  function handsAt(t, tip) {
    // the hands under his chin, at the seam (y ~830), following the tip a little
    const hz = tip.z + 0.6;
    const [tx] = pixel(V(tip.x, 0, tip.z));
    const sx = FW / 2 + 0.3 * (clamp(tx, -400, 1500) - FW / 2), sy = 905;
    const d = V((sx - FW / 2) / F, -(sy - YC) / F, -1).applyEuler(cam.rotation);
    const k = (hz - CAMH * 0) / d.z;
    return cam.position.clone().addScaledVector(d, (hz - cam.position.z) / d.z);
  }
  let prevTip = null, press = 0, pressV = 0;
  const dt = 1 / (fps * sub);
  let t = t0 - 0.6, frame = 0;
  const nFrames = Math.round((t1 - t0) * fps) + 1;
  const tip = V(0, 0, 0), vel = V(0, 0, 0);
  let slammed = false;
  while (frame < nFrames) {
    // --- step
    const pth = path(t);
    if (pth) {
      if (prevTip) vel.copy(pth).sub(prevTip).divideScalar(dt); else vel.set(0, 0, 0);
      prevTip = pth.clone();
      tip.copy(pth);
    } else prevTip = null;
    if (!slammed && t >= T.slam) {
      slammed = true;
      pressV = 9;
      events.squash.push(t);
      const sp = path(T.slam);
      for (let i = 0; i < 34; i++) {
        const a = rr(0, 6.28);
        emit(V(sp.x + Math.cos(a) * 0.3, 0.05, sp.z + Math.sin(a) * 0.12), V(Math.cos(a) * rr(1.2, 2.6), rr(0.3, 1.2), Math.sin(a) * rr(0.6, 1.4)), rr(0.8, 1.5), rr(0.5, 0.9));
      }
      for (const a of ants) {
        if (a.state === "hidden") continue;
        const d = Math.hypot(a.p.x - sp.x, (a.p.z - sp.z) * 1.6);
        if (d < 0.62) { a.state = "flat"; a.flat = 1; a.squashAt = t; }
        else if (d < 4) {
          a.state = "panic"; a.vy = rr(2.2, 3.4); a.hop = 0.001;
          a.head = Math.atan2(-(a.p.z - sp.z) * 0.4 + rr(-0.3, 0.3), Math.max(0.4, a.p.x - sp.x + 0.8));
          a.speed = rr(1.8, 2.8);
        }
      }
    }
    pressV += (-120 * press - 9 * pressV) * dt;
    press += pressV * dt;
    const onGround = pth && pth.y < 0.08;
    const speed = Math.hypot(vel.x, vel.z);
    if (onGround && speed > 0.5 && t > T.slam) {
      const n = speed * 26 * dt;
      for (let i = 0; i < Math.floor(n) + (R() < n % 1 ? 1 : 0); i++)
        emit(V(tip.x + rr(-0.7, 0.7) - vel.x * 0.04, rr(0.02, 0.1), tip.z + rr(-0.2, 0.2)),
          V(-vel.x * rr(0.05, 0.25) + rr(-0.3, 0.3), rr(0.2, 0.9), rr(-0.4, 0.4)), rr(0.7, 1.3), rr(0.4, 0.8));
    }
    for (const a of ants) {
      if (a.state === "hidden") { if (t >= a.born) { a.state = "walk"; a.age = 0; } else continue; }
      a.age = (a.age || 0) + dt;
      if (a.state === "walk" || a.state === "panic") {
        if (a.state === "walk") {
          a.wait -= dt;
          if (a.wait <= 0) {
            if (a.go > 0) { a.go = 0; a.wait = rr(0.08, 0.28); a.speed = 0; a.head += rr(-1.6, 1.6); }
            else { a.go = 1; a.wait = rr(0.15, 0.45); a.speed = rr(1.2, 2.2); }
          }
          if (a.home && a.p.distanceTo(a.home) > 0.3) a.head = Math.atan2(-(a.home.z - a.p.z), a.home.x - a.p.x);
          // stay in the band
          const cx = clamp(a.p.x, xOf(120, a.p.z), xOf(1000, a.p.z)), cz = clamp(a.p.z, far, near);
          if (cx !== a.p.x || cz !== a.p.z) a.head = Math.atan2(-(cz - a.p.z + (0 - a.p.z) * 0.1), (0 - a.p.x));
        } else {
          a.head += rr(-0.15, 0.15);
          if (a.p.x > xOf(a.corner, a.p.z)) { a.speed *= Math.exp(-dt * 6); a.head = Math.PI / 2 * Math.sign(rr(-1, 1)) * 0.5; }
        }
        a.p.x += Math.cos(a.head) * a.speed * dt;
        a.p.z += -Math.sin(a.head) * a.speed * dt;
        a.p.z = clamp(a.p.z, far - 0.2, near + 0.2);
        if (a.hop > 0 || a.vy > 0) { a.p.y += a.vy * dt; a.vy -= 16 * dt; if (a.p.y <= 0) { a.p.y = 0; a.vy = 0; a.hop = 0; } }
      }
      // the broom's straw catches whatever is ahead of it
      if (onGround && speed > 0.8 && a.state !== "fly" && a.state !== "gone" && t > T.slam + 0.05) {
        const dx = a.p.x - tip.x, dz = a.p.z - tip.z;
        if (Math.abs(dz) < 1.4 && dx > -0.35 && dx < 0.8 && vel.x > 0) {
          a.state = "fly";
          a.v.set(vel.x * rr(1.1, 1.6) + 0.6, rr(3.0, 6.5), rr(-0.6, 2.2));
          a.av.set(rr(-16, 16), rr(-8, 8), -rr(10, 22));
          const [sx, sy] = pixel(a.p);
          events.hits.push({ t, x: sx, y: sy, flat: a.flat > 0 });
        }
      }
      if (a.state === "fly") {
        a.v.y -= 15 * dt;
        a.p.addScaledVector(a.v, dt);
        a.rot.x += a.av.x * dt; a.rot.y += a.av.y * dt; a.rot.z += a.av.z * dt;
        if (a.p.y < 0) {
          a.p.y = 0;
          if (Math.abs(a.v.y) > 1.2) { const [sx] = pixel(a.p); events.bounces.push({ t, x: sx }); }
          a.v.y = -a.v.y * 0.38; a.v.x = Math.max(a.v.x * 0.92, 2.8); a.v.z *= 0.8; a.av.multiplyScalar(0.75);
        }
        const [sx] = pixel(a.p);
        if (sx > FW + 260 || sx < -260) a.state = "gone";
      }
    }
    stepPuffs(dt);
    t += dt;
    // --- a frame every `sub` steps
    const ft = t0 + frame / fps;
    if (t + 1e-9 >= ft) {
      if (pth) {
        const hands = handsAt(t, tip);
        poseBroom(tip, hands, vel, clamp(press + (pth.y < 0.05 ? 0.25 : 0), 0, 1.6));
        hideBroom(false);
      } else hideBroom(true);
      for (const a of ants) {
        const g = a.g;
        g.visible = a.state !== "hidden" && a.state !== "gone";
        if (!g.visible) continue;
        const bornK = clamp((t - a.born) / 0.2, 0, 1);
        const pop = a.state === "walk" && bornK < 1 ? easeOutBack(bornK) : 1;
        g.position.copy(a.p);
        const bob = (a.state === "walk" || a.state === "panic") && a.speed > 0.1 ? Math.abs(Math.sin(t * 38 + a.id)) * 0.025 : 0;
        g.position.y += bob + (a.state === "walk" && bornK < 1 ? 0.25 * Math.sin(Math.PI * bornK) : 0);
        g.rotation.set(0, a.head, 0, "YXZ");
        if (a.state === "fly") g.userData.spin.rotation.set(a.rot.x, a.rot.y, a.rot.z, "YXZ");
        else g.userData.spin.rotation.set(Math.sin(t * 30 + a.id) * 0.07 * (a.speed > 0.1 ? 1 : 0), 0, 0);
        const inner = g.userData.inner;
        if (a.flat > 0) {
          const k = clamp((t - a.squashAt) / 0.12, 0, 1);
          const wob = 1 + 0.25 * Math.exp(-(t - a.squashAt) / 0.12) * Math.sin((t - a.squashAt) * 60);
          inner.scale.set((1 + 0.45 * k) * wob, 1 - 0.8 * k, (1 + 0.45 * k) * wob);
        } else inner.scale.setScalar(pop);
      }
      const tipPx = pth ? pixel(tip) : null;
      const handsPx = pth ? pixel(handsAt(t, tip)) : null;
      events.frames.push({ t: +ft.toFixed(4), tip: tipPx, hands: handsPx, onGround: !!onGround });
      if (args.capa !== undefined) {
        if (Math.abs(ft - args.capa) < 0.5 / fps) {
          catcher.visible = false; puffs.forEach((p) => { p.visible = false; });
          await renderRegion(640, 1140, "capa-vassoura.png", 570, -300, 1660);
          return { capa: ft };
        }
      } else if (!only || only.has(frame)) await renderRegion(y0, h, `varrida-${String(frame).padStart(4, "0")}.png`);
      frame++;
    }
  }
  await window.saveText("varrida.json", JSON.stringify({ t0, fps, y0, h, T, ...events }));
  return { frames: nFrames, hits: events.hits.length, near, far };
}

// ================================================================================================ the splat
async function splat(args) {
  await loadOctane(1.0); hideBroom(true);
  const a = makeAnt(0xff7a1a);
  a.position.set(0, 0, 0);
  a.rotation.set(0, Math.PI / 2 + 0.25, 0);
  a.userData.inner.scale.set(1.5, 0.16, 1.5);
  catcher.visible = false;
  aimSun(V(0, 0, 0));
  // seen from above, as a squashed bug on glass
  const c = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  c.position.set(0, 4.2, 1.2); c.lookAt(0, 0, 0);
  renderer.setSize(512, 512, false);
  renderer.render(scene, c);
  await window.savePng("splat.png", renderer.domElement.toDataURL("image/png"));
  return { ok: 1 };
}

// ================================================================================================ the orbit (dizzy)
async function orbita(args) {
  await loadOctane(0.75); hideBroom(true);
  catcher.visible = false;
  const n = args.n ?? 4, fps = 60, dur = args.dur ?? 2.0, rev = args.rev ?? 1.25, flips = args.flips ?? 2.2;
  const ants = [];
  for (let i = 0; i < n; i++) ants.push(makeAnt([0xff7a1a, 0xff9a30, 0xf36a12, 0xff8c1f][i % 4]));
  aimSun(V(0, 0, 0));
  const c = new THREE.PerspectiveCamera(28, 1080 / 600, 0.1, 50);
  c.position.set(0, 2.1, 5.8); c.lookAt(0, 0, 0);
  renderer.setSize(1080, 600, false);
  const frames = Math.round(dur * fps);
  for (let f = 0; f < frames; f++) {
    const t = f / fps;
    for (const layer of ["tras", "frente"]) {
      ants.forEach((g, i) => {
        const a = 2 * Math.PI * (rev * t + i / n);
        const x = Math.cos(a) * 1.45, z = Math.sin(a) * 1.45;
        g.position.set(x, Math.sin(a * 2 + i) * 0.06, z);
        g.rotation.set(0, -a - Math.PI / 2, 0, "YXZ");
        g.userData.spin.rotation.set(0, 0, -(2 * Math.PI * flips * t + i * 1.3));  // front flips as they go round
        g.visible = layer === "tras" ? z < 0 : z >= 0;
      });
      renderer.render(scene, c);
      await window.savePng(`orbita-${layer}-${String(f).padStart(4, "0")}.png`, renderer.domElement.toDataURL("image/png"));
    }
  }
  return { frames };
}

// ================================================================================================ the stage
// The sweep's own floor (Luan, round 3: "colocar um fundo pra animação da varrida"): the channel's Klein with the
// live backgrounds' diagonal lattice, lit in a pool where the ants are, fading into the night blue at the horizon.
// Rendered once with the sweep's camera, so the ants and the broom stand on it.
async function palco(args) {
  hideBroom(true);
  catcher.visible = false;
  const near = groundAt(540, 1640).z, far = groundAt(540, 1478).z, mid = (near + far) / 2;
  const N = 4096, SIZE = 64;  // texture pixels over metres of floor
  const c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d");
  const toPx = (x, z) => [N / 2 + x / SIZE * N, N / 2 + (z - mid) / SIZE * N];
  const [px, pz] = toPx(0, mid + 0.4);
  const grad = g.createRadialGradient(px, pz, 0, px, pz, N * 0.11);
  grad.addColorStop(0, "rgb(18,76,212)"); grad.addColorStop(0.4, "rgb(0,47,167)"); grad.addColorStop(1, "rgb(0,30,104)");
  g.fillStyle = grad; g.fillRect(0, 0, N, N);
  const step = N / SIZE * 0.55;  // a line every 0.55 m, both diagonals
  g.strokeStyle = "rgba(255,255,255,0.13)"; g.lineWidth = 2.2;
  for (let k = -2 * N; k < 2 * N; k += step) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + N, N); g.stroke();
    g.beginPath(); g.moveTo(k, N); g.lineTo(k + N, 0); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, mid);
  scene.add(floor);
  scene.fog = new THREE.Fog(new THREE.Color("rgb(0,36,128)"), 8, 26);
  await renderRegion(840, 1080, "palco.png", 540);
  return { ok: 1 };
}

window.main = async (args) => {
  if (args.modo === "palco") return palco(args);
  if (args.modo === "splat") return splat(args);
  if (args.modo === "orbita") return orbita(args);
  return varrida(args);
};
</script></body></html>
"""

DRIVER = r"""// node driver.mjs page.html outdir [json-args]: serves three and the models at http://local/ (THREE_DIR, MODELS_DIR),
// runs window.main(args) in headless Chromium (playwright-core from PW_DIR), and saves what the page hands back.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire(process.env.PW_DIR + "/");
const { chromium } = require("playwright-core");
const [, , pageFile, outDir, argJson] = process.argv;
const MAP = { "/three/": process.env.THREE_DIR + "/", "/models/": process.env.MODELS_DIR + "/" };
const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html", ".glb": "model/gltf-binary", ".png": "image/png", ".wasm": "application/wasm" };
process.env.LD_LIBRARY_PATH = `${process.env.HOME}/.local/lib/chromium-deps/root/usr/lib/x86_64-linux-gnu:${process.env.LD_LIBRARY_PATH || ""}`;
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 700 } });
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", String(e)));
await page.route("http://local/**", async (route) => {
  const u = new URL(route.request().url());
  let file = null;
  if (u.pathname === "/page.html") file = path.resolve(pageFile);
  for (const [k, v] of Object.entries(MAP)) if (u.pathname.startsWith(k)) file = v + u.pathname.slice(k.length);
  if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "nope " + u.pathname });
  route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] || "application/octet-stream" });
});
await page.exposeFunction("savePng", (name, dataUrl) => {
  fs.writeFileSync(path.join(outDir, name), Buffer.from(dataUrl.split(",")[1], "base64"));
});
await page.exposeFunction("saveText", (name, text) => fs.writeFileSync(path.join(outDir, name), text));
await page.goto("http://local/page.html");
await page.waitForFunction("window.main !== undefined", null, { timeout: 120000 });
const t0 = Date.now();
const res = await page.evaluate(async (a) => await window.main(a), JSON.parse(argJson || "{}"));
console.log("done", JSON.stringify(res).slice(0, 2000), ((Date.now() - t0) / 1000).toFixed(1) + "s");
await browser.close();
"""


# ---------------------------------------------------------------------------------------------------- the 3D


def render3d(ctx):
    key = hashlib.sha1((CENA + DRIVER).encode()).hexdigest()[:8]
    out = ctx.VIDEOS / "Shorts" / "Partes" / SLUG / f"3d-{key}"
    if (out / "pronto.txt").exists():
        return out
    src = ctx.work / f"3d-{key}"
    src.mkdir(parents=True, exist_ok=True)
    (src / "cena.html").write_text(CENA, encoding="utf-8")
    (src / "driver.mjs").write_text(DRIVER, encoding="utf-8")
    pw = next(p for p in (ctx.ROOT / "node_modules", Path.home() / "repos" / "muanlartins" / "node_modules")
              if (p / "playwright-core").exists())
    env = dict(os.environ, PW_DIR=str(pw), THREE_DIR=str(ctx.ROOT / "node_modules" / "three"),
               MODELS_DIR=str(ctx.ROOT / "public" / "models"))
    for args in ({"modo": "palco"}, {"modo": "splat"}, {"modo": "orbita"}, {"modo": "varrida", "capa": 4271.0},
                 {"modo": "varrida"}):
        print(f"  3D: {args['modo']}{' (capa)' if 'capa' in args else ''}…", flush=True)
        subprocess.run(["node", str(src / "driver.mjs"), str(src / "cena.html"), str(out), json.dumps(args)],
                       env=env, cwd=src, check=True, stdout=subprocess.DEVNULL)
    (out / "pronto.txt").write_text(key)
    return out


def rgba(path):
    im = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    return cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA)


def cropped(im):
    """The sprite cut to where it isn't transparent, and that box's corner."""
    ys, xs = np.nonzero(im[..., 3] > 2)
    if not len(xs):
        return None, 0, 0
    return im[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(), xs.min(), ys.min()


def blend(f, im, x, y, alpha=1.0, mask=None):
    """An RGBA sprite over the RGB frame with its top left at (x, y), clipped; `mask` (0-1, the frame's size) hides it."""
    h, w = im.shape[:2]
    x, y = int(round(x)), int(round(y))
    x0, y0, x1, y1 = max(0, x), max(0, y), min(f.shape[1], x + w), min(f.shape[0], y + h)
    if x1 <= x0 or y1 <= y0 or alpha <= 0.004:
        return
    sub = im[y0 - y:y1 - y, x0 - x:x1 - x]
    a = sub[..., 3:4].astype(np.float32) * (alpha / 255)
    if mask is not None:
        a = a * (1 - mask[y0:y1, x0:x1, None])
    reg = f[y0:y1, x0:x1].astype(np.float32)
    f[y0:y1, x0:x1] = (reg + (sub[..., :3].astype(np.float32) - reg) * a + 0.5).astype(np.uint8)


def scaled(im, s, angle=0.0, sx=1.0, sy=1.0):
    """A sprite scaled (and squashed, and turned about its centre), on a canvas big enough to hold it."""
    h, w = im.shape[:2]
    d = int(math.hypot(w * s * sx, h * s * sy)) + 4
    a = math.radians(angle)
    rot = np.array([[math.cos(a), math.sin(a)], [-math.sin(a), math.cos(a)]])
    lin = rot @ np.diag([s * sx, s * sy])
    off = np.array([d / 2, d / 2]) - lin @ np.array([w / 2, h / 2])
    m = np.hstack([lin, off[:, None]]).astype(np.float32)
    return cv2.warpAffine(im, m, (d, d), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))


# ---------------------------------------------------------------------------------------------------- sprites


def splat_sprite(car, seed):
    """The flattened Octane on a splash of orange goo with droplets, gooey edges and a glint."""
    rng = np.random.default_rng(seed)
    car, _, _ = cropped(car)
    k = 250 / max(car.shape[:2])
    car = cv2.resize(car, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    n = 420
    blob = np.zeros((n, n), np.float32)
    c = n // 2
    cv2.ellipse(blob, (c, c), (112, 86), rng.uniform(0, 180), 0, 360, 1.0, -1)
    for _ in range(13):
        a, r = rng.uniform(0, 2 * math.pi), rng.uniform(100, 170)
        p = (int(c + math.cos(a) * r), int(c + math.sin(a) * r * 0.85))
        cv2.line(blob, (c, c), p, 1.0, int(rng.uniform(8, 20)))
        cv2.circle(blob, p, int(rng.uniform(9, 24)), 1.0, -1)
    for _ in range(9):
        a, r = rng.uniform(0, 2 * math.pi), rng.uniform(150, 195)
        cv2.circle(blob, (int(c + math.cos(a) * r), int(c + math.sin(a) * r * 0.85)), int(rng.uniform(4, 9)), 1.0, -1)
    blob = (cv2.GaussianBlur(blob, (0, 0), 7) > 0.45).astype(np.float32)
    blob = cv2.GaussianBlur(blob, (0, 0), 1.2)
    rim = blob - cv2.GaussianBlur(cv2.erode(blob, np.ones((9, 9), np.uint8)), (0, 0), 3)
    color = np.zeros((n, n, 3), np.float32)
    color[:] = (214, 88, 18)  # deeper than the car's orange, so the car reads on it
    color = color * (1 - np.clip(rim, 0, 1)[..., None] * 0.6)
    out = np.dstack([np.clip(color, 0, 255), blob * 235]).astype(np.uint8)
    # a few white glints on the goo, like it's wet
    for _ in range(6):
        a, r = rng.uniform(0, 2 * math.pi), rng.uniform(40, 150)
        p = (int(c + math.cos(a) * r), int(c + math.sin(a) * r * 0.85))
        if blob[p[1], p[0]] > 0.9:
            cv2.ellipse(out, p, (7, 4), -35, 0, 360, (255, 245, 225, 230), -1)
    # a dark edge around the flattened car
    edge = cv2.dilate(car[..., 3], np.ones((7, 7), np.uint8))
    rim_car = np.dstack([np.full(edge.shape + (3,), (70, 26, 6), np.uint8), edge])
    blend_rgba(out, rim_car, c - car.shape[1] // 2, c - car.shape[0] // 2)
    blend_rgba(out, car, c - car.shape[1] // 2, c - car.shape[0] // 2)
    return out


def blend_rgba(dst, src, x, y):
    h, w = src.shape[:2]
    a = src[..., 3:4].astype(np.float32) / 255
    reg = dst[y:y + h, x:x + w].astype(np.float32)
    rgb = reg[..., :3] * (1 - a) + src[..., :3] * a
    al = reg[..., 3:4] + (255 - reg[..., 3:4]) * a
    dst[y:y + h, x:x + w] = np.dstack([rgb, al]).astype(np.uint8)


def star_sprite(size=200):
    """A four-pointed glint, white with a warm glow."""
    s = size
    im = np.zeros((s, s, 4), np.float32)
    c = s / 2
    pts = []
    for i in range(8):
        a = i * math.pi / 4 - math.pi / 2
        r = c * (0.95 if i % 2 == 0 else 0.16)
        pts.append((c + math.cos(a) * r, c + math.sin(a) * r))
    shape = np.zeros((s, s), np.float32)
    cv2.fillPoly(shape, [np.array(pts, np.int32)], 1.0)
    shape = cv2.GaussianBlur(shape, (0, 0), 1.0)
    glow = cv2.GaussianBlur(shape, (0, 0), s / 14) * 1.6
    yy, xx = np.mgrid[0:s, 0:s]
    core = np.exp(-((xx - c) ** 2 + (yy - c) ** 2) / (2 * (s / 10) ** 2))
    a = np.clip(np.maximum.reduce([shape, glow * 0.7, core * 0.9]), 0, 1)
    im[..., 0] = 255
    im[..., 1] = 250 - 20 * (1 - shape)
    im[..., 2] = 225 + 30 * shape
    im[..., 3] = a * 255
    return im.astype(np.uint8)


# ---------------------------------------------------------------------------------------------------- setup


S = {}


def setup(ctx):
    d = render3d(ctx)
    S["dir"] = d
    S["meta"] = json.loads((d / "varrida.json").read_text())
    S["frames"] = {}
    car = rgba(d / "splat.png")
    S["splats"] = [splat_sprite(car, 3), cv2.flip(splat_sprite(car, 8), 1)]
    S["car"] = cropped(car)[0]
    S["star"] = star_sprite()
    S["orbit"] = {}
    cover_sticker(d)
    S["stage"] = make_stage(d, ctx)
    yy, xx = np.mgrid[0:ctx.H - ctx.CAM_H, 0:ctx.W]
    S["diag"] = xx + yy
    S["beats"] = beats()
    S["vig_cam"] = vignette(ctx.W, ctx.CAM_H, 540, 420)
    S["vig_game"] = vignette(ctx.W, ctx.H - ctx.CAM_H, AIM[0], AIM[1] - ctx.CAM_H)
    S["plate"] = ctx.title_sprite(["110", "KM/H"], 220)
    S["ctx"] = ctx


def make_stage(d, ctx):
    """The sweep's stage, the game's half: the 3D floor (Klein with the lattice, lit where the ants are, fading into
    the fog), under a backdrop from the night blue to the horizon's glow with the live backgrounds' lattice, and a
    faint beam of light from above."""
    floor = rgba(d / "palco.png")
    h, w = floor.shape[:2]
    opaque = np.nonzero(floor[..., 3].max(1) > 200)[0]
    edge = int(opaque.min()) if len(opaque) else h // 3
    top, hor = np.array(ctx.cores["noite"], np.float32), np.array(HORIZON_GLOW, np.float32)
    k = (np.clip(np.arange(h) / max(1, edge), 0, 1) ** 1.8)[:, None, None]
    out = np.broadcast_to(top * (1 - k) + hor * k, (h, w, 3)).copy()
    yy, xx = np.mgrid[0:h, 0:w]
    lattice = (((yy + xx) % 44 < 2) | ((yy - xx) % 44 < 2)) & (yy < edge)
    out[lattice] = out[lattice] * 0.9 + 255 * 0.07
    a = floor[..., 3:4].astype(np.float32) / 255
    out = out * (1 - a) + floor[..., :3] * a
    beam = np.zeros((h, w), np.float32)
    cv2.fillPoly(beam, [np.array([(455, 0), (625, 0), (1000, 760), (60, 760)], np.int32)], 1.0)
    beam = cv2.GaussianBlur(beam * np.clip(1 - yy / 900, 0, 1) ** 0.7, (0, 0), 30)
    out += beam[..., None] * np.array(ctx.cores["klein_claro"], np.float32) * 0.13
    return np.clip(out, 0, 255).astype(np.uint8)


def vignette(w, h, cx, cy):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    return np.clip(np.hypot((x - cx) / w, (y - cy) / h * 0.85) * 1.7 - 0.25, 0, 1) ** 1.4


def cover_sticker(d):
    """The cover's sticker (roteiro: capa.figurinha): the sweep's still with a white sticker edge, as his cutout has."""
    im, _, _ = cropped(rgba(d / "capa-vassoura.png"))
    pad = 24
    im = cv2.copyMakeBorder(im, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0))
    a = im[..., 3]
    edge = cv2.GaussianBlur(cv2.dilate((a > 40).astype(np.uint8) * 255, np.ones((13, 13), np.uint8)), (0, 0), 1.5)
    out = np.zeros_like(im)
    out[..., :3] = 255
    out[..., 3] = edge
    blend_rgba(out, im, 0, 0)
    cv2.imwrite(str(d.parent / "capa-vassoura.png"), cv2.cvtColor(out, cv2.COLOR_RGBA2BGRA))


def where(o, ctx):
    """(stretch, live second) of short second o."""
    c = ctx.clock
    k = max(i for i, s in enumerate(c.starts[:-1]) if s <= o + 1e-9)
    return k, c.spans[k][0] + o - c.starts[k]


def sweep_frame(t):
    m = S["meta"]
    i = int(round((t - m["t0"]) * m["fps"]))
    if not 0 <= i < len(m["frames"]):
        return None, None
    if i not in S["frames"]:
        if len(S["frames"]) > 6:
            S["frames"].pop(next(iter(S["frames"])))
        im, x, y = cropped(rgba(S["dir"] / f"varrida-{i:04d}.png"))
        S["frames"][i] = (im, x, y + m["y0"])
    return S["frames"][i], m["frames"][i]


def ramp(t, a, b):
    return min(1.0, max(0.0, (t - a) / (b - a)))


def antes(f, o, ctx):
    k, t = where(o, ctx)
    W, CAM_H = ctx.W, ctx.CAM_H
    span = ctx.clock.spans[k]
    if span[0] <= TT < span[1]:
        goal_build(f, t, ctx)
    if span[0] <= SLAM < span[1] and t >= STAGE[0]:
        stage_on(f, t, ctx)
    # --- his camera leaning with the strokes, then the broom, the ants and the dust over everything
    spr, info = sweep_frame(t)
    if info and info["tip"] is not None:
        (tx, ty), (hx, hy) = info["tip"], info["hands"]
        fade = ramp(t, 4269.42, 4269.62) * (1 - ramp(t, 4271.55, 4271.85))
        lean = -math.degrees(math.atan2(tx - hx, ty - hy)) * 0.11 * fade
        m = cv2.getRotationMatrix2D((W / 2, CAM_H), lean, 1 + 0.05 * fade)
        m[0, 2] += (hx - W / 2) * 0.22 * fade
        f[:CAM_H] = cv2.warpAffine(f[:CAM_H], m, (W, CAM_H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
    if spr and spr[0] is not None:
        im, x, y = spr
        blend(f, im, x, y)
    # --- the two demolitions: squashed ants splatting on the screen
    for n, (td, (sx, sy), (ex, ey), turn) in enumerate(DEMOS):
        span = ctx.clock.spans[k]
        if not (span[0] <= td < span[1]) or t < td + FLY[0]:
            continue
        land = td + FLY[1]
        if t < land:
            u = (t - td - FLY[0]) / (FLY[1] - FLY[0])
            e = 1 - (1 - u) ** 2
            s = 0.35 + 0.8 * u ** 1.3
            sp = scaled(S["car"], s * 210 / max(S["car"].shape[:2]), turn + 540 * (1 - u))
            cx, cy = sx + (ex - sx) * e, sy + (ey - sy) * e - 120 * math.sin(math.pi * u)
            blend(f, sp, cx - sp.shape[1] / 2, cy - sp.shape[0] / 2)
        else:
            x = (t - land) / 0.07
            squash = math.exp(-x) * math.cos(x * 2.2)
            grow = min(1.0, 0.55 + (t - land) / 0.08) if t - land < 0.08 else 1 + 0.06 * math.exp(-(t - land - 0.08) / 0.1)
            sp = scaled(S["splats"][n], 0.62 * grow, turn, 1 + 0.3 * squash, 1 - 0.22 * squash)
            slide = 14 * (t - land)
            blend(f, sp, ex - sp.shape[1] / 2, ey + slide - sp.shape[0] / 2, alpha=0.97)
    # --- "que sujeira, hein?": glints on the clean field
    for ts, x, y, size, _ in SPARKLES:
        u = (t - ts) / 0.34
        span = ctx.clock.spans[k]
        if 0 <= u < 1 and span[0] <= ts < span[1]:
            s = math.sin(math.pi * u) ** 0.8 * size / S["star"].shape[0] * 2.3
            sp = scaled(S["star"], max(s, 0.02), 50 * u)
            blend(f, sp, x - sp.shape[1] / 2, y - sp.shape[0] / 2)
    # --- "Flip! Flip!": arcs around the Octane on his head as it turns over
    for a, b in FLIPS:
        if a - 0.03 <= t < b + 0.12:
            flip_arcs(f, (t - a + 0.03) / (b - a + 0.15))
    # --- "toma flip do Octane na cabeça": the ants circling his head, the back half behind it
    if t >= ORBIT[0] and ctx.clock.spans[k][0] <= ORBIT[1] < ctx.clock.spans[k][1]:
        orbit(f, t, ctx)
    return f


def flip_arcs(f, u):
    cx, cy, rx, ry = FLIP_HEAD
    layer = np.zeros((ARC_H, f.shape[1]), np.float32)
    start = -70 + 200 * u
    for side in (1, -1):
        for j, (w, a) in enumerate(((22, 1.0), (12, 0.6))):
            r = 1 + 0.12 * j
            angle0 = start if side == 1 else 180 - start - 60
            cv2.ellipse(layer, (cx, cy), (int(rx * r), int(ry * r)), 0, angle0, angle0 + 60, a, w, cv2.LINE_AA)
    glow = cv2.GaussianBlur(layer, (0, 0), 9)
    alpha = np.clip(layer + glow * 0.8, 0, 1) * math.sin(math.pi * min(1, max(0, u))) * 0.85
    reg = f[:ARC_H].astype(np.float32)
    f[:ARC_H] = (reg + (255 - reg) * alpha[..., None]).astype(np.uint8)


def orbit(f, t, ctx):
    x = t - ORBIT[0]
    i = int(x * 60) % 120
    layers = S["orbit"]
    if i not in layers:
        if len(layers) > 8:
            layers.pop(next(iter(layers)))
        layers[i] = (rgba(S["dir"] / f"orbita-tras-{i:04d}.png"), rgba(S["dir"] / f"orbita-frente-{i:04d}.png"))
    back, front = layers[i]
    pop = 1.0 if x > 0.18 else max(0.02, 1 + 2.2 * (x / 0.18 - 1) ** 3 + 3.2 * (x / 0.18 - 1) ** 2)
    bonk = t - ORBIT[1]
    pop *= 1 + (0.18 * math.exp(-bonk / 0.1) if bonk >= 0 else 0)
    cx, cy = ctx.W / 2, RING_Y
    if abs(pop - 1) > 0.01:
        back, front = scaled(back, pop), scaled(front, pop)
    # what isn't the Klein background up there (the filter, his body) hides the back half
    top = f[:ctx.CAM_H].astype(np.int16)
    r, g, b = top[..., 0], top[..., 1], top[..., 2]
    klein = (b > 90) & (b > r + 50) & (b > g + 25)
    mask = np.zeros(f.shape[:2], np.float32)
    mask[:ctx.CAM_H] = cv2.GaussianBlur((~klein).astype(np.float32), (0, 0), 2)
    blend(f, back, cx - back.shape[1] / 2, cy - back.shape[0] / 2, mask=mask)
    blend(f, front, cx - front.shape[1] / 2, cy - front.shape[0] / 2)


def stage_on(f, t, ctx):
    """The stage replaces the game's half behind a 45° wipe (the brand plate's cut) with a Klein claro edge."""
    g = f[ctx.CAM_H:]
    u = ramp(t, *STAGE)
    if u >= 1:
        g[:] = S["stage"]
        return
    u = u * u * (3 - 2 * u)
    s = u * 2300 - 70
    diag = S["diag"]
    m = diag < s
    g[m] = S["stage"][m]
    g[(diag >= s) & (diag < s + 30)] = ctx.cores["klein_claro"]
    g[(diag >= s + 30) & (diag < s + 38)] = ctx.cores["branco"]


def beats():
    """(lub, interval): the heart from the build's start to just before his touch, ~83 → ~180 bpm."""
    out, t = [], B0 + 0.04
    while t < TT - 0.16:
        p = (t - B0) / (TT - B0)
        i = 0.72 - 0.39 * p ** 0.85
        out.append((t, i))
        t += i
    return out


def dub_gap(i):
    return 0.24 * (i / 0.72) ** 0.6


def hb_env(t):
    v = 0.0
    for b, i in S["beats"]:
        for at, w in ((b, 1.0), (b + dub_gap(i), 0.7)):
            if at <= t:
                v = max(v, w * math.exp(-(t - at) / 0.08))
    return v


def zoomed(img, z, cx, cy):
    if abs(z - 1) < 1e-3:
        return img
    m = np.float32([[z, 0, (1 - z) * cx], [0, z, (1 - z) * cy]])
    return cv2.warpAffine(img, m, (img.shape[1], img.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)


def gray_of(x):
    return x @ np.array([0.299, 0.587, 0.114], np.float32)


def focus_lines(g, alpha, seed, cx, cy, color=(255, 255, 255)):
    """Manga focus lines closing on (cx, cy) of the game's half."""
    rng = np.random.default_rng(seed)
    layer = np.zeros(g.shape[:2], np.float32)
    for _ in range(56):
        a, r0, w = rng.uniform(0, 2 * math.pi), rng.uniform(300, 520), rng.uniform(4, 15)
        c, s_ = math.cos(a), math.sin(a)
        pts = np.array([(cx + c * r0, cy + s_ * r0), (cx + c * 1300 - s_ * w, cy + s_ * 1300 + c * w),
                        (cx + c * 1300 + s_ * w, cy + s_ * 1300 - c * w)], np.int32)
        cv2.fillPoly(layer, [pts], 1.0, lineType=cv2.LINE_AA)
    a = (layer * alpha)[..., None]
    g[:] = (g.astype(np.float32) * (1 - a) + np.array(color, np.float32) * a).astype(np.uint8)


def goal_build(f, t, ctx):
    """The build to the big hit, like a film's before the punch: the colour drains, the frame closes in and pushes
    on the ball, the heart speeds up, focus lines close in; on his touch the frame stops (an inverted frame, a white
    one, then the frozen hit in colour, shaking), then real time with the colour back hot and a shock ring."""
    H2 = ctx.CAM_H
    if t < B0 or t > GOAL + 1.6:
        return
    if t < TT:
        p = ramp(t, B0, TT)
        hb = hb_env(t)
        f[H2:] = zoomed(f[H2:], 1 + 0.32 * p ** 1.7 + 0.018 * hb, AIM[0], AIM[1] - H2)
        f[:H2] = zoomed(f[:H2], 1 + 0.12 * p ** 1.5 + 0.01 * hb, 540, 420)
        S["last_raw"] = f.copy()
        x = f.astype(np.float32)
        d = 0.8 * p ** 0.8
        x = x * (1 - d) + gray_of(x)[..., None] * d
        x = (x - 128) * (1 + 0.2 * p) + 128 - 10 * p
        v = 0.25 + 0.5 * p + 0.3 * hb * p
        for y0, y1, vig in ((0, H2, S["vig_cam"]), (H2, ctx.H, S["vig_game"])):
            part = x[y0:y1]
            part *= (1 - np.clip(v * vig, 0, 0.9))[..., None]
            part[..., 2] += 22 * p * vig
        f[:] = np.clip(x, 0, 255).astype(np.uint8)
        if p > 0.5:
            focus_lines(f[H2:], 0.55 * ((p - 0.5) / 0.5) ** 1.3, int(t * 30), AIM[0], AIM[1] - H2)
    elif t < TT + FREEZE:
        if "freeze" not in S:  # the frame of the touch, pushed in as far as the build went, in colour
            S["freeze"] = S.get("last_raw", f).copy()
        base = S["freeze"].astype(np.float32)
        e = t - TT
        if e < 2 / 60:  # the manga impact frame: inverted, hard black and white, black focus lines
            g = np.clip((255 - gray_of(base) - 128) * 2.4 + 128, 0, 255)
            f[:] = np.repeat(g[..., None], 3, axis=2).astype(np.uint8)
            focus_lines(f[H2:], 0.9, 7, AIM[0], AIM[1] - H2, (0, 0, 0))
        elif e < 4 / 60:
            f[:] = (base * 0.25 + 255 * 0.75).astype(np.uint8)
        else:
            g = gray_of(base)[..., None]
            x = np.clip(g + (base - g) * 1.5 + 10, 0, 255).astype(np.uint8)
            dx, dy = 16 * math.sin(e * 140), 12 * math.cos(e * 110)
            m = np.float32([[1.05, 0, -0.05 * AIM[0] + dx], [0, 1.05, -0.05 * AIM[1] + dy]])
            f[:] = cv2.warpAffine(x, m, (ctx.W, ctx.H), borderMode=cv2.BORDER_REFLECT101)
    else:
        e = max(0.0, t - TT - FREEZE)
        if e < 0.32:
            f[H2:] = zoomed(f[H2:], 1 + 0.32 * (1 - ramp(e, 0, 0.32)) ** 2, AIM[0], AIM[1] - H2)
        if e < 0.9:
            x = f.astype(np.float32)
            g = gray_of(x)[..., None]
            x = g + (x - g) * (1 + 0.55 * math.exp(-e / 0.3)) + 14 * math.exp(-e / 0.15)
            if e < 0.55:  # the shock ring from the ball
                ring = np.zeros((ctx.H - H2, ctx.W), np.float32)
                r = int(40 + 1400 * (e / 0.55) ** 0.6)
                cv2.circle(ring, (TOUCH[0], TOUCH[1] - H2), r, 1.0, max(3, int(28 * (1 - e / 0.55))), cv2.LINE_AA)
                ring = cv2.GaussianBlur(ring, (0, 0), 3)[..., None] * (1 - e / 0.55) ** 1.4
                x[H2:] = x[H2:] * (1 - ring) + np.array(ctx.cores["klein_claro"], np.float32) * ring * 0.6 + 255 * ring * 0.4
            f[:] = np.clip(x, 0, 255).astype(np.uint8)
            a = 20 * math.exp(-e / 0.13)
            if a > 0.5:
                m = np.float32([[1.03, 0, -0.015 * ctx.W + a * math.sin(e * 130)], [0, 1.03, -0.015 * ctx.H + a * math.cos(e * 105)]])
                f[:] = cv2.warpAffine(f, m, (ctx.W, ctx.H), borderMode=cv2.BORDER_REFLECT101)
    speed_gauge(f, t, ctx)
    speed_plate(f, t, ctx)


def gauge_value(t):
    if t < TT:
        return 92 * ramp(t, B0 + 0.1, TT - 0.03) ** 1.7
    e = t - TT
    return 110 + 10 * math.exp(-e / 0.07) * math.cos(e * 55) + 1.2 * math.sin(e * 97)


def speed_gauge(f, t, ctx):
    """A speedometer in the channel's look charging with the build, its needle slamming to 110 on his touch; it
    bursts as the plate lands on the goal."""
    if t < B0 + 0.08 or t > GOAL + 0.12:
        return
    from PIL import Image, ImageDraw
    c = ctx.cores
    v = gauge_value(t)
    W_, H_ = 470, 340
    img = Image.new("RGBA", (W_, H_))
    d = ImageDraw.Draw(img)
    ctx.plate(d, 15, 15, W_ - 30, H_ - 30, c["noite"] + (230,))
    cx, cy, r = W_ // 2, 200, 150
    box = (cx - r, cy - r, cx + r, cy + r)
    ang = lambda val: 180 + 180 * min(max(val, 0), 120) / 120
    d.arc(box, 180, 360, fill=c["klein_escuro"] + (255,), width=26)
    hot = v > 100
    d.arc(box, 180, ang(min(v, 100)), fill=c["klein_claro"] + (255,), width=26)
    if hot:
        d.arc(box, ang(100), ang(v), fill=c["branco"] + (255,), width=30)
    for tick in range(0, 121, 10):
        a = math.radians(ang(tick))
        r0 = r - 34 if tick % 60 else r - 46
        d.line([(cx + math.cos(a) * r0, cy + math.sin(a) * r0), (cx + math.cos(a) * (r - 18), cy + math.sin(a) * (r - 18))],
               fill=c["branco"] + (200,), width=4 if tick % 60 else 6)
    a = math.radians(ang(v))
    tip = (cx + math.cos(a) * (r - 8), cy + math.sin(a) * (r - 8))
    side = (math.cos(a + math.pi / 2) * 8, math.sin(a + math.pi / 2) * 8)
    d.polygon([tip, (cx + side[0], cy + side[1]), (cx - side[0], cy - side[1])], fill=c["branco"] + (255,))
    d.ellipse((cx - 16, cy - 16, cx + 16, cy + 16), fill=c["branco"] + (255,))
    d.ellipse((cx - 7, cy - 7, cx + 7, cy + 7), fill=c["klein"] + (255,))
    num = "110" if t >= TT else f"{int(round(max(0, v))):03d}"  # the needle overshoots, the number locks
    fn, fu = ctx.grotesk(86), ctx.grotesk(34)
    nw = d.textlength(num, font=fn)
    uw = d.textlength("KM/H", font=fu)
    x0 = cx - (nw + 14 + uw) / 2
    d.text((x0, cy + 14), num, font=fn, fill=c["branco"] + (255,))
    d.text((x0 + nw + 14, cy + 58), "KM/H", font=fu, fill=c["klein_claro"] + (255,))
    sprite = np.array(img)
    pop = ramp(t, B0 + 0.08, B0 + 0.24)
    s = 0.6 + 0.4 * (1 - (1 - pop) ** 3) + (0.06 * math.exp(-(t - TT) / 0.1) if t >= TT else 0)
    alpha = pop
    if t > GOAL:
        u = ramp(t, GOAL, GOAL + 0.12)
        s, alpha = s * (1 + 0.5 * u), 1 - u
    ctx.place(f, sprite, GAUGE_AT[0], GAUGE_AT[1], s, alpha)


def speed_plate(f, t, ctx):
    """"110 KM/H" stamped on the goal in the thumbnails' style, with a white burst behind it."""
    e = t - GOAL
    if e < 0 or t > 4361.98:
        return
    if e < 0.09:
        s, alpha = 2.6 - 1.6 * (e / 0.09) ** 2, min(1.0, e / 0.03)
    elif e < 0.25:
        s, alpha = 1 - 0.07 * math.sin(math.pi * (e - 0.09) / 0.16), 1.0
    else:
        s, alpha = 1 + 0.015 * math.sin(2 * math.pi * 2.2 * (e - 0.25)), 1.0
    out = ramp(t, 4361.84, 4361.98)
    s, alpha = s * (1 + 0.2 * out), alpha * (1 - out)
    if e >= 0.09:  # the burst where it lands
        b = max(0.0, e - 0.09)
        if b < 0.45:
            glow = np.zeros((ctx.H - ctx.CAM_H, ctx.W), np.float32)
            cv2.circle(glow, (PLATE_AT[0], PLATE_AT[1] - ctx.CAM_H), int(120 + 900 * (b / 0.45) ** 0.5), 1.0,
                       max(2, int(30 * (1 - b / 0.45))), cv2.LINE_AA)
            glow = cv2.GaussianBlur(glow, (0, 0), 4)[..., None] * (1 - b / 0.45) ** 1.5
            g = f[ctx.CAM_H:].astype(np.float32)
            f[ctx.CAM_H:] = np.clip(g + (255 - g) * glow, 0, 255).astype(np.uint8)
    sp = scaled(S["plate"], s, -3.0)
    blend(f, sp, PLATE_AT[0] - sp.shape[1] / 2, PLATE_AT[1] - sp.shape[0] / 2, alpha=alpha)


# ---------------------------------------------------------------------------------------------------- the sound

RNG = np.random.default_rng(2026)


def tt(d):
    return np.arange(int(d * SR)) / SR


def norm(x):
    return (x / (np.abs(x).max() + 1e-9)).astype(np.float32)


def band(x, lo, hi):
    """A band-pass done in the spectrum, with soft edges."""
    spec = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    g = 1 / (1 + (lo / np.maximum(fr, 1)) ** 4) / (1 + (fr / hi) ** 4)
    return np.fft.irfft(spec * g, len(x)).astype(np.float32)


def squeak(pitch):
    """An ant's "eek!": a tiny voice rising and falling, with a flutter."""
    d = 0.1 + 0.04 * RNG.random()
    t = tt(d)
    f = 2300 * pitch * (1 + 0.5 * np.sin(np.pi * np.minimum(t / d, 1)) ** 1.5) * (1 + 0.06 * np.sin(2 * np.pi * 42 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
    return norm(x * np.minimum(1, t / 0.005) * np.exp(-((t - d * 0.35) / (d * 0.45)) ** 2))


def thwack():
    """The broom slapping the floor: a low thump, the straw crashing, grains."""
    t = tt(0.5)
    n = RNG.standard_normal(len(t))
    thump = np.sin(2 * np.pi * np.cumsum(100 * np.exp(-t * 10) + 42) / SR) * np.exp(-t * 13)
    crunch = band(n, 600, 3800) * np.exp(-t * 32)
    straw = band(RNG.standard_normal(len(t)), 2800, 9500) * np.exp(-t * 8) * 0.55
    grains = band((RNG.random(len(t)) < 0.006) * RNG.standard_normal(len(t)) * 5, 1500, 8000) * np.exp(-t * 6)
    return norm(np.tanh(1.5 * (thump * 1.3 + crunch / (np.abs(crunch).max() + 1e-9) + straw / (np.abs(straw).max() + 1e-9) * 0.5 + grains * 0.4)))


def splat_sound():
    """A wet squelch: a resonance falling through noise, a slap, a thud, drops."""
    t = tt(0.42)
    n = RNG.standard_normal(len(t)).astype(np.float32)
    wet = svf_bandpass(n, 1600 * np.exp(-t * 8) + 260, 3.5) * np.exp(-t * 7)
    slap = band(n, 900, 5000) * np.exp(-t * 70)
    thud = np.sin(2 * np.pi * np.cumsum(150 * np.exp(-t * 12) + 55) / SR) * np.exp(-t * 18)
    drops = sum(np.sin(2 * np.pi * (1700 + 500 * j) * (t - d)) * np.exp(-np.maximum(t - d, 0) * 70) * (t > d)
                for j, d in enumerate((0.09, 0.15, 0.22)))
    return norm(norm(wet) * 1.0 + norm(slap) * 0.7 + thud * 0.9 + 0.18 * drops)


def ting(f0):
    """A glint's bell."""
    t = tt(0.9)
    x = sum(a * np.sin(2 * np.pi * f0 * m * t + 0.2 * np.sin(2 * np.pi * 6 * t)) * np.exp(-t * dk)
            for m, a, dk in ((1, 1, 5), (2.01, 0.45, 7), (3.0, 0.22, 9), (4.17, 0.12, 12)))
    shimmer = band(RNG.standard_normal(len(t)), 6000, 13000) * np.exp(-t * 12)
    return norm((x + 0.12 * norm(shimmer)) * np.minimum(1, t / 0.002))


def pip(f0):
    """An ant popping up out of the field."""
    t = tt(0.08)
    f = f0 * (1 + 1.3 * np.minimum(1, t / 0.05))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.003) * np.exp(-t * 38))


def click():
    """A little plastic car landing on its roof."""
    t = tt(0.07)
    n = band(RNG.standard_normal(len(t)), 2000, 9000) * np.exp(-t * 260)
    ping = np.sin(2 * np.pi * RNG.uniform(1600, 2700) * t) * np.exp(-t * 65)
    return norm(norm(n) + 0.6 * ping)


def birds(d):
    """Cartoon birds over a dizzy head: "piu piu"."""
    out = np.zeros(int(d * SR), np.float32)
    for j, s in enumerate(np.arange(0, d - 0.1, 0.17)):
        t = tt(0.07)
        f = (3100 + 350 * (j % 2)) * (1 + 0.3 * np.sin(np.pi * t / 0.07))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.07)
        i = int(s * SR)
        out[i:i + len(x)] += x[: len(out) - i]
    return norm(out)


def heartbeat():
    """lub and dub: a pitch-dropping thump with harmonics a phone can play."""
    t = tt(0.22)

    def thump(hi, lo):
        ph = 2 * np.pi * np.cumsum(lo + (hi - lo) * np.exp(-t / 0.03)) / SR
        body = np.sin(ph) * np.exp(-t / 0.08) * np.minimum(1, t / 0.004)
        upper = np.sin(2 * ph) * np.exp(-t / 0.05) * 0.9 + np.sin(3 * ph) * np.exp(-t / 0.035) * 0.45
        knock = band(RNG.standard_normal(len(t)), 150, 700) * np.exp(-t / 0.03)
        return norm(np.tanh(3 * (0.6 * body + upper + 0.5 * norm(knock))))
    return thump(140, 60), thump(160, 68) * 0.7


def riser(d):
    """Noise and a tone climbing into the hit, cut 5 ms before it."""
    t = tt(d)
    p = t / d
    noise = svf_bandpass(RNG.standard_normal(len(t)).astype(np.float32), 400 * 20 ** p, 2.5)
    f = 180 * 4 ** p
    tone = sum(np.sin(2 * np.pi * np.cumsum(f * m) / SR) * w for m, w in ((1, 0.5), (2, 0.3), (3.01, 0.15)))
    trem = 1 - 0.4 * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(5 + 26 * p ** 2) / SR))
    x = (norm(noise) * 0.8 + norm(tone) * 0.55) * trem * p ** 2.2
    x[-int(0.005 * SR):] *= np.linspace(1, 0, int(0.005 * SR))
    return norm(x)


def tick(f0):
    """The speedometer's tick."""
    t = tt(0.04)
    return norm(np.sin(2 * np.pi * f0 * t) * np.exp(-t * 160) + 0.5 * band(RNG.standard_normal(len(t)), 3000, 9000) * np.exp(-t * 400))


def porrada():
    """The big hit: a crack, a body blow, a sub falling away, and a tail of grit."""
    t = tt(1.4)
    n = RNG.standard_normal(len(t))
    crack = band(n, 1500, 9000) * np.exp(-t / 0.012)
    body = np.sin(2 * np.pi * np.cumsum(160 * np.exp(-t / 0.05) + 55) / SR) * np.exp(-t / 0.18)
    sub = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t / 0.5) + 26) / SR) * np.exp(-t / 0.55) * np.minimum(1, t / 0.01)
    grit = band(n, 300, 2500) * np.exp(-t / 0.25)
    return norm(np.tanh(2.2 * (norm(crack) * 0.9 + body + 0.9 * sub + 0.35 * norm(grit))))


def ball_whoosh(d):
    """The ball tearing through the air to the goal."""
    t = tt(d)
    p = t / d
    x = svf_bandpass(RNG.standard_normal(len(t)).astype(np.float32), 500 + 2600 * p ** 1.5, 1.8)
    return norm(norm(x) * (0.2 + 0.8 * p ** 1.6) * np.minimum(1, (d - t) / 0.02))


def stamp():
    """The plate landing: a thud and a short metallic ring."""
    t = tt(0.6)
    thud = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t / 0.04) + 50) / SR) * np.exp(-t / 0.1)
    ring = sum(a * np.sin(2 * np.pi * fr * t) * np.exp(-t / dk) for fr, a, dk in
               ((523, 0.5, 0.25), (1312, 0.35, 0.18), (2215, 0.25, 0.12), (3340, 0.15, 0.08)))
    hit = band(RNG.standard_normal(len(t)), 800, 6000) * np.exp(-t / 0.015)
    return norm(np.tanh(1.6 * (thud + 0.6 * ring + 0.6 * norm(hit))))


def broom_track():
    """The broom from its own motion: straw scratching the floor while it's down (by its speed), air whooshing
    through it while it's up. Starts at the first frame the broom shows."""
    fr = [x for x in S["meta"]["frames"] if x["tip"] is not None]
    t0 = fr[0]["t"]
    ts = np.array([x["t"] for x in fr])
    tip = np.array([x["tip"] for x in fr], np.float64)
    v = np.r_[0, np.hypot(*np.diff(tip, axis=0).T) * 60]
    v = np.convolve(v, np.ones(3) / 3, "same")
    ground = np.array([x["onGround"] for x in fr], np.float64)
    n = int((ts[-1] - t0 + 0.3) * SR)
    st = t0 + np.arange(n) / SR
    vs = np.interp(st, ts, v, right=0)
    gs = np.interp(st, ts, ground, right=0)
    scratch_env = gs * np.clip(vs / 1700, 0, 1) ** 0.7
    air_env = (1 - gs) * np.clip(vs / 2600, 0, 1) ** 1.2
    noise = RNG.standard_normal(n).astype(np.float32)
    grain = (1 + 4 * (RNG.random(n) < 0.012)) * noise
    scratch = norm(band(grain, 2400, 7500)) + 0.5 * norm(band(noise, 700, 2200))
    air = svf_bandpass(RNG.standard_normal(n).astype(np.float32), 280 + 1100 * np.clip(vs / 2600, 0, 1), 1.6)
    return t0, norm(scratch * scratch_env + norm(air) * air_env * 0.9)


def sons(ctx):
    out = []

    def add(t, x, db):
        """At live second t in every stretch that plays it (the teaser and the payoff), cut at that stretch's end."""
        for (a, b), o in zip(ctx.clock.spans, ctx.clock.starts):
            if a - 3 <= t < b:
                y = x[: max(0, int((b - t) * SR))]
                at = t
                if t < a:
                    y, at = y[int((a - t) * SR):], a
                if len(y):
                    out.append((o + at - a, y, db))

    m = S["meta"]
    t0, track = broom_track()
    add(t0, track, -11)
    T = m["T"]
    add(T["slam"], thwack(), -8)
    for j, tsq in enumerate(m["squash"][:1]):
        add(tsq + 0.01, squeak(1.25), -18)
        add(tsq + 0.05, squeak(1.05), -19)
    # the ants popping up, chattering, hit (a squeak each), landing on their roofs
    for j in range(11):
        add(T["pop"] + j * 0.035 + 0.02, pip(800 + 70 * (j % 5)), -24)
    rng = np.random.default_rng(5)
    for tc in np.arange(T["pop"] + 0.3, T["slam"] - 0.05, 0.11):
        add(tc + rng.uniform(0, 0.05), squeak(rng.uniform(1.25, 1.6)), -30)
    for j, h in enumerate(m["hits"]):
        add(h["t"], squeak(rng.uniform(0.9, 1.35)), -18 - 1.5 * (j % 3))
    for b in m["bounces"][:14]:
        add(b["t"], click(), -21)
    # the demolitions' splats
    for td, _, _, _ in DEMOS:
        add(td + FLY[1], splat_sound(), -10)
        add(td + FLY[1] + 0.03, squeak(1.4), -18)
    for ts, _, _, _, f0 in SPARKLES:
        add(ts, ting(f0), -19)
    add(ORBIT[0] + 0.05, birds(2.0), -24)
    # the stage coming in
    add(STAGE[0] - 0.06, ctx.sound("whoosh_curto"), -13)
    # his goal: the heart, the riser, the speedometer ticking up, the hit, the ball, the plate
    lub, dub = heartbeat()
    for b, i in S["beats"]:
        q = ramp(b, B0, TT)
        add(b, lub, -9 + 5 * q)
        add(b + dub_gap(i), dub, -9 + 5 * q)
    add(TT - 1.45, riser(1.4), -12)
    span = TT - 0.03 - (B0 + 0.1)
    for v in range(10, 91, 10):
        add(B0 + 0.1 + (v / 92) ** (1 / 1.7) * span, tick(1500 + 15 * v), -21)
    add(TT, porrada(), -5)
    add(TT, ctx.sound("impact-boom"), -9)
    add(TT + FREEZE, ball_whoosh(GOAL - TT - FREEZE), -15)
    add(GOAL + 0.09, stamp(), -14)
    return out
