// keyboard-latency-tracer: records every key event macOS sees with high-res
// timestamps so we can measure QMK modtap latency (e.g. LCTL_T(KC_ESC)).
//
// It only OBSERVES events; it never injects or swallows them.
// Requires Input Monitoring permission (System Settings -> Privacy & Security).

#include <ApplicationServices/ApplicationServices.h>
#include <CoreFoundation/CoreFoundation.h>
#include <mach/mach_time.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <signal.h>

// -------- event description helpers --------

static const char *flag_str(CGEventFlags f, char *buf, size_t n) {
    buf[0] = '\0';
    if (f & kCGEventFlagMaskAlternate) strncat(buf, "ALT|", n - strlen(buf) - 1);
    if (f & kCGEventFlagMaskControl)    strncat(buf, "CTL|", n - strlen(buf) - 1);
    if (f & kCGEventFlagMaskShift)     strncat(buf, "SFT|", n - strlen(buf) - 1);
    if (f & kCGEventFlagMaskCommand)    strncat(buf, "CMD|", n - strlen(buf) - 1);
    size_t l = strlen(buf);
    if (l && buf[l - 1] == '|') buf[l - 1] = '\0';
    if (l == 0) strncat(buf, "-", n - strlen(buf) - 1);
    return buf;
}

static const char *key_name(CGKeyCode code) {
    // Only label the keys we care about for this test.
    switch (code) {
        case 59: return "LEFT_CONTROL";
        case 60: return "SHIFT";
        case 58: return "LEFT_OPTION";
        case 55: return "LEFT_COMMAND";
        case 56: return "LEFT_SHIFT";
        case 0:  return "A";
        case 1:  return "S";
        case 2:  return "D";
        case 3:  return "F";
        case 6:  return "Z";
        case 7:  return "X";
        case 8:  return "C";
        case 9:  return "V";
        case 11: return "B";
        case 12: return "Q";
        case 13: return "W";
        case 14: return "E";
        case 15: return "R";
        case 16: return "T";
        case 17: return "Y";
        case 31: return "O";
        case 34: return "I";
        case 38: return "J";
        case 40: return "K";
        case 37: return "L";
        case 41: return "F8";
        case 36: return "ENTER";
        case 49: return "SPACE";
        case 53: return "ESC";
        case 14 + 50: return "?";
        default: return "?";
    }
}

// -------- mach time conversions --------

static mach_timebase_info_data_t s_tb;
static uint64_t s_t0; // monotonic ns at program start

static uint64_t event_to_ns(CGEventRef ev) {
    // CGEvent timestamps are in the same units as mach_absolute_time.
    uint64_t t = (uint64_t)CGEventGetTimestamp(ev);
    uint64_t ns = (t * s_tb.numer) / s_tb.denom;
    if (s_t0 == 0) s_t0 = ns;
    return ns;
}

// -------- stopping the run loop --------

// We can't use Ctrl+C to quit: on the tested keyboard, Ctrl+C is itself a
// Ctrl+key combo we want to measure, AND the terminal turns Ctrl+C into
// SIGINT. So we IGNORE SIGINT entirely (and SIGTSTP/SIGQUIT from Ctrl+Z,
// Ctrl+\ too) and instead stop on:
//   - bare 'q' keypress, or
//   - 10 s of no activity (auto-stop), or
//   - SIGTERM (`pkill tracer`) as a backup.
static void stop_loop(void) { CFRunLoopStop(CFRunLoopGetCurrent()); }

static void sigterm_handler(int sig) {
    (void)sig;
    stop_loop();
}

// Last event wall-clock time (CFAbsoluteTime, seconds since 2001) for idle
// detection. Using wall clock avoids any clock-base mismatch between
// CGEvent timestamps and mach_absolute_time.
static CFAbsoluteTime s_last_evt_wall = 0;
static double         s_idle_seconds = 10.0;

// -------- per-event logging --------

typedef struct {
    uint64_t ts_ns;
    uint64_t gap_us;
    const char *kind;       // "FLAGS", "DOWN", "UP"
    CGKeyCode code;
    CGEventFlags flags;
} line_t;

