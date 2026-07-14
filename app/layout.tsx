import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Story Sprout — P1 English Adventure",
  description:
    "A playful English learning journey built from ten Primary 1 storybooks, with phonics, vocabulary, sentence, comprehension and speaking practice.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
