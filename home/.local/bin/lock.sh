#!/bin/sh
# Shitty i3lock-colors script by github.com/mehedirm6244

declare -i SUSPEND
declare BG_PATH
BG_CACHED_PATH="${HOME}/lockscreen.png"

help() {
	echo "i3lock-color script by github/mehedirm6244"
	echo ""
	echo "Options:"
	echo "--help        Show this message"
	echo "--suspend     Suspend after locking"
	echo "--bg          Use the following image passed as argument as background"
	exit 0
}

create_cache() {
	size=$(xdpyinfo | grep dimensions | sed -r 's/^[^0-9]*([0-9]+x[0-9]+).*$/\1/')

	echo "Caching background"
	eval convert "$BG_PATH" \
		-resize "$size""^" \
		-gravity center \
		-extent "$size" \
		-brightness-contrast -15x0 \
		-filter Gaussian \
		-blur 0x5 \
		"$BG_CACHED_PATH"
}

lock() {
	# Grab ~/.Xresources colors (Thanks to: elenapan)
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

	trans='00'
	semitrans='88'

	font='Overpass'

	i3lock \
		--insidever-color=$X0$trans \
		--insidewrong-color=$X0$trans \
		--inside-color=$XBG$trans \
		--ringver-color=$X10 \
		--ringwrong-color=$X9 \
		--ring-color=$XFG$semitrans \
		--line-uses-inside \
		--keyhl-color=$X10 \
		--bshl-color=$X11 \
		--separator-color=$XBG \
		--verif-color=$X10 \
		--wrong-color=$X9 \
		--layout-color=$X12 \
		--date-color=$XFG \
		--time-color=$XFG \
		--screen 1 \
		--image ${BG_CACHED_PATH} \
		--clock \
		--indicator \
		--keylayout 1 \
		--time-str="%I:%M %p" \
		--time-size=56 \
		--date-str="%a, %b %e %Y" \
		--date-size=24 \
		--verif-text="" \
		--wrong-text="" \
		--noinput="" \
		--lock-text="Locking..." \
		--lockfailed="Lock Failed" \
		--time-font=$font \
		--date-font=$font \
		--layout-font=$font \
		--verif-font=$font \
		--wrong-font=$font \
		--radius=40 \
		--ring-width=5 \
		--ind-pos="w/2:h/2+60" \
		--time-pos="w/2:h/2-100" \
		--date-pos="w/2:h/2-66" \
		--layout-pos="w/2:h-66" \
		--greeter-pos="w/2:h/2" \
		--pass-media-keys \
		--pass-screen-keys \
		--pass-volume-keys \


	if [[ ${SUSPEND} == 1 ]]; then
		systemctl suspend
	fi
}

# Read arguements provided
while (($# > 0)); do
	case "$1" in
		(--bg)
			BG_PATH="$2";
			create_cache;
			shift;;
		(--help)
			help;;
		(--suspend) SUSPEND=1;;
	esac
	shift
done

lock