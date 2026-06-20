import { ImageResponse } from 'next/og'

export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #000000 0%, #0a0a2e 50%, #000000 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            marginBottom: '24px',
          }}
        >
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="#88ccff" strokeWidth="2" fill="none" />
            <circle cx="50" cy="50" r="8" fill="#88ccff" />
            <ellipse cx="50" cy="50" rx="35" ry="18" stroke="#88ccff" strokeWidth="1.5" fill="none" transform="rotate(-20 50 50)" />
            <circle cx="38" cy="35" r="3" fill="#ffffff" opacity="0.8" />
            <circle cx="65" cy="42" r="2" fill="#ffffff" opacity="0.6" />
            <circle cx="45" cy="65" r="1.5" fill="#ffffff" opacity="0.4" />
          </svg>
          <h1
            style={{
              fontSize: '96px',
              fontWeight: 700,
              color: '#88ccff',
              letterSpacing: '8px',
              margin: 0,
              lineHeight: 1,
            }}
          >
            OPIC
          </h1>
        </div>
        <p
          style={{
            fontSize: '28px',
            color: '#ffffff',
            letterSpacing: '4px',
            margin: 0,
            opacity: 0.8,
          }}
        >
          Open Integrated Cosmos
        </p>
      </div>
    ),
    size,
  )
}
