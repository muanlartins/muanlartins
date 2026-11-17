"""How Luan's aim moves, flick by flick, from Aimlabs' own replays on the stream PC into content/mira/<date>.json:
for each click task he played (Frogshot, Popshot, Angleshot…), whether his flicks stop short of the target
(undershoot) or go past it (overshoot), how much of the way the first movement covers, how many corrections follow,
whether he clicks still moving, how much the crosshair shakes before the click, and why each miss missed.

    python3 scripts/mira.py            # what it would write
    python3 scripts/mira.py --apply    # write it
    python3 scripts/mira.py --apply --detalhe <replay.avro>   # one replay's shots, to check the numbers

Aimlabs keeps each play's replay in AppData\\LocalLow\\Statespace\\aimlab_tb\\Users\\<id>\\Replay\\<play>.avro, beside
its header (<play>.json: the task, its stats, when it started), for its last 50 plays only, so run it after training
(the voltaic skill does, with scripts/voltaic.py). Nothing about the format is public; what's here was worked out on
2026-11-17 from his replays, and every play is checked against the header's own stats (shots, targets, hits) before it's
used: a replay that doesn't add up (another kind of task, a new Aimlabs) is skipped and says so.

The replay ("avro", but no Avro container: Avro's binary encoding of an unknown schema) is a flat sequence of tracks,
each an array of times then an array of values (arrays: a zigzag varint count, the items, 0x00). First the camera's:
its position, its rotation (Euler angles, pitch down positive, one key a frame), its scale, the weapon's animation
(name and clip time: a "Fire" whose clip time starts again is a shot), the FOV, and a 99999. Then each target's: a
header (a few varints, then when it spawned, when it died or -1, and -1; its values array has no end, the object's
tracks follow as if inside it), its position, rotation and scale, a colour and the 99999. Then something else, unread.

A shot hit when a target died within 30 ms of it (the header's hit count confirms it). The target's centre sits above
its position (calibrated per play from where the hits' rays passed), and its size is the 90th percentile of the hits'
distances from that centre. A shot's flick is the movement since the shot before (or the target's spawn): it starts
when the crosshair speeds up toward the target (the last frame under 10% of the peak), its first movement ends when
the speed drops under 30% of the peak, and any later speed peak is a correction. Along the line from the crosshair to
the target, the error is negative short of it and positive past it, measured against the target as it moves. A shot
that needed less than three target radii of movement is an adjustment, not a flick.

Nothing about other players and no ids: the task, when it was played, the numbers. A day's file keeps what it had.
"""

import argparse
import bisect
import json
import math
import statistics as st
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

from voltaic import AIMLABS, TIME_ZONE

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "mira"
MENOS1 = struct.pack("<f", -1.0)
# Click tasks fire one shot a click; tracking and switching tasks fire all the time (6000 "shots" a minute).
MAX_TIROS = 1000
# The curve: the distance to the target along the flick, as a share of the flick, at these ms since it started.
CURVA_MS = list(range(0, 801, 50))
# Where the first movement ends, as a share of the way: under 50%, then 5% bins up to 150%, then 150% and over.
FAIXAS = [0.5 + 0.05 * k for k in range(21)]
# Clicking while still moving: the crosshair, against the target, would cross the target's radius in less than this (s).
EM_MOVIMENTO = 0.05


# --- The replay ---------------------------------------------------------------------------------------------------


class Erro(Exception):
    pass


class Leitor:
    def __init__(self, b: bytes, i: int = 0):
        self.b, self.i = b, i

    def varint(self) -> int:
        r = s = 0
        while True:
            if self.i >= len(self.b) or s > 35:
                raise Erro("varint")
            c = self.b[self.i]
            self.i += 1
            r |= (c & 0x7F) << s
            s += 7
            if not c & 0x80:
                return (r >> 1) ^ -(r & 1)

    def fim(self):
        if self.i >= len(self.b) or self.b[self.i] != 0:
            raise Erro(f"no array end at {self.i}")
        self.i += 1

    def floats(self, k: int):
        if self.i + 4 * k > len(self.b):
            raise Erro("eof")
        v = struct.unpack_from(f"<{k}f", self.b, self.i)
        self.i += 4 * k
        return v

    def lista(self, item, maximo=200000):
        n = self.varint()
        if n == 0:
            return []
        if n < 0 or n > maximo:
            raise Erro(f"count {n} at {self.i}")
        v = [item() for _ in range(n)]
        self.fim()
        return v


def _numero(x: float) -> bool:
    return x == x and abs(x) < 1e7 and (x == 0 or abs(x) > 1e-30)


