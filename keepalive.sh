#!/bin/bash
# Keep-alive script for Portfolio Agent
# This hits the warmup endpoint every 5 minutes to prevent cold starts.

PROJECT_ID="${1:-enriquekchan-b646b}"
URL="https://${PROJECT_ID}.web.app/warmup"

echo "Starting keep-alive for $URL"
echo "Press [CTRL+C] to stop."

while true
do
  echo "[$(date)] Pinging $URL..."
  # Try to hit the endpoint. We don't worry about auth here as the URL is public
  # but the backend will handle the warming logic.
  RESPONSE=$(curl -s "$URL")
  if echo "$RESPONSE" | grep -q "warm"; then
    echo "  ✅ Active: $RESPONSE"
  else
    echo "  ❌ Failed or still starting: $RESPONSE"
  fi
  sleep 300
done
