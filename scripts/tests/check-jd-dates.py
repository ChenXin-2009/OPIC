#!/usr/bin/env python3
"""
Check JD to date conversion
"""

from datetime import datetime, timedelta

def jd_to_date(jd):
    """Convert Julian Date to Gregorian date"""
    # JD 2440587.5 = 1970-01-01 00:00:00 UTC
    unix_time = (jd - 2440587.5) * 86400
    return datetime.utcfromtimestamp(unix_time)

# Check time ranges from manifest
print("Time ranges from manifest:")
print("="*60)

# Earth/Moon range
earth_start = 2454864.500766028
earth_end = 2473127.000766028
print(f"Earth/Moon:")
print(f"  Start: JD {earth_start} = {jd_to_date(earth_start)}")
print(f"  End:   JD {earth_end} = {jd_to_date(earth_end)}")
print(f"  Duration: {(earth_end - earth_start) / 365.25:.1f} years")
print()

# Other bodies range
other_start = 2454864.500766028
other_end = 2465822.000766028
print(f"Other bodies:")
print(f"  Start: JD {other_start} = {jd_to_date(other_start)}")
print(f"  End:   JD {other_end} = {jd_to_date(other_end)}")
print(f"  Duration: {(other_end - other_start) / 365.25:.1f} years")
print()

# Check 2074
date_2074 = datetime(2074, 1, 1)
jd_2074 = (date_2074 - datetime(1970, 1, 1)).total_seconds() / 86400 + 2440587.5
print(f"2074-01-01: JD {jd_2074}")
print(f"  Is within Earth range? {earth_start <= jd_2074 <= earth_end}")
print(f"  Is within other range? {other_start <= jd_2074 <= other_end}")
