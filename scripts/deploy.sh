#!/usr/bin/env bash
set -euo pipefail

# Manual deploy script for resume site.
# Builds and pushes the Docker image to GHCR.
# The VM's Watchtower agent detects the new image and updates automatically.
#
# Required environment variables:
#   GHCR_PAT  - GitHub PAT with read:packages and write:packages scope

REQUIRED_VARS=(GHCR_PAT)
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo "Error: $var is not set" >&2
        exit 1
    fi
done

IMAGE="ghcr.io/kaecyra/resume:latest"

echo "Building Docker image..."
docker compose build

echo "Logging in to GHCR..."
echo "${GHCR_PAT}" | docker login ghcr.io -u kaecyra --password-stdin

echo "Pushing image to GHCR..."
docker push "${IMAGE}"

echo "Image pushed. Watchtower on the VM will detect and deploy the update."
