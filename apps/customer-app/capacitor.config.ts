import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.profitsaathi.app.user",
  appName: "ProfitSaathi",
  // webDir is required for `cap sync` even when a server.url is set during dev.
  webDir: ".next",
  server: {
    url: "http://192.168.0.3:8084/user", // <-- YOUR local IP
    cleartext: true
  },
  // Background colour shown briefly during the WebView's first paint —
  // matches the light-theme background so the launch feels seamless.
  backgroundColor: "#fafafa",
  ios: {
    // Tell the WebView to respect the safe-area insets we apply in CSS
    // instead of automatically padding the scroll view itself.
    contentInset: "always",
    // Inline-media-playback-only=true keeps videos from auto-fullscreening,
    // which is the more app-like behaviour.
    allowsLinkPreview: false,
    // Match light/dark backgrounds — overrides default white flash on rotate.
    backgroundColor: "#fafafa",
  },
  android: {
    // Resize behaviour pushes the layout up when the soft keyboard opens
    // instead of overlapping the focused input.
    backgroundColor: "#fafafa",
    allowMixedContent: true,
  },
};

export default config;