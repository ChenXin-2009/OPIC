#!/usr/bin/env python3
"""
download_cosmicflows3_full.py - 下载完整的Cosmicflows-3数据集

从VizieR下载完整的Cosmicflows-3目录(J/AJ/152/50),并转换为项目所需的格式。

数据来源:
- VizieR目录: J/AJ/152/50/table3
- 论文: Tully et al. (2016), "Cosmicflows-3", AJ, 152, 50
- 数据规模: 17,669个星系距离测量

使用方法:
    python download_cosmicflows3_full.py

输出:
    - public/data/universe/raw-data/cosmicflows3_full.txt
    - public/data/universe/raw-data/cosmicflows3_full.csv
"""

import sys
import os
from pathlib import Path

try:
    from astroquery.vizier import Vizier
    import numpy as np
    import pandas as pd
    from astropy import units as u
    from astropy.coordinates import SkyCoord
except ImportError as e:
    print(f"错误: 缺少必要的Python库: {e}")
    print("\n请安装以下依赖:")
    print("  pip install astroquery numpy pandas astropy")
    sys.exit(1)


def download_cosmicflows3():
    """从VizieR下载完整的Cosmicflows-3数据"""
    print("正在从VizieR下载Cosmicflows-3数据...")
    print("目录: J/AJ/152/50/table3")
    print("这可能需要几分钟时间...\n")
    
    # 配置Vizier查询
    # row_limit=-1 表示下载所有数据
    v = Vizier(columns=['*'], row_limit=-1)
    v.ROW_LIMIT = -1
    
    try:
        # 查询Cosmicflows-3目录
        catalog_list = v.get_catalogs('J/AJ/152/50')
        
        if not catalog_list:
            print("错误: 无法从VizieR获取数据")
            return None
            
        # table3包含主要的星系数据
        table = catalog_list[0]
        
        print(f"成功下载 {len(table)} 条记录")
        print(f"列名: {table.colnames}\n")
        
        return table
        
    except Exception as e:
        print(f"下载失败: {e}")
        return None


def convert_to_supergalactic_cartesian(sglon, sglat, dist):
    """
    将超星系坐标(SGLON, SGLAT, Distance)转换为超星系笛卡尔坐标(X, Y, Z)
    
    参数:
        sglon: 超星系经度(度)
        sglat: 超星系纬度(度)
        dist: 距离(Mpc)
    
    返回:
        (x, y, z): 超星系笛卡尔坐标(Mpc)
    """
    # 转换为弧度
    sglon_rad = np.radians(sglon)
    sglat_rad = np.radians(sglat)
    
    # 球坐标到笛卡尔坐标
    x = dist * np.cos(sglat_rad) * np.cos(sglon_rad)
    y = dist * np.cos(sglat_rad) * np.sin(sglon_rad)
    z = dist * np.sin(sglat_rad)
    
    return x, y, z


