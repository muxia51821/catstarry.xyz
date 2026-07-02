import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r"D:\catstarry.xyz\share_page.html", "r", encoding="utf-8") as f:
    content = f.read()

# Find the main data object
idx = content.find("sessionID")
start = content.rfind("{", 0, idx)
depth = 0
end = start
for i in range(start, len(content)):
    c = content[i]
    if c == "{":
        depth += 1
    elif c == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break

data_str = content[start:end]
print(f"Data length: {len(data_str)}")

# Save raw for inspection
with open(r"D:\catstarry.xyz\raw_data.txt", "w", encoding="utf-8") as f:
    f.write(data_str)

print("Done saving raw_data.txt")
print("First 1000 chars:")
print(data_str[:1000])
