FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/payment/package.json ./services/payment/

RUN npm install

COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/payment ./services/payment

RUN npm run build --workspace=@seatsnap/shared
RUN npm run build --workspace=@seatsnap/payment

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/payment/package.json ./services/payment/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/payment/dist ./services/payment/dist

EXPOSE 4002

CMD ["node", "services/payment/dist/index.js"]
