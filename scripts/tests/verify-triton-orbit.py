#!/usr/bin/env python3
"""
Verify Triton's orbital parameters and check if it appears elliptical
"""

import spiceypy as spice
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

# Load SPICE kernels
spice.furnsh('kernels/naif0012.tls')
spice.furnsh('kernels/de440.bsp')
spice.furnsh('kernels/nep097.bsp')

# Test time: J2000.0
et_start = 0.0

# Triton orbital period (approximately 5.877 days)
period_seconds = 5.877 * 86400.0

# Sample positions over 2 orbital periods
num_points = 500
times = np.linspace(et_start, et_start + 2 * period_seconds, num_points)

# Get positions in ecliptic frame (ECLIPJ2000)
positions = []
distances = []

for t in times:
    # Triton position relative to Neptune in ECLIPJ2000
    pos, _ = spice.spkgeo(801, t, 'ECLIPJ2000', 899)
    positions.append(pos[:3])
    distances.append(np.linalg.norm(pos[:3]))

positions = np.array(positions)
distances = np.array(distances)

print("="*60)
print("TRITON ORBIT ANALYSIS")
print("="*60)

# Calculate orbital parameters
a = np.mean(distances)  # Semi-major axis
r_min = np.min(distances)
r_max = np.max(distances)
e = (r_max - r_min) / (r_max + r_min)  # Eccentricity

print(f"\nOrbital Parameters (ECLIPJ2000 frame):")
print(f"  Semi-major axis: {a:.1f} km ({a/149597870.7:.6f} AU)")
print(f"  Periapsis: {r_min:.1f} km")
print(f"  Apoapsis: {r_max:.1f} km")
print(f"  Eccentricity: {e:.6f}")
print(f"  Distance variation: {r_max - r_min:.1f} km ({(r_max - r_min) / a * 100:.3f}% of semi-major axis)")

# Calculate inclination relative to ecliptic
# Use cross product to find orbital plane normal
normal_vectors = []
for i in range(len(positions) - 1):
    r1 = positions[i]
    r2 = positions[i + 1]
    normal = np.cross(r1, r2)
    if np.linalg.norm(normal) > 0:
        normal_vectors.append(normal / np.linalg.norm(normal))

avg_normal = np.mean(normal_vectors, axis=0)
avg_normal = avg_normal / np.linalg.norm(avg_normal)

ecliptic_normal = np.array([0, 0, 1])
inclination_rad = np.arccos(np.clip(np.dot(avg_normal, ecliptic_normal), -1, 1))
inclination_deg = np.degrees(inclination_rad)

print(f"  Inclination to ecliptic: {inclination_deg:.2f}°")

# Compare with NASA data
print("\n" + "="*60)
print("COMPARISON WITH NASA DATA")
print("="*60)
print("\nNASA published values:")
print("  Semi-major axis: 354,759 km")
print("  Eccentricity: 0.000016 (nearly circular)")
print("  Inclination: 156.865° (to Neptune's equator, retrograde)")
print("  Period: 5.877 days")

print("\nSPICE data:")
print(f"  Semi-major axis: {a:.0f} km")
print(f"  Eccentricity: {e:.6f}")
print(f"  Inclination to ecliptic: {inclination_deg:.2f}°")
print(f"  Period: {period_seconds/86400:.3f} days")

# Check if orbit appears circular
if e < 0.001:
    print(f"\n✓ Orbit is nearly circular (e < 0.001)")
else:
    print(f"\n⚠ Orbit has eccentricity e = {e:.6f}")

# Visualize orbit
fig = plt.figure(figsize=(16, 12))

# 1. 3D view
ax1 = fig.add_subplot(221, projection='3d')
ax1.plot(positions[:, 0], positions[:, 1], positions[:, 2], 'b-', linewidth=1)
ax1.scatter([0], [0], [0], c='blue', s=200, label='Neptune')
ax1.set_xlabel('X (km)')
ax1.set_ylabel('Y (km)')
ax1.set_zlabel('Z (km)')
ax1.set_title('Triton Orbit - 3D View (ECLIPJ2000)')
ax1.legend()

# 2. XY plane (ecliptic plane)
ax2 = fig.add_subplot(222)
ax2.plot(positions[:, 0], positions[:, 1], 'b-', linewidth=1)
ax2.scatter([0], [0], c='blue', s=100, label='Neptune')
ax2.set_xlabel('X (km)')
ax2.set_ylabel('Y (km)')
ax2.set_title('XY Plane (Ecliptic)')
ax2.axis('equal')
ax2.grid(True)
ax2.legend()

# 3. XZ plane
ax3 = fig.add_subplot(223)
ax3.plot(positions[:, 0], positions[:, 2], 'b-', linewidth=1)
ax3.scatter([0], [0], c='blue', s=100, label='Neptune')
ax3.set_xlabel('X (km)')
ax3.set_ylabel('Z (km)')
ax3.set_title('XZ Plane')
ax3.axis('equal')
ax3.grid(True)
ax3.legend()

# 4. YZ plane
ax4 = fig.add_subplot(224)
ax4.plot(positions[:, 1], positions[:, 2], 'b-', linewidth=1)
ax4.scatter([0], [0], c='blue', s=100, label='Neptune')
ax4.set_xlabel('Y (km)')
ax4.set_ylabel('Z (km)')
ax4.set_title('YZ Plane')
ax4.axis('equal')
ax4.grid(True)
ax4.legend()

plt.tight_layout()
plt.savefig('triton_orbit_verification.png', dpi=150)
print(f"\nVisualization saved to: triton_orbit_verification.png")

# Cleanup
spice.kclear()

print("\n" + "="*60)
print("CONCLUSION")
print("="*60)
print("\nTriton's orbit in ECLIPJ2000 frame:")
print(f"  - Eccentricity: {e:.6f} (nearly circular)")
print(f"  - Inclination: {inclination_deg:.2f}° to ecliptic")
print("\nIf the orbit appears elliptical in the visualization:")
print("  1. It's likely due to the high inclination (156.865° to Neptune's equator)")
print("  2. The orbit is tilted significantly relative to the ecliptic")
print("  3. From certain viewing angles, a tilted circular orbit appears elliptical")
print("  4. This is a projection effect, not a data error")
print("\nTo verify: View the orbit from different angles in the 3D visualization")
