# Deployment Guide

## Prerequisites

- Node.js 20+
- npm 9+
- A Cesium Ion access token (for Cesium features)

## Environment Variables

### 必需

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Yes | — | Cesium Ion access token，用于地球瓦片和地形渲染 |
| `NEXT_PUBLIC_CESIUM_BASE_URL` | No | `/cesium/` | Cesium 静态资源基础路径 |

### 可选 — 地图服务

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_ESRI_API_KEY` | No | — | Esri ArcGIS API Key，用于 World Imagery 等服务 |

### 可选 — 用户认证

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | No | — | Supabase 项目 URL，用于用户认证和数据存储 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | — | Supabase 匿名密钥 |

### 可选 — 全球挑战可视化 MODs

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | No | — | OpenWeatherMap API Key，用于天气和空气质量 MOD |
| `NEXT_PUBLIC_AQICN_API_KEY` | No | — | AQICN API Key，用于空气质量 MOD |
| `NEXT_PUBLIC_NASA_FIRMS_API_KEY` | No | — | NASA FIRMS API Key，用于野火 MOD |
| `NEXT_PUBLIC_IUCN_API_KEY` | No | — | IUCN Red List API Key，用于濒危物种 MOD |
| `NEXT_PUBLIC_ACLED_API_KEY` | No | — | ACLED API Key，用于武装冲突 MOD |

### 可选 — 交通 MOD

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENSKY_USERNAME` | No | — | OpenSky API username |
| `OPENSKY_PASSWORD` | No | — | OpenSky API password |

### 可选 — 缓存配置

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TILE_CACHE_MAX_AGE` | No | `2592000` (30天) | 服务端瓦片缓存时长（秒） |
| `SAS_TOKEN_CACHE_MAX_AGE` | No | `3000` (50分钟) | SAS Token 缓存时长（秒） |
| `DATA_SOURCES_CONFIG_PATH` | No | `/config/data-sources.json` | 数据源配置文件路径 |

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Production Build

```bash
npm run build
```

The build output is in `.next/` directory. Deploy this folder with the `node_modules` and `public/` directory.

## Vercel Deployment

The project includes `vercel.json` for Vercel deployment:

```json
{
  "functions": {
    "src/app/api/traffic/route.ts": { "maxDuration": 30 },
    "src/app/api/disasters/route.ts": { "maxDuration": 30 },
    "src/app/api/launches/route.ts": { "maxDuration": 30 }
  }
}
```

### Steps

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel Dashboard
4. Deploy

## Self-Hosted Deployment

```bash
# Build
npm run build

# Start
npm run start

# Or with PM2
pm2 start npm --name "opic" -- start
```

### Recommended Configuration

- **Reverse Proxy**: Nginx or Caddy
- **Port**: 3000 (default)
- **Static Assets**: Serve `public/` directory
- **Caching**: Enable caching for `.next/static/`

## Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## Data Files

The application loads binary universe data from `/data/universe/`. In production:

1. Ensure data files exist at the configured path
2. The data loader falls back gracefully if files are missing

## Cesium Assets

Cesium assets are copied to the build output via webpack configuration in `next.config.ts`. No additional steps needed.
