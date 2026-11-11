// Phoenix's abilities as vfx.js emitters, from the game's own particle systems (Characters/Phoenix/S0/VFX, read
// from privado/valorant/phoenix/summary/): the textures, HDR colours, lifetimes, rates, sizes and curves over
// life are theirs; sizes in centimetres, our axes (x right, y up, z towards the camera). Where the game's
// material does something a sprite can't (flow maps, fresnel on a mesh), the nearest sprite stands in, noted.
// The systems are scaled where they're spawned: in-hand effects about as in first person, the ones out in the
// world (explosions, the fire on the ground, the wall) shrunk to the camera box.

const bell = [0, 0.516, 0.968, 0.452, 0] // the game's fade in and out over life (its 32-key AlphaScaleOverLife)
const fade = [1, 0]
// DebrisBlur's soft blobs under colours in the hundreds fill their cell; only their cores are the sparks.
const embers = { tex: "embers", frames: "random", align: "vel", color: [300, 5, 1.75], floor: 0.55 }

// Curveball (Q): the snap that makes the orb in the hand (Phoenix_E_1p_FlashSnap), its glow while held and in
// flight (Phoenix_E_3p_FlashProj; the orb itself is vfx.orb()), its trail, and the pop (Phoenix_E_3p_FlashExplode).
export const Q = {
  held: [
    // FakeLight: the light it casts around the hand, additive.
    { tex: "glow", add: true, life: [0.7, 1], rate: 3, burst: 1, size: [22, 22], color: [10, 0.8, 0.175], alpha: 0.2, alphaLife: bell, local: true, order: 0 },
    // GlowFlareLoop: rays (Phoenix_Q_Cast_Ray) that swell and fall back (×0.2→1.38→0.2, colour ×1→10→1 over
    // 0.6 s), ten a second.
    { tex: "star", rot: [0, 1], life: 0.6, rate: 10, burst: 1, size: [20, 20], sizeLife: [0.2, 0.81, 1.381, 0.771, 0.2], color: [30, 3, 1.75], alpha: 0.1, colorLife: [1, 7.93, 10.09, 5.48, 1], alphaLife: [1, 1, 0.933, 0.4, 0], local: true, order: 1 },
    // Solar flames licking off it (solar_flare_4x4 played over 0.7 s), four a second.
    { tex: "flare", frames: "life", life: 0.7, rate: 4, burst: 1, size: [[12, 12], [15, 15]], color: [20, 1, 0.5], local: true, order: 2 },
    // Embers: tiny sparks flicking out of it, 20 a second, a fifth of a second each.
    { ...embers, life: [0.15, 0.25], rate: 20, size: [[0.6, 1.8], [1, 3]], sphere: 4, surface: true, radial: [25, 60], colorLife: [1, 3], local: true, order: 4 },
  ],
  // The ribbon behind it in flight (Phoenix_Q_ProjRibbon: ColorA (7, 0.5, 0.2) to ColorB (60, 4, 2), 0.4 s,
  // shrinking ×1.2→0.2), as glows dropped along the way.
  trail: [
    { tex: "glow", life: 0.4, rate: 70, size: [7, 7], sizeLife: [1.2, 0.2], color: [20, 1.5, 0.6], alpha: 0.5, alphaLife: fade, colorLife: [1.7, 0.5], order: 1 },
    { ...embers, life: [0.15, 0.25], rate: 25, size: [[0.6, 1.8], [1, 3]], sphere: 3, vel: [[-15, -15, -15], [15, 15, 15]], colorLife: [1, 3], order: 2 },
  ],
  // IndyRays: five streaks out from the centre for 0.15–0.2 s, widening ×0.1→20; HotCenter: a glow 2.5–3.5 m
  // across growing ×0→3 in 0.2 s.
  explode: [
    { tex: "shaft", life: [0.15, 0.2], burst: 5, size: [[5, 100], [10, 150]], sizeLife: { x: [0.1, 20], y: [0.5, 5] }, color: [15, 1, 0.35], alphaLife: bell, order: 6 },
    { tex: "glow", life: 0.2, burst: 1, size: [[250, 250], [350, 350]], sizeLife: [0, 3], color: [30, 3, 1.75], alphaLife: fade, order: 5 },
    { tex: "star", add: true, life: 0.3, burst: 1, size: [200, 200], sizeLife: [0.4, 1.4], color: [15, 1.5, 0.6], alphaLife: fade, order: 7 },
  ],
}

