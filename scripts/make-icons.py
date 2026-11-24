"""
Draws the partner app's icons and splash marks (npm run icons). Python 3 with Pillow.

The HueVistaa mark is two paint chips bridged by a crossbar, on the same 64-unit grid as
HueVistaFrontEnd/public/brand/mark.svg:

    left chip   x 6..22,  y 6..58   sky
    right chip  x 42..58, y 6..58   cobalt
    crossbar    x 22..42, y 27..37  sky

The partner app sets the mark on paper, with a brass bar under it the width of the H. Paper
tells it from the HueVistaa app (ink) and the HueVistaa Staff app (ink, with the same bar) on a
phone's home screen: the three are one family, and each its own.
"""

from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"

INK = (16, 14, 12)
PAPER = (246, 243, 236)
BRASS = (192, 139, 78)
SKY_DARK = (0, 160, 225)  # --hv-mark on dark
SKY_LIGHT = (0, 141, 198)  # --hv-mark on paper
COBALT = (28, 106, 188)  # --hv-mark-deep, both themes
WHITE = (255, 255, 255)


def draw_mark(img: Image.Image, unit: float, sky, cobalt, brass, *, scale: int = 4) -> None:
    """The H and its badge bar, centred in `img`. Drawn at `scale`× and shrunk, for clean edges."""
    w, h = img.size
    big = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    u = unit * scale
    # The H spans 52 units square; the bar sits 5 units under it, 6 units tall.
    group_w = 52 * u
    group_h = (52 + 5 + 6) * u
    x0 = (w * scale - group_w) / 2 - 6 * u  # grid x of the left chip is 6
    y0 = (h * scale - group_h) / 2 - 6 * u

    def box(x1, y1, x2, y2, fill, radius=0):
        rect = [x0 + x1 * u, y0 + y1 * u, x0 + x2 * u, y0 + y2 * u]
        if radius:
            d.rounded_rectangle(rect, radius=radius * u, fill=fill)
        else:
            d.rectangle(rect, fill=fill)

    box(6, 6, 22, 58, sky)
    box(42, 6, 58, 58, cobalt)
    box(22, 27, 42, 37, sky)
    box(6, 63, 58, 69, brass, radius=3)
    img.alpha_composite(big.resize((w, h), Image.LANCZOS))


def solid(size: int, colour) -> Image.Image:
    return Image.new("RGBA", (size, size), colour + (255,))


def clear(size: int) -> Image.Image:
    return Image.new("RGBA", (size, size), (0, 0, 0, 0))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # iOS and the store: the mark on paper, full bleed.
    icon = solid(1024, PAPER)
    draw_mark(icon, 8.6, SKY_LIGHT, COBALT, BRASS)
    icon.convert("RGB").save(OUT / "icon.png")

    # Android's adaptive icon: the foreground alone, inside the 66% safe circle (paper behind it, app.json).
    adaptive = clear(1024)
    draw_mark(adaptive, 7.2, SKY_LIGHT, COBALT, BRASS)
    adaptive.save(OUT / "adaptive-icon.png")

    # Android 13's themed icon: one colour, the phone tints it.
    mono = clear(1024)
    draw_mark(mono, 7.2, WHITE, WHITE, WHITE)
    mono.save(OUT / "monochrome-icon.png")

    # The splash marks: the paper cut and the dark cut of the sky.
    light = clear(512)
    draw_mark(light, 5.6, SKY_LIGHT, COBALT, BRASS)
    light.save(OUT / "splash-icon.png")
    dark = clear(512)
    draw_mark(dark, 5.6, SKY_DARK, COBALT, BRASS)
    dark.save(OUT / "splash-icon-dark.png")

    # The web preview's tab.
    favicon = solid(48, PAPER)
    draw_mark(favicon, 0.62, SKY_LIGHT, COBALT, BRASS)
    favicon.convert("RGB").save(OUT / "favicon.png")


if __name__ == "__main__":
    main()
