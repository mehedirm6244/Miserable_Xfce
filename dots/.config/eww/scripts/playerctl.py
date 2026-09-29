#!/usr/bin/env --split-string=python -u
"""Script that interacts with playerctl to manipulate all MPRIS players.
Here it is mostly being used for getting the current track metadata and feeding it
to an YUCK listener variable.
"""

# Authored By dharmx <dharmx.dev@gmail.com> under:
# GNU GENERAL PUBLIC LICENSE
# Version 3, 29 June 2007
#
# Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
# Everyone is permitted to copy and distribute verbatim copies
# of this license document, but changing it is not allowed.
#
# Permissions of this strong copyleft license are conditioned on
# making available complete source code of licensed works and
# modifications, which include larger works using a licensed work,
# under the same license. Copyright and license notices must be
# preserved. Contributors provide an express grant of patent rights.
#
# Read the complete license here:
# <https://github.com/dharmx/vile/blob/main/LICENSE.txt>

import json
import os
import pathlib
import shutil
import utils

# supress GIO warnings.
import gi
gi.require_version("Playerctl", "2.0")

from gi.repository import GLib, Playerctl
import requests


def on_metadata(*args):
    """The current song metadata and the player metadata is parsed
    and packed into a nice dictionary then to a JSON format string
    which is then print to STDOUT.
    There is a fallback dict already in place, which gets overwritten
    with newer / actual values (if they exist).
    Arguments:
        args: contains the current active MPRIS player object at [0]
              and a metadata dictionary at [1].
    """
    # sourcery skip: identity-comprehension, remove-redundant-constructor-in-dict-union
    metadata = {
        "mpris:artUrl": default_cover,
        "xesam:artist": "Unknown",
        "xesam:title": "Unknown",
        "xesam:album": "Unknown",
        "status": "Stopped",
    } | {key: val for key, val in dict(args[1]).items() if val} # overwrite

    name = args[0].props.player_name
    metadata["player"] = name or "none"
    metadata["status"] = args[0].props.status

    # prettify artist list
    if not "".join(metadata["xesam:artist"]):
        # [] -> "Unknown"
        metadata["xesam:artist"] = "Unknown"
    elif len(metadata["xesam:artist"]) == 1:
        # ["Dazbee"] -> "Dazbee"
        metadata["xesam:artist"] = metadata["xesam:artist"][0]
    elif len(metadata["xesam:artist"]) == 2:
        # ["Eir Aoi", "LiSA"] -> "Eir Aoi and LiSA"
        metadata["xesam:artist"] = "and".join(metadata["xesam:artist"])
    else:
        # ["Masato", "coladrain", "Hiroaki Tsutsumi"] -> "Masato, coladrain and Hiroaki Tsutsumi"
        metadata["xesam:artist"] = "and".join(
            [",".join(metadata["xesam:artist"][:-1]), metadata["xesam:artist"][-1]]
        )

    # apply fallback cover image
    if (
        "file://" not in metadata["mpris:artUrl"]
        and default_cover not in metadata["mpris:artUrl"]
    ):
        # cache the album art and return the cache path.
        metadata["mpris:artUrl"] = cache_and_get(metadata)

    metadata |= get_bright_dark_from_cover(metadata["mpris:artUrl"])
    print(json.dumps(metadata))


def on_play_pause(player, *_):
    """Callback function to regenerate and print the current state of the
    player when it is paused.
    Arguments:
        player: A Player object.
    """
    on_metadata(player, player.props.metadata)


def init_player(name):
    """Creates a Player object by passing a PlayerName object.
    It basically prepares and equips the player with instructions
    (callbacks) on what to do if a player:
        - receives track metadata
        - if a player is paused
        - if a player is not paused
    Finally it will add it to the PlayerManager object.
    Arguments:
        name: A PlayerName object.
    """
    player = Playerctl.Player.new_from_name(name)
    player.connect("metadata", on_metadata, manager)
    player.connect("playback-status::playing", on_play_pause, manager)
    player.connect("playback-status::paused", on_play_pause, manager)
    manager.manage_player(player)


def player_null_check(player_manager) -> bool:
    """Checks if there are any players being managed by the manager and print
    the default metadata if there are none.
    Arguments:
        player_manager: A PlayerManager object.
    Returns:
        A bool i.e. True if there are no active players, False otherwise.
    """
    if not len(player_manager.props.player_names):
        metadata =  {
            "mpris:artUrl": default_cover,
            "xesam:artist": "Unavailable",
            "xesam:title": "Unavailable",
            "xesam:album": "Unavailable",
            "status": "Stopped",
            "player": "none",
        }
        metadata |= get_bright_dark_from_cover(default_cover) # overwrite fallback
        print(json.dumps(metadata))
        return False
    return True


