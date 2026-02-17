#!/usr/bin/env python3
"""
Generate All-Bodies Ephemeris Data

This script generates polynomial segment ephemeris data for all 27 celestial bodies
(8 planets + 19 satellites) using JPL SPICE kernels.

Uses:
- Chebyshev polynomials for planets (smooth motion, long periods)
- Hermite polynomials for satellites (C1 continuity, dynamic systems)

Requirements:
- spiceypy (pip install spiceypy)
- numpy (pip install numpy)
"""

import os
import sys
import struct
import gzip
import argparse
from datetime import datetime
from typing import List, Tuple, Dict
import numpy as np

try:
    import spiceypy as spice
except ImportError:
    print("Error: spiceypy not installed. Run: pip install spiceypy")
    sys.exit(1)

# Magic number for ephemeris files: "JUPM" (Jupiter Moons)
MAGIC_NUMBER = 0x4A55504D

# Version 2: Polynomial segments
VERSION = 2

# Conversion factor: km to AU
KM_TO_AU = 1.0 / 149597870.7

# Body configurations
BODY_CONFIGS = [
    # Inner planets (use planet center IDs - available in DE440)
    {'naif_id': 199, 'name': 'Mercury', 'type': 'planet', 'segment_days': 1.0, 'order': 8, 'years': 30},
    {'naif_id': 299, 'name': 'Venus', 'type': 'planet', 'segment_days': 1.0, 'order': 8, 'years': 30},
    {'naif_id': 399, 'name': 'Earth', 'type': 'planet', 'segment_days': 0.25, 'order': 8, 'years': 100},
    # Mars and outer planets (use barycenter IDs - planet centers not in DE440)
    {'naif_id': 4, 'name': 'Mars', 'type': 'planet', 'segment_days': 2.0, 'order': 8, 'years': 100},
    {'naif_id': 5, 'name': 'Jupiter', 'type': 'planet', 'segment_days': 7.0, 'order': 6, 'years': 30},
    {'naif_id': 6, 'name': 'Saturn', 'type': 'planet', 'segment_days': 7.0, 'order': 6, 'years': 30},
    {'naif_id': 7, 'name': 'Uranus', 'type': 'planet', 'segment_days': 7.0, 'order': 6, 'years': 30},
    {'naif_id': 8, 'name': 'Neptune', 'type': 'planet', 'segment_days': 7.0, 'order': 6, 'years': 30},
    # Earth satellite
    {'naif_id': 301, 'name': 'Moon', 'type': 'satellite', 'parent': 399, 'segment_days': 0.5, 'order': 3, 'years': 100},
    # Jupiter satellites (parent is Jupiter Barycenter = 5)
    {'naif_id': 501, 'name': 'Io', 'type': 'satellite', 'parent': 5, 'segment_days': 0.5, 'order': 3, 'years': 30},
    {'naif_id': 502, 'name': 'Europa', 'type': 'satellite', 'parent': 5, 'segment_days': 0.5, 'order': 3, 'years': 30},
    {'naif_id': 503, 'name': 'Ganymede', 'type': 'satellite', 'parent': 5, 'segment_days': 0.5, 'order': 3, 'years': 30},
    {'naif_id': 504, 'name': 'Callisto', 'type': 'satellite', 'parent': 5, 'segment_days': 0.5, 'order': 3, 'years': 30},
    # Saturn satellites (parent is Saturn Barycenter = 6)
    {'naif_id': 606, 'name': 'Titan', 'type': 'satellite', 'parent': 6, 'segment_days': 1.0, 'order': 3, 'years': 30},
    {'naif_id': 605, 'name': 'Rhea', 'type': 'satellite', 'parent': 6, 'segment_days': 1.0, 'order': 3, 'years': 30},
    {'naif_id': 608, 'name': 'Iapetus', 'type': 'satellite', 'parent': 6, 'segment_days': 1.0, 'order': 3, 'years': 30},
    {'naif_id': 604, 'name': 'Dione', 'type': 'satellite', 'parent': 6, 'segment_days': 1.0, 'order': 3, 'years': 30},
    {'naif_id': 603, 'name': 'Tethys', 'type': 'satellite', 'parent': 6, 'segment_days': 1.0, 'order': 3, 'years': 30},
    {'naif_id': 602, 'name': 'Enceladus', 'type': 'satellite', 'parent': 6, 'segment_days': 1.0, 'order': 3, 'years': 30},
    {'naif_id': 601, 'name': 'Mimas', 'type': 'satellite', 'parent': 6, 'segment_days': 1.0, 'order': 3, 'years': 30},
    {'naif_id': 607, 'name': 'Hyperion', 'type': 'satellite', 'parent': 6, 'segment_days': 1.0, 'order': 3, 'years': 30},
    # Uranus satellites - skipped (kernel not available)
    # Neptune satellites (parent is Neptune Barycenter = 8)
    {'naif_id': 801, 'name': 'Triton', 'type': 'satellite', 'parent': 8, 'segment_days': 1.0, 'order': 3, 'years': 30},
]

