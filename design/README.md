# Design sources

`source/wordmark.png` is the supplied logo lockup: the fold mark plus "View on iPhone
Duo", navy `#20262C` with `Duo` in blue `#5F80FA`, on transparency. Everything shipped is
derived from it.

`source/icon-original.png` is the supplied icon artwork. It is **not** used. It is a dark,
soft-edged render on black, so at 16px it collapses into an invisible smudge and
auto-levelling it just blows out the glow. The icon instead crops the same mark out of the
wordmark, where it is crisp and high contrast.

## Icons

The mark is recoloured white and set on a `#5F80FA` tile — the blue already in the
lockup. The tile is rounded for the favicon and **square for the apple icon**, because iOS
applies its own mask and rounding it here would show a double-rounded edge.

```bash
magick source/wordmark.png -fuzz 2% -trim +repage /tmp/wm.png
magick /tmp/wm.png -crop 340x323+0+0 +repage -fuzz 2% -trim +repage /tmp/mark.png
magick /tmp/mark.png -fill white -colorize 100 /tmp/mark-white.png

magick -size 512x512 xc:none -fill "#5F80FA" -draw "roundrectangle 0,0,511,511 114,114" \
  \( /tmp/mark-white.png -resize 300x300 \) -gravity center -composite /tmp/tile-round.png
magick -size 512x512 xc:"#5F80FA" \
  \( /tmp/mark-white.png -resize 300x300 \) -gravity center -composite /tmp/tile-square.png

magick /tmp/tile-round.png  -resize 256x256 -strip -colors 64 ../src/app/icon.png
magick /tmp/tile-square.png -resize 180x180 -strip -colors 64 ../src/app/apple-icon.png
for s in 16 32 48; do magick /tmp/tile-round.png -resize ${s}x${s} -strip /tmp/f$s.png; done
magick /tmp/f16.png /tmp/f32.png /tmp/f48.png ../src/app/favicon.ico
```

## OpenGraph image

`opengraph-background.svg` is the background; the recoloured wordmark is composited over
it. The mark is white on dark, so the navy is swapped for white while the blue `Duo` is
left alone — a 30% fuzz cannot reach the blue, whose colour distance from the navy is
about 53% of maximum.

```bash
rsvg-convert -w 1200 -h 630 opengraph-background.svg -o /tmp/bg.png
magick /tmp/wm.png -fuzz 30% -fill white -opaque "#20262C" -resize 800x /tmp/wm-white.png
magick /tmp/bg.png /tmp/wm-white.png -geometry +200+132 -composite \
  -strip -quality 90 -sampling-factor 4:4:4 ../src/app/opengraph-image.jpg
```

**JPEG, not PNG.** The background is a smooth gradient: palette-quantising the PNG to get
it under ~115KB produced visible dithering speckle and ring artefacts around the halo,
while JPEG q90 stays clean at 91KB. Flat artwork like the icons quantises fine — gradients
do not. Never judge this by RMSE alone; the quantised version scored 0.76% and still looked
wrong.
