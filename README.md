<p align="center"><img src="https://github.com/mebesus/My_XFCE_dotties/blob/main/images/banner.png"></p>

## DOTFILES OF MY XFCE SETUP

The GTK theme as well as the kvantume theme used here are forks of the Matcha GTK/kvantum theme made by [vinceliuice](https://github.com/vinceliuice). I thank Vinceliuice for creating such wonderful themes.<br>

## Screenshot

![](https://github.com/mebesus/My_XFCE_dotties/blob/main/images/screenshot.png)

## With kvantum apps

![](https://github.com/mebesus/My_XFCE_dotties/blob/main/images/kvantum.png)

## Description

### Using Xfce 4.16

Component | Description
------------- | -------------
Wallpaper | Edited an existing one -,-
Widget | Conky
GTK-theme | Darknord (Well, that's what I like to call it)
kvantum-theme | Darknord
Shell | zsh 5.8 with powerlevel10k prompt
Fetch tool | [I made it :D](https://github.com/mebesus/sysfex)
Icon theme | Tela-dark
Font family | Noto sans

<p>
    I recommend you to use this package https://github.com/lah7/gtk3-classic for making CSD applications use this wm theme.
</p>

## Installation
Copy everything of ``.config`` to ``~/.config/`` or ``$HOME/.config/`` of your computer. For using the themes, move them inside ``~/.themes/``. If there's no such folder, make one. Xfce-appearance should automatically identify this GTK theme as below: 
<p align="center"><img src="https://github.com/mebesus/My_XFCE_dotties/blob/main/images/xfce-appearance.png" width="75%" /></p>

You need kvantum manager for activating the kvantum theme. Assuming you have kvantum manager installed and configured already, open kvantum-manager, choose **Install/Update Theme**. Then click "Select a Kvantum theme folder". A file selector popup window will appear. Select this kvantum folder ``~/.themes/darknord-kvantum/`` and hit "Install this theme". Then choose darknord-kvantum as your kvantum theme and you're all set.<br>
Oh, one thing. Following the process above, the GTK and the kvantum theme will be installed locally. Which means that if you run any application as root or any other user, it will most likely use the default GTK / kvantum theme. You may install these themes globally (i.e. inside ``/usr/share/themes`` and ``/usr/share/kvantum``) for preventing such issues.

## Issues?
You're welcome to report one
