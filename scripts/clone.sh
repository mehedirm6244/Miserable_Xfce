#!/usr/bin/env bash
#==============================================================================
# Miserable_Xfce clone script
# Version: 0.8(alpha)
# Author: g-flame (https://github.com/g-flame)
#==============================================================================

set -e

# package manager detection
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
REPO_URL="https://github.com/mehedirm6244/Miserable_Xfce.git"
REPO_DIR="Miserable_Xfce"
TMP_DIR="/tmp"

# Remove existing directory in /tmp only (don't touch arbitrary cwd)
if [ -d "$TMP_DIR/$REPO_DIR" ]; then
    rm -rf "$TMP_DIR/$REPO_DIR"
fi

# Clone and run installer
cd "$TMP_DIR"
git clone "$REPO_URL"
cd "$TMP_DIR/$REPO_DIR"
chmod +x scripts/installer.sh
cd "$TMP_DIR/$REPO_DIR/scripts"
./installer.sh
echo "install script ended !"
rm -rf "$TMP_DIR/$REPO_DIR"
cd ~/
echo "Bye!"
