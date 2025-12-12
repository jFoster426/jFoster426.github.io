void handleServer(WiFiServer *server,
                  WiFiClient *client,
                  int *clientStatus,
                  unsigned long int *clientTimeout,
                  bool *ignoreServerRequest,
                  const char *webpage,
                  const char *serverName)
{
  if (*clientStatus == CLI_NOT_CONNECTED)
    *client = server->available();
  // Wait for a client (web browser) to connect.
  if (*client && client->connected())
  {
    if (*clientStatus == CLI_NOT_CONNECTED)
    {
      *clientStatus = CLI_CONNECTED;
#ifdef USE_SERIAL_DEBUG
      Serial.printf("\n[Client connected (%s)]\n", serverName);
#endif
      *clientTimeout = millis();
      client->setTimeout(HTTP_TIMEOUT);
    }
    // Read line by line what the client (web browser) is requesting.
    if (client->available())
    {
      String line;
      line.reserve(255);
      line = client->readStringUntil('\n');
      // We need to ignore all requests that do not ask for the webpage specifically.
      if ((line.indexOf("GET") > -1 || line.indexOf("POST") > -1) &&
          (line.indexOf("GET /generate_204 HTTP/1.") == -1 &&           // ONEPLUS 6T (Android)
           line.indexOf("GET / HTTP/1.") == -1) &&                      // Request main page (all devices)
           line.indexOf("GET /connecttest.txt HTTP/1.") == -1 &&        // Microsoft Windows 10 PC
           line.indexOf("GET /redirect HTTP/1.") == -1 &&               // Microsoft Windows 10 PC
           line.indexOf("GET /hotspot-detect.html HTTP/1.") == -1)      // Apple iPhone XR (iOS)
           
      {
        *ignoreServerRequest = true;
      }
      *clientTimeout = millis();
#ifdef USE_SERIAL_DEBUG
      Serial.printf("[Client message (%s)] %s\n", serverName, line.c_str());
#endif
      // Wait for end of client's request, that is marked with an empty line.
      if (line.length() == 1 && line[0] == '\r')
      {
        if (!(*ignoreServerRequest))
        {
#ifdef USE_SERIAL_DEBUG
          Serial.printf("[Sending webpage to client (%s, size = %d)]\n", serverName, strlen_P(webpage));
#endif
          // Send HTTP header.
          client->print("HTTP/1.1 200 OK\r\n");
          client->print("Content-Type: text/html; charset=UTF-8\r\n");
          client->print("Content-Length: " + String(strlen_P(webpage)) + "\r\n");
          client->print("Connection: close\r\n\r\n");
          // Send webpage contents.
          client->write_P(webpage, strlen_P(webpage));
          // Signal to disconnect the client.
          *clientStatus = CLI_DISCONNECT;
#ifdef USE_SERIAL_DEBUG
          Serial.printf("[Webpage sent to client (%s)]\n", serverName);
#endif
        }
        else
        {
          // Send HTTP header.
          client->print("HTTP/1.1 404 Not Found\r\n");
          client->print("Content-Type: text/plain; charset=UTF-8\r\n");
          client->print("Content-Length: 0\r\n");
          client->print("Connection: close\r\n\r\n");
          // Signal to disconnect the client.
          *clientStatus = CLI_DISCONNECT;
#ifdef USE_SERIAL_DEBUG
          Serial.printf("[Server request ignored (%s)]\n", serverName);
#endif
        }
        *ignoreServerRequest = false;
      }
    }
  }
  else if (*clientStatus == CLI_CONNECTED) *clientStatus = CLI_DISCONNECT;
  // Disconnect if a timeout has occured.
  if (*clientStatus == CLI_CONNECTED && millis() - *clientTimeout > HTTP_TIMEOUT)
  {
#ifdef USE_SERIAL_DEBUG
    Serial.printf("[Connection timed out (%s)]\n", serverName);
#endif
    *clientStatus = CLI_DISCONNECT;
  }
  if (*clientStatus == CLI_DISCONNECT)
  {
    *clientStatus = CLI_NOT_CONNECTED;
    // First, let client finish its request.
    while (client->available())
      client->read();
    // Close the connection.
    client->stop();
#ifdef USE_SERIAL_DEBUG
    Serial.printf("[Client disconnected (%s)]\n\n", serverName);
#endif
  }
}

void updateWebpageParams(const char *devIPString)
{
  char buf[512] = "";
  sprintf(buf, "#%d#%.2f#%.2f#%.2f#%.2f#%.2f#%.2f#%d#%d#%d#%d#%d#%s#%d#%s#%s",
          lamp.pwr,
          lamp.colorWheelAngle,
          lamp.r, lamp.g, lamp.b,
          lamp.sat, lamp.brt,
          lamp.tOnH, lamp.tOnM, lamp.tOffH, lamp.tOffM,
          lamp.tEn,
          devIPString,
          lamp.tFade,
          ssid,
          password);
  webSocket.broadcastTXT(buf);
}

