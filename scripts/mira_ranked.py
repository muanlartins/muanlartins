"""How Luan's aim moves in Valorant's matches, from their replays, measured as scripts/mira.py measures Aimlabs, into
content/mira-ranked/<date>.json: per match, the flicks that stop short of the head and that go past it, how much of the
way the first movement covers, the corrections, clicking while the crosshair still moves, the shake before the click,
why the misses missed and the median flick as a curve (the very same function, mira.medir, measures both), and what
only a match has: how many shots hit and where, the first shot of each fight standing or walking, and how far above or
below the head the crosshair sat before the fight. Luan, 2026-11-20: his training's aim against his matches' aim.

    python3 scripts/mira_ranked.py            # what it would write (run with uv, below)
    python3 scripts/mira_ranked.py --apply    # write it
    python3 scripts/mira_ranked.py --detalhe <replay.vrf>   # one replay's checks and numbers

    uv run --no-project -q --with polars --with pyarrow --with numpy python3 scripts/mira_ranked.py

The replays are Valorant's own (`%LOCALAPPDATA%\\VALORANT\\Saved\\Demos\\<match>.vrf`: the "Download" button after a
match, or scripts/valorant.py by itself), recorded on the game's server: every player's position, velocity and view
(yaw and pitch, 1/65536 of a turn) 128 times a second, each gun's magazine, each hit with the bone, the impact point
and the shot's origin. They're read by vrfkit (github.com/yakisoba0728/vrfkit, Apache-2.0, not Riot's), built outside
the repository in ~/.local/share/vrfkit:

    git clone https://github.com/yakisoba0728/vrfkit ~/.local/share/vrfkit
    cd ~/.local/share/vrfkit && cargo build --release -p vrfkit --features export --locked

Riot scrambles each patch's replays its own way, so a new patch needs vrfkit's update (`git pull` and the build
again) before its replays read; until then this skips them, saying so, and reads them once it can (the files stay).

What it takes from a replay (Luan's account: the one of the game's config folders, `Saved\\Config\\<puuid>-<region>`,
that played the match): his shots are his guns' magazine going down (shotguns left out: one shell is many pellets);
a shot hit when one of his hits on an enemy came from -40 to +200 ms of it (a bullet in a wall, a turret or a Boom Bot
isn't a hit, as Riot's own counts don't make it one), and where it hit is the game's own region of the hit (head, body,
legs: the neck counts as head and the hips as legs, as in Riot's match summary, which these match hit for hit); the target is the enemy whose head was nearest the
crosshair (the replay has no walls, so it can't say who he saw; misses are aimed at whoever was nearest, as Aimlabs'
are); a head's centre is where the match's headshots landed over the body's position, and its radius the 90th
percentile of their distance from it. A shot's aim starts at the shot before or 0.8 s earlier. Before using a match it
checks that the view it rebuilds lines up with the game's own hits: the ray from his eye along his view at each hit
must pass, at the median, within a degree of where the bullet landed, or the match is skipped and says why.

Every flick is kept one by one too (`cada_flick`, mira.py's): its way to the head in degrees on screen, the head's
radius, whether it hit and where, its corrections, and the body walking or not.

Nothing about the other players is kept: no names, ids, positions or numbers (only his crosshair against the nearest
head). A day's file keeps what it had.
"""
import argparse
import bisect
import json
import math
import os
import re
import shutil
import statistics as st
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import polars as pl

from mira import medir, para_json, resumo
from voltaic import TIME_ZONE

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "mira-ranked"
VALORANT = Path("/mnt/c/Users/muanl/AppData/Local/VALORANT/Saved")
DEMOS = VALORANT / "Demos"
VRFKIT = Path.home() / ".local" / "share" / "vrfkit"
# A shot's aim starts at the shot before or this long before it (s): longer than a flick, shorter than a walk round a corner.
JANELA = 0.8
# A body faster than this (units, centimetres, a second) is walking: Valorant's guns lose their accuracy well before a run (~540).
ANDANDO = 150
# A fight: a shot more than this after the one before (s) opens one.
LUTA = 0.6
SHOTGUNS = "/Shotguns/"
# Where a hit landed, by the bone's name, for a replay without the game's own region (REGIOES): what Riot counts.
BONES = {"cabeca": ("Head", "Neck"), "perna": ("Hip", "Knee", "Foot", "Leg", "Thigh", "Calf", "Ankle", "Toe")}
REGIOES = {1: "cabeca", 2: "perna", 0: "corpo"}


