// aliou's NEO65 tri-mode keymap.
//
// Base layer mirrors my Mode Mirage layout: grave on the top-left key,
// LCTL_T(KC_ESC) modtap on the caps position, eager per-row debounce.
// The FN layer adds the wireless device-switch keys (USB/BT1/BT2/BT3/2.4G)
// at the Tab/Q/W/E/R positions and reset (QK_BOOT) on the B key -- same
// convention as the Mirage (hold B to enter DFU).

#include QMK_KEYBOARD_H

// Tap for ESC, hold for CTRL.
#define CTL_ESC LCTL_T(KC_ESC)

// Tapping a device key selects it; holding it for >= WIRELESS_TAPPING_TERM
// (3 s, see keyboards/neo/neo65_trimode/config.h) enters pairing mode.
// LT(0, ...) is the wrapper edthu's wireless module uses to expose the
// hold-to-pair behavior.
#define BT_SEL(kc) LT(0, kc)

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
  // ── base ──────────────────────────────────────────────────────────────
  // Esc row: the NEO65 has a split-backspace BSLS key (arg 13) the Mirage
  // lacks; it gets KC_BSLS. Everything else is the Mirage layout.
  [0] = LAYOUT(
      KC_GRAVE, KC_1,    KC_2,    KC_3,    KC_4,    KC_5,    KC_6,    KC_7,    KC_8,    KC_9,    KC_0,    KC_MINS, KC_EQL,  KC_BSLS, KC_BSPC, KC_DEL,
      KC_TAB,   KC_Q,    KC_W,    KC_E,    KC_R,    KC_T,    KC_Y,    KC_U,    KC_I,    KC_O,    KC_P,    KC_LBRC, KC_RBRC, KC_BSLS,          KC_PGUP,
      CTL_ESC,  KC_A,    KC_S,    KC_D,    KC_F,    KC_G,    KC_H,    KC_J,    KC_K,    KC_L,    KC_SCLN, KC_QUOT, KC_NUHS, KC_ENT,           KC_PGDN,
      KC_LSFT,  KC_NUBS, KC_Z,    KC_X,    KC_C,    KC_V,    KC_B,    KC_N,    KC_M,    KC_COMM, KC_DOT,  KC_SLSH,          KC_RSFT, KC_UP,   KC_END,
      KC_LCTL,  KC_LALT, KC_LGUI,                            KC_SPC,                             MO(1),   KC_RGUI,          KC_LEFT, KC_DOWN, KC_RGHT
  ),

  // ── FN ────────────────────────────────────────────────────────────────
  // Wireless device select on Tab/Q/W/E/R (tap = select, hold 3s = pair),
  // F-keys, reset on B, media on the nav cluster, and the same QK_BOOT on
  // the grave/esc key as the Mirage, matching the "hold to flash" muscle
  // memory.
  [1] = LAYOUT(
      QK_BOOT,  KC_F1,   KC_F2,   KC_F3,   KC_F4,   KC_F5,   KC_F6,   KC_F7,   KC_F8,   KC_F9,   KC_F10,  KC_F11,  KC_F12,  _______, KC_DEL,  KC_MUTE,
      KC_USB,   BT_SEL(KC_BT1), BT_SEL(KC_BT2), BT_SEL(KC_BT3), BT_SEL(KC_2G4), _______, _______, _______, _______, _______, _______, _______, _______, _______,          KC_VOLU,
      _______,  _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______,          KC_VOLD,
      _______,  _______, _______, _______, _______, _______, QK_BOOT, _______, _______, _______, _______, _______,          _______, _______, KC_MPLY,
      _______,  _______, _______,                            _______,                           _______, _______,          _______, _______, _______
  )
};

// vim:foldmethod=syntax tw=0 shiftwidth=2
