"""The camera filters' sound effects (public/stream/filtros.html, sfx.js): each moment of an ability as one short
file, made from the games' own sounds, which never leave public/stream/privado/ (gitignored).

  python3 scripts/filtros_sons.py            # every cue
  python3 scripts/filtros_sons.py phoenix-   # the cues starting with that

Its inputs are the extractions, re-run after a patch (Valorant closed, Luan not live):
  ~/.local/share/valorant-extract/run.sh phoenix|sova|sage   the agents' models and effects
  ~/.local/share/valorant-extract/sons.sh phoenix|sova|sage  their Wwise events: privado/valorant/<agent>/sons/wwiser/txtp/
  ~/.local/share/rl-extract/run.sh                      Rocket League's: privado/rocket-league/sons/<event>/NN.wav

A Valorant cue renders the game's own event (its .txtp, written by wwiser from the event's bank) with vgmstream, so
its layers play together at the game's volumes; a random container gives one file per pick (up to MAX_ALTS), which
the page draws from. Loops come straight from the looped sound (sons/wav/), to loop seamlessly in the page.
Each file is brought to a common loudness (TARGET, quieter for loops), cut where the cue says, faded, and written as
Opus to privado/sons/<cue>/NN.ogg, with privado/sons/index.json listing them. Never deletes anything.
"""

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRIVADO = ROOT / "public/stream/privado"
if not (PRIVADO / "valorant").exists():
    # A worktree has no private folder: the shared checkout's is the one the page is served from.
    PRIVADO = Path.home() / "repos/muanlartins/public/stream/privado"
OUT = PRIVADO / "sons"
MAX_ALTS = 3
# Loudness of a one-shot and of a loop (LUFS), and the highest peak (dBFS).
TARGET, TARGET_LOOP, CEILING = -18.0, -26.0, -1.0
FP, TP = "[3838734001=1204257842]", "[3838734001=1878706709]"  # the caster's (first person) or others' (third)


def V(agent, event, gain=0.0, delay=0.0):
    """A Valorant event, by its .txtp's name up to the variant (the switch in brackets, when it has one)."""
    return {"kind": "event", "agent": agent, "event": event, "gain": gain, "delay": delay}


def W(agent, path, gain=0.0, delay=0.0):
    """One of a Valorant agent's sounds as it is (sons/wav/<event>/<file>), for loops."""
    return {"kind": "wav", "path": PRIVADO / "valorant" / agent / "sons/wav" / path, "gain": gain, "delay": delay}


def RL(event, gain=0.0, delay=0.0):
    """A Rocket League event's sounds (each file one of its random picks)."""
    return {"kind": "rl", "event": event, "gain": gain, "delay": delay}


