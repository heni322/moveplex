# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

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
    echo "📁 Dist src directory:" && \
    ls -la dist/src/ || echo "No dist/src directory" && \
    echo "📄 Looking for main.js:" && \
    find dist/ -name "main.js" -type f || echo "No main.js found" && \
    echo "📄 All JS files in dist:" && \
    find dist/ -name "*.js" -type f

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN echo "📦 Installing production dependencies..." && \
    npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force && \
    echo "✅ Production dependencies installed"

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Debug: Verify files were copied correctly
RUN echo "📁 Files in production container:" && \
    ls -la && \
    echo "📁 Dist directory:" && \
    ls -la dist/ && \
    echo "📁 Looking for main.js in dist/src:" && \
    ls -la dist/src/ || echo "No dist/src directory" && \
    echo "📄 Finding main.js:" && \
    find dist/ -name "main.js" -type f || echo "No main.js found"

# Create logs directory
RUN mkdir -p logs && chown nestjs:nodejs logs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]