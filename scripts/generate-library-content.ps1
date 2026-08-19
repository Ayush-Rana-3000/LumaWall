# LumaWall built-in library content generator.
#
# Generates placeholder test content for the content-driven library:
#   - alpine-lake   : procedural mountain/lake "photo" + depth map
#   - rainy-tokyo   : procedural rainy night city "photo" + depth map
#   - cosmic-particles : self-contained HTML/WebGL scene
#   - broken-aurora : intentionally broken scene (tests error handling)
#
# The images are procedurally drawn placeholders so the library pipeline can be
# exercised without shipping copyrighted photography. Replace them with real
# curated photography at any time — the metadata/architecture is identical.
#
# Run from the repo root:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-library-content.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$Root = Join-Path (Get-Location) 'public\library\builtin'
$Wallpapers = Join-Path $Root 'wallpapers'
$Scenes = Join-Path $Root 'scenes'

function New-SceneDir([string]$Category, [string]$Name) {
  $dir = Join-Path $Category $Name
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return $dir
}

function Save-Jpeg([System.Drawing.Bitmap]$bmp, [string]$path, [int]$quality = 88) {
  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
  $bmp.Save($path, $enc, $params)
}

function New-AlpineLake {
  $dir = New-SceneDir $Wallpapers 'alpine-lake'
  $W = 1600; $H = 900
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'

  # Sky gradient (dawn)
  $sky = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0,0)), (New-Object System.Drawing.Point(0,$H)),
    [System.Drawing.Color]::FromArgb(40,48,86), [System.Drawing.Color]::FromArgb(214,164,120))
  $g.FillRectangle($sky, 0, 0, $W, $H)

  # Sun glow
  $sun = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200,255,214,160))
  $g.FillEllipse($sun, 600, 300, 400, 400)
  $sun.Dispose()

  # Far mountain range (lighter)
  $far = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120,96,120,168))
  $ptsFar = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(0,560)),
    (New-Object System.Drawing.Point(180,420)),
    (New-Object System.Drawing.Point(360,520)),
    (New-Object System.Drawing.Point(540,380)),
    (New-Object System.Drawing.Point(760,500)),
    (New-Object System.Drawing.Point(960,410)),
    (New-Object System.Drawing.Point(1180,530)),
    (New-Object System.Drawing.Point(1380,430)),
    (New-Object System.Drawing.Point(1600,540)),
    (New-Object System.Drawing.Point(1600,700)),
    (New-Object System.Drawing.Point(0,700)))
  $g.FillPolygon($far, $ptsFar)
  $far.Dispose()

  # Near mountain range (darker)
  $near = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(58,66,108))
  $ptsNear = [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(0,640)),
    (New-Object System.Drawing.Point(240,520)),
    (New-Object System.Drawing.Point(480,600)),
    (New-Object System.Drawing.Point(720,470)),
    (New-Object System.Drawing.Point(1000,610)),
    (New-Object System.Drawing.Point(1240,540)),
    (New-Object System.Drawing.Point(1600,660)),
    (New-Object System.Drawing.Point(1600,760)),
    (New-Object System.Drawing.Point(0,760)))
  $g.FillPolygon($near, $ptsNear)
  $near.Dispose()

  # Snow caps
  $snow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230,236,242))
  $g.FillPolygon($snow, [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(700,470)),
    (New-Object System.Drawing.Point(720,490)),
    (New-Object System.Drawing.Point(740,478))))
  $g.FillPolygon($snow, [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(180,420)),
    (New-Object System.Drawing.Point(200,440)),
    (New-Object System.Drawing.Point(220,426))))
  $g.FillPolygon($snow, [System.Drawing.Point[]]@(
    (New-Object System.Drawing.Point(960,410)),
    (New-Object System.Drawing.Point(985,432)),
    (New-Object System.Drawing.Point(1010,420))))
  $snow.Dispose()

  # Lake
  $lake = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0,700)), (New-Object System.Drawing.Point(0,$H)),
    [System.Drawing.Color]::FromArgb(96,118,168), [System.Drawing.Color]::FromArgb(24,32,58))
  $g.FillRectangle($lake, 0, 700, $W, 200)
  $lake.Dispose()

  # Reflection shimmer lines
  $shimmer = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60,255,220,170))
  for ($i = 0; $i -lt 14; $i++) {
    $x = 620 + $i * 26
    $y = 720 + (($i % 4) * 22)
    $g.FillRectangle($shimmer, $x, $y, 90, 2)
  }
  $shimmer.Dispose()

  # Foreground shore
  $shore = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20,26,44))
  $g.FillRectangle($shore, 0, 830, $W, 70)
  $shore.Dispose()

  $bmp.Save((Join-Path $dir 'image.png'), [System.Drawing.Imaging.ImageFormat]::Png)

  # ── Depth map (bright = far) ──
  $depth = New-Object System.Drawing.Bitmap($W, $H)
  $dg = [System.Drawing.Graphics]::FromImage($depth)
  $dg.Clear([System.Drawing.Color]::FromArgb(255, 20, 20, 20))  # near = dark
  $skyFar = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 235, 235, 235))
  $dg.FillRectangle($skyFar, 0, 0, $W, 560)
  $skyFar.Dispose()
  $farD = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 180, 180, 180))
  $dg.FillPolygon($farD, $ptsFar)
  $farD.Dispose()
  $nearD = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 90, 90, 90))
  $dg.FillPolygon($nearD, $ptsNear)
  $nearD.Dispose()
  $lakeD = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 150, 150, 150))
  $dg.FillRectangle($lakeD, 0, 700, $W, 200)
  $lakeD.Dispose()
  $depth.Save((Join-Path $dir 'depth.png'), [System.Drawing.Imaging.ImageFormat]::Png)

  # ── Thumbnail ──
  $thumb = New-Object System.Drawing.Bitmap($bmp, 640, 360)
  Save-Jpeg $thumb (Join-Path $dir 'thumbnail.jpg')
  $thumb.Dispose(); $depth.Dispose(); $dg.Dispose(); $bmp.Dispose(); $g.Dispose()
  Write-Host "  alpine-lake done"
}

