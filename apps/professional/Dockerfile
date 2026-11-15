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
RUN PROFESSIONAL_URL=https://pichardo.dev pnpm --filter @pichardo/professional build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build --chown=app:app /app/apps/professional/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/professional/.next/static ./apps/professional/.next/static
RUN mkdir -p /app/apps/professional/.next/cache \
    && chown -R app:app /app/apps/professional/.next/cache
USER app
EXPOSE 3000
CMD ["node", "apps/professional/server.js"]