// Hot Hands (E): the fireball in the hand (Phoenix_4_1p_Fireball), thrown (its trail), the blast where it lands
// (Phoenix_4_3p_Explosion) and the fire left on the ground (Phoenix_4_FireGround), about 4 s.
export const E = {
  held: [
    // GlowBallBurst: the flare as it lights up; FakeLight: its light.
    { tex: "glow", life: 1, burst: 1, size: [35, 25], color: [7, 0.8, 0.35], alphaLife: bell, local: true, order: 0 },
    { tex: "glow", add: true, life: [0.5, 0.7], rate: 3, burst: 1, size: [35, 25], color: [7, 0.6, 0.35], alpha: 0.3, colorLife: [1.1], alphaLife: bell, local: true, order: 0 },
    // The ball: a white-hot core (XBlackDrop2's (10, 2, 1) ×2) in the fireball's flames (FireballFlame's
    // FireBallShapesInner, lit ×10→1; the game's flow map is left out).
    { tex: "glow", life: 0.3, rate: 12, burst: 2, size: [10, 10], color: [20, 4, 2], alphaLife: [0.6, 1, 0.6], local: true, order: 3 },
    { tex: "ballInner", frames: "life", life: 0.6, rate: 6, burst: 1, size: [[13, 13], [16, 16]], color: [9, 1.1, 0.4], colorLife: [3, 1], alpha: 0.7, alphaLife: bell, rot: [0, 1], local: true, order: 2 },
    // Solar flames rising off it (4.5 a second, up 20–40 cm/s, ×5.4→0.3).
    { tex: "flare", frames: "blend", life: 0.7, rate: 4.5, size: [[12, 12], [15, 15]], vel: [[0, 20, 0], [0, 40, 0]], color: [20, 1, 0.5], alpha: 0.6, colorLife: [5.38, 2.26, 1.12, 0.52, 0.3], alphaLife: [0, 1, 1], order: 1 },
    // Embers drifting up.
    { ...embers, life: [0.5, 0.7], rate: 15, size: [[1, 3], [1.5, 4]], sphere: 5, vel: [[-4, 10, -4], [4, 20, 4]], colorLife: [1, 3], order: 4 },
  ],
  trail: [
    { tex: "flare", frames: "blend", life: 0.5, rate: 22, size: [[10, 10], [14, 14]], color: [20, 1, 0.5], colorLife: [4, 1.5, 0.4], alphaLife: [0, 1, 1, 0], order: 1 },
    { ...embers, life: [0.3, 0.5], rate: 30, size: [[1, 3], [1.5, 4]], sphere: 3, vel: [[-10, 0, -10], [10, 25, 10]], colorLife: [1, 3], order: 2 },
  ],
  // The blast: two muzzle-flash bursts (GMuzzleB, 3.5 m, (7, 0.6, 0.35) ×11, 0.4 s; a wide one 0.2 s) and the
  // radial burst flipbook (phoenix_radial_burst, 2.5 m, to (20, 1.5, 0.5) over 0.3 s).
  explode: [
    { tex: "muzzle", frames: "random", life: 0.4, burst: 2, size: [350, 350], color: [77, 6.6, 3.85], alphaLife: fade, rot: [0, 1], order: 6 },
    { tex: "muzzle", frames: "random", life: 0.2, burst: 2, size: [300, 100], color: [77, 6.6, 3.85], alphaLife: fade, order: 6 },
    { tex: "radial", frames: "life", life: 0.3, burst: 1, delay: 0.07, size: [250, 250], color: [20, 1.5, 0.5], order: 7 },
  ],
  // The fire on the ground: its wide licks of flame (Phoenix_Molotov_Flame over a 40 cm circle, 1–1.5 s), the
  // first ones brighter (×5.5→0.2) and rising, embers floating up, sparks shot up at the start, and the glow
  // it casts on the floor.
  ground: [
    { tex: "glow", life: 1.2, rate: 2.5, burst: 2, size: [320, 90], color: [7, 1, 0.35], alpha: 0.22, alphaLife: bell, box: [20, 0, 0], order: 0 },
    { tex: "flame", life: [1, 1.5], rate: 26, size: [[60, 35], [80, 80]], sizeTogether: false, box: [150, 0, 8], color: [6, 0.9, 0.3], alpha: [0.25, 0.5], colorLife: [1, 1, 1, 0.6, 0], alphaLife: [1, 0.96, 0.77, 0.17, 0], vel: [[0, 5, 0], [0, 15, 0]], order: 2 },
    { tex: "flameB", life: [0.8, 1.2], rate: 14, size: [[40, 40], [60, 90]], sizeTogether: false, box: [140, 0, 8], color: [9, 1.4, 0.45], alpha: 0.4, alphaLife: [0, 1, 0.6, 0], vel: [[0, 10, 0], [0, 25, 0]], order: 3 },
    { tex: "flame", life: [0.5, 0.6], burst: 14, size: [[70, 50], [90, 110]], sizeTogether: false, box: [150, 0, 8], color: [6, 0.9, 0.3], alpha: [0.25, 0.5], colorLife: [5.5, 3.45, 1.72, 0.55, 0.2], alphaLife: [1, 0.98, 0.43, 0], vel: [[0, 20, 0], [0, 50, 0]], order: 4 },
    { tex: "flare", frames: "blend", life: [0.6, 0.9], rate: 9, size: [[40, 40], [60, 60]], box: [140, 5, 8], vel: [[0, 15, 0], [0, 35, 0]], color: [20, 1, 0.5], colorLife: [3, 1.2, 0.3], alphaLife: [0, 1, 1, 0], order: 3 },
    { ...embers, color: [300, 3, 1.75], life: [0.5, 1.6], rate: 24, size: [[3, 8], [5, 12]], box: [150, 10, 10], vel: [[-10, 30, -10], [10, 70, 10]], colorLife: [2, 4], order: 5 },
    { ...embers, color: [300, 3, 1.75], life: [0.2, 0.5], burst: 40, size: [[2, 6], [4, 12]], box: [150, 0, 10], vel: [[-4, 100, -4], [4, 500, 4]], colorLife: [20, 16.9, 10, 3.5, 1], order: 5 },
  ],
}

