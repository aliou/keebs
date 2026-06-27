#include QMK_KEYBOARD_H

// Tap for ESC, hold for CTRL.
#define CTL_ESC  LCTL_T(KC_ESC)

// Double-tap window for the bottom-left Ctrl -> macOS Fn/Globe shortcut.
#define MAC_FN_DOUBLE_TAP_TERM 250

// OV_TRIGGER: the physical FN key switches to layer 1 AND emits an inert
// host-visible F-key (F14) for the duration it's held. Hammerspoon watches
// F14 keydown/keyup to show this board's FN-layer cheat sheet. Each board
// uses a distinct F-key so the overlay knows which keyboard acted.
// Manual layer_on/layer_off reproduces MO(); media/F-row/DFU untouched.
#define OV_FN_KEY KC_F14

enum custom_keycodes {
    CTL_DBL_FN = SAFE_RANGE,
    OV_TRIGGER,
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

        case OV_TRIGGER:
            if (record->event.pressed) {
                layer_on(1);
                register_code16(OV_FN_KEY);
            } else {
                unregister_code16(OV_FN_KEY);
                layer_off(1);
            }
            return false;
    }

    if (ctl_dbl_fn_down && record->event.pressed) {
        ctl_dbl_fn_chorded = true;
    }

    return true;
}

const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
  [0] = LAYOUT(
      KC_GRAVE, KC_1   , KC_2   , KC_3   , KC_4   , KC_5   , KC_6   , KC_7   , KC_8   , KC_9   , KC_0   , KC_MINS, KC_EQL , KC_BSPC, KC_DEL ,
      KC_TAB ,  KC_Q   , KC_W   , KC_E   , KC_R   , KC_T   , KC_Y   , KC_U   , KC_I   , KC_O   , KC_P   , KC_LBRC, KC_RBRC, KC_BSLS, KC_PGUP,
      CTL_ESC,  KC_A   , KC_S   , KC_D   , KC_F   , KC_G   , KC_H   , KC_J   , KC_K   , KC_L   , KC_SCLN, KC_QUOT, KC_ENT , KC_PGDN,
      KC_LSFT,  KC_Z   , KC_X   , KC_C   , KC_V   , KC_B   , KC_N   , KC_M   , KC_COMM, KC_DOT , KC_SLSH, KC_RSFT, KC_UP  , KC_END ,
      CTL_DBL_FN, KC_LALT, KC_LGUI,                          KC_SPC ,                   OV_TRIGGER, KC_RGUI, KC_LEFT, KC_DOWN, KC_RGHT
  ),
  [1] = LAYOUT(
      QK_BOOT,  KC_F1  , KC_F2  , KC_F3  , KC_F4  , KC_F5  , KC_F6  , KC_F7  , KC_F8  , KC_F9  , KC_F10 , KC_F11 , KC_F12 , KC_DEL , KC_MUTE,
      KC_TRNS,  KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_VOLU,
      KC_TRNS,  KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_VOLD,
      KC_TRNS,  KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, QK_BOOT, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_MPLY,
      KC_TRNS,  KC_TRNS, KC_TRNS,                            KC_TRNS,                   KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS, KC_TRNS
  )
};

// vim:foldmethod=syntax tw=0 shiftwidth=2

// ---------------------------------------------------------------------------
// Underglow: a 30-LED WS2812 chain (pin B15). We take it over manually instead
// of using the built-in animation engine, so a single LED can be lit on the
// base layer and the whole strip flooded on the FN layer.
//
//   layer 0 (base): only the top-left LED (chain index 0 -- best assumption,
//                   the strip's physical order isn't documented) lit, cycling
//                   hue endlessly. Everything else off.
//   layer 1 (FN):   all LEDs white to signal the DFU/reset layer. There is no
//                   addressable LED under the B key (it's an underglow strip,
//                   not per-key RGB), so the B-key highlight the original spec
//                   asked for isn't possible here; solid white flags the layer.
//
// Resistance to overwrites: we set the mode to RGBLIGHT_MODE_STATIC_LIGHT,
// under which the rgblight timer task runs rgblight_effect_dummy (a no-op), so
// our manual writes persist between ticks.
// ---------------------------------------------------------------------------

#define MIRAGE_LED_COUNT 30

// Brightness (0-255 per channel).
#define MIRAGE_VAL_LAYER0 255 // single LED
#define MIRAGE_VAL_LAYER1 255 // full white flood

static uint8_t  mirage_hue      = 0;
static uint16_t mirage_last     = 0;
static uint8_t  mirage_prev_top = 0xFF;

static void mirage_render(uint8_t top_layer) {
    if (top_layer == 1) {
        // FN/DFU layer: flood white.
        rgblight_setrgb(MIRAGE_VAL_LAYER1, MIRAGE_VAL_LAYER1, MIRAGE_VAL_LAYER1);
    } else {
        // Base layer: everything off, then light only the top-left LED with
        // the current cycling hue.
        rgblight_setrgb(0, 0, 0);
        rgb_t c = hsv_to_rgb((hsv_t){mirage_hue, 255, MIRAGE_VAL_LAYER0});
        rgblight_setrgb_at(c.r, c.g, c.b, 0);
    }
}

void keyboard_post_init_user(void) {
    // No animation engine -- we drive the strip directly.
    rgblight_enable_noeeprom();
    rgblight_mode_noeeprom(RGBLIGHT_MODE_STATIC_LIGHT);
    mirage_prev_top = get_highest_layer(layer_state | default_layer_state);
    mirage_render(mirage_prev_top);
}

void housekeeping_task_user(void) {
    uint8_t top = get_highest_layer(layer_state | default_layer_state);

    // Redraw immediately on a layer change, otherwise advance the hue / repaint
    // at ~30 fps to keep the single-LED rainbow smooth without flooding the
    // WS2812 bus every loop iteration.
    if (top != mirage_prev_top) {
        mirage_render(top);
        mirage_prev_top = top;
        return;
    }

    if (timer_elapsed(mirage_last) > 33) {
        mirage_last = timer_read();
        if (top == 0) {
            mirage_hue += 8; // wraps uint8_t -> endless color cycle
            mirage_render(top);
        }
    }
}
