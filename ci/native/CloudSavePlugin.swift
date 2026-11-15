import Foundation
import Capacitor

/// Saves the game to iCloud key-value storage so progress follows the player's Apple ID.
@objc(CloudSavePlugin)
public class CloudSavePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CloudSavePlugin"
    public let jsName = "CloudSave"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]
    private let store = NSUbiquitousKeyValueStore.default

    override public func load() {
        store.synchronize()
    }

    @objc func available(_ call: CAPPluginCall) {
        // ubiquityIdentityToken is nil when iCloud Drive is switched off, but key-value saves still work then,
        // so also accept a successful sync of the key-value store
        let entitled = (Bundle.main.object(forInfoDictionaryKey: "TenmmICloud") as? Bool) ?? false
        let signedIn = FileManager.default.ubiquityIdentityToken != nil || store.synchronize()
        call.resolve(["available": entitled && signedIn])
    }

    @objc func get(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? "save"
        store.synchronize()
        call.resolve(["value": store.string(forKey: key) as Any])
    }

    @objc func set(_ call: CAPPluginCall) {
        let key = call.getString("key") ?? "save"
        guard let value = call.getString("value") else { call.reject("value missing"); return }
        store.set(value, forKey: key)
        store.synchronize()
        call.resolve()
    }
}
