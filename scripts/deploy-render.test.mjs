import test from 'node:test';
import assert from 'node:assert/strict';
import { deployRender } from './deploy-render.mjs';

const commit = 'a'.repeat(40);
function provider(responses) {
  const calls = [];
  return { calls, options: { token: 'test-secret', serviceId: 'srv-test', commit, sleep: async () => {}, fetcher: async (url, init) => {
    calls.push({ url, ...init });
    const value = responses.shift();
    assert.ok(value, 'Unexpected provider request');
    return { ok: true, json: async () => value };
  } } };
}
const service = { autoDeploy: 'no', serviceDetails: { plan: 'free' } };
test('deploys the verified commit and waits for health before promotion', async () => {
  const mock = provider([service, { id: 'dep-test' }, { status: 'build_in_progress', commit: { id: commit } }, { status: 'live', commit: { id: commit } }]);
  assert.deepEqual(await deployRender(mock.options), { id: 'dep-test', commit });
  assert.equal(JSON.parse(mock.calls[1].body).commitId, commit);
  assert.equal(mock.calls.filter(call => call.method === 'POST').length, 1);
});
test('rejects a different deployed commit even if Render reports it live', async () => {
  const mock = provider([service, { id: 'dep-test' }, { status: 'live', commit: { id: 'b'.repeat(40) } }]);
  await assert.rejects(deployRender(mock.options), /does not match/);
});
test('stops on build failure without re-triggering deployment', async () => {
  const mock = provider([service, { id: 'dep-test' }, { status: 'build_failed', commit: { id: commit } }]);
  await assert.rejects(deployRender(mock.options), /build_failed/);
  assert.equal(mock.calls.filter(call => call.method === 'POST').length, 1);
});
test('refuses paid services and automatic deployments before changing anything', async () => {
  for (const value of [{ autoDeploy: 'yes', serviceDetails: { plan: 'free' } }, { autoDeploy: 'no', serviceDetails: { plan: 'starter' } }]) {
    const mock = provider([value]);
    await assert.rejects(deployRender(mock.options), /free Render service/);
    assert.equal(mock.calls.length, 1);
  }
});
