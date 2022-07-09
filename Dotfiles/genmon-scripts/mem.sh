#!/usr/bin/env bash

MEM=$(printf "%.0f\n" $(free -m | grep Mem | awk '{print ($3/$2)*100}'))
readonly ICON="$HOME/.assets/icons/pie-chart.svg"

# Panel
INFO="<img>${ICON}</img>"
INFO+="<txt>${MEM}%</txt>"

# Tooltip
MORE_INFO="<tool>"
MORE_INFO+="MEM Usage: ${MEM}%"
MORE_INFO+="</tool>"

# Panel Print
echo -e "${INFO}"

# Tooltip Print
echo -e "${MORE_INFO}"
