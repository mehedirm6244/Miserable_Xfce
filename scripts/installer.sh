#!/usr/bin/env bash
#==============================================================================
# Miserable_Xfce Installer
# Version: 0.1(alpha)
# Author: g-flame (https://github.com/g-flame)
#==============================================================================

# Colors
PURPLE='\033[0;35m'
BOLD='\033[1m'
RESET='\033[0m'
CYAN='\033[0;36m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

set -e
show_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    echo '  ╔════════════════════════════════════════════════════════════════╗'
    echo '  ║                                                                ║'
    echo '  ║  ___  ____                    _     _       __   __ __         ║'
    echo '  ║ |  \/  (_)                  | |   | |      \ \ / // _|        ║'
    echo '  ║ | .  . |_ ___  ___ _ __ __ _| |__ | | ___   \ V /| |_ ___ ___  ║'
    echo '  ║ | |\/| | / __|/ _ | '\''__/ _` | '\''_ \| |/ _ \  /   \|  _/ __/ _ \ ║'
    echo '  ║ | |  | | \__ |  __| | | (_| | |_) | |  __/ / /^\ | || (_|  __/ ║'
    echo '  ║ \_|  |_|_|___/\___|_|  \__,_|_.__/|_|\___| \/   \|_| \___\___| ║'
    echo '  ║                                        ______                  ║'
    echo '  ║                                       |______|                 ║'
    echo '  ║                                                                ║'
    echo '  ╚════════════════════════════════════════════════════════════════╝'
    echo -e "${RESET}"
    echo -e "${CYAN}${BOLD}Made by g-flame for Miserable_Xfce${RESET}"
    echo ""
}



# Detect OS and set package manager
detect_os() {
    if command -v pacman &> /dev/null; then
        OS="arch"
        PKG_MANAGER="pacman"
        INSTALL_CMD="sudo pacman -S --needed --noconfirm"
        UPDATE_CMD="sudo pacman -Syu --noconfirm"
        SYNC_CMD="sudo pacman -Sy"
    elif command -v apt &> /dev/null; then
        OS="debian"
        PKG_MANAGER="apt"
        INSTALL_CMD="sudo apt install -y"
        UPDATE_CMD="sudo apt update && sudo apt upgrade -y"
        SYNC_CMD="sudo apt update"
    elif command -v dnf &> /dev/null; then
        OS="fedora"
        PKG_MANAGER="dnf"
        INSTALL_CMD="sudo dnf install -y"
        UPDATE_CMD="sudo dnf upgrade -y"
        SYNC_CMD="sudo dnf check-update"
    elif command -v zypper &> /dev/null; then
        OS="opensuse"
        PKG_MANAGER="zypper"
        INSTALL_CMD="sudo zypper install -y"
        UPDATE_CMD="sudo zypper update -y"
        SYNC_CMD="sudo zypper refresh"
    else
        echo -e "${RED}Unsupported OS - no compatible package manager found${NC}"
        echo -e "${RED}Visit the manual install guide!${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Detected OS: $OS using $PKG_MANAGER${NC}"
}


# Install core packages
install_core() {
    echo -e "${BLUE}Installing Xfce desktop environment...${NC}"
    case $OS in
    arch)
        $INSTALL_CMD xfce4 xfce4-goodies sddm noto-fonts thunar xfce4-panel bat neofetch rofi i3lock-color skippy-xd eww onboard base-devel git meson ninja libxext libxcb xcb-util-damage xcb-util-renderutil libconfig dbus pixman libev uthash libgl libegl pcre2
        sudo systemctl enable sddm
        ;;
    debian)
        $INSTALL_CMD xfce4 xfce4-goodies lightdm lightdm-gtk-greeter fonts-noto thunar xfce4-panel bat neofetch rofi i3lock-color onboard libxext-dev libxcb1-dev libxcb-damage0-dev libxcb-dpms0-dev libxcb-xfixes0-dev libxcb-shape0-dev libxcb-render-util0-dev libxcb-render0-dev libxcb-randr0-dev libxcb-composite0-dev libxcb-image0-dev libxcb-present-dev libxcb-glx0-dev libpixman-1-dev libdbus-1-dev libconfig-dev libgl-dev libegl-dev libpcre2-dev libevdev-dev uthash-dev libev-dev libx11-xcb-dev meson ninja-build git
        sudo systemctl enable lightdm
        ;;
    fedora)
        $INSTALL_CMD @xfce-desktop-environment lightdm lightdm-gtk google-noto-fonts thunar xfce4-panel bat neofetch rofi i3lock-color skippy-xd onboard dbus-devel gcc git libconfig-devel libdrm-devel libev-devel libX11-devel libX11-xcb libXext-devel libxcb-devel libGL-devel libEGL-devel meson pcre2-devel pixman-devel uthash-devel xcb-util-image-devel xcb-util-renderutil-devel xorg-x11-proto-devel ninja-build
        sudo systemctl enable lightdm
        ;;
    opensuse)
        $INSTALL_CMD xfce4-session xfce4-panel xfce4-desktop xfce4-settings xfce4-appfinder thunar lightdm lightdm-gtk-greeter noto-fonts bat neofetch rofi i3lock-color onboard libxcb-devel libX11-devel libXext-devel pixman-devel libconfig-devel libdbus-1-devel libev-devel libGL-devel libEGL-devel pcre2-devel uthash-devel meson ninja git gcc
        sudo systemctl enable lightdm
        ;;
    *)
        echo "Unsupported distribution"
        exit 1
        ;;
    esac
    echo -e "${GREEN}Xfce base stuff installed going forward...${NC}"
}

# Install customizations
Miserable_Xfce(){
    echo "Launching Customization script..."
    bash /tmp/scripts/Miserable_Xfce.sh
    echo "Customization script finished executing finishing up...."
}


# Install AUR helper (Arch only)
install_aur_helper() {
    if [[ $OS == "arch" ]] && ! command -v yay &> /dev/null; then
        echo -e "${BLUE}Installing AUR helper...${NC}"
        $INSTALL_CMD git base-devel
        cd /tmp
        git clone https://aur.archlinux.org/yay.git
        cd yay
        makepkg -si --noconfirm
        cd ~
        rm -rf /tmp/yay
    fi
}

# Main menu
show_menu() {

    show_banner
    echo "=============================="
    echo "1. Miserable_Xfce installation"
    echo "2. Exit"
    echo
    read -p "Choose option (1-3): " choice
    
    case $choice in
        1)  install_core
            Miserable_Xfce
            ;;
        2) exit 0;;
        *) echo -e "${RED}Invalid option${NC}" && show_menu ;;
    esac
}

# Main function
main() {
    # Detect OS first
    detect_os
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        echo -e "${RED}Don't run this as root${NC}"
        exit 1
    fi
    
    # Update system
    echo -e "${BLUE}Updating system...${NC}"
    $UPDATE_CMD
    
    # Show menu
    show_menu
    
    # Done
    echo -e "${GREEN}Installation complete!${NC}"
    echo
    echo -e "${YELLOW}To use Xfce4, select 'Xfce' from the login screen${NC}"
    echo
    read -p "Reboot now? (y/n): " reboot_choice
    if [[ $reboot_choice =~ ^[Yy]$ ]]; then
        sudo reboot
    fi
}

# Run main function
main "$@"