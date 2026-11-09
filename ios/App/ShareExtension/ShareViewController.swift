import UIKit
import UniformTypeIdentifiers

/// Rove's share extension: "Share → Rove" from Instagram, TikTok, Safari or Google Maps.
/// It finds the link in what was shared and opens Rove at rove://save?url=<link>, where the Save to Rove sheet
/// reads it and picks where it goes. If Rove can't be opened from here, the link is copied instead, so
/// "Save a link → Paste" in Rove picks it up.
final class ShareViewController: UIViewController {
    private let label = UILabel()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor { $0.userInterfaceStyle == .dark ? UIColor(white: 0.11, alpha: 1) : .white }
        label.text = "Opening Rove…"
        label.font = .preferredFont(forTextStyle: .headline)
        label.adjustsFontForContentSizeCategory = true
        label.textAlignment = .center
        label.numberOfLines = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
        ])
        findLink { [weak self] link in
            DispatchQueue.main.async { self?.send(link) }
        }
    }

    /// The first web link in the shared items: a URL attachment, or a link inside shared text (captions often include one).
    private func findLink(_ done: @escaping (URL?) -> Void) {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }
        if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.url.identifier) }) {
            p.loadItem(forTypeIdentifier: UTType.url.identifier) { item, _ in
                if let url = item as? URL, url.scheme?.hasPrefix("http") == true { return done(url) }
                done((item as? String).flatMap(Self.firstURL))
            }
        } else if let p = providers.first(where: { $0.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) }) {
            p.loadItem(forTypeIdentifier: UTType.plainText.identifier) { item, _ in done((item as? String).flatMap(Self.firstURL)) }
        } else {
            done(nil)
        }
    }

    private static func firstURL(in text: String) -> URL? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range = NSRange(text.startIndex..., in: text)
        return detector?.firstMatch(in: text, options: [], range: range)?.url
    }

    private func send(_ link: URL?) {
        guard let link else {
            label.text = "There’s no link to save in this."
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { self.finish() }
            return
        }
        var parts = URLComponents()
        parts.scheme = "rove"
        parts.host = "save"
        parts.queryItems = [URLQueryItem(name: "url", value: link.absoluteString)]
        if let target = parts.url, openApp(target) {
            finish()
        } else {
            // Rove couldn't be opened from this app: copy the link so Rove's "Save a link → Paste" has it.
            UIPasteboard.general.url = link
            label.text = "Link copied. Open Rove and tap Save a link."
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self.finish() }
        }
    }

    /// Share extensions can't open other apps through the normal API. The application object is still at the end of
    /// the responder chain, so this finds it and calls its open method by name. It never names `UIApplication` as a
    /// type, which keeps this target buildable with APPLICATION_EXTENSION_API_ONLY = YES (Xcode requires that).
    /// If it can't, it returns false and the caller copies the link instead.
    private func openApp(_ url: URL) -> Bool {
        let selector = NSSelectorFromString("openURL:options:completionHandler:")
        guard let appClass = NSClassFromString("UIApplication") else { return false }
        var responder: UIResponder? = self
        while let r = responder {
            if r.isKind(of: appClass), r.responds(to: selector) {
                typealias OpenURL = @convention(c) (AnyObject, Selector, NSURL, NSDictionary, AnyObject?) -> Void
                let open = unsafeBitCast(r.method(for: selector), to: OpenURL.self)
                open(r, selector, url as NSURL, NSDictionary(), nil)
                return true
            }
            responder = r.next
        }
        return false
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
