import test from 'node:test';
import assert from 'node:assert/strict';
import { configureBrowserDatabase } from '../apps/web/tests/database-environment.ts';

test('browser seed, API and fixtures use only the explicit test database', () => {
  const environment = {
    DATABASE_URL: 'postgresql://synthetic:secret@hosted.example/production',
    TEST_DATABASE_URL: 'postgresql://synthetic:secret@127.0.0.1:55442/daify_test?schema=public',
  };
  assert.equal(configureBrowserDatabase(environment), environment.TEST_DATABASE_URL);
  assert.equal(environment.DATABASE_URL, environment.TEST_DATABASE_URL);
  for (const host of ['localhost', '[::1]', 'postgres']) {
    assert.doesNotThrow(() => configureBrowserDatabase({ TEST_DATABASE_URL: `postgresql://synthetic@${host}/daify_test` }));
  }
});

test('unsafe browser database configuration stops before writes and never prints credentials', () => {
  for (const input of [undefined, 'invalid-secret-value',
    'https://synthetic:secret@localhost/daify_test',
    'postgresql://synthetic:secret@hosted.example/daify_test',
    'postgresql://synthetic:secret@localhost/production',
    'postgresql://synthetic:secret@localhost/latest',
    'postgresql://synthetic:secret@localhost/daify_test%ZZ',
    'postgresql://synthetic:secret@localhost/daify_test?host=hosted.example',
    'postgresql://synthetic:secret@localhost/daify_test?dbname=production',
    'postgresql://synthetic:secret@localhost/daify_test?schema=private',
    'postgresql://synthetic:secret@localhost/daify_test#fragment',
  ]) {
    const environment = { TEST_DATABASE_URL: input, DATABASE_URL: 'unchanged' };
    assert.throws(() => configureBrowserDatabase(environment), error => {
      assert.equal(error.message.includes('secret'), false);
      assert.equal(error.message.includes('postgresql://'), false);
      return true;
    });
    assert.equal(environment.DATABASE_URL, 'unchanged');
  }
});
