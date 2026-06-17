/*
 * Kontrol Relay 5V dengan ESP32 via WiFi + Website Kontrol (lengkap)
 * -------------------------------------------------------------
 * Fitur:
 *   - ESP32 terhubung ke WiFi rumah/kantor (mode Station).
 *     Jika gagal konek dalam WIFI_TIMEOUT_MS, otomatis membuat
 *     Access Point sendiri (mode AP) supaya tetap bisa diakses.
 *   - Web server di ESP32 menyajikan halaman HTML lengkap
 *     (tombol ON/OFF/Toggle, indikator status, auto-refresh)
 *     tanpa perlu hosting terpisah - semua sudah ter-embed di firmware.
 *   - Saklar fisik (opsional) tetap berfungsi paralel dengan kontrol WiFi.
 *   - Endpoint JSON (/status) untuk integrasi ke dashboard lain.
 *
 * Wiring sama seperti relay_switch_control.ino:
 *   Relay IN  -> GPIO26
 *   Switch    -> GPIO27 (ke GND, pakai INPUT_PULLUP)
 *
 * Library yang dibutuhkan: bawaan ESP32 core (WiFi.h, WebServer.h).
 * Tidak perlu install library tambahan.
 *
 * Setelah upload, buka Serial Monitor (115200 baud) untuk melihat
 * IP address ESP32, lalu buka IP tersebut di browser (HP/laptop
 * yang terhubung ke WiFi yang sama).
 */

#include <WiFi.h>
#include <WebServer.h>

// ====== KONFIGURASI WIFI (STATION) ======
const char* WIFI_SSID     = "NAMA_WIFI_ANDA";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";
const unsigned long WIFI_TIMEOUT_MS = 15000; // 15 detik, lalu fallback ke AP

// ====== KONFIGURASI ACCESS POINT (FALLBACK) ======
const char* AP_SSID     = "ESP32-Relay";
const char* AP_PASSWORD = "relay1234"; // minimal 8 karakter

// ====== KONFIGURASI RELAY & SAKLAR ======
#define RELAY_PIN        26
#define SWITCH_PIN       27
#define RELAY_ACTIVE_LOW true
#define DEBOUNCE_MS      40

WebServer server(80);

bool relayState = false;
bool lastRawSwitch = HIGH;
bool stableSwitch = HIGH;
unsigned long lastDebounceTime = 0;

void setRelay(bool on) {
  relayState = on;
  bool pinLevel = RELAY_ACTIVE_LOW ? !on : on;
  digitalWrite(RELAY_PIN, pinLevel ? HIGH : LOW);
  Serial.printf("Relay %s\n", on ? "ON" : "OFF");
}

// ---------- HALAMAN WEB (HTML/CSS/JS, ter-embed di firmware) ----------
const char PAGE_HTML[] PROGMEM = R"HTML(
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kontrol Relay ESP32</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: #f1f5f9;
  }
  .card {
    background: #1e293b; border-radius: 20px; padding: 32px 28px;
    width: 320px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); text-align: center;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
  .status-badge {
    display: inline-block; padding: 6px 18px; border-radius: 999px;
    font-weight: 600; font-size: 14px; margin-bottom: 24px; transition: 0.2s;
  }
  .status-on  { background: #16a34a33; color: #4ade80; border: 1px solid #4ade80; }
  .status-off { background: #ef444433; color: #f87171; border: 1px solid #f87171; }
  .switch {
    position: relative; width: 120px; height: 120px; margin: 0 auto 24px;
    border-radius: 50%; border: none; cursor: pointer; outline: none;
    background: #334155; transition: background 0.25s;
  }
  .switch.on { background: #16a34a; }
  .switch::before {
    content: "⏻"; font-size: 48px; color: #f1f5f9;
  }
  button.action {
    width: 100%; padding: 12px; margin-top: 8px; border: none; border-radius: 10px;
    font-size: 15px; font-weight: 600; cursor: pointer; color: #fff; transition: 0.2s;
  }
  .btn-on  { background: #16a34a; }
  .btn-off { background: #ef4444; }
  .btn-on:hover  { background: #15803d; }
  .btn-off:hover { background: #dc2626; }
  .footer { margin-top: 20px; font-size: 11px; color: #64748b; }
</style>
</head>
<body>
  <div class="card">
    <h1>Kontrol Relay 5V</h1>
    <div class="subtitle">ESP32 WiFi Relay Control</div>

    <div id="badge" class="status-badge status-off">OFF</div>

    <button id="toggleBtn" class="switch" onclick="toggleRelay()"></button>

    <button class="action btn-on"  onclick="setRelay(true)">Nyalakan (ON)</button>
    <button class="action btn-off" onclick="setRelay(false)">Matikan (OFF)</button>

    <div class="footer">Status diperbarui otomatis setiap 2 detik</div>
  </div>

<script>
function updateUI(isOn) {
  document.getElementById('badge').textContent = isOn ? 'ON' : 'OFF';
  document.getElementById('badge').className = 'status-badge ' + (isOn ? 'status-on' : 'status-off');
  document.getElementById('toggleBtn').className = 'switch' + (isOn ? ' on' : '');
}

function fetchStatus() {
  fetch('/status').then(r => r.json()).then(data => updateUI(data.relay)).catch(() => {});
}

function setRelay(on) {
  fetch(on ? '/on' : '/off').then(r => r.json()).then(data => updateUI(data.relay));
}

function toggleRelay() {
  fetch('/toggle').then(r => r.json()).then(data => updateUI(data.relay));
}

fetchStatus();
setInterval(fetchStatus, 2000);
</script>
</body>
</html>
)HTML";

// ---------- HANDLER ROUTE ----------
void handleRoot() {
  server.send_P(200, "text/html", PAGE_HTML);
}

void sendStatusJson() {
  String json = "{\"relay\":";
  json += relayState ? "true" : "false";
  json += "}";
  server.send(200, "application/json", json);
}

void handleStatus() { sendStatusJson(); }
void handleOn()     { setRelay(true);  sendStatusJson(); }
void handleOff()    { setRelay(false); sendStatusJson(); }
void handleToggle() { setRelay(!relayState); sendStatusJson(); }

void handleNotFound() {
  server.send(404, "text/plain", "Not found");
}

// ---------- KONEKSI WIFI ----------
void connectWiFi() {
  Serial.printf("Menghubungkan ke WiFi \"%s\" ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(300);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Terhubung! IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Gagal konek WiFi, membuat Access Point sendiri...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASSWORD);
    Serial.print("AP aktif. SSID: ");
    Serial.print(AP_SSID);
    Serial.print(" | IP address: ");
    Serial.println(WiFi.softAPIP());
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  setRelay(false);

  connectWiFi();

  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/on", handleOn);
  server.on("/off", handleOff);
  server.on("/toggle", handleToggle);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("Web server siap. Buka IP address di atas pada browser.");
}

void loop() {
  server.handleClient();

  // Saklar fisik tetap berfungsi paralel dengan kontrol WiFi
  bool rawSwitch = digitalRead(SWITCH_PIN);
  if (rawSwitch != lastRawSwitch) {
    lastDebounceTime = millis();
  }
  if ((millis() - lastDebounceTime) > DEBOUNCE_MS && rawSwitch != stableSwitch) {
    stableSwitch = rawSwitch;
    if (stableSwitch == LOW) {
      setRelay(!relayState);
    }
  }
  lastRawSwitch = rawSwitch;
}
