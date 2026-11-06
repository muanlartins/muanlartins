"""The game's sound, put back into a studio take that recorded none.

    scripts/.venv/bin/python scripts/som_do_jogo.py "<take>.mp4" --partida 9            # what it found
    scripts/.venv/bin/python scripts/som_do_jogo.py "<take>.mp4" --partida 9 --apply    # writes "<take> (com jogo).mp4"

A take recorded with RLR's studio (OBS's Vídeo or Shorts profile) should carry the browser's sound on track 3. If OBS
listened to the wrong browser it's silent, but the picture says what the studio was playing: the day's Jogo.mp4 (the
game alone, its track 1 the game's sound alone), at some place and speed. So this lines the take's picture up with
Jogo.mp4 and rebuilds that sound:

1. Fingerprints: small grey frames of the take (5 a second) and of Jogo.mp4 around the match (`--partida`, numbered as
   `videos.py` numbers the day's replays; its window comes from the session in content/matches/), 10 a second.
   A commented video (1920×1080) has Jogo filling the screen (minus his camera, bottom left, and the studio's
   controls, at the bottom) or, while the replay's 3D is on, in the corner at the top right; a short (1080×1920) has
   the studio's picture at the screen's top left (Jogo cut to its middle to fill 1080×1056), under the browser's bars
   when it wasn't full screen (`--barra`, 80 px for Brave's).
2. Each take frame's best match in Jogo (normalised correlation); runs of matches that move at one of the studio's
   speeds (¼, ½, 1, 2×, or 0 when paused) become segments: take second t shows Jogo second a + r·t.
   Stretches nobody matched (the short's 3D, which hides the video) are bridged when the segments on both sides are
   the same line; otherwise they stay silent.
3. The sound: each playing segment's stretch of Jogo's game track, at its speed (atempo: the browser keeps the
   pitch), with short fades at the joins; silence while paused or unknown. Mixed under his microphone, the game
   12 dB under his speech and ducked a further 6 dB while he talks.

The output keeps the take's picture as is and has tracks 1 Tudo (the new mix), 2 Microfone, 3 Jogo (the rebuilt
sound). The take itself isn't touched. numpy is in scripts/.venv (requirements.txt).
"""

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from content import ROOT  # noqa: E402
from live import FFMPEG  # noqa: E402
from windows import TEMP, VIDEOS, to_windows  # noqa: E402

TAKE_FPS = 10
JOGO_FPS = 30
TOLERANCE = 0.07  # seconds off its line a match may be (Jogo's frames are 1/30 s apart)
RATES = [0.0, 0.25, 0.5, 1.0, 2.0]
GOOD = 0.7  # correlation for a match worth considering: a run of them on one line is what counts
SAMPLE_RATE = 48000
FADE = 0.02  # seconds at each join
UNDER_SPEECH_DB = -12
DUCK_DB = -6
# Jogo.mp4 runs behind the stream's recording (it starts when the game is first on screen): measured on 11-06 by
# cross-correlating its sound with Live.mp4's game track, 83.63 s at its second 1200 and 83.97 s at 8200.
JOGO_BEHIND = 83.8
MARGIN = 30  # seconds of Jogo searched around the match

W, H = 64, 36  # a commented video's fingerprint
SW, SH = 56, 50  # a short's


def ffmpeg(*args, check=True):
    return subprocess.run([str(FFMPEG / "ffmpeg.exe"), "-hide_banner", "-loglevel", "error", *args], cwd="/mnt/c",
                          capture_output=True, check=check)


def frames(path: Path, start: float, seconds: float | None, fps: int, chain: str, w: int, h: int) -> np.ndarray:
    """Grey frames, w×h, `fps` a second, through the filter chain `chain` (crops and scales)."""
    span = ["-t", f"{seconds:.3f}"] if seconds else []
    out = ffmpeg("-hwaccel", "cuda", "-ss", f"{start:.3f}", *span, "-i", to_windows(path), "-an",
                 "-vf", f"fps={fps},{chain},format=gray", "-f", "rawvideo", "-").stdout
    return np.frombuffer(out, np.uint8).reshape(-1, h, w).astype(np.float32)


def normalise(prints: np.ndarray, mask: np.ndarray | None = None) -> np.ndarray:
    flat = prints.reshape(len(prints), -1)
    if mask is not None:
        flat = flat[:, mask.reshape(-1)]
    flat = flat - flat.mean(axis=1, keepdims=True)
    return flat / (np.linalg.norm(flat, axis=1, keepdims=True) + 1e-6)


