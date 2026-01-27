#include <xc.inc>


;-------------------------------------------------
; Configuration Word 1
;-------------------------------------------------
CONFIG  "FOSC"  = "INTOSCIO"	; Internal RC, RA6/RA7 as I/O
CONFIG  "WDTE"  = "OFF"         ; Watchdog Timer disabled
CONFIG  "PWRTE" = "OFF"         ; Power-up Timer disabled
CONFIG  "MCLRE" = "OFF"         ; RA5/MCLR/VPP pin function is digital I/O, MCLR internally tied to VDD
CONFIG  "BOREN" = "OFF"         ; Brown-out Reset disabled
CONFIG  "LVP"   = "OFF"         ; High-voltage programming must be used to program the IC - RB3 is digital IO
CONFIG  "CPD"   = "OFF"         ; Data EEPROM code protection off
CONFIG  "WRT"   = "OFF"         ; Flash write protection off
CONFIG  "DEBUG" = "OFF"         ; In-Circuit Debugger disabled, RB6 and RB7 are general purpose I/O pins
CONFIG  "CCPMX" = "RB0"         ; CCP1 on RB0
CONFIG  "CP"    = "OFF"         ; Program memory code protection off


;-------------------------------------------------
; Configuration Word 2
;-------------------------------------------------
CONFIG  "FCMEN" = "ON"          ; Fail-Safe Clock Monitor enabled
CONFIG  "IESO"  = "OFF"         ; Internal/External Switchover disabled


;-------------------------------------------------
; General-purpose RAM
;-------------------------------------------------
d1          equ     0x20
d2          equ     0x21
tx_buf      equ     0x22
count       equ     0x23


global  main


;-------------------------------------------------
; Reset vector
;-------------------------------------------------
PSECT reset_vec,class=CODE,delta=2
reset_vec:
    goto    main


;-------------------------------------------------
; Interrupt vector
;-------------------------------------------------
PSECT isr_vec,class=CODE,delta=2
    retfie                      ; Return from interrupt
                                ; Interrupts not implemented


;-------------------------------------------------
; User code
;-------------------------------------------------
PSECT code,class=CODE,delta=2

    
main:
    banksel OSCCON
    movlw   0x70
    iorwf   OSCCON, f           ; Configure 8 MHz operation

    banksel TRISA
    bcf     TRISA, 7            ; RA7 = sensor pin
    bcf     TRISB, 3            ; RB3 = onboard LED
    bcf     TRISB, 6            ; RB6 = UART debug output
    bcf     TRISB, 7            ; RB7 = ISB cubby output
    clrf    ANSEL               ; ANSEL is same bank as TRISA
    
    banksel PORTA
    bsf     PORTA, 7            ; Discharge capacitor on sensor pin when configured as an output
    bcf     PORTB, 7            ; Default is soldering iron is in the holder


loop:
    banksel count               ; Debugging
    movf    count, w
    movwf   tx_buf
    call    uart_tx
    clrf    count

    banksel TRISA
    bcf     TRISA, 7            ; Sensor pin output

    banksel PORTA
    bsf     PORTA, 7            ; Set pin output state

    call    dsensor             ; Wait to discharge capacitor

    banksel TRISA
    bsf     TRISA, 7            ; Sensor pin input

    banksel count


wait:
    incfsz  count
    goto    continue
    goto    iron_off            ; Value overflowed, so iron is definitely off
continue:
    call    duart               ; Delay value should be tuned so that iron off overflows and iron on is a low value
    call    duart
    btfss   PORTA, 7            ; If RA7 = 1 -> goto wait, RA7 = 0 -> goto iron_on
    goto    iron_on
    goto    wait
iron_off:                       ; Soldering iron is resting in the holder
    banksel PORTB
    bsf     PORTB, 3
    bsf     PORTB, 7
    banksel TRISB
    bsf     TRISB, 7            ; HiZ on RB7, simulate switch opening
    goto    loop
iron_on:                        ; Soldering iron is not resting in the holder
    banksel PORTB
    bcf     PORTB, 3
    banksel TRISB
    bcf     TRISB, 7            ; Re-configure pin as output
    banksel PORTB
    bcf     PORTB, 7            ; Make sure it is low, simulate switch closing
    goto    loop


;-------------------------------------------------
; Delay routine (Charge sensor)
;-------------------------------------------------
dsensor:
    banksel d1
    movlw   10
    movwf   d1
dsensor1:
    movlw   255
    movwf   d2
dsensor2:
    decfsz  d2, f
    goto    dsensor2
    decfsz  d1, f
    goto    dsensor1
    return


;-------------------------------------------------
; Delay routine (UART - 9600 bps @ 8 MHz)
;-------------------------------------------------
duart:
    movlw   65
    movwf   d1                  ; Banksel is not needed because banksel tx_buf is called in uart_tx already
duart1:
    decfsz  d1, f
    goto    duart1
    return


;-------------------------------------------------
; UART transmit routine
;-------------------------------------------------
uart_tx:
    banksel tx_buf

    call    set_tx              ; Ensure start bit is valid
    nop                         ; btfsc + btfss takes 3 cycles, one call instruction takes 2 cycles
    nop
    nop
    nop
    nop
    call    duart
    
    call    clr_tx              ; Start bit
    nop                         ; btfsc + btfss takes 3 cycles, one call instruction takes 2 cycles
    nop
    nop
    nop
    nop
    call    duart

    btfsc   tx_buf, 0
    call    set_tx
    btfss   tx_buf, 0
    call    clr_tx
    call    duart

    btfsc   tx_buf, 1
    call    set_tx
    btfss   tx_buf, 1
    call    clr_tx
    call    duart

    btfsc   tx_buf, 2
    call    set_tx
    btfss   tx_buf, 2
    call    clr_tx
    call    duart

    btfsc   tx_buf, 3
    call    set_tx
    btfss   tx_buf, 3
    call    clr_tx
    call    duart

    btfsc   tx_buf, 4
    call    set_tx
    btfss   tx_buf, 4
    call    clr_tx
    call    duart

    btfsc   tx_buf, 5
    call    set_tx
    btfss   tx_buf, 5
    call    clr_tx
    call    duart

    btfsc   tx_buf, 6
    call    set_tx
    btfss   tx_buf, 6
    call    clr_tx
    call    duart

    btfsc   tx_buf, 7
    call    set_tx
    btfss   tx_buf, 7
    call    clr_tx
    call    duart

    call    set_tx              ; Stop bit
    nop                         ; btfsc + btfss takes 3 cycles, one call instruction takes 2 cycles
    nop
    nop
    nop
    nop
    call    duart

    return

set_tx:
    bsf     PORTB, 6
    return
clr_tx:
    bcf     PORTB, 6
    return


END reset_vec