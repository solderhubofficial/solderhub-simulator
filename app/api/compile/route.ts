import { NextRequest, NextResponse } from "next/server"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

// Node runtime required -- this shells out to a real binary, which the
// Edge runtime can't do.
export const runtime = "nodejs"
// Hobby allows up to 60s if configured; keep this well under it so we
// always return *something* (a timeout error) rather than silently 504ing.
export const maxDuration = 20

const execFileAsync = promisify(execFile)

const TOOLCHAIN_DIR = path.join(process.cwd(), ".avr-toolchain")
const CLI_PATH = path.join(TOOLCHAIN_DIR, "arduino-cli")
const ARDUINO_DATA_DIR = path.join(TOOLCHAIN_DIR, "data")

// v1 targets AVR only (Uno). The simulator has no ESP32/Xtensa emulator,
// so an ESP32 "compile & run" isn't wired up -- see README note.
const FQBN = "arduino:avr:uno"

// Cheap abuse guards. Real rate-limiting (per-IP/session) should sit in
// front of this in middleware once usage justifies it -- see the note
// in the PR description.
const MAX_SOURCE_BYTES = 20_000
const COMPILE_TIMEOUT_MS = 15_000

export async function POST(req: NextRequest) {
  let body: { source?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const source = body.source
  if (typeof source !== "string" || source.trim().length === 0) {
    return NextResponse.json({ error: "Missing `source` (Arduino sketch text)." }, { status: 400 })
  }
  if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
    return NextResponse.json(
      { error: `Sketch too large -- limit is ${MAX_SOURCE_BYTES / 1000}KB.` },
      { status: 413 }
    )
  }

  let workDir: string | null = null
  try {
    // arduino-cli requires the sketch file to share its parent folder's name.
    workDir = await mkdtemp(path.join(tmpdir(), "sh-sketch-"))
    const sketchName = "sketch"
    const sketchDir = path.join(workDir, sketchName)
    await import("node:fs/promises").then((fs) => fs.mkdir(sketchDir))
    await writeFile(path.join(sketchDir, `${sketchName}.ino`), source, "utf8")

    const outDir = path.join(workDir, "build")

    await execFileAsync(
      CLI_PATH,
      ["compile", "--fqbn", FQBN, "--output-dir", outDir, sketchDir],
      {
        env: { ...process.env, ARDUINO_DIRECTORIES_DATA: ARDUINO_DATA_DIR },
        timeout: COMPILE_TIMEOUT_MS,
        maxBuffer: 5 * 1024 * 1024,
      }
    )

    const hexPath = path.join(outDir, `${sketchName}.ino.hex`)
    const hex = await readFile(hexPath, "utf8")

    return NextResponse.json({ hex })
  } catch (err: unknown) {
    // execFile rejects with stdout/stderr attached on non-zero exit --
    // that's the actual compiler error a user needs to see (their
    // sketch's own bug), not a 500.
    const e = err as { stdout?: string; stderr?: string; killed?: boolean; message?: string }
    if (e.killed) {
      return NextResponse.json({ error: "Compile timed out." }, { status: 504 })
    }
    const compilerOutput = [e.stdout, e.stderr].filter(Boolean).join("\n").trim()
    return NextResponse.json(
      { error: compilerOutput || e.message || "Compile failed." },
      { status: 400 }
    )
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}
