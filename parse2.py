import re, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r"D:\catstarry.xyz\share_page.html", "r", encoding="utf-8") as f:
    content = f.read()

# Strategy: Find all objects with role:"user" that also have a content field
# Search through the entire page content

pattern = re.compile(r'\{role:"(user|assistant)".*?content:"((?:[^"\\]|\\.)*)"', re.DOTALL)

matches = list(pattern.finditer(content))
print(f"Found {len(matches)} messages with content field")

for i, m in enumerate(matches):
    role = m.group(1)
    raw_content = m.group(2)
    try:
        text = json.loads('"' + raw_content + '"')
    except:
        text = raw_content
    
    # Unescape
    text = text.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
    
    print(f"\n=== {role.upper()} MSG {i+1} (len={len(text)}) ===")
    print(text[:5000])
    if len(text) > 5000:
        print("... [TRUNCATED]")
    
    if i >= 20:
        print("\n... Limit reached")
        break
