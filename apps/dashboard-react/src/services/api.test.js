import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveApiUrl } from './api.js';

test('resolveApiUrl returns the explicit backend URL when configured', () => {
  assert.equal(resolveApiUrl('/login', 'http://localhost:3000'), 'http://localhost:3000/login');
});

test('resolveApiUrl keeps a relative route when using the dev proxy', () => {
  assert.equal(resolveApiUrl('/health', ''), '/health');
});
