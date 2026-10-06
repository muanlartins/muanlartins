import colorsys
import itertools
import math
import os
import subprocess
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).parent
SITE = ROOT.parent
FONT = ROOT / "fonts" / "SpaceGrotesk.ttf"

KLEIN = "#002FA7"
PAPER = "#F4F5F7"


def klein_tint(lightness):
    h, _, s = colorsys.rgb_to_hls(0x00 / 255, 0x2F / 255, 0xA7 / 255)
    return "#%02X%02X%02X" % tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, lightness, s))


KLEIN_LIGHT = klein_tint(0.76)

# "Luan" on a 45° lattice, rotated 90° (reads as Σ); the second copy is the same stroke turned 180°.
LUAN = [(2, 0), (1, 1), (0, 0), (1.5, -1.5), (0, -3), (2, -3)]
LUAN_TURNED = [(1, -2), (2, -3), (3, -2), (1.5, -0.5), (3, 1), (1, 1)]
# Where the strokes meet, and which copy passes on top. Alternating keeps the 180° symmetry.
CROSSINGS = [((2, 0), "a"), ((1, 1), "a"), ((1, -2), "b"), ((2, -3), "b")]
MITER = 1 / math.sin(math.radians(22.5)) / 2


def enclosing_circle(points):
    best = None

    def covers(c, r):
        return all(math.dist(c, p) <= r + 1e-9 for p in points)

    for a, b in itertools.combinations(points, 2):
        c, r = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), math.dist(a, b) / 2
        if covers(c, r) and (best is None or r < best[1]):
            best = (c, r)
    for a, b, c in itertools.combinations(points, 3):
        d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]))
        if abs(d) < 1e-9:
            continue
        sa, sb, sc = (p[0] ** 2 + p[1] ** 2 for p in (a, b, c))
        ux = (sa * (b[1] - c[1]) + sb * (c[1] - a[1]) + sc * (a[1] - b[1])) / d
        uy = (sa * (c[0] - b[0]) + sb * (a[0] - c[0]) + sc * (b[0] - a[0])) / d
        r = math.dist((ux, uy), a)
        if covers((ux, uy), r) and (best is None or r < best[1]):
            best = ((ux, uy), r)
    return best


def mark(size=256, fit="circle", fill=0.69, stroke=0.24, gap=0.65, b_weight=1.0,
         weave=True, a_color=PAPER, b_color=KLEIN_LIGHT, background=KLEIN, round_corners=False, uid="", crisp=False):
    """Return the woven mark as SVG markup (no <svg> wrapper), plus its unit scale."""
    pts = LUAN + LUAN_TURNED
    reach = stroke * (0.5 if round_corners else MITER)
    if fit == "circle":
        (cx, cy), r = enclosing_circle(pts)
        u = size * fill / 2 / (r + reach)
    else:
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        u = size * fill / (max(max(xs) - min(xs), max(ys) - min(ys)) + 2 * reach)
    w, g = u * stroke, u * stroke * gap
    to_px = lambda p: (size / 2 + (p[0] - cx) * u, size / 2 - (p[1] - cy) * u)
    path = lambda pts: "M" + "L".join("%.2f %.2f" % to_px(p) for p in pts)
    cap, join = ("round", "round") if round_corners else ("square", "miter")
    paths = {"a": path(LUAN), "b": path(LUAN_TURNED)}
    widths = {"a": w, "b": w * b_weight}
    defs, body = [], []
    for under, over in (("a", "b"), ("b", "a")):
        holes = []
        if weave:
            for i, (p, top) in enumerate(CROSSINGS):
                if top != over:
                    continue
                x, y = to_px(p)
                cid = f"{uid}x{under}{i}"
                defs.append(f'<clipPath id="{cid}"><circle cx="{x:.2f}" cy="{y:.2f}" r="{(w + 2 * g) * 1.7:.2f}"/></clipPath>')
                holes.append(f'<path d="{paths[over]}" clip-path="url(#{cid})" fill="none" stroke="#000" '
                             f'stroke-width="{widths[over] + 2 * g:.2f}" stroke-linecap="{cap}" stroke-linejoin="{join}" stroke-miterlimit="10"/>')
        defs.append(f'<mask id="{uid}m{under}" maskUnits="userSpaceOnUse" x="0" y="0" width="{size}" height="{size}">'
                    f'<rect width="{size}" height="{size}" fill="#fff"/>{"".join(holes)}</mask>')
    for name, color in (("b", b_color), ("a", a_color)):
        body.append(f'<path d="{paths[name]}" mask="url(#{uid}m{name})"{' shape-rendering="crispEdges"' if crisp else ''} fill="none" stroke="{color}" stroke-width="{widths[name]:.2f}" '
                    f'stroke-linecap="{cap}" stroke-linejoin="{join}" stroke-miterlimit="10"/>')
    bg = f'<rect width="{size}" height="{size}" fill="{background}"/>' if background else ""
    return f'<defs>{"".join(defs)}</defs>{bg}{"".join(body)}'


