import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { MediaStorageService } from './media-storage.service';

describe('Menu image validation', () => {
  const service = new MediaStorageService(new ConfigService({ NODE_ENV: 'test' }));
  it('rotates orientation into pixels and removes original metadata', async () => {
    const original = await sharp({ create: { width: 32, height: 16, channels: 3, background: '#ffa500' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const image = await service.process(original.toString('base64'), 'image/jpeg');
    const metadata = await sharp(image.buffer).metadata();
    expect([metadata.width, metadata.height]).toEqual([16, 32]);
    expect(metadata.exif).toBeUndefined(); expect(metadata.orientation).toBeUndefined();
  });
  it('rejects compressed pixel bombs and oversized encoded input', async () => {
    const oversizedPixels = await sharp({ create: { width: 4000, height: 4000, channels: 3, background: '#fff' } }).png().toBuffer();
    expect(oversizedPixels.length).toBeLessThan(2 * 1024 * 1024);
    await expect(service.process(oversizedPixels.toString('base64'), 'image/png')).rejects.toThrow('12 megapixels');
    await expect(service.process(Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64'), 'image/png')).rejects.toThrow('2 MB');
  });
  it('rejects corrupted images without retaining an occupied processing slot', async () => {
    for (let i = 0; i < 3; i++) await expect(service.process(Buffer.from('corrupt').toString('base64'), 'image/png')).rejects.toThrow('valid JPEG');
    const valid = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#fff' } }).png().toBuffer();
    await expect(service.process(valid.toString('base64'), 'image/png')).resolves.toMatchObject({ width: 1, height: 1 });
  });
});
