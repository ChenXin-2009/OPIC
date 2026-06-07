# PWA Assets Requirements

## Overview

This document lists the required assets for the OPIC Progressive Web App (PWA) implementation.

## Required Icons

The following icon sizes are referenced in `manifest.json` and need to be created:

### Icon Specifications

**Source Image Requirements:**
- Format: PNG with transparency
- Minimum size: 512x512 pixels
- Design: OPIC logo on transparent or dark background
- Colors: Match theme (background: #0a0a0a, theme: #1a1a2e)

**Required Icon Sizes:**

| Size | Path | Purpose |
|------|------|---------|
| 72x72 | `/public/icons/icon-72x72.png` | Small devices |
| 96x96 | `/public/icons/icon-96x96.png` | Standard devices |
| 128x128 | `/public/icons/icon-128x128.png` | Standard devices |
| 144x144 | `/public/icons/icon-144x144.png` | High-res devices |
| 152x152 | `/public/icons/icon-152x152.png` | iOS devices |
| 192x192 | `/public/icons/icon-192x192.png` | **Required** - Android devices |
| 384x384 | `/public/icons/icon-384x384.png` | High-res devices |
| 512x512 | `/public/icons/icon-512x512.png` | **Required** - Splash screens |

### Maskable Icons

Icons with sizes 192x192 and 512x512 should also support the "maskable" purpose:
- Include safe zone (80% of image in center)
- Important content should not extend to edges
- Background should be solid color or simple pattern

## Required Screenshots

The following screenshots are referenced in `manifest.json`:

### Desktop Screenshots

**Requirements:**
- Size: 1920x1080 pixels
- Format: PNG
- Quality: High (minimal compression)

| File | Description | Content |
|------|-------------|---------|
| `/public/screenshots/screenshot-desktop-1.png` | Main view | Earth view with satellite tracking UI visible |
| `/public/screenshots/screenshot-desktop-2.png` | Galaxy view | Cosmic structure exploration showing galaxies |

**Capture Guidelines:**
1. Use high-quality rendering settings
2. Show key features (UI elements, 3D visualization, data panels)
3. Use representative data (ISS tracking, Milky Way, etc.)
4. Ensure dark theme is active
5. Include at least one visible UI panel (search, timeline, data)

### Mobile Screenshots

**Requirements:**
- Size: 750x1334 pixels (iPhone 8 size)
- Format: PNG
- Orientation: Portrait

| File | Description | Content |
|------|-------------|---------|
| `/public/screenshots/screenshot-mobile-1.png` | Mobile view | Touch-friendly controls and navigation |

## Shortcut Icons

Optional app shortcut icons:

| File | Size | Purpose |
|------|------|---------|
| `/public/icons/shortcut-search.png` | 96x96 | Search shortcut icon |
| `/public/icons/shortcut-satellite.png` | 96x96 | Satellite tracking shortcut |

## Generation Tools

### Recommended Approach

1. **Create Base Icon (512x512)**:
   - Design in vector format (SVG, Figma, Adobe Illustrator)
   - Export as PNG 512x512

2. **Generate All Sizes**:
   ```bash
   # Using ImageMagick
   convert icon-512x512.png -resize 192x192 icon-192x192.png
   convert icon-512x512.png -resize 384x384 icon-384x384.png
   # ... repeat for all sizes
   ```

3. **Online Tools**:
   - [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
   - [Real Favicon Generator](https://realfavicongenerator.net/)
   - [Maskable.app](https://maskable.app/) - For maskable icon validation

### Automated Generation Script

Create a script to generate all icon sizes from a source image:

```bash
#!/bin/bash
# generate-icons.sh

SOURCE="source-icon.png"
SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
  convert "$SOURCE" -resize ${size}x${size} "icon-${size}x${size}.png"
  echo "Generated icon-${size}x${size}.png"
done
```

## Capturing Screenshots

### Desktop Screenshots

1. Start the application in production mode
2. Set browser window to exactly 1920x1080
3. Disable browser UI (F11 fullscreen)
4. Navigate to desired view
5. Use browser developer tools screenshot feature or:
   ```javascript
   // In browser console
   document.documentElement.requestFullscreen();
   // Then use OS screenshot tool
   ```

### Mobile Screenshots

1. Use browser device emulation (iPhone 8: 750x1334)
2. Or use real device with screenshot tools
3. Ensure orientation is portrait
4. Capture with all UI elements visible

## Validation

### Icon Validation

Check icons using browser developer tools:
1. Open Chrome DevTools
2. Navigate to Application > Manifest
3. Verify all icons load correctly
4. Check for warnings

### PWA Score

Run Lighthouse audit:
```bash
npx lighthouse https://your-domain.com --view
```

Target scores:
- PWA: > 90
- Performance: > 85
- Accessibility: > 95

## Implementation Status

Current status of assets:

- [ ] Base icon design created
- [ ] All icon sizes generated
- [ ] Desktop screenshot 1 captured
- [ ] Desktop screenshot 2 captured
- [ ] Mobile screenshot captured
- [ ] Shortcut icons created (optional)
- [ ] Icons placed in `/public/icons/`
- [ ] Screenshots placed in `/public/screenshots/`
- [ ] Lighthouse PWA audit passed

## Notes

- Icons should be optimized (use `pngquant` or similar)
- Screenshots should showcase app functionality
- Test on actual devices before deployment
- Consider creating adaptive icon for Android (with background layer)

## References

- [PWA Manifest Specification](https://w3c.github.io/manifest/)
- [Web App Manifest Icons](https://developer.mozilla.org/en-US/docs/Web/Manifest/icons)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [PWA Screenshots](https://web.dev/add-manifest/#screenshots)
