# Lohnmonitor Enterprise - Backend Server
# Docker build for production

FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lohnmonitor -u 1001 -G nodejs

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy application code
COPY index.js ./
COPY routes ./routes/
COPY services ./services/
COPY middleware ./middleware/

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
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node index.js"]
