"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker, showSystemNotification } from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaControlPill({
  targetUrl = "/pesanan",
  roleLabel = "pembeli",
}: {
  targetUrl?: string;
  roleLabel?: "pembeli" | "penjual";
}) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [perm, setPerm] = useState<string>(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const [pushed, setPushed] = useState(false);

  useEffect(() => {
    void registerServiceWorker();

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  async function handleEnableOrTestPush() {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    let currentPerm = Notification.permission;
    if (currentPerm === "default") {
      currentPerm = await Notification.requestPermission();
      setPerm(currentPerm);
    }

    if (currentPerm === "granted") {
      const ok = await showSystemNotification({
        title:
          roleLabel === "penjual"
            ? "FILKOM Lapar · Merchant Push Aktif"
            : "FILKOM Lapar · Pesanan Siap Diambil!",
        body:
          roleLabel === "penjual"
            ? "Notifikasi pesanan masuk latar belakang siap digunakan."
            : "Ketuk banner notifikasi ini untuk membuka halaman Pesanan Saya.",
        url: targetUrl,
        tag: "filkom-lapar-demo-push",
      });
      if (ok) {
        setPushed(true);
        setTimeout(() => setPushed(false), 2500);
      }
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {installPrompt && (
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="rounded-full bg-primary-strong px-3 py-1.5 font-label text-[11px] font-semibold text-on-primary transition-colors hover:brightness-110"
        >
          Install App
        </button>
      )}

      {perm !== "unsupported" && perm !== "denied" && (
        <button
          type="button"
          onClick={() => void handleEnableOrTestPush()}
          className="rounded-full bg-surface px-3 py-1.5 font-label text-[11px] font-medium text-primary-strong transition-colors hover:bg-surface-variant"
          title="Aktifkan atau uji Push Notification Service Worker"
        >
          {pushed
            ? "Push Terkirim!"
            : perm === "granted"
              ? "Uji Push"
              : "Aktifkan Push"}
        </button>
      )}
    </div>
  );
}
