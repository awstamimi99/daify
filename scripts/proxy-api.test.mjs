import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const bundled = await build({ entryPoints: ['apps/web/src/lib/proxy-api.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['next/*'], plugins: [{ name: 'server-only-test', setup(builder) {
  builder.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'empty' }));
  builder.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '' }));
} }] });
const require = createRequire(import.meta.url);
function proxy(fetcher) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', bundled.outputFiles[0].text)(require, module, module.exports, fetcher);
  return module.exports.forwardApiRequest;
}
test('timed-out mutations are never automatically replayed or reported as completed', async () => {
  let calls = 0;
  const forward = proxy(async () => { calls++; throw new DOMException('timeout', 'TimeoutError'); });
  const response = await forward(new Request('http://localhost:3000/api/auth/signup', { method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: '{"email":"test@example.com"}' }), '/api/v1/auth/signup');
  assert.equal(calls, 1);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('retry-after'), '15');
  assert.match((await response.json()).detail, /check its status before submitting again/);
});
test('cold read failure provides a retry state and the next explicit request recovers', async () => {
  let calls = 0;
  const forward = proxy(async () => {
    if (++calls === 1) throw new TypeError('connection unavailable');
    return Response.json({ status: 'ok' });
  });
  const request = new Request('http://localhost:3000/api/account');
  const first = await forward(request, '/api/v1/auth/me');
  assert.equal(first.status, 503);
  assert.match((await first.json()).detail, /starting up/);
  assert.equal(calls, 1);
  const second = await forward(request, '/api/v1/auth/me');
  assert.equal(second.status, 200);
  assert.equal(calls, 2);
});
test('cross-origin mutations are rejected before contacting the API', async () => {
  const forward = proxy(async () => { assert.fail('Must not contact API'); });
  const response = await forward(new Request('http://localhost:3000/api/auth/signup', { method: 'POST', headers: { origin: 'https://attacker.example', 'content-type': 'application/json' }, body: '{}' }), '/api/v1/auth/signup');
  assert.equal(response.status, 403);
});
