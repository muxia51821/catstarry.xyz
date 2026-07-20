from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SELECTED = ROOT / "selected"

# Focus crops expose each planet's primary identity while staying on the same master.
FOCUS_CROPS = {
    "about": (60, 210, 1180, 1050),
    "blog": (40, 160, 1160, 1000),
    "feed": (70, 210, 1190, 1050),
    "learn": (40, 180, 1160, 1020),
    "projects": (50, 130, 1170, 970),
}


def save_webp(image: Image.Image, destination: Path, quality: int) -> None:
    image.save(
        destination,
        format="WEBP",
        quality=quality,
        method=6,
        exact=True,
    )


def main() -> None:
    for planet, crop_box in FOCUS_CROPS.items():
        overview_path = SELECTED / f"planet-{planet}-overview.webp"
        if not overview_path.exists():
            raise FileNotFoundError(overview_path)

        with Image.open(overview_path) as source:
            overview = source.convert("RGBA")
            if overview.size != (1254, 1254):
                raise ValueError(f"Unexpected {planet} overview size: {overview.size}")

            focus = overview.crop(crop_box)
            if focus.size != (1120, 840):
                raise ValueError(f"Unexpected {planet} focus size: {focus.size}")

            mobile = overview.resize((640, 640), Image.Resampling.LANCZOS)

            save_webp(focus, SELECTED / f"planet-{planet}-focus.webp", quality=90)
            save_webp(mobile, SELECTED / f"planet-{planet}-mobile.webp", quality=84)

            print(
                f"{planet}: overview={overview.size}, focus={focus.size}, "
                f"mobile={mobile.size}, crop={crop_box}"
            )


if __name__ == "__main__":
    main()
