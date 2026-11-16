# Artist design system

The artist frontend loads its foundation in `apps/artist/src/app/(frontend)/layout.tsx`.
Payload admin and the professional app use their own layouts and styles.

## Tokens

`apps/artist/src/styles/globals.scss` generates the Utopia scales once. Type
interpolates from a 20px base with a 1.2 ratio at 350px to a 24px base with a 1.25
ratio at 1600px. The type tokens run from `--step--2` through `--step-5`.

Space tokens run from `--space-3xs` through `--space-3xl`. Utopia also generates
adjacent pairs and the custom `--space-s-l` pair. Use these tokens for margins,
padding, and gaps, for example `gap: var(--space-s-m)`.

The palette contains these exact values:

| Token            | Value     |
| ---------------- | --------- |
| `--color-blue`   | `#4B91DC` |
| `--color-purple` | `#840277` |
| `--color-yellow` | `#F2CF1D` |
| `--color-pink`   | `#EB2F86` |
| `--color-navy`   | `#211959` |
| `--color-white`  | `#FFFFFF` |

Use semantic tokens for common roles: `--color-background`, `--color-text`,
`--color-link`, `--color-link-hover`, and `--color-focus`. The default page has a
white background, navy text, and purple underlined links. Selection uses navy on
yellow. Blue, pink, and yellow are available as accents. Check contrast before
using an accent as text or as a background behind text.

## Typography

`--font-heading` loads the local Momo Trust Display regular face. Headings `h1`
through `h6` use `--step-5` through `--step-0`, weight 400, and line-height 1.1.

`--font-body` loads the local DM Mono faces at weights 300, 400, and 500, with
normal and italic styles. Body text, lists, blockquotes, definitions, and controls
inherit this family. The default is `--step-0` at weight 400 and line-height 1.6.
Bold text uses weight 500. Captions and small text use `--step--1`.

Fonts are self-hosted through `next/font/local` with `display: swap`. Momo Trust
Display is preloaded. DM Mono faces load on demand. The original font files and
licenses remain in `apps/artist/src/styles/fonts`.

## Layout

Apply `u-container` to a block to center it with a maximum width of 93rem and
fluid inline padding from `--grid-gutter`. Navigation and main content already
use it. The foundation uses border-box sizing, so this maximum includes padding.

`u-grid` sets `display: grid` and `gap: var(--grid-gutter)`. It does not set column
tracks. A component can choose its own template, including
`repeat(var(--grid-columns), minmax(0, 1fr))` for the supplied 12-column grid.

## Write a component module

Apply one root class to the common ancestor. Nest the rules in the same order as
the DOM hierarchy. In this example, the title belongs inside the header:

```tsx
import styles from './WorkCard.module.scss';

export function WorkCard() {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.title}>Work title</h2>
      </header>
      <p>Work description.</p>
    </article>
  );
}
```

```scss
.card {
  padding: var(--space-s);

  .header {
    .title {
      margin-block-start: 0;
      color: var(--color-purple);
    }
  }

  p {
    margin-block-end: 0;
  }

  @media (min-width: 50rem) {
    padding: var(--space-l);
  }
}
```

Keep pseudo-classes and modifier classes inside the relevant rule. Use
`&:hover` and `&.active`, rather than Sass suffixes such as `&__title`. Put media
queries inside the selector they change. Do not use `:global`, `@at-root`, reverse
parent selectors, or selectors for siblings of the root.

Global token declarations, foundational resets, layout utilities, and keyframes
are exceptions to the component-root convention. Prefer inherited base styles
for standard content elements instead of restating typography in each component.

Run `pnpm lint:styles` to check styles or `pnpm lint` to include code linting.
Run `pnpm test:styles` to check the custom lint rule's passing and failing cases.
The rule validates selector structure. Code review checks that nesting matches
the JSX hierarchy.