// Execute this function when a WebSocket message is received.
void handleUpdateESP(uint8_t num, WStype_t typ, uint8_t *payload, size_t len)
{
#ifdef USE_SERIAL_DEBUG
  Serial.printf("Websocket event: %d\n", typ);
#endif
  switch (typ)
  {
    // Handle the websocket disconnecting.
    case WStype_DISCONNECTED:
#ifdef USE_SERIAL_DEBUG
      Serial.printf("[%u] Disconnected!\n", num);
#endif
      break;
    // Handle the websocket connecting.
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
#ifdef USE_SERIAL_DEBUG
        Serial.printf("[%u] Connected from %d.%d.%d.%d url: %s\n", num, ip[0], ip[1], ip[2], ip[3], payload);
#endif
        // Once connected, send the data to the website right away.
        if (devModeConnected)
          updateWebpageParams(devIP.toString().c_str());
        else
          updateWebpageParams("Not configured");
        break;
      }
    // Handle new text data received.
    case WStype_TEXT:
#ifdef USE_SERIAL_DEBUG
      Serial.printf("[%u] get Text: %s\n", num, payload);
#endif
      int i = 0; // Iterator finding the next data segment.
      // The first byte of the payload should be the '$' character.
      if (payload[0] != '$') return;
      if (payload[1] == 'S')
      {
        // Setup state.
        // Decode SSID and password data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        int j = i;
        while (payload[j++] != '#') if (payload[j] == '\0') return;
        // i has the first char of the SSID, j - 1 has the last char.
        memcpy(ssid, &payload[i], (j - 1) - i);
        // Insert null terminating char.
        ssid[(j - 1) - i] = '\0';
        // Get the rest of the string, which has the password data.
        // The string is already null-terminated, so use strcpy instead
        // of memcpy here.
        strcpy(password, (const char *)&payload[j]);
        
#ifdef USE_SERIAL_DEBUG
        // Show the results.
        Serial.print("Updated lamp data: ");
        Serial.print(ssid); Serial.print(", ");
        Serial.print(password); Serial.print(", ");
#endif
        // Broadcast the connecting status to the website.
        updateWebpageParams("Connecting");
        // Connect to WiFi network with new SSID and password.
        connectDevMode();
        // Send the actual IP, then the webpage will redirect the user.
        if (devModeConnected) updateWebpageParams(devIP.toString().c_str());
        else updateWebpageParams("Failed!");
      }
      if (payload[1] == 'C')
      {
        // Color change state.
        // Decode red data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.r = (float)strtof((const char *)&payload[i], NULL);
        // Decode green data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.g = (float)strtof((const char *)&payload[i], NULL);
        // Decode blue data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.b = (float)strtof((const char *)&payload[i], NULL);
        // Decode angle data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.colorWheelAngle = (float)strtof((const char *)&payload[i], NULL);
        // Decode saturation data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.sat = (float)strtof((const char *)&payload[i], NULL);
        // Decode brightness data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.brt = (float)strtof((const char *)&payload[i], NULL);
        // Decode power state data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.pwr = (int)strtol((const char *)&payload[i], NULL, 10);

#ifdef USE_SERIAL_DEBUG
        Serial.print("Updated lamp data: ");
        Serial.print(lamp.r); Serial.print(", ");
        Serial.print(lamp.g); Serial.print(", ");
        Serial.print(lamp.b); Serial.print(", ");
        Serial.print(lamp.colorWheelAngle); Serial.print(", ");
        Serial.print(lamp.sat); Serial.print(", ");
        Serial.print(lamp.brt); Serial.print(", ");
        Serial.println(lamp.pwr);
#endif
        
        // Make sure to tell the lamp state machine to update itself!
        lamp.updateNow = true;
      }
      if (payload[1] == 'T')
      {
        // Timer change state.
        // Decode hour on time data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.tOnH = (int)strtol((const char *)&payload[i], NULL, 10);
        // Decode minute on time data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.tOnM = (int)strtol((const char *)&payload[i], NULL, 10);
        // Decode hour off time data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.tOffH = (int)strtol((const char *)&payload[i], NULL, 10);
        // Decode minute off time data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.tOffM = (int)strtol((const char *)&payload[i], NULL, 10);
        // Decode timer enable data.
        while (payload[i++] != '#') if (payload[i] == '\0') return;
        lamp.tEn = (int)strtol((const char *)&payload[i], NULL, 10);

#ifdef USE_SERIAL_DEBUG
        Serial.print("Updated lamp data: ");
        Serial.print(lamp.tOnH); Serial.print(", ");
        Serial.print(lamp.tOnM); Serial.print(", ");
        Serial.print(lamp.tOffH); Serial.print(", ");
        Serial.print(lamp.tOffM); Serial.print(", ");
        Serial.println(lamp.tEn);
#endif
      }
      if (payload[1] == 'Z')
      {
        // Settings state.
        if (payload[2] != '#') return;
        // Decode fade in/out data.
        lamp.tFade = (int)strtol((const char *)&payload[3], NULL, 10);
        
#ifdef USE_SERIAL_DEBUG
        Serial.print("Updated lamp data: ");
        Serial.println(lamp.tFade);
#endif
      }
      // We got a successful websocket packet since we didn't return above,
      // so signal to the state machine that we would like to queue an EEPROM commit.
#ifdef USE_SERIAL_DEBUG
      Serial.println("Setting lamp.updateEEPROM");
#endif
      lamp.updateEEPROM = true;
      break;
  }
}
