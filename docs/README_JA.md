# OPIC — Open Integrated Cosmos（オープン統合宇宙）

<div align="center">
  <img src="../public/LOGO/logolwBG.svg" alt="OPIC Logo" width="300">
</div>

**Webベースのマルチスケール宇宙可視化と天文データ統合システム**

[English](../README_EN.md) | [中文](../README.md) | [한국어](./README_KO.md) | [Français](./README_FR.md) | [Deutsch](./README_DE.md) | [Español](./README_ES.md) | [Русский](./README_RU.md)

---

## プロジェクト概要

OPICは、Three.js、Cesium、Next.jsを使用して構築されたインタラクティブな宇宙可視化アプリケーションです。実際の天文データと精密な軌道計算により、地球表面から観測可能な宇宙の端までの動的シミュレーションを提供します。

プロジェクトはモジュール式プラグインアーキテクチャ(MOD Manager)へと進化しており、アプリケーションを再起動することなく、実行時に機能を独立してロード、設定、切り替えることができます。

### デモ

<div align="center">
  <img src="./images/earth-to-universe-zoom.gif" alt="地球から宇宙へのズームデモ" width="300">
  <p><em>地球表面の建物から宇宙全景へのシームレスなズーム体験</em></p>
</div>

## 主な機能

### 地球可視化（Cesium統合）

- 高精度タイル地球：Cesiumベースのグローバル地形と画像タイルレンダリング
- 複数地図ソース切り替え：Bing Maps、OpenStreetMap、ArcGIS、天地図など
- 実際の地球地形標高データ
- 距離適応：近距離ではCesiumタイル、遠距離ではThree.js球体に切り替え、スムーズな遷移
- Three.jsとCesiumのカメラ状態リアルタイム同期

### 太陽系シミュレーション

- 高精度暦システム：NASA JPL DE440暦データに基づく
- 27の天体：8つの惑星 + 19の主要衛星の精密な位置計算
- 時間制御：2009-2109年の高精度時間範囲、早送りと巻き戻しをサポート
- 動的データソース：高精度暦 ↔ 解析モデルの自動切り替え

### 人工衛星追跡

- リアルタイム追跡：CelesTrak TLEデータとSGP4軌道モデルに基づく
- 衛星検索：軌道上の人工衛星の閲覧と検索
- 軌道可視化：衛星軌道パスと運動軌跡の表示
- 詳細情報：衛星パラメータ、軌道要素、状態の表示

<div align="center">
  <img src="./images/satellite-tracking-demo.gif" alt="衛星追跡デモ" width="300">
  <p><em>リアルタイム衛星軌道追跡と情報表示</em></p>
</div>

### マルチスケール宇宙可視化

ズームビューを通じて9つの宇宙スケール階層を探索：

| スケール | 距離範囲 | データソース |
|---------|---------|------------|
| 地球 | 0 - 100,000 km | Cesiumタイル |
| 太陽系 | 0.1 - 100 AU | NASA JPL DE440 |
| 近隣恒星 | 0 - 100光年 | ESA Gaia DR3 |
| 銀河系 | 100 - 50,000光年 | ESA Gaia |
| 局部銀河群 | 50k - 1M光年 | McConnachie 2012 |
| 近隣銀河群 | 1M - 10M光年 | Karachentsev 2013 |
| おとめ座超銀河団 | 10M - 50M光年 | 2MRS Survey |
| ラニアケア超銀河団 | 50M - 500M光年 | Cosmicflows-3 |
| 観測可能な宇宙 | 500M+光年 | 宇宙ウェブ構造 |

### MODマネージャーシステム（開発中）

モジュール式プラグインアーキテクチャにより、コアシステムを軽量に保ちながら、オプション機能を実行時に動的にロード：

- セマンティックバージョニングをサポートする宣言的MODマニフェスト
- 完全なライフサイクル管理：registered → loaded → enabled → disabled → unloaded
- 循環依存検出を含む自動依存関係解決
- バージョン管理されたAPIレイヤー：Time、Camera、Celestial、Satellite、Render API
- エラー分離 — MOD障害はコアシステムに影響しない
- セッション間での設定の永続化

