// Sage's abilities' effects for vfx.js, from the game's own particle systems (privado/valorant/sage/summary/<key>/,
// extracted from the installed game, never published): the textures, lifetimes, sizes and HDR colours are theirs,
// in the game's centimetres (its z up is y here); the page scales each system to the camera when it spawns it.
// Keys as in the game: C Barrier Orb, Q Slow Orb, E Healing Orb, X Resurrection (internally Ability_E, Ability_4,
// Ability_Q and Ability_X of Characters/Thorne). Colours like (5, 50, 25) are the game's colour times its colour
// scale: tone mapped, they come out white in the middle and jade at the edges.
import { addTextures } from "./vfx.js"

const S = "sage/files/ShooterGame/Content/"
const T = S + "Characters/Thorne/S0/VFX/Textures/"
addTextures({
  gEmber: [T + "Pandemic_Ember", "r", [1, 1], 0],
  gEmberG: [S + "VFX/Textures/Mask/Pandemic_Ember_Grayscale", "r", [1, 1], 0],
  gDebris: [S + "VFX/Textures/Old/Debris_4x4_2_TEX", "a", [4, 4], 1],
  gSparkH: [S + "VFX/Textures/Mask/T_Flare_Sparkle_Horizontal", "r", [1, 1], 0, true],
  gFlash: [S + "VFX/Textures/Mask/FlashLocation_TEX", "r", [1, 1], 0, true],
  gGlow: [S + "VFX/Textures/AlphaGradient/GlowA01_DIFF", "r", [1, 1], 0],
  gBurst: [T + "Thorne_Burst", "a", [1, 1], 0],
  gRadial: [T + "RadialSmoke_TFX", "r", [1, 1], 0],
  gBlur: [S + "Characters/Clay/S0/VFX/Textures/impactblur", "r", [1, 1], 0],
  gStar: [T + "Star_Sparkle_Anim", "a", [3, 3], 0],
  gPuff: [T + "SmokePuff_4x3", "a", [4, 3], 0.6],
  gRing: [S + "VFX/Textures/Mask/T_Mask_Ring_ShockWave", "r", [1, 1], 0],
  gSoft: [S + "VFX/Textures/Mask/T_Flare_Circle_Gradient_Soft", "r", [1, 1], 0],
  gSparkle: [T + "ThorneSparkle", "r", [1, 1], 0],
  gChaos: [T + "Ether_Chaos_4x4", "a", [4, 4], 0.5],
  gShaft: [S + "VFX/Textures/Mask/LightShaft_TEX", "r", [1, 1], 0],
  gSmoke: [S + "VFX/Textures/NoiseDissolve/ether_smoke", "r", [1, 1], 0],
  gPulse: [T + "heal_pulse", "a", [1, 1], 0],
  gWide: [S + "VFX/Textures/Mask/T_Flare_Wide_01", "r", [1, 1], 0, true],
  gWisp: [T + "Thorne_C_Wisp", "r", [1, 1], 0],
})

// What every orb does in her hand before it's used (Thorne_E/Q/4_3P_OrbEquip): its glow, the light shafts round
// it and the petals it sheds. The orb itself is the game's mesh, drawn by the page.
const orbHeld = (color) => [
  { tex: "gGlow", add: true, life: 1.2, rate: 2.5, size: 20, color, alpha: 0.35, alphaLife: [0, 1, 0.8, 0], local: true },
  { tex: "gShaft", add: true, life: 2, rate: 1.5, size: [25, 30], color: [0.4, 4, 2], alpha: 0.5, alphaLife: [0, 1, 0], rot: [0, 1], spin: [-0.05, 0.05], local: true },
  { tex: "gEmber", add: true, life: [0.5, 0.9], rate: 14, size: [1, 2.5], color: [1, 30, 30], alpha: [0.3, 0.8], alphaLife: [0, 1, 0], vel: [[-6, 4, -6], [6, 14, 6]], sphere: 4 },
]

