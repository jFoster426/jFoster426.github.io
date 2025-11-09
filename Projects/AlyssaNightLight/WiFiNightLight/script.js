const POWER_OFF                 = 0,
      POWER_ON                  = 1,
    
      CIRCLE_Y                  = 170,
      BUTTON_DIAMETER           = 100,

      SATURATION_SLIDER_Y       = CIRCLE_Y + 100,
      BRIGHTNESS_SLIDER_Y       = CIRCLE_Y + 130,
      TIME_SELECT_BUTTON_Y      = 269,
      FADE_SLIDER_Y             = 150,
    
      LINEAR_SLIDER_WIDTH       = 70,
      
      LED_SETTINGS_STATE        = 0,
      LED_COLOR_STATE           = 1,
      LED_TIMER_STATE           = 2,
      
      TIME_SELECT_OFF           = 0,
      TIME_SELECT_ON            = 1,
      
      MILLIS_ANIMATION_TIME     = 150,
      MILLIS_SLIDE_TIME         = 400,
      MILLIS_CONNECTING_TIME    = 10,
      
      MILLIS_SETTINGS_HOLD_TIME = 1500;

var   POWER_BUTTON_STROKE_WIDTH = 1,

      w                         = window.innerWidth,
      h                         = window.innerHeight,

      touchX                    = 0,
      touchY                    = 0,
      
      curTouchX                 = 0,
      curTouchY                 = 0,
      
      touchOn                   = false,
      buttonPressed             = false,
    
      powerState                = false,
    
      r                         = 0.1,
      g                         = 0.3,
      b                         = 0.9,

      globalSaturation          = 0.5,
      globalBrightness          = 0.5,

      millisAnimationStart      = 0,
      millisSlideAnimationStart = 0,
      
      colorTheta                = 0,
      saturationSliderPos       = 0,
      brightnessSliderPos       = 0,
      fadeSliderPos             = 0,
      
      hourThetaOn               = 0,
      hourThetaOff              = 0,
      hourThetaActive           = false,
      minuteThetaOn             = 0,
      minuteThetaOff            = 0,
      minuteThetaActive         = false,
      
      actualHourOn              = 0,
      actualHourOff             = 0,
      actualMinuteOn            = 0,
      actualMinuteOff           = 0,
      isTimeOnAM                = false,
      isTimeOffAM               = false,
      
      toggleOnOff               = TIME_SELECT_ON,
      isOnOffEnabled            = false,
      
      currentState              = LED_COLOR_STATE,
      nextState                 = LED_COLOR_STATE,
      stateDiff                 = 0,
      
      connectionGood            = true,
      ellipseIntensity          = 0,
      ellipseRadius             = 0,
      millisConnectingAnimation = 0,
      
      millisSettingsHold        = 0,
      
      displaySettingsPage       = false,
      
      ssidInput                 = null,
      passwordInput             = null,
      inputFormsCreated         = false,
      
      deviceModeIP              = 'Not Configured',
      
      ssidText                  = 'Not Configured',
      passwordText              = '',
      
      connection,               // For websocket connection.
      
      SF                        = 1.0;

// Prevent navigation gestures on iOS.
var htmlBody = document.getElementById('body');
htmlBody.addEventListener('touchstart', function(e)
{ 
    e.preventDefault();
});

// Generic function which transmits data over the websocket.
function updateESP()
{
  var toSend = '';
  if (currentState == LED_SETTINGS_STATE)
  {
    // Make sure not to send double ## for empty string case, this would confuse the ESP parsing.
    toSend = '$' + 'Z'
           + '#' + parseInt(map(fadeSliderPos, w / 2 - LINEAR_SLIDER_WIDTH * SF, w / 2 + LINEAR_SLIDER_WIDTH * SF, 0, 60)).toString();
  }
  if (currentState == LED_COLOR_STATE)
  {
    // Create the string to send.
    toSend = '$' + 'C'
           + '#' + parseFloat(r).toFixed(2).toString()
           + '#' + parseFloat(g).toFixed(2).toString()
           + '#' + parseFloat(b).toFixed(2).toString()
           + '#' + parseFloat(colorTheta).toFixed(2).toString()
           + '#' + parseFloat(globalSaturation).toFixed(2).toString()
           + '#' + parseFloat(globalBrightness).toFixed(2).toString()
           + '#' + int(powerState).toString();
  }
  if (currentState == LED_TIMER_STATE)
  {
    toSend = '$' + 'T'
           + '#' + actualHourOn
           + '#' + actualMinuteOn
           + '#' + actualHourOff
           + '#' + actualMinuteOff
           + '#' + int(isOnOffEnabled).toString();
  }
  print(toSend);
  
  // Send the string to the ESP8266 through the websocket.
  try
  {
    connection.send(toSend);
    connectionGood = true;
  }
  catch (e)
  {
    // Could not send to ESP8266.
    print(e);
    // connectionGood = false;
  }
}

