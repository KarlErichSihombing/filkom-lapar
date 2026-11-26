"use client";

export type PushNotificationPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/** Daftarkan Service Worker PWA (/sw.js). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

/**
 * Tampilkan notifikasi sistem OS melalui Service Worker (PWA Push Notification)
 * sehingga banner muncul di status bar / notification shade perangkat
 * dan mengarahkan ke halaman detail saat diklik.
 */
export async function showSystemNotification({
  title,
  body,
  url = "/pesanan",
  tag = "filkom-lapar-notif",
}: PushNotificationPayload): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: "/icons/icon-192.svg",
        badge: "/icons/icon-192.svg",
        tag,
        data: { url },
      });
      return true;
    }
  } catch {
    /* fallback ke Notification API biasa di bawah */
  }

  try {
    const n = new Notification(title, {
      body,
      icon: "/icons/icon-192.svg",
      tag,
    });
    n.onclick = () => {
      window.focus();
      window.location.href = url;
    };
    return true;
  } catch {
    return false;
  }
}
