from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent
SELECTED = ROOT / "selected"
EVIDENCE = ROOT.parents[1] / "qa" / "evidence"
PLANETS = ("about", "blog", "feed", "projects", "learn")
ROLES = {"overview": (1254, 1254), "focus": (1120, 840), "mobile": (640, 640)}
DEEP_SPACE = (10, 10, 12, 255)


def place(canvas: Image.Image, asset: Image.Image, center: tuple[int, int], width: int) -> None:
    ratio = width / asset.width
    resized = asset.resize((width, round(asset.height * ratio)), Image.Resampling.LANCZOS)
    x = round(center[0] - resized.width / 2)
    y = round(center[1] - resized.height / 2)
    canvas.alpha_composite(resized, (x, y))


def main() -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)

    print("planet,role,dimensions,bytes,alpha_bbox,corner_alpha_max")
    for planet in PLANETS:
        for role, expected in ROLES.items():
            path = SELECTED / f"planet-{planet}-{role}.webp"
            with Image.open(path) as opened:
                image = opened.convert("RGBA")
                if image.size != expected:
                    raise ValueError(f"{path.name}: {image.size} != {expected}")
                alpha = image.getchannel("A")
                corners = (
                    alpha.getpixel((0, 0)),
                    alpha.getpixel((image.width - 1, 0)),
                    alpha.getpixel((0, image.height - 1)),
                    alpha.getpixel((image.width - 1, image.height - 1)),
                )
                print(
                    f"{planet},{role},{image.width}x{image.height},{path.stat().st_size},"
                    f"{alpha.getbbox()},{max(corners)}"
                )

    desktop = Image.new("RGBA", (1366, 768), DEEP_SPACE)
    drift = {
        "about": ((1052, 138), 128),
        "blog": ((342, 207), 174),
        "feed": ((833, 330), 200),
        "projects": ((287, 560), 162),
        "learn": ((1025, 545), 153),
    }
    for planet, (center, width) in drift.items():
        with Image.open(SELECTED / f"planet-{planet}-overview.webp") as opened:
            place(desktop, opened.convert("RGBA"), center, width)
    draw = ImageDraw.Draw(desktop)
    draw.text((20, 20), "ASSET COMPOSITION TEST - NOT PRODUCTION UI", fill=(156, 163, 175, 180))
    desktop.convert("RGB").save(EVIDENCE / "phase4-3-planet-series-1366x768.png", optimize=True)

    mobile = Image.new("RGBA", (390, 844), DEEP_SPACE)
    mobile_positions = {
        "about": ((300, 130), 86),
        "blog": ((92, 230), 106),
        "feed": ((246, 342), 122),
        "projects": ((90, 540), 102),
        "learn": ((285, 620), 98),
    }
    for planet, (center, width) in mobile_positions.items():
        with Image.open(SELECTED / f"planet-{planet}-mobile.webp") as opened:
            place(mobile, opened.convert("RGBA"), center, width)
    draw = ImageDraw.Draw(mobile)
    draw.text((12, 12), "ASSET TEST - NOT UI", fill=(156, 163, 175, 180))
    mobile.convert("RGB").save(EVIDENCE / "phase4-3-planet-series-390x844.png", optimize=True)


if __name__ == "__main__":
    main()
