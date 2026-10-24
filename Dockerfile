# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ARG VITE_APP_BASE_URL
ARG VITE_DEV_HOST
ARG VITE_SALES_URL
ARG VITE_SUPPORT_URL
ARG VITE_PRIVACY_URL
ARG VITE_TERMS_URL
ENV VITE_APP_BASE_URL=$VITE_APP_BASE_URL \
    VITE_DEV_HOST=$VITE_DEV_HOST \
    VITE_SALES_URL=$VITE_SALES_URL \
    VITE_SUPPORT_URL=$VITE_SUPPORT_URL \
    VITE_PRIVACY_URL=$VITE_PRIVACY_URL \
    VITE_TERMS_URL=$VITE_TERMS_URL

RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/data/app.db \
    WHATSAPP_MEDIA_DIR=/media

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl sqlite3 tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/deploy/backup.sh /app/deploy/restore-container.sh /app/deploy/backup-crypto.mjs ./deploy/

RUN mkdir -p /data /media /backups \
    && chown -R node:node /app /data /media /backups \
    && chmod 750 /data /media /backups \
    && chmod 750 /app/deploy/backup.sh /app/deploy/restore-container.sh /app/deploy/backup-crypto.mjs

USER node
VOLUME ["/data", "/media", "/backups"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD curl --fail --silent http://127.0.0.1:3000/api/ready || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server/index.js"]
