#!/usr/bin/env bash

CPU=$(~/.config/eww/scripts/sys_info --cpu)
readonly ICON="$HOME/.assets/icons/cpu.svg"


# Panel
INFO="<img>${ICON}</img>"
INFO+="<txt>${CPU}%</txt>"

# Tooltip
MORE_INFO="<tool>"
MORE_INFO+="CPU Usage: ${CPU}%"
MORE_INFO+="</tool>"

# OnClick
CLICK="<txtclick>"
CLICK+="xfce4-taskmanager"
CLICK+="</txtclick>"

# Panel Print
echo -e "${INFO}"

# Tooltip Print
echo -e "${MORE_INFO}"

# OnClick Print
echo -n "${CLICK}"