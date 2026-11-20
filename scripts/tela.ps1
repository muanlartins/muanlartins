# Parts of Windows' main screen as PNG, one base64 line each, for scripts/rocket_league.py (the end-of-match
# scoreboard, where Rocket League shows the points). Nothing is written to disk. $regioes is "x,y,w,h;…" as
# fractions of the screen, so the same parts are taken at any resolution. DPI-aware, so the fractions are of the real
# pixels whatever Windows' scaling.
param([string]$regioes)
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type -Namespace Muan -Name Dpi -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
[Muan.Dpi]::SetProcessDPIAware() | Out-Null
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
foreach ($regiao in $regioes.Split(';')) {
  $f = $regiao.Split(',') | ForEach-Object { [double]::Parse($_, [Globalization.CultureInfo]::InvariantCulture) }
  $x = [int]($screen.X + $f[0] * $screen.Width)
  $y = [int]($screen.Y + $f[1] * $screen.Height)
  $w = [int]($f[2] * $screen.Width)
  $h = [int]($f[3] * $screen.Height)
  $bitmap = New-Object System.Drawing.Bitmap $w, $h
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($x, $y, 0, 0, $bitmap.Size)
  $stream = New-Object System.IO.MemoryStream
  $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  [Console]::Out.WriteLine([Convert]::ToBase64String($stream.ToArray()))
  $graphics.Dispose()
  $bitmap.Dispose()
}