<div align="center">
  <img src="./images/mod-manager-interface.gif" alt="MODマネージャーインターフェース" width="300">
  <p><em>MODマネージャーインターフェースとサンプルモジュール表示</em></p>
</div>

### ビジュアル機能

- 高品質惑星テクスチャ（Solar System Scope）
- ESA Gaiaデータに基づく恒星レンダリング
- インタラクティブカメラ：自由回転、ズーム、天体フォーカス
- スケール間のシームレスな視覚切り替え
- 距離に基づいて動的に調整される4レベルの詳細度

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンドフレームワーク | Next.js 16 / React 19 |
| 3Dレンダリング | Three.js 0.170 + Cesium 1.139 |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | Zustand 5 |
| 軌道計算 | satellite.js (SGP4) |
| データ圧縮 | pako (gzip) |
| テスト | Jest + fast-check |

## クイックスタート

### 環境要件

- Node.js 20+
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/ChenXin-2009/OPIC.git
cd OPIC

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

`http://localhost:3000`にアクセスしてアプリケーションを表示します。

### 本番ビルド

```bash
npm run build
npm start
```

## 操作ガイド

| 操作 | 機能 |
|-----|------|
| マウスドラッグ | 視点を回転 |
| スクロールホイール | ビューをズーム（異なる宇宙スケールを探索） |
| 惑星/衛星をクリック | ターゲットにフォーカス |
| 時間制御 | シミュレーション速度と日付を調整 |
| 地図切り替え | 地球ビューで異なる画像ソースを切り替え |
| 地球ロック | カメラを地球中心にロック |

## データソース

### 暦データ

| 天体 | データソース | 時間範囲 | 精度 |
|-----|------------|---------|------|
| 地球、火星、月 | NASA JPL DE440 | 2009-2109 | <0.1° |
| その他の惑星 | NASA JPL DE440 | 2009-2039 | <0.1° |
| 木星の衛星 | NASA JPL JUP365 | 2009-2039 | <0.01° |
| 土星の衛星 | NASA JPL SAT441 | 2009-2039 | <0.01° |
| 海王星の衛星 | NASA JPL NEP097 | 2009-2039 | <0.01° |

### 宇宙データ

- 恒星データ：ESA Gaiaミッション（DR3）
- 局部銀河群：McConnachie (2012) Local Group Catalog
- 近隣銀河群：Karachentsev et al. (2013)
- おとめ座超銀河団：2MRS Survey Data
- ラニアケア超銀河団：Cosmicflows-3 Dataset

### 衛星データ

- TLE軌道データ：CelesTrak (NORAD)
- 衛星メタデータ：UCS (Union of Concerned Scientists) 衛星データベース

### ビジュアルリソース

- 惑星テクスチャ：Solar System Scope
- 銀河系画像：ESA/Gaia

## プロジェクト構造

```
opic/
├── src/
│   ├── app/                    # Next.jsアプリルーター
│   ├── components/             # Reactコンポーネント
│   │   ├── canvas/            # 3Dキャンバスコンポーネント
│   │   ├── cesium/            # Cesium関連コンポーネント
│   │   ├── satellite/         # 衛星追跡UI
│   │   ├── mod-manager/       # MODマネージャーUI（開発中）
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/                # Three.jsレンダラー
│   │   │   ├── SceneManager.ts
│   │   │   ├── Planet.ts
│   │   │   ├── GalaxyRenderer.ts
│   │   │   ├── LocalGroupRenderer.ts
│   │   │   ├── VirgoSuperclusterRenderer.ts
│   │   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   │   ├── LODManager.ts
│   │   │   └── ...
│   │   ├── cesium/            # Cesium統合
│   │   │   ├── CesiumAdapter.ts
│   │   │   ├── CameraSynchronizer.ts
│   │   │   └── ...
│   │   ├── astronomy/         # 天文計算
│   │   ├── satellite/         # 衛星追跡（SGP4）
│   │   ├── mod-manager/       # MODマネージャーコア（開発中）
│   │   │   ├── core/          # レジストリ、ライフサイクル、依存関係解決
│   │   │   ├── api/           # Time/Camera/Celestial/Satellite/Render API
│   │   │   ├── persistence/   # 設定の永続化
│   │   │   ├── error/         # エラー処理と分離
│   │   │   └── performance/   # パフォーマンス監視
│   │   ├── config/            # 設定ファイル
│   │   ├── data/              # データローダー
│   │   └── types/             # TypeScript型
│   └── stores/                # Zustand状態管理
├── public/
│   ├── data/                  # 天文データ
│   │   ├── ephemeris/        # NASA JPL暦データ
│   │   ├── gaia/             # Gaia恒星データ
│   │   └── universe/         # 宇宙構造データ
│   ├── textures/              # テクスチャリソース
│   └── cesium/                # Cesium静的アセット
├── scripts/                   # データ生成スクリプト
└── docs/                      # プロジェクトドキュメント
```

