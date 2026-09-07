#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <time.h>
#include "state.h"

static Preferences storage;
static WiFiManager wifi;
static String baseUrl,token,caPem,serialLine;
static bool serialOverflow=false;
static uint32_t nextSync=0,nextPairing=0,nextDraw=0,backoff=15000;

static bool credentialValid(const String& value){
  if(value.length()!=43)return false;
  for(unsigned i=0;i<value.length();++i){char c=value[i];if(!isalnum(c)&&c!='_'&&c!='-')return false;}
  return true;
}
static int post(const char* path,const String& payload,String& response){
  if(WiFi.status()!=WL_CONNECTED || token.isEmpty() || caPem.isEmpty() || time(nullptr)<1700000000)return -1;
  WiFiClientSecure client;client.setCACert(caPem.c_str());client.setHandshakeTimeout(5);
  HTTPClient http;http.setConnectTimeout(5000);http.setTimeout(5000);
  if(!http.begin(client,baseUrl+path))return -1;
  http.addHeader("Authorization","Bearer "+token);http.addHeader("Content-Type","application/json");
  int status=http.POST(payload);
  if(status==200 && (http.getSize()<0 || http.getSize()<=4096))response=http.getString();
  http.end();
  if(status==401 || status==403){state.revoked=true;state.connected=false;state.pairingCode="";storage.remove("cached");}
  return status;
}
static void provision(const String& json){
  JsonDocument doc;if(deserializeJson(doc,json)){Serial.println("Invalid provisioning JSON");return;}
  if(doc["reset"].as<bool>()){storage.clear();wifi.resetSettings();ESP.restart();return;}
  String url=doc["baseUrl"]|"",secret=doc["token"]|"",ca=doc["caPem"]|"";
  if(!url.startsWith("https://") || url.length()>200 || !credentialValid(secret) || ca.length()>3000 || ca.indexOf("-----BEGIN CERTIFICATE-----")<0){Serial.println("Require HTTPS baseUrl, 43-character token and PEM root certificate");return;}
  while(url.endsWith("/"))url.remove(url.length()-1);
  storage.putString("url",url);storage.putString("token",secret);storage.putString("ca",ca);storage.remove("cached");
  Serial.println("Provisioned. Restarting; credential will not be printed.");delay(100);ESP.restart();
}
static void serialProvisioning(){
  while(Serial.available()){
    char c=Serial.read();
    if(c=='\n'){
      if(!serialOverflow && serialLine.length())provision(serialLine);
      else if(serialOverflow)Serial.println("Provisioning message exceeds 4096 bytes");
      serialLine="";serialOverflow=false;
    }else if(c!='\r'){
      if(serialLine.length()<4096 && !serialOverflow)serialLine+=c;
      else{serialOverflow=true;serialLine="";}
    }
  }
}
void setup(){
  Serial.begin(115200);storage.begin("imo",false);
  baseUrl=storage.getString("url","");token=storage.getString("token","");caPem=storage.getString("ca","");
  String cached=storage.getString("cached","");if(cached.length())applySync(cached);state.connected=false;
  initializeDisplay();drawDisplay();
  WiFi.setAutoReconnect(true);
  wifi.setConfigPortalBlocking(false);wifi.setConfigPortalTimeout(180);
  String ap="Imo-Setup-"+String((uint32_t)ESP.getEfuseMac(),HEX);
  wifi.autoConnect(ap.c_str());
  configTime(0,0,"pool.ntp.org","time.cloudflare.com");
  Serial.println("Imo ready. Send provisioning JSON over USB; Wi-Fi setup uses the Imo-Setup access point.");
}
void loop(){
  serialProvisioning();wifi.process();
  const uint32_t now=millis();
  if(!state.revoked && token.length() && WiFi.status()==WL_CONNECTED && (int32_t)(now-nextSync)>=0){
    JsonDocument body;body["protocolVersion"]=1;body["firmware"]="imo-s3-1.0.0";body["uptimeSeconds"]=now/1000;body["wifiRssi"]=WiFi.RSSI();body["appliedVersion"]=state.version;
    String payload,response;serializeJson(body,payload);uint32_t previous=state.version;
    int code=post("/api/v1/device/sync",payload,response);
    if(code==200 && applySync(response)){
      backoff=15000;
      if(state.version!=previous || !state.paired)storage.putString("cached",response);
      if(state.paired)state.pairingCode="";
    }else{state.connected=false;backoff=min(backoff*2,(uint32_t)120000);}
    nextSync=millis()+backoff;
    if(!state.paired && !state.revoked && (int32_t)(now-nextPairing)>=0){
      String pairResponse;
      if(post("/api/v1/device/pairing-code","{}",pairResponse)==200){JsonDocument pair;if(!deserializeJson(pair,pairResponse)){String c=pair["code"]|"";if(c.length()==6)state.pairingCode=c;}}
      nextPairing=millis()+60000;
    }
    drawDisplay();
  }
  if((int32_t)(now-nextDraw)>=0){drawDisplay();nextDraw=now+5000;}
  delay(10);
}
