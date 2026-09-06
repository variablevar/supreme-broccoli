#include <Arduino.h>
#include <TFT_eSPI.h>
#include <Slabo16.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "state.h"
#include "phase2.h"

TFT_eSPI tft = TFT_eSPI();
constexpr int BOOT_BUTTON_PIN = 0;
constexpr uint8_t PAGE_COUNT = 4;
constexpr unsigned long PAGE_INTERVAL_MS = 5000;
constexpr unsigned long METRIC_REFRESH_MS = 15000;
constexpr uint8_t MINING_CURRENCY_COUNT = 7;

struct DeviceProfile {
    const char* uuid;
    const char* userName;
};

struct NetworkMetrics {
    float downloadMbps;
    float uploadMbps;
};

struct PowerMetrics {
    float watts;
    float energyTodayWh;
};

struct MiningMetrics {
    const char* currency;
    bool isStaking;
    float rate;
    float dailyUsdt;
};

struct DeviceMetrics {
    DeviceProfile profile;
    NetworkMetrics network;
    PowerMetrics power;
    MiningMetrics mining;
    const char* walletProtocol;
    const char* walletAddress;
    float connectedWalletUsdt;
    float dailyRevenueUsdt;
    bool online;
    unsigned long uptimeSeconds;
};

struct ActivityProfile {
    const char* currency;
    bool isStaking;
};

const ActivityProfile activityProfiles[MINING_CURRENCY_COUNT] = {
    {"BTC", false}, {"ETH", true}, {"SOL", true}, {"DOGE", false},
    {"LTC", false}, {"XMR", false}, {"PEARL", true}
};

DeviceMetrics metrics;
uint8_t currentPage = 0;
unsigned long lastPageChange = 0;
unsigned long lastMetricRefresh = 0;

// Phase 2: Preferences instance used by state.cpp / phase2.cpp to
// persist the WiFi creds, claim token, and pair code across reboots.
Preferences nvs;

int ubuntuTextWidth(const String& text, uint8_t scale = 1) {
    int width = 0;
    for (char character : text) {
        if (character < Slabo16::kFirstChar || character > Slabo16::kLastChar) {
            character = '?';
        }
        const Slabo16::Glyph& glyph = Slabo16::glyphs[character - Slabo16::kFirstChar];
        width += glyph.advance * scale;
    }
    return width;
}

void drawUbuntuText(const String& text, int x, int y, uint16_t color, uint8_t scale = 1) {
    tft.startWrite();
    for (char character : text) {
        if (character < Slabo16::kFirstChar || character > Slabo16::kLastChar) {
            character = '?';
        }

        const Slabo16::Glyph& glyph = Slabo16::glyphs[character - Slabo16::kFirstChar];
        uint8_t bytesPerRow = (glyph.width + 7) / 8;
        for (uint8_t row = 0; row < glyph.height; ++row) {
            for (uint8_t column = 0; column < glyph.width; ++column) {
                uint16_t byteOffset = glyph.bitmapOffset + row * bytesPerRow + column / 8;
                uint8_t bitmapByte = pgm_read_byte(&Slabo16::glyphData[byteOffset]);
                if (bitmapByte & (0x80 >> (column % 8))) {
                    int pixelX = x + (glyph.xOffset + column) * scale;
                    int pixelY = y + (glyph.yOffset + row) * scale;
                    if (scale == 1) {
                        tft.drawPixel(pixelX, pixelY, color);
                    } else {
                        tft.fillRect(pixelX, pixelY, scale, scale, color);
                    }
                }
            }
        }
        x += glyph.advance * scale;
    }
    tft.endWrite();
}

void drawUbuntuCentered(const String& text, int centerX, int y, uint16_t color, uint8_t scale = 1) {
    drawUbuntuText(text, centerX - ubuntuTextWidth(text, scale) / 2, y, color, scale);
}

void loadMockMetrics() {
    metrics.profile = {"IM-78432", "Imnoshi Member"};
    metrics.network = {87.5f, 15.3f};
    metrics.power = {42.0f, 816.0f};
    metrics.mining = {"BTC", false, 450.2f, 23.40f};
    metrics.walletProtocol = "ERC-20";
    metrics.walletAddress = "0x7A3F...B901";
    metrics.connectedWalletUsdt = 23840.00f;
    metrics.dailyRevenueUsdt = 23.40f;
}