def regiao(hit) -> str:
    """Head, body or legs, as Riot's match summary counts them: the game's region of the hit, else the bone's name."""
    if hit.get("regional_damage") in REGIOES:
        return REGIOES[hit["regional_damage"]]
    osso = hit.get("bone") or ""
    return next((k for k, nomes in BONES.items() if any(n in osso for n in nomes)), "corpo")


class Pula(Exception):
    """A replay this can't use, and why."""


def _uv(*args) -> list[str]:
    uv = shutil.which("uv") or str(Path.home() / ".local" / "bin" / "uv")
    return [uv, "run", "--no-project", "-q", "--with", "pyarrow", "python3", *args]


def exportar(vrf: Path, pasta: Path) -> Path:
    """vrfkit's tables, and its rounds, hits and magazines, in `pasta`."""
    binario = VRFKIT / "target" / "release" / "vrfkit"
    if not binario.exists():
        raise SystemExit(f"vrfkit isn't built at {binario}: see this script's docstring")
    out = pasta / "export"
    r = subprocess.run([str(binario), "export", str(vrf), "--out", str(out)], capture_output=True, text=True, timeout=600)
    if r.returncode:
        linha = next((x for x in r.stderr.splitlines() if "error" in x.lower()), r.stderr.strip()[-200:])
        raise Pula("unsupported patch, vrfkit needs an update" if "unsupported" in linha else f"vrfkit: {linha[:200]}")
    for ferramenta, saida in (("extract_rounds.py", "rounds.parquet"), ("extract_damage_events.py", "damage.parquet"),
                              ("extract_match_observations.py", "obs.json")):
        r = subprocess.run(_uv(ferramenta, "--export", str(out), "--out", str(pasta / saida)), cwd=VRFKIT / "tools",
                           capture_output=True, text=True, timeout=600)
        if r.returncode:
            raise Pula(f"{ferramenta}: {(r.stderr.strip().splitlines() or ['?'])[-1][:200]}")
    return out


def conta() -> str | None:
    """Luan's account (puuid): MIRA_PUUID (valorant.py passes it), else the one signed in to Valorant on this PC, as the
    game's own logs name it when it asks for his match history."""
    if os.environ.get("MIRA_PUUID"):
        return os.environ["MIRA_PUUID"].lower()
    vistas = Counter()
    for log in sorted((VALORANT / "Logs").glob("ShooterGame*.log"), key=lambda p: p.stat().st_mtime, reverse=True)[:4]:
        texto = log.read_text(errors="replace")
        vistas.update(re.findall(r"match-history-query/v3/products/valorant/players/([0-9a-f-]{36})", texto))
        if vistas:
            return vistas.most_common(1)[0][0].lower()
    return None


def eu(manifesto) -> dict:
    """Luan's player in the match."""
    jogadores = {p["subject"].lower(): p for p in manifesto["players"]}
    quem = conta()
    if quem not in jogadores:
        raise Pula("Luan's account isn't in it (or isn't known: MIRA_PUUID)")
    return jogadores[quem]


# The view as the server got it comes in uneven steps (the client's frames bundled into the server's ticks: 1226, 761,
# 792, 691, 931°/s on a steady flick), which would read as corrections; a mean over this many ticks (39 ms) smooths them
# and leaves a real correction, 100 ms or more, alone.
SUAVE = 5


