#!/usr/bin/env python3
"""
Verify new time ranges
"""

from datetime import datetime

def jd_to_date(jd):
    """Convert Julian Date to Gregorian date"""
    unix_time = (jd - 2440587.5) * 86400
    return datetime.utcfromtimestamp(unix_time)

# New ranges
new_start = 2454864.500766028
new_end = 2491599.500766028

print("New time ranges (100 years):")
print("="*60)
print(f"Start: JD {new_start} = {jd_to_date(new_start)}")
print(f"End:   JD {new_end} = {jd_to_date(new_end)}")
print(f"Duration: {(new_end - new_start) / 365.25:.1f} years")
print()

# Check 2074
date_2074 = datetime(2074, 1, 1)
jd_2074 = (date_2074 - datetime(1970, 1, 1)).total_seconds() / 86400 + 2440587.5
print(f"2074-01-01: JD {jd_2074}")
print(f"  Is within range? {new_start <= jd_2074 <= new_end}")
print()

# Check 2109
date_2109 = datetime(2109, 1, 1)
jd_2109 = (date_2109 - datetime(1970, 1, 1)).total_seconds() / 86400 + 2440587.5
print(f"2109-01-01: JD {jd_2109}")
print(f"  Is within range? {new_start <= jd_2109 <= new_end}")
