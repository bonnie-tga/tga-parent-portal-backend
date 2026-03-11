FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000 \
 && npm config set registry https://registry.npmjs.org/

RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

COPY . .
RUN mkdir -p uploads
RUN npm run build


FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 300000 \
 && npm config set registry https://registry.npmjs.org/

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --legacy-peer-deps

RUN mkdir -p uploads /tmp/uploads dist/public src/public public

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/src/public ./src/public
COPY --from=builder /app/src/public ./public
COPY --from=builder /app/src/public ./dist/public

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

RUN apk --no-cache add curl

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/healthz || exit 1

CMD ["node", "dist/main.js"]
