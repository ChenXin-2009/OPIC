#!/usr/bin/env python3
"""
修复宇宙数据解析脚本
这个脚本正确解析真实的天文数据文件，替换占位符数据
"""

import struct
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple

# 尝试导入 astropy（用于精确坐标转换）
try:
    from astropy.coordinates import SkyCoord
    from astropy import units as u
    ASTROPY_AVAILABLE = True
except ImportError:
    print("Warning: astropy not available. Using simplified coordinate conversion.")
    ASTROPY_AVAILABLE = False


class UniverseDataFixer:
    def __init__(self, raw_data_dir: str, output_dir: str):
        self.raw_data_dir = Path(raw_data_dir)
        self.output_dir = Path(output_dir)
        
        # 确保输出目录存在
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def parse_nearby_groups_data(self) -> Tuple[List[Dict], List[Dict]]:
        """
        解析近邻星系群数据
        来源：Karachentsev et al. (2013)
        格式：固定宽度列，包含 RA (h m s), Dec (d m s), Distance (Mpc)
        """
        print("Parsing Nearby Groups data from Karachentsev 2013...")
        
        input_file = self.raw_data_dir / "nearby_groups_karachentsev2013.txt"
        
        if not input_file.exists():
            print(f"Error: {input_file} not found!")
            return [], []
        
        all_galaxies = []
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                for line in f:
                    # 跳过注释和分隔符
                    if line.startswith('#') or line.startswith('-') or not line.strip():
                        continue
                    
                    # 跳过表头行（检查是否包含列名关键字）
                    if 'RAdeg' in line or 'DEdeg' in line or line.strip().startswith('Name'):
                        continue
                    
                    try:
                        # 使用管道符分隔
                        parts = line.split('|')
                        if len(parts) < 3:
                            continue
                        
                        # Name: parts[0]
                        name = parts[0].strip()
                        if not name or len(name) == 0:
                            continue
                        
                        # RA (h m s): parts[1]
                        ra_str = parts[1].strip()
                        ra_parts = ra_str.split()
                        if len(ra_parts) < 3:
                            continue
                        
                        ra_h = float(ra_parts[0])
                        ra_m = float(ra_parts[1])
                        ra_s = float(ra_parts[2])
                        ra_deg = (ra_h + ra_m/60.0 + ra_s/3600.0) * 15.0  # 转换为度
                        
                        # Dec (d m s): parts[1] 的后半部分
                        dec_parts = ra_parts[3:]  # Dec 在同一列
                        if len(dec_parts) < 3:
                            continue
                        
                        dec_sign = 1.0 if dec_parts[0][0] != '-' else -1.0
                        dec_d = abs(float(dec_parts[0]))
                        dec_m = float(dec_parts[1])
                        dec_s = float(dec_parts[2])
                        dec_deg = dec_sign * (dec_d + dec_m/60.0 + dec_s/3600.0)
                        
                        # 距离在倒数第二列
                        if len(parts) < 2:
                            continue
                        
                        distance = float(parts[-2].strip())  # Mpc
                        
                        # 转换为超银道坐标
                        x, y, z = self.convert_to_supergalactic(ra_deg, dec_deg, distance)
                        
                        galaxy = {
                            'name': name,
                            'x': x,
                            'y': y,
                            'z': z,
                            'brightness': 1.0,
                        }
                        all_galaxies.append(galaxy)
                        
                    except (ValueError, IndexError) as e:
                        continue
            
            print(f"Parsed {len(all_galaxies)} galaxies from Nearby Groups data")
            
            # 使用空间聚类将星系分组
            groups = self._cluster_galaxies_into_groups(all_galaxies, max_distance=2.0, min_members=5)
            
        except Exception as e:
            print(f"Error parsing nearby groups data: {e}")
            import traceback
            traceback.print_exc()
            return [], []
        
        print(f"Created {len(groups)} groups with {len(all_galaxies)} galaxies")
        return groups, all_galaxies
    
    def parse_virgo_supercluster_data(self) -> Tuple[List[Dict], List[Dict]]:
        """
        解析室女座超星系团数据
        来源：2MRS 巡天数据
        格式：固定宽度列，包含 RAdeg, DEdeg, cz (velocity)
        """
        print("Parsing Virgo Supercluster data from 2MRS...")
        
        input_file = self.raw_data_dir / "virgo_supercluster_2mrs.txt"
        
        if not input_file.exists():
            print(f"Error: {input_file} not found!")
            return [], []
        
        all_galaxies = []
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                for line in f:
                    # 跳过注释和分隔符
                    if line.startswith('#') or line.startswith('-') or not line.strip():
                        continue
                    
                    # 跳过表头行
                    if 'ID' in line or 'RAdeg' in line or 'DEdeg' in line:
                        continue
                    
                    try:
                        parts = line.split('|')
                        if len(parts) < 3:
                            continue
                        
                        # ID: parts[0]
                        # RAdeg DEdeg: parts[1]
                        # GLON GLAT: parts[2]
                        # cz: 需要从后面找
                        
                        coord_parts = parts[1].strip().split()
                        if len(coord_parts) < 2:
                            continue
                        
                        ra_deg = float(coord_parts[0])
                        dec_deg = float(coord_parts[1])
                        
                        # 查找 cz 列（速度）- 通常在后面的列
                        # 先尝试从最后几列找
                        cz = None
                        for i in range(len(parts)-1, max(len(parts)-10, 0), -1):
                            try:
                                val = float(parts[i].strip().split()[0])
                                if 100 < abs(val) < 50000:  # 合理的速度范围
                                    cz = val
                                    break
                            except:
                                continue
                        
                        if cz is None:
                            continue
                        
                        # 使用哈勃定律估算距离: D = cz / H0
                        # H0 ≈ 70 km/s/Mpc
                        distance = abs(cz) / 70.0  # Mpc
                        
                        # 限制距离范围（室女座超星系团约 10-30 Mpc）
                        if distance < 5.0 or distance > 50.0:
                            continue
                        
                        # 转换为超银道坐标
                        x, y, z = self.convert_to_supergalactic(ra_deg, dec_deg, distance)
                        
                        galaxy = {
                            'name': parts[0].strip(),
                            'x': x,
                            'y': y,
                            'z': z,
                            'brightness': 1.0,
                        }
                        all_galaxies.append(galaxy)
                        
                    except (ValueError, IndexError):
                        continue
            
            print(f"Parsed {len(all_galaxies)} galaxies from Virgo Supercluster data")
            
            # 将星系聚类成团
            clusters = self._cluster_galaxies_into_clusters(all_galaxies, max_distance=5.0, min_members=10)
            
        except Exception as e:
            print(f"Error parsing virgo supercluster data: {e}")
            import traceback
            traceback.print_exc()
            return [], []
        
        print(f"Created {len(clusters)} clusters with {len(all_galaxies)} galaxies")
        return clusters, all_galaxies
    
    def parse_laniakea_data(self) -> Tuple[List[Dict], List[Dict]]:
        """
        解析拉尼亚凯亚超星系团数据
        来源：Cosmicflows-3 数据集
        格式：固定宽度列，包含 GLON, GLAT, Dist
        """
        print("Parsing Laniakea Supercluster data from Cosmicflows-3...")
        
        input_file = self.raw_data_dir / "laniakea_cosmicflows3.txt"
        
        if not input_file.exists():
            print(f"Error: {input_file} not found!")
            return [], []
        
        all_galaxies = []
        
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                for line in f:
                    # 跳过注释和分隔符
                    if line.startswith('#') or line.startswith('-') or not line.strip():
                        continue
                    
                    # 跳过表头行
                    if 'PGC' in line or 'Dist' in line or 'GLON' in line:
                        continue
                    
                    try:
                        parts = line.split('|')
                        if len(parts) < 17:
                            continue
                        
                        # PGC: parts[0]
                        # Dist: parts[1] (Mpc)
                        # GLON GLAT: parts[16]
                        
                        pgc = parts[0].strip()
                        distance = float(parts[1].strip())  # Mpc
                        
                        # GLON GLAT 在 parts[16]
                        glon_glat = parts[16].strip().split()
                        if len(glon_glat) < 2:
                            continue
                        
                        glon = float(glon_glat[0])  # 银经（度）
                        glat = float(glon_glat[1])  # 银纬（度）
                        
                        # 限制距离范围（拉尼亚凯亚约 50-250 Mpc）
                        if distance < 10.0 or distance > 300.0:
                            continue
                        
                        # 转换为超银道坐标
                        x, y, z = self.convert_galactic_to_supergalactic(glon, glat, distance)
                        
                        galaxy = {
                            'name': f'PGC{pgc}',
                            'x': x,
                            'y': y,
                            'z': z,
                            'brightness': 1.0,
                        }
                        all_galaxies.append(galaxy)
                        
                    except (ValueError, IndexError):
                        continue
            
            print(f"Parsed {len(all_galaxies)} galaxies from Laniakea data")
            
            # 将星系聚类成超星系团 - 使用网格聚类方法，不合并相邻单元
            superclusters = self._cluster_galaxies_into_superclusters(all_galaxies, max_distance=25.0, min_members=100)
            
        except Exception as e:
            print(f"Error parsing laniakea data: {e}")
            import traceback
            traceback.print_exc()
            return [], []
        
        print(f"Created {len(superclusters)} superclusters with {len(all_galaxies)} galaxies")
        return superclusters, all_galaxies
    
    def _cluster_galaxies_into_groups(self, galaxies: List[Dict], max_distance: float = 2.0, min_members: int = 5) -> List[Dict]:
        """使用空间聚类将星系分组，并根据最著名的成员命名"""
        if len(galaxies) == 0:
            return []
        
        groups = []
        used = set()
        
        for i, galaxy in enumerate(galaxies):
            if i in used:
                continue
            
            group_galaxies = [galaxy]
            used.add(i)
            
            for j, other in enumerate(galaxies):
                if j in used:
                    continue
                
                dx = galaxy['x'] - other['x']
                dy = galaxy['y'] - other['y']
                dz = galaxy['z'] - other['z']
                dist = np.sqrt(dx*dx + dy*dy + dz*dz)
                
                if dist < max_distance:
                    group_galaxies.append(other)
                    used.add(j)
            
            if len(group_galaxies) >= min_members:
                center_x = sum(g['x'] for g in group_galaxies) / len(group_galaxies)
                center_y = sum(g['y'] for g in group_galaxies) / len(group_galaxies)
                center_z = sum(g['z'] for g in group_galaxies) / len(group_galaxies)
                
                max_dist = 0
                for g in group_galaxies:
                    dist = np.sqrt((g['x']-center_x)**2 + (g['y']-center_y)**2 + (g['z']-center_z)**2)
                    max_dist = max(max_dist, dist)
                
                # 为星系群命名：使用最著名的成员星系
                group_name = self._name_galaxy_group(group_galaxies, center_x, center_y, center_z)
                
                groups.append({
                    'name': group_name,
                    'centerX': center_x,
                    'centerY': center_y,
                    'centerZ': center_z,
                    'radius': max(max_dist, 0.5),
                    'memberCount': len(group_galaxies),
                    'richness': min(len(group_galaxies) // 2, 5),
                    'galaxies': group_galaxies,
                })
        
        return groups
    
    def _name_galaxy_group(self, galaxies: List[Dict], center_x: float, center_y: float, center_z: float) -> str:
        """
        为星系群命名，基于最著名的成员星系
        
        优先级：
        1. 梅西耶天体 (M)
        2. NGC 天体
        3. IC 天体
        4. 其他命名天体
        5. 基于位置的描述性名称
        """
        # 著名星系群的已知名称（基于位置和成员）
        # 这些是科学文献中公认的星系群名称
        
        # 检查是否包含著名星系
        member_names = [g.get('name', '') for g in galaxies]
        
        # M81 Group (距离约 3.6 Mpc)
        if any('M81' in name or 'NGC3031' in name for name in member_names):
            return 'M81 Group'
        
        # M83 Group (距离约 4.5 Mpc)
        if any('M83' in name or 'NGC5236' in name for name in member_names):
            return 'M83 Group'
        
        # Sculptor Group (NGC 253 Group, 距离约 3.9 Mpc)
        if any('NGC253' in name or 'NGC247' in name or 'NGC300' in name for name in member_names):
            return 'Sculptor Group'
        
        # Centaurus A Group (NGC 5128, 距离约 3.8 Mpc)
        if any('NGC5128' in name or 'CenA' in name for name in member_names):
            return 'Centaurus A Group'
        
        # IC 342 Group (距离约 3.3 Mpc)
        if any('IC342' in name or 'IC0342' in name for name in member_names):
            return 'IC 342 Group'
        
        # Maffei Group (距离约 3.0 Mpc)
        if any('Maffei' in name for name in member_names):
            return 'Maffei Group'
        
        # Canes Venatici I Group (M94 Group)
        if any('M94' in name or 'NGC4736' in name for name in member_names):
            return 'Canes Venatici I Group'
        
        # M101 Group
        if any('M101' in name or 'NGC5457' in name for name in member_names):
            return 'M101 Group'
        
        # NGC 1023 Group
        if any('NGC1023' in name for name in member_names):
            return 'NGC 1023 Group'
        
        # NGC 1400 Group
        if any('NGC1400' in name for name in member_names):
            return 'NGC 1400 Group'
        
        # 查找最著名的成员（优先级：M > NGC > IC > 其他）
        messier_members = [n for n in member_names if n.startswith('M') and n[1:].split()[0].isdigit()]
        if messier_members:
            # 使用第一个梅西耶天体命名
            return f'{messier_members[0]} Group'
        
        ngc_members = [n for n in member_names if 'NGC' in n]
        if ngc_members:
            # 提取 NGC 编号
            for name in ngc_members:
                if 'NGC' in name:
                    # 提取 NGC 后面的数字
                    parts = name.replace('NGC', '').replace('NGC0', '').strip()
                    if parts and parts[0].isdigit():
                        ngc_num = ''.join(c for c in parts if c.isdigit())[:4]
                        return f'NGC {ngc_num} Group'
        
        ic_members = [n for n in member_names if 'IC' in n]
        if ic_members:
            for name in ic_members:
                if 'IC' in name:
                    parts = name.replace('IC', '').replace('IC0', '').strip()
                    if parts and parts[0].isdigit():
                        ic_num = ''.join(c for c in parts if c.isdigit())[:4]
                        return f'IC {ic_num} Group'
        
        # 如果没有著名成员，使用基于位置的描述性名称
        # 计算距离
        distance = np.sqrt(center_x**2 + center_y**2 + center_z**2)
        
        # 根据超银道坐标的方向命名
        if abs(center_x) > abs(center_y) and abs(center_x) > abs(center_z):
            direction = 'SGX' if center_x > 0 else 'SGX-'
        elif abs(center_y) > abs(center_z):
            direction = 'SGY' if center_y > 0 else 'SGY-'
        else:
            direction = 'SGZ' if center_z > 0 else 'SGZ-'
        
        return f'Group {direction}{int(distance)}'
    
    def _cluster_galaxies_into_clusters(self, galaxies: List[Dict], max_distance: float = 5.0, min_members: int = 10) -> List[Dict]:
        """将星系聚类成团，并根据最著名的成员或位置命名"""
        if len(galaxies) == 0:
            return []
        
        clusters = []
        used = set()
        
        for i, galaxy in enumerate(galaxies):
            if i in used:
                continue
            
            cluster_galaxies = [galaxy]
            used.add(i)
            
            for j, other in enumerate(galaxies):
                if j in used:
                    continue
                
                dx = galaxy['x'] - other['x']
                dy = galaxy['y'] - other['y']
                dz = galaxy['z'] - other['z']
                dist = np.sqrt(dx*dx + dy*dy + dz*dz)
                
                if dist < max_distance:
                    cluster_galaxies.append(other)
                    used.add(j)
            
            if len(cluster_galaxies) >= min_members:
                center_x = sum(g['x'] for g in cluster_galaxies) / len(cluster_galaxies)
                center_y = sum(g['y'] for g in cluster_galaxies) / len(cluster_galaxies)
                center_z = sum(g['z'] for g in cluster_galaxies) / len(cluster_galaxies)
                
                max_dist = 0
                for g in cluster_galaxies:
                    dist = np.sqrt((g['x']-center_x)**2 + (g['y']-center_y)**2 + (g['z']-center_z)**2)
                    max_dist = max(max_dist, dist)
                
                # 为星系团命名
                cluster_name = self._name_galaxy_cluster(cluster_galaxies, center_x, center_y, center_z, len(cluster_galaxies))
                
                clusters.append({
                    'name': cluster_name,
                    'centerX': center_x,
                    'centerY': center_y,
                    'centerZ': center_z,
                    'radius': max(max_dist, 1.0),
                    'memberCount': len(cluster_galaxies),
                    'richness': min(len(cluster_galaxies) // 5, 10),
                    'galaxies': cluster_galaxies,
                })
        
        return clusters
    
    def _name_galaxy_cluster(self, galaxies: List[Dict], center_x: float, center_y: float, center_z: float, member_count: int) -> str:
        """
        为星系团命名，基于位置和成员数量
        
        室女座超星系团的主要结构：
        - Virgo Cluster: 中心，最大的星系团
        - Fornax Cluster: 南方
        - Eridanus Cluster: 更南方
        - Leo II Group: 狮子座方向
        - Crater Cloud: 巨爵座方向
        - Virgo W/E/S Clouds: 室女座的不同云
        """
        # 计算距离和方向
        distance = np.sqrt(center_x**2 + center_y**2 + center_z**2)
        
        # 室女座星系团：最大的聚类，距离约 16-17 Mpc，中心位置
        if member_count > 200 and distance < 20:
            return 'Virgo Cluster'
        
        # 天炉座星系团：南方，距离约 20 Mpc
        if center_z < -5 and 15 < distance < 25:
            return 'Fornax Cluster'
        
        # 波江座星系团：更南方，距离约 23 Mpc
        if center_z < -10 and distance > 20:
            return 'Eridanus Cluster'
        
        # 狮子座 II 群：正 X 方向
        if center_x > 10 and abs(center_y) < 10:
            return 'Leo II Group'
        
        # 巨爵座云：负 Y 方向
        if center_y < -5 and abs(center_x) < 10:
            return 'Crater Cloud'
        
        # 室女座 W 云：西侧
        if center_x < -5 and abs(center_y) < 10 and distance < 20:
            return 'Virgo W Cloud'
        
        # 室女座 E 云：东侧
        if center_x > 5 and abs(center_y) < 10 and distance < 20:
            return 'Virgo E Cloud'
        
        # 室女座 S 云：南侧
        if center_z < 0 and abs(center_x) < 10 and distance < 20:
            return 'Virgo S Cloud'
        
        # 室女座 III 群
        if 10 < distance < 20 and abs(center_x) < 15:
            return 'Virgo III Group'
        
        # NGC 5846 Group
        if center_x > 0 and center_y > 0 and 15 < distance < 25:
            return 'NGC 5846 Group'
        
        # NGC 4697 Group
        if center_x < 0 and center_y > 0 and 15 < distance < 25:
            return 'NGC 4697 Group'
        
        # 后发座 I 群：更远的距离
        if distance > 25 and center_x > 0:
            return 'Coma I Group'
        
        # 大熊座云：北方，远距离
        if center_z > 10 and distance > 20:
            return 'Ursa Major Cloud'
        
        # 猎犬座云：中等距离，正方向
        if center_x > 0 and center_y > 0 and 20 < distance < 30:
            return 'Canes Venatici Cloud'
        
        # 猎犬座支：延伸结构
        if center_x > 10 and center_z > 0 and distance > 25:
            return 'Canes Venatici Spur'
        
        # 狮子座云：狮子座方向
        if center_x > 15 and abs(center_y) < 10:
            return 'Leo Cloud'
        
        # 室女座 II 云
        if 15 < distance < 25 and abs(center_x) < 10:
            return 'Virgo II Cloud'
        
        # 默认：使用方向和距离描述
        if abs(center_x) > abs(center_y) and abs(center_x) > abs(center_z):
            direction = 'East' if center_x > 0 else 'West'
        elif abs(center_y) > abs(center_z):
            direction = 'North' if center_y > 0 else 'South'
        else:
            direction = 'Upper' if center_z > 0 else 'Lower'
        
        return f'{direction} Cluster {int(distance)}Mpc'
    
    def _cluster_galaxies_into_superclusters(self, galaxies: List[Dict], max_distance: float = 30.0, min_members: int = 20) -> List[Dict]:
        """将星系聚类成超星系团 - 使用网格聚类，不合并相邻单元"""
        if len(galaxies) == 0:
            return []
        
        # 计算空间范围
        xs = [g['x'] for g in galaxies]
        ys = [g['y'] for g in galaxies]
        zs = [g['z'] for g in galaxies]
        
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        z_min, z_max = min(zs), max(zs)
        
        print(f"  Space range: X=[{x_min:.1f}, {x_max:.1f}], Y=[{y_min:.1f}, {y_max:.1f}], Z=[{z_min:.1f}, {z_max:.1f}] Mpc")
        
        # 使用 80 Mpc 的网格大小（更大的网格以获得更多聚类）
        grid_size = 80.0
        
        # 创建网格字典
        grid = {}
        for i, g in enumerate(galaxies):
            gx = int((g['x'] - x_min) / grid_size)
            gy = int((g['y'] - y_min) / grid_size)
            gz = int((g['z'] - z_min) / grid_size)
            key = (gx, gy, gz)
            
            if key not in grid:
                grid[key] = []
            grid[key].append((i, g))
        
        print(f"  Total grid cells: {len(grid)}")
        
        # 识别高密度网格单元（至少 min_members 个星系）
        dense_cells = {k: v for k, v in grid.items() if len(v) >= min_members}
        
        print(f"  Dense cells (>={min_members} galaxies): {len(dense_cells)}")
        
        if not dense_cells:
            # 如果没有高密度单元，降低阈值
            min_members = min_members // 2
            dense_cells = {k: v for k, v in grid.items() if len(v) >= min_members}
            print(f"  Lowered threshold to {min_members}, dense cells: {len(dense_cells)}")
        
        # 每个高密度单元作为一个独立的超星系团（不合并相邻单元）
        all_clusters = []
        
        for cell_key, cell_galaxies in dense_cells.items():
            cluster_galaxies = [g for idx, g in cell_galaxies]
            
            # 计算聚类中心
            center_x = sum(g['x'] for g in cluster_galaxies) / len(cluster_galaxies)
            center_y = sum(g['y'] for g in cluster_galaxies) / len(cluster_galaxies)
            center_z = sum(g['z'] for g in cluster_galaxies) / len(cluster_galaxies)
            
            # 计算有效半径
            distances = []
            for g in cluster_galaxies:
                dist = np.sqrt((g['x']-center_x)**2 + (g['y']-center_y)**2 + (g['z']-center_z)**2)
                distances.append(dist)
            distances.sort()
            radius = distances[int(len(distances) * 0.8)] if distances else grid_size / 2
            
            all_clusters.append({
                'centerX': center_x,
                'centerY': center_y,
                'centerZ': center_z,
                'radius': max(radius, 20.0),
                'memberCount': len(cluster_galaxies),
                'richness': min(len(cluster_galaxies) // 20, 10),
                'galaxies': cluster_galaxies,
            })
        
        # 按成员数量排序，最大的优先
        all_clusters.sort(key=lambda c: c['memberCount'], reverse=True)
        
        # 分配名称（在排序后，避免重复）
        used_names = set()
        for cluster in all_clusters:
            name = self._assign_supercluster_name(
                cluster['centerX'], 
                cluster['centerY'], 
                cluster['centerZ'], 
                cluster['memberCount'],
                used_names
            )
            cluster['name'] = name
            used_names.add(name)
            print(f"    Cluster: {name}, center=({cluster['centerX']:.1f}, {cluster['centerY']:.1f}, {cluster['centerZ']:.1f}), members={cluster['memberCount']}")
        
        return all_clusters
    
    def _assign_supercluster_name(self, x: float, y: float, z: float, member_count: int, used_names: set = None) -> str:
        """
        根据超星系团的位置和特征分配科学准确的名称
        
        基于 Cosmicflows-3 数据的空间分布：
        - 室女座超星系团：我们所在的超星系团，中心约在 (0, 0, 0) 附近
        - 长蛇座超星系团：位于银道面附近，正 Y 方向
        - 半人马座超星系团：位于南天，正 Z 方向
        - 孔雀-印第安超星系团：位于南天，负 X 方向
        
        注意：Cosmicflows-3 数据覆盖范围有限（GLON: 0-23°, GLAT: 0-59°）
        因此我们看到的是观测窗口内的结构
        """
        if used_names is None:
            used_names = set()
        
        # 计算到原点的距离
        distance = np.sqrt(x**2 + y**2 + z**2)
        
        # 候选名称列表（按优先级）
        candidates = []
        
        # 最大的聚类通常是室女座超星系团的核心
        if member_count > 2000:
            candidates.append('Virgo Supercluster Core')
        
        # 根据位置分配名称
        # 长蛇座方向：正 Y，距离较远
        if y > 100 and distance > 100:
            candidates.append('Hydra Supercluster')
        
        # 半人马座方向：正 Z，距离较远
        if z > 100 and distance > 100:
            candidates.append('Centaurus Supercluster')
        
        # 孔雀-印第安方向：负 X，南天
        if x < -100 and z > 50:
            candidates.append('Pavo-Indus Supercluster')
        
        # 南天超星系团：正 Y 和正 Z
        if y > 50 and z > 50 and distance > 80:
            candidates.append('Southern Supercluster')
        
        # 室女座超星系团的不同区域
        if distance < 80:
            if y > 0 and z > 0:
                candidates.append('Virgo Supercluster (Leo Region)')
            elif y < 0 and z > 0:
                candidates.append('Virgo Supercluster (Crater Region)')
            elif y > 0 and z < 0:
                candidates.append('Virgo Supercluster (Coma Region)')
            else:
                candidates.append('Virgo Supercluster (Fornax Region)')
        
        # 中等距离的结构
        if 80 <= distance < 150:
            if y > 0:
                candidates.append('Hydra-Centaurus Complex')
            else:
                candidates.append('Fornax-Eridanus Complex')
        
        # 远距离结构
        if distance >= 150:
            if y > 0 and z > 0:
                candidates.append('Distant Supercluster (Hydra Direction)')
            elif x < 0:
                candidates.append('Distant Supercluster (Pavo Direction)')
            else:
                candidates.append('Distant Supercluster (Centaurus Direction)')
        
        # 选择第一个未使用的名称
        for name in candidates:
            if name not in used_names:
                return name
        
        # 如果所有候选名称都被使用，添加编号
        base_name = candidates[0] if candidates else 'Supercluster'
        counter = 2
        while f'{base_name} {counter}' in used_names:
            counter += 1
        return f'{base_name} {counter}'
    
    def convert_to_supergalactic(self, ra: float, dec: float, distance: float) -> Tuple[float, float, float]:
        """将赤道坐标转换为超银道坐标系"""
        if ASTROPY_AVAILABLE:
            coord = SkyCoord(ra=ra*u.degree, dec=dec*u.degree, distance=distance*u.Mpc, frame='icrs')
            supergalactic = coord.supergalactic
            
            x = supergalactic.cartesian.x.value
            y = supergalactic.cartesian.y.value
            z = supergalactic.cartesian.z.value
            
            return x, y, z
        else:
            # 简化转换
            ra_rad = np.radians(ra)
            dec_rad = np.radians(dec)
            
            x = distance * np.cos(dec_rad) * np.cos(ra_rad)
            y = distance * np.cos(dec_rad) * np.sin(ra_rad)
            z = distance * np.sin(dec_rad)
            
            return x, y, z
    
    def convert_galactic_to_supergalactic(self, glon: float, glat: float, distance: float) -> Tuple[float, float, float]:
        """将银道坐标转换为超银道坐标系"""
        if ASTROPY_AVAILABLE:
            coord = SkyCoord(l=glon*u.degree, b=glat*u.degree, distance=distance*u.Mpc, frame='galactic')
            supergalactic = coord.supergalactic
            
            x = supergalactic.cartesian.x.value
            y = supergalactic.cartesian.y.value
            z = supergalactic.cartesian.z.value
            
            return x, y, z
        else:
            # 简化转换
            glon_rad = np.radians(glon)
            glat_rad = np.radians(glat)
            
            x = distance * np.cos(glat_rad) * np.cos(glon_rad)
            y = distance * np.cos(glat_rad) * np.sin(glon_rad)
            z = distance * np.sin(glat_rad)
            
            return x, y, z
    
    def generate_nearby_groups_binary(self, groups: List[Dict], galaxies: List[Dict], output_path: Path):
        """生成近邻星系群二进制文件"""
        print(f"Generating nearby groups binary file: {output_path}")
        
        with open(output_path, 'wb') as f:
            # 写入名称表
            names = [g['name'] for g in groups]
            f.write(struct.pack('<H', len(names)))
            
            for name in names:
                name_bytes = name.encode('utf-8')
                f.write(struct.pack('<B', min(len(name_bytes), 255)))
                f.write(name_bytes[:255])
            
            # 写入星系群数量
            f.write(struct.pack('<H', len(groups)))
            
            # 写入星系群数据
            for i, group in enumerate(groups):
                f.write(struct.pack('<fff', group['centerX'], group['centerY'], group['centerZ']))
                f.write(struct.pack('<f', group['radius']))
                f.write(struct.pack('<H', group['memberCount']))
                f.write(struct.pack('<B', group['richness']))
                f.write(struct.pack('<B', i))
                
                # 写入成员星系
                for galaxy in group['galaxies']:
                    f.write(struct.pack('<fff', galaxy['x'], galaxy['y'], galaxy['z']))
        
        file_size = output_path.stat().st_size
        print(f"Generated {output_path.name}: {file_size} bytes")
    
    def generate_virgo_binary(self, clusters: List[Dict], galaxies: List[Dict], output_path: Path):
        """生成室女座超星系团二进制文件"""
        self.generate_nearby_groups_binary(clusters, galaxies, output_path)
    
    def generate_laniakea_binary(self, superclusters: List[Dict], galaxies: List[Dict], output_path: Path):
        """生成拉尼亚凯亚超星系团二进制文件"""
        print(f"Generating Laniakea Supercluster binary file: {output_path}")
        
        with open(output_path, 'wb') as f:
            # 写入名称表
            names = [sc['name'] for sc in superclusters]
            f.write(struct.pack('<H', len(names)))
            
            for name in names:
                name_bytes = name.encode('utf-8')
                f.write(struct.pack('<B', min(len(name_bytes), 255)))
                f.write(name_bytes[:255])
            
            # 写入超星系团数量
            f.write(struct.pack('<H', len(superclusters)))
            
            # 写入超星系团数据
            for i, sc in enumerate(superclusters):
                f.write(struct.pack('<fff', sc['centerX'], sc['centerY'], sc['centerZ']))
                f.write(struct.pack('<f', sc['radius']))
                f.write(struct.pack('<H', sc['memberCount']))
                f.write(struct.pack('<B', sc['richness']))
                f.write(struct.pack('<B', i))
                
                # 速度数据（暂时不包含）
                f.write(struct.pack('<B', 0))
                
                # 写入成员星系坐标
                for galaxy in sc['galaxies']:
                    f.write(struct.pack('<fff', galaxy['x'], galaxy['y'], galaxy['z']))
        
        file_size = output_path.stat().st_size
        print(f"Generated {output_path.name}: {file_size} bytes")
    
    def run(self):
        """运行数据修复流程"""
        print("=" * 60)
        print("Universe Data Parsing Fix")
        print("=" * 60)
        
        # 1. 解析近邻星系群数据
        print("\n1. Parsing Nearby Groups...")
        nearby_groups, nearby_galaxies = self.parse_nearby_groups_data()
        if len(nearby_groups) > 0:
            self.generate_nearby_groups_binary(
                nearby_groups,
                nearby_galaxies,
                self.output_dir / 'nearby-groups.bin'
            )
        
        # 2. 解析室女座超星系团数据
        print("\n2. Parsing Virgo Supercluster...")
        virgo_clusters, virgo_galaxies = self.parse_virgo_supercluster_data()
        if len(virgo_clusters) > 0:
            self.generate_virgo_binary(
                virgo_clusters,
                virgo_galaxies,
                self.output_dir / 'virgo-supercluster.bin'
            )
        
        # 3. 解析拉尼亚凯亚超星系团数据
        print("\n3. Parsing Laniakea Supercluster...")
        laniakea_superclusters, laniakea_galaxies = self.parse_laniakea_data()
        if len(laniakea_superclusters) > 0:
            self.generate_laniakea_binary(
                laniakea_superclusters,
                laniakea_galaxies,
                self.output_dir / 'laniakea.bin'
            )
        
        print("\n" + "=" * 60)
        print("Data parsing fix complete!")
        print("=" * 60)


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Fix universe data parsing')
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
    
    fixer = UniverseDataFixer(args.raw_data, args.output)
    fixer.run()


if __name__ == '__main__':
    main()
