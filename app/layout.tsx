import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: { default: "OPTIMAL CLOTHING", template: "%s | OPTIMAL CLOTHING" },
  description: "Minimal streetwear e-commerce built with Next.js 14",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased transition-colors duration-300">
        <Providers>
          <div className="min-h-screen">{children}</div>
        </Providers>
        <Toaster richColors />
      </body>
    </html>
  );
}
