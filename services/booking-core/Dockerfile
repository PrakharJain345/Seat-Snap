FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/booking-core/package.json ./services/booking-core/

RUN npm install

COPY tsconfig.base.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY services/booking-core ./services/booking-core

RUN npm run build --workspace=@seatsnap/shared
RUN npm run build --workspace=@seatsnap/booking-core

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/booking-core/package.json ./services/booking-core/

RUN npm install --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/booking-core/dist ./services/booking-core/dist

EXPOSE 4001

CMD ["node", "services/booking-core/dist/index.js"]
