#!/bin/sh
# Lohnmonitor Enterprise - Docker Entrypoint Script
# Handles Prisma migrations, database seeding, and application startup

set -e

echo "🚀 Starting Lohnmonitor Enterprise..."

# Run Prisma migrations
echo "📦 Running database migrations..."
if npx prisma migrate deploy; then
    echo "✅ Database migrations completed"
else
    echo "⚠️ Migration failed or no migrations to apply"
fi

# Seed database if empty (first run)
echo "🌱 Checking database seed..."
if npx prisma db seed 2>/dev/null; then
    echo "✅ Database seeding completed"
else
    echo "ℹ️ Database already seeded or seed skipped"
fi

# Start the application
echo "🎯 Starting Node.js server..."
exec node index.js
