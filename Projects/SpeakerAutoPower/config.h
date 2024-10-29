#include <xc.h>

// Used for _delay_ms()
#define _XTAL_FREQ 250000

// Not implemented in PIC18F45K22
// #pragma config CONFIG1L = 0
// IESO enabled, FCMEN enabled, PRICLKEN enabled, PLL disabled, internal oscillator block
#pragma config CONFIG1H = 0xE8
// VBOR = 2.85 V, BOR disabled, PWRT disabled
#pragma config CONFIG2L = 0x01
// WDT disabled
#pragma config CONFIG2H = 0x00
// Not implemented in PIC18F45K22
// #pragma config CONFIG3L = 0
// MCLR pin enabled, P2B is on RC0, T3CKI is on RB5, HFINTOSC must be stable for system clock enable, CCP3 mux'ed with RE0, PORTB is digital on reset, CCP2 mux'ed with RB3
#pragma config CONFIG3H = 0x80
// Debug disabled, extended instruction set disabled, LVP enabled, stack full/underflow triggers reset
#pragma config CONFIG4L = 0x85
// Not implemented in PIC18F45K22
// #pragma config CONFIG4H = 0
// Code protection off
#pragma config CONFIG5L = 0x0F
// EEPROM and boot block code protection off
#pragma config CONFIG5H = 0xC0
// Blocks 0..3 not write protected
#pragma config CONFIG6L = 0x0F
// Data EEPROM, boot block, configuration register not write protected
#pragma config CONFIG6H = 0xE0
// Blocks 0..3 not protected from table reads
#pragma config CONFIG7L = 0x0F
// Boot block not protected from table reads
#pragma config CONFIG7H = 0x40
