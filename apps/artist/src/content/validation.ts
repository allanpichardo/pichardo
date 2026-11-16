export const reservedPageSlugs = new Set([
  'admin',
  'api',
  'blog',
  'work',
  'events',
  'health',
  'styleguide',
  '_next',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
]);

export function validateSlug(value: unknown, isPage = false) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    return 'Use lowercase letters, numbers, and hyphens for the slug.';
  }
  return isPage && reservedPageSlugs.has(value)
    ? 'This slug is reserved for a site route.'
    : true;
}

export function validateURL(value: unknown) {
  if (!value) return true;
  if (typeof value !== 'string') return 'Enter an HTTP or HTTPS URL.';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? true
      : 'Enter an HTTP or HTTPS URL without credentials.';
  } catch {
    return 'Enter an HTTP or HTTPS URL.';
  }
}

export function validateRequiredURL(value: unknown) {
  return value ? validateURL(value) : 'Enter an HTTP or HTTPS URL.';
}

export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function validTimezone(value: unknown) {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en', {timeZone: value});
    return true;
  } catch {
    return false;
  }
}

export function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    isDateOnly(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  );
}
