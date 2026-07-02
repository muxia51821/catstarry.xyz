import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r"D:\catstarry.xyz\share_page.html", "r", encoding="utf-8") as f:
    content = f.read()

# Find the array content after $R[22]=[
arr_start = content.find('$R[22]=[')
if arr_start < 0:
    print("Message array not found")
    sys.exit(1)

# Skip to after [
arr_start = content.index('[', arr_start) + 1

# Count brackets to find end
depth = 1
arr_end = arr_start
for i in range(arr_start, len(content)):
    c = content[i]
    if c == '[':
        depth += 1
    elif c == ']':
        depth -= 1
        if depth == 0:
            arr_end = i
            break

# Get array content
arr_content = content[arr_start:arr_end]
print(f"Array content length: {len(arr_content)}")

# Find all top-level message objects by finding role patterns
# Each message starts with $R[N]={role:"user" or role:"assistant"
msg_starts = []
pattern = re.compile(r'\$R\[\d+\]=\{role:"(user|assistant)"')
for m in pattern.finditer(arr_content):
    msg_starts.append((m.start(), m.group(1)))

print(f"Found {len(msg_starts)} top-level messages")

for i, (start, role) in enumerate(msg_starts):
    # Find the { of the object
    brace_idx = arr_content.index('{', start)
    # Match braces
    depth = 0
    end = brace_idx
    for j in range(brace_idx, len(arr_content)):
        c = arr_content[j]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    
    obj = arr_content[brace_idx:end]
    
    # Find content
    content_match = re.search(r'content:("(?:[^"\\]|\\.)*")', obj)
    text = ""
    if content_match:
        raw = content_match.group(1)
        try:
            text = json.loads(raw)
        except:
            text = raw
    
    if text:
        print(f"\n=== {role.upper()} MSG {i+1} (len={len(text)}) ===")
        print(text[:5000])
        if len(text) > 5000:
            print("... [TRUNCATED]")
    elif role == "user":
        print(f"\n=== {role.upper()} MSG {i+1} [NO content field] ===")
        print(obj[:300])
    
    if i >= 30:  # Safety limit
        print(f"\n... Stopped at {i+1} messages")
        break