def et_to_jd(et: float) -> float:
    """
    Convert ephemeris time (ET) to Julian Date (JD)
    
    Uses SPICE's precise conversion through UTC.
    
    Args:
        et: Ephemeris time (seconds past J2000)
    
    Returns:
        Julian Date
    """
    # Convert ET to UTC string with high precision
    utc_str = spice.et2utc(et, 'ISOC', 14)
    
    # Convert UTC back to ET to get TDB
    et_check = spice.str2et(utc_str)
    
    # Convert to JD using SPICE's precise method
    # JD = (ET / 86400) + 2451545.0 (J2000 epoch)
    jd = (et / 86400.0) + 2451545.0
    
    return jd


def validate_chebyshev_segment(segment: dict, config: dict, n_test_points: int = 20) -> Tuple[float, float]:
    """
    Validate Chebyshev polynomial segment accuracy.
    
    Tests the polynomial fit against SPICE data at multiple points within the segment.
    
    Args:
        segment: Segment dictionary with Chebyshev coefficients
        config: Body configuration
        n_test_points: Number of test points to evaluate
    
    Returns:
        Tuple of (max_error_km, max_error_degrees)
    """
    # Convert JD back to ET
    start_et = (segment['start_jd'] - 2451545.0) * 86400.0
    end_et = (segment['end_jd'] - 2451545.0) * 86400.0
    duration = end_et - start_et
    
    # Test at evenly spaced points
    test_times = np.linspace(start_et, end_et, n_test_points)
    
    max_error_km = 0.0
    max_error_deg = 0.0
    
    for t in test_times:
        # Get true position from SPICE
        try:
            # Use ECLIPJ2000 (ecliptic) frame
            true_state, _ = spice.spkez(config['naif_id'], t, 'ECLIPJ2000', 'NONE', 10)
            # Convert from km to AU
            true_pos = true_state[:3] * KM_TO_AU
        except:
            continue
        
        # Evaluate polynomial
        norm_t = 2 * (t - start_et) / duration - 1  # Normalize to [-1, 1]
        
        # Evaluate Chebyshev polynomials
        eval_x = np.polynomial.chebyshev.chebval(norm_t, segment['coeffs_x'])
        eval_y = np.polynomial.chebyshev.chebval(norm_t, segment['coeffs_y'])
        eval_z = np.polynomial.chebyshev.chebval(norm_t, segment['coeffs_z'])
        eval_pos = np.array([eval_x, eval_y, eval_z])
        
        # Calculate error (both in AU now)
        error_vec = eval_pos - true_pos
        error_au = np.linalg.norm(error_vec)
        error_km = error_au * 149597870.7  # Convert to km for display
        
        # Calculate angular error
        true_dist = np.linalg.norm(true_pos)
        if true_dist > 0:
            error_deg = np.degrees(np.arcsin(min(error_au / true_dist, 1.0)))
        else:
            error_deg = 0.0
        
        max_error_km = max(max_error_km, error_km)
        max_error_deg = max(max_error_deg, error_deg)
    
    return max_error_km, max_error_deg


