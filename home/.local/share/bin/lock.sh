#!/bin/sh

source xvars
font='Roboto'

i3lock \
  --insidever-color=$X0 \
  --insidewrong-color=$X0 \
  --inside-color=$XBG \
  --ringver-color=$X10 \
  --ringwrong-color=$X9 \
  --ringver-color=$X10 \
  --ringwrong-color=$X9 \
  --ring-color=$X0 \
  --line-uses-ring \
  --keyhl-color=$X12 \
  --bshl-color=$X11 \
  --separator-color=$XBG \
  --verif-color=$X10 \
  --wrong-color=$X9 \
  --layout-color=$X12 \
  --date-color=$XFG \
  --time-color=$XFG \
  --screen 1 \
  --blur 1 \
  --clock \
  --indicator \
  --keylayout 1 \
  --time-str="%I:%M %p" \
  --date-str="%a, %b %e %Y" \
  --verif-text="Verifying..." \
  --wrong-text="Auth Failed" \
  --noinput="No Input" \
  --lock-text="Locking..." \
  --lockfailed="Lock Failed" \
  --time-font=$font \
  --date-font=$font \
  --layout-font=$font \
  --verif-font=$font \
  --wrong-font=$font \
  --radius=110 \
  --ring-width=9 \
  --pass-media-keys \
  --pass-screen-keys \
  --pass-volume-keys \

if [[ "$1" == "--suspend" ]]; then
	systemctl suspend
fi