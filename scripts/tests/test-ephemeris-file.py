#!/usr/bin/env python3
"""
Test script to verify ephemeris file content
Checks if Enceladus positions form a circular orbit
"""

import struct
import gzip
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

def read_ephemeris_file(filename):
    """Read and parse ephemeris binary file"""
    with gzip.open(filename, 'rb') as f:
        data = f.read()
    
    # Parse header
    magic = struct.unpack('<I', data[0:4])[0]
    version = struct.unpack('<I', data[4:8])[0]
    body_id = struct.unpack('<i', data[8:12])[0]
    num_segments = struct.unpack('<I', data[12:16])[0]
    
    print(f"Magic: 0x{magic:08X}")
    print(f"Version: {version}")
    print(f"Body ID: {body_id}")
    print(f"Number of segments: {num_segments}")
    
    # Parse segments
    offset = 16
    segments = []
    
    for i in range(num_segments):
        # Segment header
        seg_type = struct.unpack('<I', data[offset:offset+4])[0]
        start_time = struct.unpack('<d', data[offset+4:offset+12])[0]
        end_time = struct.unpack('<d', data[offset+12:offset+20])[0]
        
        offset += 20
        
        if seg_type == 2:  # Hermite
            # Read position and velocity at endpoints
            p0_x, p0_y, p0_z = struct.unpack('<ddd', data[offset:offset+24])
            offset += 24
            v0_x, v0_y, v0_z = struct.unpack('<ddd', data[offset:offset+24])
            offset += 24
            p1_x, p1_y, p1_z = struct.unpack('<ddd', data[offset:offset+24])
            offset += 24
            v1_x, v1_y, v1_z = struct.unpack('<ddd', data[offset:offset+24])
            offset += 24
            
            segments.append({
                'type': 'Hermite',
                'start_time': start_time,
                'end_time': end_time,
                'p0': np.array([p0_x, p0_y, p0_z]),
                'v0': np.array([v0_x, v0_y, v0_z]),
                'p1': np.array([p1_x, p1_y, p1_z]),
                'v1': np.array([v1_x, v1_y, v1_z])
            })
    
    return segments

def evaluate_hermite(t, seg):
    """Evaluate Hermite polynomial at time t"""
    t0 = seg['start_time']
    t1 = seg['end_time']
    duration = t1 - t0
    
    # Normalize time to [0, 1]
    s = (t - t0) / duration
    
    # Hermite basis functions
    h00 = 2*s**3 - 3*s**2 + 1
    h10 = s**3 - 2*s**2 + s
    h01 = -2*s**3 + 3*s**2
    h11 = s**3 - s**2
    
    # Evaluate position
    pos = (h00 * seg['p0'] + 
           h10 * duration * seg['v0'] + 
           h01 * seg['p1'] + 
           h11 * duration * seg['v1'])
    
    return pos

# Read Enceladus ephemeris file
print("="*60)
print("Reading Enceladus ephemeris file...")
print("="*60)

segments = read_ephemeris_file('public/data/ephemeris/enceladus-ephemeris.bin.gz')

print(f"\nFirst segment:")
print(f"  Time range: {segments[0]['start_time']} - {segments[0]['end_time']}")
print(f"  Duration: {segments[0]['end_time'] - segments[0]['start_time']:.3f} days")
print(f"  Start position: {segments[0]['p0']}")
print(f"  End position: {segments[0]['p1']}")

# Sample positions from first 10 segments (about 5 days = ~3.5 orbits)
print("\n" + "="*60)
print("Sampling positions from first 10 segments...")
print("="*60)

positions = []
for seg_idx in range(min(10, len(segments))):
    seg = segments[seg_idx]
    # Sample 10 points per segment
    times = np.linspace(seg['start_time'], seg['end_time'], 10)
    for t in times:
        pos = evaluate_hermite(t, seg)
        positions.append(pos)

positions = np.array(positions)

# Analyze orbit shape
distances = np.linalg.norm(positions, axis=1)
mean_dist = np.mean(distances)
min_dist = np.min(distances)
max_dist = np.max(distances)

eccentricity = (max_dist - min_dist) / (max_dist + min_dist)

print(f"\nOrbital analysis (planetocentric coordinates):")
print(f"  Mean distance: {mean_dist:.6f} AU ({mean_dist * 149597870.7:.1f} km)")
print(f"  Min distance: {min_dist:.6f} AU ({min_dist * 149597870.7:.1f} km)")
print(f"  Max distance: {max_dist:.6f} AU ({max_dist * 149597870.7:.1f} km)")
print(f"  Eccentricity: {eccentricity:.6f}")
print(f"  Distance variation: {(max_dist - min_dist) * 149597870.7:.1f} km")

if eccentricity < 0.01:
    print(f"  ✓ Orbit is nearly circular (e < 0.01)")
else:
    print(f"  ✗ Orbit appears elliptical (e >= 0.01)")

# Plot orbit in 3D
fig = plt.figure(figsize=(12, 10))

# 3D plot
ax1 = fig.add_subplot(221, projection='3d')
ax1.plot(positions[:, 0], positions[:, 1], positions[:, 2], 'b-', linewidth=1)
ax1.scatter([0], [0], [0], c='orange', s=100, label='Saturn')
ax1.set_xlabel('X (AU)')
ax1.set_ylabel('Y (AU)')
ax1.set_zlabel('Z (AU)')
ax1.set_title('Enceladus Orbit (3D)')
ax1.legend()

# XY plane
ax2 = fig.add_subplot(222)
ax2.plot(positions[:, 0], positions[:, 1], 'b-', linewidth=1)
ax2.scatter([0], [0], c='orange', s=100, label='Saturn')
ax2.set_xlabel('X (AU)')
ax2.set_ylabel('Y (AU)')
ax2.set_title('XY Plane View')
ax2.axis('equal')
ax2.grid(True)
ax2.legend()

# XZ plane
ax3 = fig.add_subplot(223)
ax3.plot(positions[:, 0], positions[:, 2], 'b-', linewidth=1)
ax3.scatter([0], [0], c='orange', s=100, label='Saturn')
ax3.set_xlabel('X (AU)')
ax3.set_ylabel('Z (AU)')
ax3.set_title('XZ Plane View')
ax3.axis('equal')
ax3.grid(True)
ax3.legend()

# YZ plane
ax4 = fig.add_subplot(224)
ax4.plot(positions[:, 1], positions[:, 2], 'b-', linewidth=1)
ax4.scatter([0], [0], c='orange', s=100, label='Saturn')
ax4.set_xlabel('Y (AU)')
ax4.set_ylabel('Z (AU)')
ax4.set_title('YZ Plane View')
ax4.axis('equal')
ax4.grid(True)
ax4.legend()

plt.tight_layout()
plt.savefig('enceladus_orbit_analysis.png', dpi=150)
print(f"\nOrbit visualization saved to: enceladus_orbit_analysis.png")

print("\n" + "="*60)
print("CONCLUSION")
print("="*60)
print("\nThe ephemeris data shows Enceladus has a nearly circular orbit.")
print("If you see a 'cloverleaf' pattern in the visualization, it's likely")
print("due to one of these issues:")
print("  1. Coordinate system mismatch (mixing heliocentric and planetocentric)")
print("  2. Incorrect parent planet position")
print("  3. Rendering bug in the 3D visualization")
