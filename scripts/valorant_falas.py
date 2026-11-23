r"""An agent's voice lines for the site's Universo Valorant, in Portuguese and in English, from the game's own files.

The lines come from ~/.local/share/valorant-extract/falas.sh <agent> (the game's AkAudioEvents read with CUE4Parse,
the installed English audio and the Brazilian audio from Riot's own CDN, both read-only). This turns them into:
  public/valorant/falas/<agent>/<line>.<pt|en>.m4a   the audio (out of git; the release copies it to the site's bucket)
  content/valorant-universo/falas/<agent>.json       every line: who says it, when (the game's event), to whom, the
                                                      text in both languages, its length
The text is whisper.cpp's (on the stream PC's GPU), kept in the extraction's transcricoes.json so a rerun only
transcribes what's new; a line fixed by hand goes in content/valorant-universo/falas/<agent>.correcoes.json
({"<line id>": {"pt": "…", "en": "…"}}), which wins over whisper.

  python3 scripts/valorant_falas.py raze            convert, transcribe what's missing, write the JSON
  python3 scripts/valorant_falas.py raze --sem-audio   only the JSON (from the transcriptions already made)
  python3 scripts/valorant_falas.py raze --wiki        takes the English text from the VALORANT Wiki's /Quotes pages
                                                       (people's transcriptions) wherever a line matches one
  python3 scripts/valorant_falas.py raze --revisar     also has Gemini hear each line again (the Pix's key,
                                                       %USERPROFILE%\.config\muanlartins\gemini-chave.txt; cents):
                                                       whisper misses nicknames and slang on short lines ("Q-Joy"
                                                       for KJ). Its text wins over whisper's; corrections still win.
  python3 scripts/valorant_falas.py raze --publicar    at a release: zips the audio to the prerelease falas-raze and asks
                                                       .github/workflows/falas.yml to copy it to the site's bucket
                                                       (--limite 300: at 300 KB/s, while Luan is live)
Never while Luan is live: whisper takes the GPU.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import wave
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from windows import PROGRAMS, TEMP, run, to_windows  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EXTRACT = Path.home() / ".local/share/valorant-extract/falas"
WHISPER = PROGRAMS / "whisper"
MODEL = WHISPER / "models" / "ggml-large-v3-turbo-q5_0.bin"
LANGS = {"pt-BR": "pt", "en-US": "en"}

# The game's internal names for the agents (valorant-api.com's developerName; Cypher's events say Gumshoe or Aamir,
# Yoru's Stealth or Stealthboi), and the maps a line names.
CODENAMES = {
    "Aggrobot": "gekko", "BountyHunter": "fade", "Breach": "breach", "Cable": "deadlock", "Cashew": "tejo",
    "Clay": "raze", "Deadeye": "chamber", "Grenadier": "kayo", "Guide": "skye", "Gumshoe": "cypher", "Aamir": "cypher",
    "Hunter": "sova", "Iris": "miks", "Killjoy": "killjoy", "KJ": "killjoy", "Mage": "harbor", "Nox": "vyse",
    "Pandemic": "viper", "Paprika": "hush", "Phoenix": "phoenix", "Pine": "veto", "Rift": "astra", "Sarge": "brimstone",
    "Sequoia": "iso", "Smonk": "clove", "Sprinter": "neon", "Stealth": "yoru", "Stealthboi": "yoru", "Terra": "waylay",
    "Thorne": "sage", "Vampire": "reyna", "Wraith": "omen", "Wushu": "jett",
}
MAPS = {"Ascent": "Ascent", "Bonsai": "Split", "Duality": "Bind", "Triad": "Haven", "Port": "Icebox", "Foxtrot": "Breeze",
        "Canyon": "Fracture", "Pitt": "Pearl", "Jam": "Lotus", "Juliett": "Sunset", "Infinity": "Abyss", "Rook": "Corrode",
        "Plummet": "Summit"}

# When the game plays a line, from its event's name: the first rule that matches.
SITUATIONS = [
    ("esforco", r"(PainEffort|DeathEffort)"),
    ("selecao", r"^PickMe$"),
    ("maestria", r"^Bloomline"),
    ("conversa", r"^(MatchSrt|MatchS)_Chat_"),
    ("habilidade", r"^(Ability.(Cast|Equip)|CantUse|UltReady|UltNotReady|UltAlmostReady)"),
    ("abate-habilidade", r"^Ability.(Kill|MultipleKills)"),
    ("inicio-partida", r"^MatchStart"),
    ("inicio-rodada", r"^(RoundStart|RndStart|RoundSAllyCom|LastRoundofHalf)"),
    ("morte", r"^(BubbleDown|DeathEffort)"),
    ("abate", r"^(Kill|HeadshotKill|LastKill|MeleeKill|MeleeLastKill|TripleKill|QuadraKill|Pentakill|ULT_.*Kill|Modes_Kill)"),
    ("jogada", r"^(ClutchPlay|Flawless|Thrifty|BarelySurvived|Relief|Ressurect)"),
    ("spike", r"(Spike|Defuse|Plant|Carrier|Objective)"),
    ("vitoria", r"^(Won|MatchWin|GamePointWin|Modes_Match)"),
    ("comando", r"^(Emote|Going|FallBack|RushThem|TakePoint|OnMyWay|NeedDrop|NeedHealing|IHaveMoney|Saving|Buying|Reloading)"),
]


def situation(rest: str) -> str:
    for name, rule in SITUATIONS:
        if re.search(rule, rest):
            return name
    return "outra"


def parse_event(event: str):
    """Play_VO_<Speaker>[_E02]_<what>[_<Target>] → (speaker codename, what, target agent or map, ally/enemy)."""
    if event.startswith("Play_Bloomline_"):
        return event.split("_")[2], "Bloomline", None, None
    m = re.match(r"Play_VO_([A-Za-z]+)_(?:ULT_)?(?:E\d\d_)?(.*)$", event)
    if not m:
        return None, event, None, None
    speaker, rest = m.groups()
    target = side = None
    chat = re.match(r"(?:MatchSrt|MatchS)_Chat_([A-Z][a-z]+)([A-Z][A-Za-z]+)$", rest)
    if chat:
        pair = [CODENAMES.get(x) for x in chat.groups()]
        target = next((p for p in pair if p and p != CODENAMES.get(speaker)), None) or pair[0]
    else:
        tail = re.match(r"(.*?)_([A-Z][A-Za-z]+?)(?:_\d+)?$", rest)
        if tail and tail.group(2) in CODENAMES:
            target = CODENAMES[tail.group(2)]
        elif tail and tail.group(2) in MAPS:
            target = "mapa:" + MAPS[tail.group(2)]
    if re.search(r"Ally", rest):
        side = "aliado"
    elif re.search(r"Enemy", rest):
        side = "inimigo"
    return speaker, rest, target, side


def slug(line_id: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", line_id.lower()).strip("-")


def seconds(path: Path) -> float:
    with wave.open(str(path)) as w:
        return round(w.getnframes() / w.getframerate(), 2)


def wiki_match(agent, lines, cache, review, wiki_path):
    """The VALORANT Wiki's /Quotes page of everyone who speaks here, each quoted line after an audio file taken as a
    candidate; a line whose English (Gemini's, else whisper's) matches one closely enough takes the wiki's text."""
    import difflib
    import urllib.parse
    import urllib.request
    names = {**{v: k for k, v in CODENAMES.items()}}
    pages = json.loads((ROOT / "content" / "valorant-universo" / "jogo.json").read_text())["agentes"]
    display = {a["id"]: a["nome"] for a in pages}
    speakers = sorted({CODENAMES.get(i.split(".")[0], i.split(".")[0].lower()) for i in lines})
    candidates = []
    folder = EXTRACT / agent / "wiki"
    folder.mkdir(exist_ok=True)
    for who in speakers:
        title = display.get(who, who).replace("KAY/O", "KAYO") + "/Quotes"
        path = folder / (title.replace("/", "_") + ".json")
        if not path.exists():
            url = "https://valorant.fandom.com/api.php?action=parse&format=json&prop=wikitext&page=" + urllib.parse.quote(title)
            req = urllib.request.Request(url, headers={"User-Agent": "muanlartins-research/1.0"})
            path.write_bytes(urllib.request.urlopen(req, timeout=60).read())
        data = json.loads(path.read_text())
        if "parse" not in data:
            print("no wiki page", title)
            continue
        text = data["parse"]["wikitext"]["*"]
        for m in re.finditer(r'\{\{AC\|[^}]+\}\}\s*(?:\{\{AC\|[^}]+\}\}\s*)*((?:\"[^\"\n]+\"[^\n{|]*)+)', text):
            quoted = " ".join(re.findall(r'"([^"]+)"', re.sub(r"''\*[^*]*\*''", "", m.group(1))))
            if quoted:
                candidates.append((who, quoted))
    norm = lambda t: re.sub(r"[^a-z0-9 ]", "", t.lower())
    found = {}
    for line_id in lines:
        who = CODENAMES.get(line_id.split(".")[0], line_id.split(".")[0].lower())
        heard = review.get(f"{slug(line_id)}.en") or cache.get(f"{slug(line_id)}.en", "")
        if not heard:
            continue
        pool = [c for c in candidates if c[0] == who] or candidates
        best = max(pool, key=lambda c: difflib.SequenceMatcher(None, norm(c[1]), norm(heard)).ratio())
        ratio = difflib.SequenceMatcher(None, norm(best[1]), norm(heard)).ratio()
        # A short line matches by chance ("Raze, dead." heard as "Raise that!" is nearer "Can't use that."): it needs more.
        if ratio >= (0.85 if len(heard) < 25 else 0.6):
            found[slug(line_id)] = {"texto": best[1], "semelhanca": round(ratio, 2)}
    wiki_path.write_text(json.dumps(found, ensure_ascii=False, indent=1, sort_keys=True))
    print(f"wiki: {len(found)} of {len(lines)} lines matched ({len(candidates)} quotes on {len(speakers)} pages)")


