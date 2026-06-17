# Kontrol Relay 5V dengan ESP32

Dua sketch Arduino (untuk ESP32) untuk mengontrol modul relay 5V. Setiap
sketch ada di folder tersendiri dengan nama yang sama seperti file `.ino`,
sesuai aturan Arduino IDE — tinggal buka file `.ino`-nya langsung di Arduino IDE.

| Folder / File | Mode Kontrol |
|------|--------------|
| `relay_switch_control/relay_switch_control.ino` | Saklar/push button fisik (tanpa WiFi) |
| `relay_wifi_control/relay_wifi_control.ino`   | WiFi + website kontrol lengkap (ter-embed di firmware) + saklar fisik tetap aktif |

## Wiring

| Komponen | Pin ESP32 |
|----------|-----------|
| Relay module VCC | 5V (VIN) |
| Relay module GND | GND |
| Relay module IN  | GPIO26 |
| Saklar / push button kaki 1 | GPIO27 |
| Saklar / push button kaki 2 | GND |

Saklar menggunakan `INPUT_PULLUP` internal ESP32, jadi tidak perlu resistor tambahan.

> Sebagian besar modul relay 1-channel bersifat **active LOW** (relay ON saat
> pin IN diberi sinyal LOW). Sketch ini sudah diset `RELAY_ACTIVE_LOW = true`.
> Jika relay Anda justru menyala terbalik, ubah nilai itu menjadi `false`.

## 1. `relay_switch_control/relay_switch_control.ino` — kontrol via saklar fisik

- Setiap kali saklar ditekan, relay akan toggle (ON ↔ OFF).
- Sudah dilengkapi debounce software (40ms) agar tidak "double trigger".
- Upload langsung via Arduino IDE (board: "ESP32 Dev Module" atau sejenisnya).

## 2. `relay_wifi_control/relay_wifi_control.ino` — kontrol via WiFi + Website

### Langkah setup

1. Buka file di Arduino IDE, edit bagian konfigurasi WiFi di atas:
   ```cpp
   const char* WIFI_SSID     = "NAMA_WIFI_ANDA";
   const char* WIFI_PASSWORD = "PASSWORD_WIFI_ANDA";
   ```
2. Upload ke ESP32.
3. Buka Serial Monitor (baud rate **115200**).
4. ESP32 akan mencoba konek ke WiFi tersebut selama 15 detik:
   - **Berhasil** → Serial Monitor menampilkan IP address (mis. `192.168.1.45`).
     Buka IP tersebut di browser HP/laptop yang terhubung ke WiFi yang sama.
   - **Gagal** → ESP32 otomatis membuat Access Point sendiri bernama
     `ESP32-Relay` (password `relay1234`). Sambungkan HP/laptop ke WiFi
     tersebut, lalu buka `192.168.4.1` di browser.

### Website kontrol

Website sepenuhnya di-host langsung dari ESP32 (tidak perlu server/hosting
terpisah). Fitur:

- Tombol bundar besar untuk **toggle** relay.
- Tombol terpisah **Nyalakan (ON)** / **Matikan (OFF)**.
- Badge status (ON/OFF) yang otomatis update setiap 2 detik via polling.
- Tampilan responsif (mobile-friendly), dark theme.

### Endpoint API (untuk integrasi dengan sistem lain, mis. Dashboard-MTN)

| Endpoint | Method | Response |
|----------|--------|----------|
| `/`        | GET | Halaman HTML kontrol |
| `/status`  | GET | `{"relay": true/false}` |
| `/on`      | GET | Nyalakan relay, balas status JSON |
| `/off`     | GET | Matikan relay, balas status JSON |
| `/toggle`  | GET | Toggle relay, balas status JSON |

Contoh pemanggilan dari luar (curl):
```bash
curl http://192.168.1.45/on
curl http://192.168.1.45/status
```

## Kustomisasi

- Ganti `RELAY_PIN` / `SWITCH_PIN` jika menggunakan pin lain.
- Ganti `WIFI_TIMEOUT_MS` untuk durasi tunggu konek WiFi sebelum fallback ke AP.
- Untuk kontrol multi-relay, duplikasi pola `RELAY_PIN`/endpoint untuk setiap channel.
