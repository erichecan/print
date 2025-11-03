# [2025-11-02 22:12:00] PowerShell script to download images
# This script downloads images from content-config.json URLs

$ErrorActionPreference = "Stop"

# Read config
$configPath = Join-Path $PSScriptRoot "..\assets\content-config.json"
$config = Get-Content $configPath | ConvertFrom-Json

Write-Host "📥 Starting image download..." -ForegroundColor Cyan
Write-Host ""

# Function to download image
function Download-Image {
    param(
        [string]$Url,
        [string]$DestPath
    )
    
    try {
        $destDir = Split-Path $DestPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Write-Host "Downloading: $DestPath" -ForegroundColor Yellow
        Invoke-WebRequest -Uri $Url -OutFile $DestPath -UseBasicParsing
        Write-Host "✅ Downloaded: $DestPath" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed: $DestPath - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Download hero images
if ($config.hero) {
    Write-Host "Downloading Hero Images..." -ForegroundColor Cyan
    foreach ($key in $config.hero.PSObject.Properties.Name) {
        $item = $config.hero.$key
        if ($item.url -and $item.local) {
            $destPath = Join-Path $PSScriptRoot ".." $item.local.Replace('/', '\')
            Download-Image -Url $item.url -DestPath $destPath
        }
    }
    Write-Host ""
}

# Download product images
if ($config.products) {
    Write-Host "Downloading Product Images..." -ForegroundColor Cyan
    foreach ($key in $config.products.PSObject.Properties.Name) {
        $item = $config.products.$key
        if ($item.url -and $item.local) {
            $destPath = Join-Path $PSScriptRoot ".." $item.local.Replace('/', '\')
            Download-Image -Url $item.url -DestPath $destPath
        }
    }
    Write-Host ""
}

Write-Host "✨ Download complete!" -ForegroundColor Green

