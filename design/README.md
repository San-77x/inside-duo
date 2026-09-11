# Design sources

`src/app/icon.svg` is itself the source for the icon — edit it directly.

`opengraph-image.svg` is the source for `src/app/opengraph-image.png`, which has to be a
raster file because social platforms do not render SVG previews. After editing it:

```bash
rsvg-convert -w 1200 -h 630 design/opengraph-image.svg -o src/app/opengraph-image.png
```

To regenerate the raster icons from `src/app/icon.svg`:

```bash
sed 's/rx="114"/rx="0"/' src/app/icon.svg > /tmp/apple.svg
rsvg-convert -w 180 -h 180 /tmp/apple.svg -o src/app/apple-icon.png
for s in 16 32 64; do rsvg-convert -w $s -h $s src/app/icon.svg -o /tmp/i-$s.png; done
magick /tmp/i-16.png /tmp/i-32.png /tmp/i-64.png src/app/favicon.ico
```

The apple icon is deliberately square with no corner radius: iOS applies its own mask, and
rounding it here would show a double-rounded edge.
