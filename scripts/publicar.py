"""What the scripts that publish on their own share (rocket_league.py and valorant.py, for the matches played off the
stream, and mira_auto.py, for the aim's training and matches): whether Luan is live, and putting files into the
repository on GitHub, as the Partidas dock does with its token, here with the `gh` CLI's sign-in on this PC. A file put
on main is a release; `por_varios` puts several in one commit, so one release.

    from publicar import ao_vivo, ler, listar, por, por_varios
"""
import base64
import json
import shutil
import subprocess
from pathlib import Path

REPO = "muanlartins/muanlartins"
ROOT = Path(__file__).resolve().parent.parent


def ao_vivo() -> bool:
    """Whether OBS is streaming (scripts/obs.mjs status). OBS closed, or not answering, is not live."""
    node = shutil.which("node") or str(Path.home() / ".local" / "bin" / "node")
    try:
        out = subprocess.run([node, str(ROOT / "scripts" / "obs.mjs"), "status"], capture_output=True, text=True, timeout=20).stdout
    except (OSError, subprocess.SubprocessError):
        return False
    first = (out or "").splitlines()[:1]
    return bool(first) and first[0].startswith("live:") and not first[0].startswith("live: no")


def _gh(*args, entrada: str | None = None) -> subprocess.CompletedProcess:
    gh = shutil.which("gh") or str(Path.home() / ".local" / "bin" / "gh")
    return subprocess.run([gh, "api", *args], input=entrada, capture_output=True, text=True, timeout=60)


def listar(pasta: str) -> list[str]:
    """The names of the files in a folder of the repository on main."""
    r = _gh(f"repos/{REPO}/contents/{pasta}", "--jq", ".[].name")
    if r.returncode:
        raise OSError(f"gh: {r.stderr.strip()[:200]}")
    return r.stdout.split()


def ler(caminho: str) -> str | None:
    """A file of the repository on main, or None when there's none."""
    r = _gh("-H", "Accept: application/vnd.github.raw", f"repos/{REPO}/contents/{caminho}")
    if r.returncode:
        if "404" in r.stderr or "Not Found" in r.stderr:
            return None
        raise OSError(f"gh: {r.stderr.strip()[:200]}")
    return r.stdout


def por_varios(arquivos: dict[str, str], mensagem: str, ramo: str = "main"):
    """Puts several files (path → text, as written) on main in one commit, so one release: Git's own objects through
    the API (main's tree, a new tree over it, a commit, main moved to it). Fails, changing nothing, if main moved
    meanwhile."""
    if not arquivos:
        return
    r = _gh(f"repos/{REPO}/git/ref/heads/{ramo}", "--jq", ".object.sha")
    if r.returncode:
        raise OSError(f"gh: {r.stderr.strip()[:200]}")
    pai = r.stdout.strip()
    r = _gh(f"repos/{REPO}/git/commits/{pai}", "--jq", ".tree.sha")
    if r.returncode:
        raise OSError(f"gh: {r.stderr.strip()[:200]}")
    base = r.stdout.strip()
    arvore = {"base_tree": base, "tree": [{"path": c, "mode": "100644", "type": "blob", "content": t} for c, t in sorted(arquivos.items())]}
    r = _gh("-X", "POST", f"repos/{REPO}/git/trees", "--input", "-", "--jq", ".sha", entrada=json.dumps(arvore))
    if r.returncode:
        raise OSError(f"gh: {r.stderr.strip()[:200]}")
    commit = {"message": mensagem, "tree": r.stdout.strip(), "parents": [pai]}
    r = _gh("-X", "POST", f"repos/{REPO}/git/commits", "--input", "-", "--jq", ".sha", entrada=json.dumps(commit))
    if r.returncode:
        raise OSError(f"gh: {r.stderr.strip()[:200]}")
    r = _gh("-X", "PATCH", f"repos/{REPO}/git/refs/heads/{ramo}", "--input", "-", entrada=json.dumps({"sha": r.stdout.strip(), "force": False}))
    if r.returncode:
        raise OSError(f"gh: {r.stderr.strip()[:200]}")


def por(caminho: str, valor, mensagem: str):
    """Writes `valor` as JSON (indented, as the dock writes it) to `caminho` on main, creating or replacing it."""
    texto = json.dumps(valor, ensure_ascii=False, indent=2) + "\n"
    r = _gh(f"repos/{REPO}/contents/{caminho}", "--jq", ".sha")
    sha = r.stdout.strip() if r.returncode == 0 else None
    corpo = {"message": mensagem, "content": base64.b64encode(texto.encode()).decode()}
    if sha:
        corpo["sha"] = sha
    r = _gh("-X", "PUT", f"repos/{REPO}/contents/{caminho}", "--input", "-", entrada=json.dumps(corpo))
    if r.returncode:
        raise OSError(f"gh: {r.stderr.strip()[:200]}")
