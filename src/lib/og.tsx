import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

// Shared Open Graph card renderer. One source of truth so every route's
// social preview is on-brand and consistent. Individual routes call
// `renderOgImage` with their own title / eyebrow / subtitle.
//
// These images are statically generated at build time, so the fonts are
// read from disk with fs (fetching a local file:// URL is not supported
// during prerender).

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

type OgOptions = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
};

async function loadFonts() {
  const dir = join(process.cwd(), 'src/lib/og-fonts');
  const [bold, regular, regularBold] = await Promise.all([
    readFile(join(dir, 'Poppins-700.ttf')),
    readFile(join(dir, 'Inter-400.woff')),
    readFile(join(dir, 'Inter-700.woff')),
  ]);

  return [
    { name: 'Poppins', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Inter', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Inter', data: regularBold, weight: 700 as const, style: 'normal' as const },
  ];
}

export async function renderOgImage({
  title,
  eyebrow,
  subtitle,
}: OgOptions): Promise<ImageResponse> {
  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F4F2FB',
          backgroundImage:
            'radial-gradient(circle at 85% 12%, rgba(255,107,44,0.14), transparent 45%), radial-gradient(circle at 12% 88%, rgba(109,63,232,0.14), transparent 45%)',
          padding: '72px 80px',
          fontFamily: 'Inter',
        }}
      >
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="76" height="76" viewBox="0 0 64 64">
            <path d="M11 17v18c0 13 8 20 20 20 7 0 11-2 13-5" fill="none" stroke="#FF6B2C" strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
            <path d="M43 13v23c0 11 6 18 14 18" fill="none" stroke="#6D3FE8" strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
            <path d="M29 16 57 10" fill="none" stroke="#6D3FE8" strokeWidth="10" strokeLinecap="square" strokeLinejoin="round" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', marginLeft: 22 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                fontFamily: 'Poppins',
                color: '#1F1A36',
                lineHeight: 1.05,
              }}
            >
              Ubunifu
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: 'Poppins',
                color: '#1F1A36',
                letterSpacing: -0.5,
                marginLeft: 10,
              }}
            >
              Technologies
            </div>
          </div>
        </div>

        {/* Title block, pushed toward the bottom */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          {eyebrow ? (
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: '#6D3FE8',
                marginBottom: 20,
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              fontSize: 60,
              fontWeight: 700,
              fontFamily: 'Poppins',
              color: '#1F1A36',
              lineHeight: 1.07,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                display: 'flex',
                fontSize: 27,
                fontWeight: 400,
                color: '#5A5170',
                marginTop: 24,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Bottom accent */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 44 }}>
          <div
            style={{
              height: 8,
              width: 120,
              borderRadius: 8,
              backgroundImage: 'linear-gradient(90deg, #FF6B2C, #6D3FE8)',
            }}
          />
          <div style={{ marginLeft: 24, fontSize: 22, color: '#5A5170' }}>
            ubunifutech.com
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
