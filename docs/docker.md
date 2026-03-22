# Docker Guide

Run Firekid Scraper in Docker containers.

## Quick Start

### Build and Run

```bash
docker-compose up -d
```

This starts:
- Main scraper API server on port 3000
- WebSocket server on port 8080
- 2 worker containers for distributed scraping

### Stop

```bash
docker-compose down
```

## Single Container

### Build Image

```bash
docker build -t firekid-scraper .
```

### Run Container

```bash
docker run -d \
  --name firekid \
  -p 3000:3000 \
  -p 8080:8080 \
  -e HEADLESS=true \
  -e CF_BYPASS=auto \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/output:/app/output \
  firekid-scraper
```

### Execute Commands

```bash
docker exec -it firekid node dist/bin/firekid-scraper.js --help
```

## Environment Variables

Pass via `-e` flag or `.env` file:

```bash
docker run -e HEADLESS=true \
  -e MAX_QUEUE_WORKERS=10 \
  -e LOG_LEVEL=debug \
  firekid-scraper
```

Or use `.env` file:

```bash
docker run --env-file .env firekid-scraper
```

## Volumes

### Persist Data

```bash
docker run -v $(pwd)/data:/app/data firekid-scraper
```

### Share Commands

```bash
docker run -v $(pwd)/commands:/app/commands firekid-scraper
```

### Access Output

```bash
docker run -v $(pwd)/output:/app/output firekid-scraper
```

## Docker Compose

### Configuration

Edit `docker-compose.yml`:

```yaml
services:
  firekid-scraper:
    environment:
      - MAX_QUEUE_WORKERS=10
      - CF_BYPASS=manual
```

### Scale Workers

```bash
docker-compose up -d --scale firekid-worker-1=5
```

### View Logs

```bash
docker-compose logs -f firekid-scraper
```

### Restart Services

```bash
docker-compose restart
```

## API Access

### From Host

```bash
curl http://localhost:3000/health
```

### From Another Container

```bash
curl http://firekid-scraper:3000/health
```

## Custom Dockerfile

### Development Mode

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx playwright install chromium
RUN npx playwright install-deps chromium

CMD ["npm", "run", "dev"]
```

### With Proxy

```dockerfile
FROM node:20-slim

ENV HTTP_PROXY=http://proxy.example.com:8080
ENV HTTPS_PROXY=http://proxy.example.com:8080

# ... rest of Dockerfile
```

## Networking

### Create Network

```bash
docker network create firekid-net
```

### Run with Network

```bash
docker run --network firekid-net firekid-scraper
```

### Connect Containers

```bash
docker run --network firekid-net \
  -e SCRAPER_URL=http://firekid-scraper:3000 \
  my-app
```

## Resource Limits

### Memory Limit

```bash
docker run -m 2g firekid-scraper
```

### CPU Limit

```bash
docker run --cpus=2 firekid-scraper
```

### In docker-compose.yml

```yaml
services:
  firekid-scraper:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Health Checks

### Built-in

```bash
docker inspect --format='{{.State.Health.Status}}' firekid
```

### Custom

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1
```

## Debugging

### Interactive Shell

```bash
docker exec -it firekid /bin/bash
```

### View Logs

```bash
docker logs -f firekid
```

### Inspect Container

```bash
docker inspect firekid
```

## Production

### Multi-stage Build

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

RUN npx playwright install chromium
RUN npx playwright install-deps chromium

CMD ["node", "dist/bin/firekid-scraper.js"]
```

### Security

```dockerfile
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 firekid

USER firekid

EXPOSE 3000
```

### Read-only Root

```bash
docker run --read-only \
  --tmpfs /tmp \
  -v $(pwd)/data:/app/data \
  firekid-scraper
```

## CI/CD

### GitHub Actions

```yaml
- name: Build Docker Image
  run: docker build -t firekid-scraper .

- name: Run Tests
  run: docker run firekid-scraper npm test

- name: Push to Registry
  run: |
    docker tag firekid-scraper myregistry/firekid-scraper:latest
    docker push myregistry/firekid-scraper:latest
```

## Registry

### Push to Docker Hub

```bash
docker tag firekid-scraper username/firekid-scraper:1.0.0
docker push username/firekid-scraper:1.0.0
```

### Pull and Run

```bash
docker pull username/firekid-scraper:1.0.0
docker run -d username/firekid-scraper:1.0.0
```

## Troubleshooting

### Chromium Won't Start

Install dependencies:
```dockerfile
RUN npx playwright install-deps chromium
```

### Permission Denied

Run as root or fix permissions:
```bash
docker run --user root firekid-scraper
```

### Out of Memory

Increase memory limit:
```bash
docker run -m 4g firekid-scraper
```

### Network Issues

Check network mode:
```bash
docker run --network host firekid-scraper
```

## Best Practices

1. Use specific Node.js version tags
2. Multi-stage builds for smaller images
3. Run as non-root user
4. Set resource limits
5. Use health checks
6. Persist data with volumes
7. Use .dockerignore
8. Tag images with versions
9. Clean up unused images
10. Monitor container metrics
