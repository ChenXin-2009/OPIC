/**
 * universe-data-parsers.test.ts — 宇宙数据解析器单元测试
 *
 * 为 src/lib/data/universe-data-parsers.ts 中四个纯函数编写测试。
 * 每个测试手动构造符合二进制格式的 ArrayBuffer，然后验证解析结果。
 */

import {
  parseLocalGroupData,
  parseNearbyGroupsData,
  parseVirgoSuperclusterData,
  parseLaniakeaData,
} from '../universe-data-parsers';

/* ------------------------------------------------------------------ */
/*  工具：将字符串写入 DataView，返回写入的字节数                      */
/* ------------------------------------------------------------------ */
function writeString(view: DataView, offset: number, str: string): number {
  let pos = offset;
  view.setUint8(pos, str.length);
  pos += 1;
  for (let i = 0; i < str.length; i++) {
    view.setUint8(pos, str.charCodeAt(i));
    pos += 1;
  }
  return pos - offset;
}

function writeNameTable(
  view: DataView,
  offset: number,
  names: string[],
): number {
  let pos = offset;
  view.setUint16(pos, names.length, true);
  pos += 2;
  for (const n of names) {
    pos += writeString(view, pos, n);
  }
  return pos - offset;
}

/* ================================================================== */
/*  parseLocalGroupData                                                */
/* ================================================================== */
describe('parseLocalGroupData', () => {
  it('应解析单个星系的数据', () => {
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    let off = 0;

    // name table: 2 个名字
    off += writeNameTable(view, off, ['Milky Way', 'Andromeda']);
    // count = 1
    view.setUint16(off, 1, true);
    off += 2;

    // 唯一一个星系
    view.setFloat32(off, 0.0, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;
    view.setUint8(off, 255); // brightness → 1.0
    off += 1;
    view.setUint8(off, 0); // type → radius 0.012
    off += 1;
    view.setUint8(off, 0); // nameIndex → 'Milky Way'
    off += 1;
    view.setUint8(off, 0); // colorIndex → 0xffffff
    off += 1;

    const result = parseLocalGroupData(buf);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Milky Way');
    expect(result[0].x).toBe(0);
    expect(result[0].y).toBe(0);
    expect(result[0].z).toBe(0);
    expect(result[0].brightness).toBeCloseTo(1.0);
    expect(result[0].color).toBe(0xffffff);
    expect(result[0].radius).toBe(0.012);
    expect(result[0].type).toBe(0);
  });

  it('应解析多个星系并应用颜色/半径映射', () => {
    const buf = new ArrayBuffer(128);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['G1', 'G2']);
    view.setUint16(off, 2, true);
    off += 2;

    // 星系 0: type=3 → radius 0.001, colorIndex=3 → 0xffaaaa
    view.setFloat32(off, 1.0, true);
    off += 4;
    view.setFloat32(off, 2.0, true);
    off += 4;
    view.setFloat32(off, 3.0, true);
    off += 4;
    view.setUint8(off, 128);
    off += 1;
    view.setUint8(off, 3);
    off += 1;
    view.setUint8(off, 0);
    off += 1;
    view.setUint8(off, 3);
    off += 1;

    // 星系 1: type=99 → fallback radius 0.002, colorIndex=99 → 0xffffff
    view.setFloat32(off, 4.0, true);
    off += 4;
    view.setFloat32(off, 5.0, true);
    off += 4;
    view.setFloat32(off, 6.0, true);
    off += 4;
    view.setUint8(off, 64);
    off += 1;
    view.setUint8(off, 99);
    off += 1;
    view.setUint8(off, 1);
    off += 1;
    view.setUint8(off, 99);
    off += 1;

    const result = parseLocalGroupData(buf);
    expect(result).toHaveLength(2);

    expect(result[0].name).toBe('G1');
    expect(result[0].x).toBe(1);
    expect(result[0].brightness).toBeCloseTo(128 / 255);
    expect(result[0].radius).toBe(0.001);
    expect(result[0].color).toBe(0xffaaaa);

    expect(result[1].name).toBe('G2');
    expect(result[1].x).toBe(4);
    expect(result[1].brightness).toBeCloseTo(64 / 255);
    expect(result[1].radius).toBe(0.002);
    expect(result[1].color).toBe(0xffffff);
  });

  it('nameIndex 越界时应回退为 Galaxy N', () => {
    const buf = new ArrayBuffer(48);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['OnlyName']);
    view.setUint16(off, 1, true);
    off += 2;

    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setUint8(off, 0);
    off += 1;
    view.setUint8(off, 0);
    off += 1;
    view.setUint8(off, 9); // nameIndex out of bounds → "Galaxy 0"
    off += 1;
    view.setUint8(off, 0);
    off += 1;

    const result = parseLocalGroupData(buf);
    expect(result[0].name).toBe('Galaxy 0');
  });
});

