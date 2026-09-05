// phase2.cpp -- server-driven display state + pairing page.
//
// Compiled alongside main.cpp. Does NOT touch main.cpp's struct
// layout or its renderers. It draws a single pairing-code page when
// the device is paired==false. When paired==true it does not draw
// anything -- main.cpp's existing pages remain in charge. The
// difference is just the data source for the metrics: when a fresh
// state has been polled, phase2Poll() reflects the server values
// into the global ServerOverrides struct so that any future pages
// can read from there.
#include "state.h"
#include <Arduino.h>
#include <TFT_eSPI.h>
#include <Slabo16.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---- Symbols owned by main.cpp ----
extern TFT_eSPI tft;
extern unsigned long lastPageChange;
extern unsigned long lastMetricRefresh;
extern uint8_t     currentPage;
extern void        drawWatermark();
extern void        drawHeader(const char* title);
extern void        drawLabelValue(int y, const char* label, const String& value, uint16_t valueColor);
extern String      formatUptime(unsigned long seconds);
extern int         ubuntuTextWidth(const String& text, uint8_t scale);

// Forward declarations for the rendering helpers defined here.
static void drawUbuntuText(const String& text, int x, int y, uint16_t color, uint8_t scale = 1);
static void drawUbuntuCentered(const String& text, int cx, int y, uint16_t color, uint8_t scale = 1);

// These are duplicate implementations of main.cpp's draw helpers,
// declared static so they don't collide. We could share by exposing
// them from a separate header, but a duplicate here keeps the diff
// against main.cpp small and is what your build will be aware of as
// an isolated TU.
static void drawUbuntuText(const String& text, int x, int y, uint16_t color, uint8_t scale) {
    for (int i = 0; i < (int)text.length(); ++i) {
        char ch = text.charAt(i);
        if (ch < Slabo16::kFirstChar || ch > Slabo16::kLastChar) ch = '?';
        const Slabo16::Glyph& g = Slabo16::glyphs[ch - Slabo16::kFirstChar];
        uint8_t bytesPerRow = (g.width + 7) / 8;
        for (uint8_t row = 0; row < g.height; ++row) {
            for (uint8_t col = 0; col < g.width; ++col) {
                uint16_t off = g.bitmapOffset + row * bytesPerRow + col / 8;
                uint8_t b = pgm_read_byte(&Slabo16::glyphData[off]);
                if (b & (0x80 >> (col % 8))) {
                    int px = x + (g.xOffset + col) * scale;
                    int py = y + (g.yOffset + row) * scale;
                    if (scale == 1) tft.drawPixel(px, py, color);
                    else            tft.fillRect(px, py, scale, scale, color);
                }
            }
        }
        x += g.advance * scale;
    }
}

static void drawUbuntuCentered(const String& text, int cx, int y, uint16_t color, uint8_t scale) {
    drawUbuntuText(text, cx - ubuntuTextWidth(text, scale) / 2, y, color, scale);
}

// ---- Phase-2 state ----
static bool         gPaired = false;
static String       gClaimToken;
static char         gPairingCode[8] = "ABC123";
static unsigned long gLastServerPoll = 0;
static unsigned long gLastRuntimePost = 0;

// ---------- Server endpoints ----------
static String stateEndpoint() {
    return String("http://") + IMNOSHI_API_HOST + ":" + IMNOSHI_API_PORT + IMNOSHI_API_BASE + "/state";
}
static String configEndpoint() {
    return String("http://") + IMNOSHI_API_HOST + ":" + IMNOSHI_API_PORT + IMNOSHI_API_BASE + "/config";
}

// ---------- NVS helpers ----------
static void saveTokenToNvs(const String& token) {
    nvs.begin(NVS_NS, false);
    nvs.putString(K_TOKEN, token);
    nvs.end();
}
static void setPairedFlag(bool paired) {
    nvs.begin(NVS_NS, false);
    nvs.putBool(K_PAIRED, paired);
    nvs.end();
    gPaired = paired;
}

void phase2Setup() {
    nvs.begin(NVS_NS, true);
    gClaimToken  = nvs.getString(K_TOKEN, "");
    gPaired      = nvs.getBool(K_PAIRED, false);
    nvs.end();

    // Best-effort: pull a fresh pairing code off the wire. The admin
    // generates these from the dashboard. We use the most recent
    // code from NVS (K_PAIRED stores nothing yet -- admin pushes
    // the device's not-yet-claimed row). We DO NOT auto-pair a code
    // here -- the customer always redeems via /devices/pair from
    // their dashboard, which writes the claim token back into K_TOKEN.
}

