import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
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
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('solderhub-theme');var dark=(s==='dark')||((s!=='light')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(dark){r.classList.add('dark');}r.style.colorScheme=dark?'dark':'light';}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
