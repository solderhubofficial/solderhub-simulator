// Pure helpers shared by the Next.js compile route and the standalone build service:
// request limits, the source policy, compiler-diagnostic parsing and path scrubbing.
// No Node-only imports so the same file runs in both places and in unit tests.

export const LIMITS = Object.freeze({
  maxSourceBytes: 32_000,
  maxBootloaderBytes: 256 * 1024,
  maxPartitionsBytes: 16 * 1024,
  maxAppBytes: 2 * 1024 * 1024,
  maxLogChars: 16_000,
  maxDiagnostics: 40,
  maxDiagnosticMessageChars: 400,
})

/** Arduino board targets the compile pipeline will accept, keyed by SolderHub board type. */
export const FQBN_BY_BOARD = Object.freeze({
  "esp32-devkit": "esp32:esp32:esp32",
  "esp32-c3": "esp32:esp32:esp32c3",
})

/**
 * Defence in depth ONLY. A compiler runs user-controlled text, so the build host must still be isolated
 * (no secrets, no network, non-root, read-only except a scratch dir). These rules stop the obvious ways a
 * sketch can make the compiler read host files into diagnostics or into the firmware image.
 * @returns {string | null} a user-facing reason, or null when the source is acceptable
 */
export function checkSourcePolicy(source) {
  if (typeof source !== "string" || source.trim().length === 0) return "The sketch is empty."
  if (new TextEncoder().encode(source).length > LIMITS.maxSourceBytes) {
    return `The sketch is too large (limit ${Math.round(LIMITS.maxSourceBytes / 1000)} KB).`
  }
  if (source.includes("\0")) return "The sketch contains a NUL byte."

  // Absolute or parent-relative includes read arbitrary files on the build host.
  const include = /^\s*#\s*(?:include|include_next|import)\s*[<"]([^>"]*)[>"]/gm
  for (let m = include.exec(source); m; m = include.exec(source)) {
    const target = m[1].replace(/\\/g, "/")
    if (target.startsWith("/") || /^[a-zA-Z]:\//.test(target) || target.split("/").includes("..")) {
      return "Includes of absolute or parent-relative paths are not allowed."
    }
  }
  if (/__has_include(?:_next)?\s*\(/.test(source)) return "__has_include is not allowed."
  // Assembler directives that pull files into the image.
  if (/\.incbin\b|\.include\b/.test(source)) return "Assembler file inclusion (.incbin/.include) is not allowed."
  return null
}

const GCC_LINE = /^(.*?):(\d+):(?:(\d+):)?\s*(fatal error|error|warning|note):\s*(.*)$/

/** Remove absolute filesystem paths so server layout never reaches the browser. */
export function scrubPaths(text, extraRoots = []) {
  let out = String(text)
  for (const root of extraRoots) {
    if (root) out = out.split(root).join("")
  }
  // Windows drive paths, then POSIX absolute paths with at least two segments.
  out = out.replace(/[A-Za-z]:\\(?:[^\\\s:"'<>|]+\\)*([^\\\s:"'<>|]+)/g, "$1")
  out = out.replace(/(?<![\w.:-])\/(?:[\w.+@~%-]+\/)+([\w.+@~%-]+)/g, "$1")
  return out
}

/** @returns {{severity:"error"|"warning"|"note", message:string, file?:string, line?:number, column?:number}[]} */
export function parseCompilerDiagnostics(output, extraRoots = []) {
  const diagnostics = []
  const clean = scrubPaths(output, extraRoots)
  for (const raw of clean.split(/\r?\n/)) {
    const m = GCC_LINE.exec(raw.trim())
    if (!m) continue
    const severity = m[4] === "fatal error" ? "error" : m[4]
    const diagnostic = { severity, message: m[5].slice(0, LIMITS.maxDiagnosticMessageChars), file: m[1].split(/[\\/]/).pop() }
    diagnostic.line = Number(m[2])
    if (m[3]) diagnostic.column = Number(m[3])
    diagnostics.push(diagnostic)
    if (diagnostics.length >= LIMITS.maxDiagnostics) break
  }
  return diagnostics
}

/** Trim a compiler log to a bounded, path-free string. */
export function boundedLog(text, extraRoots = []) {
  const clean = scrubPaths(text, extraRoots).trim()
  return clean.length > LIMITS.maxLogChars ? `…${clean.slice(-LIMITS.maxLogChars)}` : clean
}

/** Decode standard base64 into bytes; returns null when the input is not valid base64. */
export function decodeBase64(value) {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return null
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Encode bytes as standard base64 (chunked so large arrays do not overflow the call stack). */
export function encodeBase64(bytes) {
  let binary = ""
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(binary)
}
