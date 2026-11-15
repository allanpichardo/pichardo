# Architecture and tradeoffs

The artist and professional sites have separate Next.js applications, build outputs, images, and image tags. They can restart and deploy independently. Their public identities and future visual designs differ, so they do not share UI components.

Payload belongs only to the artist application. It supplies authentication, administrative UI, database access, upload authorization, and Sharp image processing. PostgreSQL stores content metadata and administrative records. The professional application compiles trusted local MDX and has no database dependency.

Both applications run Node.js standalone servers. Static pages may still be prerendered by Next.js, but neither application uses static export. The professional site retains route handlers, Server Actions, and future server integrations without changing its deployment model.

## Keep ownership local

Artist collections and environment validation live in the artist workspace. The professional MDX configuration and content live in its workspace. Root files own the workspace, consistent quality checks, and cross-application tests. Infrastructure files own container wiring and manual operating procedures.

There is no shared package yet. The canonical person identifier is `https://allanpichardo.com/#person`. Introduce a small schema package only when both applications consume shared identity or JSON-LD behavior. Similar-looking code alone does not justify a package.

## Preserve content outside containers

PostgreSQL 18 stores data in a named volume mounted at `/var/lib/postgresql`. Artist originals and generated variants live in a configurable host directory mounted at `/app/media`. Container recreation replaces executable code without replacing either store. Next.js's writable runtime cache is disposable and does not require a backup.

PostgreSQL sits on an internal Docker network joined only by artist. Professional has no database credentials or database-network membership. Each app publishes a single loopback port. The host-managed Cloudflare Tunnel supplies external connectivity and TLS, so no project-managed reverse proxy or cloudflared container is required.

Backups must cover the database and media together. The manual procedure pauses artist writes, creates a logical dump and media archive, and restarts artist even on backup failure. Restoration uses fresh isolated resources and checks media hashes. Backups remain the operator's responsibility, including off-server copies.

## Build and migrate explicitly

Next.js output tracing starts at the repository root so workspace dependencies are included. Docker copies standalone output and static assets. The artist tooling target retains the Payload CLI, source configuration, and versioned migrations. It runs one-off maintenance commands on the same network and media mount as artist, without a fourth long-running service.

Production never uses automatic schema push or startup migrations. Deployment applies migrations before replacing artist and stops on failure. An older application image can run only if it understands the current schema. Restoring an image does not restore the database.

Production builds require configuration values to load Payload's code, but do not connect to a database or use production secrets. Docker supplies disposable build values. Runtime containers receive the real configuration through Compose.

## Keep tooling compatible

The pinned toolchain is Node 24.22.3, pnpm 12.18.0, Next.js 16.4.6, React 19.3.1, and Payload 3.93.0. Payload packages use the same exact release. TypeScript 6.0.3, ESLint 9.39.5, and GraphQL 16.15.0 remain within the selected dependencies' supported peer ranges. A newer major is not automatically compatible.

Google TypeScript conventions guide handwritten code. Prettier uses two spaces, single quotes, semicolons, and compact import braces. Type-aware ESLint rejects unsafe TypeScript patterns and unused code. Framework-required default exports, React PascalCase component files, and generated Payload files take precedence over conflicting style preferences. Generated migrations, types, and import maps are excluded from handwritten formatting and lint rules. They remain type-checked where applicable and are checked for generation drift in CI.

Both development and production explicitly use Next.js's supported webpack path. This also avoids the local compiler subprocess port restriction encountered with Turbopack's MDX loader. There is no custom bundler, build orchestrator, or compiler patch.

## Cache only appropriate responses

Next.js manages its own single-instance filesystem cache. Versioned static assets retain framework cache headers. Public uploaded media gets a bounded one-hour public lifetime through Payload's upload response-header hook. Filenames are not promised immutable, so replacing an image can leave a cached copy for up to that lifetime.

Administrative, authentication, health, and dynamic API responses stay private or uncached. Cloudflare should retain its default static caching without blanket HTML caching. Future preview functionality must preserve the same private-response rule. No Redis, distributed cache, or custom invalidation is needed for one server.

The [operating guide](operations.md) describes cache inspection and optional administrative Cloudflare Access protection. Payload authentication remains mandatory even when Access is enabled.