def validate_hermite_segment(segment: dict, config: dict, n_test_points: int = 20) -> Tuple[float, float]:
    """
    Validate Hermite polynomial segment accuracy.
    
    Tests the Hermite interpolation against SPICE data at multiple points within the segment.
    
    Args:
        segment: Segment dictionary with Hermite endpoints
        config: Body configuration
        n_test_points: Number of test points to evaluate
    
    Returns:
        Tuple of (max_error_km, max_error_degrees)
    """
    # Convert JD back to ET
    start_et = (segment['start_jd'] - 2451545.0) * 86400.0
    end_et = (segment['end_jd'] - 2451545.0) * 86400.0
    duration_seconds = end_et - start_et
    duration_days = segment['end_jd'] - segment['start_jd']  # Duration in days for Hermite formula
    
    # Test at evenly spaced points
    test_times = np.linspace(start_et, end_et, n_test_points)
    
    max_error_km = 0.0
    max_error_deg = 0.0
    
    observer = config.get('parent', 10)
    
    for t in test_times:
        # Get true position from SPICE
        try:
            # Use ECLIPJ2000 (ecliptic) frame
            true_state, _ = spice.spkez(config['naif_id'], t, 'ECLIPJ2000', 'NONE', observer)
            # Convert from km to AU
            true_pos = true_state[:3] * KM_TO_AU
        except:
            continue
        
        # Evaluate Hermite polynomial
        norm_t = (t - start_et) / duration_seconds  # Normalize to [0, 1]
        
        # Hermite basis functions
        h00 = 2*norm_t**3 - 3*norm_t**2 + 1
        h10 = norm_t**3 - 2*norm_t**2 + norm_t
        h01 = -2*norm_t**3 + 3*norm_t**2
        h11 = norm_t**3 - norm_t**2
        
        # Interpolate position
        p0 = np.array(segment['start_pos'])
        v0 = np.array(segment['start_vel'])  # In AU/day
        p1 = np.array(segment['end_pos'])
        v1 = np.array(segment['end_vel'])  # In AU/day
        
        # Use duration in days to match velocity units (AU/day)
        eval_pos = h00*p0 + h10*duration_days*v0 + h01*p1 + h11*duration_days*v1
        
        # Calculate error (both in AU now)
        error_vec = eval_pos - true_pos
        error_au = np.linalg.norm(error_vec)
        error_km = error_au * 149597870.7  # Convert to km for display
        
        # Calculate angular error
        true_dist = np.linalg.norm(true_pos)
        if true_dist > 0:
            error_deg = np.degrees(np.arcsin(min(error_au / true_dist, 1.0)))
        else:
            error_deg = 0.0
        
        max_error_km = max(max_error_km, error_km)
        max_error_deg = max(max_error_deg, error_deg)
    
    return max_error_km, max_error_deg


def validate_segments(segments: List[dict], config: dict) -> dict:
    """
    Validate all segments for a body and return statistics.
    
    Args:
        segments: List of segment dictionaries
        config: Body configuration
    
    Returns:
        Dictionary with validation statistics
    """
    if not segments:
        return {
            'num_segments': 0,
            'max_error_km': 0.0,
            'max_error_deg': 0.0,
            'avg_error_km': 0.0,
            'avg_error_deg': 0.0,
            'all_finite': True
        }
    
    errors_km = []
    errors_deg = []
    all_finite = True
    
    for segment in segments:
        # Check if all coefficients are finite
        if segment['type'] == 'chebyshev':
            coeffs = np.concatenate([segment['coeffs_x'], segment['coeffs_y'], segment['coeffs_z']])
            if not np.all(np.isfinite(coeffs)):
                all_finite = False
                print(f"Warning: Non-finite coefficients in {config['name']} segment")
            
            # Validate accuracy
            max_err_km, max_err_deg = validate_chebyshev_segment(segment, config)
        else:  # hermite
            # Check if all values are finite
            values = np.concatenate([
                segment['start_pos'], segment['start_vel'],
                segment['end_pos'], segment['end_vel']
            ])
            if not np.all(np.isfinite(values)):
                all_finite = False
                print(f"Warning: Non-finite values in {config['name']} segment")
            
            # Validate accuracy
            max_err_km, max_err_deg = validate_hermite_segment(segment, config)
        
        errors_km.append(max_err_km)
        errors_deg.append(max_err_deg)
    
    return {
        'num_segments': len(segments),
        'max_error_km': max(errors_km) if errors_km else 0.0,
        'max_error_deg': max(errors_deg) if errors_deg else 0.0,
        'avg_error_km': np.mean(errors_km) if errors_km else 0.0,
        'avg_error_deg': np.mean(errors_deg) if errors_deg else 0.0,
        'all_finite': all_finite
    }