def svg(inner, w, h=None):
    h = h or w
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{inner}</svg>\n'


def wordmark(text, weight=500, size=100):
    """Shape `text` with HarfBuzz (kerning included) and return outlined SVG path data, width, x-height, ascender."""
    font = instancer.instantiateVariableFont(TTFont(FONT), {"wght": weight})
    upem = font["head"].unitsPerEm
    face = hb.Face(FONT.read_bytes())
    hbfont = hb.Font(face)
    hbfont.set_variations({"wght": weight})
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    glyphs, order = font.getGlyphSet(), font.getGlyphOrder()
    scale = size / upem
    pen, x = SVGPathPen(glyphs), 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        glyphs[order[info.codepoint]].draw(TransformPen(pen, (scale, 0, 0, -scale, (x + pos.x_offset) * scale, 0)))
        x += pos.x_advance
    os2 = font["OS/2"]
    return pen.getCommands(), x * scale, os2.sxHeight * scale, font["hhea"].ascent * scale


def lockup(height=200, background=KLEIN, text_color=PAPER):
    m = height
    inner = mark(size=m, fit="box", fill=1.0, background=None)
    d, tw, xh, _ = wordmark("muanlartins", size=m * 0.62)
    gap = m * 0.30
    pad = m * 0.35
    W, H = pad + m + gap + tw + pad, m + 2 * pad
    baseline = pad + m / 2 + xh / 2
    body = (f'<rect width="{W:.1f}" height="{H:.1f}" fill="{background}"/>' if background else "")
    body += f'<g transform="translate({pad:.1f} {pad:.1f})">{inner}</g>'
    body += f'<path transform="translate({pad + m + gap:.1f} {baseline:.1f})" d="{d}" fill="{text_color}"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.1f} {H:.1f}" width="{W:.0f}" height="{H:.0f}">{body}</svg>\n'


def write(path, content):
    path = ROOT / path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    return path


def png(src, out, width):
    subprocess.run(["rsvg-convert", "-w", str(width), str(ROOT / src), "-o", str(ROOT / out)], check=True)


def circle_png(src, out, width):
    png(src, out, width)
    h = width // 2
    subprocess.run(["magick", str(ROOT / out), "(", "+clone", "-alpha", "extract", "-fill", "black", "-colorize", "100",
                    "-fill", "white", "-draw", f"circle {h},{h} {h},0", ")", "-alpha", "off", "-compose", "copy_opacity",
                    "-composite", str(ROOT / out)], check=True)


def og(width=1200, height=630, mark_height=150):
    """Social preview card: the lockup centred on Klein."""
    inner = lockup(height=mark_height, background=None)
    w, h = (float(v) for v in inner.split('viewBox="0 0 ')[1].split('"')[0].split())
    inner = inner.replace(f'width="{w:.0f}" height="{h:.0f}"', f'x="{(width - w) / 2:.1f}" y="{(height - h) / 2:.1f}" width="{w:.1f}" height="{h:.1f}"')
    return svg(f'<rect width="{width}" height="{height}" fill="{KLEIN}"/>{inner}', width, height)


# YouTube shows all 2560×1440 only on TVs; this centred strip is what every device keeps.
BANNER_SAFE = (1546, 423)


