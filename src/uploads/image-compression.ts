import { unlink, rename } from 'fs/promises';
import { dirname, extname, join, basename } from 'path';
import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 80;
// Guard against decompression bombs: a small (≤5MB) but extremely high-pixel
// image can allocate huge buffers on decode and OOM the container before the
// resize runs. 25MP covers any phone camera; anything larger is rejected.
const MAX_INPUT_PIXELS = 25_000_000;

/**
 * Compress a freshly-saved upload in place: auto-orient, flatten transparency
 * onto white, resize so the longest edge is <= MAX_EDGE (never upscaling), and
 * re-encode to JPEG. Returns the FINAL filename (always `<uuid>.jpg`).
 *
 * sharp cannot read and write the same path in a single pass, so:
 *  - non-jpg source: write `<uuid>.jpg`, then unlink the original `<uuid><ext>`.
 *  - jpg source: write `<uuid>.tmp.jpg`, then rename it over `<uuid>.jpg`.
 *
 * On any sharp failure (corrupt payload that slipped past the mime filter), the
 * original file is removed and a 400 is thrown — never leave a broken file or
 * return a URL to one.
 */
export async function compressImage(
  file: Express.Multer.File,
): Promise<string> {
  const inputPath = file.path;
  const dir = dirname(inputPath);
  const ext = extname(file.filename).toLowerCase();
  const base = basename(file.filename, ext); // the UUID
  const finalName = `${base}.jpg`;
  const finalPath = join(dir, finalName);
  const isJpeg = ext === '.jpg' || ext === '.jpeg';
  const writePath = isJpeg ? join(dir, `${base}.tmp.jpg`) : finalPath;

  try {
    await sharp(inputPath, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'none' })
      .rotate()
      .flatten({ background: '#ffffff' })
      .resize(MAX_EDGE, MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(writePath);
  } catch {
    await unlink(inputPath).catch(() => undefined);
    await unlink(writePath).catch(() => undefined);
    throw new BadRequestException('Invalid image');
  }

  if (isJpeg) {
    // input and final share the same path; swap the temp file over it.
    await rename(writePath, finalPath);
  } else {
    // original has a different extension; remove it.
    await unlink(inputPath).catch(() => undefined);
  }

  return finalName;
}
