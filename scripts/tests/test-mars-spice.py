#!/usr/bin/env python3
"""
Test if SPICE can query Mars positions from DE440 kernel
"""

import os
import sys

try:
    import spiceypy as spice
except ImportError:
    print("Error: spiceypy not installed")
    sys.exit(1)

# Load kernels
kernel_dir = './kernels'
kernels = ['naif0012.tls', 'de440.bsp']

print("Loading kernels...")
for kernel in kernels:
    kernel_path = os.path.join(kernel_dir, kernel)
    if os.path.exists(kernel_path):
        spice.furnsh(kernel_path)
        print(f"✓ Loaded: {kernel}")
    else:
        print(f"✗ Missing: {kernel}")
        sys.exit(1)

# Test Mars position query
print("\nTesting Mars position queries...")

# Base epoch: 2009-02-02
base_epoch = '2009-02-02T00:00:00'
base_et = spice.str2et(base_epoch)

# Test a few times
test_times = [
    base_et,
    base_et + 365.25 * 86400.0,  # +1 year
    base_et + 10 * 365.25 * 86400.0,  # +10 years
]

for i, et in enumerate(test_times):
    try:
        # Query Mars (499) position relative to Sun (10) in ECLIPJ2000 frame
        state, lt = spice.spkez(499, et, 'ECLIPJ2000', 'NONE', 10)
        pos = state[:3]
        print(f"Test {i+1}: ET={et:.2f} -> Position: [{pos[0]:.6f}, {pos[1]:.6f}, {pos[2]:.6f}] km")
    except Exception as e:
        print(f"Test {i+1}: FAILED - {e}")

# Check kernel coverage for Mars
print("\nChecking kernel coverage for Mars (499)...")
try:
    # Get coverage for Mars in DE440
    cover = spice.stypes.SPICEDOUBLE_CELL(2000)
    spice.spkcov('kernels/de440.bsp', 499, cover)
    
    count = spice.wncard(cover)
    print(f"Found {count} coverage windows for Mars")
    
    if count > 0:
        for i in range(count):
            start, end = spice.wnfetd(cover, i)
            start_utc = spice.et2utc(start, 'C', 0)
            end_utc = spice.et2utc(end, 'C', 0)
            print(f"  Window {i+1}: {start_utc} to {end_utc}")
except Exception as e:
    print(f"Coverage check failed: {e}")

spice.kclear()
print("\nTest complete")
