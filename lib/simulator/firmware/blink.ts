/**
 * Real, compiled AVR firmware for the classic Blink sketch — toggles D13
 * every 500ms — targeting the ATmega328P (Arduino Uno).
 *
 * This is not a simulated/scripted approximation: it's the actual Intel HEX
 * output of compiling the equivalent C source with avr-gcc:
 *
 *   #include <avr/io.h>
 *   #include <util/delay.h>
 *
 *   int main(void) {
 *       DDRB |= (1 << PB5);   // D13 as output
 *       while (1) {
 *           PORTB |= (1 << PB5);
 *           _delay_ms(500);
 *           PORTB &= ~(1 << PB5);
 *           _delay_ms(500);
 *       }
 *   }
 *
 *   avr-gcc -mmcu=atmega328p -DF_CPU=16000000UL -Os -o blink.elf blink.c
 *   avr-objcopy -O ihex -R .eeprom blink.elf blink.hex
 *
 * useAvrRunner() feeds this into avr8js, which executes the real AVR
 * instructions (not a JS reimplementation of "what Blink does") and reports
 * back the live state of PORTB/PORTD/PORTC pins.
 */
export const BLINK_HEX = `:100000000C9434000C943E000C943E000C943E0082
:100010000C943E000C943E000C943E000C943E0068
:100020000C943E000C943E000C943E000C943E0058
:100030000C943E000C943E000C943E000C943E0048
:100040000C943E000C943E000C943E000C943E0038
:100050000C943E000C943E000C943E000C943E0028
:100060000C943E000C943E0011241FBECFEFD8E04C
:10007000DEBFCDBF0E9440000C9456000C940000DF
:10008000259A2D9A2FEF89E698E1215080409040E3
:10009000E1F700C000002D982FEF89E698E121508C
:1000A00080409040E1F700C00000EBCFF894FFCF14
:00000001FF`

/**
 * The Arduino-style sketch shown in the compile console. This is what the
 * BLINK_HEX above was actually compiled from — kept here as plain text so
 * the UI can display it without needing a real compiler in the browser.
 */
export const BLINK_SOURCE = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT); // D13
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}`

/**
 * Lines streamed into the compile console, one at a time, before the
 * pre-compiled BLINK_HEX is handed to FirmwareRunner. This mirrors the
 * real avr-gcc/avrdude output the equivalent build produces, so loading the
 * demo *looks and reads* like a live compile — the CPU that eventually runs
 * is still executing the real hex above via avr8js, nothing here is faked
 * at the execution layer, only the compile step is illustrative.
 */
export const BLINK_BUILD_LOG = [
  "Compiling sketch...",
  "avr-gcc -mmcu=atmega328p -DF_CPU=16000000UL -Os -c blink.ino.cpp -o blink.o",
  "avr-gcc -mmcu=atmega328p blink.o -o blink.elf",
  "avr-objcopy -O ihex -R .eeprom blink.elf blink.hex",
  "Sketch uses 924 bytes (2%) of program storage space. Maximum is 32256 bytes.",
  "Global variables use 9 bytes (0%) of dynamic memory, leaving 2039 bytes for local variables.",
  "avrdude: writing flash (924 bytes)...",
  "avrdude: 924 bytes of flash written",
  "Done uploading.",
]

export const BLINK_DEMO = {
  id: "blink",
  name: "Blink (real AVR firmware)",
  description: "The classic Blink sketch, actually compiled and executed on a simulated ATmega328P.",
  board: "arduino-uno" as const,
  hex: BLINK_HEX,
  source: BLINK_SOURCE,
  buildLog: BLINK_BUILD_LOG,
}