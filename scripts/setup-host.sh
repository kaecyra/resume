#!/usr/bin/env bash
set -euo pipefail

# Host VM provisioning script for resume site.
# Configures a fresh Ubuntu VM for pull-based container deployment.
# Installs Docker, configures firewall, sets up Watchtower for
# automatic image updates from GHCR.
#
# Usage:
#   scp scripts/setup-host.sh user@192.168.8.44:~/
#   ssh user@192.168.8.44 'sudo bash ~/setup-host.sh'
#
# Prerequisites:
#   - Fresh Ubuntu VM
#   - Run as root (or via sudo)
#   - Network access to apt repos and ghcr.io

# -- Argument parsing ----------------------------------------------------------

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Provision a host VM for the resume site. Installs Docker, configures
the firewall, sets up Watchtower for automatic container updates, and
applies basic security hardening.

Options:
    --help    Show this help message and exit.

This script must be run as root (or via sudo).
EOF
}

for arg in "$@"; do
    case "$arg" in
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Error: unknown option '$arg'" >&2
            echo "Run '$(basename "$0") --help' for usage." >&2
            exit 1
            ;;
    esac
done

# -- Prerequisites -------------------------------------------------------------

if [[ $EUID -ne 0 ]]; then
    echo "Error: this script must be run as root." >&2
    echo "Run: sudo bash $(basename "$0")" >&2
    exit 1
fi

if [[ ! -f /etc/os-release ]] || ! grep -qi ubuntu /etc/os-release; then
    echo "Warning: this script is designed for Ubuntu. Proceeding anyway." >&2
fi

DEPLOY_USER="${SUDO_USER:-}"
if [[ -z "$DEPLOY_USER" ]]; then
    echo "Warning: SUDO_USER not set. Falling back to first non-root user." >&2
    DEPLOY_USER=$(getent passwd 1000 | cut -d: -f1 || true)
    if [[ -z "$DEPLOY_USER" ]]; then
        echo "Error: could not determine a non-root user." >&2
        echo "Run this script via sudo from a regular user account." >&2
        exit 1
    fi
fi

echo "Host provisioning for resume site"
echo "================================="
echo ""
echo "Deploy user: $DEPLOY_USER"
echo ""

# -- System updates ------------------------------------------------------------

echo "--- System updates ---"
apt-get update
apt-get upgrade -y
echo ""

# -- Firewall (UFW) ------------------------------------------------------------

echo "--- Firewall (UFW) ---"
apt-get install -y ufw

ufw allow from 192.168.0.0/16 to any app OpenSSH
ufw allow from 192.168.0.0/16 to any port 3000 proto tcp
ufw --force enable

echo "Firewall configured: OpenSSH and port 3000/tcp allowed (LAN only)."
echo ""

# -- Docker installation -------------------------------------------------------

echo "--- Docker ---"
if command -v docker &>/dev/null; then
    echo "Docker is already installed: $(docker --version)"
else
    echo "Installing Docker from official repository..."
    apt-get install -y ca-certificates curl gnupg

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-compose-plugin \
        docker-buildx-plugin
fi

systemctl enable docker
systemctl start docker

if ! id -nG "$DEPLOY_USER" | grep -qw docker; then
    usermod -aG docker "$DEPLOY_USER"
    echo "Added $DEPLOY_USER to docker group."
else
    echo "$DEPLOY_USER is already in the docker group."
fi
echo ""

# -- Docker log rotation -------------------------------------------------------

echo "--- Docker log rotation ---"
DAEMON_JSON="/etc/docker/daemon.json"
DESIRED_CONFIG='{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}'

DOCKER_RESTARTED=false

if [[ -f "$DAEMON_JSON" ]]; then
    if [[ "$(cat "$DAEMON_JSON")" == "$DESIRED_CONFIG" ]]; then
        echo "Docker daemon.json already configured."
    else
        echo "Warning: $DAEMON_JSON already exists with custom content." >&2
        echo "Current content:" >&2
        cat "$DAEMON_JSON" >&2
        echo "" >&2
        echo "Overwriting with standard log rotation config." >&2
        echo "$DESIRED_CONFIG" > "$DAEMON_JSON"
        systemctl restart docker
        DOCKER_RESTARTED=true
        echo "Docker restarted with updated config."
    fi
