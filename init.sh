#!/usr/bin/env bash
#==============================================================================
# Miserable_Xfce bootstrap
# Installs bun, adds installer deps, hands over to installer.ts (OpenTUI).
# Works on any distro (pacman/apt/dnf/zypper) and x64/arm64.
#
# Usage:
#   ./init.sh                  # local repo
#   bash <(curl -fsSL <raw>/init.sh)   # fresh machine (auto-clones repo)
#   ./init.sh --settings-only  # flags are passed straight to the installer
#   ./init.sh --no-color       # plain logs instead of the TUI (no TTY needed)
#   ./init.sh --demo           # UI preview, no system changes
#==============================================================================
set -euo pipefail

REPO_URL="${MISERABLE_REPO:-https://github.com/mehedirm6244/Miserable_Xfce.git}"
REPO_TARGET="${MISERABLE_HOME:-$HOME/.local/share/Miserable_Xfce}"
BUN_INSTALL_DIR="${BUN_INSTALL:-$HOME/.bun}"

say()  { printf '\033[1;35m::\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

plain=0
for a in "$@"; do
    if [ "$a" = "--no-color" ]; then plain=1; fi
done

# --- 1. Preconditions --------------------------------------------------------
if [ "$plain" -eq 1 ]; then
    warn "plain mode (--no-color): logs go straight to stdout"
else
    [ -t 0 ] && [ -t 1 ] || die "interactive terminal required (stdin/stdout are not a TTY) - or pass --no-color"
fi

have() { command -v "$1" >/dev/null 2>&1; }

# --- 2. sudo credential + keepalive (the installer only ever calls sudo -n) --
SUDO_KEEPALIVE_PID=""
cleanup() {
    [ -n "$SUDO_KEEPALIVE_PID" ] && kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [ "$(id -u)" -ne 0 ]; then
    if ! sudo -n true 2>/dev/null; then
        say "sudo password needed once (kept alive during install)"
        sudo -v || die "sudo required"
    fi
    (
        while :; do
            sudo -n -v 2>/dev/null || exit 0
            sleep 20
        done
    ) >/dev/null 2>&1 &
    SUDO_KEEPALIVE_PID=$!
fi

# --- 3. repo: use the local copy, or clone when piped ------------------------
need_git_clone=0
SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
fi
if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/installer/installer.ts" ]; then
    REPO_DIR="$SCRIPT_DIR"
else
    REPO_DIR="$REPO_TARGET"
    need_git_clone=1
fi

if [ "$need_git_clone" -eq 1 ]; then
    if ! have git; then
        say "installing git"
        if have pacman;    then sudo -n pacman -S --needed --noconfirm git
        elif have apt-get; then sudo -n apt-get update && sudo -n apt-get install -y git
        elif have dnf;     then sudo -n dnf install -y git
        elif have zypper;  then sudo -n zypper --non-interactive install git
        else die "no supported package manager found to install git"; fi
    fi
    if [ ! -d "$REPO_DIR/.git" ]; then
        say "cloning $REPO_URL -> $REPO_DIR"
        mkdir -p "$(dirname "$REPO_DIR")"
        git clone "$REPO_URL" "$REPO_DIR" || die "git clone failed (set MISERABLE_REPO to a reachable url)"
    else
        say "reusing existing clone at $REPO_DIR"
    fi
fi

[ -f "$REPO_DIR/installer/installer.ts" ] || die "installer not found at $REPO_DIR/installer/installer.ts (outdated clone? remove $REPO_DIR and rerun)"

# --- 4. bun ------------------------------------------------------------------
export PATH="$BUN_INSTALL_DIR/bin:$PATH"
if ! have bun; then
    say "installing bun"
    have curl || die "curl is required to install bun"
    curl -fsSL https://bun.sh/install | BUN_INSTALL="$BUN_INSTALL_DIR" bash
    export PATH="$BUN_INSTALL_DIR/bin:$PATH"
    have bun || die "bun install failed - add $BUN_INSTALL_DIR/bin to PATH and rerun"
fi
say "bun $(bun --version)"

# --- 5. installer deps + launch ----------------------------------------------
cd "$REPO_DIR/installer"
say "installing installer dependencies"
if [ -f package.json ]; then
    bun install
else
    bun add @opentui/core
fi

say "starting installer"
set +e
bun installer.ts "$@"
rc=$?
set -e
exit "$rc"
