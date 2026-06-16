#!/bin/bash
set -e

echo "🔧 Running production database migrations..."
npx drizzle-kit push --force

echo "🚀 Starting production server..."
NODE_ENV=production node dist/index.js
