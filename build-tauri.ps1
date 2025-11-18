# Tauri Build Script with Fixed PATH
# This script removes conflicting Unix tools from PATH before building

Write-Host "Setting up build environment..." -ForegroundColor Cyan

# Remove Git and other Unix tool paths that contain conflicting 'link' command
$cleanPath = ($env:Path -split ';' | Where-Object {
    $_ -notmatch 'Git\\cmd' -and
    $_ -notmatch 'Git\\bin' -and
    $_ -notmatch 'Git\\usr\\bin' -and
    $_ -notmatch 'msys' -and
    $_ -notmatch 'mingw'
}) -join ';'

# Set the cleaned PATH
$env:Path = $cleanPath

Write-Host "Cleaned PATH to remove conflicting linkers" -ForegroundColor Green

# Initialize Visual Studio environment if available
$vsPath = "C:\Program Files\Microsoft Visual Studio\2022\Community"
$vcvarsPath = "$vsPath\VC\Auxiliary\Build\vcvars64.bat"

if (Test-Path $vcvarsPath) {
    Write-Host "Loading Visual Studio 2022 environment..." -ForegroundColor Cyan
    
    # Get the environment variables from vcvars
    $tempFile = [System.IO.Path]::GetTempFileName()
    cmd /c "`"$vcvarsPath`" && set > `"$tempFile`""
    
    Get-Content $tempFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            Set-Item -Path "env:$name" -Value $value
        }
    }
    
    Remove-Item $tempFile
    Write-Host "Visual Studio environment loaded" -ForegroundColor Green
}

# Verify we have the correct linker
Write-Host "`nVerifying linker..." -ForegroundColor Cyan
$linkerPath = (Get-Command link.exe -ErrorAction SilentlyContinue).Source
if ($linkerPath -match "Microsoft Visual Studio") {
    Write-Host "✓ Using correct MSVC linker: $linkerPath" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: May not be using MSVC linker" -ForegroundColor Yellow
}

# Run the build
Write-Host "`nStarting Tauri build..." -ForegroundColor Cyan
npm run tauri dev