function New-RainyTokyo {
  $dir = New-SceneDir $Wallpapers 'rainy-tokyo-night'
  $W = 1600; $H = 900
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'

  # Night sky
  $sky = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0,0)), (New-Object System.Drawing.Point(0,$H)),
    [System.Drawing.Color]::FromArgb(12,14,30), [System.Drawing.Color]::FromArgb(34,30,58))
  $g.FillRectangle($sky, 0, 0, $W, $H)
  $sky.Dispose()

  # Glowing city haze
  $haze = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40,255,120,90))
  $g.FillEllipse($haze, 200, 400, 1200, 500)
  $haze.Dispose()

  # Skyline: random-ish building blocks
  $rng = New-Object System.Random(7)
  $x = 0
  while ($x -lt $W) {
    $bw = 70 + $rng.Next(90)
    $bh = 160 + $rng.Next(340)
    $by = $H - 260 - $bh
    $shade = 26 + $rng.Next(24)
    $b = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($shade, 34, 40, 74))
    $g.FillRectangle($b, $x, $by, $bw, $bh)
    $b.Dispose()

    # Lit windows
    $win = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200,255,190,110))
    for ($wx = $x + 12; $wx -lt $x + $bw - 16; $wx += 22) {
      for ($wy = $by + 14; $wy -lt $by + $bh - 20; $wy += 30) {
        if ($rng.Next(100) -lt 46) {
          $g.FillRectangle($win, $wx, $wy, 10, 14)
        }
      }
    }
    $win.Dispose()
    $x += $bw + 8
  }

  # Neon signs (a few accents)
  $neon1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230,255,60,160))
  $g.FillRectangle($neon1, 300, 560, 90, 14)
  $neon1.Dispose()
  $neon2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230,60,220,255))
  $g.FillRectangle($neon2, 960, 520, 120, 14)
  $neon2.Dispose()

  # Wet street
  $street = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0,640)), (New-Object System.Drawing.Point(0,$H)),
    [System.Drawing.Color]::FromArgb(18,20,34), [System.Drawing.Color]::FromArgb(10,11,20))
  $g.FillRectangle($street, 0, 640, $W, 260)
  $street.Dispose()

  # Reflections of neon on wet street
  $ref1 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50,255,60,160))
  $g.FillRectangle($ref1, 320, 680, 50, 120)
  $ref1.Dispose()
  $ref2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50,60,220,255))
  $g.FillRectangle($ref2, 980, 660, 80, 140)
  $ref2.Dispose()

  # Rain streaks
  $rain = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(110,190,210,235), 1)
  for ($i = 0; $i -lt 260; $i++) {
    $rx = $rng.Next($W); $ry = $rng.Next($H)
    $g.DrawLine($rain, $rx, $ry, $rx - 6, $ry + 26)
  }
  $rain.Dispose()

  $bmp.Save((Join-Path $dir 'image.png'), [System.Drawing.Imaging.ImageFormat]::Png)

  # ── Depth map: far skyline bright, street mid, foreground dark ──
  $depth = New-Object System.Drawing.Bitmap($W, $H)
  $dg = [System.Drawing.Graphics]::FromImage($depth)
  $dg.Clear([System.Drawing.Color]::FromArgb(255, 24, 24, 24))
  $skyD = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 220, 220, 220))
  $dg.FillRectangle($skyD, 0, 0, $W, 380)
  $skyD.Dispose()
  $bldD = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 150, 150, 150))
  $dg.FillRectangle($bldD, 0, 380, $W, 260)
  $bldD.Dispose()
  $streetD = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 90, 90, 90))
  $dg.FillRectangle($streetD, 0, 640, $W, 180)
  $streetD.Dispose()
  $depth.Save((Join-Path $dir 'depth.png'), [System.Drawing.Imaging.ImageFormat]::Png)

  $thumb = New-Object System.Drawing.Bitmap($bmp, 640, 360)
  Save-Jpeg $thumb (Join-Path $dir 'thumbnail.jpg')
  $thumb.Dispose(); $depth.Dispose(); $dg.Dispose(); $bmp.Dispose(); $g.Dispose()
  Write-Host "  rainy-tokyo-night done"
}

