#include "state.h"
#include <TFT_eSPI.h>
#include <WiFi.h>
static TFT_eSPI screen;
static constexpr uint8_t PAGE_COUNT=4;
static void text(const String& value,int x,int y,uint16_t color=TFT_WHITE,int font=2){screen.setTextColor(color,TFT_BLACK);screen.drawString(value,x,y,font);}
static String uptime(){uint32_t seconds=millis()/1000;return String(seconds/86400)+"d "+String((seconds%86400)/3600)+"h "+String((seconds%3600)/60)+"m";}
static String shortId(){if(state.deviceId.length()<13)return state.deviceId;return state.deviceId.substring(0,8)+"..."+state.deviceId.substring(state.deviceId.length()-4);}
static bool fresh(){return state.connected&&(uint32_t)(millis()-state.lastSync)<40000&&WiFi.status()==WL_CONNECTED;}
static void header(const String& title,uint8_t page){text("IMO",8,5,TFT_CYAN);text(title,66,5);text(state.revoked?"REVOKED":fresh()?"ONLINE":"OFFLINE",220,5,fresh()?TFT_GREEN:TFT_ORANGE);text(String(page+1)+"/"+String(PAGE_COUNT),292,5,TFT_DARKGREY,1);screen.drawFastHLine(8,27,304,TFT_DARKGREY);}
static void row(int y,const String& label,const String& value,uint16_t color=TFT_WHITE){text(label,14,y,TFT_LIGHTGREY);text(value,142,y,color);}
static void centered(const String& value,int y,uint16_t color=TFT_WHITE,int font=2){screen.setTextColor(color,TFT_BLACK);screen.drawCentreString(value,160,y,font);}
static void overview(uint8_t page){header("OVERVIEW",page);row(38,"NODE",shortId(),TFT_CYAN);row(59,"TITLE",state.title);row(80,"TOTAL",state.totalUsdt+" USDT",TFT_CYAN);row(101,"DAILY",state.dailyUsdt+" USDT",TFT_GREEN);row(122,"ACTIVITY",state.activity);row(143,"UPTIME",uptime());}
static void network(uint8_t page){header("NETWORK",page);row(43,"WI-FI",WiFi.status()==WL_CONNECTED?"CONNECTED":"DISCONNECTED",WiFi.status()==WL_CONNECTED?TFT_GREEN:TFT_ORANGE);row(70,"SIGNAL",String(WiFi.RSSI())+" dBm",TFT_CYAN);row(97,"SERVER",fresh()?"SYNCED":"STALE",fresh()?TFT_GREEN:TFT_ORANGE);row(124,"UPTIME",uptime());}
static void activity(uint8_t page){header("ACTIVITY",page);centered("CURRENT ACTIVITY",40,TFT_LIGHTGREY);centered(state.activity,62,TFT_CYAN,4);centered(state.rate,105);centered("+"+state.dailyUsdt+" USDT / DAY",135,TFT_GREEN);}
static void revenue(uint8_t page){header("REVENUE",page);centered("PUBLISHED TOTAL",40,TFT_LIGHTGREY);centered(state.totalUsdt+" USDT",63,TFT_CYAN,4);centered(state.message,108,TFT_LIGHTGREY);centered("+"+state.dailyUsdt+" USDT TODAY",136,TFT_GREEN);}
void initializeDisplay(){screen.init();screen.setRotation(1);screen.fillScreen(TFT_BLACK);}
void drawDisplay(){
  screen.fillScreen(TFT_BLACK);
  if(state.revoked){header("DEVICE",0);centered("CREDENTIAL REVOKED",70,TFT_RED);centered("CONTACT YOUR OPERATOR",105,TFT_LIGHTGREY);return;}
  if(!state.paired){header("PAIRING",0);centered("PAIR YOUR DEVICE",43);centered(state.pairingCode.length()?state.pairingCode:"------",75,TFT_CYAN,4);centered("ENTER CODE IN YOUR IMO DASHBOARD",130,TFT_LIGHTGREY,1);return;}
  if(!state.version){header("WAITING",0);centered("WAITING FOR OPERATOR",68);centered("PUBLICATION",96,TFT_CYAN);return;}
  uint8_t page=(millis()/5000)%PAGE_COUNT;
  switch(page){case 0:overview(page);break;case 1:network(page);break;case 2:activity(page);break;default:revenue(page);}
}
