[CmdletBinding()]
param(
  [string]$InstallDir = "$env:LOCALAPPDATA\ZaloLocalTask",
  [string]$Model = "qwen3:1.7b"
)

$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/trucdienhapulico-ai/zalo.git'

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Find-Exe([string]$Name, [string[]]$Candidates) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  foreach ($candidate in $Candidates) {
    $expanded = [Environment]::ExpandEnvironmentVariables($candidate)
    if (Test-Path -LiteralPath $expanded) { return $expanded }
  }
  return $null
}

function Install-WingetPackage([string]$Id, [string]$Label) {
  Write-Step "Installing $Label"
  & winget install --id $Id --exact --accept-package-agreements --accept-source-agreements --silent
  if ($LASTEXITCODE -ne 0) { throw "Could not install $Label (winget exit $LASTEXITCODE)." }
}

if ($env:OS -ne 'Windows_NT') { throw 'This installer supports Windows only.' }
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw 'winget was not found. Install App Installer from Microsoft Store and run this command again.'
}

$git = Find-Exe 'git' @('%ProgramFiles%\Git\cmd\git.exe', '%LOCALAPPDATA%\Programs\Git\cmd\git.exe')
if (-not $git) {
  Install-WingetPackage 'Git.Git' 'Git'
  $git = Find-Exe 'git' @('%ProgramFiles%\Git\cmd\git.exe', '%LOCALAPPDATA%\Programs\Git\cmd\git.exe')
}
if (-not $git) { throw 'git.exe was not found after installation.' }
$env:Path = "$(Split-Path $git);$env:Path"

$node = Find-Exe 'node' @('%ProgramFiles%\nodejs\node.exe', '%LOCALAPPDATA%\Programs\nodejs\node.exe')
if (-not $node) {
  Install-WingetPackage 'OpenJS.NodeJS.LTS' 'Node.js LTS'
  $node = Find-Exe 'node' @('%ProgramFiles%\nodejs\node.exe', '%LOCALAPPDATA%\Programs\nodejs\node.exe')
}
if (-not $node) { throw 'node.exe was not found after installation.' }

$ollama = Find-Exe 'ollama' @('%LOCALAPPDATA%\Programs\Ollama\ollama.exe', '%ProgramFiles%\Ollama\ollama.exe')
if (-not $ollama) {
  Install-WingetPackage 'Ollama.Ollama' 'Ollama'
  $ollama = Find-Exe 'ollama' @('%LOCALAPPDATA%\Programs\Ollama\ollama.exe', '%ProgramFiles%\Ollama\ollama.exe')
}
if (-not $ollama) { throw 'ollama.exe was not found after installation.' }

try {
  Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2 | Out-Null
} catch {
  Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden
  Start-Sleep -Seconds 3
}

Write-Step 'Downloading or updating source code'
if (Test-Path -LiteralPath (Join-Path $InstallDir '.git')) {
  & $git -C $InstallDir fetch origin main
  if ($LASTEXITCODE -ne 0) { throw 'Could not fetch the repository.' }
  & $git -C $InstallDir checkout main
  & $git -C $InstallDir pull --ff-only origin main
  if ($LASTEXITCODE -ne 0) { throw 'Could not update the repository.' }
} else {
  if (Test-Path -LiteralPath $InstallDir) {
    $items = Get-ChildItem -LiteralPath $InstallDir -Force -ErrorAction SilentlyContinue
    if ($items) { throw "Install directory exists and is not empty: $InstallDir" }
  }
  New-Item -ItemType Directory -Path (Split-Path $InstallDir) -Force | Out-Null
  & $git clone $RepoUrl $InstallDir
  if ($LASTEXITCODE -ne 0) { throw 'Could not clone the repository.' }
}

Write-Step "Downloading local AI model $Model"
& $ollama pull $Model
if ($LASTEXITCODE -ne 0) { throw "Could not download model $Model." }

Write-Step 'Creating desktop shortcut'
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$oldShortcut = Join-Path $desktop 'Zalo Local Task.lnk'
if (Test-Path -LiteralPath $oldShortcut) { Remove-Item -LiteralPath $oldShortcut -Force }
$shortcut = $shell.CreateShortcut((Join-Path $desktop 'Zalo - Nhat ky Ban Dien.lnk'))
$shortcut.TargetPath = (Join-Path $InstallDir 'start.cmd')
$shortcut.WorkingDirectory = $InstallDir
$shortcut.Description = 'Start Zalo to Ban Dien Journal bridge'
$shortcut.Save()

Write-Step 'Starting the application'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $InstallDir 'start.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Could not start the local bridge.' }
Start-Process explorer.exe -ArgumentList (Join-Path $InstallDir 'extension')

Write-Host "`nINSTALLATION COMPLETE" -ForegroundColor Green
Write-Host 'Bridge status: http://127.0.0.1:4317'
Write-Host "Extension: $(Join-Path $InstallDir 'extension')"
Write-Host 'Final manual step: open chrome://extensions or edge://extensions, enable Developer mode, click Load unpacked, and select the extension directory shown above.'
