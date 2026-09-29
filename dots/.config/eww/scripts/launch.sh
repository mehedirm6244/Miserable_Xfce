#!/bin/bash

# IDK why eww doesn't allow launching programs directly
# Even launch.sh $1 doesn't work, whyyyyy?

declare target

case $1 in
    --taskmanager) 	target="xfce4-taskmanager" ;;
	--filemanager) 	target="thunar" ;;
	--webbrowser) 	target="firefox" ;;
	--terminal) 	target="xfce4-terminal" ;;
	--texteditor) 	target="subl" ;;
	--calendar)		target="gnome-calendar"
esac

gtk-launch ${target}
eww close-all