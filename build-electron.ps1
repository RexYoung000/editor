# One-click build: delete old release + rebuild Electron

$projectRoot = $PSScriptRoot

Write-Host "=== Electron Build ===" -ForegroundColor Cyan

# 1. Delete old release
Write-Host "[1/2] Removing old release..." -ForegroundColor Yellow
$releaseDir = Join-Path $projectRoot "release"
if (Test-Path $releaseDir) {
    Remove-Item -Recurse -Force $releaseDir -ErrorAction Stop
    Write-Host "  Done" -ForegroundColor Green
} else {
    Write-Host "  Not found, skip" -ForegroundColor Gray
}

# 2. Build
Write-Host "[2/2] Building..." -ForegroundColor Yellow
$env:ELECTRON_CACHE = Join-Path $projectRoot "electron-cache"
pnpm electron:build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Build OK ===" -ForegroundColor Green
    Write-Host "Setup:  release\豌豆课件编辑器 Setup 0.0.0.exe" -ForegroundColor White
    Write-Host "Unpack: release\win-unpacked\wandouEditor.exe" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "=== Build FAILED ===" -ForegroundColor Red
}