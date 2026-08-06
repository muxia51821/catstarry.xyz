[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-RequiredCommand {
  param(
    [Parameter(Mandatory)][string]$FilePath,
    [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
  }
}

function Assert-ProductionWorktree {
  $statusEntries = @(git status --porcelain=v1 -z) -split "`0" | Where-Object { $_ }
  $trackedChanges = @($statusEntries | Where-Object { -not $_.StartsWith('?? ') })
  if ($trackedChanges.Count -gt 0) {
    throw "Production deployment requires no staged or unstaged tracked changes. Found: $($trackedChanges -join '; ')"
  }

  $unexpectedUntracked = @(
    $statusEntries |
      Where-Object { $_.StartsWith('?? ') } |
      ForEach-Object { $_.Substring(3).Replace('\', '/') } |
      Where-Object { -not $_.StartsWith('.scratch/') }
  )
  if ($unexpectedUntracked.Count -gt 0) {
    throw "Production deployment permits untracked files only under .scratch/. Found: $($unexpectedUntracked -join '; ')"
  }
}

function Assert-Http200 {
  param([Parameter(Mandatory)][string]$Uri)

  $response = Invoke-WebRequest -Uri $Uri -MaximumRedirection 3
  if ($response.StatusCode -ne 200) {
    throw "Expected HTTP 200 from $Uri; received $($response.StatusCode)."
  }
  Write-Host "HTTP 200: $Uri"
}

function Assert-SiteWorkerConfig {
  param([Parameter(Mandatory)][string]$Path)

  $config = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  $sessionBindings = @($config.kv_namespaces | Where-Object { $_.binding -eq 'SESSION' })
  if ($sessionBindings.Count -ne 1) {
    throw "Site Worker configuration must contain exactly one SESSION KV binding."
  }

  Write-Host "Validated Site Worker SESSION KV binding."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

Invoke-RequiredCommand git fetch origin main:refs/remotes/origin/main
Assert-ProductionWorktree

$head = (git rev-parse HEAD).Trim()
$originMain = (git rev-parse origin/main).Trim()
if ($head -ne $originMain) {
  throw "HEAD ($head) must exactly match origin/main ($originMain) before production deployment."
}

Invoke-RequiredCommand npm ci
Invoke-RequiredCommand npm run test:planets
Invoke-RequiredCommand npm run test:home-copy
Invoke-RequiredCommand npm run site:typecheck
Invoke-RequiredCommand npm run build
Invoke-RequiredCommand npm run test:home
Invoke-RequiredCommand npm run test:site-output

$workerConfig = Join-Path $repoRoot 'dist/server/wrangler.json'
if (-not (Test-Path -LiteralPath $workerConfig -PathType Leaf)) {
  throw "Site Worker configuration was not generated: $workerConfig"
}
Assert-SiteWorkerConfig -Path $workerConfig

Invoke-RequiredCommand npx wrangler deploy --dry-run --config $workerConfig --name catstarry-site-production --keep-vars
Invoke-RequiredCommand npx wrangler deploy --config $workerConfig --name catstarry-site-production --keep-vars

Assert-Http200 'https://catstarry.xyz/'
Assert-Http200 'https://catstarry.xyz/activity-signals.json'
Assert-Http200 'https://catstarry.xyz/api/feed?limit=1'
Write-Host "Deployed commit SHA: $head"