#define MAX_LINES 65536
static line_t s_lines[MAX_LINES];
static size_t s_nlines = 0;

static void log_event(uint64_t ts_ns, const char *kind,
                      CGKeyCode code, CGEventFlags flags) {
    s_last_evt_wall = CFAbsoluteTimeGetCurrent();
    if (s_nlines >= MAX_LINES) { stop_loop(); return; }
    uint64_t gap = s_nlines ? (ts_ns - s_lines[s_nlines - 1].ts_ns) / 1000 : 0;
    s_lines[s_nlines].ts_ns    = ts_ns;
    s_lines[s_nlines].gap_us   = gap;
    s_lines[s_nlines].kind     = kind;
    s_lines[s_nlines].code     = code;
    s_lines[s_nlines].flags    = flags;
    s_nlines++;

    char fbuf[64];
    printf("%12llu %12llu %-6s keycode=%3d name=%-14s flags=%s\n",
           ts_ns, gap, kind, (int)code, key_name(code),
           flag_str(flags, fbuf, sizeof(fbuf)));
    fflush(stdout);
}

// -------- event tap callback --------

// Periodic timer: auto-stop after s_idle_seconds of no events.
static void idle_timer_cb(CFRunLoopTimerRef t, void *info) {
    (void)t; (void)info;
    if (s_last_evt_wall == 0) return; // haven't seen any events yet
    double idle = CFAbsoluteTimeGetCurrent() - s_last_evt_wall;
    if (idle >= s_idle_seconds) {
        fprintf(stderr, "\n[%.1fs idle -> stopping]\n", idle);
        stop_loop();
    }
}

static CGEventRef tap_callback(CGEventTapProxy proxy, CGEventType type,
                               CGEventRef event, void *userInfo) {
    (void)proxy; (void)userInfo;

    if (type == kCGEventTapDisabledByTimeout ||
        type == kCGEventTapDisabledByUserInput) {
        return event;
    }

    CGKeyCode code = CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
    CGEventFlags flags = CGEventGetFlags(event);
    uint64_t ns = event_to_ns(event);

    switch (type) {
        case kCGEventFlagsChanged: log_event(ns, "FLAGS", code, flags); break;
        case kCGEventKeyDown:
            log_event(ns, "DOWN", code, flags);
            // Stop on a bare 'q' (no modifiers) so the tested keyboard can
            // end the trace without injecting a Ctrl+key combo.
            if (code == 12 && !flags) { // 12 == 'q'
                fprintf(stderr, "\n['q' pressed -> stopping]\n");
                stop_loop();
            }
            break;
        case kCGEventKeyUp:        log_event(ns, "UP",    code, flags); break;
        default: break;
    }
    return event; // pass through unchanged
}

// -------- summary at exit --------

static int cmp_gap(const void *a, const void *b) {
    uint64_t ga = ((const line_t *)a)->gap_us;
    uint64_t gb = ((const line_t *)b)->gap_us;
    return (ga < gb) - (ga > gb);
}

