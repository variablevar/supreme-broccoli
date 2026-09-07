#pragma once
#include <Arduino.h>
struct DisplayState {
  bool paired = false;
  bool connected = false;
  bool revoked = false;
  uint32_t version = 0;
  uint32_t lastSync = 0;
  String title, message, activity, rate, dailyUsdt, totalUsdt, pairingCode;
};
extern DisplayState state;
void drawDisplay();
void initializeDisplay();
bool applySync(const String& json);