def banner(width=2560, height=1440, mark_height=190, lattice=KLEIN_LIGHT):
    """YouTube channel art: the lockup in the safe strip, on the 45° lattice the mark is drawn on,
    aligned so its strokes run along the lattice lines. The lattice fades out around the lockup."""
    inner = lockup(height=mark_height, background=None)
    w, h = (float(v) for v in inner.split('viewBox="0 0 ')[1].split('"')[0].split())
    x0, y0 = (width - w) / 2, (height - h) / 2
    inner = inner.replace(f'width="{w:.0f}" height="{h:.0f}"', f'x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="{h:.1f}"')

    # Same placement lockup() gives the mark (fit="box", fill=1.0), so lattice point (x, y) lands on
    # pixel (ox + x·u, oy − y·u): lines x + y = k and x − y = k pass through every corner of the mark.
    pts = LUAN + LUAN_TURNED
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    u = mark_height / (max(max(xs) - min(xs), max(ys) - min(ys)) + 2 * 0.24 * MITER)
    pad = mark_height * 0.35
    ox = x0 + pad + mark_height / 2 - (min(xs) + max(xs)) / 2 * u
    oy = y0 + pad + mark_height / 2 + (min(ys) + max(ys)) / 2 * u
    reach = (width + height) / u
    lines = []
    for k in range(-int(reach) - 1, int(reach) + 2):
        # x + y = k runs down-right on screen, x − y = k up-right; both cross row y = 0 at x = k.
        lines.append(f"M{ox + k * u - height:.1f} {oy - height:.1f}L{ox + k * u + height:.1f} {oy + height:.1f}")
        lines.append(f"M{ox + k * u - height:.1f} {oy + height:.1f}L{ox + k * u + height:.1f} {oy - height:.1f}")
    sw, sh = BANNER_SAFE
    fade = (f'<radialGradient id="fade" cx="{width / 2}" cy="{height / 2}" r="{sw * 0.62:.0f}" '
            f'gradientTransform="translate({width / 2} {height / 2}) scale(1 {sh * 1.5 / sw:.3f}) translate({-width / 2} {-height / 2})" '
            f'gradientUnits="userSpaceOnUse"><stop offset="0.45" stop-color="#000"/><stop offset="1" stop-color="#fff"/></radialGradient>'
            f'<mask id="lat"><rect width="{width}" height="{height}" fill="#fff"/>'
            f'<rect width="{width}" height="{height}" fill="url(#fade)"/></mask>')
    grid = (f'<path d="{"".join(lines)}" mask="url(#lat)" fill="none" stroke="{lattice}" '
            f'stroke-opacity="0.22" stroke-width="{u * 0.045:.2f}"/>')
    return svg(f'<defs>{fade}</defs><rect width="{width}" height="{height}" fill="{KLEIN}"/>{grid}{inner}', width, height)


def banner_preview(src, out, width=2560, height=1440):
    """The banner with YouTube's crops drawn on: TV (all), desktop (full-width strip), safe strip."""
    sw, sh = BANNER_SAFE
    desk = (width - sw) / 2
    outline = lambda x, y, w, h, c: f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="{c}" stroke-width="6" stroke-dasharray="24 14"/>'
    overlay = (outline(3, (height - sh) / 2, width - 6, sh, "#FFD84D") + outline(desk, (height - sh) / 2, sw, sh, "#FF6B6B")
               + f'<text x="{desk + 16}" y="{(height - sh) / 2 - 18}" font-family="Helvetica Neue, Arial" font-size="34" fill="#FF6B6B">safe on every device</text>'
               + f'<text x="20" y="{(height - sh) / 2 - 18}" font-family="Helvetica Neue, Arial" font-size="34" fill="#FFD84D">desktop</text>'
               + f'<text x="20" y="54" font-family="Helvetica Neue, Arial" font-size="34" fill="{PAPER}">TV (everything)</text>')
    write(out, svg(f'<image href="{Path(src).name}" width="{width}" height="{height}"/>{overlay}', width, height))


