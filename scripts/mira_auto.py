"""The aim's page following the training and the matches by itself (Luan, 2026-11-20: a tool, "dinâmico, que atualiza
conforme os jogos acontecem"): scripts/valorant.py, always on, calls `ciclo()` every minute, and when Luan isn't live
(publicar.ao_vivo) this

1. downloads the replays of the matches valorant.py queued (`enfileirar`, after each match with a replay: competitive,
   unrated, swiftplay, premier), as the game's own "Download" does: Valorant's match history gives a signed link to
   the file, which goes to the game's own folder (`Saved\\Demos\\<match>.vrf`, where the game lists it too). Not while
   live (a 50–100 MB download beside the stream), and a match whose replay isn't there yet is tried again, for a week;
2. once Aimlabs has closed after new plays, runs voltaic.py and mira.py (the training's scores, and its flicks while
   Aimlabs still has their replays: only the last 50 plays);
3. measures the replays the site doesn't have yet with mira_ranked.py (one a new patch's scramble keeps out is tried
   again once vrfkit is updated);
4. and publishes what changed in content/voltaic, content/mira and content/mira-ranked in one commit (publicar.py's
   `por_varios`): each script runs over a copy of main's files of its folder, so their own rules for keeping what a
   day had hold, and the working copy the services run from is never touched.

    python3 scripts/mira_auto.py          # one cycle now, saying what it does (not while live)
    python3 scripts/mira_auto.py --ver    # what it would do, changing nothing

Its state is ~/.cache/muanlartins/mira-auto.json: the matches waiting for their replay, the replays seen, when Aimlabs
last played. Only Luan's numbers go out, as the three scripts write them.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import publicar  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
ESTADO = Path.home() / ".cache" / "muanlartins" / "mira-auto.json"
DEMOS = Path("/mnt/c/Users/muanl/AppData/Local/VALORANT/Saved/Demos")
AIMLABS = Path("/mnt/c/Users/muanl/AppData/LocalLow/Statespace/aimlab_tb/Users")
VRFKIT = Path.home() / ".local" / "share" / "vrfkit" / "target" / "release" / "vrfkit"
TASKLIST = "/mnt/c/Windows/System32/tasklist.exe"
# Valorant's match history on Riot's service gateway, by the account's shard (Brazil's plays on North America's: the
# game itself asks usw2, as its log shows).
SGP = {"na": "usw2", "pbe": "usw2", "eu": "euc1", "ap": "apse1", "kr": "apne1"}
COM_REPLAY = {"competitive", "unrated", "swiftplay", "premier"}
UMA_SEMANA = 7 * 24 * 3600


def ler_estado() -> dict:
    try:
        return json.loads(ESTADO.read_text())
    except (OSError, ValueError):
        return {"fila": {}, "vistos": {}, "aimlabs": 0, "vrfkit": 0}


def salvar(estado: dict):
    ESTADO.parent.mkdir(parents=True, exist_ok=True)
    tmp = ESTADO.with_suffix(".tmp")
    tmp.write_text(json.dumps(estado, indent=1))
    tmp.replace(ESTADO)


def enfileirar(match_id: str, fila: str):
    """A match just ended (valorant.py): its replay is downloaded at the next cycle off the air."""
    if fila not in COM_REPLAY:
        return
    estado = ler_estado()
    estado["fila"].setdefault(match_id, time.time())
    salvar(estado)


# --- 1. The replays --------------------------------------------------------------------------------------------------


def _vrfs(valor):
    """Every link to a .vrf anywhere in Valorant's answer, whatever its shape."""
    if isinstance(valor, str):
        return [valor] if ".vrf" in valor and valor.startswith("http") else []
    if isinstance(valor, dict):
        return [u for v in valor.values() for u in _vrfs(v)]
    if isinstance(valor, list):
        return [u for v in valor for u in _vrfs(v)]
    return []


def baixar(estado: dict, riot, diz) -> bool:
    """Downloads the queued matches' replays that are ready. `riot()` gives (puuid, headers, shard) or None."""
    if not estado["fila"]:
        return False
    conta = riot()
    if not conta:
        return False
    puuid, headers, shard = conta
    host = SGP.get(shard)
    baixou = False
    for match_id, desde in list(estado["fila"].items()):
        destino = DEMOS / f"{match_id}.vrf"
        if destino.exists() or time.time() - desde > UMA_SEMANA:
            estado["fila"].pop(match_id)
            continue
        if not host:
            continue
        url = f"https://{host}.pp.sgp.pvp.net/match-history-query/v3/products/valorant/players/{puuid}/infoTypes/REPLAY?id={match_id}"
        try:
            resposta = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20))
        except (OSError, ValueError) as erro:
            diz(f"replay de {match_id[:8]} ainda não: {type(erro).__name__}")
            continue
        links = [u for u in _vrfs(resposta) if match_id in u]
        if not links:
            continue
        parte = destino.with_suffix(".vrf.part")
        try:
            DEMOS.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(links[0], timeout=120) as r, open(parte, "wb") as f:
                shutil.copyfileobj(r, f, 1 << 20)
            parte.replace(destino)
        except OSError as erro:
            diz(f"download do replay de {match_id[:8]} falhou: {type(erro).__name__}")
            continue
        estado["fila"].pop(match_id)
        baixou = True
        diz(f"replay de {match_id[:8]} baixado ({destino.stat().st_size >> 20} MB)")
    return baixou


