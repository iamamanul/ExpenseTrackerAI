# -------- BUILDER --------
FROM node:20-alpine AS builder
WORKDIR /app

# Install build tools required by Prisma native bindings
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./
RUN npm ci
COPY . .
# ----- Build args (unchanged) -----
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG CLERK_SECRET_KEY
ARG DATABASE_URL
ARG GROQ_API_KEY
ARG GEMINI_API_KEY
ARG NEXT_PUBLIC_GEMINI_API_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV DATABASE_URL=$DATABASE_URL
ENV GROQ_API_KEY=$GROQ_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV NEXT_PUBLIC_GEMINI_API_KEY=$NEXT_PUBLIC_GEMINI_API_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npx prisma generate
RUN npm run build

# -------- RUNTIME --------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
