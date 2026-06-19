# No particular need to have Via mode, kept here to quickly
# enable it to test the PCB.
VIA_ENABLE = no

# 30x WS2812 underglow chain (pin B15, defined in the keyboard's keyboard.json).
# We drive it manually from keymap.c (no built-in animation) so we can light a
# single LED on the base layer and flood white on the FN/DFU layer.
RGBLIGHT_ENABLE = yes
