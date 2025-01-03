$ErrorActionPreference = "Stop"

$repo = "Signal-K/planet-hunters-experiment-1"
$releaseUrl = "https://api.github.com/repos/$repo/releases/latest"

Write-Host "Fetching latest release metadata..."
$release = Invoke-RestMethod -Uri $releaseUrl

$asset = $release.assets | Where-Object { $_.name -match '\.exe$' } | Select-Object -First 1
if (-not $asset) {
  throw "No Windows .exe installer found in latest release."
}

$tmp = Join-Path $env:TEMP $asset.name
Write-Host "Downloading $($asset.name)"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp

Write-Host "Launching installer..."
Start-Process -FilePath $tmp -Wait

Write-Host "Installer completed."
