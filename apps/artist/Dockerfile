FROM node:24.22.3-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@12.18.0 \
    && groupadd --gid 1001 app \
    && useradd --uid 1001 --gid app --create-home app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/artist/package.json ./apps/artist/package.json
COPY apps/professional/package.json ./apps/professional/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN PAYLOAD_SECRET=build-only-placeholder-not-a-runtime-secret \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    MEDIA_DIR=/tmp/pichardo-build-media \
    ARTIST_URL=https://allanpichardo.com \
    pnpm --filter @pichardo/artist build

FROM dependencies AS tooling
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build /app/apps/artist/src ./apps/artist/src
COPY --from=build /app/apps/artist/tsconfig.json ./apps/artist/tsconfig.json
WORKDIR /app/apps/artist
ENV NODE_ENV=production
RUN mkdir -p /app/media && chown app:app /app/media
USER app
CMD ["pnpm", "payload", "migrate"]

FROM base AS runner
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build --chown=app:app /app/apps/artist/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/artist/.next/static ./apps/artist/.next/static
RUN mkdir -p /app/media /app/apps/artist/.next/cache \
    && chown -R app:app /app/media /app/apps/artist/.next/cache
USER app
EXPOSE 3000
CMD ["node", "apps/artist/server.js"]