/* ================================================================== */
/*  parseNearbyGroupsData                                              */
/* ================================================================== */
describe('parseNearbyGroupsData', () => {
  it('应解析含两个成员星系的群组', () => {
    const buf = new ArrayBuffer(128);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['Sculptor Group']);
    // 1 个群组
    view.setUint16(off, 1, true);
    off += 2;

    // center
    view.setFloat32(off, 3.9, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;
    view.setFloat32(off, 1.0, true); // radius
    off += 4;
    view.setUint16(off, 2, true); // memberCount
    off += 2;
    view.setUint8(off, 5); // richness
    off += 1;
    view.setUint8(off, 0); // nameIndex
    off += 1;

    // 成员 0
    view.setFloat32(off, 3.8, true);
    off += 4;
    view.setFloat32(off, 0.1, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;

    // 成员 1
    view.setFloat32(off, 4.0, true);
    off += 4;
    view.setFloat32(off, -0.1, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;

    const result = parseNearbyGroupsData(buf);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].name).toBe('Sculptor Group');
    expect(result.groups[0].centerX).toBeCloseTo(3.9);
    expect(result.groups[0].memberCount).toBe(2);
    expect(result.groups[0].richness).toBe(5);

    expect(result.galaxies).toHaveLength(2);
    expect(result.galaxies[0].x).toBeCloseTo(3.8);
    expect(result.galaxies[1].x).toBeCloseTo(4.0);
    // galaxies 引用同一对象
    expect(result.galaxies[0]).toBe(result.groups[0].galaxies[0]);
    expect(result.galaxies[1]).toBe(result.groups[0].galaxies[1]);
  });

  it('应解析多个群组', () => {
    const buf = new ArrayBuffer(256);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['Group A', 'Group B']);
    view.setUint16(off, 2, true);
    off += 2;

    // --- 群组 0: 1 个成员 ---
    view.setFloat32(off, 1, true);
    off += 4;
    view.setFloat32(off, 2, true);
    off += 4;
    view.setFloat32(off, 3, true);
    off += 4;
    view.setFloat32(off, 0.5, true);
    off += 4;
    view.setUint16(off, 1, true);
    off += 2;
    view.setUint8(off, 2);
    off += 1;
    view.setUint8(off, 0);
    off += 1;

    view.setFloat32(off, 1.1, true);
    off += 4;
    view.setFloat32(off, 1.2, true);
    off += 4;
    view.setFloat32(off, 1.3, true);
    off += 4;

    // --- 群组 1: 0 个成员 ---
    view.setFloat32(off, 4, true);
    off += 4;
    view.setFloat32(off, 5, true);
    off += 4;
    view.setFloat32(off, 6, true);
    off += 4;
    view.setFloat32(off, 0.2, true);
    off += 4;
    view.setUint16(off, 0, true);
    off += 2;
    view.setUint8(off, 1);
    off += 1;
    view.setUint8(off, 1);
    off += 1;

    // （无成员星系）

    const result = parseNearbyGroupsData(buf);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].name).toBe('Group A');
    expect(result.groups[0].memberCount).toBe(1);
    expect(result.groups[0].richness).toBe(2);
    expect(result.groups[0].galaxies).toHaveLength(1);
    expect(result.groups[1].name).toBe('Group B');
    expect(result.groups[1].memberCount).toBe(0);
    expect(result.groups[1].galaxies).toHaveLength(0);
    expect(result.galaxies).toHaveLength(1);
  });
});

