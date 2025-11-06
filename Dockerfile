# Multi-stage build for DentalGate II

# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app/backend

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Stage 2: Production stage
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy application code first
COPY --chown=nodejs:nodejs backend ./backend
COPY --chown=nodejs:nodejs public ./public
COPY --chown=nodejs:nodejs data ./data

# Copy node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules

# Set working directory to backend
WORKDIR /app/backend

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]

