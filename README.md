<p>
<b>Note 01:</b> If you're looking for my older dotfiles, refer to the main branch<br>
<b>Note 02:</b> Don't copy/paste any config unless you're completely sure about what you're doing. Currently, copypasting my xfce-specific configs (at `Dotfiles/.config/xfce4`) is deprecated as it will result in system crash, probably. The reason is clarified inside the <b>FAQ</b> section at the end of the readme<br>
<b>Note 03:</b> I haven't tested anything yet. The eww sidebar is made for <b>1366x768 screen</b>, so you will have to adjust the sidebar yourself if you're using a bigger, or worse, a smaller display.
</p>

# Everblushing Xfce
![image](https://user-images.githubusercontent.com/86041547/178043482-d8c6a37a-c41f-4a8b-9708-b54051a9bb5d.png)

## Sneak peek

### Stuff stuffs
* <b>OS:</b> btw<br>
Although it doesn't matter, but the upgradable package count seen in the eww sidebar relies on `pacman`, which is the package manager of Arch and derivatives.
* <b>DE:</b> Xfce 4.16
* <b>Colorscheme:</b> [Everblush](https://github.com/Everblush)
* <b>WM:</b> Xfwm<br>
Yeah, actually, many of the stuffs (most) used on my rice are of Xfce DE, including the notification daemon (xfce4-notifyd), panel (xfce4-panel), file manager (thunar) etc.
* <b>Compositor:</b> picom-git
* <b>Sidebar:</b> eww
* <b>Terminal Emulator:</b> Kitty, with `zsh` and `spaceship-prompt`
* <b>Screen Locker:</b> i3lock-color 
* <b>Application Launcher:</b> [Findex](https://github.com/mdgaziur/findex)
* <b>gtk3-classic</b> instead of gtk3, because I love xfwm decorations more than CSD

### Theme stuffs
* <b>Gtk-theme, xfwm-theme, kvantum theme:</b> all of them are handmade<br>
I know that there already exists a gtk theme following the Everblush color palette, but I find it hard to use on Xfce.
* A super bloat <b>gtk.css</b> for beauty
* <b>Icon theme:</b> A mashup of Zafiro icons (main), Numix apps (fallback) and Fluent-icons (panel)
* <b>Font:</b> Roboto for interface, JetBrainsMono (Nerd) for monospace
* <b>Cursor:</b> Qogir

### More stuffs
* Config for <b>cava</b>
* Config for <b>Neofetch</b> and <b>Fastfetch</b>
* Config for <b>bat</b>
* A custom executable for <b>i3lock-color</b> (can be found at Dotfiles/.local/bin/i3lock-everblush)
* <b>Zsh</b> config (spaceship-prompt required)
* Some <b>genmon scripts</b> for xfce-panel
* Some wallpapers
* And probably some more, idk I don't remember

## (Possible) FAQ

### Installation tutorial when?
Idk for now. Some of my xfce configs have my username used in them and there's no simple way to do something like `$USER/path-to-thing` instead of `/home/your_username/path-to-thing`. So it's likely to happen that your Xfce setup will crash if you just copy/paste my configs. I'm open for suggestions

### Are the dots finally complete?
No haha. It shouldn't take a lot time tho.
