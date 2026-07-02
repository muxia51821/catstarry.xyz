import json, os

# 1. Write settings.local.json
local_path = r'C:\Users\a3593\.claude\settings.local.json'
current = {}
if os.path.exists(local_path):
    with open(local_path, 'r') as f:
        current = json.load(f)

current['env'] = {
    **current.get('env', {}),
    'HTTPS_PROXY': 'http://127.0.0.1:7890',
    'HTTP_PROXY': 'http://127.0.0.1:7890',
    'NO_PROXY': 'localhost,127.0.0.1,::1'
}

current['permissions'] = {
    'allow': list(set(current.get('permissions', {}).get('allow', []) + [
        'Bash(curl:*)',
        'Bash(wget:*)',
        'WebFetch(domain:github.com)',
        'WebFetch(domain:raw.githubusercontent.com)',
        'WebFetch(domain:*.githubusercontent.com)',
        'WebFetch(domain:news.ycombinator.com)',
        'WebFetch(domain:docs.python.org)',
        'WebFetch(domain:developer.mozilla.org)',
        'WebFetch(domain:pypi.org)',
        'WebFetch(domain:npmjs.com)',
        'WebFetch(domain:example.com)',
        'WebFetch(domain:httpbin.org)'
    ]))
}

with open(local_path, 'w') as f:
    json.dump(current, f, indent=2)
print('settings.local.json written OK')

# 2. Write PowerShell profile
profile_dir = r'C:\Users\a3593\Documents\WindowsPowerShell'
os.makedirs(profile_dir, exist_ok=True)
profile_path = os.path.join(profile_dir, 'Microsoft.PowerShell_profile.ps1')

ps_script = '''# Auto-detect FlClash proxy
$port = 7890
$conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($conn) {
    $env:HTTPS_PROXY = "http://127.0.0.1:$port"
    $env:HTTP_PROXY = "http://127.0.0.1:$port"
    $env:NO_PROXY = "localhost,127.0.0.1,::1"
}
'''

with open(profile_path, 'w') as f:
    f.write(ps_script)
print(f'PowerShell profile written to {profile_path}')
