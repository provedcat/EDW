import test from 'node:test';
import assert from 'node:assert/strict';
import { captureToken, Api, TOKEN_KEY } from '../js/api.js';

test('captures a long fragment token and removes it', () => {
  const values = new Map();
  const storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) };
  const history = { replaceState: (...args) => history.args = args };
  const token = 'x'.repeat(40);
  assert.equal(captureToken({ hash: `#sync=${token}`, pathname: '/EDW/', search: '' }, storage, history), token);
  assert.equal(values.get(TOKEN_KEY), token);
  assert.equal(history.args[2], '/EDW/');
});

test('API sends publishable key and sync token only in POST body', async () => {
  let request;
  const token = 'x'.repeat(40);
  const api = new Api(token, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ data: 1 }) };
  });
  await api.call('get_day', { date: '2026-08-19' });
  assert.ok(request.options.headers.apikey.startsWith('sb_publishable_'));
  assert.doesNotMatch(request.url, new RegExp(token));
  const body = JSON.parse(request.options.body);
  assert.equal(body.sync_token, token);
  assert.equal(body.action, 'get_day');
});