function car2pol(x, y, rx, ry)
{
  var dx = x - rx;
  var dy = y - ry;
  var radius = sqrt(dx * dx + dy * dy);
  var theta = atan(dy / dx);
  if (dx < 0) theta = PI + theta;
  return [radius, theta];
}

function theta2Color(theta)
{
  rVal = (1 / 2) * sin(theta) + (1 / 2);
  gVal = (1 / 2) * sin(theta - ((2 * PI) / 3)) + (1 / 2);
  bVal = (1 / 2) * sin(theta - ((4 * PI) / 3)) + (1 / 2);
  return [rVal, gVal, bVal];
}

// Calculate a new color based on a current RGB value
// and the desired saturation level.
// Inputs: r, g, b - RGB value for the color.
//         s       - Saturation of the color (1 = no effect).
// Return: The new color with saturation applied.
function convertSat(r, g, b, s)
{
  var diff = 1 - r;
  r = r + (1 - s) * diff;
  diff = 1 - g;
  g = g + (1 - s) * diff;
  diff = 1 - b;
  b = b + (1 - s) * diff;
  // Return the color array.
  return [r, g, b];
}

function snapToNearest(input, nearest)
{
  snapped = round(input / nearest) * nearest;
  return snapped;
}

function snapToFloor(input, nearest)
{
  snapped = floor(input / nearest) * nearest;
  return snapped;
}

// Function which handles the event of a user pressing the screen
// (the action of them actually first pressing the screen triggers
// this event, it is only called once per touch).
function touchStarted(event)
{
  if (event.type == 'touchstart')
  {
    touchX = mouseX;
    touchY = mouseY;
    curTouchX = mouseX;
    curTouchY = mouseY;
    touchOn = true;
  }
}

// Function which handles the event of a user dragging their
// finger along the screen (this event is called every time there
// is a coordinate change).
function touchMoved(event)
{
  if (event.type == 'touchmove')
  {
    curTouchX = mouseX;
    curTouchY = mouseY;
  }
}

// Function which handles the event of a user releasing their
// finger from the screen (this event is called only once, at the
// end of the touch action).
function touchEnded(event)
{
  if (event.type == 'touchend')
  {
    touchOn = false;
    hourThetaActive = false;
    minuteThetaActive = false;
    buttonPressed = false;
  }
  // Update the ESP here for all the other webpage functions (non real-time).
  updateESP();
}

// Function which handles the event where the user is typing
// into the SSID text field (in the settings page).
function ssidInputEvent()
{
  ssidText = this.value();
}

// Function which handles the event where the user is typing
// into the password text field (in the settings page).
function passwordInputEvent()
{
  passwordText = this.value();
}