void shuffleMiningCurrency() {
    const ActivityProfile& profile = activityProfiles[random(MINING_CURRENCY_COUNT)];
    metrics.mining.currency = profile.currency;
    metrics.mining.isStaking = profile.isStaking;
    metrics.mining.rate = metrics.mining.isStaking
        ? random(42, 96) / 10.0f
        : random(180, 900) / 10.0f;
    metrics.mining.dailyUsdt = random(800, 4500) / 100.0f;
}

bool refreshMetrics() {
    metrics.online = WiFi.status() == WL_CONNECTED;
    metrics.uptimeSeconds = millis() / 1000;
    shuffleMiningCurrency();
    return true;
}

void drawBootScreen() {
    tft.fillScreen(TFT_BLACK);
    drawUbuntuCentered("IMNOSHI", 160, 40, TFT_CYAN, 2);
    drawUbuntuCentered("SMART MINER", 160, 85, TFT_WHITE);
    drawUbuntuCentered("Powered by GT Quant", 160, 136, tft.color565(150, 150, 150));
}

String formatUptime(unsigned long seconds) {
    unsigned long days = seconds / 86400;
    unsigned long hours = (seconds % 86400) / 3600;
    unsigned long minutes = (seconds % 3600) / 60;
    return String(days) + "d " + String(hours) + "h " + String(minutes) + "m";
}

void drawWatermark() {
    drawUbuntuCentered("IMNOSHI", 160, 76, tft.color565(18, 18, 18), 2);
}

void drawHeader(const char* title) {
    tft.fillRect(0, 0, 320, 27, TFT_BLACK);
    drawUbuntuText("IMNOSHI", 8, 5, TFT_CYAN);
    drawUbuntuText(title, 95, 5, TFT_WHITE);
    drawUbuntuText(metrics.online ? "ONLINE" : "OFFLINE", 225, 5,
                   metrics.online ? tft.color565(0, 220, 100) : TFT_RED);
    drawUbuntuText(String(currentPage + 1) + "/" + String(PAGE_COUNT), 285, 5,
                   tft.color565(140, 140, 140));
    tft.drawFastHLine(8, 27, 304, tft.color565(45, 45, 45));
}

void drawLabelValue(int y, const char* label, const String& value, uint16_t valueColor = TFT_WHITE) {
    drawUbuntuText(label, 14, y, tft.color565(150, 150, 150));
    drawUbuntuText(value, 150, y, valueColor);
}

void drawOverviewPage() {
    drawHeader("OVERVIEW");
    drawLabelValue(42, "UUID", metrics.profile.uuid, TFT_CYAN);
    drawLabelValue(63, "USER", metrics.profile.userName);
    drawLabelValue(84, "WALLET", String(metrics.connectedWalletUsdt, 2) + " USDT", TFT_CYAN);
    drawLabelValue(105, "DAILY REV", String(metrics.dailyRevenueUsdt, 2) + " USDT", tft.color565(0, 220, 100));
    drawLabelValue(126, "ACTIVITY", metrics.mining.isStaking ? "STAKING" : "MINING", TFT_CYAN);
    drawLabelValue(147, "UPTIME", formatUptime(metrics.uptimeSeconds));
}

void drawNetworkPage() {
    drawHeader("NETWORK & POWER");
    drawLabelValue(45, "DOWNLOAD", String(metrics.network.downloadMbps, 1) + " Mbps", TFT_CYAN);
    drawLabelValue(69, "UPLOAD", String(metrics.network.uploadMbps, 1) + " Mbps", TFT_CYAN);
    drawLabelValue(93, "POWER", String(metrics.power.watts, 1) + " W", tft.color565(255, 210, 80));
    drawLabelValue(117, "ENERGY TODAY", String(metrics.power.energyTodayWh, 0) + " Wh", tft.color565(255, 210, 80));
    drawLabelValue(141, "UPTIME", formatUptime(metrics.uptimeSeconds));
}

