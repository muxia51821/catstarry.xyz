import re, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r"D:\catstarry.xyz\share_page.html", "r", encoding="utf-8") as f:
    content = f.read()

# Find all messages - they follow pattern: $R[N]={role:"user"/"assistant",...
# Messages are nested inside message: $R[21]={ses_...: $R[22]=[...]}

# Find message array
msg_start = content.find("message:$R[21]=")
print(f"message array at: {msg_start}")

# Look for user messages with actual content
# User messages have role:"user" and may contain "content" or "text" fields
# Let's search for all role:"user" and role:"assistant" entries

# Find all message entries
messages = []
# Pattern: $R[N]={role:"user" ... }
user_pattern = re.finditer(r'\$R\[\d+\]=\{role:"(user|assistant)"', content)

for m in user_pattern:
    start_idx = m.start()
    # Find the role
    role = "user" if 'role:"user"' in m.group() else "assistant"
    
    # Find the matching closing brace
    brace_start = content.index('{', start_idx)
    depth = 0
    end_idx = brace_start
    for i in range(brace_start, min(brace_start + 500000, len(content))):
        c = content[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end_idx = i + 1
                break
    
    obj_str = content[brace_start:end_idx]
    # Extract content field
    content_match = re.search(r'content:"([^"]*(?:\\.[^"]*)*)"', obj_str)
    text = ""
    if content_match:
        text = content_match.group(1)
        # Unescape
        text = text.replace('\\\\', '\\').replace('\\"', '"').replace('\\n', '\n')
    
    if text:
        messages.append((role, text[:5000]))

print(f"\nFound {len(messages)} messages with content")
for i, (role, text) in enumerate(messages):
    print(f"\n--- {role.upper()} MSG {i+1} ---")
    print(text[:3000])
    if len(text) > 3000:
        print("... [TRUNCATED]")
