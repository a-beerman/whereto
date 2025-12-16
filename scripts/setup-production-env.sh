#!/bin/bash
# Production environment setup script

set -e

echo "Setting up production environment files..."

# Create API production env file
if [ ! -f "apps/api/.env.production" ]; then
  cat > apps/api/.env.production << 'EOF'
# Production Environment Variables for API

# Node Environment
NODE_ENV=production

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=whereto
DB_PASSWORD=CHANGE_ME
DB_NAME=whereto_catalog
DB_SSL=false
DB_POOL_MAX=20
DB_POOL_MIN=5

# API Configuration
API_PORT=3000
API_PREFIX=api
API_VERSION=v1
CORS_ORIGIN=https://whereto.example.com

# External Services
GOOGLE_PLACES_API_KEY=CHANGE_ME

# Security
API_SERVICE_TOKEN=CHANGE_ME

# Logging
LOG_LEVEL=info

# Metrics & Observability (optional)
SENTRY_DSN=
METRICS_ENABLED=true
EOF
  echo "Created apps/api/.env.production - Please update with your values"
else
  echo "apps/api/.env.production already exists"
fi

# Create Bot production env file
if [ ! -f "apps/bot/.env.production" ]; then
  cat > apps/bot/.env.production << 'EOF'
# Production Environment Variables for Bot

# Node Environment
NODE_ENV=production

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=CHANGE_ME

# API Configuration
API_BASE_URL=https://api.whereto.example.com
API_SERVICE_TOKEN=CHANGE_ME

# Logging
LOG_LEVEL=info

# Metrics & Observability (optional)
SENTRY_DSN=
EOF
  echo "Created apps/bot/.env.production - Please update with your values"
else
  echo "apps/bot/.env.production already exists"
fi

echo ""
echo "Environment files created. Please update all CHANGE_ME values with your actual configuration."
echo "IMPORTANT: Never commit .env.production files to Git!"

