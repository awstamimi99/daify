import { ConfigService } from '@nestjs/config';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { MediaStorageService } from './media-storage.service';

describe('S3-compatible image transport over a local HTTP server', () => {
  let server: Server;
  let service: MediaStorageService;
  const objects = new Map<string, Buffer>();
  const requests: { method: string; headers: IncomingHttpHeaders; path: string }[] = [];
  const key = '00000000-0000-4000-8000-000000000001.jpg';

  beforeAll(async () => {
    server = createServer((request, response) => {
      const path = request.url!.split('?')[0]!;
      requests.push({ method: request.method!, headers: request.headers, path });
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        if (path.includes('denied')) {
          response.writeHead(403, { 'content-type': 'application/xml' });
          response.end('<Error><Code>AccessDenied</Code><Message>synthetic-private-provider-detail</Message></Error>');
        } else if (request.method === 'PUT') {
          objects.set(path, Buffer.concat(chunks)); response.writeHead(200); response.end();
        } else if (request.method === 'DELETE') {
          objects.delete(path); response.writeHead(204); response.end();
        } else if (objects.has(path)) {
          response.writeHead(200, { 'content-type': 'image/jpeg' }); response.end(objects.get(path));
        } else {
          response.writeHead(404, { 'content-type': 'application/xml' });
          response.end('<Error><Code>NoSuchKey</Code></Error>');
        }
      });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    service = new MediaStorageService(new ConfigService({
      NODE_ENV: 'test', MEDIA_STORAGE: 's3', S3_ENDPOINT: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      S3_REGION: 'eu-central-1', S3_BUCKET: 'private-images', S3_ACCESS_KEY_ID: 'synthetic-access', S3_SECRET_ACCESS_KEY: 'synthetic-secret',
    }));
  });

  afterAll(async () => {
    service.onModuleDestroy();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  it('uploads, streams and deletes through signed, path-style requests without a public ACL', async () => {
    const bytes = Buffer.from([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    await service.put(key, bytes);
    expect(await service.get(key)).toEqual(bytes);
    await service.remove(key);
    expect(objects.size).toBe(0);
    expect(requests.map(request => request.method)).toEqual(['PUT', 'GET', 'DELETE']);
    expect(requests[0]!.headers['content-type']).toBe('image/jpeg');
    for (const request of requests) {
      expect(request.path).toBe(`/private-images/${key}`);
      expect(request.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=synthetic-access\/[0-9]{8}\/eu-central-1\/s3\/aws4_request,/);
      expect(request.headers.authorization).not.toContain('synthetic-secret');
      expect(request.headers['x-amz-acl']).toBeUndefined();
    }
    await expect(service.get(key)).rejects.toThrow('The image could not be loaded.');
  });

  it('redacts provider failures for upload, read and cleanup instead of reporting success', async () => {
    for (const operation of [() => service.put('denied.jpg', Buffer.from('test')), () => service.get('denied.jpg'), () => service.remove('denied.jpg')]) {
      await expect(operation()).rejects.toMatchObject({ status: 503 });
      await expect(operation()).rejects.not.toThrow('synthetic-private-provider-detail');
    }
  });

  it('refuses ephemeral local media storage in production', () => {
    expect(() => new MediaStorageService(new ConfigService({ NODE_ENV: 'production' }))).toThrow('Production media requires');
  });
});
