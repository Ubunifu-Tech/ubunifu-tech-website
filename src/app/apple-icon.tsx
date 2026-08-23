import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#FFFFFF',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '38px',
        }}
      >
        <svg width="148" height="148" viewBox="0 0 64 64">
          <path d="M11 17v18c0 13 8 20 20 20 7 0 11-2 13-5" fill="none" stroke="#FF6B2C" strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
          <path d="M43 13v23c0 11 6 18 14 18" fill="none" stroke="#6D3FE8" strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
          <path d="M29 16 57 10" fill="none" stroke="#6D3FE8" strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
