import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Noto_Serif } from "next/font/google";
import config from "./config";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});
const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-playfair",
});
const notoSerif = Noto_Serif({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-noto-serif",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: config.siteName,
  description: config.siteName,
  // Gia phả nội tộc — xem được qua link, nhưng không cho công cụ tìm kiếm
  // lập chỉ mục tên thành viên. Xem thêm app/robots.ts.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default theme is "Sơn Son" (lacquer). ThemeSwitcher reads the saved
  // choice from localStorage on mount and updates data-theme on <html>.
  // suppressHydrationWarning: the client may swap the theme attribute.
  return (
    <html
      lang="vi"
      data-theme="lacquer"
      className="gp-themed"
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${playfair.variable} ${notoSerif.variable} font-sans antialiased relative`}
      >
        {children}
        <div className="no-print">
          <ThemeSwitcher />
        </div>
      </body>
    </html>
  );
}
