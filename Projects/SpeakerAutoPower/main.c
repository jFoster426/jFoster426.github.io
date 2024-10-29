#include "config.h"

// Set the threshold for difference in ADC readings required to turn on speaker
const uint16_t threshold = 80;
// Time taken for speaker to turn off
// Timeout in seconds is below value / 488.28125
const uint16_t timeout = 14648; // 30 s

// Time taken for speaker to turn off after button pressed
// Timeout in seconds is below value / 488.28125
const uint32_t buttonTimeout = 1757813; // 1 hour


// C  -> D7
// B  -> D6
// A  -> D5
// D  -> D4
// E  -> D3
// F  -> D2
// DP -> D1
// G  -> D0

const uint8_t segLUT[16] = 
{
    0b11111100, // 0
    0b00001100, // 1
    0b01111001, // 2
    0b00111101, // 3
    0b10001101, // 4
    0b10110101, // 5
    0b11110101, // 6
    0b00011100, // 7
    0b11111101, // 8
    0b10111101, // 9
    0b11011101, // A
    0b11100101, // B
    0b11110000, // C
    0b01101101, // D
    0b11110001, // E
    0b11010001  // F
};

const uint8_t segLUT2[16] =
{
    0b00000001,
    0b00001001,
    0b00001000,
    0b00011000,
    0b00010000,
    0b10010000,
    0b10000000,
    0b10000001,
    0b00000001,
    0b00000101,
    0b00000100,
    0b00100100,
    0b00100000,
    0b01100000,
    0b01000000,
    0b01000001
};

volatile uint32_t buttonCount = 1757813;
volatile uint8_t segLUT2Iter = 0;
volatile uint16_t count = 14648;
volatile uint16_t sub = 1;
volatile uint16_t adcbuf = 0;
volatile uint16_t oldbuf = 0;
volatile int16_t dbuf = 0;
volatile uint8_t pstate = 0;

void main(void)
{
    // Enter sleep mode on SLEEP, select 1 MHz clock source, system clock is primary clock
    OSCCON = 0xB0;
    // Wait for stable clock
    while (OSCCONbits.HFIOFS == 0);
    // Enable priority interrupts
    RCON |= 0x80;
    // TIMER0 Setup
    TMR0L = 0x00;
    TMR0H = 0x00;
    // Timer enabled, 8 bit mode, CLK = CLKOUT, 1:2 prescaler
    T0CON = 0xC0;
    // TMR0 counts at (Fosc / 4) / 2
    // Interrupt fires every 256 counts
    INTCONbits.TMR0IF = 0;
    INTCON2bits.TMR0IP = 1;
    INTCONbits.TMR0IE = 1;
    // Configure PORTA as digital outputs
    TRISA = 0x00;
    ANSELA = 0x00;
    // Configure PORTB0, PORTB1 as analog inputs
    TRISB |= 0b11;
    ANSELB |= 0b11;
    // Configure PORTC0 as a digital input
    TRISC = 0x01;
    ANSELC = 0x00;

    // Right justified, 8 TAD, FRC
    ADCON2 = (1 << 7) | (0b100 << 3) | (0b111);
    // Reference is AVDD, AVSS (internal)
    ADCON1 = 0x00;
    // Select AN12, ADC enabled
    ADCON0 =(0b01100 << 2) | (1 << 0);
    // ADC interrupt is high priority
    IPR1bits.ADIP = 1;
    // ADC interrupt enable
    PIE1bits.ADIE = 1;

    // Configure power control pin as output, start off
    TRISBbits.TRISB5 = 0;
    LATBbits.LATB5 = 0;

    // Enable peripheral and global interrupts
    INTCONbits.PEIE = 1;
    INTCONbits.GIE = 1;




    // Initiate first conversion
    ADCON0 |= (1 << 1);

    while (1)
    {
        // PIC.B0 is soldered to the button
        // Button is normally CLOSED but signal is active LOW (double negative)
        if (PORTCbits.RC0 == 1)
        {
            buttonCount = 0;
        }

        // Turn on the speaker if the audio was playing recently or the button was pressed recently
        if ((count <= timeout / 5) || (buttonCount < buttonTimeout))
        {
            pstate = 1;
        }
        
        // Turn off the speaker only if the audio was not playing recently and the button was not pressed recently
        if ((count >= timeout) && (buttonCount >= buttonTimeout))
        {
            pstate = 0;
        }

        // Write to the 7 segment display
        // Case when button was pressed recently: show custom character indicating speaker is always on
        if (buttonCount < buttonTimeout)
        {
            LATA = segLUT2[segLUT2Iter];
        }
        // Case when button was not pressed recently: show incrementing numbers indicating time since music was last heard
        else
        {
            float percent = (float)count / (float)timeout;
            uint8_t segLUTval = (uint8_t)(percent * (float)0x0F);
            LATA = segLUT[segLUTval] | (uint8_t)(pstate << 1);
        }
        
        // Control the power
        LATBbits.LATB5 = pstate;
    }
}

void __interrupt(high_priority) high_priority_interrupts(void)
{
    // Handle high priority interrupts here
    if (INTCONbits.TMR0IF == 1)
    {
        if (count < timeout)
        {
            count++;
        }

        if (buttonCount < buttonTimeout)
        {
            buttonCount++;
            // Increment segLUT2Iter slower than buttonCount (generates LED display pattern)
            if ((buttonCount & 31) == 31)
            {
                segLUT2Iter++;
                if (segLUT2Iter > 15)
                {
                    segLUT2Iter = 0;
                }
            }
        }
        INTCONbits.TMR0IF = 0;
    }

    if (PIR1bits.ADIF == 1)
    {
        // Store the last reading
        oldbuf = adcbuf;
        // Read ADRESL first to get data into ADRESH
        adcbuf = ADRESL;
        adcbuf |= (uint16_t)(ADRESH << 8);
        // Get the difference
        dbuf = (int16_t)(oldbuf - adcbuf);
        // Absolute value the difference
        if (dbuf < 0) dbuf = -dbuf;
        // Threshold detection to determine if the LEDs should be on
        if (dbuf > threshold && count > 0)
        {
            sub *= 2;
            if (sub > count)
            {
                count = 0;
            }
            else
            {
                count -= sub;
            }
        }
        else
        {
            sub = 1;
        }

        PIR1bits.ADIF = 0;
        // Start next conversion
        ADCON0 |= (1 << 1);
    }
}

void __interrupt(low_priority) low_priority_interrupts(void)
{
    // Handle low priority interrupts here
}