function handleLEDColorState()
{
  noStroke();
  // Create the title text.
  fill(255);
  textSize(20 * SF);
  textFont('Georgia');
  textAlign('center');
  text('Foster Family\nSmart LED Light', w / 2, 50 * SF);
  
  // Create the LED gradient.
  var intensity = 255;
  var a;
  var r2, g2, b2;
  
  var percentDone = 1;
  if (millis() - millisAnimationStart < MILLIS_ANIMATION_TIME)
  {
    percentDone = (millis() - millisAnimationStart) / MILLIS_ANIMATION_TIME;
  }
  if (powerState == POWER_ON) a = (0.75 *      percentDone)  + 0.25;
  else                        a = (0.75 * (1 - percentDone)) + 0.25;
  [r2, g2, b2] = convertSat(r, g, b, globalSaturation);
  fill(float(intensity * r2 * a),
       float(intensity * g2 * a),
       float(intensity * b2 * a));
  ellipse(w / 2, CIRCLE_Y * SF, BUTTON_DIAMETER * SF, BUTTON_DIAMETER * SF);
  
  for (let i = BUTTON_DIAMETER; i < BUTTON_DIAMETER * 1.5; i += POWER_BUTTON_STROKE_WIDTH)
  {
    // Calculate the brightness of the color for each ellipse.
    intensity = 255 * exp(-0.05 * (i - BUTTON_DIAMETER));
    
    stroke(float(intensity * r2 * a),
           float(intensity * g2 * a),
           float(intensity * b2 * a));
    // Draw each ellipse.
    strokeWeight(POWER_BUTTON_STROKE_WIDTH * SF);
    noFill();
    ellipse(w / 2, CIRCLE_Y * SF, i * SF, i * SF);
  }
  // get the polar coordinates of the INITIAL touch relative
  // to the center of the sphere.
  var touchRadius, touchTheta;
  [touchRadius, touchTheta] = car2pol(touchX, touchY, w / 2, CIRCLE_Y * SF);
  // Handle for touching the screen anywhere.
  if (touchOn == true)
  {
    // Is the current touch on the power button?
    if (touchRadius < (BUTTON_DIAMETER / 2) * SF)
    {
      // Check if the first time run since button press.
      if (buttonPressed == false)
      {
        buttonPressed = true;
        millisAnimationStart = millis();
        millisSettingsHold = millis();
        if (powerState == POWER_ON)       powerState = POWER_OFF;
        else if (powerState == POWER_OFF) powerState = POWER_ON;
      }
      // Only check for press and hold on the power button.
      if (millis() - millisSettingsHold > MILLIS_SETTINGS_HOLD_TIME) displaySettingsPage = true;
    }
    // Is the current touch within the RGB slider BUTTON_DIAMETER tolerance?
    // Allow for some tolerance if the touch was not exactly on the slider.
    if (touchRadius > (((BUTTON_DIAMETER + 50) / 2) - 8) * SF &&
        touchRadius < (((BUTTON_DIAMETER + 50) / 2) + 8) * SF)
    {
      var curTouchRadius, curTouchTheta;
      [curTouchRadius, curTouchTheta] = car2pol(curTouchX, curTouchY, w / 2, CIRCLE_Y * SF);
      // Update the circle color.
      [r, g, b] = theta2Color(curTouchTheta);
      // Update the slider handle position.
      colorTheta = curTouchTheta;
      // Update the ESP (real-time update).
      updateESP();
    }
    // Is the current touch within the saturation slider tolerance?
    if (touchX > w / 2 - LINEAR_SLIDER_WIDTH * SF &&
        touchX < w / 2 + LINEAR_SLIDER_WIDTH * SF &&
        touchY > (SATURATION_SLIDER_Y * SF * 0.96) &&
        touchY < (SATURATION_SLIDER_Y * SF * 1.04))
    {
      saturationSliderPos = curTouchX;
      if (saturationSliderPos > w / 2 + LINEAR_SLIDER_WIDTH * SF) saturationSliderPos = w / 2 + LINEAR_SLIDER_WIDTH * SF;
      if (saturationSliderPos < w / 2 - LINEAR_SLIDER_WIDTH * SF) saturationSliderPos = w / 2 - LINEAR_SLIDER_WIDTH * SF;
      // Set the globalSaturation variable based on the position of the slider.
      globalSaturation = map(saturationSliderPos, w / 2 - LINEAR_SLIDER_WIDTH * SF, w / 2 + LINEAR_SLIDER_WIDTH * SF, 0, 1);
      // Update the ESP (real-time update).
      updateESP();
    }
    
    // Is the current touch within the brightness slider tolerance?
    if (abs(touchX - w / 2) < LINEAR_SLIDER_WIDTH * SF && 
        abs(touchY - BRIGHTNESS_SLIDER_Y * SF) / (BRIGHTNESS_SLIDER_Y * SF) < 0.04)
    {
      brightnessSliderPos = curTouchX;
      if (brightnessSliderPos > w / 2 + LINEAR_SLIDER_WIDTH * SF) brightnessSliderPos = w / 2 + LINEAR_SLIDER_WIDTH * SF;
      if (brightnessSliderPos < w / 2 - LINEAR_SLIDER_WIDTH * SF) brightnessSliderPos = w / 2 - LINEAR_SLIDER_WIDTH * SF;
      // Set the globalBrightness variable based on the position of the slider.
      globalBrightness = map(brightnessSliderPos, w / 2 - LINEAR_SLIDER_WIDTH * SF, w / 2 + LINEAR_SLIDER_WIDTH * SF, 0.01, 1);
      // Update the ESP (real-time update).
      updateESP();
    }
  }
  
  // Create the white sliders.
  stroke(255);
  strokeWeight(2 * SF);
  ellipse(w / 2, CIRCLE_Y * SF, (BUTTON_DIAMETER + 50) * SF, (BUTTON_DIAMETER + 50) * SF);

  // Create the slider handle.
  stroke(255);
  fill(255);
  ellipse(w / 2 + (((BUTTON_DIAMETER + 50) / 2) * cos(colorTheta) * SF),
          (CIRCLE_Y + ((BUTTON_DIAMETER + 50) / 2) * sin(colorTheta)) * SF,
          7 * SF);
          
  // Draw a power icon in the center.
  fill(0);
  strokeWeight(8 * SF);
  stroke(0);
  line(w / 2, (CIRCLE_Y - 35) * SF, w / 2, (CIRCLE_Y - 12) * SF);
  noFill();
  arc(w / 2, CIRCLE_Y * SF, 70 * SF, 70 * SF, PI / 2 - 2.5, PI / 2 + 2.5);
  
  // Create the saturation text.
  fill(255);
  noStroke();
  textSize(10 * SF);
  textFont('Georgia');
  textAlign('left');
  text('Saturation', w / 2 - LINEAR_SLIDER_WIDTH * SF, (SATURATION_SLIDER_Y - 10) * SF);
  
  // Draw the saturation slider.
  stroke(255);
  strokeWeight(2 * SF);
  line(w / 2 - LINEAR_SLIDER_WIDTH * SF, SATURATION_SLIDER_Y * SF, w / 2 + LINEAR_SLIDER_WIDTH * SF, SATURATION_SLIDER_Y * SF);
  fill(255);
  ellipse(saturationSliderPos, SATURATION_SLIDER_Y * SF, 7 * SF);
  
  // Create the brightness text.
  fill(255);
  noStroke();
  textSize(10 * SF);
  textFont('Georgia');
  textAlign('left');
  text('Brightness', w / 2 - LINEAR_SLIDER_WIDTH * SF, (BRIGHTNESS_SLIDER_Y - 10) * SF);
  
  // Draw the brightness slider.
  stroke(255);
  strokeWeight(2 * SF);
  line(w / 2 - LINEAR_SLIDER_WIDTH * SF, BRIGHTNESS_SLIDER_Y * SF, w / 2 + LINEAR_SLIDER_WIDTH * SF, BRIGHTNESS_SLIDER_Y * SF);
  fill(255);
  ellipse(brightnessSliderPos, BRIGHTNESS_SLIDER_Y * SF, 7 * SF);
}

