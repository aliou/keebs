// aliou's NEO65 tri-mode keymap.
//
// Base layer mirrors my Mode Mirage layout: grave on the top-left key,
// LCTL_T(KC_ESC) modtap on the caps position, eager per-row debounce.
//
// FN layer is minimal: Fn+Tab toggles wireless device between USB and BT1
// only (the stock code cycles USB -> BT1 -> BT2 -> BT3 -> 2.4G -> USB via
// KC_NXT, which is way more than I need -- I only pair one host). Fn+B
// enters DFU. F-keys + nav cluster are the only other non-transparent bits.
//
// BT pairings live in the CH582F radio's own flash, so they survive a WB32
// firmware swap. After flashing, Fn+Tab back to BT1 and the existing
// pairing reconnects automatically.

#include QMK_KEYBOARD_H
#include "wireless.h"

// Tap for ESC, hold for CTRL.
#define CTL_ESC LCTL_T(KC_ESC)

// Custom user keycode: toggle the active wireless device between USB and BT1.
// SAFE_RANGE is the first value above all QMK + keyboard custom keycodes,
// so this never collides with KC_USB/KC_BT1/.../KC_NXT (QK_KB_0..5).
enum { USB_BT1_TOG = SAFE_RANGE };

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    switch (keycode) {
        case USB_BT1_TOG:
            if (record->event.pressed) {
                uint8_t cur = wireless_get_current_devs();
                // USB <-> BT1 only. If we're on USB, go to BT1 (it auto-
                // reconnects since the pairing is stored in the CH582F radio
                // flash). Otherwise (BT1, BT2, BT3, 2.4G) snap back to USB.
                uint8_t next = (cur == DEVS_USB) ? DEVS_BT1 : DEVS_USB;
                wireless_devs_change(cur, next, false);
            }
            return false;
    }
    return true;
}

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
  // Fn+Tab = toggle USB <-> BT1 (skips BT2/BT3/2.4G).
  // Fn+B   = QK_BOOT (enter WB32 DFU).
  // Everything else falls through (F-keys + nav/media only).
  [1] = LAYOUT(
      _______, KC_F1,   KC_F2,   KC_F3,   KC_F4,   KC_F5,   KC_F6,   KC_F7,   KC_F8,   KC_F9,   KC_F10,  KC_F11,  KC_F12,  _______, KC_DEL,  KC_MUTE,
      USB_BT1_TOG, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______,          KC_VOLU,
      _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______, _______,          KC_VOLD,
      _______, _______, _______, _______, _______, _______, QK_BOOT, _______, _______, _______, _______, _______,          _______, _______, KC_MPLY,
      _______, _______, _______,                            _______,                           _______, _______,          _______, _______, _______
  )
};

// vim:foldmethod=syntax tw=0 shiftwidth=2
