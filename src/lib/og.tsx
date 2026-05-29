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
  const [bold, regular] = await Promise.all([
    readFile(join(dir, 'Outfit-700.woff')),
    readFile(join(dir, 'Outfit-400.woff')),
  ]);

  return [
    { name: 'Outfit', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Outfit', data: regular, weight: 400 as const, style: 'normal' as const },
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
          fontFamily: 'Outfit',
        }}
      >
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 76,
              height: 76,
              borderRadius: 18,
              backgroundImage: 'linear-gradient(135deg, #FF6B2C, #6D3FE8)',
              color: '#ffffff',
              fontSize: 42,
              fontWeight: 700,
            }}
          >
            U
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 22 }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#1F1A36',
                lineHeight: 1.05,
              }}
            >
              Ubunifu
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 6,
                color: '#FF6B2C',
              }}
            >
              TECHNOLOGIES
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
          <div style={{ marginLeft: 24, fontSize: 22, color: '#8B82A0' }}>
            ubunifutech.com
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
