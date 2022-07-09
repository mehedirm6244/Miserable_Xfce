#!/bin/bash

# I admit that the following script is a shit, but I have no idea currently

readonly DIR="$HOME/.config/picom.conf"
status="Enabled"

if pidof picom; then
    status="Disabled"
fi

notify-send -t 3000 -i "notification" "Picom" ${status}

if [ ${status} == "Disabled" ]; then
    pkill picom
else
    picom --config "${DIR}" -b
fi