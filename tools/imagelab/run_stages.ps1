param([int]$Steps = 30, [int]$W = 1280, [int]$H = 768, [int]$Seed = 123, [int]$Chain = 0)
$ErrorActionPreference = "Continue"
$root = "C:\workspace\hazama-imagelab"
$vpy  = Join-Path $root "venv\Scripts\python.exe"
$script = Join-Path $env:USERPROFILE "hz_stages.py"
$env:HZ_STEPS = $Steps; $env:HZ_W = $W; $env:HZ_H = $H; $env:HZ_SEED = $Seed; $env:HZ_CHAIN = $Chain
$env:HZ_STAGES = Join-Path $env:USERPROFILE "hz_stages.json"
Get-ChildItem (Join-Path $env:USERPROFILE "hz_stage_*.png") -ErrorAction SilentlyContinue | Remove-Item -ErrorAction SilentlyContinue
& $vpy $script 2>&1 | Select-Object -Last 40
Write-Output "=== STAGE OUTPUTS ==="
Get-ChildItem (Join-Path $env:USERPROFILE "hz_stage_*.png") -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("OUT " + $_.Name + " " + $_.Length) }
