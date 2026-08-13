[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Wrangler {
  param(
    [Parameter(Mandatory)][string[]]$Arguments
  )

  & npx @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Wrangler command failed ($LASTEXITCODE): npx $($Arguments -join ' ')"
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$scratchRoot = Join-Path $repoRoot '.scratch'
$tempDirectory = Join-Path $scratchRoot ("feed-production-migrations-{0}" -f [guid]::NewGuid().ToString('N'))
$tempConfig = Join-Path $tempDirectory 'wrangler.jsonc'
$productionDatabaseId = [Environment]::GetEnvironmentVariable('CATSTARRY_PRODUCTION_D1_ID', 'Process')

if ([string]::IsNullOrWhiteSpace($productionDatabaseId)) {
  throw 'CATSTARRY_PRODUCTION_D1_ID must be set to the production Feed D1 UUID.'
}

if ($productionDatabaseId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') {
  throw 'CATSTARRY_PRODUCTION_D1_ID must be a valid UUID.'
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw 'npx was not found on PATH.'
}

try {
  Set-Location $repoRoot
  New-Item -ItemType Directory -Path $tempDirectory -Force | Out-Null

  $config = @"
{
  "`$schema": "../../node_modules/wrangler/config-schema.json",
  "name": "catstarry-feed-api-production-migrations",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "catstarry-db",
      "database_id": "$productionDatabaseId",
      "migrations_dir": "../../workers/feed-api/migrations"
    }
  ]
}
"@

  Set-Content -LiteralPath $tempConfig -Value $config -Encoding utf8 -NoNewline

  Write-Host 'Checking unapplied production Feed D1 migrations...'
  Invoke-Wrangler @(
    'wrangler',
    'd1',
    'migrations',
    'list',
    'DB',
    '--remote',
    '--config',
    $tempConfig
  )

  Write-Host 'Applying production Feed D1 migrations...'
  Invoke-Wrangler @(
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--remote',
    '--config',
    $tempConfig
  )
}
finally {
  if (Test-Path -LiteralPath $tempDirectory) {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force
  }
}