// Blaze (C): the flame in the left hand while it's equipped (Phoenix_Q_1p_Idle, WallEquipFlame,
// Phoenix_Q_3p_Idle), the head racing ahead as the wall forms (Phoenix_Q_ProjLeadHead) and the wall itself
// (Phoenix_Q_3p_GroundLoop: solar flares 1.5 m tall, embers thrown up, the glow on the ground), 6 s.
export const C = {
  held: [
    { tex: "glow", add: true, life: [0.3, 0.4], rate: 8, burst: 2, size: [[10, 10], [20, 20]], color: [7, 1.04, 0.48], alpha: 0.5, alphaLife: bell, vel: [[3, -5, 0], [10, 5, 0]], local: true, order: 0 },
    { tex: "wallEquip", frames: "life", life: 0.6, rate: 5, burst: 1, size: [[14, 18], [18, 24]], color: [12, 1.4, 0.5], alphaLife: [0, 1, 1, 0], vel: [[0, 8, 0], [0, 18, 0]], local: true, order: 2 },
    { tex: "flare", frames: "blend", life: [0.5, 0.7], rate: 7, burst: 2, size: [[10, 12], [14, 16]], color: [20, 1.2, 0.45], colorLife: [3, 1, 0.3], alphaLife: [0, 1, 1, 0], vel: [[-3, 12, -3], [3, 26, 3]], local: true, order: 3 },
    { ...embers, color: [1400, 10, 1.75], life: [0.3, 0.5], rate: 18, size: [[0.8, 2.5], [1.2, 4]], sphere: 4, vel: [[-10, 15, -10], [10, 45, 10]], colorLife: [1, 2], order: 4 },
  ],
  // The head of the wall as it runs: a stretched glow with a tail of fire and sparks.
  head: [
    { tex: "glow", life: 0.25, rate: 30, size: [40, 25], color: [7, 1, 0.35], alphaLife: fade, local: true, order: 3 },
    { tex: "flare", frames: "blend", life: 0.4, rate: 40, size: [[30, 30], [45, 45]], color: [20, 1.2, 0.45], colorLife: [4, 1], alphaLife: [0, 1, 0], vel: [[-10, 20, 0], [10, 60, 0]], order: 4 },
    { ...embers, color: [1400, 10, 1.75], life: [0.3, 0.75], rate: 50, size: [[2, 7], [3, 12]], sphere: 8, vel: [[-60, 60, -20], [60, 200, 20]], accel: [0, -150, 0], colorLife: [1, 3], order: 5 },
  ],
  // The wall, spawned along its line (vfx's segment) behind the head: tall flares, licks at its foot, embers
  // flying up out of it, the glow it casts below (Decal_FireGround (7, 1, 0.35)).
  wall: [
    { tex: "glow", life: 1.4, rate: 6, size: [[90, 90], [140, 120]], color: [7, 1, 0.35], alpha: 0.35, alphaLife: bell, order: 0 },
    { tex: "flare", frames: "blend", life: [0.65, 0.9], rate: 70, size: [[90, 110], [130, 160]], color: [20, 1.2, 0.45], colorLife: [3, 1.4, 0.4], alphaLife: [0, 1, 1, 0.6, 0], vel: [[-6, 20, -1], [6, 45, 1]], rot: [-0.04, 0.04], order: 2 },
    { tex: "flame", life: [0.7, 1.1], rate: 45, size: [[35, 70], [55, 130]], sizeTogether: false, color: [6, 0.9, 0.3], alpha: [0.3, 0.55], alphaLife: [0, 1, 0.7, 0], vel: [[0, 25, 0], [0, 60, 0]], order: 3 },
    { tex: "flameB", life: [0.5, 0.8], rate: 25, size: [[25, 60], [40, 110]], sizeTogether: false, color: [9, 1.4, 0.45], alpha: 0.45, alphaLife: [0, 1, 0.6, 0], vel: [[0, 30, 0], [0, 70, 0]], order: 4 },
    { ...embers, color: [1400, 10, 1.75], life: [1, 2], rate: 30, size: [[3, 9], [4, 14]], vel: [[-40, 150, -10], [40, 350, 10]], accel: [0, -60, 0], drag: 0.6, colorLife: [1, 2.5], order: 5 },
  ],
}

