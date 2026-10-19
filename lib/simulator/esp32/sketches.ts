/** Default sketch for ESP32 targets: the acceptance-test Blink. LED_BUILTIN is defined by the board's
 *  Arduino variant; the fallback is only for variants that do not define it. */
export const ESP32_BLINK_SKETCH = `#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}
`
