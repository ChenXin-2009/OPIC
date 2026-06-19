/**
 * 宇宙数据解析器
 *
 * 将宇宙尺度二进制数据解析为 JavaScript 对象。
 * 所有函数为纯函数，不依赖类实例。
 */

const textDecoder = new TextDecoder();

/**
 * 解析本星系群数据
 */
export function parseLocalGroupData(buffer: ArrayBuffer): any[] {
  const view = new DataView(buffer);
  let offset = 0;

  // 读取名称表
  const nameTableSize = view.getUint16(offset, true);
  offset += 2;

  const nameTable: string[] = [];
  for (let i = 0; i < nameTableSize; i++) {
    const nameLength = view.getUint8(offset);
    offset += 1;

    const nameBytes = new Uint8Array(buffer, offset, nameLength);
    const name = textDecoder.decode(nameBytes);
    nameTable.push(name);
    offset += nameLength;
  }

  // 读取星系数量
  const galaxyCount = view.getUint16(offset, true);
  offset += 2;

  // 预分配数组容量
  const galaxies: any[] = new Array(galaxyCount);
  for (let i = 0; i < galaxyCount; i++) {
    const x = view.getFloat32(offset, true);
    offset += 4;
    const y = view.getFloat32(offset, true);
    offset += 4;
    const z = view.getFloat32(offset, true);
    offset += 4;

    const brightness = view.getUint8(offset) / 255.0;
    offset += 1;
    const type = view.getUint8(offset);
    offset += 1;
    const nameIndex = view.getUint8(offset);
    offset += 1;
    const colorIndex = view.getUint8(offset);
    offset += 1;

    // 颜色映射
    const colors = [0xffffff, 0xffffaa, 0xaaaaff, 0xffaaaa];
    const color = colors[colorIndex] || 0xffffff;

    // 根据类型设置半径
    const radiusMap = [0.012, 0.008, 0.004, 0.001]; // Mpc
    const radius = radiusMap[type] || 0.002;

    galaxies[i] = {
      name: nameTable[nameIndex] || `Galaxy ${i}`,
      x,
      y,
      z,
      type,
      brightness,
      color,
      radius,
    };
  }

  return galaxies;
}

/**
 * 解析近邻星系群数据
 */
export function parseNearbyGroupsData(buffer: ArrayBuffer): { groups: any[], galaxies: any[] } {
  const view = new DataView(buffer);
  let offset = 0;

  // 读取名称表
  const nameTableSize = view.getUint16(offset, true);
  offset += 2;

  const nameTable: string[] = [];
  for (let i = 0; i < nameTableSize; i++) {
    const nameLength = view.getUint8(offset);
    offset += 1;

    const nameBytes = new Uint8Array(buffer, offset, nameLength);
    const name = textDecoder.decode(nameBytes);
    nameTable.push(name);
    offset += nameLength;
  }

  // 读取星系群数量
  const groupCount = view.getUint16(offset, true);
  offset += 2;

  // 预分配数组容量
  const groups: any[] = new Array(groupCount);
  const allGalaxies: any[] = [];

  for (let i = 0; i < groupCount; i++) {
    const centerX = view.getFloat32(offset, true);
    offset += 4;
    const centerY = view.getFloat32(offset, true);
    offset += 4;
    const centerZ = view.getFloat32(offset, true);
    offset += 4;
    const radius = view.getFloat32(offset, true);
    offset += 4;
    const memberCount = view.getUint16(offset, true);
    offset += 2;
    const richness = view.getUint8(offset);
    offset += 1;
    const nameIndex = view.getUint8(offset);
    offset += 1;

    // 预分配成员星系数组
    const galaxies: any[] = new Array(memberCount);
    for (let j = 0; j < memberCount; j++) {
      const x = view.getFloat32(offset, true);
      offset += 4;
      const y = view.getFloat32(offset, true);
      offset += 4;
      const z = view.getFloat32(offset, true);
      offset += 4;

      galaxies[j] = { x, y, z, brightness: 1.0 };
      allGalaxies.push(galaxies[j]);
    }

    groups[i] = {
      name: nameTable[nameIndex] || `Group ${i}`,
      centerX,
      centerY,
      centerZ,
      radius,
      memberCount,
      richness,
      galaxies,
    };
  }

  return { groups, galaxies: allGalaxies };
}

/**
 * 解析室女座超星系团数据
 */
