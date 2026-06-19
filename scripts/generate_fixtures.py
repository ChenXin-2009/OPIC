#!/usr/bin/env python3
"""
Generate coordinate transformation fixtures for OPIC from Astropy.

This script generates verified transformation matrices and test vectors
for the OPIC coordinate frame system, to be used as ground truth in
regression tests.

Generated fixtures:
  1. Galactic transformation matrix (ICRS <-> Galactic, IAU 1958)
  2. Supergalactic transformation matrix (ICRS <-> Supergalactic, de Vaucouleurs)
  3. Known-point test vectors (Galactic center, supergalactic pole, etc.)

Usage:
  python scripts/generate_fixtures.py [--output src/lib/coordinates/fixtures/]

Requires: astropy, numpy
"""

import json
import os
import sys
from pathlib import Path

import numpy as np
from astropy.coordinates import (
    SkyCoord,
    Galactic,
    Supergalactic,
    ICRS,
    CartesianRepresentation,
    CartesianDifferential,
)
from astropy import units as u

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "src" / "lib" / "coordinates" / "fixtures"


def get_rotation_matrix(from_frame_name, to_frame_name):
    """Extract the 3x3 rotation matrix that transforms coordinates FROM from_frame TO to_frame.
    
    Each row i of the result gives the to_frame Cartesian components
    of the i-th basis vector of from_frame.
    """
    vecs = []
    for axis in range(3):
        data = np.zeros(3)
        data[axis] = 1.0
        cart = CartesianRepresentation(data * u.kpc)
        coord = SkyCoord(from_frame_name(cart))
        transformed = coord.transform_to(to_frame_name)
        vecs.append(
            [float(transformed.cartesian.x.to(u.kpc).value),
             float(transformed.cartesian.y.to(u.kpc).value),
             float(transformed.cartesian.z.to(u.kpc).value)]
        )
    M = np.array(vecs)
    return M


def get_rotation_matrix_inverse(from_frame_name, to_frame_name):
    """M where M @ v_from = v_to. 
    This is the transpose of get_rotation_matrix for orthogonal matrices.
    """
    return get_rotation_matrix(from_frame_name, to_frame_name).T


def matrix_to_json(M):
    """Convert numpy matrix to nested list for JSON serialization."""
    return [[float(M[i, j]) for j in range(3)] for i in range(3)]


def compute_all_matrices():
    """Compute all transformation matrices using Astropy.
    
    Note on naming convention:
    get_rotation_matrix(ICRS, Galactic) returns rows where row[i] = 
    Galactic Cartesian components of ICRS basis vector i.
    This means the matrix directly maps ICRS vectors to Galactic vectors
    via dot product with each row.
    
    However, Astropy convention stores the result such that:
    - "icrs_to_galactic" rows = Galactic coords of ICRS axes
    - "galactic_to_icrs" = transpose (ICRS coords of Galactic axes)
    
    For OPIC, the "galactic_to_icrs" field actually corresponds to 
    the ICRS→Galactic transform when used as row-vector multiplication.
    See the docs and comments TS files for the correct convention.
    """
    results = {}

    # get_rotation_matrix returns M where M[i] = Galactic coords of ICRS axis i
    # This IS the ICRS → Galactic matrix (v_gal = M × v_icrs, row dot product)
    M_icrs_to_gal = get_rotation_matrix(ICRS, Galactic)
    M_gal_to_icrs = M_icrs_to_gal.T  # orthogonal matrix

    results["icrs_to_galactic"] = matrix_to_json(M_icrs_to_gal)
    results["galactic_to_icrs"] = matrix_to_json(M_gal_to_icrs)

    # --- ICRS <-> Supergalactic ---
    M_icrs_to_sgl = get_rotation_matrix(ICRS, Supergalactic)
    M_sgl_to_icrs = M_icrs_to_sgl.T

    results["icrs_to_supergalactic"] = matrix_to_json(M_icrs_to_sgl)
    results["supergalactic_to_icrs"] = matrix_to_json(M_sgl_to_icrs)

    return results


