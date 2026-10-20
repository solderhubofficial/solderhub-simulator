import { defineConfig } from "@playwright/test"

// Browser acceptance for the ESP32 compile-and-run path. Run by the "browser-acceptance" CI job, which
// builds the emulator runtime into public/esp32, starts the real build service and `next start`.
export default defineConfig({
  testDir: "./e2e",
  timeout: 240_000,
  expect: { timeout: 60_000 },
  retries: 0,
  reporter: [["line"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    // Optional: point at a pre-installed Chromium (offline/sandboxed machines).
    ...(process.env.E2E_CHROMIUM ? { launchOptions: { executablePath: process.env.E2E_CHROMIUM, args: ["--no-sandbox"] } } : {}),
  },
})
