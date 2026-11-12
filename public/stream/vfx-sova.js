// Sova's abilities' effects for vfx.js, from the game's own particle systems (privado/valorant/sova/summary/<key>/,
// extracted from the installed game, never published): the textures, lifetimes, sizes and HDR colours are theirs,
// in the game's centimetres; the page scales each system to the camera when it spawns it. Keys as in the game:
// C Owl Drone, Q Shock Bolt, E Recon Bolt, X Hunter's Fury. Colours like (5, 20, 300) are the game's: tone mapped,
// they come out white in the middle and blue at the edges.
import { addTextures } from "./vfx.js"

const S = "sova/files/ShooterGame/Content/"
addTextures({
  sGlow: [S + "VFX/Textures/AlphaGradient/GlowA01_DIFF", "r", [1, 1], 0],
  sSmallGlow: [S + "VFX/Textures/Mask/SmallGlow_TEX", "r", [1, 1], 0],
  sFlash: [S + "VFX/Textures/Mask/FlashLocation_TEX", "r", [1, 1], 0, true],
  crack: [S + "VFX/Textures/Old/LightningCrackA01_TEX", "r", [4, 1], 0],
  elecBeam: [S + "VFX/Textures/Old/ElecBeam_TEX", "a", [1, 1], 0],
  shockRing: [S + "VFX/Textures/Mask/T_Mask_Ring_ShockWave", "r", [1, 1], 0],
  domeHalo: [S + "VFX/Textures/Mask/Dome_Halo", "r", [1, 1], 0],
  circleRim: [S + "VFX/Textures/Mask/T_Mask_Circle_CenterGradient", "r", [1, 1], 0],
  techRing: [S + "VFX/Textures/Mask/Tech_TEX", "r", [1, 1], 0],
  lSimple: [S + "VFX/Textures/Mask/LightningSimple_1x4_TEX", "r", [1, 4], 0],
  lStrikes: [S + "VFX/Textures/Mask/LightningStrikes1_1x4_TEX", "r", [1, 4], 0],
  lTrail: [S + "VFX/Textures/Mask/LightningTrail_1x1_TEX", "r", [1, 1], 0],
  l3: [S + "Characters/Hunter/S0/VFX/Textures/Lightning_3", "a", [3, 3], 0],
  l5: [S + "Characters/Hunter/S0/VFX/Textures/Lightning_5", "a", [3, 3], 0],
  etherSpark: [S + "VFX/Radianite/Textures/Ether_Spark_Anim", "a", [4, 4], 0],
  arm: [S + "Characters/Hunter/S0/VFX/Textures/Shockbolt_Arm_Grayscale", "r", [7, 3], 0],
  dissolve: [S + "Characters/Hunter/S0/VFX/Textures/Hunter_Shock_Dissolve", "r", [1, 1], 0, true],
  lens: [S + "VFX/Textures/Mask/Tesla_LenseFlare_TEX", "r", [1, 1], 0],
  beamGlow: [S + "VFX/Textures/Mask/ElecBeamLarge_TEX", "r", [4, 1], 0],
  sparkS: [S + "VFX/Textures/Mask/style_sparks_128", "r", [1, 1], 0],
})