# --- 2–4. Measuring and publishing --------------------------------------------------------------------------------------


def aimlabs_aberto() -> bool:
    try:
        out = subprocess.run([TASKLIST, "/FI", "IMAGENAME eq AimLab_tb.exe", "/NH"], capture_output=True, text=True, errors="replace", timeout=15).stdout
    except (OSError, subprocess.SubprocessError):
        return True  # can't tell: wait
    return "AimLab_tb.exe" in out


def aimlabs_jogou(estado: dict) -> float:
    """The newest play's replay header, when it's newer than the last cycle's and Aimlabs has closed; else 0."""
    novos = [p.stat().st_mtime for p in AIMLABS.glob("*/Replay/*.json")]
    ultimo = max(novos, default=0)
    return ultimo if ultimo > estado["aimlabs"] and not aimlabs_aberto() else 0


def replays_novos(estado: dict) -> list[str]:
    """The replays not seen yet, and the ones a patch kept out once vrfkit is newer."""
    vrfkit = VRFKIT.stat().st_mtime if VRFKIT.exists() else 0
    out = []
    for p in DEMOS.glob("*.vrf"):
        visto = estado["vistos"].get(p.name)
        if visto is None or (visto == "patch" and vrfkit > estado["vrfkit"]):
            out.append(p.name)
    return sorted(out)


def _uv(*args) -> list[str]:
    uv = shutil.which("uv") or str(Path.home() / ".local" / "bin" / "uv")
    return [uv, "run", "--no-project", "-q", "--with", "polars", "--with", "pyarrow", "--with", "numpy", "python3", *args]


def rodar(pasta_repo: str, comando: list[str], env=None, diz=print) -> tuple[dict[str, str], str]:
    """Runs a script over a copy of main's files of a folder; the files it changed (path → text) and its output."""
    try:
        nomes = [n for n in publicar.listar(pasta_repo) if n.endswith(".json")]
    except OSError as erro:
        if "404" not in str(erro) and "Not Found" not in str(erro):
            raise
        nomes = []  # the folder isn't on main yet
    with tempfile.TemporaryDirectory(prefix="mira-auto-") as tmp:
        antes = {}
        for n in nomes:
            texto = publicar.ler(f"{pasta_repo}/{n}")
            if texto is not None:
                antes[n] = texto
                Path(tmp, n).write_text(texto)
        r = subprocess.run([*comando, "--apply", "--pasta", tmp], cwd=ROOT, capture_output=True, text=True, timeout=3600,
                           env={**os.environ, **(env or {})})
        if r.returncode:
            raise OSError(f"{Path(comando[-1]).name}: {(r.stderr.strip().splitlines() or ['?'])[-1][:200]}")
        mudou = {f"{pasta_repo}/{p.name}": p.read_text() for p in sorted(Path(tmp).glob("*.json")) if p.read_text() != antes.get(p.name)}
        return mudou, r.stdout


def ciclo(riot=lambda: None, puuid: str | None = None, diz=print, ver=False):
    """One look: download, measure, publish. Never while live."""
    if publicar.ao_vivo():
        return
    estado = ler_estado()
    if not ver:
        baixar(estado, riot, diz)
        salvar(estado)
    jogou = aimlabs_jogou(estado)
    novos = replays_novos(estado) if VRFKIT.exists() else []
    if ver:
        diz(f"fila {len(estado['fila'])} · Aimlabs novo: {bool(jogou)} · replays novos: {novos}")
        return
    if not jogou and not novos:
        return
    arquivos = {}
    if jogou:
        for pasta, script in (("content/voltaic", "voltaic.py"), ("content/mira", "mira.py")):
            mudou, _ = rodar(pasta, [sys.executable, str(SCRIPTS / script)], diz=diz)
            arquivos.update(mudou)
    if novos:
        env = {"MIRA_PUUID": puuid} if puuid else None
        mudou, saida = rodar("content/mira-ranked", _uv(str(SCRIPTS / "mira_ranked.py"), "--so", *novos), env=env, diz=diz)
        arquivos.update(mudou)
        for nome in novos:
            pulou = re.search(rf"skipped {re.escape(nome)}: (.*)", saida)
            estado["vistos"][nome] = ("patch" if "unsupported patch" in pulou.group(1) else "pulado") if pulou else "ok"
            if pulou:
                diz(f"{nome[:8]}: {pulou.group(1)}")
    if arquivos:
        publicar.por_varios(arquivos, "Publish the aim's training and matches")
        diz(f"mira publicada: {', '.join(sorted(arquivos))}")
    if jogou:
        estado["aimlabs"] = jogou
    if VRFKIT.exists():
        estado["vrfkit"] = VRFKIT.stat().st_mtime
    salvar(estado)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ver", action="store_true", help="say what it would do, changing nothing")
    args = parser.parse_args()
    if publicar.ao_vivo():
        raise SystemExit("Luan is live: nothing until the stream ends.")
    ciclo(ver=args.ver)


if __name__ == "__main__":
    sys.exit(main())
