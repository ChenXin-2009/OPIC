#!/usr/bin/env python3
"""
Test if the "cloverleaf" pattern is caused by sampling aliasing
"""

import numpy as np
import matplotlib.pyplot as plt

# Enceladus orbital parameters
orbital_period_days = 1.37  # days
orbital_radius = 238035  # km

# Simulate different time steps
time_steps = [
    0.5,   # 0.5 days
    0.45,  # 0.45 days (close to 1/3 of period)
    0.46,  # 0.46 days (close to 1/3 of period)
    1.0,   # 1 day
    0.1,   # 0.1 days
]

fig, axes = plt.subplots(2, 3, figsize=(15, 10))
axes = axes.flatten()

for idx, dt in enumerate(time_steps):
    # Simulate 10 days of motion
    times = np.arange(0, 10, dt)
    
    # Calculate positions (circular orbit)
    angles = 2 * np.pi * times / orbital_period_days
    x = orbital_radius * np.cos(angles)
    y = orbital_radius * np.sin(angles)
    
    # Plot
    ax = axes[idx]
    ax.plot(x, y, 'b.-', markersize=3, linewidth=0.5)
    ax.scatter([0], [0], c='orange', s=100, label='Saturn')
    ax.set_xlabel('X (km)')
    ax.set_ylabel('Y (km)')
    ax.set_title(f'Time step: {dt} days\n({len(times)} samples over 10 days)')
    ax.axis('equal')
    ax.grid(True, alpha=0.3)
    ax.legend()
    
    # Calculate sampling ratio
    samples_per_orbit = orbital_period_days / dt
    ax.text(0.05, 0.95, f'Samples/orbit: {samples_per_orbit:.2f}', 
            transform=ax.transAxes, verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

# Add explanation
axes[5].text(0.5, 0.5, 
             'SAMPLING ALIASING EXPLANATION:\n\n'
             'When time step ≈ period/3:\n'
             '→ Creates "cloverleaf" pattern\n\n'
             'When time step ≈ period/4:\n'
             '→ Creates "square" pattern\n\n'
             'Solution:\n'
             '→ Use smaller time steps\n'
             '→ Or use interpolation',
             transform=axes[5].transAxes,
             horizontalalignment='center',
             verticalalignment='center',
             fontsize=12,
             bbox=dict(boxstyle='round', facecolor='lightblue', alpha=0.8))
axes[5].axis('off')

plt.tight_layout()
plt.savefig('sampling_aliasing_demo.png', dpi=150)
print("Visualization saved to: sampling_aliasing_demo.png")

# Calculate critical time steps
print("\n" + "="*60)
print("CRITICAL TIME STEPS FOR ENCELADUS")
print("="*60)
print(f"Orbital period: {orbital_period_days} days")
print(f"\nProblematic time steps (create patterns):")
print(f"  Period/2 = {orbital_period_days/2:.3f} days → 2-leaf pattern")
print(f"  Period/3 = {orbital_period_days/3:.3f} days → 3-leaf (cloverleaf) pattern")
print(f"  Period/4 = {orbital_period_days/4:.3f} days → 4-leaf pattern")
print(f"\nRecommended time steps (smooth orbit):")
print(f"  Period/10 = {orbital_period_days/10:.3f} days")
print(f"  Period/20 = {orbital_period_days/20:.3f} days")
print(f"  Period/50 = {orbital_period_days/50:.3f} days")
