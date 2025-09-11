/**
 * Media passthrough service
 *
 * We no longer rehost images to UploadThing during import. The frontend reader
 * consumes and displays remote links directly. This service now always
 * returns the original URL with a best-effort content type guess.
 */

export type RehostResult = { url: string | null; type: string | null };

function guessContentTypeFromUrl(u: string | null): string | null {
  if (!u) return null;
  const ext = u.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    ico: 'image/x-icon',
  };
  return (ext && map[ext]) || null;
}

export async function rehostImageIfConfigured(url: string | null): Promise<RehostResult> {
  // Passthrough: keep original link; frontend reader will render it.
  if (!url) return { url: null, type: null };
  return { url: String(url).trim(), type: guessContentTypeFromUrl(url) || 'image' };
}