// ---- E · Recon Bolt ----
export const E = {
  // While it's drawn (Hunter_Q_1P_String_VFX, Hunter_Q_1P_Equip_VFX): zaps along the string, the tech ring and a
  // glow growing at the arrow's head. The page's anchor for `string` is the nock; its beam runs to the head.
  string: [{ tex: "l3", add: true, beam: true, uvRot: true, life: [0.08, 0.16], rate: 10, size: [9, 1], color: [0.2, 5, 50], alpha: 0.35, alphaLife: [0, 0.93, 0.5, 0.08, 0], frames: "random" }],
  tip: [
    { tex: "sGlow", add: true, life: 0.3, rate: 24, size: 30, color: [0.2, 5, 50], alpha: 0.12, alphaLife: [0, 1, 0], local: true },
    { tex: "techRing", add: true, life: 0.7, rate: 1.5, size: 22, sizeLife: [0.5, 2], color: [1, 3, 4], alpha: 0.3, alphaLife: [0, 0.98, 0.52, 0], spin: [-0.1, 0.1], local: true },
  ],
  // In flight (Trail_SeekerBolt_VFX): lightning cracks along the path and the ribbon (ElecBeam) behind it.
  trail: [
    { tex: "crack", add: true, interp: true, align: "sys", life: [0.1, 0.2], rate: 90, size: [[25, 100], [30, 100]], color: [5, 20, 300], alpha: 0.2, frames: "random" },
    { tex: "elecBeam", add: true, interp: true, align: "sys", uvRot: true, life: 0.3, rate: 260, size: [40, 60], color: [2.5, 10, 150], alpha: 0.9, alphaLife: [1, 0] },
  ],
  // Where it lands (Hunter_Q_BoltImpact_VFX): the glows at both ends of the bolt; then, while it sits there,
  // Amb_SeekerTimer_VFX's arcs.
  impact: [
    { tex: "sFlash", add: true, burst: 1, life: 0.3, size: 150, color: [0.25, 1, 20], alpha: 0.6, alphaLife: [1, 0] },
    { tex: "sGlow", add: true, burst: 1, life: 0.5, size: 80, color: [0, 2, 20], alpha: 0.5, alphaLife: [1, 0] },
  ],
  stuck: [
    { tex: "sGlow", add: true, life: 0.4, rate: 12, size: 35, color: [0, 0.333, 10], alpha: 0.12, alphaLife: [0, 1, 0], local: true },
    { tex: "sGlow", add: true, life: 0.4, rate: 12, size: 8, color: [0, 10.667, 20], alpha: 0.3, alphaLife: [0, 1, 0], local: true },
    { tex: "crack", add: true, life: [0.07, 0.1], rate: 10, size: [[15, 40], [20, 50]], color: [1, 5, 200], alpha: 1, frames: "random", sizeLife: { x: [1, 1], y: [0.9, 1] }, box: [6, 6, 6] },
  ],
  // Each sonar pulse (Hunter_Q_SonarImpact_VFX): the flash, a big soft disc, the shock ring growing 8 times its
  // size in a second and a dark halo behind it. The page sizes it so the ring reaches past Luan.
  pulse: [
    { tex: "sGlow", add: true, burst: 1, life: 0.5, size: 30, sizeLife: [1, 1.6, 2.4, 3, 3.2], color: [0, 1, 3], alpha: 0.35, alphaLife: [0, 0.985, 0.655, 0.194, 0] },
    { tex: "circleRim", add: true, burst: 1, life: 0.5, size: 350, color: [2, 5, 10], color2: [0.2, 2.5, 10], alpha: 0.06, alphaLife: [0, 0.729, 0.094, 0.02, 0] },
    { tex: "domeHalo", add: false, burst: 1, life: 1, size: 37, sizeLife: [1, 2.23, 4.85, 7.27, 8], color: [0, 0.02, 0.6], color2: [0, 0.01, 0.3], alpha: 0.5, alphaLife: [0, 0.644, 0.1, 0.043, 0] },
    { tex: "shockRing", add: true, burst: 1, life: 1, size: 30, sizeLife: [1, 2.23, 4.85, 7.27, 8], color: [2, 10, 20], color2: [0.1, 2.5, 10], alpha: 1.6, alphaLife: [0, 0.644, 0.3, 0.1, 0], floor: 0 },
  ],
  // When it's spent (Destroyed_Q_VFX): sparks falling.
  destroyed: [
    { tex: "sparkS", add: true, align: "vel", burst: 7, life: [0.15, 0.5], size: [[4, 10], [6, 12]], color: [50, 50, 50], colorLife: [1, 0.84, 0.5, 0.16, 0.02], vel: [[-150, -200, -200], [150, 200, 200]], accel: [0, -1500, 0], box: [10, 10, 10] },
  ],
}

