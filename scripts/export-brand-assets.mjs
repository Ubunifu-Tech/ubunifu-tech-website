import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const brandDir = path.join(root, 'public', 'brand');
const pngDir = path.join(brandDir, 'png');

const [markSource, lockupSource] = await Promise.all([
  readFile(path.join(brandDir, 'ubunifu-mark.svg'), 'utf8'),
  readFile(path.join(brandDir, 'ubunifu-lockup.svg'), 'utf8'),
]);

const paths = [...markSource.matchAll(/<path\b[^>]*\/>/g)].map((match) => match[0]);
const fontStyle = lockupSource.match(/<style>([\s\S]*?)<\/style>/)?.[1]?.trim();

if (paths.length !== 3 || !fontStyle) {
  throw new Error('Could not read the canonical mark paths or embedded wordmark fonts.');
}

const title = (name, description) => `
  <title id="title">${name}</title>
  <desc id="desc">${description}</desc>`;

const svg = (viewBox, body, name, description, style = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="title desc">
${title(name, description)}
${style ? `  <style>${style}</style>\n` : ''}${body}
</svg>
`;

const wordmark = (opacity = 1, colorMode = 'brand') => {
  const ubunifu = colorMode === 'white' ? '#FFFFFF' : '#C24715';
  const technologies = colorMode === 'white' ? '#FFFFFF' : '#6D3FE8';
  return `  <text x="8" y="53" opacity="${opacity}" font-family="Ubunifu Poppins, sans-serif" font-size="40" letter-spacing="0"><tspan fill="${ubunifu}" font-weight="700">Ubunifu</tspan><tspan dx="7" fill="${technologies}" font-weight="600">Technologies</tspan></text>`;
};

const compactWordmark = (opacity = 1) =>
  `  <text x="87" y="59" opacity="${opacity}" font-family="Ubunifu Poppins, sans-serif" font-size="31" letter-spacing="0"><tspan fill="#C24715" font-weight="700">Ubunifu</tspan><tspan dx="5" fill="#6D3FE8" font-weight="600">Technologies</tspan></text>`;

const markGroup = (transform = '', opacity = 1) =>
  `  <g${transform ? ` transform="${transform}"` : ''} opacity="${opacity}">\n    ${paths.join('\n    ')}\n  </g>`;

const assets = {
  'ubunifu-wordmark.svg': svg(
    '0 0 470 76',
    wordmark(),
    'Ubunifu Technologies wordmark',
    'Ubunifu in accessible orange and Technologies in violet.',
    fontStyle,
  ),
  'ubunifu-wordmark-white.svg': svg(
    '0 0 470 76',
    wordmark(1, 'white'),
    'Ubunifu Technologies reversed wordmark',
    'The full Ubunifu Technologies wordmark in white.',
    fontStyle,
  ),
  'ubunifu-lockup-stacked.svg': svg(
    '0 0 500 210',
    `${markGroup('translate(218 14)')}\n  <g transform="translate(33 105) scale(.92)">\n${wordmark()}\n  </g>`,
    'Ubunifu Technologies stacked logo',
    'The orange-and-violet ligature centred above the full two-colour wordmark.',
    fontStyle,
  ),
  'ubunifu-watermark.svg': svg(
    '0 0 160 160',
    markGroup('translate(16 16) scale(2)', 0.12),
    'Ubunifu Technologies watermark mark',
    'A low-opacity orange-and-violet ligature for use as a watermark.',
  ),
  'ubunifu-watermark-lockup.svg': svg(
    '0 0 500 96',
    `${markGroup('translate(10 16) scale(.95)', 0.12)}\n${compactWordmark(0.12)}`,
    'Ubunifu Technologies watermark lockup',
    'A low-opacity horizontal logo for use as a watermark.',
    fontStyle,
  ),
};

await mkdir(pngDir, { recursive: true });
await Promise.all(
  Object.entries(assets).map(([filename, source]) =>
    writeFile(path.join(brandDir, filename), source),
  ),
);

const rasterExports = [
  ['ubunifu-mark.svg', 'ubunifu-mark-1024.png', 1024],
  ['ubunifu-lockup.svg', 'ubunifu-lockup-1600.png', 1600],
  ['ubunifu-wordmark.svg', 'ubunifu-wordmark-1600.png', 1600],
  ['ubunifu-lockup-stacked.svg', 'ubunifu-lockup-stacked-1200.png', 1200],
  ['ubunifu-watermark.svg', 'ubunifu-watermark-1200.png', 1200],
  ['ubunifu-watermark-lockup.svg', 'ubunifu-watermark-lockup-1600.png', 1600],
];

await Promise.all(
  rasterExports.map(async ([input, output, width]) => {
    const source = await readFile(path.join(brandDir, input));
    await sharp(source, { density: 300 })
      .resize({ width, withoutEnlargement: false })
      .png({ compressionLevel: 9 })
      .toFile(path.join(pngDir, output));
  }),
);

console.log(`Exported ${Object.keys(assets).length} SVG variants and ${rasterExports.length} transparent PNG files.`);
