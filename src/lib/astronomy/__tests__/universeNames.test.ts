import {
  LOCAL_GROUP_NAMES, NEARBY_GROUPS_NAMES, VIRGO_SUPERCLUSTER_NAMES,
  LANIAKEA_SUPERCLUSTER_NAMES, NEARBY_SUPERCLUSTER_NAMES,
  getChineseName,
} from '../universeNames';

describe('universeNames data', () => {
  it('should export LOCAL_GROUP_NAMES with known galaxies', () => {
    expect(LOCAL_GROUP_NAMES['Milky Way']).toBe('银河系');
    expect(LOCAL_GROUP_NAMES['Andromeda']).toBe('仙女座星系');
  });

  it('should export NEARBY_GROUPS_NAMES with known groups', () => {
    expect(NEARBY_GROUPS_NAMES['M81 Group']).toContain('M81');
  });

  it('should export VIRGO_SUPERCLUSTER_NAMES', () => {
    expect(VIRGO_SUPERCLUSTER_NAMES['Virgo Cluster']).toBe('室女座星系团');
  });

  it('should export LANIAKEA_SUPERCLUSTER_NAMES', () => {
    expect(LANIAKEA_SUPERCLUSTER_NAMES['Laniakea Supercluster']).toContain('拉尼亚凯亚');
  });

  it('should export NEARBY_SUPERCLUSTER_NAMES', () => {
    expect(NEARBY_SUPERCLUSTER_NAMES['Shapley Supercluster']).toContain('沙普利');
  });
});

describe('getChineseName', () => {
  it('should return known name from local-group', () => {
    expect(getChineseName('Milky Way', 'local-group')).toBe('银河系');
  });

  it('should return known name from nearby-groups', () => {
    expect(getChineseName('Sculptor Group', 'nearby-groups')).toBe('玉夫座星系群');
  });

  it('should return known name from virgo-supercluster', () => {
    expect(getChineseName('Fornax Cluster', 'virgo-supercluster')).toBe('天炉座星系团');
  });

  it('should return known name from laniakea', () => {
    expect(getChineseName('Virgo Supercluster', 'laniakea')).toContain('室女座');
  });

  it('should return known name from nearby-supercluster', () => {
    expect(getChineseName('Perseus-Pisces', 'nearby-supercluster')).toContain('英仙');
  });

  it('should handle M object group pattern', () => {
    const result = getChineseName('M99 Group', 'nearby-groups');
    expect(result).toBe('M99 星系群');
  });

  it('should handle NGC group pattern', () => {
    const result = getChineseName('NGC 1234 Group', 'nearby-groups');
    expect(result).toBe('NGC 1234 星系群');
  });

  it('should handle IC group pattern', () => {
    const result = getChineseName('IC 5678 Group', 'nearby-groups');
    expect(result).toBe('IC 5678 星系群');
  });

  it('should handle positional group pattern', () => {
    const result = getChineseName('Group SGX10', 'nearby-groups');
    expect(result).toBe('星系群 SGX10');
  });

  it('should handle directional cluster with distance', () => {
    const result = getChineseName('East Cluster 20Mpc', 'virgo-supercluster');
    expect(result).toBe('东侧星系团 20Mpc');
  });

  it('should handle all direction variations', () => {
    expect(getChineseName('West Cluster 10Mpc', 'virgo-supercluster')).toBe('西侧星系团 10Mpc');
    expect(getChineseName('North Cluster 5Mpc', 'virgo-supercluster')).toBe('北侧星系团 5Mpc');
    expect(getChineseName('South Cluster 8Mpc', 'virgo-supercluster')).toBe('南侧星系团 8Mpc');
    expect(getChineseName('Upper Cluster 3Mpc', 'virgo-supercluster')).toBe('上方星系团 3Mpc');
    expect(getChineseName('Lower Cluster 15Mpc', 'virgo-supercluster')).toBe('下方星系团 15Mpc');
  });

  it('should return original name for unknown scale', () => {
    const result = getChineseName('Test' as any, 'unknown' as any);
    expect(result).toBe('Test');
  });

  it('should return original name for unmapped entry', () => {
    const result = getChineseName('Unknown Object XYZ', 'local-group');
    expect(result).toBe('Unknown Object XYZ');
  });
});