def match_window(take: Path, number: int) -> tuple[Path, float, float]:
    """Jogo.mp4 of the take's day and the stretch of it (start, end in its seconds) that holds match `number`."""
    day = re.match(r"(\d{4}-\d{2}-\d{2})", take.name).group(1)
    jogo = sorted((VIDEOS / "Lives" / day).glob("??-??-?? Jogo.mp4"))[-1]
    matches, recording = [], None
    for path in sorted((ROOT / "content" / "matches").glob(f"{day}-*.json")):
        if path.name.endswith(".events.json"):
            continue
        session = json.loads(path.read_text())
        recording = recording or next((o["start"] for o in session.get("outputs", []) if o["kind"] == "record"), None)
        matches += session["matches"]
    matches.sort(key=lambda m: m.get("start") or m["at"])
    match = matches[number - 1]
    at = lambda iso: (datetime.fromisoformat(iso.replace("Z", "+00:00")) -
                      datetime.fromisoformat(recording.replace("Z", "+00:00"))).total_seconds() - JOGO_BEHIND
    start = at(match["start"]) if match.get("start") else at(match["at"]) - 600
    return jogo, max(0, start - MARGIN), at(match["at"]) + MARGIN


def fingerprints(take: Path, jogo: Path, start: float, end: float, bar: int):
    """(take times, take prints as a list of (prints, mask) views, Jogo times, Jogo prints per view)."""
    probe = subprocess.run([str(FFMPEG / "ffmpeg.exe"), "-hide_banner", "-i", to_windows(take)], cwd="/mnt/c",
                           capture_output=True).stderr.decode(errors="replace")
    width, height = map(int, re.search(r"Video: .*?, (\d{3,4})x(\d{3,4})", probe).groups())
    if width < height:  # a short: the studio's picture, Jogo cut to fill 1080×1056 (object-fit: cover)
        scale = max(1080 / 1920, 1056 / 1080)
        left = (1920 * scale - 1080) / 2 / scale
        bottom = min(1056, 1032 - bar)  # the taskbar shows below the screen's 1032nd row
        shown_h = bottom / scale
        take_chain = f"crop=1080:{bottom}:0:{bar},scale={SW}:{SH}"
        jogo_chain = f"crop={round(1080 / scale)}:{round(shown_h)}:{round(left)}:0,scale={SW}:{SH}"
        take_views = [(frames(take, 0, None, TAKE_FPS, take_chain, SW, SH), None)]
        jogo_views = [frames(jogo, start, end - start, JOGO_FPS, jogo_chain, SW, SH)]
        pairs = [(0, 0)]
    else:  # a commented video: Jogo full screen, or in the corner while the 3D is on
        mask = np.ones((H, W), bool)
        mask[round(680 / 1080 * H):, :round(560 / 1920 * W)] = False  # his camera and its frame
        mask[round(990 / 1080 * H):, :] = False  # the studio's controls, when they show
        full = frames(take, 0, None, TAKE_FPS, f"scale={W}:{H}", W, H)
        corner = frames(take, 0, None, TAKE_FPS, f"crop=286:160:1609:145,scale={W}:{H}", W, H)
        take_views = [(full, mask), (corner, None)]
        whole = frames(jogo, start, end - start, JOGO_FPS, f"scale={W}:{H}", W, H)
        jogo_views = [whole]
        pairs = [(0, 0), (1, 0)]
    times = np.arange(len(take_views[0][0])) / TAKE_FPS
    jogo_times = start + np.arange(len(jogo_views[0])) / JOGO_FPS
    best = np.full(len(times), -1.0)
    where = np.zeros(len(times))
    for take_i, jogo_i in pairs:
        prints, mask = take_views[take_i]
        a = normalise(prints, mask)
        b = normalise(jogo_views[jogo_i], mask)
        for i in range(0, len(a), 2000):
            scores = a[i:i + 2000] @ b.T
            j = scores.argmax(axis=1)
            s = scores[np.arange(len(j)), j]
            better = s > best[i:i + 2000]
            best[i:i + 2000][better] = s[better]
            where[i:i + 2000][better] = jogo_times[j[better]]
    return times, where, best


