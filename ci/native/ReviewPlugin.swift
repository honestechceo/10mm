import Foundation
import StoreKit
import UIKit
import Capacitor

/// Asks for an App Store rating with Apple's built-in pop-up.
/// Apple decides whether it actually appears (at most 3 times a year per person).
@objc(ReviewPlugin)
public class ReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReviewPlugin"
    public let jsName = "Review"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)
    ]

    @objc func request(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                SKStoreReviewController.requestReview(in: scene)
                call.resolve(["asked": true])
            } else {
                call.resolve(["asked": false])
            }
        }
    }
}
