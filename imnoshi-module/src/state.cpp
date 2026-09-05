// state.cpp -- Phase-2 server-driven metrics.
//
// Strategy: the existing DeviceMetrics struct in main.cpp already
// renders every page. We don't touch its layout. Instead we keep a
// parallel ServerOverrides struct and replace the renderers' data
// sources where they need to be controllable. The renderers remain
// usable in pure mock mode (NVS has no server overrides yet) so
// nothing on the device is forced to be online.

#include "state.h"
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Forward-declared from main.cpp.
extern TFT_eSPI   tft;

ServerOverrides gOverrides;

namespace {

String findString(const String& s, const char* key) {
    String needle = String("\"") + key + "\":";
    int idx = s.indexOf(needle);
    if (idx < 0) return "";
    idx += needle.length();
    while (idx < s.length() && isspace(s.charAt(idx))) idx++;
    if (idx < s.length() && s.charAt(idx) == '\"') {
        int end = s.indexOf('\"', idx + 1);
        if (end < 0) return "";
        return s.substring(idx + 1, end);
    }
    int end = idx;
    while (end < s.length() && s.charAt(end) != ',' && s.charAt(end) != '}' && s.charAt(end) != '\n') end++;
    return s.substring(idx, end);
}

float findNumber(const String& s, const char* key, float dflt = 0.0f) {
    String needle = String("\"") + key + "\":";
    int idx = s.indexOf(needle);
    if (idx < 0) return dflt;
    idx += needle.length();
    while (idx < s.length() && isspace(s.charAt(idx))) idx++;
    String num = "";
    while (idx < s.length()) {
        char c = s.charAt(idx);
        if ((c >= '0' && c <= '9') || c == '.' || c == '-' || c == '+' || c == 'e' || c == 'E') {
            num += c;
            idx++;
        } else break;
    }
    if (num.length() == 0) return dflt;
    return num.toFloat();
}

bool findBool(const String& s, const char* key, bool dflt = false) {
    String needle = String("\"") + key + "\":";
    int idx = s.indexOf(needle);
    if (idx < 0) return dflt;
    idx += needle.length();
    while (idx < s.length() && isspace(s.charAt(idx))) idx++;
    if (s.substring(idx, idx + 4) == "true") return true;
    if (s.substring(idx, idx + 5) == "false") return false;
    return dflt;
}

String findNested(const String& s, const char* parent, const char* key) {
    int p = s.indexOf(String("\"") + parent + "\"");
    if (p < 0) return "";
    int brace = s.indexOf('{', p);
    int end = s.indexOf('}', brace);
    if (brace < 0 || end < 0) return "";
    return findString(s.substring(brace, end + 1), key);
}

float findNestedNumber(const String& s, const char* parent, const char* key, float dflt = 0.0f) {
    int p = s.indexOf(String("\"") + parent + "\"");
    if (p < 0) return dflt;
    int brace = s.indexOf('{', p);
    int end = s.indexOf('}', brace);
    if (brace < 0 || end < 0) return dflt;
    return findNumber(s.substring(brace, end + 1), key, dflt);
}

bool findNestedBool(const String& s, const char* parent, const char* key, bool dflt = false) {
    int p = s.indexOf(String("\"") + parent + "\"");
    if (p < 0) return dflt;
    int brace = s.indexOf('{', p);
    int end = s.indexOf('}', brace);
    if (brace < 0 || end < 0) return dflt;
    return findBool(s.substring(brace, end + 1), key, dflt);
}

void copyStr(char* dst, size_t cap, const String& src) {
    size_t n = min((size_t)src.length(), cap - 1);
    for (size_t i = 0; i < n; ++i) dst[i] = src.charAt(i);
    dst[n] = '\0';
}

}  // namespace

