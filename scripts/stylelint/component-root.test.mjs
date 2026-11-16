import assert from 'node:assert/strict';
import {test} from 'node:test';
import stylelint from 'stylelint';
import config from '../../stylelint.config.mjs';

const valid = [
  '.card { color: red; .header { h2 { color: blue; } } }',
  '.card { &:hover { color: red; } &.active { color: blue; } }',
  '.card { @media (width > 40rem) { .header { color: red; } } }',
  '.card { @supports (display: grid) { display: grid; } }',
  '.card { .item { & + .item { margin-top: 1rem; } } }',
  '.card { & > .item + .item { margin-top: 1rem; } }',
  '@use "tokens"; .card { color: red; }',
  '.card { animation: pulse 1s; } @keyframes pulse { to { opacity: 0; } }',
];

const invalid = [
  '.card { color: red; } .title { color: blue; }',
  '.card { color: red; } .card .title { color: blue; }',
  'h1 { color: red; }',
  '.card .title { color: red; }',
  '.card, .panel { color: red; }',
  '@media (width > 40rem) { .card { color: red; } }',
  '.card { color: red; } @media (width > 40rem) { .card { color: blue; } }',
  '.card { @at-root .title { color: red; } }',
  '.card { :global(body) { color: red; } }',
  '.card { &__title { color: red; } }',
  '.card { .outside & { color: red; } }',
  '.card { &:hover + .outside { color: red; } }',
  '.card { & ~ .outside { color: red; } }',
  '.card { :not(&) { color: red; } }',
];

async function lint(
  code,
  codeFilename = 'apps/artist/src/components/Card.module.scss',
) {
  return stylelint.lint({code, codeFilename, config});
}

for (const code of valid) {
  test(`accepts ${code}`, async () => {
    const result = await lint(code);
    assert.equal(
      result.errored,
      false,
      JSON.stringify(result.results[0].warnings),
    );
  });
}

for (const code of invalid) {
  test(`rejects ${code}`, async () => {
    const result = await lint(code);
    assert.equal(result.errored, true);
    assert.ok(
      result.results[0].warnings.some(
        (warning) => warning.rule === 'artist/component-root',
      ),
    );
  });
}

test('exempts global foundations from the component-root rule', async () => {
  const result = await lint(
    ':root { --color-text: navy; } .u-container { margin-inline: auto; }',
    'apps/artist/src/styles/globals.scss',
  );
  assert.equal(
    result.errored,
    false,
    JSON.stringify(result.results[0].warnings),
  );
});