// ---- C · Barrier Orb ----
export const C = {
  held: orbHeld([1, 10, 8]),
  // Placing it (Thorne_E_3P_Activate): the horizontal sparkle flash.
  cast: [{ tex: "gSparkH", add: true, burst: 1, life: 0.4, size: [100, 20], color: [3, 30, 30], alpha: 0.5, alphaLife: [1, 0.6, 0] }],
  // The wall erupting (WallForm_Full, spread along the wall by the page's segment): the crystal petals flung up and
  // the jade crystal debris.
  form: [
    { tex: "gEmber", add: true, burst: 50, life: [0.2, 0.8], size: [[10, 4], [20, 5]], color: [3, 3, 3], color2: [1, 1, 1], alpha: 1, alphaLife: [1, 0.8, 0], vel: [[-60, 300, -60], [60, 700, 60]], accel: [0, 1100, 0], box: [20, 10, 20], align: "vel" },
    { tex: "gDebris", add: false, burst: 60, life: [0.4, 0.9], size: [[30, 20], [65, 100]], color: [5, 50, 25], alpha: 1, alphaLife: [0, 1, 1, 0.6, 0], frames: "random", vel: [[-80, 50, -80], [80, 400, 80]], accel: [0, -900, 0], box: [20, 30, 20] },
  ],
  // While it stands (Wall_Extras): petals drifting down off it.
  stand: [{ tex: "gEmber", add: true, life: [0.5, 1.25], rate: 25, size: [10, 25], color: [1, 2, 1], color2: [1, 1, 1], alpha: 0.6, alphaLife: [1, 0], accel: [0, -75, 0], drag: 2, box: [10, 60, 10] }],
  // Crumbling (Thorne_E_Destroyed), at each segment: a smoke puff, the light, the burst, the radial smoke, the
  // blur, a star sparkle, chunks falling and petals rising.
  crumble: [
    { tex: "gPuff", add: false, burst: 1, life: [0.75, 0.85], size: [225, 250], color: [1.25, 1.25, 2.5], color2: [0.5, 0.5, 0.6], alpha: 0.7, alphaLife: [1, 0], frames: "life" },
    { tex: "gGlow", add: true, burst: 1, life: 0.6, size: 400, sizeLife: [0.5, 1.06, 1.39, 1.5], color: [0, 0.85, 2], color2: [0, 0.35, 0.83], alpha: 1, alphaLife: [1, 0] },
    { tex: "gBurst", add: true, burst: 1, life: 0.5, size: 150, sizeLife: [0.5, 1.18, 1.4], color: [1, 1, 1], color2: [0, 0.18, 0.4], alpha: 1, alphaLife: [2, 0], rot: [0, 1] },
    { tex: "gRadial", add: true, burst: 1, life: 0.3, size: 300, sizeLife: [0.75, 1, 1.2], color: [0, 1.65, 3], color2: [0, 0.65, 2], alpha: 1, alphaLife: [2, 1.5, 1.1, 0.7, 0.35] },
    { tex: "gBlur", add: true, burst: 1, life: 0.2, size: 250, sizeLife: [1, 1.36, 1.6], color: [0.75, 3.2, 5], color2: [0, 0.44, 1], alpha: 1, alphaLife: [1, 0.64, 0.21, 0] },
    { tex: "gStar", add: true, burst: 1, life: 0.45, size: 130, color: [5, 5, 10], color2: [0.5, 0.5, 1], alpha: 1, alphaLife: [1, 0], frames: "life" },
    { tex: "gDebris", add: false, burst: 12, life: [0.3, 0.6], size: [[10, 10], [35, 35]], color: [1.5, 6, 4], alpha: 1, alphaLife: [1, 1, 0], frames: "random", vel: [[-150, 0, -150], [150, 350, 150]], accel: [0, -1500, 0], box: [40, 60, 20], spin: [-1, 1] },
    { tex: "gEmber", add: true, burst: 14, life: [0.6, 1.5], size: [10, 35], color: [1, 1, 1], alpha: 1, alphaLife: [1, 0], vel: [[0, 0, 0], [0, 100, 0]], drag: 2, box: [40, 40, 20] },
  ],
}

