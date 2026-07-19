param([int]$Steps = 30, [double]$CScale = 0.65, [int]$Seed = 7)
$ErrorActionPreference = "Continue"
$root = "C:\workspace\hazama-imagelab"
$vpy  = Join-Path $root "venv\Scripts\python.exe"
if (-not (Test-Path $vpy)) { Write-Output "NO_VENV_AT: $vpy"; exit 1 }
$script = Join-Path $env:USERPROFILE "hz_hybrid.py"
# ensure preprocessor deps
& $vpy -c "import controlnet_aux" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Output "installing controlnet_aux + opencv (headless)..."
  & $vpy -m pip install controlnet_aux opencv-python-headless timm 2>&1 | Select-Object -Last 6
}
$env:HZ_STEPS = $Steps; $env:HZ_CSCALE = $CScale; $env:HZ_SEED = $Seed
$env:HZ_OUT = Join-Path $env:USERPROFILE "hz_hybrid_out.png"
$env:HZ_CONTROL_IMG = Join-Path $env:USERPROFILE "hz_descent_final.png"
Remove-Item $env:HZ_OUT -ErrorAction SilentlyContinue
& $vpy $script 2>&1 | Select-Object -Last 45
$ex = Test-Path $env:HZ_OUT
$by = if ($ex) { (Get-Item $env:HZ_OUT).Length } else { 0 }
Write-Output "HYBRID_RESULT exists=$ex bytes=$by path=$($env:HZ_OUT)"
