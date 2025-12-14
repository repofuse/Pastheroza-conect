#!/usr/bin/env bash

set -e

# Load .env if exists
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

# Check required env vars
if [[ -z "$REMOTE_HOST" || -z "$REMOTE_USER" || -z "$REMOTE_DIR" ]]; then
    echo "Error: REMOTE_HOST, REMOTE_USER, and REMOTE_DIR must be set in .env"
    exit 1
fi

echo "=== Deploying to $REMOTE_HOST ==="

# Check for uncommitted changes
if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: Uncommitted changes detected"
    git status --short
    exit 1
fi

# Push to remote
echo "Pushing to git..."
git push

# Pull on server and deploy
echo "Deploying on server..."
ssh "$REMOTE_USER@$REMOTE_HOST" "cd $REMOTE_DIR && git pull && docker compose up -d --build"

echo "=== Deployment complete ==="
echo "Service available at: https://conect.api.hurated.com"