// ---- Q · Shock Bolt ----
export const Q = {
  // Held: lightning crawling round the arrow's head (Hunter_4_ArrowEffect, Hunter_4_BowEffect).
  held: [
    { tex: "lSimple", add: true, life: [0.05, 0.1], rate: 22, size: [[10, 30], [14, 40]], color: [1, 20, 300], alpha: 0.6, frames: "random", rot: [0, 1], box: [6, 6, 6], local: true },
    { tex: "sGlow", add: true, life: 0.25, rate: 20, size: 22, color: [0.5, 5, 50], alpha: 0.15, alphaLife: [0, 1, 0], local: true },
  ],
  // In flight (Hunter_4_TeslaTrail_VFX): the white-hot lightning ribbon fading to blue, and lightning loops.
  trail: [
    { tex: "lTrail", add: true, interp: true, align: "sys", uvRot: true, life: 0.4, rate: 220, size: [20, 50], color: [1, 50, 2000], color2: [1, 1, 20], alpha: 0.3, alphaLife: [1, 0.09, 0.06, 0.03, 0] },
    { tex: "l3", add: true, interp: true, align: "sys", uvRot: true, life: [0.3, 0.4], rate: 4, size: [[15, 35], [15, 45]], sizeLife: { x: [0.5, 2], y: [0.8, 2] }, color: [0.2, 5, 50], colorLife: [5, 0.6, 0], alpha: 0.6, alphaLife: [0, 0.93, 0.5, 0.08, 0], fps: 20 },
  ],
  // Off a wall (Hunter_4_Ricochet): branches of lightning and a flash.
  ricochet: [
    { tex: "lSimple", add: true, burst: 6, life: [0.15, 0.45], size: [[10, 60], [25, 100]], color: [10, 500, 2000], alpha: 0.4, rot: [0, 1], frames: "random", vel: [[-5, -5, -5], [5, 5, 5]] },
    { tex: "sGlow", add: true, burst: 1, life: 0.35, size: 300, color: [1, 5, 30], alpha: 0.1, alphaLife: [1, 0] },
  ],
  // The blast (Hunter_4_AOE_Revised_Vfx): the blue sphere flashing out, three big arms of lightning, the
  // electric spark, the crackling bubble.
  boom: [
    { tex: "circleRim", add: true, burst: 1, delay: 0.1, life: 0.2, size: 403, sizeLife: [0.98, 1.036, 1.02, 1], color: [0.1, 1, 10], alpha: 0.6, alphaLife: [0, 0.917, 0.583, 0.25, 0] },
    { tex: "sGlow", add: true, burst: 1, life: 0.3, size: 180, sizeLife: [1, 1.6], color: [0.1, 2, 9], color2: [0, 0.2, 9], alpha: 0.8, alphaLife: [1, 0.42, 0.1, 0] },
    { tex: "arm", add: true, burst: 3, life: 0.325, size: [400, 450], color: [0.6, 3, 12], color2: [0, 0, 6], alpha: 1.2, alphaLife: [1, 0], frames: "life", rot: [0, 1] },
    { tex: "etherSpark", add: true, burst: 1, life: 0.4, size: 220, sizeLife: [1, 2], color: [10, 50, 500], color2: [0.2, 1, 10], alpha: 1, frames: "life", rot: [0, 1] },
    { tex: "dissolve", add: true, burst: 1, delay: 0.15, life: 0.275, size: 400, color: [1, 1.5, 3], color2: [0, 0, 1], alpha: 0.5, alphaLife: [1, 0], rot: [0, 1] },
  ],
}

// ---- C · Owl Drone ----
export const C = {
  // Its eye (Hunter_C_Eye: the glow mesh in (0, 10, 60) and the soft glows beside it).
  eye: [
    { tex: "sGlow", add: true, life: 0.3, rate: 20, size: 7, color: [0, 10, 60], alpha: 0.4, alphaLife: [0, 1, 0], local: true },
    { tex: "sSmallGlow", add: true, life: 1, rate: 3, size: 4, sizeLife: { x: [1, 5], y: [1, 1] }, color: [0.42, 0.9, 1], colorLife: [6, 2.2, 0.48, 0.01, 0], alpha: 1, alphaLife: [0, 0.86, 0.69, 0.32, 0], local: true },
  ],
  // When it opens (Hunter_C_Eye_Equip_3p): the eye flashing 50 times as bright and the lens flares.
  equip: [
    { tex: "sGlow", add: true, burst: 1, life: 0.5, size: 18, color: [0, 10, 60], colorLife: [50, 1], alpha: 0.3, alphaLife: [1, 0] },
    { tex: "lens", add: true, burst: 2, life: [0.1, 0.2], size: [[20, 20], [10, 10]], color: [0, 1.5, 6], alpha: [0.5, 1] },
  ],
  // Its dart on Luan: a streak and the hit.
  dart: [{ tex: "elecBeam", add: true, interp: true, align: "sys", uvRot: true, life: 0.15, rate: 200, size: [6, 20], color: [2.5, 10, 150], alpha: 0.8, alphaLife: [1, 0] }],
  hit: [
    { tex: "sFlash", add: true, burst: 1, life: 0.25, size: 60, color: [0.25, 1, 20], alpha: 0.5, alphaLife: [1, 0] },
    { tex: "crack", add: true, burst: 3, life: [0.07, 0.12], size: [[15, 40], [20, 50]], color: [1, 5, 200], alpha: 0.7, frames: "random", rot: [0, 1] },
  ],
}

