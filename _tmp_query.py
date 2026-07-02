import sqlite3

conn = sqlite3.connect(r'C:\Users\a3593\.cc-switch\cc-switch.db')
cur = conn.cursor()

# List all tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print("=== Tables ===")
for t in tables:
    print(t[0])

# For each table, show schema and data
for (table_name,) in tables:
    print(f"\n=== {table_name} ===")
    cur.execute(f"PRAGMA table_info({table_name})")
    cols = [(r[1], r[2]) for r in cur.fetchall()]
    print("Columns:", ", ".join(f"{n}({t})" for n, t in cols))
    
    cur.execute(f"SELECT * FROM {table_name}")
    rows = cur.fetchall()
    col_names = [c[0] for c in cols]
    print("|".join(col_names))
    for row in rows:
        print("|".join(str(v)[:200] for v in row))

conn.close()
