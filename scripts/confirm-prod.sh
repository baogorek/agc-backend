#!/bin/bash
echo ""
echo "⚠️  You are about to deploy to PRODUCTION."
read -p "Continue? (y/N) " confirm
if [ "$confirm" != "y" ]; then
  echo "Aborted."
  exit 1
fi
exec "$@"
