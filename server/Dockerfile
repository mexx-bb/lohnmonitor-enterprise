# Lohnmonitor Enterprise - Backend Server
# Docker build for production

FROM node:20-alpine

WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lohnmonitor -u 1001 -G nodejs

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --omit=dev

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application code
COPY index.js ./
COPY routes ./routes/
COPY services ./services/
COPY middleware ./middleware/

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown -R lohnmonitor:nodejs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_URL="file:/app/data/lohnmonitor.db"

# Expose port
EXPOSE 5000

# Create volume for persistent data
VOLUME ["/app/data"]

# Switch to non-root user
USER lohnmonitor

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
ENTRYPOINT ["/docker-entrypoint.sh"]