function handleLEDTimerState()
{
  noStroke();
  // Create the title text.
  fill(255);
  textSize(20 * SF);
  textFont('Georgia');
  textAlign('center');
  text('Change On/Off\nTiming', w / 2, 50 * SF);
  
  [r2, g2, b2] = convertSat(r, g, b, globalSaturation);
  
  // get the polar coordinates of the INITIAL touch relative
  // to the center of the sphere.
  var touchRadius, touchTheta;
  [touchRadius, touchTheta] = car2pol(touchX, touchY, w / 2, CIRCLE_Y * SF);
  
  var hourTheta   = toggleOnOff == TIME_SELECT_ON ? hourThetaOn   : hourThetaOff;
  var minuteTheta = toggleOnOff == TIME_SELECT_ON ? minuteThetaOn : minuteThetaOff;
  
  hourTheta = snapToNearest(hourTheta, 2 * PI / 12);
  minuteTheta = snapToNearest(minuteTheta, 2 * PI / 60);
  
  // Handle for touching the screen anywhere.
  if (touchOn == true)
  {
    var curTouchRadius, curTouchTheta;
    [curTouchRadius, curTouchTheta] = car2pol(curTouchX, curTouchY, w / 2, CIRCLE_Y * SF);
    
    // Update the actualHour and actualMinute variables.
    // Get the actualHourOn value.
    actualHourOn = int(map(hourThetaOn, 0, 2 * PI, 0, 12) + 3 + 0.5);
    while (actualHourOn >= 12) actualHourOn -= 12;
    if (!isTimeOnAM) actualHourOn += 12;
    // Get the actualMinuteOn value.
    actualMinuteOn = int(map(minuteThetaOn, 0, 2 * PI, 0, 60) + 15 + 0.5);
    while (actualMinuteOn >= 60) actualMinuteOn -= 60;
    // Get the actualHourOff value.
    actualHourOff = int(map(hourThetaOff, 0, 2 * PI, 0, 12) + 3 + 0.5);
    while (actualHourOff >= 12) actualHourOff -= 12;
    if (!isTimeOffAM) actualHourOff += 12;
    // Get the actualMinuteOff value.
    actualMinuteOff = int(map(minuteThetaOff, 0, 2 * PI, 0, 60) + 15 + 0.5);
    while (actualMinuteOff >= 60) actualMinuteOff -= 60;
    
    // Check if touch is close to the center of the clock.
    if (touchRadius < BUTTON_DIAMETER * 0.3 * SF &&
        !buttonPressed)
    {
      buttonPressed = true;
      isOnOffEnabled = !isOnOffEnabled;
      millisAnimationStart = millis();
    }
    
    if (abs(touchTheta - hourTheta) < 0.2 &&
        touchRadius > ((BUTTON_DIAMETER + 50) / 2 - 50) * SF &&
        touchRadius < ((BUTTON_DIAMETER + 50) / 2 + 15) * SF ||
        hourThetaActive)
    {
      // Touching the hour hand.
      hourThetaActive = true;
      if (toggleOnOff == TIME_SELECT_ON) hourThetaOn = curTouchTheta;
      else                               hourThetaOff = curTouchTheta;
    }
    else if (abs(touchTheta - minuteTheta) < 0.2 &&
             touchRadius > ((BUTTON_DIAMETER + 50) / 2 - 50) * SF &&
             touchRadius < ((BUTTON_DIAMETER + 50) / 2 + 15) * SF ||
             minuteThetaActive)
    {
      // Touching the minute hand.
      minuteThetaActive = true;
      if (toggleOnOff == TIME_SELECT_ON) minuteThetaOn = curTouchTheta;
      else                               minuteThetaOff = curTouchTheta;
    }
    
    console.log(touchTheta + ' ' + hourTheta + ' ' + minuteTheta);
    
    stroke(255);
    // Check if in button coordinates for On / Off.
    if (touchX > 10 * SF && touchX < w / 2 - 10 * SF &&
        touchY > TIME_SELECT_BUTTON_Y * SF && touchY < (TIME_SELECT_BUTTON_Y + 30) * SF &&
        !buttonPressed)
    {
      buttonPressed = true;
      if (toggleOnOff == TIME_SELECT_ON) toggleOnOff = TIME_SELECT_OFF;
      else                               toggleOnOff = TIME_SELECT_ON;
    }
    
    // Check if in button coordinates for AM / PM.
    if (touchX > w / 2 + 10 * SF && touchX < w - 10 * SF &&
        touchY > TIME_SELECT_BUTTON_Y * SF && touchY < (TIME_SELECT_BUTTON_Y + 30) * SF &&
        !buttonPressed)
    {
      buttonPressed = true;
      if (toggleOnOff == TIME_SELECT_ON) isTimeOnAM  = !isTimeOnAM;
      else                               isTimeOffAM = !isTimeOffAM;
    }
  }
  
  // Create the white sliders.
  stroke(255);
  strokeWeight(2 * SF);
  fill(0);
  ellipse(w / 2, CIRCLE_Y * SF, (BUTTON_DIAMETER + 50) * SF, (BUTTON_DIAMETER + 50) * SF);
  
  // Create clock ticks.
  strokeWeight(1 * SF);
  for (var i = 0; i < 60; i++)
  {
    if (i % 5 == 0)
    {
      stroke(float((160 + 95 * globalSaturation) * r2),
             float((160 + 95 * globalSaturation) * g2),
             float((160 + 95 * globalSaturation) * b2));
      line((w / 2) + ((BUTTON_DIAMETER + 50) / 2) * 0.90 * cos(i * 2 * PI / 60) * SF,
           CIRCLE_Y * SF + ((BUTTON_DIAMETER + 50) / 2) * 0.90 * sin(i * 2 * PI / 60) * SF,
           (w / 2) + ((BUTTON_DIAMETER + 50) / 2) * 0.96 * cos(i * 2 * PI / 60) * SF,
           CIRCLE_Y * SF + ((BUTTON_DIAMETER + 50) / 2) * 0.96 * sin(i * 2 * PI / 60) * SF);
    }
    else
    {
      stroke(255);
      line((w / 2) + ((BUTTON_DIAMETER + 50) / 2) * 0.95 * cos(i * 2 * PI / 60) * SF,
           CIRCLE_Y * SF + ((BUTTON_DIAMETER + 50) / 2) * 0.95 * sin(i * 2 * PI / 60) * SF,
           (w / 2) + ((BUTTON_DIAMETER + 50) / 2) * 0.96 * cos(i * 2 * PI / 60) * SF,
           CIRCLE_Y * SF + ((BUTTON_DIAMETER + 50) / 2) * 0.96 * sin(i * 2 * PI / 60) * SF);
    }
  }
  
  // Animate based on if user pressed middle of clock.
  var percentDone = (millis() - millisAnimationStart) / MILLIS_ANIMATION_TIME;
  var overlay = 0, radMod = 1;
  if (percentDone < 1)
  {
    if (isOnOffEnabled == false)
    {
      overlay = 190 * percentDone;
      radMod = (1 - percentDone);
    }
    else
    {
      overlay = 190 * (1 - percentDone);
      radMod = percentDone;
    }
  }
  else
  {
    if (isOnOffEnabled == false)
    {
      overlay = 190;
      radMod = 0;
    }
  }
  
  // Create minute hand.
  stroke(255);
  strokeWeight(4 * SF);
  line(w / 2, CIRCLE_Y * SF, (w / 2)       + (60 * radMod * cos(minuteTheta) * SF),
                             CIRCLE_Y * SF + (60 * radMod * sin(minuteTheta) * SF));
  
  // Create hour hand.
  stroke(float((160 + 95 * globalSaturation) * r2),
         float((160 + 95 * globalSaturation) * g2),
         float((160 + 95 * globalSaturation) * b2));
  // Solve for edge case with hour hand not rolling back to zero on small region of 
  //if ((toggleOnOff == TIME_SELECT_ON ? actualMinuteOn : actualMinuteOff) == 0 &&
  //    (toggleOnOff == TIME_SELECT_ON ? minuteThetaOn : minuteThetaOff
  
  // This solves the problem with the hour hand not displaying correctly between 59/0 on the minute hand.
  var minuteThetaCorrected = ((toggleOnOff == TIME_SELECT_ON ? actualMinuteOn : actualMinuteOff) - 15) * (2 * (PI / 60));
  
  line(w / 2, CIRCLE_Y * SF, (w / 2)       + (40 * radMod * cos((minuteThetaCorrected + PI / 2) * 5 / 60 + hourTheta) * SF),
                             CIRCLE_Y * SF + (40 * radMod * sin((minuteThetaCorrected + PI / 2) * 5 / 60 + hourTheta) * SF));
          
  // Create the slider handle (minute hand).
  stroke(255);
  strokeWeight(2 * SF);
  fill(255);
  ellipse((w / 2)       + ((BUTTON_DIAMETER + 50) / 2) * cos(minuteTheta) * SF,
          CIRCLE_Y * SF + ((BUTTON_DIAMETER + 50) / 2) * sin(minuteTheta) * SF,
          7 * SF);
          
  // Create the slider handle (hour hand).
  stroke(float((160 + 95 * globalSaturation) * r2),
         float((160 + 95 * globalSaturation) * g2),
         float((160 + 95 * globalSaturation) * b2));
  fill(float((160 + 95 * globalSaturation) * r2),
       float((160 + 95 * globalSaturation) * g2),
       float((160 + 95 * globalSaturation) * b2));
  ellipse((w / 2)       + ((BUTTON_DIAMETER + 50) / 2) * cos(hourTheta) * SF,
          CIRCLE_Y * SF + ((BUTTON_DIAMETER + 50) / 2) * sin(hourTheta) * SF,
          7 * SF);
          
  // Create clock center.
  stroke(255);
  strokeWeight(2 * SF);
  fill(255);
  ellipse(w / 2, CIRCLE_Y * SF, 10 * SF);
  
  // Create the rectangles that slide over the text below, showing the selected mode.
  strokeWeight(1 * SF);
  stroke(255);
  fill(40);
  rect(w / 2 + 10 * SF, TIME_SELECT_BUTTON_Y * SF, w / 2 - 20 * SF, 30 * SF, 3 * SF);
  rect(10 * SF, TIME_SELECT_BUTTON_Y * SF, w / 2 - 20 * SF, 30 * SF, 3 * SF);
  
  // Create On, Off, AM, PM text.
  var isAm;
  noStroke();
  textSize(10 * SF);
  textFont('Georgia');
  
  isAm = toggleOnOff == TIME_SELECT_ON ? isTimeOnAM : isTimeOffAM;
  
  if (toggleOnOff == TIME_SELECT_ON)  fill(255);
  else                                fill(80);
  textAlign('right');
  text('On   ', w / 4, (TIME_SELECT_BUTTON_Y + 18) * SF);
  if (isAm == true) fill(255);
  else              fill(80);
  text('AM   ', 3 * w / 4, (TIME_SELECT_BUTTON_Y + 18) * SF);
  if (toggleOnOff == TIME_SELECT_OFF) fill(255);
  else                                fill(80);
  textAlign('left');
  text('   Off', w / 4, (TIME_SELECT_BUTTON_Y + 18) * SF);
  if (isAm == false) fill(255);
  else               fill(80);
  text('   PM', 3 * w / 4, (TIME_SELECT_BUTTON_Y + 18) * SF);
  
  textAlign('center');
  fill(255);
  text('/', w / 4, (TIME_SELECT_BUTTON_Y + 18) * SF);
  text('/', 3 * w / 4, (TIME_SELECT_BUTTON_Y + 18) * SF);
  
  noStroke();
  fill(0, 0, 0, overlay);
  rect(0, (CIRCLE_Y - 80) * SF, w, w + 20);
}

