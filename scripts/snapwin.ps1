# Capture ONE window (found by title substring) via PrintWindow, so overlapping windows are never included.
param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$TitleLike)
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public static class Win {
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr p);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  public static IntPtr Find(string like) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, p) => { if (!IsWindowVisible(h)) return true; var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      if (sb.ToString().Contains(like)) { found = h; return false; } return true; }, IntPtr.Zero);
    return found;
  }
}
"@
[Win]::SetProcessDPIAware() | Out-Null
$h = [IntPtr]::Zero
for ($i = 0; $i -lt 20 -and $h -eq [IntPtr]::Zero; $i++) { $h = [Win]::Find($TitleLike); if ($h -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 500 } }
if ($h -eq [IntPtr]::Zero) { throw "window '$TitleLike' not found" }
$r = New-Object Win+RECT; [Win]::GetWindowRect($h, [ref]$r) | Out-Null
$w = $r.R - $r.L; $ht = $r.B - $r.T
$bmp = New-Object System.Drawing.Bitmap $w, $ht
$g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
[Win]::PrintWindow($h, $hdc, 2) | Out-Null
$g.ReleaseHdc($hdc); $g.Dispose()
# trim the invisible resize border of maximised windows
$crop = if ($r.L -lt 0) { [System.Drawing.Rectangle]::new(-$r.L, -$r.T, $w + 2 * $r.L, $ht + 2 * $r.T) } else { [System.Drawing.Rectangle]::new(0, 0, $w, $ht) }
$out = $bmp.Clone($crop, $bmp.PixelFormat)
$dir = Join-Path (Split-Path $PSScriptRoot) 'screenshots'; New-Item -ItemType Directory -Force $dir | Out-Null
$path = Join-Path $dir "$Name.png"; $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $out.Dispose()
"saved $path ($($crop.Width)x$($crop.Height))"
