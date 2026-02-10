#!/usr/bin/env bash
set -euo pipefail

# Repository setup script for resume project.
# Configures GitHub secrets and variables required by the deploy workflow.
# Uses the GitHub CLI (gh) to set values on the current repository.
#
# Usage:
#   ./scripts/setup-repo.sh               # Interactive mode (prompts for each value)
#   ./scripts/setup-repo.sh --placeholder  # Set all secrets/variables to "placeholder"
#   ./scripts/setup-repo.sh --help         # Show usage information

PLACEHOLDER_MODE=false

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Configure GitHub secrets and variables for the resume deploy workflow.

Options:
    --placeholder   Set all secrets and variables to "placeholder" without
                    prompting. Useful for dry setup or CI testing.
    --help          Show this help message and exit.

Prerequisites:
    - GitHub CLI (gh) installed
    - Authenticated with gh (run: gh auth login)
    - Running from the repository root

Secrets configured:
    SSH_HOST        VM hostname or IP for deployment
    SSH_USER        SSH username on the deployment VM
    SSH_KEY         SSH private key (PEM format) for deployment
    GHCR_PAT        GitHub PAT with read:packages scope (for VM-side docker login)

Variables configured:
    DEPLOY_ENABLED  Enable/disable the deploy workflow (true/false)
EOF
}

# -- Argument parsing ----------------------------------------------------------

for arg in "$@"; do
    case "$arg" in
        --placeholder)
            PLACEHOLDER_MODE=true
            ;;
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

# -- Prerequisite checks ------------------------------------------------------

check_prerequisites() {
    if ! command -v gh &>/dev/null; then
        echo "Error: GitHub CLI (gh) is not installed." >&2
        echo "Install it from https://cli.github.com/" >&2
        exit 1
    fi

    if ! gh auth status &>/dev/null; then
        echo "Error: GitHub CLI is not authenticated." >&2
        echo "Run 'gh auth login' to authenticate." >&2
        exit 1
    fi

    if [[ ! -d .git ]]; then
        echo "Error: not running from a git repository root." >&2
        echo "Run this script from the repository root directory." >&2
        exit 1
    fi
}

# -- Helper functions ----------------------------------------------------------

prompt_value() {
    local name="$1"
    local description="$2"
    local default="${3:-}"

    echo ""
    echo "--- $name ---"
    echo "$description"
    if [[ -n "$default" ]]; then
        read -rp "$name [$default]: " value
        echo "${value:-$default}"
    else
        read -rp "$name: " value
        if [[ -z "$value" ]]; then
            echo "Error: $name cannot be empty." >&2
            exit 1
        fi
        echo "$value"
    fi
}

prompt_file() {
    local name="$1"
    local description="$2"

    echo ""
    echo "--- $name ---"
    echo "$description"
    read -rp "Path to private key file: " key_path

    if [[ -z "$key_path" ]]; then
        echo "Error: $name file path cannot be empty." >&2
        exit 1
    fi

    # Expand tilde
    key_path="${key_path/#\~/$HOME}"

    if [[ ! -f "$key_path" ]]; then
        echo "Error: file not found: $key_path" >&2
        exit 1
    fi

    cat "$key_path"
}

set_secret() {
    local name="$1"
    local value="$2"
    echo "$value" | gh secret set "$name"
}

set_variable() {
    local name="$1"
    local value="$2"
    # gh variable set overwrites if the variable already exists
    gh variable set "$name" --body "$value"
}

# -- Main ----------------------------------------------------------------------

check_prerequisites

echo "Resume repository setup"
echo "======================="
echo ""
echo "This script configures the GitHub secrets and variables required"
echo "by the deploy workflow. It is safe to run multiple times."

if [[ "$PLACEHOLDER_MODE" == true ]]; then
    echo ""
    echo "Running in placeholder mode -- all values will be set to 'placeholder'."
    echo ""

    set_secret "SSH_HOST" "placeholder"
    set_secret "SSH_USER" "placeholder"
    set_secret "SSH_KEY" "placeholder"
    set_secret "GHCR_PAT" "placeholder"
    set_variable "DEPLOY_ENABLED" "false"

    echo ""
    echo "Configuration complete (placeholder mode)."
    echo ""
    echo "  Secrets set:    SSH_HOST, SSH_USER, SSH_KEY, GHCR_PAT"
    echo "  Variables set:  DEPLOY_ENABLED=false"
    echo ""
    echo "Replace these with real values before enabling deployment."
else
    ssh_host=$(prompt_value "SSH_HOST" \
        "The hostname or IP address of the VM where the resume site will be deployed.")

    ssh_user=$(prompt_value "SSH_USER" \
        "The SSH username on the deployment VM (must have docker permissions).")

    ssh_key=$(prompt_file "SSH_KEY" \
        "The SSH private key (PEM format) used to connect to the deployment VM.
Provide the path to the key file (e.g. ~/.ssh/id_ed25519).")

    ghcr_pat=$(prompt_value "GHCR_PAT" \
        "A GitHub Personal Access Token with read:packages scope.
The deployment VM uses this to pull images from GHCR.
Create one at: https://github.com/settings/tokens")

    deploy_enabled=$(prompt_value "DEPLOY_ENABLED" \
        "Enable the deploy workflow? Set to 'true' to deploy on push to main,
or 'false' to keep deployment disabled until you're ready." \
        "false")

    echo ""
    echo "Applying configuration..."
    echo ""

    set_secret "SSH_HOST" "$ssh_host"
    echo "  Set secret:   SSH_HOST"

    set_secret "SSH_USER" "$ssh_user"
    echo "  Set secret:   SSH_USER"

    set_secret "SSH_KEY" "$ssh_key"
    echo "  Set secret:   SSH_KEY"

    set_secret "GHCR_PAT" "$ghcr_pat"
    echo "  Set secret:   GHCR_PAT"

    set_variable "DEPLOY_ENABLED" "$deploy_enabled"
    echo "  Set variable: DEPLOY_ENABLED=$deploy_enabled"

    echo ""
    echo "Configuration complete."
    echo ""
    echo "  Secrets set:    SSH_HOST, SSH_USER, SSH_KEY, GHCR_PAT"
    echo "  Variables set:  DEPLOY_ENABLED=$deploy_enabled"

    if [[ "$deploy_enabled" == "true" ]]; then
        echo ""
        echo "Deployment is enabled. Pushing to main will trigger a deploy."
    else
        echo ""
        echo "Deployment is disabled. Set DEPLOY_ENABLED to 'true' when ready:"
        echo "  gh variable set DEPLOY_ENABLED --body true"
    fi
fi