else
    echo "$DESIRED_CONFIG" > "$DAEMON_JSON"
    systemctl restart docker
    DOCKER_RESTARTED=true
    echo "Docker log rotation configured and daemon restarted."
fi
echo ""

# -- Application directory -----------------------------------------------------

echo "--- Application directory ---"
mkdir -p /opt/resume
chown "$DEPLOY_USER:$DEPLOY_USER" /opt/resume
echo "Created /opt/resume (owned by $DEPLOY_USER)."
echo ""

# -- GHCR authentication -------------------------------------------------------

echo "--- GHCR authentication ---"
echo "A GitHub Personal Access Token (PAT) with read:packages scope is required"
echo "for pulling container images from GHCR."
echo "Create one at: https://github.com/settings/tokens"
echo ""

read -rsp "GHCR PAT: " GHCR_PAT
echo ""

if [[ -z "$GHCR_PAT" ]]; then
    echo "Error: GHCR PAT cannot be empty." >&2
    exit 1
fi

echo "$GHCR_PAT" | sudo -u "$DEPLOY_USER" docker login ghcr.io -u kaecyra --password-stdin

# Copy docker credentials to a fixed path for Watchtower
DOCKER_CONFIG_SRC="/home/$DEPLOY_USER/.docker/config.json"
DOCKER_CONFIG_DST="/opt/resume/.docker-config.json"

if [[ -f "$DOCKER_CONFIG_SRC" ]]; then
    cp "$DOCKER_CONFIG_SRC" "$DOCKER_CONFIG_DST"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$DOCKER_CONFIG_DST"
    chmod 600 "$DOCKER_CONFIG_DST"
    echo "Docker credentials copied to $DOCKER_CONFIG_DST."
else
    echo "Warning: expected docker config at $DOCKER_CONFIG_SRC not found." >&2
    echo "Watchtower may not be able to pull private images." >&2
fi
echo ""

# -- Deploy docker-compose.yml ------------------------------------------------

echo "--- Docker Compose stack ---"
cat > /opt/resume/docker-compose.yml <<'COMPOSE'
services:
  resume:
    image: ghcr.io/kaecyra/resume:latest
    ports:
      - "3000:80"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    labels:
      - "com.centurylinklabs.watchtower.scope=resume"

  watchtower:
    image: ghcr.io/nicholas-fedor/watchtower:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /opt/resume/.docker-config.json:/config.json:ro
    environment:
      WATCHTOWER_CLEANUP: "true"
      WATCHTOWER_POLL_INTERVAL: "300"
      WATCHTOWER_SCOPE: "resume"
    labels:
      - "com.centurylinklabs.watchtower.scope=resume"
    restart: unless-stopped
COMPOSE

chown "$DEPLOY_USER:$DEPLOY_USER" /opt/resume/docker-compose.yml
echo "Wrote /opt/resume/docker-compose.yml."

echo "Starting container stack..."
sudo -u "$DEPLOY_USER" docker compose -f /opt/resume/docker-compose.yml up -d
echo ""

# -- Security hardening --------------------------------------------------------

echo "--- Security hardening ---"
apt-get install -y unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades
echo "Unattended upgrades enabled."

apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
echo "fail2ban installed and enabled."
echo ""

# -- Summary -------------------------------------------------------------------

echo "========================================="
echo "Host provisioning complete"
echo "========================================="
echo ""
echo "What was configured:"
echo "  - System packages updated"
echo "  - UFW firewall enabled (OpenSSH + port 3000)"
echo "  - Docker installed and enabled"
echo "  - Docker log rotation configured (10MB, 3 files)"
echo "  - $DEPLOY_USER added to docker group"
echo "  - /opt/resume created"
echo "  - GHCR authentication configured"
echo "  - Docker Compose stack started (resume + Watchtower)"
echo "  - Unattended security upgrades enabled"
echo "  - fail2ban installed and enabled"
echo ""
echo "Next steps:"
echo "  1. Verify the container is running:"
echo "     docker ps"
echo "  2. Configure the proxy server to route traffic to this VM:3000"
echo "  3. Push to main to trigger the first automated deploy"
echo "  4. Watchtower polls GHCR every 5 minutes for new images"
echo ""
echo "Note: log out and back in for docker group changes to take effect."
