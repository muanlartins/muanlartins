#!/usr/bin/env bash
# Builds the Celeste link (MuanlartinsLink) in WSL and installs it into the game's Mods folder:
#   scripts/celeste-mod/construir.sh              build and install
#   scripts/celeste-mod/construir.sh --so-compilar   build only (bin/Release/)
# The game folder is CELESTE (default: Steam's). The .NET SDK is the one in ~/.local/share/valorant-extract.
# Everest loads a new or changed mod on the game's next start; copying while the game runs is harmless (it doesn't
# hot-load mods with CodeReload off). Refuses while Luan is live (a build loads the CPU for a few seconds). Never
# deletes anything: uninstalling is deleting Mods/MuanlartinsLink by hand (README.md).
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
CELESTE="${CELESTE:-/mnt/c/Program Files (x86)/Steam/steamapps/common/Celeste}"
DESTINO="$CELESTE/Mods/MuanlartinsLink"
OBS="$HOME/repos/muanlartins/scripts/obs.mjs"

if [[ ! -f "$CELESTE/Celeste.dll" || ! -f "$CELESTE/MMHOOK_Celeste.dll" ]]; then
  echo "Celeste with Everest not found in $CELESTE (set CELESTE=...)" >&2
  exit 1
fi
if [[ -f "$OBS" ]] && node "$OBS" status 2>/dev/null | head -1 | grep -q '^live: ' && ! node "$OBS" status 2>/dev/null | head -1 | grep -q '^live: no'; then
  echo "Luan is live: not now" >&2
  exit 1
fi

. "$HOME/.local/share/valorant-extract/env.sh"
dotnet build "$AQUI/MuanlartinsLink.csproj" -c Release -nologo -v quiet -p:CelestePath="$CELESTE"
SAIDA="$AQUI/bin/Release"
echo "built: $SAIDA/MuanlartinsLink.dll"
[[ "${1:-}" == "--so-compilar" ]] && exit 0

mkdir -p "$DESTINO"
if ! cp "$AQUI/everest.yaml" "$SAIDA/MuanlartinsLink.dll" "$SAIDA/MuanlartinsLink.pdb" "$DESTINO/"; then
  echo "couldn't copy into $DESTINO (the game holding the file? close Celeste and run again)" >&2
  exit 1
fi
echo "installed: $DESTINO (loads on Celeste's next start; it serves http://127.0.0.1:8797/eventos)"
