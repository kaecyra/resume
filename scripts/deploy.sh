#!/usr/bin/env bash
set -euo pipefail

# Manual deploy script for resume site.
# Replicates what the CI deploy job does, for use when deploying
# without pushing to main (first-time setup, hotfix, troubleshooting).
#
# Required environment variables:
#   SSH_HOST  - VM hostname or IP
#   SSH_USER  - SSH username
#   GHCR_PAT  - GitHub PAT with read:packages and write:packages scope
#
# SSH key auth is assumed via ssh-agent or ~/.ssh/config.

REQUIRED_VARS=(SSH_HOST SSH_USER GHCR_PAT)
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo "Error: $var is not set" >&2
        exit 1
    fi
done

IMAGE="ghcr.io/kaecyra/resume:latest"
REMOTE_DIR="/opt/resume"

echo "Building Docker image..."
docker compose build

echo "Logging in to GHCR..."
echo "${GHCR_PAT}" | docker login ghcr.io -u kaecyra --password-stdin

echo "Pushing image to GHCR..."
docker push "${IMAGE}"

echo "Copying docker-compose.yml to ${SSH_HOST}:${REMOTE_DIR}/"
scp docker-compose.yml "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/"

echo "Deploying on remote host..."
ssh "${SSH_USER}@${SSH_HOST}" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/resume
docker compose pull
docker compose up -d
docker image prune -f
REMOTE

echo "Deploy complete."
