FROM node:20-slim AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS prod-deps

ENV NODE_ENV=production
RUN npm prune --omit=dev && npm cache clean --force

FROM node:20-slim AS builder

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --create-home nextjs

COPY --chown=nextjs:nodejs --from=builder /app/package.json /app/package-lock.json ./
COPY --chown=nextjs:nodejs --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs --from=builder /app/next.config.ts ./next.config.ts
COPY --chown=nextjs:nodejs --from=builder /app/.next ./.next
COPY --chown=nextjs:nodejs --from=builder /app/public ./public
COPY --chown=nextjs:nodejs --from=builder /app/lib ./lib
COPY --chown=nextjs:nodejs --from=builder /app/scripts ./scripts
COPY --chown=nextjs:nodejs --from=builder /app/data-source.ts ./data-source.ts
COPY --chown=nextjs:nodejs --from=builder /app/tsconfig.json ./tsconfig.json
COPY --chown=nextjs:nodejs --from=builder /app/tsconfig-cli.json ./tsconfig-cli.json
COPY --chown=nextjs:nodejs --from=builder /app/next-env.d.ts ./next-env.d.ts

RUN mkdir -p /app/data \
  && chown nextjs:nodejs /app/data \
  && chmod 700 /app/data

VOLUME ["/app/data"]

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((res)=>process.exit(res.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "set -eu; mkdir -p /app/data; if [ \"${RUN_DB_SYNC:-false}\" = \"true\" ]; then echo 'RUN_DB_SYNC=true requires ts-node in runtime image; use migration job/container instead.' >&2; exit 1; fi; if [ \"${RUN_DB_SEED:-false}\" = \"true\" ]; then echo 'RUN_DB_SEED=true requires ts-node in runtime image; use seeding job/container instead.' >&2; exit 1; fi; exec npm run start"]
