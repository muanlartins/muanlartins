"""What the scripts that publish on their own share (rocket_league.py and valorant.py, for the matches played off the
stream): whether Luan is live, and putting a file into the repository on GitHub, as the Partidas dock does with its
token, here with the `gh` CLI's sign-in on this PC. A file put on main is a release.

    from publicar import ao_vivo, ler, listar, por
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
