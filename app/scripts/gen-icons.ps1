Add-Type -AssemblyName System.Drawing

function New-Icon([int]$size, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $s = [float]$size
  $r = $s * 0.18

  # rounded-square gradient background (indigo)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc(0, 0, $d, $d, 180, 90) | Out-Null
  $path.AddArc($s - $d, 0, $d, $d, 270, 90) | Out-Null
  $path.AddArc($s - $d, $s - $d, $d, $d, 0, 90) | Out-Null
  $path.AddArc(0, $s - $d, $d, $d, 90, 90) | Out-Null
  $path.CloseFigure()
  $c1 = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)
  $c2 = [System.Drawing.Color]::FromArgb(255, 99, 102, 241)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush `
    (New-Object System.Drawing.PointF(0, 0)), (New-Object System.Drawing.PointF($s, $s)), $c1, $c2
  $g.FillPath($brush, $path)

  $cx = $s / 2
  $cy = $s / 2

  # compass ring
  $penW = $s * 0.045
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penW)
  $ringR = $s * 0.32
  $g.DrawEllipse($pen, ($cx - $ringR), ($cy - $ringR), ($ringR * 2), ($ringR * 2))

  # four-pointed needle (white)
  $L = $s * 0.30
  $W = $s * 0.06
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $pts = @(
    (New-Object System.Drawing.PointF($cx, ($cy - $L))),
    (New-Object System.Drawing.PointF(($cx + $W), ($cy - $W))),
    (New-Object System.Drawing.PointF(($cx + $L), $cy)),
    (New-Object System.Drawing.PointF(($cx + $W), ($cy + $W))),
    (New-Object System.Drawing.PointF($cx, ($cy + $L))),
    (New-Object System.Drawing.PointF(($cx - $W), ($cy + $W))),
    (New-Object System.Drawing.PointF(($cx - $L), $cy)),
    (New-Object System.Drawing.PointF(($cx - $W), ($cy - $W)))
  )
  $g.FillPolygon($white, $pts)

  # north tip accent (rose red)
  $red = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 244, 63, 94))
  $npts = @(
    (New-Object System.Drawing.PointF($cx, ($cy - $L))),
    (New-Object System.Drawing.PointF(($cx + $W * 0.72), ($cy - $L * 0.52))),
    (New-Object System.Drawing.PointF(($cx - $W * 0.72), ($cy - $L * 0.52)))
  )
  $g.FillPolygon($red, $npts)

  # center dot (indigo)
  $dot = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 79, 70, 229))
  $dotR = $s * 0.028
  $g.FillEllipse($dot, ($cx - $dotR), ($cy - $dotR), ($dotR * 2), ($dotR * 2))

  $g.Dispose()
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host ("generated " + $out)
}

New-Icon 512 "d:\job\app\public\pwa-512x512.png"
New-Icon 192 "d:\job\app\public\pwa-192x192.png"
New-Icon 180 "d:\job\app\public\apple-touch-icon.png"
