#include "state.h"
#include <TFT_eSPI.h>
#include <WiFi.h>
static TFT_eSPI screen;
static void line(const String& text,int y,uint16_t color=TFT_WHITE,int font=2) {
  screen.setTextColor(color,TFT_BLACK);screen.drawString(text,12,y,font);
}
static void wrapped(const String& text,int startY,int maxLines) {
  const int chars=screen.width()>200?38:19;
  int y=startY;
  for(int i=0;i<(int)text.length() && maxLines>0;i+=chars,--maxLines,y+=18)line(text.substring(i,i+chars),y,TFT_LIGHTGREY);
}
void initializeDisplay(){screen.init();screen.setRotation(0);screen.fillScreen(TFT_BLACK);}
void drawDisplay(){
  screen.fillScreen(TFT_BLACK);
  line("Imo.",10,TFT_CYAN,4);
  const bool fresh=state.connected && (uint32_t)(millis()-state.lastSync)<90000 && WiFi.status()==WL_CONNECTED;
  line(state.revoked?"REVOKED":fresh?"CONNECTED":"OFFLINE / STALE",42,fresh?TFT_GREEN:TFT_ORANGE);
  screen.drawFastHLine(12,65,screen.width()-24,TFT_DARKGREY);
  if(state.revoked){wrapped("Credential revoked. Contact your operator.",85,6);return;}
  if(!state.paired){
    line("PAIR YOUR DEVICE",82);
    line(state.pairingCode.length()?state.pairingCode:"------",118,TFT_CYAN,4);
    wrapped("Enter this code in your Imo dashboard.",166,4);
    wrapped("No code? Configure the server over USB.",245,3);
    return;
  }
  if(!state.version){wrapped("Waiting for operator publication.",90,6);return;}
  wrapped(state.title,78,2);
  wrapped(state.message,118,4);
  line(state.activity,200,TFT_CYAN);line(state.rate,222);
  line("Daily: "+state.dailyUsdt,248);line("Total: "+state.totalUsdt,270);
  line("Published v"+String(state.version),296,TFT_DARKGREY);
}
