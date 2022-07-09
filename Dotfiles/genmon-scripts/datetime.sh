#!/usr/bin/env bash

#genmon script for displaying the time
#displays date and time on the tooltip

readonly ICON="$HOME/.assets/icons/clock.svg"

TIME=`date '+%H:%M'`
DATE=$(echo "\uf073 ")
DATE+=`date '+ %d %B %A %H:%M'`

# Panel
INFO="<img>${ICON}</img>"
INFO+="<txt>${TIME}</txt>"

# Tooltip
MORE_INFO="<tool>"
MORE_INFO+="${DATE}"
MORE_INFO+="</tool>"

# Panel Print
echo -e "${INFO}"

# Tooltip Print
echo -e "${MORE_INFO}"
