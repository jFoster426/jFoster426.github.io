#define CS     1  // PD1
#define CLK    2  // PD2
#define DI     3  // PD3
#define LDAC   0  // PD0

#define LED    8  // PB0
#define RING   9  // PB1
#define COIL   A5 // PC5

void setup() {
  pinMode(CS, OUTPUT);
  pinMode(LDAC, OUTPUT);
  pinMode(CLK, OUTPUT);
  pinMode(DI, OUTPUT);
  pinMode(LED, OUTPUT);
  pinMode(COIL, OUTPUT);
  pinMode(RING, INPUT);

  digitalWrite(CS, HIGH);
  digitalWrite(LDAC, HIGH);

  // Serial.begin(115200);

  // for (int j = 0; j < 256; j++) {
  //   Serial.print(1000 + int(300 * sin(2.0 * PI * float(j) / 256.0)));
  //   Serial.print(", ");
  //   if (j % 16 == 15) Serial.println();
  // }
}

const uint16_t SIN_WT[256] = {
  1000, 1007, 1014, 1022, 1029, 1036, 1044, 1051, 1058, 1065, 1072, 1080, 1087, 1094, 1101, 1107, 
  1114, 1121, 1128, 1134, 1141, 1147, 1154, 1160, 1166, 1172, 1178, 1184, 1190, 1195, 1201, 1206, 
  1212, 1217, 1222, 1227, 1231, 1236, 1240, 1245, 1249, 1253, 1257, 1261, 1264, 1267, 1271, 1274, 
  1277, 1279, 1282, 1284, 1287, 1289, 1291, 1292, 1294, 1295, 1296, 1297, 1298, 1299, 1299, 1299, 
  1300, 1299, 1299, 1299, 1298, 1297, 1296, 1295, 1294, 1292, 1291, 1289, 1287, 1284, 1282, 1279, 
  1277, 1274, 1271, 1267, 1264, 1261, 1257, 1253, 1249, 1245, 1240, 1236, 1231, 1227, 1222, 1217, 
  1212, 1206, 1201, 1195, 1190, 1184, 1178, 1172, 1166, 1160, 1154, 1147, 1141, 1134, 1128, 1121, 
  1114, 1107, 1101, 1094, 1087, 1080, 1072, 1065, 1058, 1051, 1044, 1036, 1029, 1022, 1014, 1007, 
  1000, 993, 986, 978, 971, 964, 956, 949, 942, 935, 928, 920, 913, 906, 899, 893, 
  886, 879, 872, 866, 859, 853, 846, 840, 834, 828, 822, 816, 810, 805, 799, 794, 
  788, 783, 778, 773, 769, 764, 760, 755, 751, 747, 743, 739, 736, 733, 729, 726, 
  723, 721, 718, 716, 713, 711, 709, 708, 706, 705, 704, 703, 702, 701, 701, 701, 
  700, 701, 701, 701, 702, 703, 704, 705, 706, 708, 709, 711, 713, 716, 718, 721, 
  723, 726, 729, 733, 736, 739, 743, 747, 751, 755, 760, 764, 769, 773, 778, 783, 
  788, 794, 799, 805, 810, 816, 822, 828, 834, 840, 846, 853, 859, 866, 872, 879, 
  886, 893, 899, 906, 913, 920, 928, 935, 942, 949, 956, 964, 971, 978, 986, 993
};

uint8_t i = 0;
uint8_t j = 0;

// i++ gives 365.0 Hz
// need 1477 Hz and 852 Hz for #9 DTMF

void loop() {
  while (digitalRead(RING) == 1);
  digitalWrite(LED, HIGH);
  digitalWrite(COIL, HIGH);
  delay(100);
  for (int k = 0; k < 5000; k++) {
    dac_write_16(SIN_WT[i += 17] + SIN_WT[j += 30]);
  }
  digitalWrite(LED, LOW);
  digitalWrite(COIL, LOW);
}

void dac_write_16(uint16_t outbuf) {
  // CS = 0
  PORTD &= ~(1 << CS);
  PORTD &= ~(1 << DI);
  // 15
  PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 14
  PORTD |= (1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 13
  PORTD |= (1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 12
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  PORTD |= (1 << DI);
  // 11
  outbuf & (1 << 11) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 10
  outbuf & (1 << 10) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 9
  outbuf & (1 << 9) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 8
  outbuf & (1 << 8) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 7
  outbuf & (1 << 7) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 6
  outbuf & (1 << 6) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 5
  outbuf & (1 << 5) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 4
  outbuf & (1 << 4) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 3
  outbuf & (1 << 3) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 2
  outbuf & (1 << 2) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 1
  outbuf & (1 << 1) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // 0
  outbuf & (1 << 0) ? PORTD |= (1 << DI) : PORTD &= ~(1 << DI);
  PORTD |= (1 << CLK);
  PORTD &= ~(1 << CLK);
  // CS = 1, LDAC pulse
  PORTD |= (1 << CS);
  PORTD &= ~(1 << LDAC);
  PORTD |= (1 << LDAC);
  // Delay
  for (int i = 0; i < 213; i++) {
    asm volatile("Nop");
  }
}