def _tempos(r: Leitor, duracao: float):
    t = [x[0] for x in r.lista(lambda: r.floats(1))]
    if not t or any(not _numero(x) or x < -1 or x > duracao for x in t) or any(b < a for a, b in zip(t, t[1:])):
        raise Erro("times")
    return t


def _cabecalho(r: Leitor):
    k = r.b.find(MENOS1, r.i)
    if not 0 < k - r.i < 24 or r.b[r.i] != 1 or r.b[r.i + 1] != 0:
        raise Erro("header")
    vivo = r.b[k + 4 : k + 8] == MENOS1
    em = k - 4 if vivo else k - 8
    r.i = em
    nasce, morre, _ = r.floats(3)
    return {"nasce": nasce, "morre": None if morre < 0 else morre}


def _texto(r: Leitor):
    n = r.varint()
    s = r.b[r.i : r.i + n]
    if not 0 < n < 64 or not all(32 <= c < 127 for c in s):
        raise Erro("text")
    r.i += n
    return (s.decode(), r.floats(1)[0])


TIPOS = [
    ("vec3", lambda r: r.floats(3)),
    ("float", lambda r: r.floats(1)[0]),
    ("vec4s", lambda r: r.lista(lambda: r.floats(4), 64)),
    ("texto", _texto),
    ("vec4", lambda r: r.floats(4)),
    ("vec2", lambda r: r.floats(2)),
]


def _segue_trilha(b: bytes, i: int, duracao: float) -> bool:
    if i == len(b):
        return True
    try:
        _tempos(Leitor(b, i), duracao)
        return True
    except (Erro, struct.error, IndexError):
        return False


def ler_replay(b: bytes, duracao: float):
    """The camera's tracks and each target's, as far as they read."""
    r = Leitor(b)
    objetos = [{"cabecalho": None, "trilhas": []}]
    while r.i < len(b):
        inicio = r.i
        try:
            t = _tempos(r, duracao)
        except (Erro, struct.error, IndexError):
            break
        depois = r.i
        achou = None
        if b[r.i : r.i + 3] == bytes([2, 1, 0]) and len(t) == 1:
            try:
                r.varint()
                h = _cabecalho(r)
                if _segue_trilha(b, r.i, duracao):
                    objetos.append({"cabecalho": h, "trilhas": []})
                    continue
            except (Erro, struct.error, IndexError):
                pass
            r.i = depois
        for nome, item in TIPOS:
            r.i = depois
            try:
                v = r.lista(lambda: item(r))
            except (Erro, struct.error, IndexError, UnicodeDecodeError):
                continue
            if len(v) != len(t):
                continue
            if nome in ("vec3", "vec4", "vec2") and not all(_numero(c) for x in v for c in x):
                continue
            if nome == "float" and not all(_numero(x) for x in v):
                continue
            if _segue_trilha(b, r.i, duracao):
                achou = (nome, v)
                break
        if not achou:
            r.i = inicio
            break
        objetos[-1]["trilhas"].append({"tipo": achou[0], "t": t, "v": achou[1]})
    return objetos


# --- The analysis ---------------------------------------------------------------------------------------------------


def _interp(t, v, x):
    i = bisect.bisect_right(t, x) - 1
    if i < 0:
        return v[0]
    if i >= len(t) - 1:
        return v[-1]
    f = (x - t[i]) / (t[i + 1] - t[i]) if t[i + 1] > t[i] else 0.0
    return tuple(a + (b - a) * f for a, b in zip(v[i], v[i + 1]))


def _tiros(t, v):
    out, antes = [], None
    for ti, (nome, clip) in zip(t, v):
        if nome == "Fire" and (antes is None or antes[0] != "Fire" or clip < antes[1]):
            out.append(ti)
        antes = (nome, clip)
    return out


def _camera(rot):
    """Pitch (down positive) and yaw per key, both continuous (no jumps at ±180)."""
    out, ultimo = [], None
    for p, y, _ in rot:
        p = (p + 180) % 360 - 180
        if ultimo is not None:
            y = ultimo + ((y - ultimo + 180) % 360 - 180)
        out.append((p, y))
        ultimo = y
    return out


def _tendencia(amostras):
    """RMS of what's left of (t, x, y) samples once a straight line in time is taken off each axis."""
    n = len(amostras)
    if n < 4:
        return None
    ts = [a[0] for a in amostras]
    mt = sum(ts) / n
    stt = sum((t - mt) ** 2 for t in ts) or 1e-9
    soma = 0.0
    for eixo in (1, 2):
        xs = [a[eixo] for a in amostras]
        mx = sum(xs) / n
        k = sum((t - mt) * (x - mx) for t, x in zip(ts, xs)) / stt
        soma += sum((x - mx - k * (t - mt)) ** 2 for t, x in zip(ts, xs)) / n
    return math.sqrt(soma)


