# Opens a titled console window showing live output from a device console (used for evidence screenshots).
#   powershell -File show.ps1 -Title "R4-CORE | OSPF" -Target localhost:5000 -Mode run -Commands "show ip ospf neighbor;;show ip route"
param(
    [string]$Title,
    [string]$Target,
    [ValidateSet('run', 'sh')][string]$Mode = 'run',
    [string]$Commands,          # separate multiple commands with ;;
    [int]$Width = 150,
    [int]$Height = 48
)
$Host.UI.RawUI.WindowTitle = $Title
$Host.UI.RawUI.BackgroundColor = 'Black'
$Host.UI.RawUI.ForegroundColor = 'Gray'
try {
    $Host.UI.RawUI.BufferSize = New-Object Management.Automation.Host.Size($Width, 3000)
    $Host.UI.RawUI.WindowSize = New-Object Management.Automation.Host.Size($Width, $Height)
} catch {}
Clear-Host
Write-Host ("=" * ($Width - 2)) -ForegroundColor DarkCyan
Write-Host "  $Title    [$Target]    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host ("=" * ($Width - 2)) -ForegroundColor DarkCyan
$env:PYTHONIOENCODING = 'utf-8'
$env:EVIDENCE_TITLE = $Title
$cmdList = $Commands -split ';;'
python -u "$PSScriptRoot\console.py" $Mode $Target @cmdList
