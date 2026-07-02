# -*- coding: utf-8 -*-
import re, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r"D:\catstarry.xyz\share_page.html", "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'role:"assistant".*?finish:"(stop|tool-calls)"')
finish_matches = list(pattern.finditer(content))
print(f"Assistant messages with finish: {len(finish_matches)}")

for i, m in enumerate(finish_matches):
    finish_type = m.group(1)
    obj_start = content.rfind('{', 0, m.start())
    if obj_start < 0:
        continue
    depth = 0
    obj_end = obj_start
    for j in range(obj_start, min(obj_start + 50000, len(content))):
        c = content[j]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                obj_end = j + 1
                break
    
    obj = content[obj_start:obj_end]
    if finish_type == "stop":
        content_match = re.search(r'content:"((?:[^"\\]|\\.)*)"', obj)
        if content_match:
            raw = content_match.group(1)
            try:
                text = json.loads('"' + raw + '"')
            except:
                text = raw
            text = text.replace('\\n', '\n').replace('\\t', '\t')
            print(f"\n=== ASSISTANT STOP {i+1} (len={len(text)}) ===")
            print(text[:8000])

# Look for larger content fields in user messages
print("\n\n=== ALL CONTENT FIELDS ===")
content_re = re.compile(r'content:"((?:[^"\\]|\\.)*)"')
all_contents = list(content_re.finditer(content))
print(f"Total content fields: {len(all_contents)}")
for i, m in enumerate(all_contents):
    raw = m.group(1)
    if len(raw) > 100:
        try:
            text = json.loads('"' + raw + '"')
        except:
            text = raw
        text = text.replace('\\n', '\n').replace('\\t', '\t')
        print(f"\n--- Content #{i+1} (len={len(text)}) ---")
        print(text[:2000])
        if len(text) > 2000:
            print("...")
