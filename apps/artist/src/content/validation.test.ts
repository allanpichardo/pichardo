import {describe, expect, it} from 'vitest';
import {
  isDateOnly,
  isTimestamp,
  validTimezone,
  validateRequiredURL,
  validateSlug,
} from './validation';

describe('content input validation', () => {
  it('preserves real calendar dates and rejects normalized impossible dates', () => {
    expect(isDateOnly('2024-02-29')).toBe(true);
    expect(isDateOnly('2026-02-29')).toBe(false);
    expect(isDateOnly('2026-02-30')).toBe(false);
    expect(isTimestamp('2026-03-01T13:00:00+02:00')).toBe(true);
    expect(isTimestamp('2026-03-01T11:00:00.000Z')).toBe(true);
    for (const value of [
      '2026-02-30T12:00:00Z',
      '2026-03-01T24:00:00Z',
      'March 1 2026',
      '2026-03-01T12:00:00',
    ])
      expect(isTimestamp(value)).toBe(false);
  });
  it('accepts IANA timezones and reserves system page slugs', () => {
    expect(validTimezone('America/Los_Angeles')).toBe(true);
    expect(validTimezone('Invalid/Zone')).toBe(false);
    expect(validateSlug('blog', true)).not.toBe(true);
    expect(validateSlug('about-me', true)).toBe(true);
    expect(validateSlug('bad/path', true)).not.toBe(true);
    expect(validateRequiredURL('')).not.toBe(true);
    expect(validateRequiredURL('https://example.com')).toBe(true);
  });
});
