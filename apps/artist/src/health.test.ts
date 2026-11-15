import {describe, expect, it} from 'vitest';
import {healthResponse} from './health';

describe('artist readiness', () => {
  it('returns uncached success only after the dependency check completes', async () => {
    const response = await healthResponse(() => Promise.resolve());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({status: 'ok'});
  });

  it('returns an uncached generic error without sensitive details', async () => {
    const response = await healthResponse(() =>
      Promise.reject(new Error('sensitive database credentials')),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({status: 'unavailable'});
  });
});