export function parseVirgoSuperclusterData(buffer: ArrayBuffer): { clusters: any[], galaxies: any[] } {
  const view = new DataView(buffer);
  let offset = 0;

  // 读取名称表
  const nameTableSize = view.getUint16(offset, true);
  offset += 2;

  const nameTable: string[] = [];
  for (let i = 0; i < nameTableSize; i++) {
    const nameLength = view.getUint8(offset);
    offset += 1;

    const nameBytes = new Uint8Array(buffer, offset, nameLength);
    const name = textDecoder.decode(nameBytes);
    nameTable.push(name);
    offset += nameLength;
  }

  // 读取星系团数量
  const clusterCount = view.getUint16(offset, true);
  offset += 2;

  // 预分配数组容量
  const clusters: any[] = new Array(clusterCount);
  const allGalaxies: any[] = [];

  for (let i = 0; i < clusterCount; i++) {
    const centerX = view.getFloat32(offset, true);
    offset += 4;
    const centerY = view.getFloat32(offset, true);
    offset += 4;
    const centerZ = view.getFloat32(offset, true);
    offset += 4;
    const radius = view.getFloat32(offset, true);
    offset += 4;
    const memberCount = view.getUint16(offset, true);
    offset += 2;
    const richness = view.getUint8(offset);
    offset += 1;
    const nameIndex = view.getUint8(offset);
    offset += 1;

    // 预分配成员星系数组
    const galaxies: any[] = new Array(memberCount);
    for (let j = 0; j < memberCount; j++) {
      const x = view.getFloat32(offset, true);
      offset += 4;
      const y = view.getFloat32(offset, true);
      offset += 4;
      const z = view.getFloat32(offset, true);
      offset += 4;

      galaxies[j] = { x, y, z, brightness: 1.0 };
      allGalaxies.push(galaxies[j]);
    }

    clusters[i] = {
      name: nameTable[nameIndex] || `Cluster ${i}`,
      centerX,
      centerY,
      centerZ,
      radius,
      memberCount,
      richness,
      galaxies,
    };
  }

  return { clusters, galaxies: allGalaxies };
}

/**
 * 解析拉尼亚凯亚超星系团数据
 */
export function parseLaniakeaData(buffer: ArrayBuffer): { superclusters: any[], galaxies: any[] } {
  const view = new DataView(buffer);
  let offset = 0;

  // 读取名称表
  const nameTableSize = view.getUint16(offset, true);
  offset += 2;

  const nameTable: string[] = [];
  for (let i = 0; i < nameTableSize; i++) {
    const nameLength = view.getUint8(offset);
    offset += 1;

    const nameBytes = new Uint8Array(buffer, offset, nameLength);
    const name = textDecoder.decode(nameBytes);
    nameTable.push(name);
    offset += nameLength;
  }

  // 读取超星系团数量
  const superclusterCount = view.getUint16(offset, true);
  offset += 2;

  // 预分配数组容量
  const superclusters: any[] = new Array(superclusterCount);
  const allGalaxies: any[] = [];

  for (let i = 0; i < superclusterCount; i++) {
    const centerX = view.getFloat32(offset, true);
    offset += 4;
    const centerY = view.getFloat32(offset, true);
    offset += 4;
    const centerZ = view.getFloat32(offset, true);
    offset += 4;
    const radius = view.getFloat32(offset, true);
    offset += 4;
    const memberCount = view.getUint16(offset, true);
    offset += 2;
    const richness = view.getUint8(offset);
    offset += 1;
    const nameIndex = view.getUint8(offset);
    offset += 1;

    // 可选的速度数据
    const hasVelocity = view.getUint8(offset);
    offset += 1;

    let velocityX: number | undefined;
    let velocityY: number | undefined;
    let velocityZ: number | undefined;
    if (hasVelocity) {
      velocityX = view.getFloat32(offset, true);
      offset += 4;
      velocityY = view.getFloat32(offset, true);
      offset += 4;
      velocityZ = view.getFloat32(offset, true);
      offset += 4;
    }

    // 预分配成员星系数组
    const galaxies: any[] = new Array(memberCount);
    for (let j = 0; j < memberCount; j++) {
      const x = view.getFloat32(offset, true);
      offset += 4;
      const y = view.getFloat32(offset, true);
      offset += 4;
      const z = view.getFloat32(offset, true);
      offset += 4;

      galaxies[j] = { x, y, z, brightness: 1.0 };
      allGalaxies.push(galaxies[j]);
    }

    superclusters[i] = {
      name: nameTable[nameIndex] || `Supercluster ${i}`,
      centerX,
      centerY,
      centerZ,
      radius,
      memberCount,
      richness,
      velocityX,
      velocityY,
      velocityZ,
    };
  }

  return { superclusters, galaxies: allGalaxies };
}