def jd_to_et(jd: float) -> float:
    """
    Convert Julian Date (JD) to ephemeris time (ET)
    
    Args:
        jd: Julian Date
    
    Returns:
        Ephemeris time (seconds past J2000)
    """
    # JD 2451545.0 = J2000.0 epoch
    et = (jd - 2451545.0) * 86400.0
    return et


# Base epoch: 2009-02-02 (JD 2454868.5)
BASE_EPOCH = '2009-02-02T00:00:00'


def load_kernels():
    """Load required SPICE kernels"""
    kernel_dir = os.path.join(os.path.dirname(__file__), '..', 'kernels')
    
    kernels = [
        'naif0012.tls',  # Leap seconds
        'de440.bsp',     # Planetary ephemeris
        'jup365.bsp',    # Jupiter satellites
        'sat441.bsp',    # Saturn satellites
        'ura116.bsp',    # Uranus satellites
        'nep097.bsp',    # Neptune satellites
    ]
    
    loaded_count = 0
    for kernel in kernels:
        kernel_path = os.path.join(kernel_dir, kernel)
        if os.path.exists(kernel_path):
            spice.furnsh(kernel_path)
            print(f"✓ Loaded kernel: {kernel}")
            loaded_count += 1
        else:
            print(f"✗ Warning: Kernel not found: {kernel_path}")
    
    if loaded_count == 0:
        print("\nError: No kernels loaded. Please run download_kernels.py first.")
        sys.exit(1)
    
    print(f"\nLoaded {loaded_count}/{len(kernels)} kernels")
    return loaded_count

def fit_chebyshev_segment(times: np.ndarray, positions: np.ndarray, order: int) -> np.ndarray:
    """
    Fit Chebyshev polynomial to position data
    
    Args:
        times: Normalized times in [-1, 1]
        positions: Position values (N,)
        order: Polynomial order
    
    Returns:
        Chebyshev coefficients (order+1,)
    """
    # Fit Chebyshev polynomial
    coeffs = np.polynomial.chebyshev.chebfit(times, positions, order)
    return coeffs


def create_hermite_segment(
    start_pos: np.ndarray,
    start_vel: np.ndarray,
    end_pos: np.ndarray,
    end_vel: np.ndarray
) -> Dict:
    """
    Create Hermite polynomial segment
    
    Args:
        start_pos: Start position (3,)
        start_vel: Start velocity (3,)
        end_pos: End position (3,)
        end_vel: End velocity (3,)
    
    Returns:
        Segment dictionary
    """
    return {
        'start_pos': start_pos,
        'start_vel': start_vel,
        'end_pos': end_pos,
        'end_vel': end_vel
    }


