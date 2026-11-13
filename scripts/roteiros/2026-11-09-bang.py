"""A bang do Fênix: the best of the live of 2026-11-09 (Valorant, Phoenix) in one reel, Luan's picks of the
candidates (2026-11-11): the camera filter's flash, his "bang", in the game and on the camera.

Hook: in Conversa, big camera, "Quer que faça a bang?", the orb in his hand, "Puf!", the camera goes white. Out of
the white into Lotus: "calma, calma", Phoenix's Curveball in the game and the flash on his camera at once, "BANG", the
peek and the kill (held). The last round of Lotus: the flash on the camera, the orb in his hand in the game, "olha o
bang", the flash in the game and on the camera, VICTORY, "Vitória. A vitória veio." Sunset, filter off: two kills in a
row, then "shh" with the camera zoomed in (Lance ruim). The rage: "Ai, sai, sai, filha da… Perdão, perdão", the
Terapia scene ("Momento de terapia, Dani. Respira. Não pode se estressar nesse jogo."), "Vamos lá. De volta ao jogo."
The end: "Watch your eyes", the flash, white, and the reel starts over on the hook's question.
"""

LIVE = "2026-11-09"
NOME = "a bang do Fênix"
TROCAS = {"bangue": "bang", "banque": "bang", "Bang": "BANG", "Dainer": "Dani"}
DESTAQUES = ["bang", "BANG", "Puf", "calma", "Vitória", "veio", "terapia", "Respira", "estressar", "jogo", "eyes"]

CONVERSA = (64, 64, 1280, 720)   # the camera in Conversa, on the live's 1920×1080
TERAPIA = (64, 64, 560, 290)     # the camera in Terapia (its box, without the site's bar)
BOX = (46, 62, 476, 236)         # the game scenes' box (cortes.CAM_RECT), held through the fade into Terapia
KILL_A = 2412.0                  # the kill after the Curveball (killfeed)
KILLS_E = (5414.5, 5415.1)
TRECHOS = [
    (3560.90, 3564.45),                     # hook: "Quer que faça a bang?", the orb, "Puf!", the flash
    (2408.85, KILL_A + 0.05),               # "calma, calma", the Curveball and the camera's flash, "BANG", the peek
    (KILL_A + 0.05, KILL_A + 0.05, 0.35),   # held on the kill
    (KILL_A + 0.05, 2412.75),
    (3516.80, 3519.70),                     # Lotus' last round: the camera's flash, the orb in his hand
    (3523.30, 3527.60),                     # "olha o bang": the flash in the game and on the camera
    (3529.60, 3533.00),                     # VICTORY, "Vitória. A vitória veio."
    (5413.60, 5416.00),                     # Sunset: two kills in a row
    (5418.35, 5420.60),                     # "shh", the camera zoomed in (Lance ruim)
    (4394.30, 4398.85),                     # "Ai, sai, sai, filha da… Perdão, perdão."
    (4399.90, 4401.25),                     # Terapia: "Momento de terapia, Dani."
    (4403.40, 4405.70),                     # "Respira. Não pode se estressar nesse jogo."
    (4408.25, 4409.10),                     # "De volta ao jogo."
    (3567.70, 3570.30),                     # "Watch your eyes", the flash: white, and it loops
]
MIRA = (960, 540)
FACE = (281, 143)  # his face in Conversa's camera, in the box's terms (238, 118 the middle)
ZOOM = (297, 131)  # his face in Lance ruim's camera, zoomed to the whole frame


