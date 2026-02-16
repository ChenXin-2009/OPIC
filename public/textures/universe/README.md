# Universe Textures

This directory contains texture files for galaxy visualization in the observable universe feature.

## Required Textures

### Galaxy Textures
- **spiral-galaxy.webp** (512x512 or 256x256)
  - Bright central core
  - Spiral arm structure
  - Transparent background (alpha channel)
  - Blue-white color tone
  - File size: < 50KB

- **elliptical-galaxy.webp** (512x512 or 256x256)
  - Smooth elliptical shape
  - Brightness gradient from center to edge
  - Transparent background
  - Yellow-white color tone
  - File size: < 50KB

- **irregular-galaxy.webp** (512x512 or 256x256)
  - Irregular shape
  - Multiple bright regions
  - Transparent background
  - Mixed color tones
  - File size: < 50KB

## Placeholder Status

Currently, these textures are placeholders. The renderers will work without them by using simple colored geometry, but adding proper textures will significantly enhance the visual quality.

## How to Add Textures

1. Create or obtain galaxy texture images matching the specifications above
2. Optimize them for web (WebP format, < 50KB each)
3. Place them in this directory
4. The LocalGroupRenderer will automatically load and use them

## Sources

You can create these textures using:
- Image editing software (Photoshop, GIMP, etc.)
- Procedural generation tools
- NASA/ESA public domain images (properly processed)
- Space Engine or similar software
