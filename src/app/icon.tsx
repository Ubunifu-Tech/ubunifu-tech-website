import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '7px',
        }}
      >
        <svg width="27" height="27" viewBox="0 0 64 64">
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
