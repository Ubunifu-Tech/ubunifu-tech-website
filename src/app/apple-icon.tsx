import { ImageResponse } from 'next/og';
import { brandColors, brandMarkPaths } from '@/lib/brand';

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
          background: brandColors.ink,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '38px',
        }}
      >
        <svg width="148" height="148" viewBox="0 0 64 64">
          <path d={brandMarkPaths.u} fill="none" stroke={brandColors.orange} strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
          <path d={brandMarkPaths.tStem} fill="none" stroke={brandColors.violet} strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
          <path d={brandMarkPaths.tCrown} fill="none" stroke={brandColors.violet} strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