def segments(times: np.ndarray, where: np.ndarray, score: np.ndarray):
    """Runs of matches moving at one of the studio's speeds: [(t0, t1, rate, offset)], Jogo = offset + rate·t.

    From each match not yet in a run, every speed's line through it is followed as far as the matches keep to it
    (a couple of stray frames are let through); the longest wins, so pauses, plays and seeks split it naturally.
    """
    good = score >= GOOD
    step = 1 / TAKE_FPS
    n = len(times)
    found = []
    i = 0
    while i < n:
        if not good[i]:
            i += 1
            continue
        best = None
        for r in RATES:
            a = where[i] - r * times[i]
            j, last, misses = i, i, 0
            while j + 1 < n and misses <= 2:
                j += 1
                if good[j] and abs(where[j] - (a + r * times[j])) <= TOLERANCE:
                    last, misses = j, 0
                else:
                    misses += 1
            if best is None or last - i > best[0]:
                best = (last - i, r, a, last)
        length, r, a, last = best
        if length < 4:  # under half a second on one line: noise or scrubbing
            i += 1
            continue
        idx = np.arange(i, last + 1)
        idx = idx[good[idx] & (np.abs(where[idx] - (a + r * times[idx])) <= TOLERANCE)]
        a = float(np.median(where[idx] - r * times[idx]))
        found.append([times[i] - step / 2, times[last] + step / 2, r, a])
        i = last + 1
    # A gap between two stretches of the same line (the short's 3D hides the video): the video went on playing.
    merged = []
    for seg in found:
        if merged and seg[2] == merged[-1][2] and abs(seg[3] - merged[-1][3]) < TOLERANCE and seg[0] - merged[-1][1] < 12:
            merged[-1][1] = seg[1]
        else:
            merged.append(seg)
    for before, after in zip(merged, merged[1:]):
        after[0] = max(after[0], before[1])
    return [tuple(s) for s in merged]


def pcm(path: Path, stream: str, start: float = 0, seconds: float | None = None) -> np.ndarray:
    span = ["-t", f"{seconds:.3f}"] if seconds else []
    out = ffmpeg("-ss", f"{start:.3f}", *span, "-i", to_windows(path), "-map", stream, "-vn", "-ac", "2",
                 "-ar", str(SAMPLE_RATE), "-f", "f32le", "-").stdout
    return np.frombuffer(out, np.float32).reshape(-1, 2).copy()


def stretched(audio: np.ndarray, rate: float) -> np.ndarray:
    """`audio` played at `rate`, keeping its pitch, as the browser does."""
    if rate == 1:
        return audio
    tempo = "atempo=0.5,atempo=0.5" if rate == 0.25 else f"atempo={rate}"
    out = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", str(SAMPLE_RATE),
                          "-ac", "2", "-i", "-", "-af", tempo, "-f", "f32le", "-"],
                         input=audio.tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).reshape(-1, 2).copy()


