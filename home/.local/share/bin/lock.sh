#!/bin/sh

# Grab ~/.Xresources colors (Thanks to: elenapan)
# Use like so:
#   source xvars
XBG="$(xrdb -query | grep -m 1 background: | awk '{print $2}')"
XFG="$(xrdb -query | grep -m 1 foreground: | awk '{print $2}')"
X0="$(xrdb -query | grep -m 1 color0: | awk '{print $2}')"
X1="$(xrdb -query | grep -m 1 color1: | awk '{print $2}')"
X2="$(xrdb -query | grep -m 1 color2: | awk '{print $2}')"
X3="$(xrdb -query | grep -m 1 color3: | awk '{print $2}')"
X4="$(xrdb -query | grep -m 1 color4: | awk '{print $2}')"
X5="$(xrdb -query | grep -m 1 color5: | awk '{print $2}')"
X6="$(xrdb -query | grep -m 1 color6: | awk '{print $2}')"
X7="$(xrdb -query | grep -m 1 color7: | awk '{print $2}')"
X8="$(xrdb -query | grep -m 1 color8: | awk '{print $2}')"
X9="$(xrdb -query | grep -m 1 color9: | awk '{print $2}')"
X10="$(xrdb -query | grep -m 1 color10: | awk '{print $2}')"
X11="$(xrdb -query | grep -m 1 color11: | awk '{print $2}')"
X12="$(xrdb -query | grep -m 1 color12: | awk '{print $2}')"
X13="$(xrdb -query | grep -m 1 color13: | awk '{print $2}')"
X14="$(xrdb -query | grep -m 1 color14: | awk '{print $2}')"
X15="$(xrdb -query | grep -m 1 color15: | awk '{print $2}')"

font='Roboto'

background="/usr/share/backgrounds/Custom/tokyonight_sunset.png"
background_cached="${HOME}/lockscreen.png"
size=$(xdpyinfo | grep dimensions | sed -r 's/^[^0-9]*([0-9]+x[0-9]+).*$/\1/')

if [[ ! -f ${background_cached} || $1 == "--cache_background" ]]; then
	echo "caching background"
	eval convert "$background" \
		-resize "$size""^" \
		-gravity center \
		-extent "$size" \
		"$background_cached"
fi

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
	--image ${background_cached} \
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