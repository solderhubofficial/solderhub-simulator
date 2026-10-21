import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "SolderHub Simulator",
  description:
    "Open-source interactive Arduino & ESP32 circuit simulator — drag components, wire pins, and run simulations in the browser.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

// Runs before hydration so the correct theme class is on <html> for the very
// first paint — avoids a light-mode flash for users who prefer dark.
const THEME_INIT_SCRIPT = `(function(){try{var stored=localStorage.getItem('solderhub-theme');var dark=stored?stored==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(dark){document.documentElement.classList.add('dark');}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
