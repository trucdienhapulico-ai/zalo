[CmdletBinding()]
param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'
$Root = $PSScriptRoot
$ExpectedVersion = '2.0.0'

function Find-Node {
  $candidates = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  )
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  return $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

$running = $false
try {
  $health = Invoke-RestMethod 'http://127.0.0.1:4317/api/health' -TimeoutSec 2
  $running = $health.version -eq $ExpectedVersion
} catch {}

if (-not $running) {
  $listener = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    $expectedServer = Join-Path $Root 'server.js'
    if (-not $process.CommandLine -or $process.CommandLine -notlike "*$expectedServer*") {
      throw "Port 4317 is being used by another application (PID $($listener.OwningProcess))."
    }
    Stop-Process -Id $listener.OwningProcess -Force
    Start-Sleep -Milliseconds 400
  }

  $node = Find-Node
  if (-not $node) { throw 'Node.js 18+ was not found.' }
  Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory $Root -WindowStyle Hidden
  Start-Sleep -Seconds 2
  $health = Invoke-RestMethod 'http://127.0.0.1:4317/api/health' -TimeoutSec 5
  if ($health.version -ne $ExpectedVersion) { throw 'The local bridge did not start with the expected version.' }
}

if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:4317' }
