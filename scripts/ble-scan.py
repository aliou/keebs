#!/usr/bin/env python3
"""CoreBluetooth BLE advertisement scanner.

Listens for BLE advertisements for ~20s and prints every device seen, its
(name, RSSI, advertised services, manufacturer data). Used to check whether
the NEO65's CH582F radio is actually advertising when we tell it to pair.

Run inside: nix shell nixpkgs#python311Packages.pyobjc-core \
                    nixpkgs#python311Packages.pyobjc-framework-CoreBluetooth \
            -c python3 scripts/ble-scan.py
"""
import sys
import time
from Foundation import NSObject, NSRunLoop, NSDate
from CoreBluetooth import (
    CBCentralManager,
    CBManagerStatePoweredOn,
)

SECONDS = int(sys.argv[1]) if len(sys.argv) > 1 else 20

seen = {}  # uuid -> last snapshot


class Delegate(NSObject):
    def centralManagerDidUpdateState_(self, central):
        st = central.state()
        print(f"state={st} (poweredOn={CBManagerStatePoweredOn})")
        if st == CBManagerStatePoweredOn:
            central.scanForPeripheralsWithServices_options_(None, None)
            print(f"scanning for {SECONDS}s -- hold MO(1)+Q on the board NOW to pair")
        else:
            print("Bluetooth not powered on -- open System Settings > Bluetooth")

    def centralManager_didDiscoverPeripheral_advertisementData_RSSI_(
        self, central, peripheral, adv, rssi
    ):
        uuid = peripheral.identifier().UUIDString()
        name = peripheral.name() or adv.get("kCBAdvDataLocalName") or "(no name)"
        svcs = list(adv.get("kCBAdvDataServiceUUIDs", []) or [])
        mfr = adv.get("kCBAdvDataManufacturerData")
        mfr_hex = bytes(mfr).hex() if mfr else ""
        key = (uuid, str(name))
        prev = seen.get(key)
        # Only re-print if something changed or first sighting.
        snap = (str(name), int(rssi), mfr_hex, tuple(svcs))
        if prev != snap:
            seen[key] = snap
            print(f"[{int(rssi):>4} dBm] {name}  uuid={uuid}  mfr={mfr_hex}  svcs={svcs}")


def main():
    d = Delegate.alloc().init()
    mgr = CBCentralManager.alloc().initWithDelegate_queue_(d, None)
    loop = NSRunLoop.currentRunLoop()
    end = time.time() + SECONDS
    while time.time() < end:
        loop.runUntilDate_(NSDate.dateWithTimeIntervalSinceNow_(0.25))
    mgr.stopScan()
    print(f"\n--- scan done, {len(seen)} unique device(s) ---")


if __name__ == "__main__":
    main()
