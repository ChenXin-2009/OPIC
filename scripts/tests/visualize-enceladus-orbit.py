#!/usr/bin/env python3
"""
Visualize Enceladus orbit to understand the "cloverleaf" pattern
"""

import spiceypy as spice
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

# Load SPICE kernels
spice.furnsh('kernels/naif0012.tls')
spice.furnsh('kernels/de440.bsp')
spice.furnsh('kernels/sat441.bsp')

# Test time: J2000.0
et_start = 0.0

# Get orbital period (approximately 1.37 days)
period_seconds = 1.37 * 86400.0

# Sample positions over 3 orbital periods
num_points = 300
times = np.linspace(et_start, et_start + 3 * period_seconds, num_points)

# Get positions in different coordinate frames
positions_ecliptic = []  # ECLIPJ2000 (ecliptic plane)
positions_saturn_eq = []  # IAU_SATURN (Saturn's equatorial plane)
saturn_positions = []  # Saturn's position relative to Sun

for t in times:
    # Enceladus position relative to Saturn in ECLIPJ2000
    pos_ecl, _ = spice.spkgeo(602, t, 'ECLIPJ2000', 699)
    positions_ecliptic.append(pos_ecl[:3])
    
    # Enceladus position relative to Saturn in Saturn's equatorial frame
    try:
        pos_sat, _ = spice.spkgeo(602, t, 'IAU_SATURN', 699)
        positions_saturn_eq.append(pos_sat[:3])
    except:
        positions_saturn_eq.append([0, 0, 0])
    
    # Saturn position relative to Sun
    saturn_pos, _ = spice.spkgeo(699, t, 'ECLIPJ2000', 10)
    saturn_positions.append(saturn_pos[:3])

positions_ecliptic = np.array(positions_ecliptic)
positions_saturn_eq = np.array(positions_saturn_eq)
saturn_positions = np.array(saturn_positions)

# Convert to AU
AU = 149597870.7
positions_ecliptic_au = positions_ecliptic / AU
positions_saturn_eq_au = positions_saturn_eq / AU

# Calculate heliocentric positions (Saturn + Enceladus relative position)
heliocentric_positions = saturn_positions / AU + positions_ecliptic_au

print("="*60)
print("ENCELADUS ORBIT ANALYSIS")
print("="*60)

# Analyze orbit in Saturn's equatorial frame
distances_eq = np.linalg.norm(positions_saturn_eq, axis=1)
print(f"\nIn Saturn's equatorial frame:")
print(f"  Mean distance: {np.mean(distances_eq):.1f} km")
print(f"  Min distance: {np.min(distances_eq):.1f} km")
print(f"  Max distance: {np.max(distances_eq):.1f} km")
print(f"  Eccentricity: {(np.max(distances_eq) - np.min(distances_eq)) / (np.max(distances_eq) + np.min(distances_eq)):.6f}")

# Analyze orbit in ecliptic frame
distances_ecl = np.linalg.norm(positions_ecliptic, axis=1)
print(f"\nIn ecliptic frame (ECLIPJ2000):")
print(f"  Mean distance: {np.mean(distances_ecl):.1f} km")
print(f"  Min distance: {np.min(distances_ecl):.1f} km")
print(f"  Max distance: {np.max(distances_ecl):.1f} km")
print(f"  Eccentricity: {(np.max(distances_ecl) - np.min(distances_ecl)) / (np.max(distances_ecl) + np.min(distances_ecl)):.6f}")

# Create visualization
fig = plt.figure(figsize=(16, 12))

# 1. Saturn's equatorial frame (should be circular)
ax1 = fig.add_subplot(231, projection='3d')
ax1.plot(positions_saturn_eq[:, 0], positions_saturn_eq[:, 1], positions_saturn_eq[:, 2], 'b-', linewidth=1)
ax1.scatter([0], [0], [0], c='orange', s=200, label='Saturn')
ax1.set_xlabel('X (km)')
ax1.set_ylabel('Y (km)')
ax1.set_zlabel('Z (km)')
ax1.set_title("Saturn's Equatorial Frame\n(Should be circular)")
ax1.legend()