// ---- Q · Slow Orb ----
export const Q = {
  held: orbHeld([1, 10, 8]),
  // In flight (Thorne_4_Projectile): the gas trail and its two flares.
  trail: [
    { tex: "gSmoke", add: true, interp: true, life: 1, rate: 70, size: 20, sizeLife: [1, 1.6], color: [0.2, 2, 1], color2: [0.02, 0.2, 0.1], alpha: 0.5, alphaLife: [0, 0.4, 0.71, 0.95, 0], rot: [0, 1] },
    { tex: "gFlash", add: true, life: 0.15, rate: 5, size: [60, 80], color: [10, 30, 5], alpha: 0.2, local: true },
    { tex: "gFlash", add: true, life: 0.25, rate: 5, size: [60, 80], color: [5, 30, 10], alpha: 0.2, local: true },
  ],
  // Where it bursts (Thorne_4_3P_Impact): the flares, the shock ring and crystal shards.
  impact: [
    { tex: "gSoft", add: true, burst: 1, life: 0.5, size: 20, color: [5, 25, 10], alpha: 1, alphaLife: [1, 0] },
    { tex: "gFlash", add: true, burst: 1, life: 0.5, size: [30, 40], color: [5, 30, 10], alpha: 0.2 },
    { tex: "gFlash", add: true, burst: 1, life: 0.5, size: [250, 300], color: [5, 30, 20], color2: [2.5, 15, 10], alpha: 0.2, alphaLife: [0, 0.33, 0.67, 1, 0] },
    { tex: "gRing", add: true, burst: 1, life: 0.35, size: 35, sizeLife: [1, 4, 6.5, 7.5], color: [50, 250, 150], alpha: 1, alphaLife: [1, 0.6, 0] },
    { tex: "gDebris", add: false, burst: 15, life: [0.25, 0.4], size: [10, 40], color: [1, 5, 2.5], alpha: 1, alphaLife: [1, 1, 0], frames: "random", vel: [[-300, 100, -300], [300, 500, 300]], accel: [0, -1200, 0] },
  ],
  // The slow field on the ground (Thorne_4_3P_SlowZone, 7.4 s in the game; the page's dur), spread over the patch
  // by its segment: the first poof (glow, burst, radial smoke, blur), the ether rising off the patch, its sparkles,
  // the crystals floating in it and the petals collapsing.
  poof: [
    { tex: "gGlow", add: true, burst: 1, life: 0.6, size: 350, sizeLife: [0.5, 1.06, 1.39, 1.5], color: [0, 1.68, 2], color2: [0, 0.54, 1], alpha: 1, alphaLife: [1, 0] },
    { tex: "gBurst", add: true, burst: 1, life: [0.225, 0.275], size: [150, 175], sizeLife: [0.5, 1.2], color: [1, 1, 1], color2: [0, 0.21, 0.4], alpha: 1, alphaLife: [1, 0], rot: [0, 1] },
    { tex: "gRadial", add: true, burst: 1, life: 0.275, size: 300, color: [0, 2.78, 3], color2: [0, 0.81, 1], alpha: 1, alphaLife: [2, 1.78, 1.46, 1.07, 0.68, 0.34] },
    { tex: "gBlur", add: true, burst: 1, life: 0.1, size: 170, color: [0.45, 2, 1.49], color2: [0.42, 1, 0.54], alpha: 1, alphaLife: [1, 0.64, 0.21, 0] },
    { tex: "gEmber", add: true, burst: 15, life: [0.3, 1], size: [3, 30], color: [1, 1, 1], alpha: 1, alphaLife: [1, 0], vel: [[-30, 250, -30], [30, 900, 30]], accel: [0, -900, 0] },
  ],
  // (The game's patch is a decal on the floor, seen from above; facing the camera, a band of light along the bottom
  // of the box stands for it, and the rest comes thicker than in the game, which spreads it over 4.6 m.)
  zone: [
    { tex: "gWide", add: true, rate: 5, life: 1.6, size: [260, 45], color: [0.8, 10, 7], alpha: 0.55, alphaLife: [0, 1, 0] },
    { tex: "gChaos", add: true, rate: 10, life: [1.35, 1.6], size: [[30, 100], [120, 500]], sizeTogether: false, color: [2.25, 3, 2.25], color2: [0, 0.61, 1], alpha: 0.8, alphaLife: [0, 1, 1, 0], frames: "life", rot: [-0.02, 0.02] },
    { tex: "gSparkle", add: true, rate: 8, life: [0.5, 1.5], size: [80, 150], color: [0.2, 2, 2], alpha: [0.2, 0.6], alphaLife: [0, 1, 0], vel: [[0, -30, 0], [0, -10, 0]] },
    { tex: "gGlow", add: true, rate: 2, life: 3, size: 90, sizeLife: [0.5, 1.5], color: [0, 1.26, 1.5], color2: [0, 0.54, 1], alpha: 0.5, alphaLife: [0, 1, 0] },
    { tex: "gDebris", add: false, rate: 1.2, life: [4, 5], size: [8, 22], color: [1, 5, 2.5], alpha: 1, alphaLife: [0, 1, 1, 0], frames: "random", vel: [[-5, 4, -5], [5, 12, 5]], spin: [-0.1, 0.1] },
    { tex: "gEmber", add: true, rate: 6, life: [0.3, 0.6], size: [7, 25], color: [1, 1.4, 1.2], alpha: 1, alphaLife: [1, 0], vel: [[0, 200, 0], [0, 700, 0]], accel: [0, -700, 0] },
  ],
  // As the field ends: the exit poof.
  exit: [
    { tex: "gBurst", add: true, burst: 1, life: [0.225, 0.275], size: [175, 200], color: [1, 1, 1], color2: [0, 0.4, 0.28], alpha: 1, alphaLife: [1, 0], rot: [0, 1] },
    { tex: "gEmber", add: true, burst: 10, life: [0.3, 0.65], size: [3, 20], color: [1, 1, 1], alpha: 1, alphaLife: [1, 0], vel: [[0, 250, 0], [0, 850, 0]], accel: [0, -900, 0] },
  ],
  // On whoever's in it (the page draws its frost on Luan): petals stuck to him.
  slowed: [{ tex: "gEmberG", add: true, rate: 14, life: [0.6, 1], size: [4, 10], color: [0.4, 6, 5], alpha: [0.2, 0.5], alphaLife: [0, 1, 0], vel: [[-4, -10, -4], [4, -2, 4]] }],
}

