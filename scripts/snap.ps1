# Capture the full primary screen to screenshots\<name>.png (physical resolution, DPI-aware)
param([Parameter(Mandatory)][string]$Name)
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -Namespace W -Name U -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
[W.U]::SetProcessDPIAware() | Out-Null
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$dir = Join-Path (Split-Path $PSScriptRoot) 'screenshots'
New-Item -ItemType Directory -Force $dir | Out-Null
$path = Join-Path $dir "$Name.png"
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
"saved $path ($($b.Width)x$($b.Height))"
