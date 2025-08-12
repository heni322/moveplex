# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies with verbose logging
RUN echo "📦 Installing dependencies..." && \
    npm ci --no-audit --no-fund && \
    echo "✅ Dependencies installed"

# Copy source code
COPY . .

# Debug: Show what files we have
RUN echo "📁 Files in /app before build:" && ls -la

# Build the application with verbose output
RUN echo "🔨 Building application..." && \
    npm run build && \
    echo "✅ Build completed"

# Debug: Show build output
RUN echo "📁 Build output:" && \
    ls -la dist/ && \
    echo "📄 Looking for main.js:" && \
    find dist/ -name "main.js" -type f || echo "No main.js found" && \
    echo "📄 All JS files in dist:" && \
    find dist/ -name "*.js" -type f | head -10

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN echo "📦 Installing production dependencies..." && \
    npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force && \
    echo "✅ Production dependencies installed"

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy configuration files
COPY --from=builder --chown=nestjs:nodejs /app/ormconfig.ts ./ormconfig.ts

# Copy package.json for typeorm cli
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json

# Debug: Verify files were copied correctly
RUN echo "📁 Files in production container:" && \
    ls -la && \
    echo "📁 Dist directory:" && \
    ls -la dist/ && \
    echo "📄 Main application file:" && \
    ls -la dist/main.js || ls -la dist/src/main.js || echo "Main.js not found in expected locations"

# Create logs directory
RUN mkdir -p logs && chown nestjs:nodejs logs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check - test both possible endpoints
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || curl -f http://localhost:3000/api/health || exit 1

# Start the application - try different possible locations for main.js
CMD ["sh", "-c", "node dist/main.js || node dist/src/main.js || (echo 'Cannot find main.js' && find dist/ -name 'main.js' -type f && exit 1)"]