function handleLEDSettingsState()
{
  noStroke();
  // Create the title text.
  fill(255);
  textSize(20 * SF);
  textFont('Georgia');
  textAlign('center');
  text('Settings', w / 2, 50 * SF);
  // Create input field for SSID and password.
  textSize(10 * SF);
  textAlign('left');
  text('Connected to: ', w / 2 - LINEAR_SLIDER_WIDTH * SF, 80 * SF);
  textAlign('right');
  text(ssidText, w / 2 + LINEAR_SLIDER_WIDTH * SF, 80 * SF);
  
  // Display current WiFi IP.
  textAlign('left');
  text('IP Address:', w / 2 - LINEAR_SLIDER_WIDTH * SF, 100 * SF);
  textAlign('right');
  text(deviceModeIP, w / 2 + LINEAR_SLIDER_WIDTH * SF, 100 * SF);
  
  textAlign('left');
  // Show fade in/out time slider.
  text('Fade In/Out Time', w / 2 - LINEAR_SLIDER_WIDTH * SF, (FADE_SLIDER_Y - 10) * SF);
  // Show the feedback for the fade time.
  textAlign('right');
  text(int(map(fadeSliderPos, w / 2 - LINEAR_SLIDER_WIDTH * SF, w / 2 + LINEAR_SLIDER_WIDTH * SF, 0, 60)).toString() + 's',
       w / 2 + LINEAR_SLIDER_WIDTH * SF, (FADE_SLIDER_Y - 10) * SF);
  // Draw the brightness slider.
  stroke(255);
  strokeWeight(2);
  line(w / 2 - LINEAR_SLIDER_WIDTH * SF, FADE_SLIDER_Y * SF, w / 2 + LINEAR_SLIDER_WIDTH * SF, FADE_SLIDER_Y * SF);
  fill(255);
 
  ellipse(fadeSliderPos, FADE_SLIDER_Y * SF, 7 * SF);
  
  // Check for touch inside fade slider.
  if (touchOn == true)
  {
    // Check for touching inside the fade slider.
    if (touchX > w / 2 - LINEAR_SLIDER_WIDTH * SF &&
        touchX < w / 2 + LINEAR_SLIDER_WIDTH * SF &&
        touchY > FADE_SLIDER_Y * 0.96 * SF &&
        touchY < FADE_SLIDER_Y * 1.04 * SF)
    {
      // Currently touching inside the fade slider.
      fadeSliderPos = mouseX;
      // Check if out of bounds.
      if (fadeSliderPos < w / 2 - LINEAR_SLIDER_WIDTH * SF) fadeSliderPos = w / 2 - LINEAR_SLIDER_WIDTH * SF;
      if (fadeSliderPos > w / 2 + LINEAR_SLIDER_WIDTH * SF) fadeSliderPos = w / 2 + LINEAR_SLIDER_WIDTH * SF;
      // Automatically will update the ESP when touch removed. The settings page does not need real time updates.
    }
  }
}

