from pathlib import Path
path = Path("D:/catstarry.xyz/CONTEXT.md")
c = path.read_text(encoding="utf-8")
c = c.replace("Klein Blue \\#002FA7\\", "Klein Blue `#002FA7`")
path.write_text(c, encoding="utf-8")
print("ok")