def site_assets():
    """Copy the identity into the website's Next.js file conventions."""
    (SITE / "app" / "icon.svg").write_text((ROOT / "small/mark-small.svg").read_text())
    (SITE / "app" / "favicon.ico").write_bytes((ROOT / "small/favicon.ico").read_bytes())
    png("logo/mark-on-klein.svg", SITE / "app" / "apple-icon.png", 180)
    write("og/og-1200x630.svg", og())
    png("og/og-1200x630.svg", "og/og-1200x630.png", 1200)
    (SITE / "app" / "opengraph-image.png").write_bytes((ROOT / "og/og-1200x630.png").read_bytes())
    (SITE / "public" / "brand").mkdir(parents=True, exist_ok=True)
    (SITE / "public" / "brand" / "mark.svg").write_text((ROOT / "logo/mark.svg").read_text())
    (SITE / "public" / "brand" / "mark-on-klein.svg").write_text((ROOT / "logo/mark-on-klein.svg").read_text())
    (SITE / "public" / "brand" / "mark-small.svg").write_text((ROOT / "small/mark-small.svg").read_text())
    (SITE / "public" / "brand" / "mark-small-clear.svg").write_text((ROOT / "small/mark-small-clear.svg").read_text())


LABEL_LEFT = 'font-family="Helvetica Neue, Arial" font-size="22" fill="#4A5060"'
LABEL = LABEL_LEFT + ' text-anchor="middle"'


def board():
    W, H = 1600, 1000
    luan = [(0, 2), (-1, 1), (0, 0), (1.5, 1.5), (3, 0), (3, 2)]

    def stroke_fig(paths, x, y, s, colors):
        pts = [p for P in paths for p in P]
        (cx, cy), r = enclosing_circle(pts)
        u = s / 2 / (r + 0.3)
        out = ""
        for P, c in zip(paths, colors):
            d = "M" + "L".join("%.1f %.1f" % (x + (px - cx) * u, y - (py - cy) * u) for px, py in P)
            out += f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{u * 0.24:.1f}" stroke-linecap="square" stroke-linejoin="miter"/>'
        return out

    lk = lockup(background=None)
    lk_vb = lk.split('viewBox="0 0 ')[1].split('"')[0].split()
    b = [f'<rect width="{W}" height="{H}" fill="{PAPER}"/>',
         f'<text x="60" y="90" font-family="Helvetica Neue, Arial" font-size="40" font-weight="600" fill="#0F1115">muanlartins · marca</text>',
         f'<text x="60" y="128" {LABEL.replace("text-anchor=\"middle\"", "")}>Duas assinaturas "Luan" entrelaçadas, uma girada 180°. Klein + Klein claro + branco.</text>',
         f'<clipPath id="av"><circle cx="330" cy="460" r="260"/></clipPath>',
         f'<svg x="70" y="200" width="520" height="520" viewBox="0 0 256 256" clip-path="url(#av)">{mark(uid="av")}</svg>',
         f'<rect x="660" y="200" width="880" height="{880 * float(lk_vb[1]) / float(lk_vb[0]):.0f}" rx="18" fill="{KLEIN}"/>',
         f'<svg x="660" y="200" width="880" height="{880 * float(lk_vb[1]) / float(lk_vb[0]):.0f}" viewBox="0 0 {lk_vb[0]} {lk_vb[1]}">{lk.split(">", 1)[1].rsplit("</svg>", 1)[0]}</svg>']
    sy = 200 + 880 * float(lk_vb[1]) / float(lk_vb[0]) + 50
    for i, (sz, kw) in enumerate(((96, {}), (48, SMALL), (32, SMALL))):
        x = 660 + i * 150
        b.append(f'<svg x="{x}" y="{sy:.0f}" width="{sz}" height="{sz}" viewBox="0 0 256 256">{mark(uid=f"s{i}", **kw)}</svg>')
        b.append(f'<text x="{x + sz / 2:.0f}" y="{sy + 130:.0f}" {LABEL}>{sz}px</text>')
    for i, (name, hexv, role) in enumerate((("Klein", KLEIN, "fundo, cor da marca"), ("Klein claro", KLEIN_LIGHT, "segunda assinatura"), ("Branco", PAPER, "primeira assinatura, texto"))):
        x = 1120 + i * 140
        b.append(f'<rect x="{x}" y="{sy:.0f}" width="120" height="96" rx="12" fill="{hexv}" stroke="#C9CDD6"/>')
        b.append(f'<text x="{x + 60}" y="{sy + 130:.0f}" {LABEL}>{name}</text><text x="{x + 60}" y="{sy + 158:.0f}" {LABEL_LEFT.replace("22", "18")} text-anchor="middle">{hexv}</text>')
    steps = [([luan], "Luan", [KLEIN]), ([[(y, -x) for x, y in luan]], "girada 90° → Σ", [KLEIN]),
             ([LUAN, LUAN_TURNED], "+ cópia girada 180°", [KLEIN, KLEIN_LIGHT])]
    for i, (paths, label, colors) in enumerate(steps):
        x = 150 + i * 200
        b.append(stroke_fig(paths, x, 830, 120, colors))
        b.append(f'<text x="{x}" y="930" {LABEL}>{label}</text>')
    return svg("".join(b), W, H)