def analisar(b: bytes, cabecalho: dict):
    """One play's shots and flicks, or why it can't be read."""
    duracao = float(cabecalho.get("duration") or 60) + 30
    objetos = ler_replay(b, duracao)
    cam = objetos[0]["trilhas"]
    vec3 = [tr for tr in cam if tr["tipo"] == "vec3"]
    arma = [tr for tr in cam if tr["tipo"] == "texto"]
    if len(vec3) < 2 or not arma:
        return None, "the camera's tracks aren't there"
    pos_cam = vec3[0]["v"][0]
    T, A = vec3[1]["t"], _camera(vec3[1]["v"])
    shots = _tiros(arma[0]["t"], arma[0]["v"])
    alvos = []
    for o in objetos[1:]:
        v3 = [tr for tr in o["trilhas"] if tr["tipo"] == "vec3"]
        if v3:
            alvos.append({**o["cabecalho"], "pos": (v3[0]["t"], v3[0]["v"])})
    perf = cabecalho.get("performanceData") or {}
    if len(shots) != perf.get("shotsTotal") or len(alvos) != perf.get("targetsTotal"):
        return None, f"{len(shots)} shots and {len(alvos)} targets read, the header says {perf.get('shotsTotal')} and {perf.get('targetsTotal')}"

    def morto_por(ts):
        perto = [a for a in alvos if a["morre"] is not None and abs(a["morre"] - ts) <= 0.03]
        return min(perto, key=lambda a: abs(a["morre"] - ts)) if perto else None

    acertos = [(ts, morto_por(ts)) for ts in shots]
    n_acertos = sum(1 for _, a in acertos if a)
    if abs(n_acertos - (perf.get("hitsTotal") or 0)) > max(2, 0.05 * n_acertos):
        return None, f"{n_acertos} hits read, the header says {perf.get('hitsTotal')}"

    def mira(x):
        return _interp(T, A, x)

    # The target's centre above its position: where the hits' rays passed it.
    alturas = []
    for ts, a in acertos:
        if a:
            p = _interp(*a["pos"], ts)
            h = math.hypot(p[0] - pos_cam[0], p[2] - pos_cam[2])
            alturas.append(pos_cam[1] - math.tan(math.radians(mira(ts)[0])) * h - p[1])
    dy = st.median(alturas) if alturas else 0.0

    def erro(a, x):
        """Crosshair minus the target's centre, in degrees on screen (yaw scaled by the pitch's cosine), and its distance."""
        c = mira(x)
        p = _interp(*a["pos"], x)
        dx, dyy, dz = p[0] - pos_cam[0], p[1] + dy - pos_cam[1], p[2] - pos_cam[2]
        h = math.hypot(dx, dz)
        pit = -math.degrees(math.atan2(dyy, h))
        yaw = math.degrees(math.atan2(dx, dz))
        yaw = c[1] + ((yaw - c[1] + 180) % 360 - 180)
        return ((c[1] - yaw) * math.cos(math.radians(pit)), c[0] - pit), math.sqrt(h * h + dyy * dyy)

    distancias = sorted(math.tan(math.radians(math.hypot(*erro(a, ts)[0]))) * erro(a, ts)[1] for ts, a in acertos if a)
    raio_w = distancias[int(0.9 * (len(distancias) - 1))] if distancias else 0.5

    def velocidade(i):
        if i <= 0 or i >= len(T) or T[i] <= T[i - 1]:
            return 0.0
        return math.hypot((A[i][1] - A[i - 1][1]) * math.cos(math.radians(A[i][0])), A[i][0] - A[i - 1][0]) / (T[i] - T[i - 1])

    tiros = []
    antes = 0.0
    for ts, a in acertos:
        acertou = a is not None
        if not a:
            vivos = [x for x in alvos if x["nasce"] <= ts and (x["morre"] is None or x["morre"] > ts)]
            if not vivos:
                antes = ts
                continue
            a = min(vivos, key=lambda x: math.hypot(*erro(x, ts)[0]))
        de = max(antes, a["nasce"])
        antes = ts
        i0 = bisect.bisect_left(T, de)
        i1 = bisect.bisect_right(T, ts) - 1
        (fx, fy), dist_f = erro(a, ts)
        raio = math.degrees(math.atan2(raio_w, dist_f))
        tiro = {"acertou": acertou, "erro": math.hypot(fx, fy), "raio": raio}
        tiros.append(tiro)
        if i1 - i0 < 3:
            tiro["tipo"] = "ajuste"
            continue
        vs = [velocidade(i) for i in range(i0, i1 + 1)]
        ipico = max(range(len(vs)), key=lambda k: vs[k])
        pico = vs[ipico]
        k0 = ipico
        while k0 > 0 and vs[k0 - 1] >= max(15.0, 0.1 * pico):
            k0 -= 1
        t0 = T[i0 + k0 - 1] if k0 > 0 else T[i0]
        (ex, ey), dist0 = erro(a, t0)
        amp = math.hypot(ex, ey)
        tiro["amp"] = amp
        if amp < 3 * math.degrees(math.atan2(raio_w, dist0)):
            tiro["tipo"] = "ajuste"
            continue
        ux, uy = -ex / amp, -ey / amp

        def ao_longo(x):
            (gx, gy), _ = erro(a, x)
            return gx * ux + gy * uy

        trajeto = [(T[i], ao_longo(T[i])) for i in range(i0 + max(0, k0 - 1), i1 + 1)] + [(ts, fx * ux + fy * uy)]
        k1 = ipico
        while k1 < len(vs) - 1 and vs[k1] > 0.3 * pico:
            k1 += 1
        resta = -ao_longo(T[i0 + k1])
        correcoes = sum(1 for k in range(k1 + 1, len(vs) - 1) if vs[k] > vs[k - 1] and vs[k] >= vs[k + 1] and vs[k] > max(20.0, 0.15 * pico))
        # The crosshair against the target in the last frame before the click.
        (px, py), _ = erro(a, T[max(i1 - 1, 0)])
        dt = ts - T[max(i1 - 1, 0)]
        rel = math.hypot(fx - px, fy - py) / dt if dt > 0.004 else None
        final = [(T[i], *erro(a, T[i])[0]) for i in range(bisect.bisect_left(T, ts - 0.15), i1 + 1)]
        tiro.update(
            {
                "tipo": "flick",
                "reacao": t0 - de,
                "movimento": ts - t0,
                "cobre": max(0.0, min(1.5, 1 - resta / amp)),
                "curto": resta > raio,
                "passou": max(p for _, p in trajeto) > raio,
                "correcoes": correcoes,
                "vel_clique": rel,
                "tremor": _tendencia(final),
                "ao_longo": fx * ux + fy * uy,
                "curva": [(t - t0, p / amp) for t, p in trajeto],
            }
        )
    return {"tiros": tiros, "acertos": n_acertos, "n_tiros": len(shots)}, None


