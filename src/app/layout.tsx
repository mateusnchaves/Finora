import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Instrument_Sans } from "next/font/google";
import { ErrorReporter } from "@/components/error-reporter";
import { ICON_FONT_URL } from "@/components/ui/icon";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  axes: ["opsz"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Finora",
    template: "%s · Finora",
  },
  description: "Seu dinheiro, com clareza.",
  applicationName: "Finora",
  // Installed on iOS: full screen, status bar over the navy header area.
  appleWebApp: { capable: true, title: "Finora", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Lets the app draw under the iPhone notch; headers pad themselves with safe-area insets.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8e2d4" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1626" },
  ],
};

// Applies the saved theme (or the OS preference) before first paint.
const themeScript = `(function(){try{var t=localStorage.getItem("finora-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      suppressHydrationWarning
      className={`${bodoni.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* The icon font's files come from fonts.gstatic.com: open that connection early. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={ICON_FONT_URL} />
      </head>
      <body className="min-h-full">
        {children}
        <ErrorReporter />
      </body>
    </html>
  );
}