bool applyStateFromJson(const String& json) {
    String uid              = findString(json, "uid");
    String userName         = findString(json, "userName");
    float  downloadMbps     = findNestedNumber(json, "network", "downloadMbps");
    float  uploadMbps       = findNestedNumber(json, "network", "uploadMbps");
    float  watts            = findNestedNumber(json, "power",   "watts");
    float  energyTodayWh    = findNestedNumber(json, "power",   "energyTodayWh");
    String miningCurrency   = findNested(json, "mining", "currency");
    bool   miningIsStaking  = findNestedBool(json, "mining", "isStaking", false);
    float  miningRate       = findNestedNumber(json, "mining", "rate");
    float  miningDailyUsdt  = findNestedNumber(json, "mining", "dailyUsdt");
    String walletProtocol   = findNested(json, "wallet", "protocol");
    String walletAddress    = findNested(json, "wallet", "address");
    float  connectedUsdt    = findNestedNumber(json, "wallet", "balanceUsdt");
    float  dailyRevenueUsdt = findNumber(json, "dailyRevenueUsdt");
    bool   online           = findBool(json, "online", false);
    long   uptimeSeconds    = (long)findNumber(json, "uptimeSeconds");
    long   overrideRefresh  = (long)findNestedNumber(json, "overrides", "refreshMs", 0);
    String overrideCur      = findNested(json, "overrides", "currency");
    String overrideDisplay  = findNested(json, "overrides", "miningDisplay");
    bool   overrideShuffle  = findNestedBool(json, "overrides", "currencyShuffle", true);
    String overridePaired   = findNested(json, "overrides", "pairedPageText");

    copyStr(gOverrides.uid,               sizeof(gOverrides.uid),               uid);
    copyStr(gOverrides.userName,          sizeof(gOverrides.userName),          userName);
    copyStr(gOverrides.walletProtocol,    sizeof(gOverrides.walletProtocol),    walletProtocol);
    copyStr(gOverrides.walletAddress,     sizeof(gOverrides.walletAddress),     walletAddress);
    copyStr(gOverrides.miningCurrency,    sizeof(gOverrides.miningCurrency),    miningCurrency);
    gOverrides.downloadMbps        = downloadMbps;
    gOverrides.uploadMbps          = uploadMbps;
    gOverrides.watts               = watts;
    gOverrides.energyTodayWh       = energyTodayWh;
    gOverrides.miningIsStaking     = miningIsStaking;
    gOverrides.miningRate          = miningRate;
    gOverrides.miningDailyUsdt     = miningDailyUsdt;
    gOverrides.connectedWalletUsdt = connectedUsdt;
    gOverrides.dailyRevenueUsdt    = dailyRevenueUsdt;
    gOverrides.online              = online;
    gOverrides.uptimeSeconds       = (unsigned long)uptimeSeconds;
    copyStr(gOverrides.currency,         sizeof(gOverrides.currency),         overrideCur);
    copyStr(gOverrides.miningDisplay,    sizeof(gOverrides.miningDisplay),    overrideDisplay);
    copyStr(gOverrides.pairedPageText,   sizeof(gOverrides.pairedPageText),
            overridePaired.length() ? overridePaired : String("Enter this code at /devices/pair"));
    gOverrides.refreshMs       = overrideRefresh;
    gOverrides.currencyShuffle = overrideShuffle;
    gOverrides.serverTouched   = true;
    gOverrides.serverLastTouch = millis();
    return true;
}

bool hasFreshServerState() {
    if (!gOverrides.serverTouched) return false;
    long maxAge = (gOverrides.refreshMs > 0 ? gOverrides.refreshMs : 15000L) * 3L;
    return (long)(millis() - gOverrides.serverLastTouch) < maxAge;
}

void markServerStateStale() {
    gOverrides.serverTouched   = false;
    gOverrides.serverLastTouch = 0;
    gOverrides.refreshMs       = 0;
}

String loadPairedPageText() {
    if (gOverrides.pairedPageText[0]) return String(gOverrides.pairedPageText);
    return String("Enter this code at /devices/pair");
}

long loadRefreshMs() {
    return gOverrides.refreshMs > 0 ? gOverrides.refreshMs : 15000L;
}

const ServerOverrides& serverOverrides() { return gOverrides; }
