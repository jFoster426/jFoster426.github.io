#include "SmartLED.h"

SmartLED::SmartLED()
{
  pwr = false;
  r = 0.16;
  g = 0.35;
  b = 0.99;
  sat = 0.5;
  brt = 0.5;
  tOnH = 0;
  tOnM = 0;
  tOffH = 0;
  tOffM = 0;
  colorWheelAngle = -0.75;
  tEn = false;
  tFade = 0;
  updateNow = false;
  updateEEPROM = false;
  
  t = 0;
  f = 0.0;
  currentState = LAMP_IDLE_STATE;
  millisAtLastTimeUpdate = 0;
  millisAtLastEEPROMUpdate = 0;
  now = 0;
}

void SmartLED::init()
{
#ifdef USE_SERIAL_DEBUG
  Serial.println("\n\nLamp initializing...");
#endif
  // Configure the output pins.
  pinMode(LED_R_PIN, OUTPUT);
  pinMode(LED_G_PIN, OUTPUT);
  pinMode(LED_B_PIN, OUTPUT);
  // Set the initial output state
  analogWrite(LED_R_PIN, 0);
  analogWrite(LED_G_PIN, 0);
  analogWrite(LED_B_PIN, 0);
  // Initialize the EEPROM (512 bytes).
  EEPROM.begin(512);
  // Get the lamp data from EEPROM.
  this->loadEEPROM();
  // Set the initial state.
  currentState = LAMP_IDLE_STATE;
#ifdef USE_SERIAL_DEBUG
  Serial.println("Lamp intialized...");
#endif
}

void SmartLED::loadEEPROM()
{
  char isEEPROMErased = 0;
  EEPROM.get(500, isEEPROMErased);
  if (isEEPROMErased != 0)
  {
    // Remainder of old sketch? Flash page completely erased?
    // In either case, the value != 0. Don't load random useless values from
    // the EEPROM which might break things. Instead, store the default values
    // from the constructor in EEPROM.
    this->storeEEPROM();
#ifdef USE_SERIAL_DEBUG
    Serial.println("EEPROM is blank, contents from constructor written!"); 
#endif
  }
  else
  {
    // Lamp data has already been written with no modifications. Therefore
    // we can proceed loading the contents of the memory.
    EEPROM.get(0, ssid);
    EEPROM.get(200, password);
    EEPROM.get(400, pwr);
    EEPROM.get(401, r);
    EEPROM.get(405, g);
    EEPROM.get(409, b);
    EEPROM.get(413, sat);
    EEPROM.get(417, brt);
    EEPROM.get(421, tOnH);
    EEPROM.get(425, tOnM);
    EEPROM.get(429, tOffH);
    EEPROM.get(433, tOffM);
    EEPROM.get(437, colorWheelAngle);
    EEPROM.get(441, tEn);
    EEPROM.get(442, tFade);

#ifdef USE_SERIAL_DEBUG
    Serial.println("EEPROM contents read and stored in lamp variables."); 
#endif    
    // Signal for the state machine to update the lamp.
    updateNow = true;
  }
}

void SmartLED::storeEEPROM()
{
  EEPROM.put(0, ssid);
  EEPROM.put(200, password);
  EEPROM.put(400, pwr);
  EEPROM.put(401, r);
  EEPROM.put(405, g);
  EEPROM.put(409, b);
  EEPROM.put(413, sat);
  EEPROM.put(417, brt);
  EEPROM.put(421, tOnH);
  EEPROM.put(425, tOnM);
  EEPROM.put(429, tOffH);
  EEPROM.put(433, tOffM);
  EEPROM.put(437, colorWheelAngle);
  EEPROM.put(441, tEn);
  EEPROM.put(442, tFade);
  char EEPROMErased = 0;
  EEPROM.put(500, EEPROMErased);
#ifdef USE_EEPROM
  EEPROM.commit();
#ifdef USE_SERIAL_DEBUG
  Serial.println("EEPROM data committed!"); 
#endif
#endif
}

