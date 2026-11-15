import UIKit
import Capacitor

/// Main screen of the app: Capacitor's web view plus the game's own native plugins.
class GameViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CloudSavePlugin())
    }
}
