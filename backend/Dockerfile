## Backend production Dockerfile — multi-stage build
## Stage 1: install all deps + generate Prisma client
FROM node:20-bullseye-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    npx prisma generate --schema=./prisma/schema.prisma

## Stage 2: production image with only runtime deps
FROM node:20-bullseye-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl postgresql-client && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client from build stage
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/prisma ./prisma
COPY backend/server.js ./server.js

ARG APP_BUILD_SHA
ARG APP_BUILD_TIME
ENV NODE_ENV=production
ENV PORT=8080
ENV APP_BUILD_SHA=${APP_BUILD_SHA}
ENV APP_BUILD_TIME=${APP_BUILD_TIME}
EXPOSE 8080

CMD ["node", "server.js"]
