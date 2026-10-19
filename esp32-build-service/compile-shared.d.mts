export interface CompileDiagnostic {
  severity: "error" | "warning" | "note"
  message: string
  file?: string
  line?: number
  column?: number
}
export declare const LIMITS: {
  readonly maxSourceBytes: number
  readonly maxBootloaderBytes: number
  readonly maxPartitionsBytes: number
  readonly maxAppBytes: number
  readonly maxLogChars: number
  readonly maxDiagnostics: number
  readonly maxDiagnosticMessageChars: number
}
export declare const FQBN_BY_BOARD: Readonly<Record<string, string>>
export declare function checkSourcePolicy(source: unknown): string | null
export declare function scrubPaths(text: string, extraRoots?: string[]): string
export declare function parseCompilerDiagnostics(output: string, extraRoots?: string[]): CompileDiagnostic[]
export declare function boundedLog(text: string, extraRoots?: string[]): string
export declare function decodeBase64(value: unknown): Uint8Array | null
export declare function encodeBase64(bytes: Uint8Array): string
