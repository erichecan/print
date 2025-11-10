## Backend production Dockerfile [2025-11-10 13:45:00]
FROM node:18-alpine AS base
WORKDIR /app

## Install dependencies with cleaning [2025-11-10 13:45:00]
COPY package*.json ./
RUN npm install --omit=dev

## Copy source and build assets [2025-11-10 13:45:00]
COPY src ./src
COPY prisma ./prisma

## Expose server port [2025-11-10 13:45:00]
ENV NODE_ENV=production
EXPOSE 3001

## Launch application [2025-11-10 13:45:00]
CMD ["node", "src/app.js"]

