// =====================================================================
// FILKOM Lapar — Service Worker (PWA & Web Push Notification)
// Menangani pemasangan PWA, notifikasi push latar belakang, dan navigasi
// otomatis ke halaman detail pesanan saat banner notifikasi diklik.
// =====================================================================

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 1) Menerima Web Push event dari server push service
self.addEventListener("push", (event) => {
  let payload = {
    title: "FILKOM Lapar",
    body: "Ada pembaruan status pesanan Anda.",
    url: "/pesanan",
    tag: "filkom-lapar-push",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        url: parsed.url || payload.url,
        tag: parsed.tag || payload.tag,
      };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      tag: payload.tag,
      renotify: true,
      vibrate: [180, 80, 180],
      data: { url: payload.url },
    })
  );
});

// 2) Menerima pesan dari tab aplikasi untuk memunculkan notifikasi OS via Service Worker
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "SHOW_NOTIFICATION") return;

  const title = data.title || "FILKOM Lapar";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    tag: data.tag || "filkom-lapar-order",
    renotify: true,
    vibrate: [180, 80, 180],
    data: { url: data.url || "/pesanan" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 3) Saat banner notifikasi diklik, buka aplikasi & arahkan langsung ke halaman terkait
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/pesanan";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }
            return client;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
