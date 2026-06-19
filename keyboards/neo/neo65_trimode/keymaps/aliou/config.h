// aliou's NEO65 tri-mode keymap config -- matches the Mirage behavior.

#pragma once

// Use the hold action when typing another key. With LCTL_T(KC_ESC), rolling
// Ctrl+another key sends <C-key> instead of <ESC-key>.
#define HOLD_ON_OTHER_KEY_PRESS

// Eager per-row debounce instead of QMK's default (sym_defer_g, 5 ms). The
// default holds each new keypress for ~5 ms before reporting it; with a
// mod-tap that means the modifier report and the rolled keypress land ~7 ms
// apart on the host -- laggy for Ctrl+anything. Eager reports the press
// immediately and only reverts on noise within DEBOUNCE ms. Measured on the
// Mirage: ~7.4 ms -> ~0.04 ms. Same fix for the NEO65.
#define DEBOUNCE_TYPE sym_eager_pr
#define DEBOUNCE 5
