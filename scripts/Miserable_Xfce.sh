#!/bin/bash
#==============================================================================
# Miserable_Xfce Theme Setup Script
# Version: 0.1 (alpha)
# Author: g-flame (https://github.com/g-flame)
#==============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

REPO_DIR="Miserable_Xfce"

set -e

show_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    echo ' ╔════════════════════════════════════════════════════════════════╗'
    echo ' ║                                                                ║'
    echo ' ║  __  __ _                    _     _         __   ____          ║'
    echo ' ║ |  \/  (_)                  | |   | |        \ \ / /  _|        ║'
    echo ' ║ | .  . |_ ___  ___ _ __ __ _| |__ | | ___     \ V /| |_ ___ ___  ║'
    echo ' ║ | |\/| | / __|/ _ \ '\''__/ _` | '\''_ \| |/ _ \     \ / |  _/ __/ _ \ ║'
    echo ' ║ | |  | | \__ \  __/ | | (_| | |_) | |  __/    / /^\ \ || (_|  __/ ║'
    echo ' ║ \_|  |_|_|___/\___|_|  \__,_|_.__/|_|\___|   \/   \|_| \___\___| ║'
    echo ' ║                                                                ║'
    echo ' ║                            ______                             ║'
    echo ' ║                           |______|                            ║'
    echo ' ║                                                                ║'
    echo ' ╚════════════════════════════════════════════════════════════════╝'
    echo -e "${NC}"
    echo -e "${CYAN}${BOLD}Made by g-flame for Miserable_Xfce${NC}"
    echo ""
}

# Check if git is installed
check_dependencies() {
    echo -e "${BLUE}Checking dependencies...${NC}"
    if ! command -v git &> /dev/null; then
        echo -e "${RED}Git is not installed. Please install git first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Dependencies check passed${NC}"
}

# Setup directory structure
setup_directories() {
    echo -e "${BLUE}Setting up directories...${NC}"
    # Resolve repo root relative to this script's location
    local script_dir repo_root
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    repo_root="$(cd "$script_dir/.." && pwd)"
    cd "$repo_root" || { echo -e "${RED}Failed to cd into $repo_root${NC}"; exit 1; }

    # Use find to safely list dotfiles and regular files in home/, skipping . and ..
    # Back up any existing dotfiles to avoid clobbering user config
    local backup_dir="$HOME/.miserable_xfce_backup_$(date +%s)"
    mkdir -p "$backup_dir"

    while IFS= read -r -d '' f; do
        local name
        name="$(basename "$f")"
        # Skip . and ..
        if [ "$name" = "." ] || [ "$name" = ".." ]; then
            continue
        fi
        # Backup if a file with the same name exists in $HOME
        if [ -e "$HOME/$name" ]; then
            mv "$HOME/$name" "$backup_dir/" 2>/dev/null || true
        fi
        mv "$f" "$HOME/"
    done < <(find "$repo_root/home" -mindepth 1 -maxdepth 1 -print0)

    echo -e "${GREEN}Directory setup complete (backups in $backup_dir)${NC}"
}

# Install picom animation fork
install_picom_animation() {
    echo -e "${BLUE}Installing picom animation fork...${NC}"
    cd /tmp
    
    git clone -b animation-pr https://github.com/fdev31/picom.git
    cd picom
    git submodule update --init --recursive
    meson setup --buildtype=release . build
    ninja -C build
    sudo ninja -C build install
    
    # Cleanup
    cd ~
    rm -rf /tmp/picom
    
    echo -e "${GREEN}Picom animation fork installed successfully!${NC}"
}

main() {
    show_banner
    echo -e "${CYAN}Starting Miserable_Xfce theme installation...${NC}"
    echo
    
    check_dependencies
    setup_directories
    install_picom_animation
    
    echo
    echo -e "${GREEN}${BOLD}Base setup is complete!${NC}"
    echo -e "${YELLOW}Follow the complete guide at: ${CYAN}https://github.com/mehedirm6244/Miserable_Xfce${NC}"
}

# Run main function
main "$@"