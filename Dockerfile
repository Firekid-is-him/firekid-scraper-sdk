FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsup.config.ts ./
COPY src ./src
COPY bin ./bin
RUN npm run build

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HEADLESS=true
ENV NO_SANDBOX=true
ENV API_HOST=0.0.0.0
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npx playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY scripts ./scripts
COPY plugins ./plugins
COPY .env.example ./

RUN node scripts/prestart.js \
    && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/bin/firekid-scraper.js", "--server", "--port", "3000"]
