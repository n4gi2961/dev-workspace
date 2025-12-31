import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Klee_One } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const kleeOne = Klee_One({
  variable: "--font-klee",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Vision Board App",
  description: "夢と目標を視覚化するビジョンボードアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSansJP.variable} ${notoSerifJP.variable} ${kleeOne.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
