source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

# Aliases
alias ls="ls -a --color"
alias lsd="lsd -a"
alias cls="clear"
alias gdebug="GTK_DEBUG=interactive"

# Keybindings
bindkey "^[[1;5C" forward-word
bindkey "^[[1;5D" backward-word
bindkey  "^[[H"   beginning-of-line
bindkey  "^[[F"   end-of-line
bindkey "\e[3~" delete-char
bindkey '^H' backward-kill-word
bindkey '^[[3;5~' kill-word

autoload -U promptinit; promptinit
PURE_PROMPT_SYMBOL="❯❯❯"
prompt pure

# Exec when loading zsh
# Insert something here