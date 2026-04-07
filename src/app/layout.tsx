import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_JP, Space_Grotesk, DM_Mono, Noto_Sans_JP } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["200", "300", "400", "500", "700", "900"],
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0E13",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://alter-log.com"),
  title: "Alter Log",
  description: "Alter Log",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Alter Log",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="ja"
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} ${spaceGrotesk.variable} ${dmMono.variable} ${notoSansJP.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-[#0B0E13]">{children}</body>
      </html>
    </ClerkProvider>
  );
}