def _mediana(xs, casas=None):
    xs = [x for x in xs if x is not None]
    if not xs:
        return None
    m = st.median(xs)
    return round(m, casas) if casas is not None else round(m)


def _curva(flicks):
    """The median of the flicks' distance to the target (a share of the flick) at each of CURVA_MS, while at least a
    third of them are still going."""
    out = []
    for ms in CURVA_MS:
        x = ms / 1000
        vals = []
        for f in flicks:
            c = f["curva"]
            if c[-1][0] < x:
                continue
            ts = [p[0] for p in c]
            i = bisect.bisect_right(ts, x) - 1
            if i < 0:
                vals.append(c[0][1])
                continue
            j = min(i + 1, len(c) - 1)
            g = (x - c[i][0]) / (c[j][0] - c[i][0]) if c[j][0] > c[i][0] else 0
            vals.append(c[i][1] + (c[j][1] - c[i][1]) * g)
        if len(vals) * 3 < len(flicks) or not vals:
            break
        out.append(round(st.median(vals), 3))
    return out


def resumo(analise: dict):
    """One play's numbers for the site."""
    tiros = analise["tiros"]
    flicks = [t for t in tiros if t["tipo"] == "flick"]
    if len(flicks) < 10:
        return None
    erros = [t for t in flicks if not t["acertou"]]
    lados = {"curto": 0, "passou": 0, "lado": 0}
    for t in erros:
        lados["curto" if t["ao_longo"] < -t["raio"] else "passou" if t["ao_longo"] > t["raio"] else "lado"] += 1
    medidos = [t for t in flicks if t["vel_clique"] is not None]
    movendo = [t for t in medidos if t["vel_clique"] * EM_MOVIMENTO > t["raio"]]
    parados = [t for t in medidos if t["vel_clique"] * EM_MOVIMENTO <= t["raio"]]
    return {
        "tiros": analise["n_tiros"],
        "acertos": analise["acertos"],
        "flicks": len(flicks),
        "ajustes": len(tiros) - len(flicks),
        "amplitude": _mediana([t["amp"] for t in flicks], 1),
        "alvo": _mediana([t["raio"] for t in flicks], 2),
        "curto": round(sum(t["curto"] for t in flicks) / len(flicks), 3),
        "passou": round(sum(t["passou"] for t in flicks) / len(flicks), 3),
        "cobre": _mediana([t["cobre"] for t in flicks], 3),
        "correcoes": round(st.mean(t["correcoes"] for t in flicks), 2),
        "reacao": _mediana([t["reacao"] * 1000 for t in flicks]),
        "movimento": _mediana([t["movimento"] * 1000 for t in flicks]),
        "em_movimento": round(len(movendo) / len(medidos), 3) if medidos else None,
        "acerto_parado": _taxa(parados),
        "acerto_movendo": _taxa(movendo),
        "tremor": _mediana([t["tremor"] for t in flicks], 3),
        "erros": lados,
        "curva": _curva(flicks),
        "primeiro": _faixas([t["cobre"] for t in flicks]),
    }


