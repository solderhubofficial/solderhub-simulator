/**
 * Parses an Intel HEX file (the standard output format of avr-objcopy) into
 * raw bytes, writing them into the given target buffer at their addresses.
 * Only record types 00 (data) and 01 (end-of-file) are needed for flat AVR
 * flash images — extended address records aren't required at the sizes
 * these boards use (max 256KB, well under the 64KB default addressing).
 */
export function loadIntelHex(hex: string, target: Uint8Array): void {
  const lines = hex.split(/\r?\n/)
  for (const line of lines) {
    if (!line.startsWith(":")) continue
    const byteCount = parseInt(line.slice(1, 3), 16)
    const address = parseInt(line.slice(3, 7), 16)
    const recordType = parseInt(line.slice(7, 9), 16)
    if (recordType !== 0x00) continue // only data records
    for (let i = 0; i < byteCount; i++) {
      const byteHex = line.slice(9 + i * 2, 11 + i * 2)
      target[address + i] = parseInt(byteHex, 16)
    }
  }
}
