# 1️⃣ Use official Node.js LTS image
FROM node:20-alpine AS builder

# 2️⃣ Set working directory inside the container
WORKDIR /app

# 3️⃣ Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# 4️⃣ Copy the rest of the app
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# 5️⃣ Build Next.js app
RUN npm run build

# 6️⃣ Prepare production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/node_modules ./node_modules

# Generate Prisma Client in production
RUN npx prisma generate

# Expose default Next.js port
EXPOSE 3000

# Set the command to run the app
CMD ["npm", "run", "start"]

# Run Next.js production server
CMD ["npm", "start"]