/* ================================================================== */
/*  parseVirgoSuperclusterData                                         */
/* ================================================================== */
describe('parseVirgoSuperclusterData', () => {
  it('应解析星系团数据并与 nearby groups 格式一致', () => {
    const buf = new ArrayBuffer(128);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['Virgo Cluster', 'Fornax Cluster']);
    view.setUint16(off, 2, true);
    off += 2;

    // 团 0 — 2 个成员
    view.setFloat32(off, 16.5, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;
    view.setFloat32(off, 2.0, true);
    off += 4;
    view.setUint16(off, 2, true);
    off += 2;
    view.setUint8(off, 8);
    off += 1;
    view.setUint8(off, 0);
    off += 1;

    view.setFloat32(off, 16.0, true);
    off += 4;
    view.setFloat32(off, 0.5, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;

    view.setFloat32(off, 17.0, true);
    off += 4;
    view.setFloat32(off, -0.3, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;

    // 团 1 — 1 个成员
    view.setFloat32(off, 18.0, true);
    off += 4;
    view.setFloat32(off, 1.0, true);
    off += 4;
    view.setFloat32(off, 0.0, true);
    off += 4;
    view.setFloat32(off, 1.5, true);
    off += 4;
    view.setUint16(off, 1, true);
    off += 2;
    view.setUint8(off, 3);
    off += 1;
    view.setUint8(off, 1);
    off += 1;

    view.setFloat32(off, 18.5, true);
    off += 4;
    view.setFloat32(off, 0.8, true);
    off += 4;
    view.setFloat32(off, 0.2, true);
    off += 4;

    const result = parseVirgoSuperclusterData(buf);
    expect(result.clusters).toHaveLength(2);
    expect(result.clusters[0].name).toBe('Virgo Cluster');
    expect(result.clusters[0].centerX).toBeCloseTo(16.5);
    expect(result.clusters[0].memberCount).toBe(2);
    expect(result.clusters[0].radius).toBeCloseTo(2.0);
    expect(result.clusters[0].richness).toBe(8);
    expect(result.clusters[1].name).toBe('Fornax Cluster');
    expect(result.clusters[1].memberCount).toBe(1);

    expect(result.galaxies).toHaveLength(3);
    expect(result.galaxies[0].x).toBeCloseTo(16.0);
    expect(result.galaxies[2].x).toBeCloseTo(18.5);
    expect(result.galaxies[2].brightness).toBe(1.0);
  });

  it('应处理 nameIndex 越界', () => {
    const buf = new ArrayBuffer(64);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['A']);
    view.setUint16(off, 1, true);
    off += 2;

    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setUint16(off, 0, true);
    off += 2;
    view.setUint8(off, 0);
    off += 1;
    view.setUint8(off, 99); // OOB → "Cluster 0"
    off += 1;

    const result = parseVirgoSuperclusterData(buf);
    expect(result.clusters[0].name).toBe('Cluster 0');
  });
});

/* ================================================================== */
/*  parseLaniakeaData                                                  */
/* ================================================================== */
describe('parseLaniakeaData', () => {
  it('应解析不带速度数据的超星系团', () => {
    const buf = new ArrayBuffer(128);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['Laniakea']);
    view.setUint16(off, 1, true);
    off += 2;

    // center
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 100, true); // radius
    off += 4;
    view.setUint16(off, 2, true); // memberCount
    off += 2;
    view.setUint8(off, 10); // richness
    off += 1;
    view.setUint8(off, 0); // nameIndex
    off += 1;
    view.setUint8(off, 0); // hasVelocity = false
    off += 1;

    // 成员 0
    view.setFloat32(off, 10, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    // 成员 1
    view.setFloat32(off, -10, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;

    const result = parseLaniakeaData(buf);
    expect(result.superclusters).toHaveLength(1);
    expect(result.superclusters[0].name).toBe('Laniakea');
    expect(result.superclusters[0].centerX).toBe(0);
    expect(result.superclusters[0].memberCount).toBe(2);
    expect(result.superclusters[0].richness).toBe(10);
    // 无速度
    expect(result.superclusters[0].velocityX).toBeUndefined();
    expect(result.superclusters[0].velocityY).toBeUndefined();
    expect(result.superclusters[0].velocityZ).toBeUndefined();

    expect(result.galaxies).toHaveLength(2);
    expect(result.galaxies[0].x).toBeCloseTo(10);
    expect(result.galaxies[1].x).toBeCloseTo(-10);
  });

  it('应解析带速度数据的超星系团', () => {
    const buf = new ArrayBuffer(160);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['SC1']);
    view.setUint16(off, 1, true);
    off += 2;

    // center
    view.setFloat32(off, 1, true);
    off += 4;
    view.setFloat32(off, 2, true);
    off += 4;
    view.setFloat32(off, 3, true);
    off += 4;
    view.setFloat32(off, 10, true);
    off += 4;
    view.setUint16(off, 1, true);
    off += 2;
    view.setUint8(off, 5);
    off += 1;
    view.setUint8(off, 0);
    off += 1;
    view.setUint8(off, 1); // hasVelocity = true
    off += 1;

    // velocity
    view.setFloat32(off, 100, true);
    off += 4;
    view.setFloat32(off, 200, true);
    off += 4;
    view.setFloat32(off, 300, true);
    off += 4;

    // 1 个成员
    view.setFloat32(off, 5, true);
    off += 4;
    view.setFloat32(off, 6, true);
    off += 4;
    view.setFloat32(off, 7, true);
    off += 4;

    const result = parseLaniakeaData(buf);
    expect(result.superclusters).toHaveLength(1);
    expect(result.superclusters[0].velocityX).toBeCloseTo(100);
    expect(result.superclusters[0].velocityY).toBeCloseTo(200);
    expect(result.superclusters[0].velocityZ).toBeCloseTo(300);
    expect(result.galaxies).toHaveLength(1);
    expect(result.galaxies[0].x).toBeCloseTo(5);
  });

  it('应解析多个超星系团（有无速度混用）', () => {
    const buf = new ArrayBuffer(256);
    const view = new DataView(buf);
    let off = 0;

    off += writeNameTable(view, off, ['WithVel', 'NoVel']);
    view.setUint16(off, 2, true);
    off += 2;

    // --- SC 0: hasVelocity = 1, 1 个成员 ---
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 0, true);
    off += 4;
    view.setFloat32(off, 5, true);
    off += 4;
    view.setUint16(off, 1, true);
    off += 2;
    view.setUint8(off, 1);
    off += 1;
    view.setUint8(off, 0);
    off += 1;
    view.setUint8(off, 1); // hasVelocity
    off += 1;

    view.setFloat32(off, 1, true);
    off += 4;
    view.setFloat32(off, 2, true);
    off += 4;
    view.setFloat32(off, 3, true);
    off += 4;

    view.setFloat32(off, 10, true);
    off += 4;
    view.setFloat32(off, 20, true);
    off += 4;
    view.setFloat32(off, 30, true);
    off += 4;

    // --- SC 1: hasVelocity = 0, 0 个成员 ---
    view.setFloat32(off, 100, true);
    off += 4;
    view.setFloat32(off, 200, true);
    off += 4;
    view.setFloat32(off, 300, true);
    off += 4;
    view.setFloat32(off, 1, true);
    off += 4;
    view.setUint16(off, 0, true);
    off += 2;
    view.setUint8(off, 0);
    off += 1;
    view.setUint8(off, 1);
    off += 1;
    view.setUint8(off, 0); // hasVelocity
    off += 1;
    // no velocity, no members

    const result = parseLaniakeaData(buf);
    expect(result.superclusters).toHaveLength(2);

    expect(result.superclusters[0].name).toBe('WithVel');
    expect(result.superclusters[0].velocityX).toBeCloseTo(1);
    expect(result.superclusters[0].memberCount).toBe(1);
    expect(result.galaxies).toHaveLength(1);

    expect(result.superclusters[1].name).toBe('NoVel');
    expect(result.superclusters[1].velocityX).toBeUndefined();
    expect(result.superclusters[1].memberCount).toBe(0);
  });
});
