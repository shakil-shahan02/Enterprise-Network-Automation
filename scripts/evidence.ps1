# Helper: open an evidence window. Usage: .\scripts\evidence.ps1 "<title>" <target> <run|sh> "<cmd1;;cmd2>"
param([string]$Title, [string]$Target, [string]$Mode, [string]$Commands)
$p = Start-Process powershell -WindowStyle Maximized -PassThru -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot\show.ps1", '-Title', "`"$Title`"", '-Target', $Target, '-Mode', $Mode, '-Commands', "`"$Commands`"")
$p.Id | Set-Content "$env:TEMP\showpid.txt"