def _faixas(cobre):
    contagem = [0] * (len(FAIXAS) + 1)
    for c in cobre:
        contagem[bisect.bisect_right(FAIXAS, c + 1e-9)] += 1
    return contagem


def _taxa(tiros):
    return round(sum(t["acertou"] for t in tiros) / len(tiros), 3) if len(tiros) >= 5 else None


# --- The files ------------------------------------------------------------------------------------------------------


def replays():
    """Every click task's replay Aimlabs still has, oldest first: (header, .avro path)."""
    if not AIMLABS.exists():
        raise SystemExit(f"Aimlabs has no profiles at {AIMLABS}: is it installed on this PC?")
    out = []
    for pasta in sorted(AIMLABS.glob("*/Replay")):
        for header in pasta.glob("*.json"):
            try:
                cab = json.loads(header.read_text(encoding="utf-8-sig"))
            except (OSError, ValueError):
                continue
            avro = header.with_suffix(".avro")
            shots = (cab.get("performanceData") or {}).get("shotsTotal") or 0
            if avro.exists() and 0 < shots <= MAX_TIROS and cab.get("startedAt"):
                out.append((cab, avro))
    return sorted(out, key=lambda x: x[0]["startedAt"])


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write the files (otherwise only list what changes)")
    parser.add_argument("--detalhe", help="one replay (.avro, its .json beside it): print each flick")
    args = parser.parse_args()

    if args.detalhe:
        avro = Path(args.detalhe)
        cab = json.loads(avro.with_suffix(".json").read_text(encoding="utf-8-sig"))
        analise, motivo = analisar(avro.read_bytes(), cab)
        if not analise:
            raise SystemExit(motivo)
        for t in analise["tiros"]:
            print({k: (round(v, 3) if isinstance(v, float) else v) for k, v in t.items() if k != "curva"})
        print(json.dumps(resumo(analise), ensure_ascii=False))
        return

    dias: dict[str, dict[str, dict]] = {}
    for cab, avro in replays():
        inicio = datetime.fromtimestamp(cab["startedAt"] / 1000, timezone.utc).replace(microsecond=0)
        at = inicio.isoformat().replace("+00:00", "Z")
        nome = cab.get("taskName") or "?"
        analise, motivo = analisar(avro.read_bytes(), cab)
        if not analise:
            print(f"  skipped {nome} at {at}: {motivo}")
            continue
        numeros = resumo(analise)
        if not numeros:
            print(f"  skipped {nome} at {at}: fewer than 10 flicks")
            continue
        jogada = {"at": at, "task": cab.get("taskId"), "name": nome, **numeros}
        if cab.get("pauseDuration"):
            jogada["pause"] = round(cab["pauseDuration"] / 1000, 1)
        dia = inicio.astimezone(TIME_ZONE).date().isoformat()
        dias.setdefault(dia, {})[at] = jogada

    mudou = 0
    for dia, achadas in sorted(dias.items()):
        caminho = OUT / f"{dia}.json"
        antes = {j["at"]: j for j in json.loads(caminho.read_text())["plays"]} if caminho.exists() else {}
        novas = sorted({**achadas, **antes}.values(), key=lambda j: j["at"])
        if caminho.exists() and json.loads(caminho.read_text())["plays"] == novas:
            continue
        mudou += 1
        print(f"{dia}: {len(novas)} plays ({len(novas) - len(antes):+d})")
        if args.apply:
            OUT.mkdir(parents=True, exist_ok=True)
            caminho.write_text(json.dumps({"date": dia, "plays": novas}, ensure_ascii=False, indent=1) + "\n")
    if not mudou:
        print("Nothing new.")
    elif not args.apply:
        print("(dry run: --apply writes them)")


if __name__ == "__main__":
    sys.exit(main())