def on_name_appeared_vanished(player_manager, name):
    """Callback function for taking action when a player gets either connected or,
    disconnected from the manager.
    Arguments:
        player_manager: A PlayerManager object.
        name: A PlayerName object.
    """
    if player_null_check(player_manager):
        init_player(name)


def gen_hex_path_encode(unique_path_name: list) -> str:
    """Convert all characters to uppercased hex string.
    Arguments:
        unique_path_name: The normal string that needs to be converted to hex code.
    Returns:
        A uppercased JSON str.
    """
    return "".join(["%X" % ord(char) for char in unique_path_name])


def fetch_save_cover(link: str, save_path: str) -> bool:
    """Fetch media cover and save the bytes to a file path.
    Arguments:
        link: The URL link to the image.
        save_path: The location where the cache will be saved.
    Returns:
        A bool i.e. True if the image is actually cached False, otherwise.
    """
    data = requests.get(link, stream=True)
    if data.status_code == 200:
        data.raw.decode_content = True
        with open(save_path, "wb") as file:
            shutil.copyfileobj(data.raw, file)
        return True
    return False


def cache_and_get(metadata: dict) -> str:
    """Handles creating the cache directory if it does not exist,
    handles generating a alphanumeric (hex) name with a combination
    of the artist name(s) and the album name.
    Arguments:
        metadata: A dictionary containing the current playing media metadata.
    Returns:
        A str of the generated cache path or, the fallback path.
    """
    player_dir = f"{pctl_cache}/{metadata['player']}"
    if metadata["player"] not in ["none", "firefox"]:
        # artist: Fifth Dawn, song: Duality -> artist: 4669667468204461776E, song: 4475616C697479
        new_meta = {
            "artist": gen_hex_path_encode(metadata["xesam:artist"]),
            "album": gen_hex_path_encode(metadata["xesam:album"]),
        }
        # finally -> path/to/4669667468204461776E/4475616C697479.png
        gen_path = f"{player_dir}/{new_meta['artist']}"
        if not os.path.isdir(gen_path):
            pathlib.Path(gen_path).mkdir(parents=True, exist_ok=True)

        cover_path = f"{gen_path}/{new_meta['album']}.png"
        if not os.path.exists(cover_path):
            try:
                return (
                    cover_path
                    if fetch_save_cover(metadata["mpris:artUrl"], cover_path)
                    else default_cover
                )
            except requests.exceptions.ConnectionError:
                return default_cover
        return cover_path
    return default_cover


def get_bright_dark_from_cover(image_path: str) -> dict:
    """Get the brightest and lightest colors from an image and save them to a
    JSON file if it isn't already. Then return the path to that JSON file.
    Arguments:
        image_path: The location of the image.
    Returns:
        A dict of bright and dark color eg: {'bright': '#292929', 'dark': '#BEBFC1'}
    """
    if image_path == default_cover:
        return {'bright': '#292929', 'dark': '#BEBFC1'}

    # if the color cache already exists then load that and return
    color_cached = pathlib.PosixPath(f"{os.path.dirname(image_path)}/colors.json")
    if color_cached.is_file():
        return json.loads(color_cached.read_text())

    # generate the brightest and darkest color out of the image
    colors = utils.img_dark_bright_col(image_path)

    # since Firefox only caches one thumbnail at a time and overwrites it
    # we need to keep on regenerating the colors and return them without 
    # caching them.
    parsed_colors = {"bright": colors[3], "dark": colors[9]}
    if "firefox-mpris" in image_path:
        return parsed_colors

    # for other players like spotify - save / cache the thumbnail and return its
    # cache path instead
    color_cached.write_text(json.dumps(parsed_colors))
    return parsed_colors


if __name__ == "__main__":
    with open(os.path.expandvars("$XDG_CONFIG_HOME/eww/ewwrc"), encoding="utf8") as file:
        config: dict = json.loads(file.read())["player"]
        default_cover = os.path.expandvars(config["default_art"])
        pctl_cache = os.path.expandvars(config["pctl_cache"])

    manager = Playerctl.PlayerManager()
    manager.connect("name-appeared", on_name_appeared_vanished)
    manager.connect("name-vanished", on_name_appeared_vanished)

    # loop through and initialize all registered and active MPRIS player on first run.
    [init_player(name) for name in manager.props.player_names]

    # if there are no player on the first run then print fallback / dummy metadata.
    # WARN: Note that a really bad error is thrown when this check is not done.
    # WARN: IIRC it is from the underlying C library so, you can't really try-except that.
    if player_null_check(manager):
        player = Playerctl.Player()
        on_metadata(player, player.props.metadata)

    try:
        loop = GLib.MainLoop()
        loop.run()
    except (KeyboardInterrupt, Exception) as excep:
        loop.quit()


# vim:filetype=python