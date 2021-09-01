<p align="center"><img src="https://github.com/mebesus/My_XFCE_dotties/blob/main/images/banner.png"></p>

## DOTFILES OF MY XFCE SETUP

The GTK theme as well as the kvantume theme used here are forks of the Matcha GTK/kvantum theme made by https://github.com/vinceliuice. I thank Vinceliuice for creating such wonderful themes.<br>
Um, yes, there's no window buttons (i.e. minimize, close) in the wm theme, because I use a keyboard-driven workflow. If you're unwilling to use a keyboard-driven workflow, you may use another Xfwm theme which has window buttons, or simply open an issue for this feature

## Screenshot

![](https://github.com/mebesus/My_XFCE_dotties/blob/main/images/screenshot.png)

## Description

### Using Xfce 4.16

Component | Description
------------- | -------------
Wallpaper | Collected from [here](https://github.com/linuxdotexe/nordic-wallpapers/tree/master/wallpapers). It's inside /images
Widget | Conky, forked from one of [his](https://github.com/addy-dclxvi) conky configs
GTK-theme | Darknord (Well, that's what I like to call it)
kvantum-theme | Darknord
Compositor | Picom
Notification daemon | Dunst
Terminal emulator | Kitty
Shell | zsh 5.8 with powerlevel10k prompt
Icon theme | Papirus-dark
Font family | Cantarell

<p>
    I recommend you to use this package https://github.com/lah7/gtk3-classic for making CSD applications use this wm theme. <br>
    And again, this theme is for keyboard-driven workflows, which means there's no buttons for closing/minimizing/maximizing windows. Make sure to bind shortcuts to each things
</p>

## Installation
Copy everything of ``.config`` to ``~/.config/`` or ``$HOME/.config/`` of your computer. For using the themes, extract them (sorry for using .zip) inside ``~/.themes/``. If there's no such folder, make one. Xfce-appearance should automatically identify this GTK theme as below: 
<p align="center"><img src="https://user-images.githubusercontent.com/86041547/131626281-affa4d36-afb4-4c5e-b4e2-3f8277a74d61.png" width="75%"></p>
You need kvantum manager for activating the kvantum theme. Assuming you have kvantum manager installed and configured already, open kvantum-manager, choose <b>Install/Update Theme</b>. Then click "Select a Kvantum theme folder". A file selector popup window will appear. Select this kvantum folder ``~/.themes/darknord-kvantum/`` and hit "Install this theme". Then choose darknord-kvantum as your kvantum theme and you're all set.<br>
Oh, one thing. Following the process above, the GTK and the kvantum theme will be installed locally. Which means that if you run any application as root or any other user, it will most likely use the default GTK / kvantum theme. You may install these themes globally (i.e. inside ``/usr/share/themes`` and ``/usr/share/kvantum``) for preventing such issues.

## Issues?
You're welcome to report one
