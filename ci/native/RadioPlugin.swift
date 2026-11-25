import Foundation
import AVFoundation
import UIKit
import Capacitor

/// "My Radio": lets the player's own music app keep playing under the game's sound effects,
/// and opens their music app.
@objc(RadioPlugin)
public class RadioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RadioPlugin"
    public let jsName = "Radio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setMix", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openApp", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise)
    ]

    private var mix = false

    override public func load() {
        // keep mixing after ads, calls or Siri hand the audio back
        NotificationCenter.default.addObserver(self, selector: #selector(reapply), name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(reapply), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc private func reapply() { apply() }

    private func apply() {
        let session = AVAudioSession.sharedInstance()
        let want: AVAudioSession.CategoryOptions = mix ? [.mixWithOthers] : []
        // already set up this way: leave it alone (re-activating while sound plays makes iOS restart audio)
        if session.category == .playback && session.categoryOptions == want { return }
        do {
            // .playback: the game is heard even when the ring/silent switch is on silent
            // (.ambient / .soloAmbient are muted by the switch, so players heard nothing)
            if mix {
                // MY MUSIC: the game's effects play on top of Spotify / Apple Music / YouTube Music
                try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            } else {
                try session.setCategory(.playback, mode: .default, options: [])
            }
            try session.setActive(true, options: [])
        } catch {
            NSLog("RadioPlugin: audio session error \(error)")
        }
    }

    @objc func setMix(_ call: CAPPluginCall) {
        mix = call.getBool("mix") ?? false
        DispatchQueue.main.async {
            self.apply()
            call.resolve(["mix": self.mix])
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["otherAudioPlaying": AVAudioSession.sharedInstance().isOtherAudioPlaying])
    }

    /// Tries the app's own link first (opens the app), then its website.
    @objc func openApp(_ call: CAPPluginCall) {
        let primary = call.getString("app").flatMap(URL.init(string:))
        let fallback = call.getString("web").flatMap(URL.init(string:))
        DispatchQueue.main.async {
            guard let primary = primary else {
                if let f = fallback { UIApplication.shared.open(f) }
                call.resolve(["opened": fallback != nil]); return
            }
            UIApplication.shared.open(primary, options: [:]) { ok in
                if ok { call.resolve(["opened": true]); return }
                guard let f = fallback else { call.resolve(["opened": false]); return }
                UIApplication.shared.open(f, options: [:]) { ok2 in call.resolve(["opened": ok2]) }
            }
        }
    }
}
