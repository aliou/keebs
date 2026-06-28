// milky_neko config -- matches the Mirage/NEO65 mod-tap + debounce behavior.
// The DB60 keyboard-level config (info.json, rules.mk) ships pure QMK defaults,
// so without these defines a rolled LCTL_T(KC_ESC) + key resolves as <ESC-key>
// instead of <C-key>, and the rolled keypress lags the modifier ~7 ms.

#pragma once

// Make sure to use the hold action when typing another key.
// For example, when typing LCTL_T(KC_ESC) + c, it will send <C-c> instead of
// <ESC-c>. This matches the behaviour of the Mirage and NEO65.
#define HOLD_ON_OTHER_KEY_PRESS

// Use eager per-row debounce instead of QMK's default (sym_defer_g, 5 ms).
// The default holds each new keypress for ~5 ms before reporting it; with a
// mod-tap (LCTL_T(KC_ESC)), that means the modifier report and the rolled
// keypress report land ~7 ms apart on the host -- noticeably laggy for
// Ctrl+anything. Eager debounce reports the press immediately and only
// reverts if noise is detected within DEBOUNCE ms, matching the snappy feel
// of the other boards (Mirage measured 7.4 ms -> ~0.1 ms).
#define DEBOUNCE_TYPE sym_eager_pr
#define DEBOUNCE 5

// Fix for USB suspend/resume issue on Apple Silicon Macs.
// Adds delay after USB resume to allow host controller to stabilize.
// See: https://github.com/qmk/qmk_firmware/issues/17876
#define USB_SUSPEND_WAKEUP_DELAY 200

// Turn the underglow off while the host is suspended (Mac asleep), and restore
// it on resume. Keeps the board dark when the Mac sleeps.
#define RGBLIGHT_SLEEP