void drawMiningPage() {
    drawHeader("ACTIVITY");
    drawUbuntuCentered("CURRENT ACTIVITY", 160, 40, tft.color565(150, 150, 150));
    drawUbuntuCentered(metrics.mining.currency, 160, 60, TFT_CYAN, 2);
    drawUbuntuCentered(metrics.mining.isStaking ? "PROOF OF STAKE (POS)" : "PROOF OF WORK (POW)",
                       160, 96, TFT_WHITE);
    drawUbuntuCentered(String(metrics.mining.rate, 1) + (metrics.mining.isStaking ? " % APR" : " MH/s"),
                       160, 116, TFT_CYAN);
    drawUbuntuCentered("+" + String(metrics.mining.dailyUsdt, 2) + " USDT / DAY", 160, 141,
                       tft.color565(0, 220, 100));
}

void drawWalletPage() {
    drawHeader("WALLET & REVENUE");
    drawUbuntuCentered("CONNECTED WALLET", 160, 40, tft.color565(150, 150, 150));
    drawUbuntuCentered("USDT - " + String(metrics.walletProtocol), 160, 61, TFT_CYAN);
    drawUbuntuCentered(metrics.walletAddress, 160, 82, TFT_WHITE);
    drawUbuntuCentered(String(metrics.connectedWalletUsdt, 2) + " USDT", 160, 105, TFT_CYAN);
    drawUbuntuCentered("EVERYDAY REVENUE", 160, 128, tft.color565(150, 150, 150));
    drawUbuntuCentered("+" + String(metrics.dailyRevenueUsdt, 2) + " USDT", 160, 147,
                       tft.color565(0, 220, 100));
}

void drawCurrentPage() {
    tft.fillScreen(TFT_BLACK);
    drawWatermark();
    switch (currentPage) {
        case 0: drawOverviewPage(); break;
        case 1: drawNetworkPage(); break;
        case 2: drawMiningPage(); break;
        default: drawWalletPage(); break;
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
    tft.init();
    tft.setRotation(1);
    drawBootScreen();
    delay(2500);

    WiFiManager wifiManager;
    if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
        wifiManager.resetSettings();
        Serial.println("Saved Wi-Fi credentials cleared");
    }
    wifiManager.setConfigPortalTimeout(180);
    if (!wifiManager.autoConnect("Imnoshi-Setup")) {
        Serial.println("Wi-Fi setup timed out; continuing offline");
    } else {
        Serial.print("Connected to Wi-Fi: ");
        Serial.println(WiFi.SSID());
    }

    // Phase 2: read NVS, prime the server-state polling.
    phase2Setup();

    loadMockMetrics();
    randomSeed(esp_random());
    refreshMetrics();

    if (phase2ShouldShowPairingPage()) {
        phase2DrawPairingPage();
        Serial.println("Imnoshi device in PAIRING mode -- awaiting code redemption");
    } else {
        drawCurrentPage();
        Serial.println("Imnoshi device in PAIRED mode -- rotating pages active");
    }
    lastPageChange = millis();
    lastMetricRefresh = millis();

    Serial.println("Imnoshi device started");
}

void loop() {
    unsigned long now = millis();

    // Phase-2 server-state + runtime-state poll. No-op if the device
    // is unpaired or offline; both calls are internally throttled.
    phase2Poll(now / 1000UL, currentPage, ESP.getFreeHeap(), WiFi.RSSI());

    if (phase2ShouldShowPairingPage()) {
        // While unpaired we hold the pairing page (no page rotation).
        if (now - lastPageChange >= PAGE_INTERVAL_MS) {
            phase2DrawPairingPage();
            lastPageChange = now;
        }
        return;
    }

    if (now - lastMetricRefresh >= METRIC_REFRESH_MS) {
        refreshMetrics();
        lastMetricRefresh = now;
    }

    if (now - lastPageChange >= PAGE_INTERVAL_MS) {
        currentPage = (currentPage + 1) % PAGE_COUNT;
        drawCurrentPage();
        lastPageChange = now;
    }
}