// state.h -- Phase-2: server-driven DeviceMetrics parsing + NVS glue.
//
// IMPORTANT: this struct is a flat mirror of the metrics struct that
// main.cpp already defines. We keep it 1:1 here so main.cpp can pass
// pointers into the same layout after JSON parsing. If you change the
// field order in main.cpp's DeviceMetrics, mirror that here too.
#pragma once

#include <Arduino.h>
#include <Preferences.h>

// Forward-declare the TFT_eSPI class so state.h's `extern TFT_eSPI tft;`
// compiles without forcing every includer to drag in the 500KB TFT_eSPI
// header. The actual definition comes from <TFT_eSPI.h> which main.cpp
// and phase2.cpp both include before they touch `tft` directly.
class TFT_eSPI;

// Phase-2 fields. main.cpp's existing struct has only the Phase-1
// members. We overlay these via a separate struct so we don't have
// to touch main.cpp's existing renderers.
struct ServerOverrides {
    char    currency[8];           // "BTC" / "ETH" / ... empty = unconfigured
    char    miningDisplay[16];     // "hashrate" / "apr" / "both"
    long    refreshMs;             // 0 = use default (15000)
    bool    currencyShuffle;
    char    pairedPageText[160];
    bool    serverTouched;         // true after a successful GET /api/devices/state
    unsigned long serverLastTouch; // millis() at last successful fetch
    char    uid[32];
    char    userName[80];
    char    walletProtocol[32];
    char    walletAddress[80];
    char    miningCurrency[8];
    bool    miningIsStaking;
    float   downloadMbps;
    float   uploadMbps;
    float   watts;
    float   energyTodayWh;
    float   miningRate;
    float   miningDailyUsdt;
    float   connectedWalletUsdt;
    float   dailyRevenueUsdt;
    bool    online;
    unsigned long uptimeSeconds;
};

// Defined in main.cpp.
extern Preferences   nvs;
extern TFT_eSPI      tft;

// NVS keys.
static const char* NVS_NS = "imnoshi";
static const char* K_WIFI_SSID = "w_ssid";
static const char* K_WIFI_PASS = "w_pass";
static const char* K_TOKEN     = "token";
static const char* K_PAIRED    = "paired";

// ---- Phase 2 helpers ----
bool   applyStateFromJson(const String& json);
bool   hasFreshServerState();
void   markServerStateStale();
String loadPairedPageText();
long   loadRefreshMs();
const  ServerOverrides& serverOverrides();
