$ErrorActionPreference = "Stop"

$name = "AtlasXIndexerSilent"
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"

if (Get-ItemProperty -Path $runKey -Name $name -ErrorAction SilentlyContinue) {
  Remove-ItemProperty -Path $runKey -Name $name
  Write-Output "Atlas-X Indexer silent startup unregistered."
} else {
  Write-Output "Atlas-X Indexer silent startup was not registered."
}