def gemini_review(agent, lines, cache, review, review_path, work, drafts):
    """Gemini hears each line (in batches of 12, both languages) and corrects whisper's draft as little as it can: on
    2026-11-23 a free transcription by it swapped Raze's Bahian slang for common Portuguese ("barreando meu baba" became
    "baixando o astral, meu rei") while whisper had it right, but whisper misses names; the English goes as context; kept in the extraction's revisao-gemini.json so a rerun only asks for what's new."""
    import base64
    import time
    import urllib.request
    from windows import CONFIG
    key = (CONFIG / "gemini-chave.txt").read_text().strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={key}"
    names = "Raze, Killjoy (KJ), Breach, Brimstone (Brim), Sova, Jett, Phoenix, Sage, Viper, Omen, Reyna, Cypher, Skye, Yoru, Astra, KAY/O, Chamber, Neon, Fade, Harbor, Gekko, Deadlock, Iso, Clove, Vyse, Tejo, Waylay, Veto, Miks, Hush, Spike, Kingdom, ult"
    rules = {
        "pt": ("Você revisa transcrições de falas de agentes de Valorant na dublagem brasileira (a Raze é baiana, de "
               "Salvador). Para cada áudio vai um rascunho automático, que costuma acertar as gírias e o jeito de falar "
               "(barreando meu baba, barril, reggae, oxe, véi, meu rei) e errar nomes próprios. Escute e devolva o texto "
               "com o mínimo de mudanças: corrija só o que você ouve com certeza diferente, sobretudo nomes do jogo (" + names + "). "
               "Nunca troque uma gíria ou expressão regional por outra mais comum, nunca traduza da fala em inglês (que vai "
               "só como contexto) e mantenha o resto do rascunho como está. Um som sem palavras fica vazio."),
        "en": ("Transcribe exactly what is said in each clip, in English as spoken (keep any Portuguese words as said, e.g. "
               "'minha família'). These are Valorant agents' voice lines. Game names: " + names + ". Each clip comes with "
               "an automatic transcription that may be wrong; write what you hear, with subtitle punctuation. A sound "
               "with no words (a shout, a cough, a laugh) stays empty."),
    }
    todo = [(lid, lang) for lid, line in lines.items() for lang in line["wem"] if f"{slug(lid)}.{lang}" not in review]
    todo = [t for t in todo if not all(situation(parse_event(e)[1]) == "esforco" for e in lines[t[0]]["events"])]
    for lang in ("pt", "en"):
        batch_all = [lid for lid, l in todo if l == lang]
        for start in range(0, len(batch_all), 12):
            batch = batch_all[start:start + 12]
            parts = [{"text": rules[lang]}]
            for lid in batch:
                other = "en" if lang == "pt" else "pt"
                who = CODENAMES.get(lid.split(".")[0], lid.split(".")[0])
                if lang == "pt":
                    draft, english = drafts.get(f"{slug(lid)}.pt", ""), cache.get(f"{slug(lid)}.en", "")
                    parts.append({"text": f"Áudio {lid} (quem fala: {who}; rascunho: \"{draft}\"; em inglês: \"{english}\")"})
                else:
                    parts.append({"text": f"Audio {lid} (speaker: {who}; automatic: \"{cache.get(f'{slug(lid)}.en', '')}\")"})
                wav = work / f"{slug(lid)}.{lang}.wav"
                parts.append({"inline_data": {"mime_type": "audio/wav", "data": base64.b64encode(wav.read_bytes()).decode()}})
            body = {"contents": [{"parts": parts}], "generationConfig": {"temperature": 0, "responseMimeType": "application/json",
                    "responseSchema": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {"id": {"type": "STRING"}, "texto": {"type": "STRING"}}, "required": ["id", "texto"]}}}}
            for attempt in range(4):
                try:
                    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
                    res = json.load(urllib.request.urlopen(req, timeout=180))
                    got = json.loads(res["candidates"][0]["content"]["parts"][0]["text"])
                    break
                except Exception as e:  # noqa: BLE001
                    if attempt == 3:
                        raise
                    time.sleep(5 * (attempt + 1))
            by_id = {g["id"]: g["texto"].strip() for g in got}
            for lid in batch:
                if lid in by_id:
                    review[f"{slug(lid)}.{lang}"] = by_id[lid]
            review_path.write_text(json.dumps(review, ensure_ascii=False, indent=1, sort_keys=True))
            print(f"gemini {lang}: {start + len(batch)}/{len(batch_all)}", flush=True)
    return review