def generate_body_segments(config: Dict, start_et: float, end_et: float) -> List[Dict]:
    """
    Generate polynomial segments for a body
    
    Args:
        config: Body configuration
        start_et: Start ephemeris time
        end_et: End ephemeris time
    
    Returns:
        List of segment dictionaries
    """
    segments = []
    segment_duration = config['segment_days'] * 86400.0  # Convert to seconds
    
    current_et = start_et
    segment_count = 0
    
    while current_et < end_et:
        segment_end_et = min(current_et + segment_duration, end_et)
        
        if config['type'] == 'planet':
            # Chebyshev polynomial for planets
            # Sample at Chebyshev nodes for better accuracy
            order = config['order']
            n_samples = order + 1
            
            # Chebyshev nodes in [0, 1]
            nodes = 0.5 * (1 - np.cos(np.pi * np.arange(n_samples) / order))
            sample_times = current_et + nodes * segment_duration
            
            # Get positions at sample times
            positions = []
            for t in sample_times:
                try:
                    # Use ECLIPJ2000 (ecliptic) frame instead of J2000 (equatorial)
                    pos, _ = spice.spkez(config['naif_id'], t, 'ECLIPJ2000', 'NONE', 10)  # 10 = Sun
                    # Convert from km to AU
                    positions.append(pos[:3] * KM_TO_AU)  # Only position, not velocity
                except:
                    print(f"Warning: Failed to get position for {config['name']} at ET {t}")
                    continue
            
            if len(positions) < n_samples:
                print(f"Warning: Insufficient samples for segment, skipping")
                current_et = segment_end_et
                continue
            
            positions = np.array(positions)
            
            # Normalize times to [-1, 1]
            norm_times = 2 * nodes - 1
            
            # Fit Chebyshev polynomials for X, Y, Z
            coeffs_x = fit_chebyshev_segment(norm_times, positions[:, 0], order)
            coeffs_y = fit_chebyshev_segment(norm_times, positions[:, 1], order)
            coeffs_z = fit_chebyshev_segment(norm_times, positions[:, 2], order)
            
            # Convert ET to JD using precise conversion
            start_jd = et_to_jd(current_et)
            end_jd = et_to_jd(segment_end_et)
            
            segment = {
                'type': 'chebyshev',
                'body_id': config['naif_id'],
                'start_jd': start_jd,
                'end_jd': end_jd,
                'order': order,
                'coeffs_x': coeffs_x,
                'coeffs_y': coeffs_y,
                'coeffs_z': coeffs_z
            }
            
        else:
            # Hermite polynomial for satellites
            # Get position and velocity at endpoints
            try:
                observer = config.get('parent', 10)  # Parent planet or Sun
                
                # Use ECLIPJ2000 (ecliptic) frame instead of J2000 (equatorial)
                start_state, _ = spice.spkez(config['naif_id'], current_et, 'ECLIPJ2000', 'NONE', observer)
                end_state, _ = spice.spkez(config['naif_id'], segment_end_et, 'ECLIPJ2000', 'NONE', observer)
                
                # Convert from km to AU, and km/s to AU/day
                # SPICE returns velocity in km/s, we need AU/day for Hermite interpolation
                start_pos = start_state[:3] * KM_TO_AU
                start_vel = start_state[3:6] * KM_TO_AU * 86400.0  # km/s to AU/day
                end_pos = end_state[:3] * KM_TO_AU
                end_vel = end_state[3:6] * KM_TO_AU * 86400.0  # km/s to AU/day
                
                # Convert ET to JD using precise conversion
                start_jd = et_to_jd(current_et)
                end_jd = et_to_jd(segment_end_et)
                
                segment = {
                    'type': 'hermite',
                    'body_id': config['naif_id'],
                    'start_jd': start_jd,
                    'end_jd': end_jd,
                    'order': 3,
                    'start_pos': start_pos,
                    'start_vel': start_vel,
                    'end_pos': end_pos,
                    'end_vel': end_vel
                }
            except Exception as e:
                print(f"Warning: Failed to create Hermite segment for {config['name']}: {e}")
                current_et = segment_end_et
                continue
        
        segments.append(segment)
        segment_count += 1
        current_et = segment_end_et
    
    print(f"Generated {segment_count} segments for {config['name']}")
    return segments


