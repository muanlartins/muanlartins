"""The camera filters' sound effects (public/stream/filtros.html, sfx.js): each moment of an ability as one short
file, made from the games' own sounds, which never leave public/stream/privado/ (gitignored).

  python3 scripts/filtros_sons.py            # every cue
  python3 scripts/filtros_sons.py phoenix-   # the cues starting with that

Its inputs are the extractions, re-run after a patch (Valorant closed, Luan not live):
  ~/.local/share/valorant-extract/run.sh <agent>   the agents' models and effects
  ~/.local/share/valorant-extract/sons.sh <agent>  their Wwise events: privado/valorant/<agent>/sons/wwiser/txtp/
  ~/.local/share/rl-extract/run.sh                      Rocket League's: privado/rocket-league/sons/<event>/NN.wav
A game made with FMOD (Celeste) needs no extraction: its installed banks are read as they are (FMOD_GAMES).

A Valorant cue renders the game's own event (its .txtp, written by wwiser from the event's bank) with vgmstream, so
its layers play together at the game's volumes; a random container gives one file per pick (up to MAX_ALTS), which
the page draws from. Loops come straight from the looped sound (sons/wav/), to loop seamlessly in the page.
An FMOD cue decodes one stream of the game's bank by its name (privado/<game>/<bank>-nomes.tsv lists every stream's
index and name; made here, ~2 min, when it's missing); a name with * gives one file per stream it matches.
Each file is brought to a common loudness (TARGET, quieter for loops), cut where the cue says, faded, and written as
Opus to privado/sons/<cue>/NN.ogg, with privado/sons/index.json listing them. Never deletes anything.
"""

import fnmatch
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Resolved: a worktree's is a link to the shared checkout's (whose git says it's ignored).
PRIVADO = (ROOT / "public/stream/privado").resolve()
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


# The FMOD games' banks, read where the game is installed (read-only; nothing is copied but the cues).
FMOD_GAMES = {"celeste": Path("/mnt/c/Program Files (x86)/Steam/steamapps/common/Celeste/Content/FMOD/Desktop")}


def F(name, bank="sfx", game="celeste", gain=0.0, delay=0.0):
    """One stream of an FMOD game's bank by its name (with * one per stream matched, as random picks)."""
    return {"kind": "fmod", "name": name, "bank": bank, "game": game, "gain": gain, "delay": delay}


# Each cue, from each filter's folder (public/stream/filtros/<folder>/sons.json, one cue a line): its parts, played
# together, each from `delay` seconds and `gain` dB (a Valorant event by its .txtp's name up to the variant, where
# {FP} is the caster's version and {TP} the others', with the agent's extraction it comes from, `agente`; a looped
# sound as it is, `wav`, under that agent's sons/wav/; a Rocket League event, `rl`; a stream of an FMOD game's bank by
# its name, `fmod`, with its `banco`, "sfx" by default, and `jogo`, "celeste"), `cut` (seconds kept, faded out over the
# last `fade`), `loop` (made to loop in the page).
def load_cues():
    cues = {}
    for path in sorted((ROOT / "public/stream/filtros").glob("*/sons.json")):
        for name, cue in json.loads(path.read_text()).items():
            parts = []
            for p in cue["parts"]:
                gain, delay = p.get("gain", 0.0), p.get("delay", 0.0)
                if "evento" in p:
                    parts.append(V(p["agente"], p["evento"].replace("{FP}", FP).replace("{TP}", TP), gain, delay))
                elif "wav" in p:
                    parts.append(W(p["agente"], p["wav"], gain, delay))
                elif "fmod" in p:
                    parts.append(F(p["fmod"], p.get("banco", "sfx"), p.get("jogo", "celeste"), gain, delay))
                else:
                    parts.append(RL(p["rl"], gain, delay))
            cues[name] = {**cue, "parts": parts}
    return cues


CUES = load_cues()


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


def fmod_streams(part):
    """The bank and the indices of an FMOD part's streams, by name from the bank's listing (made when missing)."""
    bank = FMOD_GAMES[part["game"]] / f"{part['bank']}.bank"
    listing = PRIVADO / part["game"] / f"{part['bank']}-nomes.tsv"
    if not listing.exists():
        meta = lambda i: run(["vgmstream-cli", "-m", "-s", str(i), str(bank)]).stdout
        count = int(re.search(r"stream count: (\d+)", meta(1)).group(1))
        rows = []
        for i in range(1, count + 1):
            name = re.search(r"stream name: (.*)", meta(i))
            rows.append(f"{i}\t{name.group(1).strip() if name else ''}\t\n")
        listing.parent.mkdir(parents=True, exist_ok=True)
        listing.write_text("".join(rows))
    names = {}
    for line in listing.read_text().splitlines():
        i, name = line.split("\t")[:2]
        names.setdefault(name, int(i))
    found = sorted(n for n in names if fnmatch.fnmatchcase(n, part["name"]))
    if not found:
        raise SystemExit(f"{part['game']} {part['bank']}: no stream named {part['name']!r}")
    return bank, [names[n] for n in found]


def alternatives(part):
    """How many random picks a part has."""
    if part["kind"] == "event":
        text = event_txtp(part["agent"], part["event"]).read_text(errors="replace")
        picks = [int(n) for n in re.findall(r"^\s*group = -R(\d+)>1", text, re.M)]
        return max(picks, default=1)
    if part["kind"] == "rl":
        return len(sorted((PRIVADO / "rocket-league/sons" / part["event"]).glob("*.wav")))
    if part["kind"] == "fmod":
        return len(fmod_streams(part)[1])
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
    elif part["kind"] == "fmod":
        bank, streams = fmod_streams(part)
        # -i: once through (a stream with loop points would play twice and fade).
        run(["vgmstream-cli", "-i", "-s", str(streams[k % len(streams)]), "-o", str(out), str(bank)])
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
