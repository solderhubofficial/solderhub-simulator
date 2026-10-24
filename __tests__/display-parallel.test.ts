import { describe, expect, it } from "vitest"
import { createLcd1602ParallelDecoder } from "@/lib/simulator/engine/display-protocol"

describe("parallel LCD1602 decoder", () => {
  it("latches a 4-bit character on E falling edges", () => {
    const d = createLcd1602ParallelDecoder()
    const nibble = (n:number, rs:boolean) => {
      const levels = { RS:rs, E:true, D4:!!(n&1), D5:!!(n&2), D6:!!(n&4), D7:!!(n&8) }
      d.sample(levels)
      return d.sample({...levels,E:false})
    }
    const byte = (v:number,rs:boolean) => { nibble(v>>4,rs); return nibble(v&15,rs) }
    byte(1,false)
    expect(byte(0x48,true)).toMatchObject({line1:"H",line2:""})
  })
})
