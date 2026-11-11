"""Jogar o replay (RLR): the idea victormendes9510 left in a comment, built, shown on Luan's own conceded goal.

The take (Navegador scene, RLR in a window): 0-11 s RLR's first page, 12-13 the file dialog, 13.8-15.4 "Lendo
Partida 04…", 16-21 the field from above, 21.5-27 the 3D (his aerial misses at 24.1-24.7, "Gol!" at 27.0), 29.4-31
the goal's menu ("Defender como → muanlartins", clicked at 31.05), 32.2 the game in his hands, 37.05 his touch
clears the ball, 39.08 RLR says "Defendeu!" and the score goes back to 1-0.

The shape: the hook is the payoff's setup (the goal against, rewound like a tape, him in control frozen before the
touch), then the credit (Victor's own comment), how (open a .replay, watch it), the goal again in slow motion, the
menu, and the save with the stamp. Stage coordinates are the browser's page, 1080×564 (PALCO).
"""

TAKE = "2026-11-10 23-20-03 short.mp4"
NOME = "Jogar o replay"
TROCAS = {"Nieling": "League"}
CAUDA = 1.1  # after his last word: the stamp and the applause
PALCO = (0, 258, 1080, 564)
DESTAQUES = ["voltar", "erro", "Victor", "Mendes", "escolhe", "arquivo", "própria", "ruim", "defender", "browser",
             "refazer"]

# The replay's 3D without RLR's controls under it, and the game in his hands without the speed bar. TOPO as the
# frame's cy sits the picture at the top of the frame, the blurred copy under it, behind the captions.
REPLAY_3D = (0, 0, 1080, 438)
JOGANDO = (0, 0, 1080, 512)
TOPO = 999

COMENTARIO = [
    ("Cara sabe oque eu queria? […] antes de eu tomar o gol eu pudesse ", False),
    ("controlar o carro pra tentar defender", True),
    (" […] Isso seria muito util", False),
]


