# Use Node.js LTS version
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build shared package
RUN cd shared && pnpm install && pnpm run build

# Build client
RUN cd client && pnpm install && pnpm run build

# Build server
RUN cd server && pnpm install && pnpm run build

# Create production image
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/package.json .
COPY --from=builder /app/pnpm-lock.yaml .
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/shared/package.json ./shared/

# Install production dependencies
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Create data directory
RUN mkdir -p /app/server/dist/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server/dist/index.js"] 