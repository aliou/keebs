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

// Double-tap window for the bottom-left Ctrl -> macOS Fn/Globe shortcut.
#define MAC_FN_DOUBLE_TAP_TERM 250

// Custom user keycode: toggle the active wireless device between USB and BT1.
// SAFE_RANGE is the first value above all QMK + keyboard custom keycodes,
// so this never collides with KC_USB/KC_BT1/.../KC_NXT (QK_KB_0..5).
enum {
    USB_BT1_TOG = SAFE_RANGE,
    CTL_DBL_FN,
};

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

    if (ctl_dbl_fn_down && record->event.pressed) {
        ctl_dbl_fn_chorded = true;
    }

    return true;
}

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
  // ── base ──────────────────────────────────────────────────────────────
  // ANSI 65% layout -- same physical key arrangement as the Mode Mirage.
  // Extra matrix positions (split backspace, ISO NUHS/NUBS) are KC_NO.
  // KC_NO is QMK's no-op (0x00): the key does nothing. It is used for
  // matrix positions that have no physical switch on this board variant.
  // KC_TRNS would fall through to the layer below; KC_NO is an active
  // "do nothing" binding.
  [0] = LAYOUT(
      KC_GRAVE, KC_1,    KC_2,    KC_3,    KC_4,    KC_5,    KC_6,    KC_7,    KC_8,    KC_9,    KC_0,    KC_MINS, KC_EQL,  KC_NO,   KC_BSPC, KC_DEL,
      KC_TAB,   KC_Q,    KC_W,    KC_E,    KC_R,    KC_T,    KC_Y,    KC_U,    KC_I,    KC_O,    KC_P,    KC_LBRC, KC_RBRC, KC_BSLS,          KC_PGUP,
      CTL_ESC,  KC_A,    KC_S,    KC_D,    KC_F,    KC_G,    KC_H,    KC_J,    KC_K,    KC_L,    KC_SCLN, KC_QUOT, KC_NO,   KC_ENT,           KC_PGDN,
      KC_LSFT,  KC_NO,   KC_Z,    KC_X,    KC_C,    KC_V,    KC_B,    KC_N,    KC_M,    KC_COMM, KC_DOT,  KC_SLSH,          KC_RSFT, KC_UP,   KC_END,
      CTL_DBL_FN, KC_LALT, KC_LGUI,                          KC_SPC,                             MO(1),   KC_RGUI,          KC_LEFT, KC_DOWN, KC_RGHT
  ),

  // ── FN ────────────────────────────────────────────────────────────────
  // Fn+Tab = toggle USB <-> BT1 (skips BT2/BT3/2.4G).
  // Fn+B   = QK_BOOT (enter WB32 DFU).
  // Everything else falls through (F-keys + nav/media only).
  [1] = LAYOUT(
      QK_BOOT,     KC_F1,   KC_F2,   KC_F3,   KC_F4,   KC_F5,   KC_F6,   KC_F7,   KC_F8,   KC_F9,   KC_F10,  KC_F11,  KC_F12,  KC_NO,   KC_DEL,  KC_MUTE,
      USB_BT1_TOG, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS,          KC_VOLU,
      KC_TRNS,     KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_NO,   KC_TRNS,          KC_VOLD,
      KC_TRNS,     KC_NO,   KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, QK_BOOT, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS,          KC_TRNS, KC_TRNS, KC_MPLY,
      KC_TRNS,     KC_TRNS, KC_TRNS,                            KC_TRNS,                            KC_TRNS, KC_TRNS,          KC_TRNS, KC_TRNS, KC_TRNS
  )
};

// vim:foldmethod=syntax tw=0 shiftwidth=2
