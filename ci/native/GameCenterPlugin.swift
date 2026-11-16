import Foundation
import Capacitor
import GameKit

/// Game Center: sign-in, leaderboards and achievements for Where's My 10MM?!
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin, GKGameCenterControllerDelegate {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportAchievement", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise)
    ]

    private var enabled: Bool {
        (Bundle.main.object(forInfoDictionaryKey: "TenmmGameCenter") as? Bool) ?? false
    }

    @objc func signIn(_ call: CAPPluginCall) {
        guard enabled else { call.resolve(["signedIn": false, "reason": "off"]); return }
        let player = GKLocalPlayer.local
        if player.isAuthenticated { call.resolve(["signedIn": true]); return }
        var answered = false
        player.authenticateHandler = { [weak self] vc, error in
            DispatchQueue.main.async {
                if let vc = vc, let host = self?.bridge?.viewController {
                    host.present(vc, animated: true)
                    return
                }
                if !answered {
                    answered = true
                    call.resolve(["signedIn": player.isAuthenticated, "reason": error?.localizedDescription ?? ""])
                }
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard enabled, GKLocalPlayer.local.isAuthenticated,
              let id = call.getString("leaderboard"), let score = call.getInt("score") else { call.resolve(["ok": false]); return }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [id]) { error in
            call.resolve(["ok": error == nil])
        }
    }

    @objc func reportAchievement(_ call: CAPPluginCall) {
        guard enabled, GKLocalPlayer.local.isAuthenticated, let id = call.getString("id") else { call.resolve(["ok": false]); return }
        let a = GKAchievement(identifier: id)
        a.percentComplete = call.getDouble("percent") ?? 100
        a.showsCompletionBanner = true
        GKAchievement.report([a]) { error in call.resolve(["ok": error == nil]) }
    }

    @objc func show(_ call: CAPPluginCall) {
        guard enabled, GKLocalPlayer.local.isAuthenticated else { call.resolve(["shown": false]); return }
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let host = self.bridge?.viewController else { call.resolve(["shown": false]); return }
            let which = call.getString("view") ?? "leaderboards"
            let vc = GKGameCenterViewController(state: which == "achievements" ? .achievements : .leaderboards)
            vc.gameCenterDelegate = self
            host.present(vc, animated: true)
            call.resolve(["shown": true])
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