# 2. Ecliptic frame - 3D view
ax2 = fig.add_subplot(232, projection='3d')
ax2.plot(positions_ecliptic[:, 0], positions_ecliptic[:, 1], positions_ecliptic[:, 2], 'b-', linewidth=1)
ax2.scatter([0], [0], [0], c='orange', s=200, label='Saturn')
ax2.set_xlabel('X (km)')
ax2.set_ylabel('Y (km)')
ax2.set_zlabel('Z (km)')
ax2.set_title('Ecliptic Frame (ECLIPJ2000)\n3D View')
ax2.legend()

# 3. Ecliptic frame - XY plane
ax3 = fig.add_subplot(233)
ax3.plot(positions_ecliptic[:, 0], positions_ecliptic[:, 1], 'b-', linewidth=1)
ax3.scatter([0], [0], c='orange', s=100, label='Saturn')
ax3.set_xlabel('X (km)')
ax3.set_ylabel('Y (km)')
ax3.set_title('Ecliptic Frame - XY Plane')
ax3.axis('equal')
ax3.grid(True)
ax3.legend()

# 4. Ecliptic frame - XZ plane
ax4 = fig.add_subplot(234)
ax4.plot(positions_ecliptic[:, 0], positions_ecliptic[:, 2], 'b-', linewidth=1)
ax4.scatter([0], [0], c='orange', s=100, label='Saturn')
ax4.set_xlabel('X (km)')
ax4.set_ylabel('Z (km)')
ax4.set_title('Ecliptic Frame - XZ Plane')
ax4.axis('equal')
ax4.grid(True)
ax4.legend()

# 5. Ecliptic frame - YZ plane
ax5 = fig.add_subplot(235)
ax5.plot(positions_ecliptic[:, 1], positions_ecliptic[:, 2], 'b-', linewidth=1)
ax5.scatter([0], [0], c='orange', s=100, label='Saturn')
ax5.set_xlabel('Y (km)')
ax5.set_ylabel('Z (km)')
ax5.set_title('Ecliptic Frame - YZ Plane')
ax5.axis('equal')
ax5.grid(True)
ax5.legend()

# 6. Heliocentric positions (Sun-centered)
ax6 = fig.add_subplot(236, projection='3d')
ax6.plot(heliocentric_positions[:, 0], heliocentric_positions[:, 1], heliocentric_positions[:, 2], 'b-', linewidth=1)
ax6.plot(saturn_positions[:, 0] / AU, saturn_positions[:, 1] / AU, saturn_positions[:, 2] / AU, 'orange', linewidth=2, label='Saturn orbit')
ax6.scatter([0], [0], [0], c='yellow', s=300, marker='*', label='Sun')
ax6.set_xlabel('X (AU)')
ax6.set_ylabel('Y (AU)')
ax6.set_zlabel('Z (AU)')
ax6.set_title('Heliocentric Frame\n(Sun-centered)')
ax6.legend()

plt.tight_layout()
plt.savefig('enceladus_orbit_visualization.png', dpi=150)
print(f"\nVisualization saved to: enceladus_orbit_visualization.png")

# Cleanup
spice.kclear()

print("\n" + "="*60)
print("INTERPRETATION")
print("="*60)
print("\nIf you see a 'cloverleaf' pattern in the visualization:")
print("  1. In Saturn's equatorial frame: Should be circular")
print("  2. In ecliptic frame: May appear tilted/elliptical due to 28° inclination")
print("  3. In heliocentric frame: Combines Saturn's orbit + Enceladus orbit")
print("\nThe 'cloverleaf' is likely caused by:")
print("  - Viewing a tilted circular orbit from certain angles")
print("  - Coordinate system confusion in the rendering code")
print("  - Incorrect transformation between frames")
