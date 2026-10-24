#!/usr/bin/env node
/**
 * Build-time step: fetches a pinned arduino-cli binary and installs the
 * arduino:avr core plus the Servo library into .avr-toolchain/. This directory
 * is bundled with the /api/compile function for offline runtime compilation.
 */
import { existsSync, mkdirSync, chmodSync, createWriteStream, rmSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { pipeline } from "node:stream/promises"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const TOOLCHAIN_DIR = path.join(ROOT, ".avr-toolchain")
const CLI_PATH = path.join(TOOLCHAIN_DIR, "arduino-cli")
const ARDUINO_DATA_DIR = path.join(TOOLCHAIN_DIR, "data")
const ARDUINO_USER_DIR = path.join(TOOLCHAIN_DIR, "user")
const SERVO_LIBRARY_DIR = path.join(ARDUINO_USER_DIR, "libraries", "Servo")

// Pin an exact version — never fetch "latest" for a build dependency.
const ARDUINO_CLI_VERSION = "1.5.1"
const ARDUINO_CLI_ASSET = `arduino-cli_${ARDUINO_CLI_VERSION}_Linux_64bit.tar.gz`
const ARDUINO_CLI_URL = `https://github.com/arduino/arduino-cli/releases/download/v${ARDUINO_CLI_VERSION}/${ARDUINO_CLI_ASSET}`

async function download(url, destPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${url} -> ${res.status}`)
  await pipeline(res.body, createWriteStream(destPath))
}

async function installServoLibrary() {
  mkdirSync(ARDUINO_USER_DIR, { recursive: true })
  const env = {
    ...process.env,
    ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR,
    ARDUINO_DIRECTORIES_USER: ARDUINO_USER_DIR,
  }
  if (!existsSync(SERVO_LIBRARY_DIR)) {
    console.log("[vendor-avr-toolchain] installing Arduino Servo library...")
    execFileSync(CLI_PATH, ["lib", "install", "Servo"], { env, stdio: "inherit" })
  }

  // Fail the build if the library is missing or incompatible, rather than
  // shipping a compiler that silently fails on #include <Servo.h>.
  const smokeDir = path.join(TOOLCHAIN_DIR, "servo-smoke")
  const sketchDir = path.join(smokeDir, "servo-smoke")
  mkdirSync(sketchDir, { recursive: true })
  writeFileSync(
    path.join(sketchDir, "servo-smoke.ino"),
    "#include <Servo.h>\nServo testServo;\nvoid setup(){ testServo.attach(9); }\nvoid loop(){ testServo.write(90); }\n"
  )
  try {
    execFileSync(
      CLI_PATH,
      ["compile", "--fqbn", "arduino:avr:uno", "--output-dir", path.join(smokeDir, "build"), sketchDir],
      { env, stdio: "inherit" }
    )
  } finally {
    rmSync(smokeDir, { recursive: true, force: true })
  }
}

async function main() {
  const enabled = process.env.VENDOR_AVR_TOOLCHAIN === "1" ||
    (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_AVR_COMPILER === "1")
  if (!enabled) {
    console.log("[vendor-avr-toolchain] skipped (enable with VENDOR_AVR_TOOLCHAIN=1, or set NEXT_PUBLIC_ENABLE_AVR_COMPILER=1 on Vercel Production)")
    return
  }

  if (process.platform !== "linux") {
    console.log(
      `[vendor-avr-toolchain] skipping on ${process.platform} (Linux-only binary); /api/compile will not work locally`
    )
    return
  }

  if (existsSync(CLI_PATH) && existsSync(path.join(ARDUINO_DATA_DIR, "packages"))) {
    await installServoLibrary()
    console.log("[vendor-avr-toolchain] already vendored; Servo library verified")
    return
  }

  mkdirSync(TOOLCHAIN_DIR, { recursive: true })
  mkdirSync(ARDUINO_DATA_DIR, { recursive: true })

  console.log(`[vendor-avr-toolchain] downloading arduino-cli ${ARDUINO_CLI_VERSION}...`)
  const tarPath = path.join(TOOLCHAIN_DIR, "arduino-cli.tar.gz")
  await download(ARDUINO_CLI_URL, tarPath)
  execFileSync("tar", ["xzf", tarPath, "-C", TOOLCHAIN_DIR])
  chmodSync(CLI_PATH, 0o755)

  console.log("[vendor-avr-toolchain] installing arduino:avr core (this takes a minute)...")
  const env = {
    ...process.env,
    ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR,
    ARDUINO_DIRECTORIES_USER: ARDUINO_USER_DIR,
  }
  execFileSync(CLI_PATH, ["core", "update-index"], { env, stdio: "inherit" })
  execFileSync(CLI_PATH, ["core", "install", "arduino:avr"], { env, stdio: "inherit" })
  await installServoLibrary()

  // Remove download artifacts, but preserve the staging directory. At runtime
  // the function bundle is read-only and arduino-cli expects this directory.
  rmSync(tarPath, { force: true })
  const stagingDir = path.join(ARDUINO_DATA_DIR, "staging")
  rmSync(stagingDir, { recursive: true, force: true })
  mkdirSync(stagingDir, { recursive: true })
  writeFileSync(path.join(stagingDir, "keep.txt"), "must exist: /var/task is read-only at runtime\n")

  console.log("[vendor-avr-toolchain] done; Servo.h compile smoke test passed")
}

main().catch((err) => {
  console.error("[vendor-avr-toolchain] FAILED:", err.message)
  console.error(
    "If this is running in a sandboxed/offline environment without access to downloads.arduino.cc, that's expected -- run this on your local machine or let Vercel's build (which has full internet) do it."
  )
  process.exit(1)
})