# Each cue: its parts (played together, each from `delay` seconds, `gain` dB), `cut` (seconds kept, faded out over
# the last `fade`), `loop` (made to loop in the page).
CUES = {
    # Phoenix's Curveball (BANG in filtros.html: 1 s in the hand, 0.65 s flying, then the glare).
    "phoenix-flash-equip": {"parts": [V("phoenix", f"Play_Phoenix_AbilE_Equip {FP}")], "cut": 1.2},
    "phoenix-flash-throw": {"parts": [V("phoenix", "Play_Phoenix_AbilE_BuildFlash"), V("phoenix", "Play_Phoenix_AbilE_Projectile", -2)]},
    "phoenix-flash-pop": {"parts": [V("phoenix", "Play_Phoenix_AbilE_FlashWorld")]},
    # What a flashed player hears: the camera's glare blinds whoever watches.
    "phoenix-flash-blind": {"parts": [V("phoenix", "Play_Phoenix_AbilE_FlashPlayer")]},
    # Hot Hands (HH: 0.7 s in the hand, 0.55 s flying, 4 s burning).
    "phoenix-molotov-equip": {"parts": [V("phoenix", f"Play_Phoenix_Abil4_Equip {FP}")], "cut": 1.0},
    "phoenix-molotov-throw": {"parts": [V("phoenix", f"Play_Phoenix_Abil4_Cast {FP}"), V("phoenix", "Play_Phoenix_Abil4_Projectile", -3)]},
    "phoenix-molotov-explode": {"parts": [V("phoenix", "Play_Phoenix_Abil4_Explode")]},
    "phoenix-molotov-burn": {"parts": [W("phoenix", "Play_Phoenix_Abil4_Loop/00_Phoenix_Molotov_Loop_TP (SFX).wav")], "loop": True},
    "phoenix-molotov-end": {"parts": [V("phoenix", "Play_Phoenix_Abil4_ZoneDecay")]},
    # Blaze (BZ: 0.8 s in the hand, the wall running 0.75 s, burning 6 s).
    "phoenix-blaze-equip": {"parts": [V("phoenix", f"Play_Phoenix_AbilQ_Equip {FP}"), V("phoenix", "Play_Phoenix_Wall_Equip_Jacket_FP")], "cut": 1.1},
    "phoenix-blaze-run": {"parts": [V("phoenix", "Play_Phoenix_AbilQ_Projectile"), W("phoenix", "Play_Phoenix_AbilQ_WallLoop/02_Phoenix_Wall_Form_TP_V2_A (SFX).wav", -4), W("phoenix", "Play_Phoenix_AbilQ_WallLoop/00_Phoenix_Wall_Form_TP_V2_B (SFX).wav")]},
    "phoenix-blaze-burn": {"parts": [W("phoenix", "Play_Phoenix_AbilQ_WallLoop/01_Phoenix_Wall_Loop_TP (SFX).wav")], "loop": True},
    "phoenix-blaze-end": {"parts": [V("phoenix", "Play_Phoenix_AbilQ_WallDecay")]},
    # Run It Back (RB: 0.8 s cast, 10 s on fire, then back).
    "phoenix-ult-cast": {"parts": [V("phoenix", f"Play_Phoenix_AbilX_Cast {FP}")]},
    # The rise towards the comeback, 9 s: the page starts it so it ends as he comes back.
    "phoenix-ult-rise": {"parts": [W("phoenix", "Play_Phoenix_AbilX_LoopAtLocation/01_Phoenix_Ultimate_LoopAtLocation_WRise_FP_01 (SFX).wav")]},
    "phoenix-ult-return": {"parts": [V("phoenix", f"Play_Phoenix_AbilX_FormReturn {FP}")]},
    # Fire held between the palms, and his shoulders burning in the ultimate.
    "phoenix-fire": {"parts": [W("phoenix", "Play_Abil_Fire_Med_Lp/00_fire_crackle_med_lp (SFX).wav")], "loop": True},
    # Sova's bow: out for the Recon Bolt, drawing (its level ticks), let go, folded unshot.
    "sova-recon-equip": {"parts": [V("sova", "Play_Hunter_S0_AB_Q_SonarBolt_Equip_Bow_Mvt_C"), V("sova", "Play_Hunter_S0_AB_Q_SonarBolt_Equip_Elec_A", -2), V("sova", "Play_Hunter_S0_AB_Q_SonarBolt_Equip_Circle", -2, 0.05)]},
    "sova-recon-charge": {"parts": [V("sova", f"Play_Hunter_AbilQ_Charge {FP}")], "cut": 1.0},
    "sova-charge-hum": {"parts": [W("sova", "Play_Hunter_AbilQ_Charge/03_Hunter_AbilQ_Charge_Loop (SFX).wav")], "loop": True},
    "sova-charge-level": {"parts": [V("sova", "Play_Hunter_AbilQ_ChargeLevelReached_00")]},
    "sova-bow-release": {"parts": [V("sova", f"Play_Hunter_AbilQ_Cast {FP}"), V("sova", "Play_Hunter_AbilQ_Missile_3P_upd", -6)], "cut": 1.6},
    "sova-bow-fold": {"parts": [V("sova", "Play_Hunter_S0_AB_Q_SonarBolt_Cancel_Bow_Mvt"), V("sova", "Play_Hunter_S0_AB_Q_SonarBolt_Cancel_Zap")]},
    # The Recon Bolt landing, sitting there (4.2 s, DART_LIFE), its two pings, breaking.
    "sova-recon-hit": {"parts": [V("sova", "Play_Hunter_AbilQ_Hit_3P")]},
    "sova-recon-deployed": {"parts": [V("sova", "Play_Hunter_Abil4_Deployed_Start"), W("sova", "Play_Hunter_Abil4_Deployed_Loop_upd/02_Hunter_S0_AB_Q_Deployed_Ally_Swt_Loop (SFX).wav", -8)], "cut": 4.4, "fade": 0.5},
    "sova-recon-ping": {"parts": [V("sova", f"Play_Hunter_Abil_SonarBolt_SonarPing_upd {FP}")]},
    "sova-recon-end": {"parts": [V("sova", "Play_Hunter_AbilQ_Destroyed")]},
    # The Shock Bolt: out, drawing, the bounce off the top, the burst.
    "sova-shock-equip": {"parts": [V("sova", "Play_Hunter_Abil4_Equip_Bow_Mvt_A"), V("sova", "Play_Hunter_Abil4_Equip_Elec_B", -2)]},
    "sova-shock-charge": {"parts": [V("sova", f"Play_Hunter_Abil4_Charge {FP}")], "cut": 1.0},
    "sova-shock-hum": {"parts": [W("sova", "Play_Hunter_Abil4_Equipped_Hum_Loops/00_Hunter_S0_AB_4_ShockBolt_Equipped_Hum_Loop (SFX).wav")], "loop": True},
    "sova-shock-ricochet": {"parts": [V("sova", "Play_Hunter_AbilGrenade_Ricochet_3P")]},
    "sova-shock-explode": {"parts": [V("sova", "Play_Hunter_Abil4_ShockBolt_Explode")]},
    # The Owl Drone (DRONE: opens 0.5 s, flies up, darts him at 3 s, leaves at 5.6 s).
    "sova-drone-open": {"parts": [V("sova", f"Play_Hunter_AbilE_Equip {FP}"), V("sova", f"Play_Hunter_AbilE_Deploy {FP}", 0, 0.15)]},
    "sova-drone-idle": {"parts": [W("sova", "Play_Abil_Hunter_E_Drone_Idle/02_Hunter_Drone_Idle_Propellor_3P (SFX).wav")], "loop": True},
    "sova-drone-dart": {"parts": [V("sova", f"Play_Hunter_AbilE_Missile {TP}")]},
    "sova-drone-tag": {"parts": [V("sova", "Play_Hunter_AbilE_Dart_V2_HitConfirm_1P")]},
    "sova-drone-pulse": {"parts": [V("sova", f"Play_Hunter_AbilE_Dart_Complete {TP}")]},
    # Hunter's Fury (ULT: three shots at 1.2, 2.5 and 3.8 s, each charged 0.9 s; over at 4.6 s).
    "sova-ult-equip": {"parts": [V("sova", "Play_Hunter_AbilX_Equip_Energy"), V("sova", "Play_Hunter_AbilX_Equip_BowMvt_A", -2)]},
    "sova-ult-hum": {"parts": [W("sova", "Play_Hunter_AbilX_Equipped_Loops/01_Hunter_S0_AB_X_SuperBolt_Equipped_Arc_Loop (SFX).wav")], "loop": True},
    "sova-ult-charge": {"parts": [V("sova", f"Play_Hunter_AbilX_Channel {FP}")]},
    "sova-ult-fire": {"parts": [V("sova", f"Play_Hunter_AbilX_Fire {FP} {{s}}=(1296359092=2967106803)")]},
    "sova-ult-end": {"parts": [V("sova", "Play_Hunter_S0_AB_X_SuperBolt_Cancel_Bow_Mvt_D")]},
    # Sage's Barrier Orb (SG in filtros.html: 0.8 s in the hand, then the wall erupts, stands 6 s and crumbles).
    "sage-barreira-equip": {"parts": [V("sage", f"Play_Thorne_AbilE_Equip {FP}")], "cut": 1.0},
    "sage-barreira-cast": {"parts": [V("sage", f"Play_Thorne_AbilE_Cast {FP}")]},
    "sage-barreira-erupt": {"parts": [V("sage", "Play_Thorne_AbilE_Erupt"), V("sage", "Play_Thorne_AbilE_Harden_Oneshot", -3, 0.6)]},
    "sage-barreira-crumble": {"parts": [V("sage", "Play_Thorne_AbilE_WallCrumble")]},
    # Slow Orb (0.8 s in the hand, 0.45 s flying, the field 5.5 s).
    "sage-lentidao-equip": {"parts": [V("sage", f"Play_Thorne_Abil4_Equip {FP}")], "cut": 1.0},
    "sage-lentidao-throw": {"parts": [V("sage", f"Play_Thorne_Abil4_Cast {FP}"), V("sage", "Play_Thorne_Abil4_Projectile", -3)], "cut": 1.2},
    "sage-lentidao-explode": {"parts": [V("sage", "Play_Thorne_Abil4_Explode"), V("sage", "Play_Thorne_Abil4_SlowFieldForm", 0, 0.05)]},
    "sage-lentidao-loop": {"parts": [W("sage", "Play_Thorne_Abil4_GroundLoop/00_thorne_abil4_slowfield_loop_01 (SFX).wav")], "loop": True},
    "sage-lentidao-end": {"parts": [V("sage", "Play_Thorne_Abil4_SlowFieldDecay")]},
    # Healing Orb on herself (0.6 s in the hand, then 5 s healing).
    "sage-cura-equip": {"parts": [V("sage", f"Play_Thorne_AbilQ_Equip {FP}")], "cut": 0.8},
    "sage-cura-cast": {"parts": [V("sage", f"Play_Thorne_AbilQ_Cast_Self {FP}")]},
    "sage-cura-loop": {"parts": [W("sage", "Play_Thorne_AbilQ_Heal_Loop/01_Thorne_AbilQ_Heal_Loop_1P_01 (SFX).wav")], "loop": True},
    # Resurrection (1.3 s of glowing hands, then the light).
    "sage-ult-equip": {"parts": [V("sage", f"Play_Thorne_AbilX_Equip {FP}")], "cut": 1.5},
    "sage-ult-res": {"parts": [V("sage", f"Play_Thorne_AbilX_Rez {FP}")], "cut": 4.6, "fade": 0.8},
    # Rocket League's cars: the flip (a jump, then the dodge) and the demolition.
    "carro-pulo": {"parts": [RL("Play_Car_Movement_Jump")], "cut": 0.9},
    "carro-flip": {"parts": [RL("Play_Car_Movement_Dodge")], "cut": 1.2},
    "carro-demo": {"parts": [RL("Play_Impact_Car_Explode")]},
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"{cmd[0]} failed: {r.stderr.strip().splitlines()[-1:] or r.stdout[-300:]}")
    return r


