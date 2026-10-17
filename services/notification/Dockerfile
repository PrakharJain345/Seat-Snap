FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/notification/package.json ./services/notification/

RUN npm install

COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/notification ./services/notification

RUN npm run build --workspace=@seatsnap/shared
RUN npm run build --workspace=@seatsnap/notification

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/notification/package.json ./services/notification/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/notification/dist ./services/notification/dist

EXPOSE 4003

CMD ["node", "services/notification/dist/index.js"]
