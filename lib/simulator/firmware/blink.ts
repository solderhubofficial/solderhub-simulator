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

export const BLINK_DEMO = {
  id: "blink",
  name: "Blink (real AVR firmware)",
  description: "The classic Blink sketch, actually compiled and executed on a simulated ATmega328P.",
  board: "arduino-uno" as const,
  hex: BLINK_HEX,
}
