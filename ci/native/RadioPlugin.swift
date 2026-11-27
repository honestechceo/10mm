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
        // Nothing to do at start. This used to re-apply the audio session on every interruption and
        // every time the app came to the front (setCategory + setActive). Under WebKit that restarts
        // the audio the web view is playing: sound cut out, the game froze, and the next interruption
        // did it again. WebKit manages its own session; the web side sets navigator.audioSession.
    }

    private func apply() {
        let session = AVAudioSession.sharedInstance()
        // .playback: heard even with the ring/silent switch on silent. MY MUSIC also mixes with
        // Spotify / Apple Music / YouTube Music.
        let want: AVAudioSession.CategoryOptions = mix ? [.mixWithOthers] : []
        if session.category == .playback && session.categoryOptions == want { return } // already set: leave it alone
        do {
            try session.setCategory(.playback, mode: .default, options: want)
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
