import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export async function deployRender({ token, serviceId, commit, fetcher = fetch, sleep = delay }) {
  if (!token || !/^srv-[a-z0-9]+$/.test(serviceId ?? '') || !/^[a-f0-9]{40}$/.test(commit ?? '')) {
    throw new Error('Set RENDER_API_KEY, RENDER_SERVICE_ID and a full RELEASE_COMMIT.');
  }
  const base = `https://api.render.com/v1/services/${serviceId}`;
  async function request(url, init = {}) {
    const response = await fetcher(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30_000) });
    // Provider bodies can contain account details; do not echo them into CI logs.
    if (!response.ok) throw new Error(`Render request failed (${response.status}).`);
    return response.json();
  }
  const service = await request(base);
  if (service.autoDeploy !== 'no' || service.serviceDetails?.plan !== 'free') {
    throw new Error('Staging requires a free Render service with automatic deploys disabled.');
  }
  const created = await request(`${base}/deploys`, { method: 'POST', body: JSON.stringify({ commitId: commit, clearCache: 'do_not_clear' }) });
  if (!/^dep-[a-z0-9]+$/.test(created.id ?? '')) throw new Error('Render returned an invalid deployment ID.');
  for (let attempt = 0; attempt < 120; attempt++) {
    const deploy = await request(`${base}/deploys/${created.id}`);
    if (deploy.commit?.id !== commit) throw new Error('Render deployment does not match the verified commit.');
    if (deploy.status === 'live') return { id: created.id, commit };
    if (['build_failed', 'update_failed', 'canceled', 'deactivated', 'pre_deploy_failed'].includes(deploy.status)) {
      throw new Error(`Render deployment stopped: ${deploy.status}.`);
    }
    await sleep(10_000);
  }
  throw new Error('Render deployment did not become healthy within 20 minutes.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deployRender({ token: process.env.RENDER_API_KEY, serviceId: process.env.RENDER_SERVICE_ID, commit: process.env.RELEASE_COMMIT })
    .then(result => console.log(JSON.stringify({ event: 'staging.api.deployed', ...result })))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