def write_binary_file(filename: str, segments: List[Dict], config: Dict):
    """
    Write segments to binary file
    
    Args:
        filename: Output filename
        segments: List of segments
        config: Body configuration
    """
    with open(filename, 'wb') as f:
        # Write header (128 bytes)
        # Magic number (4 bytes)
        f.write(struct.pack('<I', MAGIC_NUMBER))
        
        # Version (2 bytes)
        f.write(struct.pack('<H', VERSION))
        
        # Number of bodies (2 bytes)
        f.write(struct.pack('<H', 1))
        
        # Number of segments (4 bytes)
        f.write(struct.pack('<I', len(segments)))
        
        # Start JD (8 bytes)
        f.write(struct.pack('<d', segments[0]['start_jd']))
        
        # End JD (8 bytes)
        f.write(struct.pack('<d', segments[-1]['end_jd']))
        
        # Reference frame (1 byte): 0 = heliocentric
        f.write(struct.pack('<B', 0))
        
        # Kernel versions (64 bytes)
        kernel_version = "DE440+JUP365".encode('utf-8')
        f.write(kernel_version + b'\x00' * (64 - len(kernel_version)))
        
        # Generation timestamp (8 bytes)
        f.write(struct.pack('<d', datetime.now().timestamp()))
        
        # Body IDs (4 bytes)
        f.write(struct.pack('<i', config['naif_id']))
        
        # Padding to 128 bytes
        current_pos = f.tell()
        padding = 128 - current_pos
        f.write(b'\x00' * padding)
        
        # Write segments
        for segment in segments:
            # Body ID (4 bytes)
            f.write(struct.pack('<i', segment['body_id']))
            
            # Segment type (1 byte): 1 = Chebyshev, 2 = Hermite
            seg_type = 1 if segment['type'] == 'chebyshev' else 2
            f.write(struct.pack('<B', seg_type))
            
            # Start JD (8 bytes)
            f.write(struct.pack('<d', segment['start_jd']))
            
            # End JD (8 bytes)
            f.write(struct.pack('<d', segment['end_jd']))
            
            if segment['type'] == 'chebyshev':
                # Order (1 byte)
                f.write(struct.pack('<B', segment['order']))
                
                # Coefficients X (order+1 * 8 bytes)
                for coeff in segment['coeffs_x']:
                    f.write(struct.pack('<d', coeff))
                
                # Coefficients Y
                for coeff in segment['coeffs_y']:
                    f.write(struct.pack('<d', coeff))
                
                # Coefficients Z
                for coeff in segment['coeffs_z']:
                    f.write(struct.pack('<d', coeff))
            
            else:  # Hermite
                # Start position (3 * 8 bytes)
                for val in segment['start_pos']:
                    f.write(struct.pack('<d', val))
                
                # Start velocity (3 * 8 bytes)
                for val in segment['start_vel']:
                    f.write(struct.pack('<d', val))
                
                # End position (3 * 8 bytes)
                for val in segment['end_pos']:
                    f.write(struct.pack('<d', val))
                
                # End velocity (3 * 8 bytes)
                for val in segment['end_vel']:
                    f.write(struct.pack('<d', val))
    
    # Compress with gzip
    with open(filename, 'rb') as f_in:
        with gzip.open(filename + '.gz', 'wb', compresslevel=9) as f_out:
            f_out.writelines(f_in)
    
    # Remove uncompressed file
    os.remove(filename)
    
    # Get file size
    file_size = os.path.getsize(filename + '.gz')
    print(f"Wrote {filename}.gz ({file_size} bytes, {len(segments)} segments)")


