#include QMK_KEYBOARD_H

enum layer_names {
  _BASE,
  _FN1,
};

// Prefix custom keycodes by `MN` to prevent colisions.
// Overlay trigger: the physical FN key switches to layer _FN1 AND emits an inert
// host-visible F-key (F13) for the duration it's held. Hammerspoon watches for
// F13 keydown/keyup to show the per-board FN-layer cheat sheet. One distinct
// F-key per board, so the overlay knows which keyboard acted.
//
// Replaces MO(_FN1) at the FN position. Manual layer_on/layer_off preserves
// the exact MO() momentary-layer semantics; all other FN-layer bindings
// (arrows, DFU, media) are untouched.
#define OV_FN_KEY KC_F13

enum custom_keycodes {
  MN_DFU = SAFE_RANGE,
  OV_TRIGGER,
  CTL_DBL_FN,
};

// Tap for ESC, hold for CTRL.
#define CTL_ESC  LCTL_T(KC_ESC)

// Double-tap window for the bottom-left Ctrl -> macOS Fn/Globe shortcut.
#define MAC_FN_DOUBLE_TAP_TERM 250

// CTL_DBL_FN: tap for left Ctrl (still usable as a modifier), double-tap with
// no intervening chord to fire the macOS Fn/Globe shortcut (two consumer-page
// taps that open the input-source picker). Mirrors the Mode Mirage and NEO65
// keymaps exactly so the gesture feels identical across boards.
static uint16_t ctl_dbl_fn_timer;
static bool     ctl_dbl_fn_down;
static bool     ctl_dbl_fn_chorded;
static bool     ctl_dbl_fn_tap_pending;
static bool     ctl_dbl_fn_second_tap;

static void tap_mac_fn(void) {
  host_consumer_send(AC_NEXT_KEYBOARD_LAYOUT_SELECT);
  wait_ms(20);
  host_consumer_send(0);
  wait_ms(20);
}

static void tap_mac_fn_twice(void) {
  tap_mac_fn();
  tap_mac_fn();
}

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
  [_BASE] = LAYOUT_60_ansi(
    KC_GRAVE, KC_1,    KC_2,    KC_3,    KC_4,    KC_5,    KC_6,   KC_7,    KC_8,    KC_9,    KC_0,     KC_MINS, KC_EQL,  KC_BSPC,
    KC_TAB,   KC_Q,    KC_W,    KC_E,    KC_R,    KC_T,    KC_Y,   KC_U,    KC_I,    KC_O,    KC_P,     KC_LBRC, KC_RBRC, KC_BSLS,
    CTL_ESC,  KC_A,    KC_S,    KC_D,    KC_F,    KC_G,    KC_H,   KC_J,    KC_K,    KC_L,    KC_SCLN,  KC_QUOT,          KC_ENT,
    KC_LSFT,  KC_Z,    KC_X,    KC_C,    KC_V,    KC_B,    KC_N,   KC_M,    KC_COMM, KC_DOT,  KC_SLSH,                    KC_RSFT,
    CTL_DBL_FN, KC_LALT, KC_LGUI,                          KC_SPC,                            OV_TRIGGER, KC_RGUI, KC_RALT, KC_RCTL
  ),

  // WASD for arrow keys + B for DFU mode + bottom right keys for arrow keys.
  [_FN1] = LAYOUT_60_ansi(
    _______, KC_F1,   KC_F2,   KC_F3,   KC_F4,   KC_F5,   KC_F6,   KC_F7,   KC_F8,   KC_F9,   KC_F10,   KC_VOLD, KC_VOLU, KC_DEL,
    _______, _______, KC_UP,   _______, _______, _______, _______, _______, _______, _______, _______,  KC_F14,  KC_F15,  _______,
    _______, KC_LEFT, KC_DOWN, KC_RGHT, _______, _______, _______, _______, _______, _______, KC_MPRV,  KC_MNXT,          _______,
    _______, _______, _______, _______, _______, MN_DFU,  _______, _______, _______, _______, _______,                    KC_UP,
    _______, _______, _______,                            _______,                            _______,  KC_LEFT, KC_DOWN, KC_RGHT
  ),
};

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
  static uint32_t key_timer;

  switch (keycode) {
    // Put keyboard in DFU mode when pressing the combination for more than 500ms.
    case MN_DFU:
      if (record->event.pressed) {
        key_timer = timer_read32();
      } else {
        if (timer_elapsed32(key_timer) >= 500) {
          reset_keyboard();
        }
      }
      return false;

    case OV_TRIGGER:
      if (record->event.pressed) {
        layer_on(_FN1);
        register_code16(OV_FN_KEY);
      } else {
        unregister_code16(OV_FN_KEY);
        layer_off(_FN1);
      }
      return false;

    case CTL_DBL_FN:
      if (record->event.pressed) {
        ctl_dbl_fn_down       = true;
        ctl_dbl_fn_chorded    = false;
        ctl_dbl_fn_second_tap = ctl_dbl_fn_tap_pending && timer_elapsed(ctl_dbl_fn_timer) < MAC_FN_DOUBLE_TAP_TERM;
        if (!ctl_dbl_fn_second_tap) {
          ctl_dbl_fn_tap_pending = false;
        }
        register_code(KC_LCTL);
      } else {
        unregister_code(KC_LCTL);
        ctl_dbl_fn_down = false;

        if (ctl_dbl_fn_second_tap && !ctl_dbl_fn_chorded) {
          ctl_dbl_fn_tap_pending = false;
          tap_mac_fn_twice();
        } else {
          ctl_dbl_fn_tap_pending = !ctl_dbl_fn_chorded;
          ctl_dbl_fn_timer       = timer_read();
        }
        ctl_dbl_fn_second_tap = false;
      }
      return false;
  }

  // Any key pressed while CTL_DBL_FN is held counts as a chord, cancelling the
  // pending double-tap so normal Ctrl use never misfires the Fn/Globe shortcut.
  // Runs for all keycodes that fall through the switch -- the custom keycodes
  // above all `return false`, so they correctly skip this.
  if (ctl_dbl_fn_down && record->event.pressed) {
    ctl_dbl_fn_chorded = true;
  }

  return true;
}

// vim:foldmethod=syntax tw=0 shiftwidth=2
