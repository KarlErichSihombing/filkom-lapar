import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const outfit = Outfit ({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FILKOM Lapar",
  description: "Pesan makanan kantin FILKOM UB tanpa antre",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f05a22",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${outfit.variable} ${jakarta.variable} ${grotesk.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}