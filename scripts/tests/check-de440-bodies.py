#!/usr/bin/env python3
"""
Check what bodies are available in DE440 kernel
"""

import os
import spiceypy as spice

# Load kernels
spice.furnsh('kernels/naif0012.tls')
spice.furnsh('kernels/de440.bsp')

print("Checking DE440 kernel for available bodies...")
print("="*60)

# Common NAIF IDs to check
bodies_to_check = [
    (1, 'Mercury Barycenter'),
    (2, 'Venus Barycenter'),
    (3, 'Earth Barycenter'),
    (4, 'Mars Barycenter'),
    (5, 'Jupiter Barycenter'),
    (6, 'Saturn Barycenter'),
    (7, 'Uranus Barycenter'),
    (8, 'Neptune Barycenter'),
    (199, 'Mercury'),
    (299, 'Venus'),
    (399, 'Earth'),
    (499, 'Mars'),
    (599, 'Jupiter'),
    (699, 'Saturn'),
    (799, 'Uranus'),
    (899, 'Neptune'),
    (10, 'Sun'),
]

base_et = spice.str2et('2009-02-02T00:00:00')

for naif_id, name in bodies_to_check:
    try:
        cover = spice.stypes.SPICEDOUBLE_CELL(2000)
        spice.spkcov('kernels/de440.bsp', naif_id, cover)
        count = spice.wncard(cover)
        
        if count > 0:
            # Try to get position
            try:
                state, _ = spice.spkez(naif_id, base_et, 'ECLIPJ2000', 'NONE', 10)
                print(f"✓ {naif_id:4d} {name:25s} - Available")
            except:
                print(f"? {naif_id:4d} {name:25s} - Coverage exists but query failed")
        else:
            print(f"✗ {naif_id:4d} {name:25s} - Not available")
    except:
        print(f"✗ {naif_id:4d} {name:25s} - Not available")

spice.kclear()
