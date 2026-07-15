import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Story Garden — Read, Say, Spell & Grow",
  description:
    "A playful Primary 1 storybook garden for reading, word pronunciation, voice practice, spelling and dictation.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "Story Garden",
    description: "Read a story. Hear, say and spell its words. Grow your English.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Story Garden reading adventure" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f2df",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
