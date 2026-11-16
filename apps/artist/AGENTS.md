<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Artist frontend styles

- Write mobile-first styles as required by the root `AGENTS.md`. Use base rules
  for small screens and ascending minimum-width queries for larger layouts.
  Stylelint rejects upper-bound width queries in artist Sass.
- Write component styles in colocated `.module.scss` files. Use one top-level
  class block named exactly after the component, such as `.MediaFigure` in
  `MediaFigure.module.scss`. Apply it to the component's root element with
  ``className={`MediaFigure ${styles.MediaFigure}`}`` so the DOM also has the
  literal component-name class. Preserve other required classes.
- Nest descendant selectors to follow the JSX hierarchy. Nest states and media
  queries inside the selector they affect. Use `&:hover` or `&.active` for states,
  never `&__child` to create a sibling class name.
- Do not escape the component root with `@at-root`, `:global`, reverse parent
  selectors, or selectors for siblings of the root.
- Global design tokens, foundational resets, layout utilities, and keyframe
  definitions are exceptions. Keep global foundations in concern-specific Sass
  partials under `src/styles/`, loaded with `@use` from `src/styles/main.scss`.
- Use the existing color, font, `--step-*`, `--space-*`, and grid variables.
  Use `--media-border-radius` for media frames. `MediaFigure` spans twelve
  columns below `50rem` and is centered at a maximum of six columns above it.
  Its image `aspectRatio` options are `5:4`, `4:5`, and `fit`, the default.
  Load global styles and local fonts only in the frontend layout, never Payload's
  admin layout.
- Run `pnpm lint:styles` and `pnpm test:styles` from the workspace root. Stylelint
  checks the single-root structure. Review correspondence with the DOM manually.

See [the design-system guide](../../docs/design-system.md) for token usage and a
JSX and SCSS example.
