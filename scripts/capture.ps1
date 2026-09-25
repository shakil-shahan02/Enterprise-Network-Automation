# Open an evidence window, wait for the output, capture screenshots\<Name>.png, close the window.
param([string]$Name, [string]$Title, [string]$Target, [string]$Mode = 'run', [string]$Commands, [int]$Wait = 20, [switch]$KeepOpen)
$p = Start-Process powershell -WindowStyle Maximized -PassThru -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot\show.ps1", '-Title', "`"$Title`"", '-Target', $Target, '-Mode', $Mode, '-Commands', "`"$Commands`"")
Start-Sleep $Wait
& "$PSScriptRoot\snapwin.ps1" -Name $Name -TitleLike ($Title.Substring(0, [Math]::Min(40, $Title.Length)))
if (-not $KeepOpen) { Stop-Process -Id $p.Id -ErrorAction SilentlyContinue }
