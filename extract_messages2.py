import re, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r"D:\catstarry.xyz\share_page.html", "r", encoding="utf-8") as f:
    content = f.read()

# The data is in a JS object format. Let's find the message array differently.
# Find '$R[22]=[' which is the messages array
msg_arr = content.find('$R[22]=[')
print(f"Message array at: {msg_arr}")

# Show context around it  
if msg_arr > 0:
    # Find the closing ] of the array
    arr_start = content.index('[', msg_arr)
    depth = 0
    arr_end = arr_start
    for i in range(arr_start, len(content)):
        c = content[i]
        if c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0:
                arr_end = i + 1
                break
    
    arr_str = content[arr_start:arr_end]
    print(f"Array length: {len(arr_str)} chars")
    
    # Now find all message objects within this array
    # Each message starts with $R[N]={role:"..."...
    msg_objects = re.finditer(r'\$R\[\d+\]=\{role:"(user|assistant)"', arr_str)
    
    msgs = list(msg_objects)
    print(f"Found {len(msgs)} message objects")
    
    for idx, m in enumerate(msgs):
        role = m.group(1)
        obj_start = arr_str.index('{', m.start())
        # Find matching }
        depth = 0
        obj_end = obj_start
        for i in range(obj_start, len(arr_str)):
            c = arr_str[i]
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    obj_end = i + 1
                    break
        obj_str = arr_str[obj_start:obj_end]
        
        # Find content field
        content_match = re.search(r'content:("(?:[^"\\]|\\.)*")', obj_str)
        text = ""
        if content_match:
            raw = content_match.group(1)
            try:
                text = json.loads(raw)
            except:
                text = raw
        
        if text:
            print(f"\n--- {role.upper()} MSG {idx+1} ---")
            print(text[:3000])
            if len(text) > 3000:
                print("... [TRUNCATED]")
        else:
            # Check for tool calls
            if 'tool_calls' in obj_str[:500] or 'toolCall' in obj_str[:500]:
                print(f"\n--- {role.upper()} MSG {idx+1} [TOOL CALLS] ---")
                print(obj_str[:500])
