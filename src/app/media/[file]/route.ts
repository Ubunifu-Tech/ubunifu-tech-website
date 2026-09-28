import { serveMedia } from '@/lib/console/media';

/**
 * A website image, on our own domain: ubunifutech.com/media/<id>.<ext>.
 *
 * Public by design and cached for an hour by browsers and the CDN, so an
 * image taken off the site stops being served soon after. See
 * src/lib/console/media.ts for why it can only ever serve MediaAsset rows.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  return serveMedia(file);
}
