/*
 * Kontrol Relay 5V dengan ESP32 menggunakan Saklar (Switch) Fisik
 * ------------------------------------------------------------
 * Wiring:
 *   - Relay module 5V:
 *       VCC  -> 5V (pin VIN ESP32 / power supply 5V eksternal)
 *       GND  -> GND
 *       IN   -> GPIO26 (RELAY_PIN)
 *   - Saklar / push button:
 *       satu kaki -> GPIO27 (SWITCH_PIN)
 *       kaki lain -> GND
 *     (menggunakan INPUT_PULLUP, jadi tidak perlu resistor eksternal)
 *
 * Catatan: Sebagian besar modul relay 1-channel bersifat ACTIVE LOW
 * (output relay aktif ketika pin IN diberi LOW). Jika modul relay Anda
 * berbeda, ubah RELAY_ACTIVE_LOW di bawah menjadi false.
 */

#define RELAY_PIN        26
#define SWITCH_PIN       27
#define RELAY_ACTIVE_LOW true   // true = relay ON saat pin LOW, false = relay ON saat pin HIGH
#define DEBOUNCE_MS      40

bool relayState = false;        // status logis relay: false = OFF, true = ON
bool lastRawSwitch = HIGH;      // pembacaan mentah terakhir
bool stableSwitch = HIGH;       // pembacaan setelah debounce
unsigned long lastDebounceTime = 0;

void setRelay(bool on) {
  relayState = on;
  bool pinLevel = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PIN, pinLevel ? HIGH : LOW);
  Serial.printf("Relay %s\n", on ? "ON" : "OFF");
}

void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(SWITCH_PIN, INPUT_PULLUP);

  setRelay(false); // pastikan relay mati saat start

  Serial.println("Kontrol relay via saklar fisik siap.");
}

void loop() {
  bool rawSwitch = digitalRead(SWITCH_PIN);

  // debounce
  if (rawSwitch != lastRawSwitch) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_MS && rawSwitch != stableSwitch) {
    stableSwitch = rawSwitch;

    // saklar ditekan (terhubung ke GND => LOW) -> toggle relay
    if (stableSwitch == LOW) {
      setRelay(!relayState);
    }
  }

  lastRawSwitch = rawSwitch;
}
