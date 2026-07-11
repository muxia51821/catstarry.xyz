from pathlib import Path
path = Path("D:/catstarry.xyz/CONTEXT.md")
content = path.read_text(encoding="utf-8")
content = content.replace(
    "冷调深黑画布 #0A0A0C，",
    "冷调深黑画布 `#0A0A0C`，"
)
content = content.replace(
    "画布 #FAF9F5，",
    "画布 `#FAF9F5`，"
)
content = content.replace(
    "画布 #0B0E11，",
    "画布 `#0B0E11`，"
)
content = content.replace(
    "CTA #5EAF9E，",
    "CTA `#5EAF9E`，"
)
content = content.replace(
    "标点挤压 \text-spacing-trim",
    "标点挤压 `text-spacing-trim`"
)
content = content.replace(
    "+ hanging-punctuation",
    "+ `hanging-punctuation`"
)
path.write_text(content, encoding="utf-8")
print("Fixed")