def game_track(found, length: float, jogo: Path, start: float, end: float) -> np.ndarray:
    source = pcm(jogo, "0:a:0", start, end - start)
    out = np.zeros((int(length * SAMPLE_RATE), 2), np.float32)
    fade = int(FADE * SAMPLE_RATE)
    for t0, t1, rate, offset in found:
        if rate == 0:
            continue
        t0, t1 = max(0, t0), min(length, t1)
        u0 = offset + rate * t0
        need = int((t1 - t0) * SAMPLE_RATE)
        a = int((u0 - start) * SAMPLE_RATE)
        b = a + int(need * rate) + SAMPLE_RATE // 10
        if a < 0 or b > len(source):
            continue
        piece = stretched(source[a:b], rate)[:need]
        ramp = np.ones(len(piece), np.float32)
        n = min(fade, len(piece) // 2)
        ramp[:n] = np.linspace(0, 1, n)
        ramp[len(piece) - n:] = np.linspace(1, 0, n)
        at = int(t0 * SAMPLE_RATE)
        out[at:at + len(piece)] += piece * ramp[:, None]
    return out


def mix(mic: np.ndarray, game: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(Tudo, the game at the level it's mixed at): the game 12 dB under his speech, ducked 6 dB more while he talks."""
    n = min(len(mic), len(game))
    mic, game = mic[:n], game[:n]
    hop = SAMPLE_RATE // 20
    env = np.sqrt(np.convolve((mic ** 2).mean(axis=1), np.ones(hop) / hop, mode="same"))
    db = 20 * np.log10(env + 1e-9)
    speech = db > -45
    playing = np.sqrt(np.convolve((game ** 2).mean(axis=1), np.ones(hop) / hop, mode="same")) > 1e-4
    rms = lambda x: float(np.sqrt((x ** 2).mean()) + 1e-9)
    voice = rms(mic[speech]) if speech.any() else 0.05
    level = rms(game[playing]) if playing.any() else 1.0
    base = voice / level * 10 ** (UNDER_SPEECH_DB / 20)
    # The duck: down in 30 ms when he speaks, back up over 300 ms after.
    target = np.where(speech, 10 ** (DUCK_DB / 20), 1.0).astype(np.float32)
    gain = np.empty_like(target)
    g = 1.0
    down, up = 1 - np.exp(-1 / (0.03 * SAMPLE_RATE)), 1 - np.exp(-1 / (0.3 * SAMPLE_RATE))
    for i in range(0, len(target), hop):  # per 50 ms block, smooth enough
        want = target[i]
        g += (want - g) * (1 - (1 - (down if want < g else up)) ** hop)
        gain[i:i + hop] = g
    bed = game * (base * gain)[:, None]
    tudo = np.clip(mic + bed, -1, 1)
    return tudo, bed


def write_wav(audio: np.ndarray, path: Path):
    ffmpeg_in = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "f32le",
                                "-ar", str(SAMPLE_RATE), "-ac", "2", "-i", "-", "-c:a", "pcm_f32le", str(path)],
                               input=audio.astype(np.float32).tobytes(), check=True)
    return ffmpeg_in


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("take", type=Path)
    parser.add_argument("--partida", type=int, required=True, help="the match, numbered as in the day's Replays")
    parser.add_argument("--barra", type=int, default=0, help="a short's browser bars, in px (Brave's: 80)")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--mapa", type=Path, help="the matches and segments, saved here (JSON); read back if it exists")
    args = parser.parse_args()
    take = args.take
    jogo, start, end = match_window(take, args.partida)
    print(f"Jogo: {jogo.name} {start:.0f}–{end:.0f} s")
    if args.mapa and args.mapa.exists():  # matched before: the matches again, the segments afresh
        saved = json.loads(args.mapa.read_text())
        times, where, score = (np.array(saved[key]) for key in ("times", "where", "score"))
    else:
        times, where, score = fingerprints(take, jogo, start, end, args.barra)
    found = segments(times, where, score)
    length = len(times) / TAKE_FPS
    covered = sum(t1 - t0 for t0, t1, _, _ in found)
    playing = sum(t1 - t0 for t0, t1, r, _ in found if r > 0)
    print(f"{length:.0f} s de take, {(score >= GOOD).mean():.0%} dos quadros reconhecidos; "
          f"{covered / length:.0%} em trechos ({playing:.0f} s tocando)")
    for t0, t1, rate, offset in found:
        speed = "parado" if rate == 0 else f"{rate:g}×"
        print(f"  {t0:7.1f}–{t1:7.1f}  {speed:>6}  Jogo {offset + rate * t0:8.2f}")
    if args.mapa:
        args.mapa.write_text(json.dumps({"times": times.tolist(), "where": where.tolist(), "score": score.tolist(),
                                         "segments": found}))
    if not args.apply:
        print("(nada foi escrito: rode com --apply)")
        return
    game = game_track(found, length, jogo, start, end)
    mic = pcm(take, "0:a:1")
    tudo, bed = mix(mic, game)
    stem = take.with_suffix("").name
    tudo_wav, game_wav = TEMP / f"{stem} tudo.wav", TEMP / f"{stem} jogo.wav"
    write_wav(tudo, tudo_wav)
    write_wav(bed, game_wav)
    out = take.with_name(f"{stem} (com jogo).mp4")
    ffmpeg("-y", "-i", to_windows(take), "-i", to_windows(tudo_wav), "-i", to_windows(game_wav),
           "-map", "0:v", "-map", "1:a", "-map", "0:a:1", "-map", "2:a", "-c:v", "copy",
           "-c:a", "aac", "-b:a", "192k", "-metadata:s:a:0", "title=Tudo", "-metadata:s:a:1", "title=Microfone",
           "-metadata:s:a:2", "title=Jogo", "-disposition:a:0", "default", "-disposition:a:1", "0", "-disposition:a:2", "0", "-movflags", "+faststart", to_windows(out))
    tudo_wav.unlink()
    game_wav.unlink()
    print(f"→ {out.name}")


if __name__ == "__main__":
    main()
