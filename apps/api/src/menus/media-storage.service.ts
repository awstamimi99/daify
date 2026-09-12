import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class MediaStorageService {
  private readonly client?: S3Client;
  private processing = 0;
  constructor(private readonly config: ConfigService) {
    if (config.get('MEDIA_STORAGE') === 's3') this.client = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'), region: config.get<string>('S3_REGION') ?? 'auto',
      forcePathStyle: true, maxAttempts: 2,
      credentials: { accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'), secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY') },
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    });
    else if (config.get('NODE_ENV') === 'production') throw new Error('Production media requires an S3-compatible object store.');
  }
  private filename(key: string) {
    if (!/^[a-f0-9-]{36}\.jpg$/.test(key)) throw new Error('Invalid object key');
    return resolve(this.config.get<string>('MEDIA_LOCAL_DIR') ?? '.data/media', key);
  }
  onModuleDestroy() { this.client?.destroy(); }
  async process(data: string, mimeType: string) {
    if (this.processing >= 2) throw new ServiceUnavailableException('Image processing is busy. Please retry shortly.');
    this.processing++;
    try {
      const input = Buffer.from(data, 'base64');
      if (!input.length || input.length > 2 * 1024 * 1024 || input.toString('base64') !== data) throw new Error('Invalid size or encoding');
      const decoder = sharp(input, { limitInputPixels: 12_000_000, failOn: 'warning' });
      const metadata = await decoder.metadata();
      const format = ({ 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[mimeType];
      if (!format || metadata.format !== format || (metadata.pages ?? 1) > 1) throw new Error('Invalid image format');
      // Re-encoding intentionally drops EXIF and other original metadata.
      const { data: bytes, info } = await decoder.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
      if (bytes.length > 2 * 1024 * 1024) throw new Error('Image is too large');
      return { buffer: bytes, objectKey: `${randomUUID()}.jpg`, mimeType: 'image/jpeg', bytes: bytes.length, width: info.width, height: info.height, sha256: createHash('sha256').update(bytes).digest('hex') };
    } catch { throw new BadRequestException('Upload a valid JPEG, PNG or WebP image up to 2 MB and 12 megapixels. Animated images are not supported.'); }
    finally { this.processing--; }
  }
  async put(key: string, bytes: Buffer) {
    try {
      if (this.client) await this.client.send(new PutObjectCommand({ Bucket: this.config.getOrThrow<string>('S3_BUCKET'), Key: key, Body: bytes, ContentType: 'image/jpeg' }), { abortSignal: AbortSignal.timeout(10_000) });
      else { const file = this.filename(key); await mkdir(resolve(file, '..'), { recursive: true }); await writeFile(file, bytes, { flag: 'wx' }); }
    } catch { throw new ServiceUnavailableException('Image storage is unavailable. Please retry.'); }
  }
  async get(key: string) {
    try {
      if (this.client) {
        const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.getOrThrow<string>('S3_BUCKET'), Key: key }), { abortSignal: AbortSignal.timeout(10_000) });
        return Buffer.from(await result.Body!.transformToByteArray());
      }
      return await readFile(this.filename(key));
    } catch { throw new ServiceUnavailableException('The image could not be loaded.'); }
  }
  async remove(key: string) {
    if (this.client) await this.client.send(new DeleteObjectCommand({ Bucket: this.config.getOrThrow<string>('S3_BUCKET'), Key: key }), { abortSignal: AbortSignal.timeout(10_000) });
    else await unlink(this.filename(key));
  }
}