def main():
    parser = argparse.ArgumentParser(description='Generate all-bodies ephemeris data')
    parser.add_argument('--output-dir', default='../public/data/ephemeris',
                       help='Output directory for ephemeris files')
    parser.add_argument('--bodies', nargs='+', help='Specific bodies to generate (by name)')
    parser.add_argument('--validate', action='store_true', help='Validate polynomial fitting accuracy')
    
    args = parser.parse_args()
    
    # Create output directory
    output_dir = os.path.join(os.path.dirname(__file__), args.output_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    # Load SPICE kernels
    print("Loading SPICE kernels...")
    load_kernels()
    
    # Convert base epoch to ET
    base_et = spice.str2et(BASE_EPOCH)
    
    # Filter bodies if specified
    bodies_to_generate = BODY_CONFIGS
    if args.bodies:
        bodies_to_generate = [c for c in BODY_CONFIGS if c['name'] in args.bodies]
    
    # Statistics tracking
    total_segments = 0
    total_size = 0
    validation_results = []
    
    # Generate ephemeris for each body
    for config in bodies_to_generate:
        print(f"\nGenerating ephemeris for {config['name']}...")
        
        # Calculate time range
        years = config['years']
        end_et = base_et + years * 365.25 * 86400.0
        
        # Generate segments
        segments = generate_body_segments(config, base_et, end_et)
        
        if not segments:
            print(f"Warning: No segments generated for {config['name']}")
            continue
        
        # Validate segments if requested
        if args.validate:
            print(f"Validating {len(segments)} segments...")
            stats = validate_segments(segments, config)
            validation_results.append({
                'name': config['name'],
                'type': config['type'],
                'order': config['order'],
                **stats
            })
            
            # Print validation results
            print(f"  Segments: {stats['num_segments']}")
            print(f"  Max error: {stats['max_error_km']:.6f} km ({stats['max_error_deg']:.6f}°)")
            print(f"  Avg error: {stats['avg_error_km']:.6f} km ({stats['avg_error_deg']:.6f}°)")
            print(f"  All finite: {stats['all_finite']}")
            
            # Check accuracy targets
            if config['type'] == 'planet':
                target_deg = 0.1
            else:  # satellite
                target_deg = 0.01
            
            if stats['max_error_deg'] > target_deg:
                print(f"  WARNING: Max error {stats['max_error_deg']:.6f}° exceeds target {target_deg}°")
            else:
                print(f"  ✓ Accuracy meets target (<{target_deg}°)")
        
        # Write to file
        filename = os.path.join(output_dir, f"{config['name'].lower()}-ephemeris.bin")
        write_binary_file(filename, segments, config)
        
        # Track statistics
        total_segments += len(segments)
        file_size = os.path.getsize(filename + '.gz')
        total_size += file_size
    
    print("\n" + "="*60)
    print("Generation complete!")
    print("="*60)
    print(f"Total segments: {total_segments}")
    print(f"Total size: {total_size / 1024:.2f} KB ({total_size / (1024*1024):.2f} MB)")
    
    # Print validation summary
    if args.validate and validation_results:
        print("\n" + "="*60)
        print("Validation Summary")
        print("="*60)
        print(f"{'Body':<15} {'Type':<10} {'Order':<6} {'Segments':<10} {'Max Error (°)':<15} {'Status':<10}")
        print("-"*60)
        
        for result in validation_results:
            target_deg = 0.1 if result['type'] == 'planet' else 0.01
            status = "✓ PASS" if result['max_error_deg'] <= target_deg else "✗ FAIL"
            
            print(f"{result['name']:<15} {result['type']:<10} {result['order']:<6} "
                  f"{result['num_segments']:<10} {result['max_error_deg']:<15.6f} {status:<10}")
        
        # Check if all passed
        all_passed = all(
            r['max_error_deg'] <= (0.1 if r['type'] == 'planet' else 0.01)
            for r in validation_results
        )
        
        print("-"*60)
        if all_passed:
            print("✓ All bodies meet accuracy targets")
        else:
            print("✗ Some bodies exceed accuracy targets")
        
        # Check finite values
        all_finite = all(r['all_finite'] for r in validation_results)
        if all_finite:
            print("✓ All coefficients are finite")
        else:
            print("✗ Some coefficients are non-finite")
    
    # Unload kernels
    spice.kclear()


if __name__ == '__main__':
    main()
