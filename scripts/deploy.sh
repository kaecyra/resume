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

IMAGE="ghcr.io/kaecyra/resume"

if [[ ! -f VERSION ]]; then
    echo "Error: VERSION file not found. Run from the repository root." >&2
    exit 1
fi
VERSION=$(cat VERSION)

echo "Logging in to GHCR..."
echo "${GHCR_PAT}" | docker login ghcr.io -u kaecyra --password-stdin

echo "Building and pushing Docker image (linux/amd64) version ${VERSION}..."
docker buildx build --platform linux/amd64 \
    --build-arg PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-}" \
    --build-arg PUBLIC_UMAMI_URL="${PUBLIC_UMAMI_URL:-}" \
    --build-arg PUBLIC_UMAMI_WEBSITE_ID="${PUBLIC_UMAMI_WEBSITE_ID:-}" \
    -t "${IMAGE}:latest" \
    -t "${IMAGE}:${VERSION}" \
    --push .

echo "Image pushed. Watchtower on the VM will detect and deploy the update."