def event_txtp(agent, event):
    folder = PRIVADO / "valorant" / agent / "sons/wwiser/txtp"
    found = [p for p in folder.glob("*.txtp") if p.stem == event or p.stem.startswith(event + " ")]
    if len(found) != 1:
        raise SystemExit(f"{agent}: {event!r} matches {len(found)} events: {[p.name for p in found]}")
    return found[0]


def alternatives(part):
    """How many random picks a part has."""
    if part["kind"] == "event":
        text = event_txtp(part["agent"], part["event"]).read_text(errors="replace")
        picks = [int(n) for n in re.findall(r"^\s*group = -R(\d+)>1", text, re.M)]
        return max(picks, default=1)
    if part["kind"] == "rl":
        return len(sorted((PRIVADO / "rocket-league/sons" / part["event"]).glob("*.wav")))
    return 1


def render(part, k, work):
    """Pick k of a part, as a WAV in `work`."""
    out = work / f"part-{id(part)}-{k}.wav"
    if part["kind"] == "event":
        src = event_txtp(part["agent"], part["event"])
        text = src.read_text(errors="replace")
        # Every random container takes its (k mod n)th pick.
        text = re.sub(r"^(\s*group = -R(\d+))>1", lambda m: f"{m.group(1)}>{k % int(m.group(2)) + 1}", text, flags=re.M)
        # Next to the original, so its relative paths to the media still work.
        tmp = src.with_name("_render.txtp")
        tmp.write_text(text)
        # -i: once through (loop layers would play 20 times).
        run(["vgmstream-cli", "-i", "-o", str(out), str(tmp)])
    elif part["kind"] == "rl":
        files = sorted((PRIVADO / "rocket-league/sons" / part["event"]).glob("*.wav"))
        shutil.copy(files[k % len(files)], out)
    else:
        shutil.copy(part["path"], out)
    return out


