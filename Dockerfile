FROM node:20-slim

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run build

RUN npx playwright install chromium
RUN npx playwright install-deps chromium

RUN node scripts/prestart.js

ENV NODE_ENV=production
ENV HEADLESS=true

EXPOSE 3000 8080

CMD ["node", "dist/bin/firekid-scraper.js", "--server", "--port", "3000"]
