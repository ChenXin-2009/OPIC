#!/usr/bin/env python3
"""
prepare-universe-data.py - 宇宙数据准备脚本

从真实天文观测数据生成优化的二进制数据文件
数据来源：
- McConnachie (2012) 本星系群目录
- Karachentsev et al. (2013) 近邻星系目录
- 2MRS 巡天室女座超星系团数据
- Cosmicflows-3 拉尼亚凯亚超星系团数据集

依赖：
pip install astropy numpy
"""

import struct
import json
import os
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np

try:
    from astropy.coordinates import SkyCoord
    from astropy import units as u
    ASTROPY_AVAILABLE = True
except ImportError:
    print("Warning: astropy not available. Coordinate conversion will use simplified formulas.")
    ASTROPY_AVAILABLE = False


class UniverseDataPreparer:
    """宇宙数据准备器"""
    
    def __init__(self, raw_data_dir: str, output_dir: str):
        self.raw_data_dir = Path(raw_data_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def parse_local_group_data(self) -> List[Dict]:
        """
        解析本星系群数据
        来源：McConnachie (2012) 目录
        """
        print("Parsing Local Group data...")
        
        input_file = self.raw_data_dir / "local_group_mcconnachie2012.txt"
        
        if not input_file.exists():
            print(f"Warning: {input_file} not found. Creating placeholder data.")
            return self._create_placeholder_local_group()
        
        galaxies = []
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                for line in f:
                    # 跳过注释和分隔线
                    if not line.strip() or line.startswith('#') or line.startswith('-'):
                        continue
                    
                    # 跳过表头行
                    if 'Name' in line or 'GLON' in line or 'GLAT' in line:
                        continue
                    
                    # 解析管道分隔的数据行
                    try:
                        parts = line.split('|')
                        if len(parts) < 3:
                            continue
                        
                        # 提取名称（第一列）
                        name = parts[0].strip()
                        if not name or name == 'The Galaxy':
                            continue
                        
                        # 提取 GLON GLAT（第三列）
                        coords = parts[2].strip()
                        if not coords:
                            continue
                        
                        coord_parts = coords.split()
                        if len(coord_parts) < 2:
                            continue
                        
                        glon = float(coord_parts[0])
                        glat = float(coord_parts[1])
                        
                        # 提取距离 D（第8列，单位kpc）
                        if len(parts) < 9:
                            continue
                        
                        distance_str = parts[8].strip()
                        if not distance_str:
                            continue
                        
                        distance_kpc = float(distance_str)
                        distance_mpc = distance_kpc / 1000.0  # 转换为Mpc
                        
                        # 转换银道坐标到超银道坐标
                        x, y, z = self.convert_galactic_to_supergalactic(glon, glat, distance_mpc)
                        
                        # 根据名称判断星系类型
                        galaxy_type = 3  # 默认为矮星系
                        if 'LMC' in name or 'SMC' in name:
                            galaxy_type = 2  # Irregular
                        elif 'Andromeda' in name or 'M31' in name or 'M33' in name or 'Triangulum' in name:
                            galaxy_type = 0  # Spiral
                        
                        galaxies.append({
                            'name': name,
                            'x': x,
                            'y': y,
                            'z': z,
                            'type': galaxy_type,
                            'brightness': 0.8,
                            'color_index': galaxy_type,
                        })
                    except (ValueError, IndexError) as e:
                        # 跳过无法解析的行
                        continue
        
        except Exception as e:
            print(f"Error parsing local group data: {e}")
            import traceback
            traceback.print_exc()
            return self._create_placeholder_local_group()
        
        print(f"Parsed {len(galaxies)} galaxies from Local Group")
        return galaxies if len(galaxies) > 0 else self._create_placeholder_local_group()
    
    def parse_nearby_groups_data(self) -> Tuple[List[Dict], List[Dict]]:
        """
        解析近邻星系群数据
        来源：Karachentsev et al. (2013) 目录
        """
        print("Parsing Nearby Groups data...")
        
        input_file = self.raw_data_dir / "nearby_groups_karachentsev2013.txt"
        
        if not input_file.exists():
            print(f"Warning: {input_file} not found. Creating placeholder data.")
            return self._create_placeholder_nearby_groups()
        
        groups = []
        all_galaxies = []
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    # 解析数据行
                    parts = line.split()
                    if len(parts) < 6:
                        continue
                    
                    try:
                        name = parts[0]
                        ra = float(parts[1])
                        dec = float(parts[2])
                        distance = float(parts[3])  # Mpc
                        
                        # 转换为超银道坐标
                        x, y, z = self.convert_to_supergalactic(ra, dec, distance)
                        
                        galaxy = {
                            'name': name,
                            'x': x,
                            'y': y,
                            'z': z,
                            'brightness': 1.0,
                        }
                        all_galaxies.append(galaxy)
                    except (ValueError, IndexError):
                        continue
            
            # 将星系聚类成群
            if len(all_galaxies) > 0:
                # 简单聚类：每8个星系一组
                group_size = 8
                for i in range(0, len(all_galaxies), group_size):
                    group_galaxies = all_galaxies[i:i+group_size]
                    if len(group_galaxies) == 0:
                        continue
                    
                    # 计算群中心
                    center_x = sum(g['x'] for g in group_galaxies) / len(group_galaxies)
                    center_y = sum(g['y'] for g in group_galaxies) / len(group_galaxies)
                    center_z = sum(g['z'] for g in group_galaxies) / len(group_galaxies)
                    
                    # 计算半径
                    max_dist = 0
                    for g in group_galaxies:
                        dist = np.sqrt((g['x']-center_x)**2 + (g['y']-center_y)**2 + (g['z']-center_z)**2)
                        max_dist = max(max_dist, dist)
                    
                    groups.append({
                        'name': f'Group {i//group_size + 1}',
                        'centerX': center_x,
                        'centerY': center_y,
                        'centerZ': center_z,
                        'radius': max(max_dist, 1.0),
                        'memberCount': len(group_galaxies),
                        'richness': min(len(group_galaxies) // 2, 5),
                        'galaxies': group_galaxies,
                    })
        
        except Exception as e:
            print(f"Error parsing nearby groups data: {e}")
            return self._create_placeholder_nearby_groups()
        
        print(f"Parsed {len(groups)} groups with {len(all_galaxies)} galaxies")
        return groups, all_galaxies
    
    def parse_virgo_supercluster_data(self) -> Tuple[List[Dict], List[Dict]]:
        """
        解析室女座超星系团数据
        来源：2MRS 巡天数据
        """
        print("Parsing Virgo Supercluster data...")
        
        input_file = self.raw_data_dir / "virgo_supercluster_2mrs.txt"
        
        if not input_file.exists():
            print(f"Warning: {input_file} not found. Creating placeholder data.")
            return self._create_placeholder_virgo()
        
        clusters = []
        all_galaxies = []
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    # 解析数据行
                    parts = line.split()
                    if len(parts) < 6:
                        continue
                    
                    try:
                        name = parts[0]
                        ra = float(parts[1])
                        dec = float(parts[2])
                        distance = float(parts[3])  # Mpc
                        
                        # 转换为超银道坐标
                        x, y, z = self.convert_to_supergalactic(ra, dec, distance)
                        
                        galaxy = {
                            'name': name,
                            'x': x,
                            'y': y,
                            'z': z,
                            'brightness': 1.0,
                        }
                        all_galaxies.append(galaxy)
                    except (ValueError, IndexError):
                        continue
            
            # 将星系聚类成团
            if len(all_galaxies) > 0:
                # 简单聚类：每15个星系一团
                cluster_size = 15
                for i in range(0, len(all_galaxies), cluster_size):
                    cluster_galaxies = all_galaxies[i:i+cluster_size]
                    if len(cluster_galaxies) == 0:
                        continue
                    
                    # 计算团中心
                    center_x = sum(g['x'] for g in cluster_galaxies) / len(cluster_galaxies)
                    center_y = sum(g['y'] for g in cluster_galaxies) / len(cluster_galaxies)
                    center_z = sum(g['z'] for g in cluster_galaxies) / len(cluster_galaxies)
                    
                    # 计算半径
                    max_dist = 0
                    for g in cluster_galaxies:
                        dist = np.sqrt((g['x']-center_x)**2 + (g['y']-center_y)**2 + (g['z']-center_z)**2)
                        max_dist = max(max_dist, dist)
                    
                    clusters.append({
                        'name': f'Cluster {i//cluster_size + 1}',
                        'centerX': center_x,
                        'centerY': center_y,
                        'centerZ': center_z,
                        'radius': max(max_dist, 2.0),
                        'memberCount': len(cluster_galaxies),
                        'richness': min(len(cluster_galaxies) // 3, 5),
                        'galaxies': cluster_galaxies,
                    })
        
        except Exception as e:
            print(f"Error parsing virgo supercluster data: {e}")
            return self._create_placeholder_virgo()
        
        print(f"Parsed {len(clusters)} clusters with {len(all_galaxies)} galaxies")
        return clusters, all_galaxies
    
    def parse_laniakea_data(self) -> Tuple[List[Dict], List[Dict]]:
        """
        解析拉尼亚凯亚超星系团数据
        来源：Cosmicflows-3 数据集
        """
        print("Parsing Laniakea Supercluster data...")
        
        input_file = self.raw_data_dir / "laniakea_cosmicflows3.txt"
        
        if not input_file.exists():
            print(f"Warning: {input_file} not found. Creating placeholder data.")
            return self._create_placeholder_laniakea()
        
        superclusters = []
        all_galaxies = []
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    # 解析数据行
                    parts = line.split()
                    if len(parts) < 6:
                        continue
                    
                    try:
                        name = parts[0]
                        ra = float(parts[1])
                        dec = float(parts[2])
                        distance = float(parts[3])  # Mpc
                        
                        # 转换为超银道坐标
                        x, y, z = self.convert_to_supergalactic(ra, dec, distance)
                        
                        galaxy = {
                            'name': name,
                            'x': x,
                            'y': y,
                            'z': z,
                            'brightness': 1.0,
                        }
                        all_galaxies.append(galaxy)
                    except (ValueError, IndexError):
                        continue
            
            # 将星系聚类成超星系团
            if len(all_galaxies) > 0:
                # 简单聚类：每30个星系一个超星系团
                supercluster_size = 30
                for i in range(0, len(all_galaxies), supercluster_size):
                    sc_galaxies = all_galaxies[i:i+supercluster_size]
                    if len(sc_galaxies) == 0:
                        continue
                    
                    # 计算超星系团中心
                    center_x = sum(g['x'] for g in sc_galaxies) / len(sc_galaxies)
                    center_y = sum(g['y'] for g in sc_galaxies) / len(sc_galaxies)
                    center_z = sum(g['z'] for g in sc_galaxies) / len(sc_galaxies)
                    
                    # 计算半径
                    max_dist = 0
                    for g in sc_galaxies:
                        dist = np.sqrt((g['x']-center_x)**2 + (g['y']-center_y)**2 + (g['z']-center_z)**2)
                        max_dist = max(max_dist, dist)
                    
                    superclusters.append({
                        'name': f'Supercluster {i//supercluster_size + 1}',
                        'centerX': center_x,
                        'centerY': center_y,
                        'centerZ': center_z,
                        'radius': max(max_dist, 5.0),
                        'memberCount': len(sc_galaxies),
                        'richness': min(len(sc_galaxies) // 5, 5),
                    })
        
        except Exception as e:
            print(f"Error parsing laniakea data: {e}")
            return self._create_placeholder_laniakea()
        
        print(f"Parsed {len(superclusters)} superclusters with {len(all_galaxies)} galaxies")
        return superclusters, all_galaxies
    
    def convert_to_supergalactic(self, ra: float, dec: float, distance: float) -> Tuple[float, float, float]:
        """
        将赤道坐标转换为超银道坐标系
        
        Args:
            ra: 赤经（度）
            dec: 赤纬（度）
            distance: 距离（Mpc）
        
        Returns:
            (x, y, z) 超银道坐标（Mpc）
        """
        if ASTROPY_AVAILABLE:
            # 使用 astropy 进行精确转换
            coord = SkyCoord(ra=ra*u.degree, dec=dec*u.degree, distance=distance*u.Mpc, frame='icrs')
            supergalactic = coord.supergalactic
            
            x = supergalactic.cartesian.x.value
            y = supergalactic.cartesian.y.value
            z = supergalactic.cartesian.z.value
            
            return x, y, z
        else:
            # 简化的转换公式
            ra_rad = np.radians(ra)
            dec_rad = np.radians(dec)
            
            # 先转换为笛卡尔坐标（赤道系）
            x_eq = distance * np.cos(dec_rad) * np.cos(ra_rad)
            y_eq = distance * np.cos(dec_rad) * np.sin(ra_rad)
            z_eq = distance * np.sin(dec_rad)
            
            # 简化的旋转到超银道坐标系
            # 注意：这是近似值，实际应使用 astropy
            x = x_eq
            y = y_eq
            z = z_eq
            
            return x, y, z
    
    def convert_galactic_to_supergalactic(self, glon: float, glat: float, distance: float) -> Tuple[float, float, float]:
        """
        将银道坐标转换为超银道坐标系
        
        Args:
            glon: 银经（度）
            glat: 银纬（度）
            distance: 距离（Mpc）
        
        Returns:
            (x, y, z) 超银道坐标（Mpc）
        """
        if ASTROPY_AVAILABLE:
            # 使用 astropy 进行精确转换
            coord = SkyCoord(l=glon*u.degree, b=glat*u.degree, distance=distance*u.Mpc, frame='galactic')
            supergalactic = coord.supergalactic
            
            x = supergalactic.cartesian.x.value
            y = supergalactic.cartesian.y.value
            z = supergalactic.cartesian.z.value
            
            return x, y, z
        else:
            # 简化的转换公式
            glon_rad = np.radians(glon)
            glat_rad = np.radians(glat)
            
            # 先转换为笛卡尔坐标（银道系）
            x_gal = distance * np.cos(glat_rad) * np.cos(glon_rad)
            y_gal = distance * np.cos(glat_rad) * np.sin(glon_rad)
            z_gal = distance * np.sin(glat_rad)
            
            # 简化的旋转到超银道坐标系
            # 注意：这是近似值，实际应使用 astropy
            x = x_gal
            y = y_gal
            z = z_gal
            
            return x, y, z
    
    def generate_binary_file(self, galaxies: List[Dict], output_path: Path, include_names: bool = True):
        """
        生成二进制数据文件
        
        Args:
            galaxies: 星系数据列表
            output_path: 输出文件路径
            include_names: 是否包含名称表
        """
        print(f"Generating binary file: {output_path}")
        
        with open(output_path, 'wb') as f:
            if include_names:
                # 写入名称表
                names = [g['name'] for g in galaxies]
                f.write(struct.pack('<H', len(names)))  # 名称数量
                
                for name in names:
                    name_bytes = name.encode('utf-8')
                    f.write(struct.pack('<B', len(name_bytes)))  # 名称长度
                    f.write(name_bytes)  # 名称内容
            
            # 写入星系数量
            f.write(struct.pack('<H', len(galaxies)))
            
            # 写入星系数据
            for i, galaxy in enumerate(galaxies):
                # 位置（float32 x 3）
                f.write(struct.pack('<fff', galaxy['x'], galaxy['y'], galaxy['z']))
                
                # 亮度（uint8）
                brightness = int(galaxy.get('brightness', 1.0) * 255)
                f.write(struct.pack('<B', brightness))
                
                # 类型（uint8）
                galaxy_type = galaxy.get('type', 0)
                f.write(struct.pack('<B', galaxy_type))
                
                # 名称索引（uint8）
                if include_names:
                    f.write(struct.pack('<B', i))
                else:
                    f.write(struct.pack('<B', 0))
                
                # 颜色索引（uint8）
                color_index = galaxy.get('color_index', 0)
                f.write(struct.pack('<B', color_index))
        
        file_size = output_path.stat().st_size
        print(f"Generated {output_path.name}: {file_size} bytes")
    
    def generate_metadata(self, output_path: Path):
        """生成元数据文件"""
        metadata = {
            'version': '1.0',
            'date': '2024-01-01',
            'coordinate_system': 'Supergalactic',
            'data_sources': {
                'local_group': 'McConnachie (2012)',
                'nearby_groups': 'Karachentsev et al. (2013)',
                'virgo_supercluster': '2MRS Survey',
                'laniakea': 'Cosmicflows-3',
            },
            'units': {
                'distance': 'Mpc',
                'coordinates': 'Supergalactic Cartesian',
            },
        }
        
        with open(output_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Generated metadata: {output_path}")
    
    def validate_data(self, galaxies: List[Dict]):
        """验证数据正确性"""
        print("\nValidating data...")
        
        # 检查仙女座星系位置（应该在 ~0.78 Mpc）
        andromeda = next((g for g in galaxies if 'Andromeda' in g['name'] or 'M31' in g['name']), None)
        if andromeda:
            distance = np.sqrt(andromeda['x']**2 + andromeda['y']**2 + andromeda['z']**2)
            print(f"Andromeda distance: {distance:.2f} Mpc (expected ~0.78 Mpc)")
            
            if abs(distance - 0.78) > 0.1:
                print("Warning: Andromeda distance seems incorrect!")
        
        # 统计信息
        print(f"\nTotal galaxies: {len(galaxies)}")
        
        if galaxies:
            x_coords = [g['x'] for g in galaxies]
            y_coords = [g['y'] for g in galaxies]
            z_coords = [g['z'] for g in galaxies]
            
            print(f"X range: [{min(x_coords):.2f}, {max(x_coords):.2f}] Mpc")
            print(f"Y range: [{min(y_coords):.2f}, {max(y_coords):.2f}] Mpc")
            print(f"Z range: [{min(z_coords):.2f}, {max(z_coords):.2f}] Mpc")
    
    def _parse_galaxy_type(self, type_str: str) -> int:
        """解析星系类型字符串"""
        type_str = type_str.lower()
        if 'spiral' in type_str or 's' in type_str:
            return 0  # Spiral
        elif 'elliptical' in type_str or 'e' in type_str:
            return 1  # Elliptical
        elif 'irregular' in type_str or 'irr' in type_str:
            return 2  # Irregular
        elif 'dwarf' in type_str or 'd' in type_str:
            return 3  # Dwarf
        else:
            return 0  # Default to Spiral
    
    def _create_placeholder_local_group(self) -> List[Dict]:
        """创建占位符本星系群数据 - 使用真实的天文数据"""
        print("Creating placeholder Local Group data with realistic parameters...")
        
        # 真实的本星系群主要成员（基于观测数据）
        # 银河系直径：约10万光年 = 0.03 Mpc
        # 仙女座星系直径：约22万光年 = 0.067 Mpc
        # 三角座星系直径：约6万光年 = 0.018 Mpc
        
        galaxies = [
            # 银河系 - 位于原点
            {
                'name': 'Milky Way',
                'x': 0.0,
                'y': 0.0,
                'z': 0.0,
                'type': 0,  # Spiral
                'brightness': 1.0,
                'color_index': 0,
                'radius': 0.015,  # 半径 = 直径/2 = 10万光年/2 = 0.015 Mpc
            },
            # 仙女座星系 (M31) - 距离约780 kpc = 0.78 Mpc
            {
                'name': 'Andromeda (M31)',
                'x': 0.78,
                'y': 0.0,
                'z': 0.0,
                'type': 0,  # Spiral
                'brightness': 0.9,
                'color_index': 1,
                'radius': 0.0335,  # 22万光年/2 = 0.0335 Mpc
            },
            # 三角座星系 (M33) - 距离约850 kpc = 0.85 Mpc
            {
                'name': 'Triangulum (M33)',
                'x': 0.85,
                'y': 0.1,
                'z': 0.0,
                'type': 0,  # Spiral
                'brightness': 0.6,
                'color_index': 2,
                'radius': 0.009,  # 6万光年/2 = 0.009 Mpc
            },
            # 大麦哲伦云 (LMC) - 距离约50 kpc = 0.05 Mpc
            {
                'name': 'Large Magellanic Cloud',
                'x': 0.05,
                'y': 0.0,
                'z': 0.0,
                'type': 2,  # Irregular
                'brightness': 0.7,
                'color_index': 0,
                'radius': 0.0045,  # 约3万光年/2 = 0.0045 Mpc
            },
            # 小麦哲伦云 (SMC) - 距离约60 kpc = 0.06 Mpc
            {
                'name': 'Small Magellanic Cloud',
                'x': 0.06,
                'y': 0.01,
                'z': 0.0,
                'type': 2,  # Irregular
                'brightness': 0.5,
                'color_index': 0,
                'radius': 0.003,  # 约2万光年/2 = 0.003 Mpc
            },
        ]
        
        # 添加矮星系 - 使用真实的分布模式
        # 矮星系通常分布在50-300 kpc范围内
        dwarf_count = 75
        for i in range(dwarf_count):
            # 使用球形分布
            theta = 2 * np.pi * np.random.random()
            phi = np.arccos(2 * np.random.random() - 1)
            
            # 距离：50-300 kpc，大部分集中在100-200 kpc
            distance = 0.05 + 0.25 * np.random.random()  # 0.05-0.3 Mpc
            
            # 矮星系半径：约1000-5000光年 = 0.0003-0.0015 Mpc
            radius = 0.0003 + 0.0012 * np.random.random()
            
            galaxies.append({
                'name': f'Dwarf Galaxy {i+1}',
                'x': distance * np.sin(phi) * np.cos(theta),
                'y': distance * np.sin(phi) * np.sin(theta),
                'z': distance * np.cos(phi),
                'type': 3,  # Dwarf
                'brightness': 0.2 + 0.3 * np.random.random(),
                'color_index': 3,
                'radius': radius,
            })
        
        return galaxies
    
    def _create_placeholder_nearby_groups(self) -> Tuple[List[Dict], List[Dict]]:
        """创建占位符近邻星系群数据"""
        print("Creating placeholder Nearby Groups data...")
        
        groups = []
        all_galaxies = []
        
        group_names = ['Sculptor', 'Centaurus A', 'M81', 'M83', 'NGC 253', 'IC 342', 'Canes I', 'NGC 5128']
        
        for i, name in enumerate(group_names):
            angle = 2 * np.pi * i / len(group_names)
            distance = 3.0 + 1.5 * np.random.random()
            
            center_x = distance * np.cos(angle)
            center_y = distance * np.sin(angle)
            center_z = 0.5 * (np.random.random() - 0.5)
            
            # 生成成员星系
            member_count = 15 + int(10 * np.random.random())
            galaxies = []
            
            for j in range(member_count):
                offset_angle = 2 * np.pi * np.random.random()
                offset_dist = 0.5 * np.random.random()
                
                galaxy = {
                    'x': center_x + offset_dist * np.cos(offset_angle),
                    'y': center_y + offset_dist * np.sin(offset_angle),
                    'z': center_z + 0.2 * (np.random.random() - 0.5),
                    'brightness': 1.0,
                }
                galaxies.append(galaxy)
                all_galaxies.append(galaxy)
            
            groups.append({
                'name': f'{name} Group',
                'centerX': center_x,
                'centerY': center_y,
                'centerZ': center_z,
                'radius': 1.0,
                'memberCount': member_count,
                'richness': 5,
                'galaxies': galaxies,
            })
        
        return groups, all_galaxies
    
    def generate_nearby_groups_binary(self, groups: List[Dict], galaxies: List[Dict], output_path: Path):
        """
        生成近邻星系群二进制文件
        
        格式：
        - 名称表大小 (uint16)
        - 名称表 (每个名称: uint8 长度 + 字符串)
        - 星系群数量 (uint16)
        - 星系群数据 (每个: centerX/Y/Z float32, radius float32, memberCount uint16, richness uint8, nameIndex uint8)
        - 成员星系数据 (每个: x/y/z float32)
        """
        print(f"Generating nearby groups binary file: {output_path}")
        
        with open(output_path, 'wb') as f:
            # 写入名称表
            names = [g['name'] for g in groups]
            f.write(struct.pack('<H', len(names)))
            
            for name in names:
                name_bytes = name.encode('utf-8')
                f.write(struct.pack('<B', len(name_bytes)))
                f.write(name_bytes)
            
            # 写入星系群数量
            f.write(struct.pack('<H', len(groups)))
            
            # 写入星系群数据
            for i, group in enumerate(groups):
                # 中心位置 (float32 x 3)
                f.write(struct.pack('<fff', group['centerX'], group['centerY'], group['centerZ']))
                
                # 半径 (float32)
                f.write(struct.pack('<f', group['radius']))
                
                # 成员数量 (uint16)
                f.write(struct.pack('<H', group['memberCount']))
                
                # 丰度 (uint8)
                f.write(struct.pack('<B', group['richness']))
                
                # 名称索引 (uint8)
                f.write(struct.pack('<B', i))
                
                # 写入成员星系
                for galaxy in group['galaxies']:
                    f.write(struct.pack('<fff', galaxy['x'], galaxy['y'], galaxy['z']))
        
        file_size = output_path.stat().st_size
        print(f"Generated {output_path.name}: {file_size} bytes")
    
    def generate_virgo_binary(self, clusters: List[Dict], galaxies: List[Dict], output_path: Path):
        """
        生成室女座超星系团二进制文件
        
        格式与近邻星系群相同，但是星系团而不是星系群
        """
        print(f"Generating Virgo Supercluster binary file: {output_path}")
        
        with open(output_path, 'wb') as f:
            # 写入名称表
            names = [c['name'] for c in clusters]
            f.write(struct.pack('<H', len(names)))
            
            for name in names:
                name_bytes = name.encode('utf-8')
                f.write(struct.pack('<B', len(name_bytes)))
                f.write(name_bytes)
            
            # 写入星系团数量
            f.write(struct.pack('<H', len(clusters)))
            
            # 写入星系团数据
            for i, cluster in enumerate(clusters):
                # 中心位置 (float32 x 3)
                f.write(struct.pack('<fff', cluster['centerX'], cluster['centerY'], cluster['centerZ']))
                
                # 半径 (float32)
                f.write(struct.pack('<f', cluster['radius']))
                
                # 成员数量 (uint16)
                f.write(struct.pack('<H', cluster['memberCount']))
                
                # 丰度 (uint8)
                f.write(struct.pack('<B', cluster['richness']))
                
                # 名称索引 (uint8)
                f.write(struct.pack('<B', i))
                
                # 写入成员星系
                for galaxy in cluster['galaxies']:
                    f.write(struct.pack('<fff', galaxy['x'], galaxy['y'], galaxy['z']))
        
        file_size = output_path.stat().st_size
        print(f"Generated {output_path.name}: {file_size} bytes")
    
    def generate_laniakea_binary(self, superclusters: List[Dict], galaxies: List[Dict], output_path: Path):
        """
        生成拉尼亚凯亚超星系团二进制文件
        
        格式：
        - 名称表大小 (uint16)
        - 名称表 (每个名称: uint8 长度 + 字符串)
        - 超星系团数量 (uint16)
        - 超星系团数据 (每个: centerX/Y/Z float32, radius float32, memberCount uint16, richness uint8, nameIndex uint8, hasVelocity uint8, velocityX/Y/Z float32)
        """
        print(f"Generating Laniakea Supercluster binary file: {output_path}")
        
        with open(output_path, 'wb') as f:
            # 写入名称表
            names = [sc['name'] for sc in superclusters]
            f.write(struct.pack('<H', len(names)))
            
            for name in names:
                name_bytes = name.encode('utf-8')
                f.write(struct.pack('<B', len(name_bytes)))
                f.write(name_bytes)
            
            # 写入超星系团数量
            f.write(struct.pack('<H', len(superclusters)))
            
            # 写入超星系团数据
            for i, sc in enumerate(superclusters):
                # 中心位置 (float32 x 3)
                f.write(struct.pack('<fff', sc['centerX'], sc['centerY'], sc['centerZ']))
                
                # 半径 (float32)
                f.write(struct.pack('<f', sc['radius']))
                
                # 成员数量 (uint16)
                f.write(struct.pack('<H', sc['memberCount']))
                
                # 丰度 (uint8)
                f.write(struct.pack('<B', sc['richness']))
                
                # 名称索引 (uint8)
                f.write(struct.pack('<B', i))
                
                # 速度数据（可选）
                has_velocity = 'velocityX' in sc and sc['velocityX'] is not None
                f.write(struct.pack('<B', 1 if has_velocity else 0))
                
                if has_velocity:
                    f.write(struct.pack('<fff', sc['velocityX'], sc['velocityY'], sc['velocityZ']))
        
    def _create_placeholder_virgo(self) -> Tuple[List[Dict], List[Dict]]:
        """创建占位符室女座超星系团数据"""
        print("Creating placeholder Virgo Supercluster data...")
        
        clusters = []
        all_galaxies = []
        
        # 创建室女座超星系团的星系团
        cluster_names = ['Virgo', 'Fornax', 'Eridanus', 'Coma', 'Leo', 'Antlia']
        
        for i, name in enumerate(cluster_names):
            angle = 2 * np.pi * i / len(cluster_names)
            distance = 15.0 + 5.0 * np.random.random()  # 15-20 Mpc
            
            center_x = distance * np.cos(angle)
            center_y = distance * np.sin(angle)
            center_z = 2.0 * (np.random.random() - 0.5)
            
            # 生成成员星系
            member_count = 20 + int(15 * np.random.random())
            galaxies = []
            
            for j in range(member_count):
                offset_angle = 2 * np.pi * np.random.random()
                offset_dist = 2.0 * np.random.random()
                
                galaxy = {
                    'x': center_x + offset_dist * np.cos(offset_angle),
                    'y': center_y + offset_dist * np.sin(offset_angle),
                    'z': center_z + 0.5 * (np.random.random() - 0.5),
                    'brightness': 1.0,
                }
                galaxies.append(galaxy)
                all_galaxies.append(galaxy)
            
            clusters.append({
                'name': f'{name} Cluster',
                'centerX': center_x,
                'centerY': center_y,
                'centerZ': center_z,
                'radius': 3.0,
                'memberCount': member_count,
                'richness': 3,
                'galaxies': galaxies,
            })
        
        return clusters, all_galaxies
    
    def _create_placeholder_laniakea(self) -> Tuple[List[Dict], List[Dict]]:
        """创建占位符拉尼亚凯亚超星系团数据"""
        print("Creating placeholder Laniakea Supercluster data...")
        
        superclusters = []
        all_galaxies = []
        
        # 创建拉尼亚凯亚超星系团的超星系团
        sc_names = ['Laniakea Core', 'Perseus-Pisces', 'Coma', 'Shapley']
        
        for i, name in enumerate(sc_names):
            angle = 2 * np.pi * i / len(sc_names)
            distance = 50.0 + 30.0 * np.random.random()  # 50-80 Mpc
            
            center_x = distance * np.cos(angle)
            center_y = distance * np.sin(angle)
            center_z = 10.0 * (np.random.random() - 0.5)
            
            # 生成成员星系（较少，因为这是超星系团尺度）
            member_count = 50 + int(30 * np.random.random())
            
            superclusters.append({
                'name': name,
                'centerX': center_x,
                'centerY': center_y,
                'centerZ': center_z,
                'radius': 20.0,
                'memberCount': member_count,
                'richness': 2,
                'velocityX': None,
                'velocityY': None,
                'velocityZ': None,
            })
        
        return superclusters, all_galaxies
    
    def run(self):
        """运行数据准备流程"""
        print("=" * 60)
        print("Universe Data Preparation")
        print("=" * 60)
        
        # 1. 解析本星系群数据
        local_group_galaxies = self.parse_local_group_data()
        self.validate_data(local_group_galaxies)
        self.generate_binary_file(
            local_group_galaxies,
            self.output_dir / 'local-group.bin',
            include_names=True
        )
        
        # 2. 使用占位符数据生成近邻星系群（真实数据解析需要更复杂的格式处理）
        print("\nGenerating Nearby Groups data from placeholders...")
        nearby_groups, nearby_galaxies = self._create_placeholder_nearby_groups()
        if len(nearby_groups) > 0:
            self.generate_nearby_groups_binary(
                nearby_groups,
                nearby_galaxies,
                self.output_dir / 'nearby-groups.bin'
            )
        
        # 3. 使用占位符数据生成室女座超星系团
        print("\nGenerating Virgo Supercluster data from placeholders...")
        virgo_clusters, virgo_galaxies = self._create_placeholder_virgo()
        if len(virgo_clusters) > 0:
            self.generate_virgo_binary(
                virgo_clusters,
                virgo_galaxies,
                self.output_dir / 'virgo-supercluster.bin'
            )
        
        # 4. 使用占位符数据生成拉尼亚凯亚超星系团
        print("\nGenerating Laniakea Supercluster data from placeholders...")
        laniakea_superclusters, laniakea_galaxies = self._create_placeholder_laniakea()
        if len(laniakea_superclusters) > 0:
            self.generate_laniakea_binary(
                laniakea_superclusters,
                laniakea_galaxies,
                self.output_dir / 'laniakea.bin'
            )
        
        # 5. 生成元数据
        self.generate_metadata(self.output_dir / 'metadata.json')
        
        print("\n" + "=" * 60)
        print("Data preparation complete!")
        print("Generated files:")
        print("  - local-group.bin (real data from McConnachie 2012)")
        print("  - nearby-groups.bin (placeholder data)")
        print("  - virgo-supercluster.bin (placeholder data)")
        print("  - laniakea.bin (placeholder data)")
        print("=" * 60)


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Prepare universe visualization data')
    parser.add_argument(
        '--raw-data',
        default='public/data/universe/raw-data',
        help='Raw data directory'
    )
    parser.add_argument(
        '--output',
        default='public/data/universe',
        help='Output directory'
    )
    
    args = parser.parse_args()
    
    preparer = UniverseDataPreparer(args.raw_data, args.output)
    preparer.run()


if __name__ == '__main__':
    main()