// ---- X · Hunter's Fury ----
export const X = {
  // The bow turned to energy (Amb_EnergyBow1P_VFX): lightning loops along both limbs (bow-local points the page
  // places: its `limb` anchor gives one of them at random).
  bow: [{ tex: "l3", add: true, life: [0.1, 0.2], rate: 66, size: [13, 4], sizeLife: { x: [1, 1], y: [0, 1.5] }, color: [0.5, 5, 50], colorLife: [1, 10, 7, 4, 1], alpha: 1, alphaLife: [0, 0.53, 0.99, 0.35, 0], fps: 5, rot: [0.2, 0.3] }],
  // Charging a shot (Hunter_X_3P_BowCharge_VFX): the core growing at the arrow, lightning round it, sparks.
  charge: [
    { tex: "sSmallGlow", add: true, burst: 1, life: 1.2, size: 10, sizeLife: [1, 20], color: [0.5, 5, 50], colorLife: [2, 1], alpha: 0.5, local: true },
    { tex: "l5", add: true, life: [0.3, 0.4], rate: 15, size: [[10, 10], [50, 150]], sizeLife: { x: [1, 1.5], y: [2.5, 1.5] }, color: [0.2, 5, 50], colorLife: [10, 3.8, 0.9, 0.04, 0], alpha: 1, alphaLife: [0, 0.93, 0.5, 0.08, 0], fps: 20, vel: [[-0.5, -1, -0.5], [0.5, 1, 0.5]], rot: [0, 1], local: true },
    { tex: "etherSpark", add: true, life: [0.3, 0.4], rate: 5, size: [[0, 0], [100, 100]], sizeLife: [1, 2], color: [2, 50, 500], color2: [0.2, 5, 50], alpha: 1, frames: "life", rot: [0, 1], sphere: 5, local: true },
  ],
  // The aim line while it charges (Hunter_X_3P_AimLaser): a thin beam along the shot.
  aim: [{ tex: "beamGlow", add: true, beam: true, uvRot: true, life: 0.12, rate: 30, size: [3, 1], color: [0.2, 2, 20], alpha: 0.5, frames: "random" }],
  // The shot (Hunter_X_3P_2_VFX): the beam flaring thick and thinning out in half a second, its lightning, the core
  // and the spark where it leaves the bow.
  blast: [
    // (The beam and its wings are meshes in the game, 15 cm thick at 50 m long; here, sprites thick enough to read
    // across the camera.)
    { tex: "beamGlow", add: true, beam: true, uvRot: true, burst: 1, life: 0.5, size: [36, 1], sizeLife: { x: [0.3, 1.49, 0.6, 0.2, 0], y: [1, 1] }, color: [0.27, 1.8, 10], colorLife: [50, 6, 0], alpha: 1, frames: "random" },
    { tex: "l3", add: true, beam: true, uvRot: true, burst: 3, life: 0.3, size: [30, 1], sizeLife: { x: [1, 2, 1.97, 1.45, 1], y: [1, 1] }, color: [0.5, 2, 100], colorLife: [8, 0], alpha: 1, frames: "random" },
    { tex: "sSmallGlow", add: true, burst: 1, life: 0.5, size: 14, sizeLife: [1, 5.9, 4.8, 1.5, 0], color: [0.5, 5, 50], colorLife: [5, 1], alpha: 0.8 },
    { tex: "etherSpark", add: true, burst: 1, life: 0.5, size: 30, sizeLife: [1, 3], color: [3, 75, 750], color2: [0.2, 5, 50], alpha: 0.8, frames: "life", rot: [0, 1] },
    // (Hunter_X_1P_FireFlash's god flare sits 35 m out, where the shot goes: off the camera here.)
  ],
  // The outro (Hunter_X_1P_LightningArrow_Outro): the bow's energy going out.
  outro: [{ tex: "etherSpark", add: true, burst: 2, life: 0.4, size: 60, sizeLife: [1, 2], color: [2, 50, 500], color2: [0.2, 5, 50], alpha: 1, frames: "life", rot: [0, 1], box: [10, 30, 4] }],
}
