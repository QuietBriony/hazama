param([int]$Steps = 30, [int]$W = 1216, [int]$H = 832, [int]$Seed = 7, [string]$Out = "")
$ErrorActionPreference = "Continue"
$root = "C:\workspace\hazama-imagelab"
$vpy  = Join-Path $root "venv\Scripts\python.exe"
if (-not (Test-Path $vpy)) { Write-Output "NO_VENV_AT: $vpy"; exit 1 }
$script = Join-Path $env:USERPROFILE "hz_imggen.py"
if (-not (Test-Path $script)) { Write-Output "NO_SCRIPT_AT: $script"; exit 1 }
if ($Out -eq "") { $Out = Join-Path $env:USERPROFILE "hz_img_test.png" }
$env:HZ_STEPS = $Steps; $env:HZ_W = $W; $env:HZ_H = $H; $env:HZ_SEED = $Seed; $env:HZ_OUT = $Out
Remove-Item $Out -ErrorAction SilentlyContinue
& $vpy $script 2>&1 | Select-Object -Last 45
$exists = Test-Path $Out
$bytes = if ($exists) { (Get-Item $Out).Length } else { 0 }
Write-Output "IMGGEN_RESULT exists=$exists bytes=$bytes path=$Out"
