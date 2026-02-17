#!/usr/bin/env python3
"""
Generate Manifest File for Ephemeris Data

This script scans the ephemeris data directory and generates a manifest.json file
listing all available data chunks with their metadata.

Requirements: 3.12
"""

import os
import json
import hashlib
import gzip
import struct
from datetime import datetime
from typing import List, Dict

def calculate_sha256(filepath: str) -> str:
    """Calculate SHA256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return f"sha256:{sha256_hash.hexdigest()}"


def parse_ephemeris_file(filepath: str) -> Dict:
    """
    Parse ephemeris file header to extract metadata.
    
    Returns:
        Dictionary with file metadata
    """
    # Decompress if needed
    if filepath.endswith('.gz'):
        with gzip.open(filepath, 'rb') as f:
            data = f.read()
    else:
        with open(filepath, 'rb') as f:
            data = f.read()
    
    # Parse header
    offset = 0
    
    # Magic number (4 bytes)
    magic = struct.unpack('<I', data[offset:offset+4])[0]
    offset += 4
    
    if magic != 0x4A55504D:  # "JUPM"
        raise ValueError(f"Invalid magic number: {hex(magic)}")
    
    # Version (2 bytes)
    version = struct.unpack('<H', data[offset:offset+2])[0]
    offset += 2
    
    # Number of bodies (2 bytes)
    num_bodies = struct.unpack('<H', data[offset:offset+2])[0]
    offset += 2
    
    # Number of segments (4 bytes)
    num_segments = struct.unpack('<I', data[offset:offset+4])[0]
    offset += 4
    
    # Start JD (8 bytes)
    start_jd = struct.unpack('<d', data[offset:offset+8])[0]
    offset += 8
    
    # End JD (8 bytes)
    end_jd = struct.unpack('<d', data[offset:offset+8])[0]
    offset += 8
    
    # Reference frame (1 byte)
    ref_frame = struct.unpack('<B', data[offset:offset+1])[0]
    offset += 1
    
    # SPICE kernel version (64 bytes string)
    kernel_version = data[offset:offset+64].decode('utf-8').rstrip('\x00')
    offset += 64
    
    # Generation timestamp (8 bytes)
    gen_timestamp = struct.unpack('<d', data[offset:offset+8])[0]
    offset += 8
    
    # Skip reserved bytes (27 bytes)
    offset += 27
    
    # Parse segments to get body IDs
    body_ids = set()
    for _ in range(num_segments):
        # Body ID (4 bytes)
        body_id = struct.unpack('<i', data[offset:offset+4])[0]
        body_ids.add(body_id)
        offset += 4
        
        # Segment type (1 byte)
        seg_type = struct.unpack('<B', data[offset:offset+1])[0]
        offset += 1
        
        # Start JD (8 bytes)
        offset += 8
        
        # End JD (8 bytes)
        offset += 8
        
        if seg_type == 1:  # Chebyshev
            # Order (1 byte)
            order = struct.unpack('<B', data[offset:offset+1])[0]
            offset += 1
            
            # Coefficients (3 * (order+1) * 8 bytes)
            n_coeffs = order + 1
            offset += 3 * n_coeffs * 8
        elif seg_type == 2:  # Hermite
            # Start position (3 * 8 bytes)
            offset += 3 * 8
            
            # Start velocity (3 * 8 bytes)
            offset += 3 * 8
            
            # End position (3 * 8 bytes)
            offset += 3 * 8
            
            # End velocity (3 * 8 bytes)
            offset += 3 * 8
    
    return {
        'version': version,
        'num_bodies': num_bodies,
        'num_segments': num_segments,
        'start_jd': start_jd,
        'end_jd': end_jd,
        'bodies': sorted(list(body_ids)),
        'kernel_version': kernel_version
    }


def generate_manifest(data_dir: str, output_file: str):
    """
    Generate manifest.json file for all ephemeris data in directory.
    
    Args:
        data_dir: Directory containing ephemeris files
        output_file: Path to output manifest.json
    """
    chunks = []
    
    # Scan directory for .bin.gz files
    for filename in sorted(os.listdir(data_dir)):
        if not filename.endswith('.bin.gz'):
            continue
        
        filepath = os.path.join(data_dir, filename)
        
        print(f"Processing {filename}...")
        
        try:
            # Parse file metadata
            metadata = parse_ephemeris_file(filepath)
            
            # Get file size
            file_size = os.path.getsize(filepath)
            
            # Calculate checksum
            checksum = calculate_sha256(filepath)
            
            # Create chunk entry
            chunk = {
                'file': filename,
                'bodies': metadata['bodies'],
                'timeRange': {
                    'start': metadata['start_jd'],
                    'end': metadata['end_jd']
                },
                'size': file_size,
                'checksum': checksum
            }
            
            chunks.append(chunk)
            
            print(f"  Bodies: {metadata['bodies']}")
            print(f"  Time range: {metadata['start_jd']:.1f} - {metadata['end_jd']:.1f}")
            print(f"  Size: {file_size} bytes")
            print(f"  Segments: {metadata['num_segments']}")
            
        except Exception as e:
            print(f"  Error: {e}")
            continue
    
    # Create manifest
    manifest = {
        'version': 2,
        'generationDate': datetime.utcnow().isoformat() + 'Z',
        'spiceKernels': {
            'planets': 'DE440',
            'jupiter': 'JUP365',
            'saturn': 'SAT441',
            'uranus': 'URA111',
            'neptune': 'NEP097'
        },
        'chunks': chunks
    }
    
    # Write manifest
    with open(output_file, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\nManifest written to {output_file}")
    print(f"Total chunks: {len(chunks)}")
    
    # Calculate total size
    total_size = sum(c['size'] for c in chunks)
    print(f"Total size: {total_size / 1024:.2f} KB ({total_size / (1024*1024):.2f} MB)")
    
    # Check size constraints
    if total_size > 5 * 1024 * 1024:
        print(f"WARNING: Total size {total_size / (1024*1024):.2f} MB exceeds 5 MB target")
    else:
        print(f"✓ Total size within 5 MB target")
    
    # Check individual chunk sizes
    large_chunks = [c for c in chunks if c['size'] > 100 * 1024]
    if large_chunks:
        print(f"WARNING: {len(large_chunks)} chunks exceed 100 KB:")
        for c in large_chunks:
            print(f"  {c['file']}: {c['size'] / 1024:.2f} KB")
    else:
        print(f"✓ All chunks under 100 KB")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate manifest.json for ephemeris data')
    parser.add_argument('--data-dir', default='../public/data/ephemeris',
                       help='Directory containing ephemeris files')
    parser.add_argument('--output', default='../public/data/ephemeris/manifest.json',
                       help='Output manifest file path')
    
    args = parser.parse_args()
    
    data_dir = os.path.join(os.path.dirname(__file__), args.data_dir)
    output_file = os.path.join(os.path.dirname(__file__), args.output)
    
    if not os.path.exists(data_dir):
        print(f"Error: Data directory not found: {data_dir}")
        return 1
    
    generate_manifest(data_dir, output_file)
    return 0


if __name__ == '__main__':
    exit(main())
