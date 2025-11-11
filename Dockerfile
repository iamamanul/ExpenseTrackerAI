# ---- BUILD ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Accept both Clerk vars (required for build)
ARG CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

ENV CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

RUN npx prisma generate
RUN npm run build

# ---- RUN ----
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000
CMD ["npm", "start"]