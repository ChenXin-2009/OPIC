#!/usr/bin/env python3
"""
Download SPICE kernels required for ephemeris generation
"""

import urllib.request
import os
import sys

KERNELS = [
    {
        'name': 'naif0012.tls',
        'url': 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls',
        'size': '~5 KB',
        'description': 'Leap seconds kernel'
    },
    {
        'name': 'de440.bsp',
        'url': 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440.bsp',
        'size': '~114 MB',
        'description': 'Planetary ephemeris (1550-2650)'
    },
    {
        'name': 'jup365.bsp',
        'url': 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/jup365.bsp',
        'size': '~17 MB',
        'description': 'Jupiter satellites ephemeris'
    },
    {
        'name': 'sat441.bsp',
        'url': 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/sat441.bsp',
        'size': '~50 MB',
        'description': 'Saturn satellites ephemeris'
    },
    {
        'name': 'ura116.bsp',
        'url': 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/ura116.bsp',
        'size': '~8 MB',
        'description': 'Uranus satellites ephemeris'
    },
    {
        'name': 'nep097.bsp',
        'url': 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/nep097.bsp',
        'size': '~3 MB',
        'description': 'Neptune satellites ephemeris'
    }
]

def download_file(url, dest_path):
    """Download a file with progress indication"""
    print(f"Downloading {os.path.basename(dest_path)}...")
    
    def reporthook(count, block_size, total_size):
        if total_size > 0:
            percent = int(count * block_size * 100 / total_size)
            mb_downloaded = count * block_size / (1024 * 1024)
            mb_total = total_size / (1024 * 1024)
            sys.stdout.write(f"\r  Progress: {percent}% ({mb_downloaded:.1f}/{mb_total:.1f} MB)")
            sys.stdout.flush()
    
    try:
        urllib.request.urlretrieve(url, dest_path, reporthook)
        print("\n  ✓ Complete")
        return True
    except Exception as e:
        print(f"\n  ✗ Error: {e}")
        return False

def main():
    kernel_dir = './kernels'
    os.makedirs(kernel_dir, exist_ok=True)
    
    print("SPICE Kernel Downloader")
    print("=" * 50)
    print("\nThis will download the following files:")
    for kernel in KERNELS:
        print(f"  - {kernel['name']} ({kernel['size']}) - {kernel['description']}")
    print()
    print(f"Total download size: ~192 MB")
    print()
    
    success_count = 0
    for kernel in KERNELS:
        dest_path = os.path.join(kernel_dir, kernel['name'])
        
        # Skip if already exists
        if os.path.exists(dest_path):
            print(f"✓ {kernel['name']} already exists, skipping")
            success_count += 1
            continue
        
        if download_file(kernel['url'], dest_path):
            success_count += 1
        print()
    
    print("=" * 50)
    if success_count == len(KERNELS):
        print("✓ All kernels downloaded successfully!")
        return 0
    else:
        print(f"✗ Downloaded {success_count}/{len(KERNELS)} kernels")
        return 1

if __name__ == '__main__':
    exit(main())
