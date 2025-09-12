#!/bin/bash

# Script to easily switch between local and production backend URLs

case "$1" in
  "local")
    echo "Switching to local backend (localhost:8080)..."
    cp env.local.example .env.local
    echo "✅ Configured for local development"
    echo "Backend URL: http://localhost:8080"
    ;;
  "production"|"prod")
    echo "Switching to production backend..."
    cp env.production.example .env.local
    echo "✅ Configured for production"
    echo "Backend URL: https://yt-deepresearch-backend-431569812034.europe-west1.run.app"
    ;;
  "remove"|"default")
    echo "Removing .env.local (using default localhost:8080)..."
    rm -f .env.local
    echo "✅ Using default configuration (localhost:8080)"
    ;;
  *)
    echo "Usage: $0 {local|production|remove}"
    echo ""
    echo "  local      - Use localhost:8080 backend"
    echo "  production - Use deployed GCP backend"
    echo "  remove     - Remove .env.local (defaults to localhost:8080)"
    echo ""
    echo "Current backend URL will be: ${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8080}"
    exit 1
    ;;
esac

echo ""
echo "Restart your Next.js dev server for changes to take effect:"
echo "npm run dev"
