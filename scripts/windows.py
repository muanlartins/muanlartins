"""The stream PC's Windows side, seen from WSL: the user's folder and the tools installed there."""

import subprocess
from functools import cache
from pathlib import Path


@cache
def home() -> Path:
    """%USERPROFILE%, as a WSL path; the Linux home outside WSL."""
    try:
        profile = subprocess.run(["cmd.exe", "/c", "echo %USERPROFILE%"], capture_output=True, text=True,
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
TEMP = home() / "AppData" / "Local" / "Temp"
