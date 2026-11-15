import {expect, test} from 'vitest';
import {GET} from './route';

test('returns a generic uncached health response', async () => {
  const response = GET();

  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({status: 'ok'});
});
