#ifndef SmartLED_h
#define SmartLED_h

#define LED_R_PIN               12
#define LED_G_PIN               13
#define LED_B_PIN               14

#define LAMP_IDLE_STATE         0
#define LAMP_UPDT_STATE         1

#define TIMEZONE               (-8 * 3600)

#define LAMP_EEPROM_UPDT_TIME  (5 * 60 * 1000)

// Comment this out to not use the EEPROM (simulated in flash memory in the ESP8266).
// The user settings will not be saved on power cycle if this line is commented out.
#define USE_EEPROM

// Comment this out to disable Serial output.
//#define USE_SERIAL_DEBUG

#include "Arduino.h"
#include <EEPROM.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <WebSocketsServer.h>
#include <WiFiClient.h>
#include <time.h>

extern bool devModeConnected;
extern IPAddress devIP;
extern char ssid[128];
extern char password[128];
extern void updateWebpageParams(const char *devIPString);

// Instantiate class for SmartLED.
class SmartLED
{
  public:
    // Store the power status.
    bool pwr;
    // Store the RGB data.
    float r;
    float g;
    float b;
    // Store the saturation and brightness data.
    float sat;
    float brt;
    // Store the on time, minutes and hours.
    int tOnH;
    int tOnM;
    // Store the off time, minutes and hours.
    int tOffH;
    int tOffM;
    // Store the rotation angle for the website.
    float colorWheelAngle;
    // Store whether or not the auto on/off is enabled.
    bool tEn;
    // Store the fade time in seconds.
    int tFade;
    // Controlled by the application, updateNow signals whether
    // to change the state machine's state into LAMP_UPDT_STATE,
    // updateEEPROM signals to the application we would like to
    // commit user information to memory.
    bool updateNow;
    bool updateEEPROM;

    SmartLED();
    void init();
    void updateLamp();
    
  private:
    // Stores the current millis() time, used for the fade animation.
    unsigned long int t;
    // Increments or decrements between 0 and 1 which stores the
    // current value the intensity of the lamp is multiplied by (used
    // for the fade animation).
    float f;
    // Store the current state of the lamp.
    int currentState;
    // Store the time since the last time sync update, as well as the
    // time since the last EEPROM update (in milliseconds).
    unsigned long int millisAtLastTimeUpdate;
    unsigned long int millisAtLastEEPROMUpdate;
    // Store the current time using the special time_t variable.
    time_t now;
    
    void loadEEPROM();
    void storeEEPROM();
};

#endif
