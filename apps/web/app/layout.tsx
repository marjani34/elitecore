import type { Metadata } from "next";
import "vazirmatn/Vazirmatn-Variable-font-face.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "الیت | تیم تحویل محصول",
  description: "مدیریت تیم و فرآیند تحویل و آمادگی محصول",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
