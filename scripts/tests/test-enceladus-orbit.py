#!/usr/bin/env python3
"""
Test Enceladus orbit to see if the four-leaf clover pattern is real
"""
import spiceypy as spice
import numpy as np
import os

# Load kernels
kernel_dir = os.path.join(os.path.dirname(__file__), 'kernels')
spice.furnsh(os.path.join(kernel_dir, 'naif0012.tls'))
spice.furnsh(os.path.join(kernel_dir, 'de440.bsp'))
spice.furnsh(os.path.join(kernel_dir, 'sat441.bsp'))

# Test time: 2009-02-02 (base epoch)
et = spice.str2et('2009-02-02T00:00:00')

print("Testing Enceladus orbit")
print("="*60)

# Get Saturn position
saturn_state, _ = spice.spkez(699, et, 'ECLIPJ2000', 'NONE', 10)
print(f"\nSaturn position (relative to Sun):")
print(f"  X: {saturn_state[0]/149597870.7:.6f} AU")
print(f"  Y: {saturn_state[1]/149597870.7:.6f} AU")
print(f"  Z: {saturn_state[2]/149597870.7:.6f} AU")

# Get Enceladus position relative to Saturn
enceladus_state, _ = spice.spkez(602, et, 'ECLIPJ2000', 'NONE', 699)
print(f"\nEnceladus position (relative to Saturn):")
print(f"  X: {enceladus_state[0]/149597870.7:.6f} AU")
print(f"  Y: {enceladus_state[1]/149597870.7:.6f} AU")
print(f"  Z: {enceladus_state[2]/149597870.7:.6f} AU")
print(f"  Distance: {np.linalg.norm(enceladus_state[:3])/149597870.7:.6f} AU")
print(f"  Distance: {np.linalg.norm(enceladus_state[:3]):.2f} km")

# Expected semi-major axis: 238,020 km
expected_a = 238020
actual_dist = np.linalg.norm(enceladus_state[:3])
print(f"\nExpected semi-major axis: {expected_a:.2f} km")
print(f"Actual distance: {actual_dist:.2f} km")
print(f"Difference: {abs(actual_dist - expected_a):.2f} km")

# Sample orbit over one period (1.370 days)
period_days = 1.370
n_samples = 100
times = np.linspace(0, period_days * 86400, n_samples)

print(f"\nSampling orbit over {period_days} days ({n_samples} points):")
positions = []
for t in times:
    state, _ = spice.spkez(602, et + t, 'ECLIPJ2000', 'NONE', 699)
    positions.append(state[:3])

positions = np.array(positions)

# Calculate statistics
distances = np.linalg.norm(positions, axis=1)
print(f"  Min distance: {np.min(distances):.2f} km")
print(f"  Max distance: {np.max(distances):.2f} km")
print(f"  Mean distance: {np.mean(distances):.2f} km")
print(f"  Std deviation: {np.std(distances):.2f} km")

# Check if orbit is roughly circular
eccentricity_estimate = (np.max(distances) - np.min(distances)) / (np.max(distances) + np.min(distances))
print(f"  Estimated eccentricity: {eccentricity_estimate:.6f}")

# Check Z-axis variation (should be small for low inclination)
z_values = positions[:, 2]
print(f"\nZ-axis variation:")
print(f"  Min Z: {np.min(z_values):.2f} km")
print(f"  Max Z: {np.max(z_values):.2f} km")
print(f"  Range: {np.max(z_values) - np.min(z_values):.2f} km")

# Check if it's in Saturn's equatorial plane or ecliptic plane
# Saturn's equatorial plane is tilted ~26.7° to its orbital plane
print(f"\nOrbit plane analysis:")
print(f"  If in ecliptic plane, Z should be ~0")
print(f"  If in Saturn's equatorial plane, Z can be larger")

# Get Saturn's radius for comparison
saturn_radius = 58232  # km (equatorial)
print(f"\nSaturn's equatorial radius: {saturn_radius:.2f} km")
if np.min(distances) < saturn_radius:
    print(f"  ⚠️  WARNING: Orbit passes through Saturn!")
else:
    print(f"  ✓ Orbit clears Saturn")

spice.kclear()