// Update the lamp's outputs.
void SmartLED::updateLamp()
{
  // Check if updateNow was set.
  if (updateNow)
  {
    // Change the current state of the lamp.
    currentState = LAMP_UPDT_STATE;
    // Store the current time for the fade animation.
    t = millis();
    // Don't execute this statement again until
    // another websocket event is received.
    updateNow = false;
  }
  if (updateEEPROM)
  {
    // User application has queued an EEPROM update, so check if its time to do it.
    // Don't update the EEPROM too frequently. Every five minutes is the most that's allowed.
    if (millis() - millisAtLastEEPROMUpdate > LAMP_EEPROM_UPDT_TIME)
    {
      this->storeEEPROM();
      millisAtLastEEPROMUpdate = millis();
      updateEEPROM = false;
    }
  }
  // Handle the lamp state machine.
  switch(currentState)
  {
    case LAMP_IDLE_STATE:
      // In this state we should check the time from the internet,
      // Do this twice per minute to avoid wasting resources, but not
      // causing the time check to accidentally skip over a minute.
      if (devModeConnected && millis() - millisAtLastTimeUpdate > 30000)
      {
        // Setup the time with appropriate time-zone.
        configTime(TIMEZONE, 0, "pool.ntp.org", "time.nist.gov");
        time_t currentTime = time(nullptr);
#ifdef USE_SERIAL_DEBUG
        Serial.printf("Got time from internet: %s\n", ctime(&currentTime));
#endif
        struct tm *tm_currentTime = localtime(&currentTime);
        //gmtime_r(&currentTime, &tm_currentTime);
        // Update the variable showing that we just tried to get the current time.
        millisAtLastTimeUpdate = millis();
        // Check if the time sync was successful.
        if (tm_currentTime->tm_year + 1900 < 2000)
        {
          // Something went wrong, and we are probably stuck on 1970
          // (time hasn't been updated yet from the server).
#ifdef USE_SERIAL_DEBUG
          Serial.printf("Error getting time from internet: (year = %d)\n", tm_currentTime->tm_year + 1900);
#endif
          return;
        }
        // Don't bother continuing if the tEn variable is not set.
        if (!tEn) return;
        
#ifdef USE_SERIAL_DEBUG
        Serial.printf("Current time: %02d:%02d\n", tm_currentTime->tm_hour, tm_currentTime->tm_min);
#endif
        // Check to see if the current hour and minute match the time to
        // power on the lamp.
        if (tm_currentTime->tm_hour == tOnH && tm_currentTime->tm_min == tOnM)
        {
          if (!pwr)
          {
            // We need to turn on the lamp.
            pwr = true;
            // Update the power button on the webserver.
            if (devModeConnected) updateWebpageParams(devIP.toString().c_str());
            // Signal the update to the state machine.
            currentState = LAMP_UPDT_STATE;
            // Store the current time for the fade animation.
            t = millis();
          }
        }
        // Check to see if the current hour and minute match the time to
        // power off the lamp.
        if (tm_currentTime->tm_hour == tOffH && tm_currentTime->tm_min == tOffM)
        {
          if (pwr)
          {
            // We need to turn on the lamp.
            pwr = false;
            // Update the power button on the webserver.
            if (devModeConnected) updateWebpageParams(devIP.toString().c_str()); 
            // Signal the update to the state machine.
            currentState = LAMP_UPDT_STATE;
            // Store the current time for the fade animation.
            t = millis();
          }
        }
      }
      break;
    case LAMP_UPDT_STATE:
      // Convert tFade to milliseconds, then multiply by 0.1% to see if
      // it's time to update the intensity variable.
      if (millis() - t > tFade)
      {
        // The loop might not be fast enough to keep up, the mul variable allows
        // the lamp to skip steps if the counter is lagging.
        // Prevent divide by zero.
        float mul = float(millis() - t) / float(tFade + 0.001);
        if (pwr) f += 0.001 * mul;
        else     f -= 0.001 * mul;
        // Update t with the most recent value of millis() to prepare
        // for the next iteration.
        t = millis();
        
#ifdef USE_SERIAL_DEBUG
        Serial.printf("Updated lamp intensity: %.2f\n", f);
#endif
      }
      if (pwr && f >= 1.0)
      {
        f = 1.0;
        currentState = LAMP_IDLE_STATE;
      }
      if (!pwr && f <= 0.0)
      {
        f = 0.0;
        currentState = LAMP_IDLE_STATE;
      }
      break;
  }
  
  // Convert brightness and saturation values along with raw rgb data
  // to determine actual rgb values for the lamp.
  float actualR = (r + (1 - sat) * (1 - r)) * brt * f;
  float actualG = (g + (1 - sat) * (1 - g)) * brt * f;
  float actualB = (b + (1 - sat) * (1 - b)) * brt * f;

  analogWrite(LED_R_PIN, (int)(actualR * 255));
  analogWrite(LED_G_PIN, (int)(actualG * 255));
  analogWrite(LED_B_PIN, (int)(actualB * 255));
}
