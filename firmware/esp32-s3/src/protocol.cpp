#include "state.h"
#include <ArduinoJson.h>
DisplayState state;
static bool bounded(JsonVariantConst v, size_t n) {
  if (!v.is<const char*>()) return false;
  const char* s=v.as<const char*>();
  if(strlen(s)>n) return false;
  for(size_t i=0;s[i];++i) if(s[i]<32 || s[i]>126) return false;
  return true;
}
bool applySync(const String& json) {
  if(json.length()>4096) return false;
  JsonDocument doc;
  if(deserializeJson(doc,json)) return false;
  if(doc["protocolVersion"].as<int>()!=1 || !doc["paired"].is<bool>()) return false;
  const bool paired=doc["paired"].as<bool>();
  JsonVariantConst publication=doc["publication"];
  if(!publication.isNull()) {
    if(!publication["version"].is<uint32_t>() || publication["version"].as<uint32_t>()==0) return false;
    JsonVariantConst c=publication["content"];
    if(!bounded(c["title"],32) || !bounded(c["message"],120) || !bounded(c["activity"],24) || !bounded(c["rate"],24) || !bounded(c["dailyUsdt"],16) || !bounded(c["totalUsdt"],16)) return false;
    state.title=c["title"].as<String>(); state.message=c["message"].as<String>();
    state.activity=c["activity"].as<String>(); state.rate=c["rate"].as<String>();
    state.dailyUsdt=c["dailyUsdt"].as<String>(); state.totalUsdt=c["totalUsdt"].as<String>();
    state.version=publication["version"].as<uint32_t>();
  }
  state.paired=paired; state.connected=true; state.revoked=false; state.lastSync=millis();
  if(!paired){state.version=0;state.title="";state.message="";state.activity="";state.rate="";state.dailyUsdt="";state.totalUsdt="";}
  return true;
}
