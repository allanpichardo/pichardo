const config = {
  customSyntax: 'postcss-scss',
  plugins: ['./scripts/stylelint/component-root.mjs'],
  rules: {
    'block-no-empty': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    'property-no-unknown': true,
  },
  overrides: [
    {
      files: ['apps/artist/src/**/*.module.scss'],
      rules: {'artist/component-root': true},
    },
  ],
};

export default config;
