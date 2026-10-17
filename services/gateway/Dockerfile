FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/gateway/package.json ./services/gateway/

RUN npm install

COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/gateway ./services/gateway

RUN npm run build --workspace=@seatsnap/shared
RUN npm run build --workspace=@seatsnap/gateway

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/gateway/package.json ./services/gateway/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/gateway/dist ./services/gateway/dist

EXPOSE 4000

CMD ["node", "services/gateway/dist/index.js"]
