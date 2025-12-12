#define CLI_NOT_CONNECTED  0
#define CLI_CONNECTED      1
#define CLI_DISCONNECT     2

#define HTTP_TIMEOUT       1000

#include <EEPROM.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <WebSocketsServer.h>
#include <WiFiClient.h>
#include <time.h>

#include "mainpage.h"
#include "credpage.h"

#include "SmartLED.h"

// SSID and Password of your WiFi router.
char ssid[128] = "ssid";
char password[128] = "password";

WiFiServer mainServer(80);
WiFiServer credServer(80);

WiFiClient mainClient = WiFiClient();
WiFiClient credClient = WiFiClient();

int mainClientStatus = CLI_NOT_CONNECTED;
int credClientStatus = CLI_NOT_CONNECTED;

unsigned long int mainClientTimeout = 0;
unsigned long int credClientTimeout = 0;

bool ignoreMainServerRequest = false;
bool ignoreCredServerRequest = false;

IPAddress apIP(172, 0, 0, 1);
IPAddress devIP;
DNSServer dnsServer;

// Store if WiFi device mode is currently connected.
// Gets set to true before trying to connect, and if
// the network connection fails, gets reset to false.
bool devModeConnected = false;
// Store if the WiFi AP mode has been set up yet.
// If not, then delayNB will not run handleCredServer,
// dnsServer or websocket.loop().
bool apModeConnected = false;

// WebSocket on port 81.
WebSocketsServer webSocket(81);

// Declare a global object variable holsding the parameters for the lamp.
SmartLED lamp;

void delayNB(unsigned long dly)
{
  unsigned long int tm = millis();
  while (millis() - tm < dly)
  {
    if (apModeConnected)
      handleServer(&credServer, &credClient, &credClientStatus, &credClientTimeout, &ignoreCredServerRequest, CRED_page, "cred server");
    if (devModeConnected)
      handleServer(&mainServer, &mainClient, &mainClientStatus, &mainClientTimeout, &ignoreMainServerRequest, MAIN_page, "main server");
    dnsServer.processNextRequest();
    webSocket.loop();
    lamp.updateLamp();
  }
}

void connectDevMode()
{
  // Check if we were already connected to a network.
  if (devModeConnected)
  {
    mainServer.stop();
    WiFi.disconnect(true);
  }
  // Try to connect to the new WiFi network.
  devModeConnected = true;
#ifdef USE_SERIAL_DEBUG
  Serial.printf("Connecting to Wi-Fi network: %s", ssid);
#endif
 
  WiFi.begin(ssid, password);
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED)
  {
#ifdef USE_SERIAL_DEBUG    
    Serial.print(".");
#endif
    delayNB(500);
    timeout++;
    if (timeout == 20)
    {
      devModeConnected = false;
      break;
    }
  }
  if (devModeConnected)
  {
    devIP = WiFi.localIP();
#ifdef USE_SERIAL_DEBUG
    Serial.println(" Ready.");
    Serial.print("Local IP: ");
    Serial.println(devIP);
#endif
    mainServer = WiFiServer(devIP, 80);
    mainServer.begin();
  }
  else
  {
#ifdef USE_SERIAL_DEBUG
    Serial.println(" Failed.");
#endif
    // Stop trying to connect.
    WiFi.disconnect(true);
  }
}

void setup()
{
  // Initialize the Serial port.
#ifdef USE_SERIAL_DEBUG
  Serial.begin(115200);
  // Wait a little bit to ensure the terminal opened completely.
  delay(1000);
#endif
  // Initialize the SmartLED instance.
  lamp.init();
  // Configure the WiFi access point.
#ifdef USE_SERIAL_DEBUG
  Serial.println("\n\nConfiguring access point");
#endif
  wifi_set_sleep_type(NONE_SLEEP_T);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  WiFi.softAP("Smart LED Setup");
  // Set up the DNS server. This will cause a redirect to the setup page as soon
  // as a user connects to the "Smart LED Setup" network.
  dnsServer.start(53, "*", apIP);
  // Set up main server if dev mode connected. We depend on p5.js to be
  // able to display the webpage contents, so if we're not connected to the
  // internet, we shouldn't allow this server to be set up.
  connectDevMode();
  apIP = WiFi.softAPIP();
#ifdef USE_SERIAL_DEBUG
  Serial.print("AP IP: ");
  Serial.println(apIP);
#endif
  // Set up the websocket (single websocket used for both access point and device mode).
  webSocket.begin();
  webSocket.onEvent(handleUpdateESP);
  // Declare the server instances, and start them.
  apModeConnected = true;
  credServer = WiFiServer(apIP, 80);
  credServer.begin();
}

void loop()
{
  delayNB(1000);
}
