param(
  [string]$DriveLetter = 'X'
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$drive = ($DriveLetter.TrimEnd(':') + ':').ToUpperInvariant()
$workspace = $projectRoot

if ($projectRoot -match '\s') {
  $existingDrive = Get-PSDrive -Name $drive.TrimEnd(':') -ErrorAction SilentlyContinue
  if (-not $existingDrive) {
    cmd /c "subst $drive `"$projectRoot`"" | Out-Null
  }
  $workspace = "$drive\"
}

$nodePath = Join-Path $workspace '.tools\node-v22.22.1-win-x64'
$cargoHome = Join-Path $workspace '.cargo-local'
$rustupHome = Join-Path $workspace '.rustup-local'
$mingwPath = Join-Path $workspace '.tools\winlibs-x86_64-posix-seh-gcc-15.2.0-mingw-w64ucrt-13.0.0-r6\mingw64\bin'
$nsisPath = 'C:\Program Files (x86)\NSIS'
$npmCmd = Join-Path $nodePath 'npm.cmd'

if (Test-Path $nodePath) {
  $env:PATH = "$nodePath;$env:PATH"
}
if (Test-Path (Join-Path $cargoHome 'bin')) {
  $env:PATH = "$(Join-Path $cargoHome 'bin');$env:PATH"
  $env:CARGO_HOME = $cargoHome
}
if (Test-Path $rustupHome) {
  $env:RUSTUP_HOME = $rustupHome
}
if (Test-Path $mingwPath) {
  $env:PATH = "$mingwPath;$env:PATH"
}
if (Test-Path $nsisPath) {
  $env:PATH = "$nsisPath;$env:PATH"
}

Push-Location $workspace
try {
  if (Test-Path $npmCmd) {
    & $npmCmd run tauri:build
  } else {
    npm run tauri:build
  }
} finally {
  Pop-Location
}