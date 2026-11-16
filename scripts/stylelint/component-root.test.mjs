import assert from 'node:assert/strict';
import {test} from 'node:test';
import stylelint from 'stylelint';
import config from '../../stylelint.config.mjs';

const valid = [
  '.Card { color: red; .header { h2 { color: blue; } } }',
  '.Card { &:hover { color: red; } &.active { color: blue; } }',
  '.Card { @media (width > 40rem) { .header { color: red; } } }',
  '.Card { @supports (display: grid) { display: grid; } }',
  '.Card { .item { & + .item { margin-top: 1rem; } } }',
  '.Card { & > .item + .item { margin-top: 1rem; } }',
  '@use "tokens"; .Card { color: red; }',
  '.Card { animation: pulse 1s; } @keyframes pulse { to { opacity: 0; } }',
];

const invalid = [
  '.Card { color: red; } .title { color: blue; }',
  '.Card { color: red; } .Card .title { color: blue; }',
  'h1 { color: red; }',
  '.Card .title { color: red; }',
  '.Card, .panel { color: red; }',
  '@media (width > 40rem) { .Card { color: red; } }',
  '.Card { color: red; } @media (width > 40rem) { .Card { color: blue; } }',
  '.Card { @at-root .title { color: red; } }',
  '.Card { :global(body) { color: red; } }',
  '.Card { &__title { color: red; } }',
  '.Card { .outside & { color: red; } }',
  '.Card { &:hover + .outside { color: red; } }',
  '.Card { & ~ .outside { color: red; } }',
  '.Card { :not(&) { color: red; } }',
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
    'apps/artist/src/styles/main.scss',
  );
  assert.equal(
    result.errored,
    false,
    JSON.stringify(result.results[0].warnings),
  );
});

test('requires the root class to match the component module name', async () => {
  const filename =
    'apps/artist/src/components/MediaFigure/MediaFigure.module.scss';
  const wrong = await lint('.figure { min-width: 0; }', filename);
  assert.equal(wrong.errored, true);
  assert.ok(
    wrong.results[0].warnings.some(
      (warning) =>
        warning.rule === 'artist/component-root' &&
        warning.text.includes('.MediaFigure'),
    ),
  );
  const correct = await lint('.MediaFigure { min-width: 0; }', filename);
  assert.equal(correct.errored, false);
});
