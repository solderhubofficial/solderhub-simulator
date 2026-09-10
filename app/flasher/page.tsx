import type { Metadata } from "next"
import Link from "next/link"
import { EspFlasherPanel } from "@/components/simulator/esp-flasher-panel"

export const metadata: Metadata = {
  title: "ESP Flasher — SolderHub Simulator",
  description: "Flash real ESP32 hardware over USB, straight from the browser.",
}

export default function FlasherPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="font-medium text-primary hover:underline">
            Home
          </Link>
          <span>›</span>
          <span className="text-foreground">ESP Flasher</span>
        </nav>
      </div>
      <EspFlasherPanel />
    </div>
  )
}
