#include "state.h"
#include <ArduinoJson.h>
DisplayState state;
static bool bounded(JsonVariantConst v,size_t n){if(!v.is<const char*>())return false;const char*s=v.as<const char*>();if(strlen(s)>n)return false;for(size_t i=0;s[i];++i)if(s[i]<32||s[i]>126)return false;return true;}
static bool metric(JsonVariantConst v){if(!bounded(v,16))return false;const char*s=v.as<const char*>();if(!*s)return false;char*end=nullptr;strtod(s,&end);return end&&*end=='\0';}
bool applySync(const String& json){
  if(json.length()>6144)return false;JsonDocument doc;if(deserializeJson(doc,json))return false;
  if(doc["protocolVersion"].as<int>()!=1||!doc["paired"].is<bool>())return false;
  const bool paired=doc["paired"].as<bool>();if(doc["deviceId"].is<const char*>())state.deviceId=doc["deviceId"].as<String>();
  JsonVariantConst publication=doc["publication"];
  if(!publication.isNull()){
    if(!publication["version"].is<uint32_t>()||publication["version"].as<uint32_t>()==0)return false;JsonVariantConst c=publication["content"];
    if(!bounded(c["title"],32)||!bounded(c["message"],120)||!bounded(c["currency"],8)||!c["isStaking"].is<bool>()||!metric(c["rate"])||!metric(c["dailyUsdt"])||!metric(c["downloadMbps"])||!metric(c["uploadMbps"])||!metric(c["watts"])||!metric(c["energyTodayWh"]))return false;
    state.title=c["title"].as<String>();state.message=c["message"].as<String>();state.currency=c["currency"].as<String>();state.isStaking=c["isStaking"].as<bool>();state.rate=c["rate"].as<String>();state.dailyUsdt=c["dailyUsdt"].as<String>();state.downloadMbps=c["downloadMbps"].as<String>();state.uploadMbps=c["uploadMbps"].as<String>();state.watts=c["watts"].as<String>();state.energyTodayWh=c["energyTodayWh"].as<String>();state.version=publication["version"].as<uint32_t>();
  }
  JsonVariantConst account=doc["account"];
  if(paired&&!account.isNull()){
    if(!bounded(account["userName"],40)||!bounded(account["walletProtocol"],16)||!bounded(account["walletAddress"],80)||!metric(account["connectedWalletUsdt"])||!metric(account["dailyRevenueUsdt"]))return false;
    state.userName=account["userName"].as<String>();state.walletProtocol=account["walletProtocol"].as<String>();state.walletAddress=account["walletAddress"].as<String>();state.connectedWalletUsdt=account["connectedWalletUsdt"].as<String>();state.dailyRevenueUsdt=account["dailyRevenueUsdt"].as<String>();
  }
  state.paired=paired;state.connected=true;state.revoked=false;state.lastSync=millis();
  if(!paired){state=DisplayState();state.connected=true;state.lastSync=millis();}
  return true;
}
