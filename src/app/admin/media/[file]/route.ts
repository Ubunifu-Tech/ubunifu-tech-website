import { serveMedia } from '@/lib/console/media';

/**
 * The same images, reached from the console.
 *
 * The console host rewrites /media/<file> to /admin/media/<file>, so a post
 * previewed there asks for its images here. Same bytes, same rules: these are
 * website images and are public wherever they are read from.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  return serveMedia(file);
}
