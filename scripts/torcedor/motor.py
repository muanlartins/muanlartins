# The Python side of motor.mjs: reads what the user gave, asks the real esquema.js (through Node) and says the answer.
# Also the one place that says whether OBS is on air, which the render and the API ask before any browser work.
import json, pathlib, subprocess, sys, time

KIT = pathlib.Path(__file__).resolve().parent
RAIZ = KIT.parent.parent
MJS = KIT / "motor.mjs"
OBS = RAIZ / "scripts" / "obs.mjs"
SAIDA = KIT / "saida"


def chamar(cmd, texto="", sair=True):
    """`sair`: the CLI stops with the message; the server (sair=False) gets an exception and answers with it."""
    try:
        r = subprocess.run(["node", str(MJS), cmd], input=texto, capture_output=True, text=True, encoding="utf-8")
        erro = r.returncode and f"motor.mjs falhou:\n{r.stderr.strip()}"
    except FileNotFoundError:
        erro = "Precisa do Node (node) no PATH: o kit roda o esquema.js de verdade nele."
    if erro and sair:
        sys.exit(erro)
    if erro:
        raise RuntimeError(erro)
    return json.loads(r.stdout)


def ilegivel(msg):
    """Unreadable input: exit code 2, so an agent tells it apart from a look with warnings (0)."""
    print(msg, file=sys.stderr)
    sys.exit(2)


def ler(arg):
    """The input as text: a file, '-' for stdin, or the value itself (a T1 code, a #t= link or inline JSON)."""
    if arg == "-":
        return sys.stdin.read()
    s = arg.strip()
    if s.startswith(("T1:", "{", "[", '"')) or "#t=" in s or "T1%3A" in s:
        return s
    p = pathlib.Path(arg)
    if p.is_file():
        return p.read_text(encoding="utf-8")
    ilegivel(f"Não achei o arquivo {arg!r}, e ele não é um código T1 nem JSON.")


def validar(arg):
    r = chamar("validar", ler(arg))
    if not r["ok"]:
        ilegivel(f"Não deu pra ler: {r['erro']}")
    return r


def kb(n):
    return f"{n / 1000:.2f} KB".replace(".", ",")


def resumo(r, arquivo=sys.stdout):
    """The warnings and the size, the way validar and render print them."""
    p = lambda *a: print(*a, file=arquivo)
    c = r["contagem"]
    p(f"Tamanho: {kb(r['bytes'])} · código com {r['caracteres']} caracteres (limite {r['limite']})"
      f" · {c['pecas']} peças, {c['desenhos']} desenhos, {c['mechas']} mechas")
    if not r["cabe"]:
        p(f"ERRO: o código passa de {r['limite']} caracteres e o editor não abre. Tire peças, desenhos ou mechas.")
    if not r["cabePerfil"]:
        p(f"ERRO: o look passa de {r['limitePerfil']} bytes e o perfil não salva. Tire peças, desenhos ou mechas.")
    if not r["idaVolta"]:
        p("ERRO: o código não volta igual (avise quem cuida do torcedor).")
    for titulo, itens in (("Avisos", [a["mensagem"] for a in r["avisos"]]), ("Sem efeito", [n["mensagem"] for n in r["semEfeito"]]), ("Escondido", r["dicas"])):
        if itens:
            p(f"{titulo} ({len(itens)}):")
            for i in itens:
                p(f"  - {i}")
    if not (r["avisos"] or r["semEfeito"] or r["dicas"]):
        p("Sem avisos.")


AO_VIVO = "O OBS está ao vivo ou gravando: o render fica pra depois (pesa na live). Tente de novo quando acabar."
_visto = [0.0, False]


def ao_vivo(cache=0):
    """Whether OBS is streaming or recording on this PC (scripts/obs.mjs status). OBS closed, or a machine without
    it, counts as not on air. `cache`: seconds a previous answer still holds (the API asks before every render)."""
    if cache and time.monotonic() - _visto[0] < cache:
        return _visto[1]
    sim = False
    if OBS.is_file():
        try:
            r = subprocess.run(["node", str(OBS), "status"], capture_output=True, text=True, encoding="utf-8", timeout=15)
            linha = (r.stdout.splitlines() or [""])[0]
            sim = r.returncode == 0 and ("live: yes" in linha or "recording: yes" in linha)
        except (OSError, subprocess.TimeoutExpired):
            pass
    _visto[:] = [time.monotonic(), sim]
    return sim
