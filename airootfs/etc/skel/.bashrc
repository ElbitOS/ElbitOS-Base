#
# ~/.bashrc
#

# If not running interactively, don't do anything
[[ $- != *i* ]] && return

_BLUE="$(tput setaf 4)"
_GREEN="$(tput setaf 2)"
_CYAN="$(tput setaf 6)"
_BOLD="$(tput bold)"
_RESET="$(tput sgr0)"

alias ls='ls --color=auto'
PS1='\[${_BOLD}${_BLUE}\]\u@\h \[${_CYAN}\]\W \[${_GREEN}\]>>\[${_RESET}\] '
neofetch
