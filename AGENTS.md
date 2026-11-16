# Frontend styles

- Write all CSS and Sass mobile-first in both apps. Put small-screen styles in
  the base rules, then add larger layouts with ascending `min-width` media
  queries or equivalent lower-bound range queries. Do not use `max-width` media
  queries or upper-bound width ranges. Other conditions, such as reduced motion,
  remain available.
- Follow each app's local instructions. The artist app uses colocated Sass
  modules, shared design tokens, and Stylelint checks. Run `pnpm lint:styles`
  and `pnpm test:styles` after changing artist styles or style rules.
