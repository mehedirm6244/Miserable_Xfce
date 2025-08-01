#!/usr/bin/env bash
#==============================================================================
# Miserable_Xfce clone script
# Version: 0.8(alpha)
# Author: g-flame (https://github.com/g-flame)
#==============================================================================

set -e

# package manager dedection
if ! command -v git &> /dev/null; then
    if command -v pacman &> /dev/null; then
        sudo pacman -S --needed git
    elif command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y git
    elif command -v yum &> /dev/null; then
        sudo yum install -y git
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y git
    elif command -v zypper &> /dev/null; then
        sudo zypper install -y git
    elif command -v brew &> /dev/null; then
        brew install git
    else
        echo "Package manager not supported. Install git manually."
        exit 1
    fi
fi

# Clone repo
REPO_URL="https://github.com/g-flame/Miserable_Xfce.git"
REPO_DIR="Miserable_Xfce"

# Remove existing directory
[ -d "$REPO_DIR" ] && rm -rf "$REPO_DIR"

# Clone and run installer
cd /tmp
git clone "$REPO_URL"
cd "$REPO_DIR"
chmod +x scripts/install.sh
cd scripts
./installer.sh
echo "install script ended !"
rm -rf /tmp/"$REPO_DIR"
cd ~/
echo "Bye!"