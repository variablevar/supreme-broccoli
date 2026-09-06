// phase2.h -- declarations exposed to main.cpp.
#pragma once

#include <Arduino.h>

// Called once from setup() after WiFiManager.autoConnect() returns.
void phase2Setup();

// Called from loop() -- drives the server-state poll and the
// runtime-state POST, both throttled internally.
void phase2Poll(unsigned long uptimeSec, int currentPageIdx, int freeHeapBytes, int wifiRssi);

// True when the firmware has no claim token yet. main.cpp's loop
// uses this to decide whether to render the pairing page or the
// existing 4 rotating pages.
bool phase2ShouldShowPairingPage();

// Draw the pairing-code page. Call only when
// phase2ShouldShowPairingPage() returns true. Uses the same TFT,
// Slabo16 font, and header/watermark helpers as the rest of the
// firmware.
void phase2DrawPairingPage();

// Optional factory-tester entry point. Writes a 6-char pairing code
// to NVS so it survives reboots.
void phase2SetCachedCode(const char* code);

// Read the most recently cached code (6 chars or empty).
String phase2CachedCode();
