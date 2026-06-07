# Deployment Guide

## Prerequisites

- Node.js 18+
- npm 9+
- A Cesium Ion access token (for Cesium features)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` | Yes | — | Cesium Ion access token |
| `OPENSKY_USERNAME` | No | — | OpenSky API username (traffic MOD) |
| `OPENSKY_PASSWORD` | No | — | OpenSky API password |

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
FROM node:18-alpine
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
