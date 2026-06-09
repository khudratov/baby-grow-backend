import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { compressImage } from './image-compression';

function fakeMulterFile(filePath: string): Express.Multer.File {
  return {
    path: filePath,
    filename: path.basename(filePath),
    destination: path.dirname(filePath),
    originalname: path.basename(filePath),
    fieldname: 'file',
    encoding: '7bit',
    mimetype: 'image/png',
    size: fs.statSync(filePath).size,
    stream: undefined as any,
    buffer: undefined as any,
  };
}

describe('compressImage', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'compress-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('converts a large PNG to a smaller .jpg and removes the original', async () => {
    const src = path.join(dir, 'abc.png');
    // 3000x3000 opaque red PNG — large enough that JPEG@q80 ≤1600px is smaller.
    await sharp({
      create: { width: 3000, height: 3000, channels: 3, background: '#ff0000' },
    })
      .png()
      .toFile(src);
    const originalSize = fs.statSync(src).size;

    const filename = await compressImage(fakeMulterFile(src));

    expect(filename).toBe('abc.jpg');
    const outPath = path.join(dir, 'abc.jpg');
    expect(fs.existsSync(outPath)).toBe(true);
    expect(fs.existsSync(src)).toBe(false); // original .png removed
    expect(fs.statSync(outPath).size).toBeLessThan(originalSize);

    const meta = await sharp(outPath).metadata();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1600);
  });

  it('re-encodes a .jpg in place (same filename)', async () => {
    const src = path.join(dir, 'def.jpg');
    await sharp({
      create: { width: 2000, height: 2000, channels: 3, background: '#00ff00' },
    })
      .jpeg({ quality: 100 })
      .toFile(src);

    const filename = await compressImage(fakeMulterFile(src));

    expect(filename).toBe('def.jpg');
    expect(fs.existsSync(src)).toBe(true);
    const meta = await sharp(src).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1600);
  });

  it('does not upscale images smaller than the cap', async () => {
    const src = path.join(dir, 'small.png');
    await sharp({
      create: { width: 200, height: 100, channels: 3, background: '#0000ff' },
    })
      .png()
      .toFile(src);

    await compressImage(fakeMulterFile(src));

    const meta = await sharp(path.join(dir, 'small.jpg')).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it('throws and cleans up when the file is not a valid image', async () => {
    const src = path.join(dir, 'bad.png');
    fs.writeFileSync(src, Buffer.from('this is not an image'));

    await expect(compressImage(fakeMulterFile(src))).rejects.toThrow();
    expect(fs.existsSync(src)).toBe(false); // cleaned up
    expect(fs.existsSync(path.join(dir, 'bad.jpg'))).toBe(false);
  });
});
