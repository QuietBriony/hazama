$ErrorActionPreference = "Continue"
$root = "C:\workspace\hazama-imagelab"
$log  = Join-Path $root "setup.log"
function Log($m) { $t = (Get-Date).ToString("HH:mm:ss"); "$t $m" | Tee-Object -FilePath $log -Append }

New-Item -ItemType Directory -Force -Path $root | Out-Null
Set-Content -Path $log -Value ("=== hazama-imagelab setup start ===")
Log "root=$root"

$py = "C:\Users\cta88\AppData\Local\Programs\Python\Python312\python.exe"
$venv = Join-Path $root "venv"
$vpy  = Join-Path $venv "Scripts\python.exe"

if (-not (Test-Path $vpy)) {
  Log "creating venv..."
  & $py -m venv $venv *>> $log
} else { Log "venv exists, reusing" }

Log "pip upgrade..."
& $vpy -m pip install --upgrade pip *>> $log

Log "installing torch+torchvision (CUDA cu124)... (large ~2.5GB)"
& $vpy -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124 *>> $log
Log "torch install exit=$LASTEXITCODE"

Log "installing diffusers stack..."
& $vpy -m pip install "diffusers>=0.31" transformers accelerate safetensors huggingface_hub pillow *>> $log
Log "diffusers install exit=$LASTEXITCODE"

Log "verifying CUDA..."
$check = & $vpy -c "import torch; print('TORCH', torch.__version__); print('CUDA', torch.cuda.is_available()); print('DEV', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'none')" 2>&1
$check | Tee-Object -FilePath $log -Append
try { $dvers = & $vpy -c "import diffusers,transformers; print('diffusers',diffusers.__version__,'transformers',transformers.__version__)" 2>&1; $dvers | Tee-Object -FilePath $log -Append } catch {}

Log "=== SETUP DONE ==="
Write-Output "SETUP_COMPLETE"
Write-Output "----- tail of setup.log -----"
Get-Content $log -Tail 20
