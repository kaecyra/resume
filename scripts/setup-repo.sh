#!/usr/bin/env bash
set -euo pipefail

# Repository setup script for resume project.
# Configures GitHub variables required by the deploy workflow.
# Uses the GitHub CLI (gh) to set values on the current repository.
#
# Usage:
#   ./scripts/setup-repo.sh               # Interactive mode (prompts for each value)
#   ./scripts/setup-repo.sh --placeholder  # Set all variables to "placeholder"
#   ./scripts/setup-repo.sh --help         # Show usage information

PLACEHOLDER_MODE=false

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Configure GitHub variables for the resume deploy workflow.

Options:
    --placeholder   Set all variables to defaults without prompting.
                    Useful for dry setup or CI testing.
    --help          Show this help message and exit.

Prerequisites:
    - GitHub CLI (gh) installed
    - Authenticated with gh (run: gh auth login)
    - Running from the repository root

Variables configured:
    DEPLOY_ENABLED  Enable/disable the deploy workflow (true/false)

Note: The deploy workflow uses the automatic GITHUB_TOKEN for GHCR push.
      GHCR credentials for the VM are configured by setup-host.sh, not here.
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
echo "This script configures the GitHub variables required by the deploy"
echo "workflow. It is safe to run multiple times."

if [[ "$PLACEHOLDER_MODE" == true ]]; then
    echo ""
    echo "Running in placeholder mode -- all values will be set to defaults."
    echo ""

    set_variable "DEPLOY_ENABLED" "false"

    echo ""
    echo "Configuration complete (placeholder mode)."
    echo ""
    echo "  Variables set:  DEPLOY_ENABLED=false"
    echo ""
    echo "Set DEPLOY_ENABLED to 'true' when ready to enable deployment."
else
    deploy_enabled=$(prompt_value "DEPLOY_ENABLED" \
        "Enable the deploy workflow? Set to 'true' to deploy on push to main,
or 'false' to keep deployment disabled until you're ready." \
        "false")

    echo ""
    echo "Applying configuration..."
    echo ""

    set_variable "DEPLOY_ENABLED" "$deploy_enabled"
    echo "  Set variable: DEPLOY_ENABLED=$deploy_enabled"

    echo ""
    echo "Configuration complete."
    echo ""
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
