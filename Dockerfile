# Production Dockerfile for DentalGate II
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache dumb-init postgresql-client

# Create app directory
WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install --production

# Copy application code
WORKDIR /app
COPY backend ./backend
COPY public ./public
COPY data ./data

# Set working directory
WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start application
CMD ["dumb-init", "node", "src/server.js"]