static void print_summary(void) {
    if (s_nlines < 2) return;
    printf("\n=== summary: %zu events ===\n", s_nlines);

    // Sort a copy by gap to show the top 10 longest inter-event gaps.
    // This highlights any ~200000us (tapping term) deferral.
    static line_t sorted[MAX_LINES];
    memcpy(sorted, s_lines, s_nlines * sizeof(line_t));
    qsort(sorted, s_nlines, sizeof(line_t), cmp_gap);

    printf("top 10 longest gaps between consecutive events:\n");
    size_t top = s_nlines < 10 ? s_nlines : 10;
    for (size_t i = 0; i < top; i++) {
        char fbuf[64];
        printf("  %12llu us  %-6s name=%-14s flags=%s\n",
               sorted[i].gap_us, sorted[i].kind, key_name(sorted[i].code),
               flag_str(sorted[i].flags, fbuf, sizeof(fbuf)));
    }

    // Also report specifically the relationship we came here to test:
    // for any DOWN event whose flags show CTL, find the preceding
    // FLAGS event that *set* CTL and report the gap between them.
    printf("\nctrl+key combos (CTL flag set at key-down):\n");
    int found = 0;
    for (size_t i = 0; i < s_nlines; i++) {
        if (strcmp(s_lines[i].kind, "DOWN") != 0) continue;
        if (!(s_lines[i].flags & kCGEventFlagMaskControl)) continue;
        // Walk backward to the most recent FLAGS event whose flags set CTL
        // and which represents the moment CTL went down.
        // We approximate: previous FLAGS event overall.
        uint64_t ctl_down_at = 0;
        int ctl_down_seen = 0;
        for (ssize_t j = (ssize_t)i - 1; j >= 0; j--) {
            if (strcmp(s_lines[j].kind, "FLAGS") != 0) continue;
            if (s_lines[j].flags & kCGEventFlagMaskControl) {
                ctl_down_at = s_lines[j].ts_ns;
                ctl_down_seen = 1;
            } else {
                break; // CTL was not set here
            }
        }
        char fbuf[64];
        if (ctl_down_seen) {
            uint64_t gap_us = (s_lines[i].ts_ns - ctl_down_at) / 1000;
            printf("  %-14s: %llu us between CTL-going-down and this key-down\n",
                   key_name(s_lines[i].code), gap_us);
        } else {
            printf("  %-14s: CTL flag set but no prior CTL-down FLAGS event "
                   "(rolled together) flags=%s\n",
                   key_name(s_lines[i].code),
                   flag_str(s_lines[i].flags, fbuf, sizeof(fbuf)));
        }
        found++;
    }
    if (!found) {
        printf("  (none observed -- you didn't produce a Ctrl+key combo)\n");
    }
}

int main(void) {
    mach_timebase_info(&s_tb);

    CFMachPortRef tap = CGEventTapCreate(
        kCGSessionEventTap, kCGHeadInsertEventTap,
        kCGEventTapOptionListenOnly,
        CGEventMaskBit(kCGEventFlagsChanged) |
        CGEventMaskBit(kCGEventKeyDown) |
        CGEventMaskBit(kCGEventKeyUp),
        tap_callback, NULL);

    if (!tap) {
        fprintf(stderr,
            "Could not create event tap.\n"
            "Grant Input Monitoring permission to this terminal/app in\n"
            "System Settings -> Privacy & Security -> Input Monitoring,\n"
            "then re-run.\n");
        return 1;
    }

    CFRunLoopSourceRef src = CFMachPortCreateRunLoopSource(
        kCFAllocatorDefault, tap, 0);
    CFRunLoopAddSource(CFRunLoopGetCurrent(), src, kCFRunLoopCommonModes);
    CGEventTapEnable(tap, true);

    // Ignore the terminal "quit" signals so typing Ctrl+C / Ctrl+Z / Ctrl+\
    // (which the terminal converts to SIGINT/SIGTSTP/SIGQUIT) does not kill
    // the tracer. Stop with bare 'q', idle timeout, or `pkill tracer` (SIGTERM).
    signal(SIGINT,  SIG_IGN);
    signal(SIGTSTP, SIG_IGN);
    signal(SIGQUIT, SIG_IGN);
    signal(SIGTERM, sigterm_handler);

    // Idle timer: check every 0.25s whether we've gone quiet.
    CFRunLoopTimerRef timer = CFRunLoopTimerCreate(
        kCFAllocatorDefault,
        CFAbsoluteTimeGetCurrent() + 0.25, 0.25, 0, 0,
        idle_timer_cb, NULL);
    CFRunLoopAddTimer(CFRunLoopGetCurrent(), timer, kCFRunLoopCommonModes);

    printf("Tracing. Stop with: bare 'q', or %g s idle.\n"
           "(Ctrl+C is ignored so you can measure Ctrl+key combos. "
           "Backup stop: `pkill tracer`.)\n\n",
           s_idle_seconds);
    printf("%12s %12s %-6s %-14s %-14s %s\n",
           "ns", "us_gap", "kind", "", "name", "flags");

    CFRunLoopRun();

    print_summary();
    return 0;
}
