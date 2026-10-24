#!/usr/bin/env node
/**
 * Build-time step: fetches a pinned arduino-cli binary and installs the
 * arduino:avr core plus the libraries used by supported Uno examples into
 * .avr-toolchain/. This directory is bundled with /api/compile for runtime use.
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
const LIBRARIES_DIR = path.join(ARDUINO_USER_DIR, "libraries")

// Pin an exact version — never fetch "latest" for a build dependency.
const ARDUINO_CLI_VERSION = "1.5.1"
const ARDUINO_CLI_ASSET = `arduino-cli_${ARDUINO_CLI_VERSION}_Linux_64bit.tar.gz`
const ARDUINO_CLI_URL = `https://github.com/arduino/arduino-cli/releases/download/v${ARDUINO_CLI_VERSION}/${ARDUINO_CLI_ASSET}`

async function download(url, destPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${url} -> ${res.status}`)
  await pipeline(res.body, createWriteStream(destPath))
}

function cliEnv() {
  return {
    ...process.env,
    ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR,
    ARDUINO_DIRECTORIES_USER: ARDUINO_USER_DIR,
  }
}

function installLibrary(name, directory) {
  if (!existsSync(directory)) {
    console.log(`[vendor-avr-toolchain] installing Arduino library: ${name}...`)
    execFileSync(CLI_PATH, ["lib", "install", name], { env: cliEnv(), stdio: "inherit" })
  }
  if (!existsSync(directory)) {
    throw new Error(`Arduino CLI reported success but library directory is missing: ${directory}`)
  }
}

function compileSmoke(name, source) {
  const smokeDir = path.join(TOOLCHAIN_DIR, `${name}-smoke`)
  const sketchDir = path.join(smokeDir, name)
  mkdirSync(sketchDir, { recursive: true })
  writeFileSync(path.join(sketchDir, `${name}.ino`), source)
  try {
    execFileSync(
      CLI_PATH,
      ["compile", "--fqbn", "arduino:avr:uno", "--output-dir", path.join(smokeDir, "build"), sketchDir],
      { env: cliEnv(), stdio: "inherit" }
    )
  } finally {
    rmSync(smokeDir, { recursive: true, force: true })
  }
}

async function installLibrariesAndSmokeTest() {
  mkdirSync(ARDUINO_USER_DIR, { recursive: true })
  installLibrary("Servo", path.join(LIBRARIES_DIR, "Servo"))
  installLibrary("LiquidCrystal I2C", path.join(LIBRARIES_DIR, "LiquidCrystal_I2C"))
  installLibrary("Adafruit GFX Library", path.join(LIBRARIES_DIR, "Adafruit_GFX_Library"))
  installLibrary("Adafruit SSD1306", path.join(LIBRARIES_DIR, "Adafruit_SSD1306"))

  compileSmoke("servo-smoke", "#include <Servo.h>\nServo testServo;\nvoid setup(){ testServo.attach(9); }\nvoid loop(){ testServo.write(90); }\n")
  compileSmoke("lcd-i2c-smoke", `#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\nLiquidCrystal_I2C lcd(0x27, 16, 2);\nvoid setup(){ Wire.begin(); lcd.init(); lcd.backlight(); lcd.setCursor(0,0); lcd.print("Hello, World!"); }\nvoid loop(){}\n`)
  compileSmoke("oled-smoke", `#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>\nAdafruit_SSD1306 display(128, 64, &Wire, -1);\nvoid setup(){ Wire.begin(); if(!display.begin(SSD1306_SWITCHCAPVCC,0x3C)) return; display.clearDisplay(); display.setTextColor(SSD1306_WHITE); display.setCursor(0,0); display.println("Hello, World!"); display.display(); }\nvoid loop(){}\n`)
}

async function main() {
  const enabled = process.env.VENDOR_AVR_TOOLCHAIN === "1" ||
    (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_ENABLE_AVR_COMPILER === "1")
  if (!enabled) {
    console.log("[vendor-avr-toolchain] skipped (enable with VENDOR_AVR_TOOLCHAIN=1, or set NEXT_PUBLIC_ENABLE_AVR_COMPILER=1 on Vercel Production)")
    return
  }

  if (process.platform !== "linux") {
    console.log(`[vendor-avr-toolchain] skipping on ${process.platform} (Linux-only binary); /api/compile will not work locally`)
    return
  }

  if (existsSync(CLI_PATH) && existsSync(path.join(ARDUINO_DATA_DIR, "packages"))) {
    await installLibrariesAndSmokeTest()
    console.log("[vendor-avr-toolchain] already vendored; required libraries and compile smoke tests verified")
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
  const env = cliEnv()
  execFileSync(CLI_PATH, ["core", "update-index"], { env, stdio: "inherit" })
  execFileSync(CLI_PATH, ["core", "install", "arduino:avr"], { env, stdio: "inherit" })
  await installLibrariesAndSmokeTest()

  // Remove download artifacts, but preserve the staging directory. At runtime
  // the function bundle is read-only and arduino-cli expects this directory.
  rmSync(tarPath, { force: true })
  const stagingDir = path.join(ARDUINO_DATA_DIR, "staging")
  rmSync(stagingDir, { recursive: true, force: true })
  mkdirSync(stagingDir, { recursive: true })
  writeFileSync(path.join(stagingDir, "keep.txt"), "must exist: /var/task is read-only at runtime\n")

  console.log("[vendor-avr-toolchain] done; Servo, LCD I2C, and OLED compile smoke tests passed")
}

main().catch((err) => {
  console.error("[vendor-avr-toolchain] FAILED:", err.message)
  console.error("If this is running in a sandboxed/offline environment without access to downloads.arduino.cc, that's expected -- run this on your local machine or let Vercel's build (which has full internet) do it.")
  process.exit(1)
})
