import {describe, expect, it} from 'vitest';
import {getEnvironment} from './environment';

const valid = {
  DATABASE_URL: 'postgresql://user:password@localhost/artist_test',
  PAYLOAD_SECRET: 'disposable-test-secret-with-32-characters',
  ARTIST_URL: 'https://allanpichardo.com',
};

describe('artist environment', () => {
  it('rejects missing or invalid persistence and secret configuration', () => {
    expect(() => getEnvironment({})).toThrow('DATABASE_URL');
    expect(() =>
      getEnvironment({...valid, DATABASE_URL: 'https://example.com'}),
    ).toThrow('PostgreSQL');
    expect(() => getEnvironment({...valid, PAYLOAD_SECRET: 'short'})).toThrow(
      '32 characters',
    );
    expect(() => getEnvironment({...valid, ARTIST_URL: 'file:///tmp'})).toThrow(
      'HTTP',
    );
  });

  it('requires an explicit production origin and disables production schema push', () => {
    expect(() =>
      getEnvironment({...valid, NODE_ENV: 'production', ARTIST_URL: ''}),
    ).toThrow('ARTIST_URL');
    expect(
      getEnvironment({
        ...valid,
        NODE_ENV: 'production',
        PAYLOAD_DB_PUSH: 'true',
      }).push,
    ).toBe(false);
    expect(
      getEnvironment({...valid, NODE_ENV: 'test', PAYLOAD_DB_PUSH: 'true'})
        .push,
    ).toBe(false);
  });

  it('enables schema push only for development and permits opting out', () => {
    expect(getEnvironment({...valid, NODE_ENV: 'development'}).push).toBe(true);
    expect(
      getEnvironment({
        ...valid,
        NODE_ENV: 'development',
        PAYLOAD_DB_PUSH: 'false',
      }).push,
    ).toBe(false);
  });

  it('uses secure cookies only for HTTPS and resolves media paths', () => {
    expect(getEnvironment(valid).secureCookies).toBe(true);
    const local = getEnvironment({
      ...valid,
      ARTIST_URL: 'http://localhost:3000',
      MEDIA_DIR: '/tmp/test-media',
    });
    expect(local.secureCookies).toBe(false);
    expect(local.mediaDir).toBe('/tmp/test-media');
  });
});
