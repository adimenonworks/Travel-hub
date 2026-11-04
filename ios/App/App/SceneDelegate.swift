import UIKit
import Capacitor
#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // Rove's own controller (in AppDelegate.swift): swipe-back, and the light/dark canvas so nothing flashes white.
        window?.rootViewController = RoveViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        // Google sign-in comes back to the app through its URL scheme (REVERSED_CLIENT_ID in Info.plist).
        #if canImport(GoogleSignIn)
        for context in URLContexts where GIDSignIn.sharedInstance.handle(context.url) { return }
        #endif
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
