import assert from 'node:assert/strict';
import test from 'node:test';
import stylelint from 'stylelint';
import config from '../../stylelint.config.mjs';

async function lint(query) {
  return stylelint.lint({
    code: `.Card { @media ${query} { color: red; } }`,
    codeFilename: 'apps/artist/src/components/Card/Card.module.scss',
    config,
  });
}

for (const query of [
  '(min-width: 50rem)',
  '(width >= 50rem)',
  '(width > 50rem)',
  '(50rem <= width)',
  '(50rem < width)',
  'screen and (min-width: 50rem) and (orientation: landscape)',
  '(min-width: 50rem), (prefers-reduced-motion: reduce)',
  '(prefers-reduced-motion: reduce)',
  'print',
  '(max-height: 40rem)',
  '(min-width: 50rem) /* (max-width: 20rem) */',
]) {
  test(`accepts mobile-first query ${query}`, async () => {
    const result = await lint(query);
    assert.equal(
      result.errored,
      false,
      JSON.stringify(result.results[0].warnings),
    );
  });
}

for (const query of [
  '(max-width: 50rem)',
  '(max-device-width: 50rem)',
  '(width < 50rem)',
  '(width <= 50rem)',
  '(50rem > width)',
  '(50rem >= width)',
  '(width = 50rem)',
  '(50rem = width)',
  '(30rem <= width < 50rem)',
  '(50rem > width >= 30rem)',
  '(width /* breakpoint */ <= 50rem)',
  '(min-width: 30rem) and (width < 50rem)',
  '(min-width: 30rem), (max-width: 50rem)',
  'screen and (MAX-WIDTH: 50rem)',
]) {
  test(`rejects upper-bound query ${query}`, async () => {
    const result = await lint(query);
    assert.equal(result.errored, true);
    assert.ok(
      result.results[0].warnings.some(
        (warning) => warning.rule === 'artist/mobile-first',
      ),
    );
  });
}

test('checks global Sass foundations as well as component modules', async () => {
  const result = await stylelint.lint({
    code: '@media (max-width: 50rem) { .u-grid { gap: 1rem; } }',
    codeFilename: 'apps/artist/src/styles/_grid.scss',
    config,
  });
  assert.equal(result.errored, true);
  assert.equal(result.results[0].warnings[0]?.rule, 'artist/mobile-first');
});
