FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
# If drizzle needs to run migrations, we might need drizzle-kit or just the migrations folder.
# Copy drizzle folder just in case if it exists, though it's typically managed separately.
# For now, we only need what's necessary to start the app.

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