// Run It Back (X): the burst in the hands as it's cast (Phoenix_X_1p_HandVFX), the marker where he'll come back
// (Phoenix_X_3p_Marker: a swirl, a streamer of light, a glow and flares on the floor), the flames on his
// shoulders and elbows while it lasts (ULT_LimbFlames) and the return (Phoenix_X_3p_Return: radial smoke, the
// smoke burst flipbook, sparks, flares, a burst on the floor).
export const X = {
  cast: [
    { tex: "glow", life: 0.5, burst: 1, size: [30, 25], color: [7, 1, 0.35], alphaLife: bell, local: true, order: 1 },
    { tex: "star", add: true, life: 0.55, burst: 1, size: [60, 60], color: [7, 1, 0.35], alphaLife: bell, local: true, order: 2 },
    { tex: "flare", frames: "life", life: 0.45, burst: 1, delay: 0.56, size: [20, 20], color: [20, 1.2, 0.45], local: true, order: 3 },
    { tex: "flare", frames: "life", life: 0.45, burst: 1, delay: 0.66, size: [15, 15], color: [20, 1.2, 0.45], local: true, order: 3 },
  ],
  marker: [
    { tex: "star", add: true, life: 0.5, burst: 1, size: [270, 270], sizeLife: [0.3, 1], color: [7, 0.841, 0.423], alpha: 0.7, alphaLife: [1, 1, 0.8], order: 1 },
    { tex: "star", add: true, life: 1.2, rate: 1.5, delay: 0.5, size: [270, 270], color: [7, 0.841, 0.423], alpha: 0.5, alphaLife: bell, spin: [-0.05, 0.05], order: 1 },
    { tex: "circle", life: 1, rate: 2, burst: 1, size: [200, 50], color: [7, 1, 0.4], alpha: 0.6, alphaLife: bell, order: 0 },
    // The streamer rising from the marker (LightShaft turned so its bright end is on the floor).
    { tex: "shaft", rot: [0.5, 0.5], offset: [0, 70, 0], life: 0.75, burst: 1, size: [125, 150], sizeLife: [0.6, 1], color: [7, 1.187, 0.629], alphaLife: [0, 1, 0.6], order: 2 },
    { tex: "shaft", rot: [0.5, 0.5], offset: [0, 70, 0], life: 1.5, rate: 1.2, delay: 0.75, size: [110, 150], color: [7, 1.187, 0.629], alpha: 0.6, alphaLife: bell, order: 2 },
    { tex: "flare", frames: "blend", life: [1.1, 1.25], rate: 6, dur: 0.45, size: [[80, 80], [110, 110]], color: [20, 1, 0.5], colorLife: [3, 1, 0.3], vel: [[-5, 20, 0], [5, 50, 0]], order: 3 },
    { tex: "flare", frames: "blend", life: [0.9, 1], rate: 2.5, delay: 0.3, size: [[60, 60], [90, 90]], color: [20, 1, 0.5], alpha: 0.6, colorLife: [2, 0.8, 0.2], vel: [[-5, 15, 0], [5, 35, 0]], order: 3 },
    { ...embers, life: [0.4, 1.5], rate: 10, size: [[2, 8], [4, 14]], box: [40, 0, 10], vel: [[-20, 40, -10], [20, 150, 10]], colorLife: [1, 3], order: 4 },
  ],
  // One per shoulder and elbow: solar flares trailing up (in world space, so they lag behind when he moves) and
  // tiny embers.
  limb: [
    { tex: "flare", frames: "blend", life: [0.5, 0.75], rate: 14, size: [[20, 25], [35, 25]], color: [20, 1.2, 0.45], colorLife: [2.5, 1, 0.3], alphaLife: [0, 1, 1, 0], vel: [[-5, 15, -5], [5, 30, 5]], sphere: 3, order: 2 },
    { ...embers, life: [0.2, 0.35], rate: 22, size: [[1.5, 3], [2.5, 5]], sphere: 4, vel: [[-20, 10, -20], [20, 65, 20]], colorLife: [1, 3], order: 3 },
  ],
  back: [
    { tex: "wrap", life: 2.25, burst: 1, delay: 0.05, size: [160, 160], sizeLife: [0.3, 1.6], color: [10, 1.4, 0.5], alpha: 0.7, alphaLife: [1, 0.6, 0], spin: [-0.05, 0.05], order: 1 },
    { tex: "wrap", life: 1.25, burst: 1, delay: 0.05, size: [100, 160], sizeLife: [0.3, 1.5], color: [16, 2, 0.7], alpha: 0.8, alphaLife: [1, 0.5, 0], spin: [-0.08, 0.08], order: 2 },
    { tex: "smoke", frames: "life", life: 0.6, burst: 1, size: [100, 180], color: [12, 1.6, 0.6], alphaLife: [1, 1, 0], order: 3 },
    { tex: "flare", frames: "blend", life: [0.5, 0.75], rate: 30, dur: 0.45, size: [[45, 45], [75, 75]], sphere: 30, color: [20, 1.2, 0.45], colorLife: [3, 1, 0.3], vel: [[-20, 30, -10], [20, 80, 10]], order: 4 },
    { ...embers, life: [0.5, 0.7], rate: 120, dur: 0.6, size: [[2, 6], [3, 10]], sphere: 20, radial: [80, 250], colorLife: [1, 3], order: 5 },
    { tex: "ground", life: 0.25, burst: 1, size: [200, 40], sizeLife: [0.3, 1.2], color: [12, 1.6, 0.6], alphaLife: fade, order: 0 },
  ],
}
