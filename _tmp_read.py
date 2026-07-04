import pathlib

base = pathlib.Path(r"D:\catstarry.xyz\.scratch")
modules = ["finance", "learn", "home", "projects"]

for mod in modules:
    d = base / mod
    for issue_dir in sorted(d.glob("*")):
        if issue_dir.is_dir() and issue_dir.name[0].isdigit():
            issue_file = issue_dir / "issue.md"
            if issue_file.exists():
                text = issue_file.read_text(encoding="utf-8")
                if "schema" in text.lower() or "D1" in text or "endpoint" in text or "API" in text or "table" in text.lower():
                    print(f"=== {mod}/{issue_dir.name} ===")
                    print(text[:1200])
                    print("...")
