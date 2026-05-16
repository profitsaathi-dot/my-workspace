import { PushNotifications } from "@capacitor/push-notifications";

class NotificationManager {
  private static instance: NotificationManager;

  private constructor() {}

  static getInstance() {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  private async getPushPlugin() {
  if (typeof window === "undefined") return null;

  const isNative =
    (window as any).Capacitor?.isNativePlatform?.() ?? false;

  if (!isNative) return null;

  const { PushNotifications } = await import(
    "@capacitor/push-notifications"
  );

  return PushNotifications;
}
  // Detect platform
 private isNative() {
  return typeof window !== "undefined" &&
    (window as any).Capacitor?.isNativePlatform?.();
}

  // -----------------------------
  // Permission Handler
  // -----------------------------
  async requestPermission(): Promise<boolean> {
    if (this.isNative()) {
      return this.requestMobilePermission();
    }
    return this.requestWebPermission();
  }

private async requestWebPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

private async requestMobilePermission(): Promise<boolean> {
  const PushNotifications = await this.getPushPlugin();
  if (!PushNotifications) return false;

  const perm = await PushNotifications.checkPermissions();

  if (perm.receive === "prompt") {
    const req = await PushNotifications.requestPermissions();
    return req.receive === "granted";
  }

  return perm.receive === "granted";
}

  // -----------------------------
  // Initialize Push (Mobile)
  // -----------------------------
  async initPushListeners() {
  const PushNotifications = await this.getPushPlugin();
  if (!PushNotifications) return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", (token) => {
    console.log("Push token:", token.value);
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push error:", err);
  });

  PushNotifications.addListener(
    "pushNotificationReceived",
    (notification) => {
      console.log("Notification received:", notification);
    }
  );
}

  // -----------------------------
  // Enable Notifications (Main Entry)
  // -----------------------------
async enable(): Promise<boolean> {
  const granted = this.isNative()
    ? await this.requestMobilePermission()
    : await this.requestWebPermission();

  if (!granted) return false;

  if (this.isNative()) {
    await this.initPushListeners();
  }

  return true;
}
  // Optional helper
  disable() {
    console.log("Disable notifications (handled via settings/backend)");
  }
}

export const notificationManager = NotificationManager.getInstance();