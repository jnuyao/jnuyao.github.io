import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Story Garden — Picture Books to Read and Hear",
  description:
    "A child-friendly Primary 1, Primary 2 and Primary 3 picture-book library with prepared English narration.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "Story Garden",
    description: "Choose a picture book, follow every page and hear the story read aloud.",
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