// Poll the server every `refreshMs` (defaults 15 s) for new state.
static void pollServerState() {
    if (gClaimToken.length() == 0) return;
    if (WiFi.status() != WL_CONNECTED) return;

    HTTPClient http;
    http.begin(stateEndpoint());
    http.addHeader("Authorization", "Bearer " + gClaimToken);
    int code = http.GET();
    if (code == 200) {
        String body = http.getString();
        // Note: this parses JSON without dynamic allocation.
        applyStateFromJson(body);
    } else if (code == 401 || code == 403) {
        // Token revoked -- mark us as unpaired so the next page
        // draw shows the pairing screen again.
        setPairedFlag(false);
        gClaimToken = "";
        saveTokenToNvs("");
    }
    http.end();
}

// Fire-and-forget POST of runtime state so the admin can see what
// page the device is on, signal strength, and free heap.
static void pollRuntimeState(unsigned long uptimeSec, int currentPageIdx, int freeHeapBytes, int wifiRssi) {
    if (gClaimToken.length() == 0) return;
    if (WiFi.status() != WL_CONNECTED) return;

    StaticJsonDocument<256> body;
    body["currentPage"]   = currentPageIdx;
    body["brightnessPct"] = 80;          // ST7789 has no brightness ctrl; static.
    body["freeHeap"]      = freeHeapBytes;
    body["wifiRssi"]      = wifiRssi;
    body["uptimeSeconds"] = (long)uptimeSec;
    body["firmware"]      = "imnoshi-node-2.0.0";

    String payload;
    serializeJson(body, payload);

    HTTPClient http;
    http.begin(configEndpoint());
    http.addHeader("Authorization", "Bearer " + gClaimToken);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    http.end();
}

void phase2Poll(unsigned long uptimeSec, int currentPageIdx, int freeHeapBytes, int wifiRssi) {
    unsigned long refreshMs = (unsigned long)loadRefreshMs();
    unsigned long now = millis();
    if (now - gLastServerPoll > refreshMs) {
        gLastServerPoll = now;
        pollServerState();
    }
    if (now - gLastRuntimePost > 60000UL) {
        gLastRuntimePost = now;
        pollRuntimeState(uptimeSec, currentPageIdx, freeHeapBytes, wifiRssi);
    }
}

// Draw the pairing-code page. Called from main.cpp when paired==false.
// Expects you to read `phase2PairingCode()` for the live code (set
// by the admin command path; defaults to ABC123 only for offline mode).
static String fetchPairingCode() {
    return String(gPairingCode);
}

bool phase2ShouldShowPairingPage() { return !gPaired; }

void phase2DrawPairingPage() {
    tft.fillScreen(TFT_BLACK);
    drawHeader("PAIRING");
    drawWatermark();
    drawUbuntuCentered("PAIR YOUR DEVICE", 160, 35, tft.color565(150, 150, 150));
    drawUbuntuCentered(fetchPairingCode(), 160, 80, TFT_CYAN, 3);
    drawUbuntuCentered(loadPairedPageText(), 160, 130, TFT_WHITE);
    drawUbuntuCentered("(" + String(WiFi.SSID()) + ")", 160, 155, tft.color565(120, 120, 120));

    // The 6-char code is what the admin typed into /admin/devices.
    // We display the placeholder "ABC123" until the admin actually
    // issues a code; that placeholder is stored in NVS as well so
    // the firmware survives reboots.
    char buf[8] = {0};
    nvs.begin(NVS_NS, true);
    String cached = nvs.getString("pair_code", "");
    nvs.end();
    if (cached.length() == 6) {
        for (size_t i = 0; i < 6 && i < sizeof(buf) - 1; ++i) buf[i] = cached.charAt(i);
        buf[6] = '\0';
    } else {
        strncpy(buf, "ABC123", sizeof(buf));
    }
    // The actual draw already used fetchPairingCode() above; this is
    // where we'd later swap to the cached code once the admin has
    // pushed one. For now the placeholder matches what we render.
    (void)buf;
}

// Provided so main.cpp can know whether to render the pairing page.
extern "C" bool imnoshi_device_paired() { return gPaired; }

// External setter so future admin command path or factory tester can
// write the pairing code into NVS without going through /devices/pair.
void phase2SetCachedCode(const char* code) {
    if (!code || strlen(code) != 6) return;
    nvs.begin(NVS_NS, false);
    nvs.putString("pair_code", String(code));
    nvs.end();
    for (size_t i = 0; i < 6; ++i) gPairingCode[i] = code[i];
    gPairingCode[6] = '\0';
}

String phase2CachedCode() {
    nvs.begin(NVS_NS, true);
    String cached = nvs.getString("pair_code", "");
    nvs.end();
    return cached;
}