// Set up the webpage, create the canvas defined by the displayable
// area of the browser.
// The HTML file configures the webpage to be not user scalable,
// therefore the page will be static and everything drawn on the
// page will be visible to the user.
function setup()
{
  // Create the canvas.
  h = window.innerHeight;
  w = h / 2;
  const canvasElt = createCanvas(w, h).elt;
  canvasElt.style.height = '100%';
  
  SF = w / 200;
  
  brightnessSliderPos = w / 2;
  saturationSliderPos = w / 2;
  fadeSliderPos       = w / 2;
  // init rest of website.
  
  try
  {
    connection = new WebSocket('ws://' + location.hostname + ':81/', ['arduino']);
    //connection.onopen = function()
    //{
      // connection.send('Connect ' + new Date());
      // print('websocket connected!');
    //};
    //connection.onerror = function(e)
    //{
      //print('WebSocket Error ', e);
    //};
    connection.onmessage = function(e)
    {
      print('Server says: ', e.data);
      var serverData = e.data.split('#');
      // Disregard serverData[0] because the string started with a '#'.
      if (serverData[1] == '1') powerState = true;
      else                      powerState = false;
      colorTheta = parseFloat(serverData[2]);
      r = parseFloat(serverData[3]);
      g = parseFloat(serverData[4]);
      b = parseFloat(serverData[5]);
      globalSaturation = parseFloat(serverData[6]);
      globalBrightness = parseFloat(serverData[7]);
      actualHourOn    = parseInt(serverData[8]);
      actualMinuteOn  = parseInt(serverData[9]);
      actualHourOff   = parseInt(serverData[10]);
      actualMinuteOff = parseInt(serverData[11]);
      if (serverData[12] == '1') isOnOffEnabled = true;
      else            isOnOffEnabled = false;
      deviceModeIP = serverData[13];
      fadeTime = parseInt(serverData[14]);
      ssidText = serverData[15];
      passwordText = serverData[16];
      // Update the saturation and brightness slider positions.
      saturationSliderPos = map(globalSaturation, 0, 1, (w / 2) - LINEAR_SLIDER_WIDTH * SF, (w / 2) + LINEAR_SLIDER_WIDTH * SF);
      brightnessSliderPos = map(globalBrightness, 0, 1, (w / 2) - LINEAR_SLIDER_WIDTH * SF, (w / 2) + LINEAR_SLIDER_WIDTH * SF);
      // Convert the actualHour and actualMinute values to clock positions.
      // Since using polar coordinates, hours in the PM range should still map correctly.
      
      while (actualHourOn > 24) actualHourOn -= 24;
      if (actualHourOn > 12) isTimeOnAM = false;
      else isTimeOnAM = true;
      hourThetaOn = (actualHourOn - 3) * (2 * (PI / 12));
      while (hourThetaOn > 2 * PI) hourThetaOn -= 2 * PI;
      
      while (actualMinuteOn > 60) actualMinuteOn -= 60;
      minuteThetaOn = (actualMinuteOn - 15) * (2 * (PI / 60));
      
      while (actualHourOff > 24) actualHourOff -= 24;
      if (actualHourOff > 12) isTimeOffAM = false;
      else isTimeOffAM = true;
      hourThetaOff = (actualHourOff - 3) * (2 * (PI / 12));
      while (hourThetaOff > 2 * PI) hourThetaOff -= 2 * PI;
      
      while (actualMinuteOff > 60) actualMinuteOff -= 60;
      minuteThetaOff = (actualMinuteOff - 15) * (2 * (PI / 60));
      
      // Update the fade time slider position.
      fadeSliderPos = map(fadeTime, 0, 60, w / 2 - LINEAR_SLIDER_WIDTH * SF, w / 2 + LINEAR_SLIDER_WIDTH * SF);
    };
    //connection.onclose = function()
    //{
      //print('WebSocket connection closed');
    //};
  }
  catch(e)
  {
    //print(e);
  }
}

