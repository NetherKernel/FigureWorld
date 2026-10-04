import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartFlyout from "@/components/layout/CartFlyout";
import { ThemeProvider, themeInitScript } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Figure World — Anime Figures, Statues & Collectibles",
    template: "%s | Figure World",
  },
  description:
    "Shop officially licensed anime scale figures, resin statues, keychains, manga and 18+ ornamental katana replicas. Fast delivery across India with UPI & Cash on Delivery.",
  applicationName: "Figure World",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d7141a" },
    { media: "(prefers-color-scheme: dark)", color: "#131316" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-fg">
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <a
                href="#main-content"
                className="sr-only z-[100] rounded-md bg-surface px-4 py-2 font-semibold text-fg shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
              >
                Skip to main content
              </a>
              <Header />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <Footer />
              <CartFlyout />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
