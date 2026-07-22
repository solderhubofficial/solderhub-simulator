import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "SolderHub Simulator",
  description:
    "Open-source interactive Arduino & ESP32 circuit simulator — drag components, wire pins, and run simulations in the browser.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