// The main section for code execution. Runs in a loop.
// Do not block inside this function. We want update speed as fast as
// possible for maximum responsiveness.
// Strive for high levels of code/algorithm optimization.
function draw()
{
  background(0);
  
  if (connectionGood == true)
  {
    if (touchOn == true)
    {
      // If touch boundary within left button:
      if (touchX > 10 * SF     && touchX < w / 2 - 10 * SF &&
          touchY > h - 40 * SF && touchY < h - 10 * SF &&
          buttonPressed == false &&
          currentState > 0)
      {
        buttonPressed = true;
        // Don't allow new animation before previous one completed.
        if (millis() - millisSlideAnimationStart > MILLIS_SLIDE_TIME)
        {
          millisSlideAnimationStart = millis();
          nextState = currentState - 1;
        }
      }
      // If touch boundary within right button:
      if (touchX > w / 2 + 10 * SF && touchX < w - 10 * SF &&
          touchY > h - 40 * SF    && touchY < h - 10 * SF &&
          buttonPressed == false &&
          currentState < 2)
      {
        buttonPressed = true;
        // Don't allow new animation before previous one completed.
        if (millis() - millisSlideAnimationStart > MILLIS_SLIDE_TIME)
        {
          millisSlideAnimationStart = millis();
          nextState = currentState + 1;
        }
      }
    }
    // Draw the buttons.
    stroke(255);
    fill(40);
    strokeWeight(1 * SF);
    rect(w / 2 + 10 * SF, h - 40 * SF, w / 2 - 20 * SF, 30 * SF, 3 * SF);
    rect(10 * SF, h - 40 * SF, w / 2 - 20 * SF, 30 * SF, 3 * SF);
    // Draw the button texts.
    fill(255);
    noStroke();
    textSize(10 * SF);
    textAlign('center');
    textFont('Georgia');
    // Choose what to say on the buttons.
    var buttonTexts = ['', 'Settings', 'Change Color', 'On/Off Time', ''];
    var leftButtonText = buttonTexts[nextState];
    var rightButtonText = buttonTexts[nextState + 2];
    // Fill in the text based on the array.
    text(leftButtonText, w / 4, h - 22 * SF);
    text(rightButtonText, 3 * w / 4, h - 22 * SF);
    
    var percentDone = 1;
    if (millis() > MILLIS_SLIDE_TIME && 
        millis() - millisSlideAnimationStart < MILLIS_SLIDE_TIME)
      percentDone = (millis() - millisSlideAnimationStart) / MILLIS_SLIDE_TIME;
    // Update the state if the animation's done.
    if (percentDone == 1) currentState = nextState;
    else                  stateDiff = nextState - currentState;
    
    // Decide what to show on the rest of the webpage, depending on currentState.
    // Variable a modulates from 0 to 1, based on percentDone input from 0 to 1.
    var slideAmount, a;
    if (percentDone < 0.5) a = 16 * pow(percentDone, 5);
    else                   a = 16 * pow(percentDone - 1, 5) + 1;
    
    if (currentState == LED_COLOR_STATE    && nextState == LED_SETTINGS_STATE) slideAmount = (w * a) - w;
    if (currentState == LED_COLOR_STATE    && nextState == LED_TIMER_STATE)    slideAmount = (-2 * w) + ((1 - a) * w);
    if (currentState == LED_SETTINGS_STATE && nextState == LED_COLOR_STATE)    slideAmount = -(w * a) * 1;
    if (currentState == LED_TIMER_STATE    && nextState == LED_COLOR_STATE)    slideAmount = (-w) - ((1 - a) * w);
    
    if (currentState == LED_SETTINGS_STATE && nextState == LED_SETTINGS_STATE) sildeAmount = 0;
    if (currentState == LED_COLOR_STATE    && nextState == LED_COLOR_STATE)    slideAmount = -w; 
    if (currentState == LED_TIMER_STATE    && nextState == LED_TIMER_STATE)    slideAmount = -2 * w;
  
    translate(slideAmount, 0);
    if (nextState == LED_SETTINGS_STATE || percentDone < 1) handleLEDSettingsState();
    translate(w, 0);
    if (nextState == LED_COLOR_STATE    || percentDone < 1) handleLEDColorState();
    translate(w, 0);
    if (nextState == LED_TIMER_STATE    || percentDone < 1) handleLEDTimerState();
  }
  else
  {
    noStroke();
    // Create the title text.
    fill(255);
    textSize(20);
    textFont('Georgia');
    textAlign('center');
    text('Error Connecting\nto Smart Lamp', w / 2, 50);
    textSize(12);
    text('Touch anywhere to\n try reconnecting.', w / 2, 100);
    if (touchOn == true)
    {
      if (buttonPressed == false)
      {
        // Set the initial values for the ellipse.
        ellipseIntensity = 1;
        ellipseRadius = 30;
        // Prevent a sudden change to previous state from triggering button by accident.
        buttonPressed = true;
      }
    }
    // Draw the circle with the current RGB color whereever we tapped the screen.
    // This is useful just to show the user something is happening.
    stroke(r * ellipseIntensity * 255, g * ellipseIntensity * 255, b * ellipseIntensity * 255, 255 - 255 * pow(1 - ellipseIntensity, 5));
    strokeWeight(2);
    fill(0, 0, 0, 0);
    ellipse(touchX, touchY, ellipseRadius);
    if (ellipseIntensity > 0.001 &&
        millis() - millisConnectingAnimation > MILLIS_CONNECTING_TIME)
    {
      millisConnectingAnimation = millis();
      ellipseIntensity = ellipseIntensity / 1.05;
      ellipseRadius = ellipseRadius + 2;
    }
  }
}