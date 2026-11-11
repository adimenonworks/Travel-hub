import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

/// Rove's web view, set up to feel like a native app.
/// Main.storyboard uses this instead of Capacitor's plain CAPBridgeViewController.
class RoveViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }
        // Swipe back is drawn by the app itself (src/app/SwipeBack.tsx), which shows the real previous screen under
        // the one being dragged. The web view's own swipe would show a blank snapshot instead, so it's off.
        webView.allowsBackForwardNavigationGestures = false
        // Like a native app: no long-press link previews, and nothing can be dragged out of the app (links, photos).
        webView.allowsLinkPreview = false
        // The iPhone's rubber-band scroll, like Wise and every native app: pull past the top or bottom and the page
        // stretches and springs back. Capacitor turns this off (scrollView.bounces = false in its own setup, before
        // this runs), so it's switched back on here. alwaysBounceVertical makes short pages bounce too; sideways
        // never bounces (the page never scrolls sideways).
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true
        webView.scrollView.alwaysBounceHorizontal = false
        let views: [UIView] = [webView, webView.scrollView] + webView.scrollView.subviews
        for view in views {
            for interaction in view.interactions {
                if let drag = interaction as? UIDragInteraction { drag.isEnabled = false }
            }
        }
        // The page canvas colour in light and dark mode (on-light/surface/primary: neutral 0 / neutral 1000), so nothing flashes white before the app draws.
        let canvas = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(red: 0x1c / 255.0, green: 0x1c / 255.0, blue: 0x1c / 255.0, alpha: 1)
                : UIColor(red: 0xff / 255.0, green: 0xff / 255.0, blue: 0xff / 255.0, alpha: 1)
        }
        view.backgroundColor = canvas
        webView.isOpaque = false
        webView.backgroundColor = canvas
        webView.scrollView.backgroundColor = canvas
    }
}
