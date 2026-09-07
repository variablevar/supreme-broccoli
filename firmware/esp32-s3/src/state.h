#pragma once
#include <Arduino.h>
struct DisplayState {
  bool paired=false,connected=false,revoked=false,isStaking=false;
  uint32_t version=0,lastSync=0;
  String deviceId,userName,title,message,currency,rate,dailyUsdt;
  String downloadMbps,uploadMbps,watts,energyTodayWh;
  String walletProtocol,walletAddress,connectedWalletUsdt,dailyRevenueUsdt,pairingCode;
};
extern DisplayState state;
void drawDisplay();
void initializeDisplay();
bool applySync(const String& json);
