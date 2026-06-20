// BLE advertisement scanner via CoreBluetooth (no dependencies, uses system Swift).
// Prints every BLE device seen advertising during the scan window.
//
// Build & run:
//   swift scripts/ble-scan.swift 25
// While scanning, hold MO(1)+Q on the NEO65 to trigger pairing.

import Foundation
import CoreBluetooth

let seconds = CommandLine.arguments.count > 1
    ? Int(CommandLine.arguments[1]) ?? 20 : 20

class Scanner: NSObject, CBCentralManagerDelegate {
    var seen: [String: (String, Int)] = [:]
    var mgr: CBCentralManager!

    func start() {
        mgr = CBCentralManager(delegate: self, queue: nil, options: nil)
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            central.scanForPeripherals(withServices: nil, options: nil)
            print("scanning for \(seconds)s -- hold MO(1)+Q on the board NOW to pair")
        } else {
            print("Bluetooth not powered on (state=\(central.state.rawValue))")
            print("open System Settings > Bluetooth")
        }
    }

    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String: Any],
                        rssi RSSI: NSNumber) {
        let uuid = peripheral.identifier.uuidString
        let name = (peripheral.name
                    ?? (advertisementData[CBAdvertisementDataLocalNameKey] as? String)
                    ?? "(no name)")
        let rssi = RSSI.intValue
        // Only re-print first sighting per uuid.
        guard seen[uuid] == nil || seen[uuid]!.0 != name else { return }
        seen[uuid] = (name, rssi)
        let svcs = (advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID])?
            .map { $0.uuidString } ?? []
        let mfr = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data
        let mfrHex = mfr?.map { String(format: "%02x", $0) }.joined() ?? ""
        print(String(format: "[%4d dBm] %@  uuid=%@  mfr=%@  svcs=%@",
                     rssi, name, uuid, mfrHex, svcs.joined(separator: ",")))
    }
}

let s = Scanner()
s.start()
Thread.sleep(forTimeInterval: TimeInterval(seconds))
print("\n--- scan done, \(s.seen.count) unique device(s) ---")