SMALL = dict(fit="box", fill=0.80, stroke=0.36, gap=0.9)

if __name__ == "__main__":
    os.chdir(ROOT)
    write("logo/mark.svg", svg(mark(background=None), 256))
    write("logo/mark-on-klein.svg", svg(mark(), 256))
    png("logo/mark-on-klein.svg", "logo/avatar-800.png", 800)
    circle_png("logo/mark-on-klein.svg", "logo/avatar-circle-800.png", 800)

    write("logo/lockup.svg", lockup(background=None))
    write("logo/lockup-on-klein.svg", lockup())
    png("logo/lockup-on-klein.svg", "logo/lockup-on-klein-1600.png", 1600)

    write("small/mark-small.svg", svg(mark(**SMALL), 256))
    write("small/mark-small-clear.svg", svg(mark(**SMALL, background=None, uid="s"), 256))
    write("small/favicon.svg", svg(mark(fit="box", fill=0.84, stroke=0.42, weave=False, b_color=PAPER), 256))
    for s in (48, 32):
        png("small/mark-small.svg", f"small/mark-{s}.png", s)
    write("small/favicon-16.svg", svg(mark(fit="box", fill=0.84, stroke=0.42, weave=False, b_color=PAPER, crisp=True), 256))
    png("small/favicon-16.svg", "small/favicon-16.png", 16)
    subprocess.run(["magick", "small/favicon-16.png", "small/mark-32.png", "small/mark-48.png", "small/favicon.ico"], check=True)

    pair = (f'<rect width="1240" height="660" fill="{PAPER}"/>'
            f'<svg x="20" y="20" width="590" height="590" viewBox="0 0 256 256">{mark(uid="e")}</svg>'
            f'<svg x="630" y="20" width="590" height="590" viewBox="0 0 256 256">{mark(uid="c", b_weight=1.07)}</svg>'
            f'<text x="315" y="645" {LABEL}>pesos iguais</text><text x="925" y="645" {LABEL}>cópia azul +7%</text>')
    write("explorations/v14-peso/weight-compensation.svg", svg(pair, 1240, 660))
    png("explorations/v14-peso/weight-compensation.svg", "explorations/v14-peso/weight-compensation.png", 1240)

    write("brand-board.svg", board())
    png("brand-board.svg", "brand-board.png", 1600)
    write("youtube/banner-2560x1440.svg", banner())
    png("youtube/banner-2560x1440.svg", "youtube/banner-2560x1440.png", 2560)
    banner_preview("youtube/banner-2560x1440.png", "youtube/banner-crops.svg")
    png("youtube/banner-crops.svg", "youtube/banner-crops.png", 1280)
    (ROOT / "youtube/profile-800.png").write_bytes((ROOT / "logo/avatar-800.png").read_bytes())
    png("small/mark-small.svg", "youtube/watermark-150.png", 150)

    site_assets()
    print("klein light", KLEIN_LIGHT)
