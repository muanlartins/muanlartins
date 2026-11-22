# MuanlartinsLink: Celeste on the stream

An [Everest](https://everestapi.github.io/) code mod for Luan's Celeste (Steam, Everest 1.6696 on .NET 8) that changes
nothing in the game and only reports it to the stream's overlays: server-sent events on
`http://127.0.0.1:8797/eventos`, read by the camera filter (`public/stream/filtros/celeste/`) and the game scene's
overlay (`public/stream/jogo.html` with `celeste.js`). Every hook calls the game's own method first, unchanged, and
only then looks; a failure in the looking is logged once (Everest's `log.txt`, tag `MuanlartinsLink`) and never
reaches the game. Nothing is kept or written.

- `src/Modulo.cs`: the module and what it reads (`Relator`), with the hooks it uses in its header.
- `src/Servidor.cs`: the server (a `TcpListener` on loopback, a background thread; the game thread only queues).
- `everest.yaml`: the mod's name, DLL and its dependency on Everest's .NET Core branch (`EverestCore`).
- `simular.py`: a stand-in with no game, for testing the pages (below).

## Build and install

```sh
scripts/celeste-mod/construir.sh              # build in WSL and copy into the game's Mods/MuanlartinsLink/
scripts/celeste-mod/construir.sh --so-compilar   # build only (bin/Release/)
```

It compiles against the installed game's own assemblies (`Celeste.dll`, `MMHOOK_Celeste.dll`, `FNA.dll`, MonoMod),
none copied (`Private=false`), with the .NET SDK in `~/.local/share/valorant-extract/` (`env.sh`); `CELESTE=<folder>`
for a game elsewhere. It copies `everest.yaml`, `MuanlartinsLink.dll` and its `.pdb` to
`…/steamapps/common/Celeste/Mods/MuanlartinsLink/`. Everest loads a new or changed mod on the game's next start
(copying while it runs is harmless: code reload is off), and lists it in Mod Options. It refuses while Luan is live.

**Uninstall:** delete the folder `Celeste/Mods/MuanlartinsLink` (or blacklist it in Everest's Mod Options), with the
game closed.

## What it says

`GET /eventos` sends the latest `estado` at once, then each message as one JSON per `data:` line (a comment every
15 s while quiet); `GET /estado` is the latest state as plain JSON. Every answer carries
`Access-Control-Allow-Origin: *` (OBS's browser sources and pages on localhost read it). Several clients at once. If
8797 is taken (a second game, `simular.py`) it tries again every 5 s.

**`estado`**, on connecting, whenever something in it changes (at most ~10 a second) and every 5 s in a level:

| field | what |
|---|---|
| `onde` | `nivel`, `menu`, `carregando` or `fim` (the chapter's end screen) |
| `capitulo` | in a level or its end: `id` (area), `sid`, `nome` (as the game shows it, in the player's language), `lado` (A/B/C), `numero` (the game's chapter number; -1 for interludes), `sala`, `colecao`, `interludio`, `dourado` (holding the golden strawberry); else `null` |
| `jogador` | `dashes`, `max` (both 0 where she has no dash yet, the prologue: not a spent one), `chao`, `estado` (`normal`, `escalada`, `dash`, `pena`, `bolha`, `bolha-vermelha` (from waiting in the red one on), `bloco-sonho`, `nado`, `morto`…), `vivo`; `null` with no player |
| `jogador.velocidade`, `jogador.cansado` | `[x, y]` in pixels a second, y up, in steps of 30; stamina low enough that she flashes red |
| `jogador.levando` | what follows her: `morangos` (not collected yet), `dourados`, `chaves` |
| `vento` | in a level: the wind, as `velocidade` |
| `perseguindo` | in a level: how many Badelines chase her (looked for 4 times a second) |
| `nucleo` | `quente` or `frio` where the core's mode applies, else `null` |
| `mortes` | `capitulo` (this session), `sala`, `capitulo_sempre` (the chapter side's saved total), `arquivo` |
| `morangos` | `capitulo` (the side's collected, as the chapter card counts), `total`, `sessao`, `arquivo`, `dourados` |
| `coracoes`, `fitas` | `capitulo` (true once this side's is collected), `arquivo` |
| `tempo` | `capitulo` and `arquivo` in ms, `correndo` while the chapter's clock moves (so a page ticks it between states) |
| `pausado` | the pause menu is open |

**The moments** (each `{ "tipo": … }`; `direcao` is `[x, y]` with y up):

| tipo | when, with |
|---|---|
| `dash` | a dash, once its direction is set: `direcao`, `restantes`, `max` |
| `recarga` | dashes refilled: `dashes`, `max`, `fonte` (`chao`, `cristal`, `outro`) |
| `morte`, `renasceu` | he dies (`mortes`, `sala`); he's back after a death |
| `morango` | a strawberry collected: `dourado`, `lua`, `alado`, `indice` (the game's chain: 0 is 1000 … 5 and up 1UP) |
| `pena_inicio`, `pena_aviso`, `pena_fim` | the feather's flight starts (`duracao`; again with `renovada` when another feather fills it), its warning (half a second left, as the game's), its end |
| `sala` | a room transition: `de`, `para`, `direcao` |
| `capitulo_inicio`, `capitulo_fim`, `saiu` | a chapter entered (its fields, `continuando`), completed (`mortes`, `tempo`, `morangos`), left (`modo`: SaveAndQuit, GiveUp, Restart, Completed…) |
| `coracao`, `fita` | the heart, the cassette (`repetido`/`repetida` when collected before) |

## On the camera

The Celeste filter follows it: `index.js` (dashes and the hair's colour, deaths, strawberries, the feather, the
chapter's ambient), `reacoes.js` (what lasts: her speed and the wind on his hair, states, what follows her) and
`momentos.js` (the heart, the cassette, a new room, the chapter's end), in `public/stream/filtros/celeste/`.
`filtros.html?modo=celeste&celeste-jogo=<url>` listens somewhere else (the stand-in); not `?celeste=<url>`, which is
the look's model.

## Without the game

`python3 scripts/celeste-mod/simular.py` serves the same on 8797 from `public/stream/celeste-sequencia.json` (a
chapter entered, dashes, refills, a death, strawberries, a feather, a room, a cassette, a heart, the end, then every chapter in turn), in
real time and over and over; `--passo` sends a step only when asked (`GET /passo?nome=<step>`), as
`scripts/filtros_teste.py celeste --jogo=celeste @entra:1 @dash:0.2 …` does. `jogo.html?jogo=celeste&demo` plays the
same sequence with no server at all. Don't leave it on 8797 while the game runs: WSL forwards its localhost ports to
Windows, so it would hold the game's port (the mod keeps retrying and takes over once it's gone).

With the real game: `http://127.0.0.1:8797/estado` in a browser on the stream PC while Celeste runs (from WSL,
`curl.exe -s http://127.0.0.1:8797/estado`: WSL's own curl can't reach Windows' loopback), and Everest's `log.txt`
in the game folder says `ouvindo em http://127.0.0.1:8797/eventos` once the mod loaded.
