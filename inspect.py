import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r"D:\catstarry.xyz\share_page.html", "r", encoding="utf-8") as f:
    content = f.read()

# Show context around $R[22]=
idx = content.find('$R[22]=')
print(f"$R[22]= at {idx}")
print("Context:")
print(content[idx:idx+2000])