def trilha(mv, guids):
    t = mv.filter(pl.col("character_net_guid").is_in(list(guids))).sort("time_ms").unique("time_ms", keep="last", maintain_order=True)
    yaw = np.degrees(np.unwrap(np.radians(t["yaw"].to_numpy().astype(float))))  # continuous, no jump at 360
    pitch = ((t["pitch"].to_numpy().astype(float) + 180) % 360) - 180  # up positive, as Unreal's

    def suave(x):
        if len(x) < SUAVE:
            return x
        k = SUAVE // 2
        y = np.convolve(np.pad(x, k, mode="edge"), np.ones(SUAVE) / SUAVE, mode="valid")
        return y

    return {
        "t": t["time_ms"].to_numpy().astype(float) / 1000,
        "pos": t.select(["pos_x", "pos_y", "pos_z"]).to_numpy().astype(float),
        "yaw": suave(yaw),
        "pitch": suave(pitch),
        "vel": np.hypot(t["vel_x"].to_numpy().astype(float), t["vel_y"].to_numpy().astype(float)),
    }


def no(tr, x, campo):
    """`campo` of a track at time x (s), interpolated; the nearest sample across a gap (a body standing still)."""
    t = tr["t"]
    if not len(t):
        return None
    i = bisect.bisect_right(t, x) - 1
    if i < 0:
        return tr[campo][0]
    if i >= len(t) - 1 or t[i + 1] - t[i] > 0.25:
        return tr[campo][i]
    f =(x - t[i]) / (t[i + 1] - t[i])
    return tr[campo][i] + (tr[campo][i + 1] - tr[campo][i]) * f


def analisar(vrf: Path, detalhe=False):
    with tempfile.TemporaryDirectory(prefix="mira-ranked-") as pasta:
        pasta = Path(pasta)
        out = exportar(vrf, pasta)
        manifesto = json.loads((out / "manifest.json").read_text())
        mv = pl.read_parquet(out / "movement.parquet")
        dano = pl.read_parquet(pasta / "damage.parquet").with_columns(pl.col("bone").cast(pl.String), pl.col("function").cast(pl.String),
                                                                     pl.col("weapon_class_path").cast(pl.String))
        rodadas = pl.read_parquet(pasta / "rounds.parquet").sort("start_ms")
        eventos = pl.read_parquet(out / "events.parquet")
        obs = json.loads((pasta / "obs.json").read_text())
        atores = pl.read_parquet(out / "actors.parquet").with_columns(pl.col("class_path").cast(pl.String))
    return medir_partida(vrf, manifesto, mv, dano, rodadas, eventos, obs, atores, detalhe)