// ---- E · Healing Orb ----
export const E = {
  held: orbHeld([1, 10, 5]),
  // The heal starting on him (Thorne_Q_1P_HealSelf_Activate, Thorne_Q_3P_BuffAllyHeal): the shock ring, the
  // ring, the horizontal sparkle, the wide flare, the heal pulse and crystal sprites.
  start: [
    { tex: "gRing", add: true, burst: 1, life: 0.25, size: 70, sizeLife: [1, 2.5], color: [0.4, 4, 2], alpha: 1, alphaLife: [1, 0] },
    { tex: "gRing", add: true, burst: 1, life: 0.5, size: 100, sizeLife: [0.6, 1.4], color: [2, 14.5, 15], alpha: 1, alphaLife: [1, 0] },
    { tex: "gSparkH", add: true, burst: 1, life: 1.5, size: [70, 50], color: [0.4, 4, 2], alpha: 1, alphaLife: [1, 0.94, 0.8, 0.6, 0] },
    { tex: "gWide", add: true, burst: 1, life: 1, size: [100, 30], sizeLife: { x: [0.5, 1.2], y: [0.5, 1] }, color: [1, 7, 5], alpha: 0.3, alphaLife: [1, 0] },
    { tex: "gPulse", add: true, burst: 1, life: 0.55, size: 25, sizeLife: [1, 3], color: [1, 6, 4], alpha: 1, alphaLife: [0, 1, 0] },
    { tex: "gDebris", add: false, burst: 8, life: [0.4, 0.6], size: [2, 10], color: [2, 10, 5], alpha: 1, alphaLife: [1, 0], frames: "random", vel: [[-60, -20, -60], [60, 80, 60]] },
  ],
  // While it heals (5 s): the glow growing over him, the petals and the ribbons of energy rising round him
  // (meshes in the game; here, its wisps), spread over his silhouette by the page's segment.
  loop: [
    { tex: "gGlow", add: true, rate: 0.5, life: 3, size: 100, color: [0.4, 4, 2], alpha: 0.12, alphaLife: [0, 1, 0] },
    { tex: "gEmberG", add: true, rate: 40, life: [0.7, 1.4], size: [5, 15], color: [0.2, 1, 0.8], colorLife: [0.5, 30, 10], alpha: [0.1, 0.35], alphaLife: [0, 0.07, 0.25, 0.5, 1, 0], vel: [[-4, 18, -4], [4, 45, 4]] },
    { tex: "gWisp", add: true, rate: 3, life: [1, 1.4], size: [[12, 30], [18, 50]], color: [0.36, 7, 2.7], color2: [0, 1.9, 2], alpha: 0.6, alphaLife: [0, 1, 0.6, 0], vel: [[0, 25, 0], [0, 50, 0]], rot: [-0.03, 0.03] },
  ],
}

