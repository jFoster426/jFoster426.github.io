// PA8 is PAD0 (TX)
PORT->Group[0].DIRSET.reg = (1 << 8);
PORT->Group[0].PINCFG[8].reg |= PORT_PINCFG_PMUXEN;
PORT->Group[0].PMUX[8 >> 1].bit.PMUXE = PORT_PMUX_PMUXE_C_Val;

// PA6 is PAD2 (RX)
PORT->Group[0].DIRCLR.reg = (1 << 6);
PORT->Group[0].PINCFG[6].reg &= ~PORT_PINCFG_PULLEN;
PORT->Group[0].PINCFG[6].reg |= PORT_PINCFG_PMUXEN;
PORT->Group[0].PMUX[6 >> 1].bit.PMUXE = PORT_PMUX_PMUXE_D_Val;