def publish(agent, limit=None):
    """The agent's audio as one zip on the prerelease falas-<agent>, then the copy to the bucket. A new release is made
    as a draft, gets the zip and is then published, which runs falas.yml; an existing one gets the zip again and the
    workflow by hand. `limit` (KB/s) uploads slowly through curl, so a live's upload isn't disturbed."""
    import tempfile
    import zipfile
    folder = ROOT / "public" / "valorant" / "falas" / agent
    files = sorted(folder.glob("*.m4a"))
    if not files:
        sys.exit(f"{folder} has no audio: run the script without --publicar first")
    tag = f"falas-{agent}"
    gh = lambda *a, **k: subprocess.run(["gh", *a], cwd=ROOT, check=True, **k)
    with tempfile.TemporaryDirectory() as tmp:
        zip_path = Path(tmp) / f"{tag}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as z:
            for f in files:
                z.write(f, f.name)
        exists = subprocess.run(["gh", "release", "view", tag], cwd=ROOT, capture_output=True).returncode == 0
        if not exists:
            gh("release", "create", tag, "--prerelease", "--draft", "--title", f"Falas: {agent}",
               "--notes", f"As falas de {agent} no Universo Valorant (scripts/valorant_falas.py), copiadas pro site por falas.yml.")
        if limit:
            release = json.loads(gh("api", f"repos/{{owner}}/{{repo}}/releases/tags/{tag}" if exists else "repos/{owner}/{repo}/releases",
                                    capture_output=True, text=True).stdout)
            release = release if exists else next(r for r in release if r["tag_name"] == tag)
            for asset in release.get("assets", []):
                if asset["name"] == zip_path.name:
                    gh("api", "-X", "DELETE", f"repos/{{owner}}/{{repo}}/releases/assets/{asset['id']}")
            token = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, check=True).stdout.strip()
            url = release["upload_url"].split("{")[0] + f"?name={zip_path.name}"
            subprocess.run(["curl", "-sS", "--fail", "--limit-rate", f"{limit}k", "-H", f"Authorization: Bearer {token}",
                            "-H", "Content-Type: application/zip", "--data-binary", f"@{zip_path}", "-o", "/dev/null", url], check=True)
        else:
            gh("release", "upload", tag, str(zip_path), "--clobber")
    if not exists:
        gh("release", "edit", tag, "--draft=false")  # published: falas.yml copies it
    else:
        gh("workflow", "run", "falas.yml", "--ref", "main", "-f", f"tag={tag}")
    print(f"{len(files)} files on {tag}; falas.yml copies them to /valorant/falas/{agent}/")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("agent")
    ap.add_argument("--sem-audio", action="store_true")
    ap.add_argument("--revisar", action="store_true")
    ap.add_argument("--wiki", action="store_true")
    ap.add_argument("--publicar", action="store_true")
    ap.add_argument("--limite", type=int, help="with --publicar: upload at most this many KB/s (during a live)")
    args = ap.parse_args()
    agent = args.agent
    if args.publicar:
        return publish(agent, args.limite)
    raw = EXTRACT / agent / "wem"
    tsv = raw / "events.tsv"
    if not tsv.exists():
        sys.exit(f"{tsv} doesn't exist: run ~/.local/share/valorant-extract/falas.sh {agent} first")

    # Every line (the game's media name) in each language, and every event that plays it.
    lines: dict[str, dict] = {}
    for row in tsv.read_text().splitlines():
        cols = row.split("\t")
        if len(cols) < 4:
            continue
        m = re.search(r"/([^/]+) \((pt-BR|en-US)\)$", cols[3])
        if not m:
            continue  # efforts and grunts: no language, no words
        line_id, lang = m.groups()
        event = cols[1].split("/")[0]
        line = lines.setdefault(line_id, {"events": set(), "wem": {}})
        line["events"].add(event)
        line["wem"][LANGS[lang]] = raw / cols[1]
    print(f"{len(lines)} lines")

    work = TEMP / f"muanlartins-falas-{agent}"
    audio = ROOT / "public" / "valorant" / "falas" / agent
    cache_path = EXTRACT / agent / "transcricoes.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    if not args.sem_audio:
        work.mkdir(parents=True, exist_ok=True)
        audio.mkdir(parents=True, exist_ok=True)
        for line_id, line in lines.items():
            for lang, wem in line["wem"].items():
                name = f"{slug(line_id)}.{lang}"
                wav, m4a, w16 = work / f"{name}.full.wav", audio / f"{name}.m4a", work / f"{name}.wav"
                if not wav.exists():
                    subprocess.run(["vgmstream-cli", "-o", str(wav), str(wem)], check=True, capture_output=True)
                if not m4a.exists():
                    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1",
                                    "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(m4a)], check=True)
                if not w16.exists():
                    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1",
                                    "-ar", "16000", "-c:a", "pcm_s16le", str(w16)], check=True)
                line.setdefault("seconds", {})[lang] = seconds(w16)
        # whisper.cpp in batches, one language at a time, only what isn't transcribed yet.
        names = {"pt": "Raze, Killjoy, Breach, Brimstone, Sova, Jett, Phoenix, Sage, Viper, Omen, Reyna, Cypher, Skye, Yoru, Astra, KAY/O, Chamber, Neon, Fade, Harbor, Gekko, Deadlock, Iso, Clove, Vyse, Tejo, Waylay, Veto, Miks, Hush, Spike"}
        names["en"] = names["pt"]
        for lang, code in (("pt", "pt"), ("en", "en")):
            todo = [slug(i) for i, line in lines.items() if lang in line["wem"] and f"{slug(i)}.{lang}" not in cache]
            for start in range(0, len(todo), 80):
                batch = [work / f"{name}.{lang}.wav" for name in todo[start:start + 80]]
                print(f"whisper {lang}: {start + len(batch)}/{len(todo)}", flush=True)
                run(WHISPER / "whisper-cli.exe", "-m", to_windows(MODEL), "-l", code, "-mc", "0", "-oj", "-np",
                    "--prompt", names[lang], *[to_windows(b) for b in batch],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                for b in batch:
                    out = b.with_name(b.name + ".json")
                    result = json.loads(out.read_text(encoding="utf-8"))
                    cache[b.name[: -len(".wav")]] = " ".join(s["text"].strip() for s in result["transcription"]).strip()
                    out.unlink()
                cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1, sort_keys=True))
    else:
        for line_id, line in lines.items():
            for lang in line["wem"]:
                w16 = work / f"{slug(line_id)}.{lang}.wav"
                if w16.exists():
                    line.setdefault("seconds", {})[lang] = seconds(w16)

    wiki_path = EXTRACT / agent / "wiki-en.json"
    review_path = EXTRACT / agent / "revisao-gemini.json"
    review = json.loads(review_path.read_text()) if review_path.exists() else {}
    if args.wiki:
        wiki_match(agent, lines, cache, review, wiki_path)
    wiki = json.loads(wiki_path.read_text()) if wiki_path.exists() else {}
    if args.revisar:
        # Gemini hears the Portuguese with the best English there is as context: the wiki's, else its own.
        context = {**cache, **{k: v for k, v in review.items() if k.endswith(".en")}, **{f"{k}.en": v["texto"] for k, v in wiki.items()}}
        review = gemini_review(agent, lines, context, review, review_path, work, drafts=cache)

    fixes_path = ROOT / "content" / "valorant-universo" / "falas" / f"{agent}.correcoes.json"
    fixes = json.loads(fixes_path.read_text()) if fixes_path.exists() else {}
    me = next(k for k, v in CODENAMES.items() if v == agent)
    out = []
    for line_id, line in sorted(lines.items()):
        if all(situation(parse_event(e)[1]) == "esforco" for e in line["events"]):
            continue  # pain and effort sounds: no words
        speaker = CODENAMES.get(line_id.split(".")[0], line_id.split(".")[0].lower())
        events = sorted(line["events"])
        parsed = [parse_event(e) for e in events]
        # The event's speaker is whoever owns it; the line's own prefix says who's talking (a chat has both).
        what = parsed[0][1]
        targets = sorted({p[2] for p in parsed if p[2] and p[2] != speaker})
        if speaker != agent and agent not in targets:
            targets.append(agent)
        sides = sorted({p[3] for p in parsed if p[3]})
        best = {"en": wiki.get(slug(line_id), {}).get("texto")}
        text = {lang: fixes.get(line_id, {}).get(lang) or best.get(lang) or review.get(f"{slug(line_id)}.{lang}") or cache.get(f"{slug(line_id)}.{lang}", "") for lang in ("pt", "en")}
        out.append({
            "id": slug(line_id),
            "jogo": line_id,
            "quem": speaker,
            "quando": situation(what),
            "eventos": events,
            **({"com": targets} if targets else {}),
            **({"lado": sides[0]} if len(sides) == 1 else {}),
            "pt": text["pt"],
            "en": text["en"],
            "segundos": line.get("seconds", {}),
        })
    dest = ROOT / "content" / "valorant-universo" / "falas" / f"{agent}.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps({"agente": agent, "codinome": me, "falas": out}, ensure_ascii=False, indent=1) + "\n")
    by = defaultdict(int)
    for line in out:
        by[line["quando"]] += 1
    print(f"{dest.relative_to(ROOT)}: {len(out)} lines", dict(sorted(by.items())))
    if not args.sem_audio:
        print(f"{audio.relative_to(ROOT)}: {sum(1 for _ in audio.glob('*.m4a'))} files, "
              f"{sum(f.stat().st_size for f in audio.glob('*.m4a')) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