def process_data(table):
    """处理下载的数据,转换为项目所需格式"""
    print("正在处理数据...")
    
    # 创建DataFrame以便处理
    df = table.to_pandas()
    
    # 提取关键字段
    # PGC: 星系目录编号
    # Dist: 距离(Mpc)
    # SGLON, SGLAT: 超星系坐标
    # HV: 日心速度(km/s)
    # Vgsr, Vls, Vcmb: 不同参考系的速度
    # Bmag, Ksmag: B波段和K波段星等
    # Name: 星系名称
    # Abell: Abell星系团编号
    # GName: 星系群/团名称
    
    required_columns = ['PGC', 'Dist', 'SGLON', 'SGLAT']
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        print(f"警告: 缺少必要的列: {missing_columns}")
        print(f"可用的列: {df.columns.tolist()}")
        return None
    
    # 过滤有效数据
    # 移除距离为NaN或无效的记录
    df_valid = df[df['Dist'].notna() & (df['Dist'] > 0)].copy()
    df_valid = df_valid[df_valid['SGLON'].notna() & df_valid['SGLAT'].notna()].copy()
    
    print(f"有效记录数: {len(df_valid)} / {len(df)}")
    
    # 转换为超星系笛卡尔坐标
    x, y, z = convert_to_supergalactic_cartesian(
        df_valid['SGLON'].values,
        df_valid['SGLAT'].values,
        df_valid['Dist'].values
    )
    
    df_valid['X'] = x
    df_valid['Y'] = y
    df_valid['Z'] = z
    
    # 计算亮度(基于星等)
    # 使用K波段星等,如果不可用则使用B波段
    if 'Ksmag' in df_valid.columns:
        # K波段星等越小越亮,转换为0-1的亮度值
        # 假设Ksmag范围约为8-16
        ksmag = df_valid['Ksmag'].fillna(14.0)
        brightness = np.clip((16.0 - ksmag) / 8.0, 0.1, 1.0)
    elif 'Bmag' in df_valid.columns:
        bmag = df_valid['Bmag'].fillna(16.0)
        brightness = np.clip((20.0 - bmag) / 8.0, 0.1, 1.0)
    else:
        brightness = np.ones(len(df_valid)) * 0.5
    
    df_valid['Brightness'] = brightness
    
    # 统计信息
    print(f"\n数据统计:")
    print(f"  距离范围: {df_valid['Dist'].min():.1f} - {df_valid['Dist'].max():.1f} Mpc")
    print(f"  X范围: {df_valid['X'].min():.1f} - {df_valid['X'].max():.1f} Mpc")
    print(f"  Y范围: {df_valid['Y'].min():.1f} - {df_valid['Y'].max():.1f} Mpc")
    print(f"  Z范围: {df_valid['Z'].min():.1f} - {df_valid['Z'].max():.1f} Mpc")
    
    # 检查分布对称性
    x_mean = df_valid['X'].mean()
    y_mean = df_valid['Y'].mean()
    z_mean = df_valid['Z'].mean()
    print(f"  中心偏移: ({x_mean:.1f}, {y_mean:.1f}, {z_mean:.1f}) Mpc")
    
    return df_valid


def save_data(df, output_dir):
    """保存处理后的数据"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存为CSV格式(便于检查)
    csv_path = output_dir / 'cosmicflows3_full.csv'
    df.to_csv(csv_path, index=False)
    print(f"\n已保存CSV文件: {csv_path}")
    
    # 保存为文本格式(与现有格式兼容)
    txt_path = output_dir / 'cosmicflows3_full.txt'
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write("# Cosmicflows-3 完整数据集\n")
        f.write("# 来源: VizieR J/AJ/152/50/table3\n")
        f.write("# 论文: Tully et al. (2016), AJ, 152, 50\n")
        f.write(f"# 记录数: {len(df)}\n")
        f.write("# 坐标系: 超星系笛卡尔坐标(Supergalactic Cartesian)\n")
        f.write("# 列: PGC, Name, X(Mpc), Y(Mpc), Z(Mpc), Dist(Mpc), SGLON(deg), SGLAT(deg), Brightness, HV(km/s)\n")
        f.write("#\n")
        
        for _, row in df.iterrows():
            name = row.get('Name', '').strip() if pd.notna(row.get('Name')) else f"PGC{row['PGC']}"
            hv = row.get('HV', 0) if pd.notna(row.get('HV')) else 0
            
            f.write(f"{int(row['PGC']):8d} {name:20s} "
                   f"{row['X']:10.3f} {row['Y']:10.3f} {row['Z']:10.3f} "
                   f"{row['Dist']:8.2f} {row['SGLON']:8.2f} {row['SGLAT']:8.2f} "
                   f"{row['Brightness']:6.3f} {hv:8.0f}\n")
    
    print(f"已保存文本文件: {txt_path}")
    
    return csv_path, txt_path


def main():
    """主函数"""
    print("=" * 70)
    print("Cosmicflows-3 完整数据集下载工具")
    print("=" * 70)
    print()
    
    # 下载数据
    table = download_cosmicflows3()
    if table is None:
        print("\n下载失败,程序退出")
        return 1
    
    # 处理数据
    df = process_data(table)
    if df is None:
        print("\n数据处理失败,程序退出")
        return 1
    
    # 保存数据
    output_dir = Path(__file__).parent.parent / 'public' / 'data' / 'universe' / 'raw-data'
    csv_path, txt_path = save_data(df, output_dir)
    
    print("\n" + "=" * 70)
    print("下载完成!")
    print("=" * 70)
    print(f"\n下一步:")
    print(f"1. 检查数据文件: {csv_path}")
    print(f"2. 运行聚类脚本识别超星系团")
    print(f"3. 生成二进制数据文件")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
