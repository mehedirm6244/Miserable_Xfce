#!/usr/bin/env bash

MEM=$(~/.config/eww/scripts/sys_info --mem)
readonly ICON="$HOME/.assets/icons/pie-chart.svg"

# Panel
INFO="<img>${ICON}</img>"
INFO+="<txt>${MEM}%</txt>"

# Tooltip
MORE_INFO="<tool>"
MORE_INFO+="MEM Usage: ${MEM}%"
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