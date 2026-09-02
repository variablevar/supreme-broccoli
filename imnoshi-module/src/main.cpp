#include <Arduino.h>
#include <TFT_eSPI.h>

TFT_eSPI tft = TFT_eSPI();

// Mock data
struct {
    const char* uid = "GT-78432";
    float balance = 12450.75;
    float today = 23.40;
    int e1 = 65, e2 = 40, e3 = 90;
    bool vip = true;
} data;

void drawHeader() {
    tft.fillRect(0, 0, 320, 35, tft.color565(20, 20, 30));
    tft.setTextColor(TFT_CYAN);
    tft.setTextSize(2);
    tft.setCursor(10, 10);
    tft.print("GT QUANT");
    
    tft.setTextColor(TFT_WHITE);
    tft.setCursor(140, 10);
    tft.print(data.uid);
    
    if(data.vip) {
        tft.fillRoundRect(260, 5, 50, 24, 4, tft.color565(255, 0, 160));
        tft.setTextColor(TFT_WHITE);
        tft.setCursor(265, 12);
        tft.print("VIP");
    }
}

void drawBalance() {
    // Balance box
    tft.fillRoundRect(10, 45, 190, 60, 8, tft.color565(30, 30, 40));
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(1);
    tft.setCursor(20, 55);
    tft.print("BALANCE");
    
    tft.setTextColor(TFT_CYAN);
    tft.setTextSize(2);
    tft.setCursor(20, 75);
    tft.print("$");
    tft.print(data.balance, 2);
    
    // Today box
    tft.fillRoundRect(210, 45, 100, 60, 8, tft.color565(30, 30, 40));
    tft.setTextColor(TFT_WHITE);
    tft.setTextSize(1);
    tft.setCursor(220, 55);
    tft.print("TODAY");
    
    tft.setTextColor(tft.color565(0, 240, 100));
    tft.setTextSize(2);
    tft.setCursor(220, 75);
    tft.print("+");
    tft.print(data.today, 2);
}

void drawBar(int x, int y, int w, int h, int pct, uint16_t color) {
    tft.drawRoundRect(x, y, w, h, 4, color);
    int fill = (w - 4) * pct / 100;
    tft.fillRect(x + 2, y + 2, fill, h - 4, color);
}

void drawEngines() {
    int y = 120;
    int boxW = 96;
    
    // Engine 1 - Mining (Cyan)
    tft.fillRoundRect(10, y, boxW, 80, 6, tft.color565(20, 20, 30));
    tft.setTextColor(TFT_WHITE); tft.setCursor(18, y+8); tft.print("ENG1");
    tft.setTextColor(TFT_CYAN); tft.setCursor(60, y+8); tft.print("MINING");
    drawBar(18, y+28, boxW-16, 12, data.e1, TFT_CYAN);
    tft.setTextColor(TFT_CYAN); tft.setCursor(18, y+52); tft.print(data.e1); tft.print("%");
    
    // Engine 2 - Trading (Violet)
    tft.fillRoundRect(112, y, boxW, 80, 6, tft.color565(20, 20, 30));
    tft.setTextColor(TFT_WHITE); tft.setCursor(120, y+8); tft.print("ENG2");
    tft.setTextColor(tft.color565(180, 100, 255)); tft.setCursor(162, y+8); tft.print("TRADE");
    drawBar(120, y+28, boxW-16, 12, data.e2, tft.color565(180, 100, 255));
    tft.setTextColor(tft.color565(180, 100, 255)); tft.setCursor(120, y+52); tft.print(data.e2); tft.print("%");
    
    // Engine 3 - Active (Magenta)
    tft.fillRoundRect(214, y, boxW, 80, 6, tft.color565(20, 20, 30));
    tft.setTextColor(TFT_WHITE); tft.setCursor(222, y+8); tft.print("ENG3");
    tft.setTextColor(tft.color565(255, 0, 160)); tft.setCursor(264, y+8); tft.print("ACTIVE");
    drawBar(222, y+28, boxW-16, 12, data.e3, tft.color565(255, 0, 160));
    tft.setTextColor(tft.color565(255, 0, 160)); tft.setCursor(222, y+52); tft.print(data.e3); tft.print("%");
}

void drawFooter() {
    int y = 210;
    tft.fillRect(0, y, 320, 30, tft.color565(10, 10, 15));
    tft.setTextColor(tft.color565(150, 150, 150));
    tft.setTextSize(1);
    tft.setCursor(10, y+10);
    tft.print("STAKED: $5,000");
    tft.setCursor(160, y+10);
    tft.print("POLL: 14:32 UTC");
    
    tft.fillRoundRect(260, y+2, 55, 22, 4, tft.color565(0, 200, 100));
    tft.setTextColor(TFT_BLACK);
    tft.setCursor(265, y+10);
    tft.print("READY");
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    tft.init();
    tft.setRotation(1);  // Landscape 320x240
    tft.fillScreen(tft.color565(5, 5, 5));  // Void black
    
    drawHeader();
    drawBalance();
    drawEngines();
    drawFooter();
    
    Serial.println("GT Quant Device - Mock Data Mode");
    Serial.print("UID: "); Serial.println(data.uid);
}

void loop() {
    // Simulate live updates every 5 seconds
    data.balance += random(-100, 200) / 100.0;
    data.today += random(0, 50) / 100.0;
    data.e1 = random(60, 75);
    data.e2 = random(35, 50);
    data.e3 = random(85, 95);
    
    // Redraw only dynamic areas
    drawBalance();
    drawEngines();
    
    delay(5000);
}