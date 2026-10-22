import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cek Data Anggota",
  description: "Periksa status keanggotaan",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
