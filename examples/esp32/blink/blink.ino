// SolderHub ESP32 Blink. Uses an explicit GPIO instead of LED_BUILTIN: the built-in LED pin
// depends on the board variant (and the ESP32-DevKitC V4 has no user LED), so wire an external
// LED + resistor to GPIO4 (IO4 on the ESP32 DevKit, GPIO4 on the ESP32-C3).
constexpr uint8_t LED_PIN = 4;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED on");
  delay(250);
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED off");
  delay(250);
}
