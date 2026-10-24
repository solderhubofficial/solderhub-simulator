export interface DisplayDecoder<T extends Record<string, unknown> = Record<string, unknown>> {
  consume(value: number): T | null
  beginTransaction?(): void
}

/** Decode PCF8574 backpack writes into HD44780 4-bit commands/data. */
export function createLcd1602I2cDecoder(): DisplayDecoder {
  let previous = 0
  let highNibble: number | null = null
  let cursor = 0
  let backlight = true
  let displayOn = true
  let ddram = new Map<number, string>()
  const lines = () => ({
    line1: Array.from({length:16},(_,i)=>ddram.get(i)??" ").join("").trimEnd(),
    line2: Array.from({length:16},(_,i)=>ddram.get(0x40+i)??" ").join("").trimEnd(),
  })
  return { consume(value: number) {
    const next = value & 0xff
    backlight = (next & 0x08) !== 0
    let patch: Record<string, unknown> | null = null
    if ((previous & 4) !== 0 && (next & 4) === 0) {
      const nibble = (next >> 4) & 15
      const rs = next & 1
      if (highNibble === null) highNibble = nibble
      else {
        const byte = (highNibble << 4) | nibble
        highNibble = null
        if (rs) {
          ddram.set(cursor, String.fromCharCode(byte >= 32 && byte <= 126 ? byte : 32))
          cursor = (cursor + 1) & 0x7f
          patch = { ...lines(), backlight, displayOn }
        } else if (byte === 1) {
          ddram = new Map()
          cursor = 0
          patch = { line1: "", line2: "", backlight, displayOn }
        } else if (byte === 2) cursor = 0
        else if (byte & 0x80) cursor = byte & 0x7f
        else if ((byte & 0xf8) === 0x08) {
          displayOn = (byte & 4) !== 0
          patch = { backlight, displayOn }
        }
      }
    }
    previous = next
    return patch
  }}
}

/** Decode common SSD1306/SH1106 page-mode writes into a 128x64 framebuffer. */
export function createSsd1306Decoder(): DisplayDecoder {
  let expectingControl = true
  let dataMode = false
  let pending: number | null = null
  let args = 0
  let column = 0, page = 0, colStart = 0, colEnd = 127, pageStart = 0, pageEnd = 7
  let displayOn = true
  let framebuffer = Array.from({length:1024},()=>0)
  let changed = false
  let dataCount = 0
  return { beginTransaction() { expectingControl = true }, consume(value: number) {
    const byte = value & 0xff
    if (expectingControl) {
      dataMode = (byte & 0x40) !== 0
      expectingControl = false
      return null
    }
    if (dataMode) {
      framebuffer[page * 128 + column] = byte
      column++
      if (column > colEnd) { column = colStart; page = page >= pageEnd ? pageStart : page + 1 }
      changed = true
      dataCount++
      if (dataCount % 16 === 0) { changed = false; return { framebuffer: [...framebuffer], displayOn } }
      return null
    }
    if (pending !== null && args > 0) {
      if (pending === 0x21) {
        if (args === 2) colStart = byte & 127
        else { colEnd = byte & 127; column = colStart }
      } else {
        if (args === 2) pageStart = byte & 7
        else { pageEnd = byte & 7; page = pageStart }
      }
      args--
      if (!args) pending = null
    } else if (byte === 0x21 || byte === 0x22) { pending = byte; args = 2 }
    else if (byte >= 0xb0 && byte <= 0xb7) page = byte & 7
    else if ((byte & 0xf0) === 0) column = (column & 0xf0) | (byte & 15)
    else if ((byte & 0xf0) === 0x10) column = (column & 15) | ((byte & 15) << 4)
    else if (byte === 0xae) displayOn = false
    else if (byte === 0xaf) displayOn = true
    // Commit a framebuffer snapshot after each completed data chunk.
    if (changed) { changed = false; return { framebuffer: [...framebuffer], displayOn } }
    if (byte === 0xae || byte === 0xaf) return { displayOn }
    return null
  }}
}

/** Decode the standard HD44780 4-bit parallel interface (RS, E, D4-D7). */
export function createLcd1602ParallelDecoder() {
  let previousEnable = false
  let highNibble: number | null = null
  let cursor = 0
  let displayOn = true
  let backlight = true
  let ddram = new Map<number, string>()
  const lines = () => ({
    line1: Array.from({length:16},(_,i)=>ddram.get(i)??" ").join("").trimEnd(),
    line2: Array.from({length:16},(_,i)=>ddram.get(0x40+i)??" ").join("").trimEnd(),
  })
  return {
    sample(levels: Record<string, boolean>): Record<string, unknown> | null {
      const enable = levels.E === true
      let patch: Record<string, unknown> | null = null
      if (previousEnable && !enable) {
        const nibble = (Number(levels.D4) << 0) | (Number(levels.D5) << 1) | (Number(levels.D6) << 2) | (Number(levels.D7) << 3)
        if (highNibble === null) highNibble = nibble
        else {
          const byte = (highNibble << 4) | nibble
          highNibble = null
          if (levels.RS) {
            ddram.set(cursor, String.fromCharCode(byte >= 32 && byte <= 126 ? byte : 32))
            cursor = (cursor + 1) & 0x7f
            patch = { ...lines(), displayOn, backlight }
          } else if (byte === 1) {
            ddram = new Map(); cursor = 0
            patch = { line1: "", line2: "", displayOn, backlight }
          } else if (byte === 2) cursor = 0
          else if (byte & 0x80) cursor = byte & 0x7f
          else if ((byte & 0xf8) === 0x08) {
            displayOn = (byte & 4) !== 0
            patch = { displayOn, backlight }
          } else if ((byte & 0xf0) === 0x20) {
            // Function set (including the common 4-bit initialization sequence).
          }
        }
      }
      previousEnable = enable
      return patch
    },
  }
}
