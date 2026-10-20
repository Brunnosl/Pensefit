import Foundation
import Capacitor
import CoreLocation
import CryptoKit
import Security
import AVFoundation
import UserNotifications

final class ActiveVault {
    private func accountTag(_ account: String) throws -> String {
        guard UUID(uuidString: account) != nil else { throw NSError(domain: "PenseActive", code: 401) }
        return SHA256.hash(data: Data(account.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    private func key(_ account: String) throws -> SymmetricKey {
        let tag = try accountTag(account)
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.pensefit.active", kSecAttrAccount as String: tag, kSecReturnData as String: true]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess, let data = item as? Data { return SymmetricKey(data: data) }
        guard status == errSecItemNotFound else { throw NSError(domain: "Keychain", code: Int(status)) }
        let result = SymmetricKey(size: .bits256)
        let bytes = result.withUnsafeBytes { Data($0) }
        let add: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "com.pensefit.active", kSecAttrAccount as String: tag, kSecValueData as String: bytes, kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        guard SecItemAdd(add as CFDictionary, nil) == errSecSuccess else { throw NSError(domain: "Keychain", code: 500) }
        return result
    }
    private func url(_ account: String, _ name: String) throws -> URL {
        guard name.range(of: "^[a-z-]{1,40}$", options: .regularExpression) != nil else { throw NSError(domain: "PenseActive", code: 400) }
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("PenseActive", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var folder = directory
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try folder.setResourceValues(values)
        return directory.appendingPathComponent(try accountTag(account) + "-" + name + ".bin")
    }
    func write(_ account: String, _ name: String, _ value: String) throws {
        let sealed = try AES.GCM.seal(Data(value.utf8), using: key(account), authenticating: Data((account + ":" + name).utf8))
        guard let bytes = sealed.combined else { throw NSError(domain: "PenseActive", code: 500) }
        let file = try url(account, name)
        try bytes.write(to: file, options: .atomic)
        try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: file.path)
    }
    func read(_ account: String, _ name: String) throws -> String? {
        let file = try url(account, name)
        guard FileManager.default.fileExists(atPath: file.path) else { return nil }
        let box = try AES.GCM.SealedBox(combined: Data(contentsOf: file))
        let data = try AES.GCM.open(box, using: key(account), authenticating: Data((account + ":" + name).utf8))
        return String(data: data, encoding: .utf8)
    }
    func remove(_ account: String, _ name: String) throws { let file = try url(account, name); if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) } }
}

@objc(PenseActivePlugin)
public class PenseActivePlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "PenseActivePlugin"
    public let jsName = "PenseActive"
    public let pluginMethods: [CAPPluginMethod] = ["bindAccount", "secureRead", "secureWrite", "secureRemove", "startRun", "stopRun", "saveRun", "readRun", "setTimer", "stopTimer", "speak", "stopAll"].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    private var account = ""
    private let vault = ActiveVault()
    private let location = CLLocationManager()
    private let speech = AVSpeechSynthesizer()
    private var runData: [String: Any]?
    private var last: CLLocation?
    private var started: TimeInterval = 0
    private var baseSeconds: Double = 0
    private var running = false
    private var pendingStart: CAPPluginCall?
    public override func load() { location.delegate = self }
    private func owner(_ call: CAPPluginCall) throws { guard !account.isEmpty, call.getString("account", account) == account else { throw NSError(domain: "PenseActive", code: 401) } }
    private func json(_ value: Any) throws -> String { String(data: try JSONSerialization.data(withJSONObject: value), encoding: .utf8)! }
    private func main(_ call: CAPPluginCall, _ action: @escaping () throws -> JSObject?) { DispatchQueue.main.async { do { if let value = try action() { call.resolve(value) } else { call.resolve() } } catch { call.reject("Operação nativa indisponível. Confira permissões e tente novamente.") } } }
    @objc func bindAccount(_ call: CAPPluginCall) { main(call) { let next = call.getString("account", ""); if next != self.account { self.stopTracking(); self.speech.stopSpeaking(at: .immediate); UNUserNotificationCenter.current().removeAllPendingNotificationRequests() }; self.account = next; return nil } }
    @objc func secureRead(_ call: CAPPluginCall) { main(call) { try self.owner(call); return ["value": try self.vault.read(self.account, call.getString("key", "offline")) as Any? ?? NSNull()] } }
    @objc func secureWrite(_ call: CAPPluginCall) { main(call) { try self.owner(call); try self.vault.write(self.account, call.getString("key", "offline"), call.getString("value", "")); return nil } }
    @objc func secureRemove(_ call: CAPPluginCall) { main(call) { try self.owner(call); try self.vault.remove(self.account, call.getString("key", "offline")); return nil } }
    @objc func saveRun(_ call: CAPPluginCall) { main(call) { try self.owner(call); guard let data = call.getObject("data") else { throw NSError(domain: "PenseActive", code: 400) }; try self.vault.write(self.account, "run", self.json(data)); return nil } }
    @objc func readRun(_ call: CAPPluginCall) { main(call) { try self.owner(call); if let saved = try self.vault.read(self.account, "run"), let bytes = saved.data(using: .utf8) { return ["data": try JSONSerialization.jsonObject(with: bytes)] }; return ["data": NSNull()] } }
    @objc func startRun(_ call: CAPPluginCall) { DispatchQueue.main.async { do { try self.owner(call); guard call.getBool("consent", false), let data = call.getObject("data") else { call.reject("Autorize a localização para iniciar."); return }; self.runData = data; self.location.desiredAccuracy = call.getString("accuracy", "high") == "high" ? kCLLocationAccuracyBest : kCLLocationAccuracyNearestTenMeters; self.location.distanceFilter = 3; self.pendingStart = call; let status = self.location.authorizationStatus; if status == .notDetermined { self.location.requestWhenInUseAuthorization() } else { self.beginIfAuthorized() } } catch { call.reject("Conta não autorizada.") } } }
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) { beginIfAuthorized() }
    private func beginIfAuthorized() {
        guard let call = pendingStart else { return }
        let status = location.authorizationStatus
        if status == .denied || status == .restricted { pendingStart = nil; call.reject("Permissão de localização negada."); return }
        guard status == .authorizedWhenInUse || status == .authorizedAlways else { return }
        baseSeconds = runData?["movingSeconds"] as? Double ?? 0; started = Date().timeIntervalSince1970 * 1000; running = true; last = nil
        location.activityType = .fitness; location.allowsBackgroundLocationUpdates = true; location.showsBackgroundLocationIndicator = true; location.pausesLocationUpdatesAutomatically = false
        location.startUpdatingLocation(); pendingStart = nil; try? snapshot(); call.resolve()
    }
    private func stopTracking() { try? snapshot(); running = false; last = nil; location.stopUpdatingLocation(); location.allowsBackgroundLocationUpdates = false; runData?["status"] = "paused"; try? snapshot() }
    @objc func stopRun(_ call: CAPPluginCall) { main(call) { self.stopTracking(); return ["data": self.runData as Any? ?? NSNull()] } }
    private func snapshot() throws { guard var data = runData, !account.isEmpty else { return }; let now = Date().timeIntervalSince1970 * 1000; if running { data["movingSeconds"] = baseSeconds + (now - started) / 1000; data["status"] = "active" }; data["elapsedSeconds"] = max(data["elapsedSeconds"] as? Double ?? 0, (now - (data["startedTimestamp"] as? Double ?? now)) / 1000); runData = data; try vault.write(account, "run", json(data)) }
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard running else { return }
        for point in locations.sorted(by: { $0.timestamp < $1.timestamp }) {
            guard point.horizontalAccuracy >= 0, point.horizontalAccuracy <= 35, abs(point.timestamp.timeIntervalSinceNow) <= 30, CLLocationCoordinate2DIsValid(point.coordinate) else { notifyListeners("location", data: ["error": "Leitura GPS imprecisa ignorada."]); continue }
            do {
                try snapshot(); guard var data = runData else { continue }; var points = data["points"] as? [[String: Any]] ?? []; var splits = data["splits"] as? [[String: Any]] ?? []
                if points.count >= 20000 { stopTracking(); notifyListeners("command", data: ["action": "pause", "reason": "Limite de pontos atingido."]); return }
                var length = 0.0; var segment = last == nil
                if let previous = last { let dt = point.timestamp.timeIntervalSince(previous.timestamp); if dt <= 0 { continue }; length = point.distance(from: previous); if dt > 30 { length = 0; segment = true; data["gaps"] = (data["gaps"] as? Int ?? 0) + 1 } else if length / dt > 10 { continue } else if length < max(3, min(point.horizontalAccuracy, previous.horizontalAccuracy) * 0.4) { continue } }
                let before = data["distanceMeters"] as? Double ?? 0, after = before + length, seconds = data["movingSeconds"] as? Double ?? 0
                var target = (floor(before / 1000) + 1) * 1000
                while target <= after { let previous = points.last?["seconds"] as? Double ?? seconds; let time = length > 0 ? previous + (seconds - previous) * (target - before) / length : seconds; let prior = splits.last?["cumulativeSeconds"] as? Double ?? 0; splits.append(["km": target / 1000, "seconds": time - prior, "cumulativeSeconds": time]); target += 1000 }
                points.append(["lat": point.coordinate.latitude, "lon": point.coordinate.longitude, "timestamp": point.timestamp.timeIntervalSince1970 * 1000, "accuracy": point.horizontalAccuracy, "seconds": seconds, "distance": after, "segment": segment]); data["points"] = points; data["splits"] = splits; data["distanceMeters"] = after; runData = data; last = point; try snapshot(); notifyListeners("location", data: ["data": runData ?? data], retainUntilConsumed: true)
            } catch { stopTracking(); notifyListeners("location", data: ["error": "Falha ao salvar percurso no armazenamento protegido."]) }
        }
    }
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) { notifyListeners("location", data: ["error": "GPS indisponível. Nenhum percurso foi inventado."]) }
    @objc func speak(_ call: CAPPluginCall) { main(call) { try self.owner(call); let audio = AVAudioSession.sharedInstance(); try audio.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers]); try audio.setActive(true); let utterance = AVSpeechUtterance(string: call.getString("text", "")); utterance.voice = AVSpeechSynthesisVoice(language: "pt-BR"); utterance.volume = Float(call.getDouble("volume", 0.8)); utterance.rate = Float(call.getDouble("rate", 1)) * AVSpeechUtteranceDefaultSpeechRate; self.speech.speak(utterance); return nil } }
    @objc func setTimer(_ call: CAPPluginCall) { main(call) { try self.owner(call); let kind = call.getString("kind", "timer"), events = call.getArray("events", JSObject.self) ?? []; try self.vault.write(self.account, "timers", self.json(call.options)); UNUserNotificationCenter.current().getPendingNotificationRequests { requests in let ids = requests.map { $0.identifier }.filter { $0.hasPrefix("pense-active-" + kind + "-") }; UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids) }; UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in if granted { for (index, event) in events.prefix(60).enumerated() { guard let at = event["at"] as? Double else { continue }; let delay = at / 1000 - Date().timeIntervalSince1970; if delay <= 0 { continue }; let content = UNMutableNotificationContent(); content.title = call.getString("title", "Pense Active"); content.body = event["text"] as? String ?? "Novo intervalo"; content.sound = .default; let request = UNNotificationRequest(identifier: "pense-active-" + kind + "-" + String(index), content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: max(1, delay), repeats: false)); UNUserNotificationCenter.current().add(request) } } }; return nil } }
    @objc func stopTimer(_ call: CAPPluginCall) { main(call) { let prefix = "pense-active-" + call.getString("kind", "timer") + "-"; UNUserNotificationCenter.current().getPendingNotificationRequests { requests in UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: requests.map { $0.identifier }.filter { $0.hasPrefix(prefix) }) }; return nil } }
    @objc func stopAll(_ call: CAPPluginCall) { main(call) { self.stopTracking(); self.speech.stopSpeaking(at: .immediate); UNUserNotificationCenter.current().removeAllPendingNotificationRequests(); return nil } }
}

class PenseBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() { bridge?.registerPluginInstance(PenseActivePlugin()) }
}
