"""The stream PC's Windows side, seen from WSL: the user's folder and the tools installed there."""

import subprocess
from functools import cache
from pathlib import Path


@cache
def home() -> Path:
    """%USERPROFILE%, as a WSL path; the Linux home outside WSL."""
    # By full path when it's there: a WSL process started from Windows doesn't always get Windows' folders in its PATH.
    cmd = "/mnt/c/Windows/System32/cmd.exe" if Path("/mnt/c/Windows/System32/cmd.exe").exists() else "cmd.exe"
    try:
        profile = subprocess.run([cmd, "/c", "echo %USERPROFILE%"], capture_output=True, text=True,
                                 cwd="/mnt/c", check=True).stdout.strip()
        return to_wsl(profile)
    except (OSError, subprocess.CalledProcessError):
        return Path.home()


def to_wsl(path: str) -> Path:
    return Path(subprocess.run(["wslpath", "-u", path], capture_output=True, text=True, check=True).stdout.strip())


def to_windows(path: Path) -> str:
    return subprocess.run(["wslpath", "-w", str(path)], capture_output=True, text=True, check=True).stdout.strip()


def run(exe: Path, *args: str, **kwargs):
    """A Windows program, run from C: so it gets a Windows working directory. Paths in args are Windows'."""
    return subprocess.run([str(exe), *args], cwd="/mnt/c", check=True, **kwargs)


CONFIG = home() / ".config" / "muanlartins"
PROGRAMS = home() / "AppData" / "Local" / "Programs"
VIDEOS = home() / "Videos"

# The Videos folder, by live since 2026-11-26 (Luan: "a gente se perde"; the `faxina` skill has the whole map):
#   Lives\<date>\            the live: its recordings (Live, Jogo, Câmera, partes.json), Replays, VAR, Legendas, Thumb,
#   Lives\<date>\Cortes\     the long videos cut from it (partidas.py, capitulos.py; was Videos\Partidas),
#   Lives\<date>\Shorts\     its reels and covers (destaque.py, clipe.py, capa.py, cortes.py) and the candidates reel
#                            (candidatos.py), each reel's own pictures in Shorts\Partes\<reel>\ (was Videos\Shorts\…);
#   Partes\Vídeos\, Partes\Shorts\   what every video reuses: intro, outros, stickers, clips (were Comentados\Partes
#                            and Shorts\Partes);
#   Shorts\, Comentados\      only the studio's takes, where OBS's Shorts and Vídeo profiles record, and their edits.
LIVES = VIDEOS / "Lives"
PARTES = VIDEOS / "Partes"


def live_dir(date: str) -> Path:
    return LIVES / date


def cortes_dir(date: str) -> Path:
    """Where a live's long videos go (partidas.py, capitulos.py), named "<date> <nome>.mp4" as before."""
    return LIVES / date / "Cortes"


def shorts_dir(date: str) -> Path:
    """Where a live's reels, their covers and its candidates reel go."""
    return LIVES / date / "Shorts"


def reel_parts(date: str, slug: str) -> Path:
    """A reel's own pictures and renders (an effects module's assets), by the roteiro's slug without the date."""
    return shorts_dir(date) / "Partes" / slug.removeprefix(f"{date}-")
TEMP = home() / "AppData" / "Local" / "Temp"