def roteiro(at):
    puf, flash_c1 = at(3562.55), at(3563.5)
    a0, cast, cam_a, bang, kill, held = at(2408.85), at(2409.0), at(2409.5), at(2410.27), at(KILL_A), at(KILL_A + 0.05) + 0.35
    b0, b_flash, olha, b_both, win, vit = at(3516.8), at(3517.0), at(3523.3), at(3525.0), at(3529.6), at(3531.67)
    e0, k1, k2, shh = at(5413.6), at(KILLS_E[0]), at(KILLS_E[1]), at(5418.35)
    d0, fade, terapia, volta = at(4394.3), at(4397.6), at(4399.9), at(4408.25)
    c2, flash_c2, end = at(3567.7), at(3569.0), at(3570.30)
    return {
        "fim": end,
        "costura": [(0, 1920), (a0 - 0.01, 1920), (a0, 760), (cam_a + 0.9, 760), (kill - 0.5, 600),
                    (held, 600), (b0, 760), (win - 0.01, 760), (win, 560), (e0, 520), (shh - 0.01, 520),
                    (shh, 1920), (d0 - 0.01, 1920), (d0, 820), (terapia, 820), (volta - 0.01, 820), (volta, 700),
                    (c2 - 0.01, 700), (c2, 1920)],
        "jogo": [(0, *MIRA, 1.0, 1150), (a0, *MIRA, 1.15, 1300), (kill - 0.6, *MIRA, 1.55, 1240),
                 (held + 0.1, *MIRA, 1.25, 1240), (b0, *MIRA, 1.0, 1320), (win, 960, 540, 1.0, 1220),
                 (e0, *MIRA, 1.45, 1200), (k2 + 0.3, *MIRA, 1.6, 1200), (d0, *MIRA, 1.0, 1340),
                 (fade - 0.01, *MIRA, 1.0, 1340), (fade, 1040, 560, 1.0, 1340), (terapia, 720, 800, 1.25, 1350),
                 (volta - 0.01, 720, 800, 1.25, 1350), (volta, *MIRA, 1.0, 1300)],
        "camera": [(0, *FACE, 1.0), (a0, 238, 118, 1.0), (shh, *ZOOM, 1.0), (d0, 238, 112, 1.0),
                   (terapia, 238, 118, 1.0), (volta, 238, 112, 1.0), (c2, *FACE, 1.0)],
        # The fade into Terapia hides the Pix QR code, which would read as a camera scene: the box held there.
        "quadro_camera": [(0, a0, CONVERSA), (shh, d0, (0, 0, 1920, 1080)), (fade, terapia, BOX), (terapia, volta, TERAPIA),
                          (c2, end + 1, CONVERSA)],
        # The live's own screen while it showed Terapia: the water coming over the game, then the breathing.
        "efeitos": [(kill + 0.05, held, "congela"), (fade, volta, "live")],
        "impactos": [
            {"em": flash_c1, "flash": (255, 244, 225, 0.6), "tremor": 10, "chute": 0.04},
            {"em": a0, "chute": 0.06},
            {"em": cam_a, "flash": (255, 244, 225, 0.5), "tremor": 8, "chute": 0.04},
            {"em": bang, "tremor": 12, "chute": 0.06},
            {"em": kill, "flash": (255, 255, 255, 0.35), "tremor": 14, "chute": 0.08},
            {"em": b_flash, "flash": (255, 244, 225, 0.45), "tremor": 8, "chute": 0.04},
            {"em": b_both, "flash": (255, 244, 225, 0.55), "tremor": 10, "chute": 0.05},
            {"em": k1, "flash": (255, 255, 255, 0.3), "tremor": 12, "chute": 0.07},
            {"em": k2, "flash": (255, 255, 255, 0.3), "tremor": 12, "chute": 0.07},
            {"em": shh, "tremor": 6, "chute": 0.03},
            {"em": terapia, "chute": 0.03},
            {"em": flash_c2, "flash": (255, 244, 225, 0.7), "tremor": 12, "chute": 0.05},
        ],
        "sobreposicoes": [
            {"tipo": "titulo", "linhas": [[("A BANG", False)], [("DO ", False), ("FÊNIX", True)]],
             "tamanho": 104, "de": 0.0, "ate": puf - 0.05, "anim": "slam", "x": 540, "y": 420},
            {"tipo": "carimbo", "texto": "2K", "tamanho": 120, "de": k2, "ate": shh, "anim": "slam",
             "x": 820, "y": 900},
        ],
        "sons": [
            (puf - 0.35, "riser", -16), (flash_c1, "boom", -8),
            (a0, "whoosh_curto", -14), (cam_a, "boom", -11), (kill, "hit", -8), (kill + 0.05, "freio", -13),
            (b0, "whoosh_curto", -14), (b_both, "boom", -11), (vit, "palmas", -14),
            (e0, "whoosh_curto", -14), (k1, "hit", -10), (k2, "hit", -8), (shh, "suspense", -16),
            (d0, "whoosh_curto", -15), (terapia, "ding", -16), (volta, "whoosh_curto", -15),
            (c2, "whoosh_curto", -15), (flash_c2 - 0.6, "riser", -16), (flash_c2, "boom", -8),
        ],
    }
