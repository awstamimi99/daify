import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const base = 'apps/web/.netlify';
const manifest = JSON.parse(await readFile(join(base, 'functions/manifest.json'), 'utf8'));
const handler = manifest.functions.find(fn => fn.name === '___netlify-server-handler');
assert.ok(handler, 'Netlify server function is missing.');
assert.equal(handler.runtimeVersion, 'nodejs24.x');
assert.ok((await stat(handler.path)).size > 0, 'Packaged server function is empty.');

const edge = JSON.parse(await readFile(join(base, 'edge-functions-dist/manifest.json'), 'utf8'));
for (const path of ['/dashboard', '/admin']) {
  assert.ok(edge.routes.some(route => new RegExp(route.pattern).test(path)), `Missing edge protection for ${path}.`);
}

async function* files(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.isFile()) yield path;
  }
}

// Scan only public assets and prerendered responses; server functions must retain
// server code. No real deployment credentials are needed for the CI canary build.
let publicFiles = 0;
for (const directory of ['static', 'deploy']) {
  const root = join(base, directory);
  for await (const path of files(root)) {
    const name = relative(root, path).replaceAll('\\', '/');
    assert.ok(!/(^|\/)(\.env(?:\.[^/]*)?|node_modules|\.next|\.git)(\/|$)/.test(name), `Server-only file in public output: ${name}`);
    if (process.env.PROXY_SIGNING_KEY) {
      const content = await readFile(path);
      assert.ok(!content.includes(Buffer.from(process.env.PROXY_SIGNING_KEY)), `Signing key in public output: ${name}`);
    }
    publicFiles++;
  }
}
assert.ok(publicFiles > 0, 'Public assets are missing.');

// Native packages are built for the runner. Release packaging must run on Linux,
// as configured in staging.yml, rather than uploading a local macOS artifact.
const nativeFiles = [];
for await (const path of files(join(base, 'functions-internal/___netlify-server-handler'))) {
  if (path.endsWith('.node') && path.includes('sharp-')) nativeFiles.push(path);
}
assert.ok(nativeFiles.some(path => path.includes(`sharp-${process.platform}-${process.arch}`)), 'Sharp native dependency does not match the packaging runner.');
console.log(`Netlify artifact passed: Node 24 function, protected edge routes, ${publicFiles} public files, native Sharp (${process.platform}/${process.arch})${process.env.PROXY_SIGNING_KEY ? ', signing-key isolation' : ''}.`);