def compute_test_vectors():
    """Generate known-point test vectors for verification."""
    vectors = {}

    # Galactic center (Sgr A*)
    sgr_a = SkyCoord(ra=266.4168 * u.deg, dec=-29.0078 * u.deg,
                     distance=8.27 * u.kpc, frame='icrs')
    sgr_a_gal = sgr_a.transform_to(Galactic)

    vectors["galactic_center"] = {
        "icrs": {"ra_deg": 266.4168, "dec_deg": -29.0078, "distance_kpc": 8.27},
        "galactic": {
            "l_deg": round(float(sgr_a_gal.l.deg), 6),
            "b_deg": round(float(sgr_a_gal.b.deg), 6),
            "distance_kpc": 8.27,
        },
        # ICRS Cartesian (using 1 kpc unit)
        "icrs_cartesian_1kpc": {
            "x": round(float(np.cos(np.radians(-29.0078)) * np.cos(np.radians(266.4168))), 10),
            "y": round(float(np.cos(np.radians(-29.0078)) * np.sin(np.radians(266.4168))), 10),
            "z": round(float(np.sin(np.radians(-29.0078))), 10),
        }
    }

    # Supergalactic north pole in ICRS
    sgl_pole = SkyCoord(ra=283.75 * u.deg, dec=15.7 * u.deg, frame='icrs')
    sgl_pole_sg = sgl_pole.transform_to(Supergalactic)

    vectors["supergalactic_north_pole"] = {
        "icrs": {"ra_deg": 283.75, "dec_deg": 15.7},
        # In supergalactic, the north pole should be at SGB = 90 deg
        "supergalactic": {
            "sgl_deg": round(float(sgl_pole_sg.sgl.deg), 6),
            "sgb_deg": round(float(sgl_pole_sg.sgb.deg), 6),
        }
    }

    # Vernal equinox (ICRS +X axis) in various frames
    vernal = SkyCoord(ra=0 * u.deg, dec=0 * u.deg, distance=1 * u.kpc, frame='icrs')
    vernal_gal = vernal.transform_to(Galactic)
    vernal_sgl = vernal.transform_to(Supergalactic)

    vectors["vernal_equinox_1kpc"] = {
        "icrs": {"ra_deg": 0, "dec_deg": 0, "distance_kpc": 1},
        "galactic": {
            "l_deg": round(float(vernal_gal.l.deg), 6),
            "b_deg": round(float(vernal_gal.b.deg), 6),
        },
        "supergalactic": {
            "sgl_deg": round(float(vernal_sgl.sgl.deg), 6),
            "sgb_deg": round(float(vernal_sgl.sgb.deg), 6),
        }
    }

    # M31 (Andromeda) — known test case
    m31 = SkyCoord(ra=10.6847 * u.deg, dec=41.2692 * u.deg,
                   distance=0.778 * u.Mpc, frame='icrs')
    m31_gal = m31.transform_to(Galactic)
    m31_sgl = m31.transform_to(Supergalactic)

    vectors["m31_andromeda"] = {
        "icrs": {"ra_deg": 10.6847, "dec_deg": 41.2692, "distance_mpc": 0.778},
        "galactic": {
            "l_deg": round(float(m31_gal.l.deg), 6),
            "b_deg": round(float(m31_gal.b.deg), 6),
        },
        "supergalactic": {
            "sgl_deg": round(float(m31_sgl.sgl.deg), 6),
            "sgb_deg": round(float(m31_sgl.sgb.deg), 6),
        }
    }

    return vectors


def main():
    output_dir = OUTPUT_DIR
    if len(sys.argv) > 1 and sys.argv[1] == "--output" and len(sys.argv) > 2:
        output_dir = Path(sys.argv[2])

    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate matrices
    print("Computing transformation matrices from Astropy...")
    matrices = compute_all_matrices()

    matrix_path = output_dir / "astropy-frames.json"
    with open(matrix_path, 'w') as f:
        json.dump(matrices, f, indent=2)
    print(f"  -> {matrix_path}")

    # Generate test vectors
    print("Computing test vectors...")
    vectors = compute_test_vectors()

    vector_path = output_dir / "astropy-test-vectors.json"
    with open(vector_path, 'w') as f:
        json.dump(vectors, f, indent=2)
    print(f"  -> {vector_path}")

    # Print summary
    print("\n=== Matrix Verification ===")
    for name, M in matrices.items():
        print(f"\n{name}:")
        for row in M:
            print(f"  [{row[0]:.15f}, {row[1]:.15f}, {row[2]:.15f}]")
        # Verify orthogonality
        M_np = np.array(M)
        ident = M_np @ M_np.T
        max_err = np.max(np.abs(ident - np.eye(3)))
        print(f"  Orthogonality check: max|M·Mᵀ - I| = {max_err:.2e}")

    print(f"\nDone. Fixtures written to {output_dir}")


if __name__ == "__main__":
    main()