function New-CosmicScene {
  $dir = New-SceneDir $Scenes 'cosmic-particles'
  # Thumbnail: dark starfield with a few bright particles
  $W = 640; $H = 360
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(6, 8, 16))
  $rng = New-Object System.Random(42)
  for ($i = 0; $i -lt 260; $i++) {
    $b = [System.Drawing.Color]::FromArgb(120 + $rng.Next(135), 190 + $rng.Next(60), 170 + $rng.Next(80), 255)
    $brush = New-Object System.Drawing.SolidBrush($b)
    $s = 1 + $rng.Next(3)
    $g.FillEllipse($brush, $rng.Next($W), $rng.Next($H), $s, $s)
    $brush.Dispose()
  }
  $glow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 140, 90, 255))
  $g.FillEllipse($glow, 240, 120, 160, 160)
  $glow.Dispose()
  Save-Jpeg $bmp (Join-Path $dir 'thumbnail.jpg')
  $bmp.Dispose(); $g.Dispose()
  Write-Host "  cosmic-particles scene ready (index.html written by generator)"
}

function New-BrokenScene {
  $dir = New-SceneDir $Scenes 'broken-aurora'
  # Intentionally ships metadata referencing a missing scene file.
  Write-Host "  broken-aurora placeholder (metadata only)"
}

Write-Host "Generating LumaWall built-in library content..."
New-AlpineLake
New-RainyTokyo
New-CosmicScene
New-BrokenScene
Write-Host "Done."