def loudness(path):
    """Integrated loudness (LUFS) and true peak (dBFS)."""
    err = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr
    summary = err[err.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary).group(1).replace("-inf", "-99"))
    peak = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary)
    return i, float(peak.group(1).replace("-inf", "-99")) if peak else 0.0


def build(name, cue, work):
    parts = cue["parts"]
    n = min(MAX_ALTS, max(alternatives(p) for p in parts))
    folder = OUT / name
    folder.mkdir(parents=True, exist_ok=True)
    files, durations = [], []
    for k in range(n):
        wavs = [render(p, k, work) for p in parts]
        mixed = work / f"{name}-{k}.wav"
        inputs = sum((["-i", str(w)] for w in wavs), [])
        chains = [f"[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay={int(p['delay'] * 1000)}:all=1,volume={p['gain']}dB[a{i}]" for i, p in enumerate(parts)]
        mix = "".join(f"[a{i}]" for i in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0:duration=longest[m]"
        run(["ffmpeg", "-y", "-hide_banner", *inputs, "-filter_complex", ";".join(chains + [mix]), "-map", "[m]", str(mixed)])
        # Cut and fade, then the level: a common loudness, never past the ceiling (very short sounds have no
        # integrated loudness: they go by their peak).
        shaped = work / f"{name}-{k}-cut.wav"
        af = []
        if cue.get("cut"):
            fade = cue.get("fade", 0.25)
            af += [f"atrim=0:{cue['cut']}", f"afade=t=out:st={max(0, cue['cut'] - fade)}:d={fade}"]
        elif not cue.get("loop"):
            af += ["silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-70dB"]
        run(["ffmpeg", "-y", "-hide_banner", "-i", str(mixed), "-af", ",".join(af or ["anull"]), str(shaped)])
        lufs, peak = loudness(shaped)
        target = TARGET_LOOP if cue.get("loop") else TARGET
        gain = target - lufs if lufs > -70 else -6 - peak
        gain = min(gain, CEILING - peak)
        dest = folder / f"{k:02d}.ogg"
        run(["ffmpeg", "-y", "-hide_banner", "-i", str(shaped), "-af", f"volume={gain:.2f}dB", "-c:a", "libopus", "-b:a", "128k", str(dest)])
        dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(dest)]).stdout)
        files.append(dest.name)
        durations.append(round(dur, 2))
    return {"files": files, "seconds": durations, **({"loop": True} if cue.get("loop") else {})}


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else ""
    # Asked of the checkout that holds the private folder (a worktree's git won't answer about another path).
    if not PRIVADO.exists() or subprocess.run(["git", "-C", str(PRIVADO.parent), "check-ignore", "-q", "privado/sons/x"]).returncode != 0:
        raise SystemExit(f"{OUT} isn't a gitignored private folder: stopping")
    OUT.mkdir(parents=True, exist_ok=True)
    index_path = OUT / "index.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else {}
    with tempfile.TemporaryDirectory() as tmp:
        for name, cue in CUES.items():
            if not name.startswith(only):
                continue
            index[name] = build(name, cue, Path(tmp))
            print(f"{name}: {len(index[name]['files'])} × {index[name]['seconds']} s")
    index = {k: index[k] for k in CUES if k in index}
    index_path.write_text(json.dumps(index, indent=1, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