## 開発

```bash
# テストを実行
npm test

# コード検査
npm run lint
npm run lint:fix

# 型チェック
npm run quality:check

# テストカバレッジ
npm run test:coverage
```

## パフォーマンス最適化

- 距離に基づいて動的に調整される4レベルのLODシステム
- オンデマンド地球タイルロード、遠距離タイルの自動削除
- 近距離Cesiumタイル、遠距離Three.js球体
- 数百万のパーティクルをサポートするカスタムシェーダーパーティクルシステム
- インスタンス化レンダリングによる描画呼び出しの削減
- 視錐台カリング、可視オブジェクトのみをレンダリング
- 遠距離リソースの自動解放
- ノンブロッキングデータ処理のためのWeb Workers

## 免責事項

このアプリケーションは教育および娯楽目的でのみ使用されます。

**天文データ精度の説明：**

高精度時間範囲内（2009-2109年の地球/火星/月、2009-2039年のその他の天体）では、NASA JPL暦データを使用し、精度は角秒レベルに達します。この範囲を超えると、システムは自動的に解析モデルに切り替わり、精度が低下します。

科学研究やナビゲーションに正確な天文データが必要な場合は、NASA JPL HORIZONSシステムまたはその他の専門天文機関の公式資料を参照してください。

**衛星軌道データの説明：**

人工衛星軌道データはTLE（Two-Line Element）とSGP4モデルに基づいて計算されており、精度は大気抵抗、太陽放射圧などの要因の影響を受けるため、参考用です。

**責任声明：**

このソフトウェアは「現状のまま」提供され、明示または黙示の保証は一切ありません。いかなる場合も、著者または著作権者は、いかなる請求、損害、またはその他の責任について責任を負いません。

このソフトウェアは、フェイルセーフ性能を必要とする環境には適していません。ユーザーは、高リスク活動でこのソフトウェアを使用することによって生じる損失または損害について、著者が責任を負わないことを明示的に理解し、同意します。

## 貢献ガイド

あらゆる形式の貢献を歓迎します！人間の開発者とAIアシスタントの協力を歓迎します。

- 参加方法については[CONTRIBUTING.md](CONTRIBUTING.md)をご覧ください
- バグ報告や新機能の提案にはIssueを提出してください
- コード貢献にはPull Requestを提出してください
- **AI貢献歓迎**：AIツールとエージェントを使用した貢献を奨励します

## ライセンス

このプロジェクトはApache License 2.0ライセンスを採用しています。

主な特徴：
- 商用利用、修正、配布を許可
- 著作権とライセンス声明の保持が必要
- 明確な特許ライセンスを提供
- 免責事項と責任制限を含む

詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 連絡先

- **GitHub**: [@ChenXin-2009](https://github.com/ChenXin-2009)
- **プロジェクトアドレス**: [https://github.com/ChenXin-2009/OPIC](https://github.com/ChenXin-2009/OPIC)
- **ウェブサイト**: [https://opic.cxin.tech](https://opic.cxin.tech)