def medir_partida(vrf, manifesto, mv, dano, rodadas, eventos, obs, atores, detalhe):
    me = eu(manifesto)
    meus = set(me["character_net_guids"])
    EU = trilha(mv, meus)
    outros = {p["subject"]: p for p in manifesto["players"] if p is not me}
    trilhas = {s: trilha(mv, p["character_net_guids"]) for s, p in outros.items()}

    # Teams: in round 1's buy phase everyone stands in their spawn; his four nearest are his team.
    r1 = rodadas.row(0, named=True)
    t_spawn = (r1["start_ms"] + (r1["buy_end_ms"] or r1["start_ms"] + 20000)) / 2000
    minha = no(EU, t_spawn, "pos")
    perto = sorted((float(np.linalg.norm(no(tr, t_spawn, "pos") - minha)), s) for s, tr in trilhas.items() if len(tr["t"]))
    inimigos = {s for _, s in perto[4:]}
    if len(inimigos) != 5:
        raise Pula(f"{len(inimigos)} enemies found, not 5")

    # Alive: from a round's start to their death in it (characterDeath: word1 is the body killed).
    mortes = defaultdict(list)
    for r in eventos.filter(pl.col("group").cast(pl.String) == "characterDeath").iter_rows(named=True):
        mortes[r["word1"]].append(r["time1"] / 1000)
    inicios = [x / 1000 for x in rodadas["start_ms"].to_list()]

    def vivo(sub, x):
        k = bisect.bisect_right(inicios, x) - 1
        if k < 0:
            return False
        return not any(inicios[k] <= m <= x for g in outros[sub]["character_net_guids"] for m in mortes.get(g, []))

    # His view as mira.py's camera: seconds, and (pitch down positive, yaw) per key.
    T = list(EU["t"])
    A = list(zip((-EU["pitch"]).tolist(), EU["yaw"].tolist()))

    meus_danos = dano.filter((pl.col("damager_subject") == me["subject"]) & pl.col("function").str.contains("Point"))
    olhos = [r["origin_z"] - no(EU, r["time_ms"] / 1000, "pos")[2] for r in meus_danos.iter_rows(named=True)]
    if len(olhos) < 10:
        raise Pula(f"only {len(olhos)} of his hits: too few to check the view against")
    olho = np.array([0.0, 0.0, st.median(olhos)])

    def erro_para(alvo_pos, x):
        """Crosshair minus the point, in degrees on screen (yaw scaled by the pitch's cosine; pitch down positive), and
        its distance, as mira.py's erro."""
        o = no(EU, x, "pos") + olho
        dx, dy, dz = alvo_pos - o
        h = math.hypot(dx, dy)
        pit = -math.degrees(math.atan2(dz, h))
        y = no(EU, x, "yaw")
        ya = math.degrees(math.atan2(dy, dx))
        ya = y + ((ya - y + 180) % 360 - 180)
        p = -no(EU, x, "pitch")
        return ((y - ya) * math.cos(math.radians(pit)), p - pit), math.sqrt(h * h + dz * dz)

    # The check: his rebuilt view against where his bullets landed.
    raios = [math.hypot(*erro_para(np.array([r["impact_x"], r["impact_y"], r["impact_z"]]), r["time_ms"] / 1000)[0])
             for r in meus_danos.iter_rows(named=True)]
    confere = st.median(raios)
    if confere > 1.0:
        raise Pula(f"his view misses his own hits by {confere:.2f}° at the median")

    # What a shooter sees runs behind the server (the game checks a hit against that, rewinding the target): the delay
    # that best lines up the match's hits on moving bodies with where those bodies were, every 10 ms up to 150.
    todas = [r for r in dano.filter(pl.col("function").str.contains("Point")).iter_rows(named=True)
             if r["victim_subject"] in trilhas and no(trilhas[r["victim_subject"]], r["time_ms"] / 1000, "vel") > 200]

    def espalha(atraso):
        v = np.array([[r["impact_x"], r["impact_y"]] - no(trilhas[r["victim_subject"]], r["time_ms"] / 1000 - atraso, "pos")[:2] for r in todas])
        return float(np.median(np.hypot(*(v - np.median(v, axis=0)).T)))

    atraso = min((espalha(ms / 1000), ms / 1000) for ms in range(0, 151, 10))[1] if len(todas) >= 20 else 0.04

    # The head: where the match's headshots landed over the body's position; its radius their median distance from it
    # (more than a real head's: the head moves with the body's animation, which the replay doesn't carry).
    tiros_cabeca = []
    for r in dano.filter(pl.col("bone") == "Head").iter_rows(named=True):
        s = r["victim_subject"]
        if s in trilhas:
            tiros_cabeca.append(np.array([r["impact_x"], r["impact_y"], r["impact_z"]]) - no(trilhas[s], r["time_ms"] / 1000 - atraso, "pos"))
    if len(tiros_cabeca) < 5:
        raise Pula(f"only {len(tiros_cabeca)} headshots in the match to find a head by")
    cabeca = np.median(np.array(tiros_cabeca), axis=0)
    raio_w = float(np.median([np.linalg.norm(v - cabeca) for v in tiros_cabeca]))

    def cabeca_de(sub, x):
        """An enemy's head as Luan saw it at time x."""
        return no(trilhas[sub], x - atraso, "pos") + cabeca

    # His shots: his guns' magazines going down while in his hands.
    armas = dict(zip(atores["actor_net_guid"].to_list(), atores["class_path"].to_list()))
    nas_maos = defaultdict(list)
    for e in obs["equip_intervals"]:
        if e["owner_guid"] in meus:
            nas_maos[e["weapon_guid"]].append((e["from_ms"], e["to_ms"] if e["to_ms"] is not None else 1 << 40))
    tiros = []
    for a in obs["ammo_changes"]:
        arma = armas.get(a["weapon_guid"]) or ""
        if a["kind"] != "decrease" or a.get("round_start_within_150ms") or "/Guns/" not in arma or SHOTGUNS in arma:
            continue
        if any(f <= a["time_ms"] <= t + 50 for f, t in nas_maos.get(a["weapon_guid"], [])):
            tiros += [a["time_ms"] / 1000] * (-a["delta"])
    tiros.sort()

    # His hits on the enemies only: a bullet in a wall of Sage's or a Boom Bot lands too, but it hit nobody.
    acertos = sorted(((r["time_ms"] / 1000, r) for r in meus_danos.iter_rows(named=True) if r["victim_subject"] in inimigos),
                     key=lambda par: par[0])
    usados = set()
    medidos, lutas, antes = [], [], -1e9
    ossos = Counter()
    for ts in tiros:
        perto = [(abs(h - ts), i) for i, (h, _) in enumerate(acertos) if -0.04 <= h - ts <= 0.2 and i not in usados]
        hit = None
        if perto:
            _, i = min(perto)
            usados.add(i)
            hit = acertos[i][1]
            ossos[regiao(hit)] += 1
        alvo = hit["victim_subject"] if hit else None
        if alvo is None:
            vivos = [s for s in inimigos if vivo(s, ts)]
            if vivos:
                alvo = min(vivos, key=lambda s: math.hypot(*erro_para(cabeca_de(s, ts), ts)[0]))
        # Only a fight's first shot is aimed from scratch, as each of Aimlabs' is; the rest of a burst or a spray
        # follows it, and counts only in the shots, the hits and the bones.
        primeiro = ts - antes > LUTA
        de = max(antes, ts - JANELA)
        antes = ts
        if not primeiro or alvo is None or math.hypot(*erro_para(cabeca_de(alvo, ts), ts)[0]) > 20:
            continue  # a burst's follow-up, or nobody near the crosshair (a shot at a wall, a smoke)
        tiro = medir(T, A, ts, ts - JANELA, lambda x, s=alvo: erro_para(cabeca_de(s, x), x), raio_w, hit is not None)
        tiro["andando"] = bool(no(EU, ts, "vel") > ANDANDO)
        if hit is not None:
            tiro["osso"] = regiao(hit)
        medidos.append(tiro)
        t0 = ts - JANELA + tiro["reacao"] if tiro["tipo"] == "flick" else ts - JANELA
        (_, ey), _ = erro_para(cabeca_de(alvo, t0), t0)
        lutas.append({"acertou": hit is not None, "vel": float(no(EU, ts, "vel")), "altura": -ey, "tipo": tiro["tipo"]})

    numeros = resumo({"tiros": medidos, "acertos": len(usados), "n_tiros": len(tiros)}, caminhos=None)
    if not numeros:
        raise Pula(f"fewer than 10 flicks ({sum(1 for t in medidos if t['tipo'] == 'flick')})")
    parado = [x for x in lutas if x["vel"] <= ANDANDO]
    andando = [x for x in lutas if x["vel"] > ANDANDO]
    taxa = lambda xs: round(sum(x["acertou"] for x in xs) / len(xs), 3) if len(xs) >= 5 else None
    alturas = [x["altura"] for x in lutas]

    inicio = datetime.fromtimestamp((manifesto["timestamp_ticks"] - 621355968000000000) / 1e7, timezone.utc).replace(microsecond=0)
    agente, mapa = "?", "?"
    for bloco in manifesto.get("game_specific_data") or []:
        try:
            for p in json.loads(bloco).get("playerLoadouts", []):
                if p.get("subject", "").lower() == me["subject"].lower():
                    agente = p.get("characterId", "?")
        except (ValueError, AttributeError):
            pass
    nivel = (manifesto.get("level_names_and_times") or [{}])[0].get("name", "?")
    try:
        from valorant import names
        agente = names()["agents"].get(agente.lower(), agente)
        mapa = names()["maps"].get(nivel, nivel.rsplit("/", 1)[-1])
    except Exception:  # valorant-api.com out of reach: the ids stay, the site can show them as they are
        mapa = nivel.rsplit("/", 1)[-1]
    partida = {
        "id": manifesto.get("friendly_name") or vrf.stem,
        "at": inicio.isoformat().replace("+00:00", "Z"),
        "map": mapa,
        "agent": agente,
        **numeros,
        "lutas": len(lutas),
        "andando": round(len(andando) / len(lutas), 3) if lutas else None,
        "acerto_parado_corpo": taxa(parado),
        "acerto_andando": taxa(andando),
        "altura": round(st.median(alturas), 2) if alturas else None,
        "altura_faixa": [round(float(np.percentile(alturas, 25)), 2), round(float(np.percentile(alturas, 75)), 2)] if len(alturas) >= 4 else None,
        "ossos": {k: ossos.get(k, 0) for k in ("cabeca", "corpo", "perna")},
    }
    checagem = {"confere_mediana": round(confere, 3), "confere_p90": round(float(np.percentile(raios, 90)), 3), "olho": round(float(olho[2]), 1),
                "cabeca": [round(float(c), 1) for c in cabeca], "raio_cabeca": round(raio_w, 1), "atraso_ms": round(atraso * 1000),
                "acertos_dele": meus_danos.height, "nos_inimigos": len(acertos)}
    if detalhe:
        for t in medidos:
            print({k: (round(v, 3) if isinstance(v, float) else v) for k, v in t.items() if k not in ("curva", "caminho")})
    return partida, checagem


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write the files (otherwise only list what changes)")
    parser.add_argument("--pasta", help="write the day files here instead of content/ (scripts/mira_auto.py, which publishes them)")
    parser.add_argument("--detalhe", help="one replay (.vrf): its checks, each shot and its numbers")
    parser.add_argument("--so", nargs="*", help="only these replays (file names in the Demos folder)")
    args = parser.parse_args()
    global OUT
    if args.pasta:
        OUT = Path(args.pasta)

    if args.detalhe:
        try:
            partida, checagem = analisar(Path(args.detalhe), detalhe=True)
        except Pula as motivo:
            raise SystemExit(f"skipped: {motivo}")
        print(json.dumps(checagem, ensure_ascii=False))
        print(json.dumps(partida, ensure_ascii=False))
        return

    feitas = set()
    for f in OUT.glob("*.json"):
        feitas |= {p["id"] for p in json.loads(f.read_text())["matches"]}
    dias: dict[str, dict[str, dict]] = {}
    for vrf in sorted(DEMOS.glob("*.vrf"), key=lambda p: p.stat().st_mtime):
        if vrf.stem in feitas or (args.so is not None and vrf.name not in args.so):
            continue
        try:
            partida, checagem = analisar(vrf)
        except Pula as motivo:
            print(f"  skipped {vrf.name}: {motivo}")
            continue
        print(f"  {vrf.name}: {partida['map']}, {partida['agent']}, {partida['flicks']} flicks, check {checagem['confere_mediana']}°")
        dia = datetime.fromisoformat(partida["at"].replace("Z", "+00:00")).astimezone(TIME_ZONE).date().isoformat()
        dias.setdefault(dia, {})[partida["id"]] = partida

    mudou = 0
    for dia, achadas in sorted(dias.items()):
        caminho = OUT / f"{dia}.json"
        antes = {p["id"]: p for p in json.loads(caminho.read_text())["matches"]} if caminho.exists() else {}
        novas = sorted({**achadas, **antes}.values(), key=lambda p: p["at"])
        mudou += 1
        print(f"{dia}: {len(novas)} matches ({len(novas) - len(antes):+d})")
        if args.apply:
            OUT.mkdir(parents=True, exist_ok=True)
            caminho.write_text(para_json({"date": dia, "matches": novas}))
    if not mudou:
        print("Nothing new.")
    elif not args.apply:
        print("(dry run: --apply writes them)")


if __name__ == "__main__":
    sys.exit(main())