// ---- X · Resurrection ----
export const X = {
  // Ready (Thorne_X_3P_Equip, Thorne_X_3P_Idle): petals round both hands and the ribbons' light.
  equip: [
    { tex: "gEmberG", add: true, rate: 40, life: [0.7, 1], size: [5, 15], color: [0.2, 1, 0.8], colorLife: [0.5, 20, 6], alpha: [0.05, 0.25], alphaLife: [0, 0.1, 0.3, 0.6, 1, 0], vel: [[-10, 5, -10], [10, 25, 10]], sphere: 8, local: true },
    { tex: "gGlow", add: true, rate: 3, life: 1, size: 24, color: [1, 8, 4], alpha: 0.3, alphaLife: [0, 1, 0], local: true },
  ],
  // Raising (Thorne_X_3P_Res), over him: the core bloom, the wide flares (the one on the ground too), the big
  // glow above, the star, the smoke puff, the glow's flash, the blur, the petals and the crystal shards.
  res: [
    { tex: "gGlow", add: true, burst: 1, life: 1, size: 500, color: [0.2, 2, 1], colorLife: [0.1, 1], alpha: 1, alphaLife: [0, 0.32, 0.65, 0.96, 1, 0] },
    { tex: "gGlow", add: true, burst: 1, life: 1, size: [300, 200], color: [0.2, 2, 1], colorLife: [0.1, 1], alpha: 0.8, alphaLife: [0, 0.32, 0.65, 0.96, 1, 0] },
    { tex: "gWide", add: true, burst: 1, delay: 0.6, life: 1.2, size: [150, 50], sizeLife: { x: [0, 0.07, 0.25, 0.48, 1], y: [1, 1] }, color: [2, 20, 15], alpha: 0.6, alphaLife: [1, 1, 0] },
    { tex: "gGlow", add: true, burst: 1, delay: 0.6, life: 0.9, size: 300, offset: [0, 120, 0], color: [0.3, 4, 6], alpha: 0.7, alphaLife: [1, 0] },
    { tex: "gStar", add: true, burst: 1, delay: 0.6, life: 0.45, size: 90, offset: [0, 120, 0], color: [5, 5, 10], color2: [0.5, 0.5, 1], alpha: 1, alphaLife: [0, 1, 0.5, 0], frames: "life" },
    { tex: "gPuff", add: false, burst: 1, delay: 0.6, life: [0.75, 0.85], size: [225, 250], color: [1.25, 1.25, 2.5], color2: [0.5, 0.5, 0.6], alpha: 0.5, alphaLife: [1, 0], frames: "life" },
    { tex: "gBlur", add: true, burst: 1, delay: 0.6, life: 0.2, size: 150, offset: [0, 120, 0], color: [0.75, 3.2, 5], color2: [0, 0.44, 1], alpha: 1, alphaLife: [1, 0.64, 0.21, 0] },
    { tex: "gSparkH", add: true, burst: 1, delay: 0.6, life: 0.7, size: [200, 20], color: [0.4, 4, 2], alpha: 1, alphaLife: [1, 0.6, 0] },
    { tex: "gEmberG", add: true, rate: 90, dur: 1, life: [0.8, 1], size: [10, 50], color: [0.2, 1, 0.8], colorLife: [0.5, 10, 4], alpha: [0.05, 0.25], alphaLife: [0, 0.07, 0.24, 0.5, 1, 0], vel: [[-40, 60, -40], [40, 200, 40]], box: [40, 90, 20] },
    { tex: "gDebris", add: false, burst: 50, delay: 0.6, life: [0.8, 1], size: [10, 40], color: [1, 5, 2.5], alpha: 1, alphaLife: [1, 1, 0], frames: "random", vel: [[-250, 0, -250], [250, 500, 250]], accel: [0, -600, 0], drag: 1 },
    { tex: "gEmberG", add: true, burst: 14, delay: 0.6, life: [0.6, 1.2], size: [10, 40], color: [1, 6, 4], alpha: 1, alphaLife: [1, 0], sphere: 70, surface: true, radial: 140, drag: 2 },
  ],
  // The column of light he's raised in (the ribbons' Thorn_X_Res meshes in the game; here, light shafts from above,
  // the page's segment running down him).
  column: [
    { tex: "gShaft", add: true, rate: 9, life: [0.8, 1.2], size: [[40, 260], [70, 320]], color: [0.4, 5, 3], alpha: 0.35, alphaLife: [0, 1, 0] },
    { tex: "gWisp", add: true, rate: 6, life: [1, 1.3], size: [[15, 40], [25, 70]], color: [0.5, 8, 4], color2: [0.08, 1.45, 3.5], alpha: 0.7, alphaLife: [0, 1, 0.5, 0], vel: [[0, 60, 0], [0, 140, 0]] },
  ],
}