def roteiro(at):
    gol_contra = at("voltar") - 0.42
    cenas = [
        # Hook: the miss, sped into the goal, "Gol!" lands with a boom; frame 0 is already the play.
        {"de": 0, "entrada": None, "recorte": REPLAY_3D,
         "fonte": [(0, 24.25), (0.45, 24.70), (gol_contra, 27.02)],
         "quadro": [(0, 300, TOPO, 2.0), (0.45, 330, TOPO, 2.0), (gol_contra, 540, TOPO, 2.0)]},
        # "voltar num gol que você sofreu": the tape rewinds.
        {"de": at("voltar"), "entrada": None, "fx": ["vhs"], "recorte": REPLAY_3D,
         "fonte": [(at("voltar"), 27.4), (at("no"), 22.6)],
         "quadro": [(at("voltar"), 540, TOPO, 2.0), (at("no"), 500, TOPO, 2.0)]},
        # "no Rocket League e corrigir seu erro?": him driving at the ball, frozen right before the touch.
        {"de": at("no"), "fx": ["congela"], "depois": 0, "recorte": JOGANDO,
         "fonte": [(at("no"), 35.25), (at("erro"), 36.80)],
         "quadro": [(at("no"), 520, TOPO, 1.85), (at("erro"), 520, TOPO, 1.85), (at("erro|"), 530, TOPO, 2.2)]},
        # The credit: RLR's page behind Victor's comment.
        {"de": at("erro|"), "fonte": [(at("erro|"), 2.5)], "depois": 0,
         "quadro": [(at("erro|"), 540, 282, 1.0), (at("mim|"), 540, 282, 1.08)]},
        # "na nossa ferramenta do Rocket League Replay": the page, its title drawn sharp.
        {"de": at("mim|"), "fonte": [(at("mim|"), 6.0)], "depois": 0,
         "quadro": [(at("mim|"), 540, 245, 1.25), (at("replay|"), 540, 245, 1.45)]},
        # "você vem, escolhe o replay": the file dialog.
        {"de": at("replay|"),
         "fonte": [(at("replay|"), 11.75), (at("escolhe"), 12.85), (at("replay#2|"), 13.45)],
         "quadro": [(at("replay|"), 348, 170, 1.55), (at("escolhe"), 380, 120, 1.9)]},
        # "que é o arquivo…": RLR reading the .replay.
        {"de": at("replay#2|"),
         "fonte": [(at("replay#2|"), 13.85), (at("replay#3"), 15.45)],
         "quadro": [(at("replay#2|"), 540, 285, 1.5), (at("replay#3"), 540, 290, 1.7)]},
        # "…salva um replay do jogo, e aqui você já consegue assistir a sua própria partida": the field appears.
        {"de": at("replay#3"), "fonte": [(at("replay#3"), 16.15)],
         "quadro": [(at("replay#3"), 540, 290, 2.2), (at("replay#3") + 0.5, 540, 290, 1.0),
                    (at("partida|"), 540, 290, 1.3)]},
        # "esse é um gol que eu… tomei por fazer uma defesa ruim": the miss slowed, the goal sped, red flash.
        {"de": at("partida|"),
         "fonte": [(at("partida|"), 21.45), (at("tomei"), 24.05), (at("defesa"), 24.70), (at("ruim") + 0.12, 27.02)],
         "recorte": REPLAY_3D,
         "quadro": [(at("partida|"), 600, TOPO, 2.0), (at("tomei") - 0.4, 520, TOPO, 2.0),
                    (at("tomei"), 330, TOPO, 2.0), (at("defesa"), 300, TOPO, 2.0), (at("ruim") + 0.12, 540, TOPO, 2.0)]},
        # "E agora eu tenho a possibilidade de vir aqui": "Gol!", the pointer goes to the goal's marker.
        {"de": at("ruim|"),
         "fonte": [(at("ruim|"), 27.35), (at("escolher"), 29.55)],
         "quadro": [(at("ruim|"), 540, 215, 1.75), (at("vir"), 520, 260, 1.8), (at("escolher"), 300, 360, 2.0)]},
        # "escolher defender esse gol": the menu, "Defender como → muanlartins" ringed, clicked.
        {"de": at("aqui#3|"),
         "fonte": [(at("aqui#3|"), 29.6), (at("novamente"), 31.05)],
         "quadro": [(at("aqui#3|"), 270, 350, 2.2), (at("novamente"), 260, 340, 2.45)]},
        # "novamente como eu mesmo": his car, in his hands.
        {"de": at("novamente"),
         "fonte": [(at("novamente"), 32.15), (at("mesmo|"), 33.55)],
         "recorte": JOGANDO, "quadro": [(at("novamente"), 540, TOPO, 1.85), (at("mesmo|"), 550, TOPO, 1.85)]},
        # "jogar o Rocket League no browser": driving at the ball.
        {"de": at("mesmo|"),
         "fonte": [(at("mesmo|"), 33.55), (at("browser|"), 36.55)],
         "recorte": JOGANDO,
         "quadro": [(at("mesmo|"), 550, TOPO, 1.85), (at("jogar"), 530, TOPO, 1.85), (at("browser|"), 510, TOPO, 1.85)]},
        # "e ter a oportunidade de refazer a jogada": the touch in slow motion.
        {"de": at("browser|"),
         "fonte": [(at("browser|"), 36.55), (at("oportunidade") + 0.25, 36.95), (at("refazer") - 0.1, 37.12),
                   (at("jogada>"), 38.0)],
         "recorte": JOGANDO,
         "quadro": [(at("browser|"), 510, TOPO, 1.85), (at("oportunidade") + 0.25, 500, 300, 2.2),
                    (at("jogada>"), 520, TOPO, 1.85)]},
        # "E defender meu gol.": "Defendeu!" lands on "gol", the stamp, the applause.
        {"de": at("jogada|"),
         "fonte": [(at("jogada|"), 38.0), (at("gol#4"), 39.08)],
         "recorte": JOGANDO,
         "quadro": [(at("jogada|"), 540, TOPO, 1.85), (at("gol#4"), 540, TOPO, 1.85), (at(41.9), 540, TOPO, 1.95)]},
    ]
    end = at(99)
    stamp = ("fonte", 39.08)
    sobreposicoes = [
        {"tipo": "rebobinar", "de": at("voltar"), "ate": at("no"), "x": 330, "y": 360, "anim": "corte",
         "saida": "corte"},
        {"tipo": "comentario", "de": at("ideia") - 0.05, "ate": at("mim|"), "x": 540, "y": 560,
         "autor": "@victormendes9510", "onde": "comentário no YouTube", "inicial": "V",
         "texto": COMENTARIO},
        {"tipo": "rlr", "de": at("ferramenta"), "ate": at("replay|"), "ancora": (540, 228), "anim": "pop"},
        {"tipo": "chip", "de": at("replay"), "ate": at("replay|"), "x": 540, "y": 760, "icone": "globo",
         "texto": "muanlartins.com.br", "cauda": "/rlr"},
        {"tipo": "chip", "de": at("arquivo") - 0.05, "ate": at("replay#3") + 0.15, "x": 540, "y": 600,
         "icone": "arquivo", "fundo": (244, 245, 247), "tinta": (20, 20, 30), "cor_cauda": (0, 47, 167),
         "tamanho": 34, "texto": "Partida 04 - Vitória 6-4 (prorrogação)", "cauda": ".replay"},
        {"tipo": "anel", "de": ("fonte", 30.6), "ate": at("novamente"), "caixa": (176, 304, 258, 334)},
        {"tipo": "chip", "de": at("novamente") + 0.1, "ate": at("mesmo|") + 0.2, "x": 540, "y": 420,
         "icone": "ponto", "fundo": (8, 14, 38), "opacidade": 225, "tamanho": 36, "texto": "Jogando como ",
         "cauda": "muanlartins"},
        {"tipo": "chip", "de": at("browser"), "ate": end, "x": 540, "y": 340, "icone": "globo",
         "texto": "muanlartins.com.br", "cauda": "/rlr", "anim": "pop"},
        {"tipo": "carimbo", "de": stamp, "ate": end, "x": 540, "y": 540, "anim": "slam", "saida": "corte",
         "texto": "DEFENDEU!", "giro": -5},
    ]
    impactos = [
        {"em": gol_contra, "tremor": 16, "flash": (255, 255, 255, 0.5), "chute": 0.08},
        {"em": at("ruim") + 0.12, "tremor": 10, "flash": (181, 48, 49, 0.35), "chute": 0.06},
        {"em": ("fonte", 37.05), "tremor": 12, "flash": (255, 255, 255, 0.2), "chute": 0.07},
        {"em": stamp, "tremor": 8, "chute": 0.04},
    ]
    sons = [
        (gol_contra, "boom", -4),
        (at("voltar"), "rebobinar", -10, at("no") - at("voltar")),
        (at("erro"), "freio", -12),
        (at("erro|"), "whoosh", -14),
        (at("ideia") - 0.05, "pop", -10),
        (at("ferramenta"), "whoosh_curto", -14),
        (at("replay"), "pop", -12),
        (at("replay|"), "whoosh", -16),
        (("fonte", 13.25), "click", -8),
        (at("arquivo") - 0.05, "pop", -12),
        (at("replay#3"), "whoosh", -14),
        (at("partida|"), "whoosh_curto", -16),
        (at("ruim") + 0.12, "boom", -10),
        (at("ruim") + 0.12, "uuuh", -8),
        (("fonte", 31.0), "click", -6),
        (at("novamente"), "whoosh", -14),
        (at("browser"), "pop", -12),
        (("fonte", 37.05, -1.4), "riser", -16),
        (("fonte", 37.05), "hit", -4),
        (stamp, "boom", -12),
        (stamp, "ding", -8),
        (stamp, "palmas", -10),
    ]
    camera = [
        (0, 1.0), (at("corrigir"), 1.0), (at("erro>"), 1.16, "suave"), (at("erro|"), 1.0), (at("mim|"), 1.12),
        (at("replay|"), 1.0), (at("replay#2|"), 1.12), (at("jogo|"), 1.0), (at("partida|"), 1.12), (at("ruim|"), 1.0),
        (at("aqui#3|"), 1.1), (at("mesmo|"), 1.0), (at("browser|"), 1.12), (at("jogada|"), 1.0), (at("gol#4"), 1.0),
        (end, 1.14, "suave"),
    ]
    return {"cenas": cenas, "sobreposicoes": sobreposicoes, "impactos": impactos, "sons": sons, "camera": camera}
