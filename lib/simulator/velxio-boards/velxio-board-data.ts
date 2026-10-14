/*
 * Pin/board geometry copied from Velxio (https://github.com/davidmonterocrespo24/velxio)
 * commit d5f016d4735df11af83c343dfab9b9a30582c11e, licensed AGPL-3.0, and from Wokwi's @wokwi/elements 1.9.2 (MIT)
 * which Velxio uses for the Arduino boards. Coordinates, pin order and pin names are
 * the upstream values (see `velxio`); only `name` was set to the SolderHub pin id
 * so existing saved wires keep working. Do not hand-edit; regenerate instead.
 * Coordinates are in each board's native frame (Wokwi px for Arduino boards, Velxio px
 * for the rest). Scaling/rotation is applied in layouts.ts.
 */
export interface VelxioBoardPin { name: string; velxio: string; x: number; y: number }
export interface VelxioBoardData { type: string; art: string; width: number; height: number; source: string; pins: VelxioBoardPin[] }
export const VELXIO_BOARD_DATA: Record<string, VelxioBoardData> = {
  "arduino-uno": {
    "type": "arduino-uno",
    "art": "/third-party/velxio/arduino-uno.svg",
    "width": 274.32,
    "height": 201.6,
    "source": "Wokwi @wokwi/elements 1.9.2 (MIT) pinInfo, as used by Velxio",
    "pins": [
      {
        "name": "D0",
        "velxio": "0",
        "x": 255.5,
        "y": 9
      },
      {
        "name": "D1",
        "velxio": "1",
        "x": 246,
        "y": 9
      },
      {
        "name": "D2",
        "velxio": "2",
        "x": 236.5,
        "y": 9
      },
      {
        "name": "D3",
        "velxio": "3",
        "x": 227,
        "y": 9
      },
      {
        "name": "D4",
        "velxio": "4",
        "x": 217.5,
        "y": 9
      },
      {
        "name": "D5",
        "velxio": "5",
        "x": 208,
        "y": 9
      },
      {
        "name": "D6",
        "velxio": "6",
        "x": 198.5,
        "y": 9
      },
      {
        "name": "D7",
        "velxio": "7",
        "x": 189,
        "y": 9
      },
      {
        "name": "D8",
        "velxio": "8",
        "x": 173,
        "y": 9
      },
      {
        "name": "D9",
        "velxio": "9",
        "x": 163,
        "y": 9
      },
      {
        "name": "D10",
        "velxio": "10",
        "x": 153.5,
        "y": 9
      },
      {
        "name": "D11",
        "velxio": "11",
        "x": 144,
        "y": 9
      },
      {
        "name": "D12",
        "velxio": "12",
        "x": 134.5,
        "y": 9
      },
      {
        "name": "D13",
        "velxio": "13",
        "x": 125,
        "y": 9
      },
      {
        "name": "A0",
        "velxio": "A0",
        "x": 208,
        "y": 191.5
      },
      {
        "name": "A1",
        "velxio": "A1",
        "x": 217.5,
        "y": 191.5
      },
      {
        "name": "A2",
        "velxio": "A2",
        "x": 227,
        "y": 191.5
      },
      {
        "name": "A3",
        "velxio": "A3",
        "x": 236.5,
        "y": 191.5
      },
      {
        "name": "A4",
        "velxio": "A4",
        "x": 246,
        "y": 191.5
      },
      {
        "name": "A5",
        "velxio": "A5",
        "x": 255.5,
        "y": 191.5
      },
      {
        "name": "5V",
        "velxio": "5V",
        "x": 160,
        "y": 191.5
      },
      {
        "name": "3.3V",
        "velxio": "3.3V",
        "x": 150,
        "y": 191.5
      },
      {
        "name": "GND1",
        "velxio": "GND.2",
        "x": 169.5,
        "y": 191.5
      },
      {
        "name": "GND2",
        "velxio": "GND.3",
        "x": 179,
        "y": 191.5
      },
      {
        "name": "VIN",
        "velxio": "VIN",
        "x": 188.5,
        "y": 191.5
      },
      {
        "name": "SCL",
        "velxio": "A5.2",
        "x": 87,
        "y": 9
      },
      {
        "name": "SDA",
        "velxio": "A4.2",
        "x": 97,
        "y": 9
      },
      {
        "name": "AREF",
        "velxio": "AREF",
        "x": 106,
        "y": 9
      },
      {
        "name": "GND3",
        "velxio": "GND.1",
        "x": 115.5,
        "y": 9
      },
      {
        "name": "IOREF",
        "velxio": "IOREF",
        "x": 131,
        "y": 191.5
      },
      {
        "name": "RESET",
        "velxio": "RESET",
        "x": 140.5,
        "y": 191.5
      }
    ]
  },
  "arduino-nano": {
    "type": "arduino-nano",
    "art": "/third-party/velxio/arduino-nano.svg",
    "width": 169.7,
    "height": 67.28,
    "source": "Wokwi @wokwi/elements 1.9.2 (MIT) pinInfo, as used by Velxio",
    "pins": [
      {
        "name": "D13",
        "velxio": "13",
        "x": 19.7,
        "y": 62.4
      },
      {
        "name": "3V3",
        "velxio": "3.3V",
        "x": 29.3,
        "y": 62.4
      },
      {
        "name": "AREF",
        "velxio": "AREF",
        "x": 38.9,
        "y": 62.4
      },
      {
        "name": "A0",
        "velxio": "A0",
        "x": 48.5,
        "y": 62.4
      },
      {
        "name": "A1",
        "velxio": "A1",
        "x": 58.1,
        "y": 62.4
      },
      {
        "name": "A2",
        "velxio": "A2",
        "x": 67.7,
        "y": 62.4
      },
      {
        "name": "A3",
        "velxio": "A3",
        "x": 77.3,
        "y": 62.4
      },
      {
        "name": "A4",
        "velxio": "A4",
        "x": 86.9,
        "y": 62.4
      },
      {
        "name": "A5",
        "velxio": "A5",
        "x": 96.5,
        "y": 62.4
      },
      {
        "name": "A6",
        "velxio": "A6",
        "x": 106.1,
        "y": 62.4
      },
      {
        "name": "A7",
        "velxio": "A7",
        "x": 115.7,
        "y": 62.4
      },
      {
        "name": "5V",
        "velxio": "5V",
        "x": 125.3,
        "y": 62.4
      },
      {
        "name": "RST",
        "velxio": "RESET",
        "x": 134.9,
        "y": 62.4
      },
      {
        "name": "GND",
        "velxio": "GND.1",
        "x": 144.5,
        "y": 62.4
      },
      {
        "name": "VIN",
        "velxio": "VIN",
        "x": 154.1,
        "y": 62.4
      },
      {
        "name": "D12",
        "velxio": "12",
        "x": 19.7,
        "y": 4.8
      },
      {
        "name": "D11",
        "velxio": "11",
        "x": 29.3,
        "y": 4.8
      },
      {
        "name": "D10",
        "velxio": "10",
        "x": 38.9,
        "y": 4.8
      },
      {
        "name": "D9",
        "velxio": "9",
        "x": 48.5,
        "y": 4.8
      },
      {
        "name": "D8",
        "velxio": "8",
        "x": 58.1,
        "y": 4.8
      },
      {
        "name": "D7",
        "velxio": "7",
        "x": 67.7,
        "y": 4.8
      },
      {
        "name": "D6",
        "velxio": "6",
        "x": 77.3,
        "y": 4.8
      },
      {
        "name": "D5",
        "velxio": "5",
        "x": 86.9,
        "y": 4.8
      },
      {
        "name": "D4",
        "velxio": "4",
        "x": 96.5,
        "y": 4.8
      },
      {
        "name": "D3",
        "velxio": "3",
        "x": 106.1,
        "y": 4.8
      },
      {
        "name": "D2",
        "velxio": "2",
        "x": 115.7,
        "y": 4.8
      },
      {
        "name": "GND_2",
        "velxio": "GND.2",
        "x": 125.3,
        "y": 4.8
      },
      {
        "name": "RST_2",
        "velxio": "RESET.2",
        "x": 134.9,
        "y": 4.8
      },
      {
        "name": "RX",
        "velxio": "0",
        "x": 144.5,
        "y": 4.8
      },
      {
        "name": "TX",
        "velxio": "1",
        "x": 154.1,
        "y": 4.8
      },
      {
        "name": "D12_2",
        "velxio": "12.2",
        "x": 163.7,
        "y": 43.2
      },
      {
        "name": "D13_2",
        "velxio": "13.2",
        "x": 163.7,
        "y": 33.6
      },
      {
        "name": "RST_3",
        "velxio": "RESET.3",
        "x": 163.7,
        "y": 24
      }
    ]
  },
  "arduino-mega": {
    "type": "arduino-mega",
    "art": "/third-party/velxio/arduino-mega.svg",
    "width": 388.01,
    "height": 192,
    "source": "Wokwi @wokwi/elements 1.9.2 (MIT) pinInfo, as used by Velxio",
    "pins": [
      {
        "name": "IOREF",
        "velxio": "IOREF",
        "x": 136,
        "y": 184.5
      },
      {
        "name": "RESET",
        "velxio": "RESET",
        "x": 145.5,
        "y": 184.5
      },
      {
        "name": "3V3",
        "velxio": "3.3V",
        "x": 155,
        "y": 184.5
      },
      {
        "name": "5V",
        "velxio": "5V",
        "x": 164.5,
        "y": 184.5
      },
      {
        "name": "GND",
        "velxio": "GND.2",
        "x": 174.25,
        "y": 184.5
      },
      {
        "name": "GND_2",
        "velxio": "GND.3",
        "x": 183.75,
        "y": 184.5
      },
      {
        "name": "VIN",
        "velxio": "VIN",
        "x": 193.5,
        "y": 184.5
      },
      {
        "name": "A0",
        "velxio": "A0",
        "x": 208.5,
        "y": 184.5
      },
      {
        "name": "A1",
        "velxio": "A1",
        "x": 218,
        "y": 184.5
      },
      {
        "name": "A2",
        "velxio": "A2",
        "x": 227.5,
        "y": 184.5
      },
      {
        "name": "A3",
        "velxio": "A3",
        "x": 237.25,
        "y": 184.5
      },
      {
        "name": "A4",
        "velxio": "A4",
        "x": 246.75,
        "y": 184.5
      },
      {
        "name": "A5",
        "velxio": "A5",
        "x": 256.25,
        "y": 184.5
      },
      {
        "name": "A6",
        "velxio": "A6",
        "x": 266,
        "y": 184.5
      },
      {
        "name": "A7",
        "velxio": "A7",
        "x": 275.5,
        "y": 184.5
      },
      {
        "name": "A8",
        "velxio": "A8",
        "x": 290.25,
        "y": 184.5
      },
      {
        "name": "A9",
        "velxio": "A9",
        "x": 300,
        "y": 184.5
      },
      {
        "name": "A10",
        "velxio": "A10",
        "x": 309.5,
        "y": 184.5
      },
      {
        "name": "A11",
        "velxio": "A11",
        "x": 319.25,
        "y": 184.5
      },
      {
        "name": "A12",
        "velxio": "A12",
        "x": 328.75,
        "y": 184.5
      },
      {
        "name": "A13",
        "velxio": "A13",
        "x": 338.5,
        "y": 184.5
      },
      {
        "name": "A14",
        "velxio": "A14",
        "x": 348,
        "y": 184.5
      },
      {
        "name": "A15",
        "velxio": "A15",
        "x": 357.75,
        "y": 184.5
      },
      {
        "name": "D22",
        "velxio": "22",
        "x": 361,
        "y": 17.5
      },
      {
        "name": "D24",
        "velxio": "24",
        "x": 361,
        "y": 27.25
      },
      {
        "name": "D26",
        "velxio": "26",
        "x": 361,
        "y": 36.75
      },
      {
        "name": "D28",
        "velxio": "28",
        "x": 361,
        "y": 46.25
      },
      {
        "name": "D30",
        "velxio": "30",
        "x": 361,
        "y": 56
      },
      {
        "name": "D32",
        "velxio": "32",
        "x": 361,
        "y": 65.5
      },
      {
        "name": "D34",
        "velxio": "34",
        "x": 361,
        "y": 75
      },
      {
        "name": "D36",
        "velxio": "36",
        "x": 361,
        "y": 84.5
      },
      {
        "name": "D38",
        "velxio": "38",
        "x": 361,
        "y": 94.25
      },
      {
        "name": "D40",
        "velxio": "40",
        "x": 361,
        "y": 103.75
      },
      {
        "name": "D42",
        "velxio": "42",
        "x": 361,
        "y": 113.5
      },
      {
        "name": "D44",
        "velxio": "44",
        "x": 361,
        "y": 123
      },
      {
        "name": "D46",
        "velxio": "46",
        "x": 361,
        "y": 132.75
      },
      {
        "name": "D48",
        "velxio": "48",
        "x": 361,
        "y": 142.25
      },
      {
        "name": "D50",
        "velxio": "50",
        "x": 361,
        "y": 152
      },
      {
        "name": "D52",
        "velxio": "52",
        "x": 361,
        "y": 161.5
      },
      {
        "name": "D0",
        "velxio": "0",
        "x": 257.5,
        "y": 9
      },
      {
        "name": "D1",
        "velxio": "1",
        "x": 247.5,
        "y": 9
      },
      {
        "name": "D2",
        "velxio": "2",
        "x": 238,
        "y": 9
      },
      {
        "name": "D3",
        "velxio": "3",
        "x": 228.5,
        "y": 9
      },
      {
        "name": "D4",
        "velxio": "4",
        "x": 219,
        "y": 9
      },
      {
        "name": "D5",
        "velxio": "5",
        "x": 209.5,
        "y": 9
      },
      {
        "name": "D6",
        "velxio": "6",
        "x": 200,
        "y": 9
      },
      {
        "name": "D7",
        "velxio": "7",
        "x": 190,
        "y": 9
      },
      {
        "name": "D8",
        "velxio": "8",
        "x": 177,
        "y": 9
      },
      {
        "name": "D9",
        "velxio": "9",
        "x": 167.5,
        "y": 9
      },
      {
        "name": "D10",
        "velxio": "10",
        "x": 157.5,
        "y": 9
      },
      {
        "name": "D11",
        "velxio": "11",
        "x": 148,
        "y": 9
      },
      {
        "name": "D12",
        "velxio": "12",
        "x": 138,
        "y": 9
      },
      {
        "name": "D13",
        "velxio": "13",
        "x": 129,
        "y": 9
      },
      {
        "name": "D14",
        "velxio": "14",
        "x": 270.5,
        "y": 9
      },
      {
        "name": "D15",
        "velxio": "15",
        "x": 280,
        "y": 9
      },
      {
        "name": "D16",
        "velxio": "16",
        "x": 289.5,
        "y": 9
      },
      {
        "name": "D17",
        "velxio": "17",
        "x": 299,
        "y": 9
      },
      {
        "name": "D18",
        "velxio": "18",
        "x": 308.5,
        "y": 9
      },
      {
        "name": "D19",
        "velxio": "19",
        "x": 318.5,
        "y": 9
      },
      {
        "name": "D20",
        "velxio": "20",
        "x": 328,
        "y": 9
      },
      {
        "name": "D21",
        "velxio": "21",
        "x": 337.5,
        "y": 9
      },
      {
        "name": "D23",
        "velxio": "23",
        "x": 371,
        "y": 17.5
      },
      {
        "name": "D25",
        "velxio": "25",
        "x": 371,
        "y": 27.25
      },
      {
        "name": "D27",
        "velxio": "27",
        "x": 371,
        "y": 36.75
      },
      {
        "name": "D29",
        "velxio": "29",
        "x": 371,
        "y": 46.25
      },
      {
        "name": "D31",
        "velxio": "31",
        "x": 371,
        "y": 56
      },
      {
        "name": "D33",
        "velxio": "33",
        "x": 371,
        "y": 65.5
      },
      {
        "name": "D35",
        "velxio": "35",
        "x": 371,
        "y": 75
      },
      {
        "name": "D37",
        "velxio": "37",
        "x": 371,
        "y": 84.5
      },
      {
        "name": "D39",
        "velxio": "39",
        "x": 371,
        "y": 94.25
      },
      {
        "name": "D41",
        "velxio": "41",
        "x": 371,
        "y": 103.75
      },
      {
        "name": "D43",
        "velxio": "43",
        "x": 371,
        "y": 113.5
      },
      {
        "name": "D45",
        "velxio": "45",
        "x": 371,
        "y": 123
      },
      {
        "name": "D47",
        "velxio": "47",
        "x": 371,
        "y": 132.75
      },
      {
        "name": "D49",
        "velxio": "49",
        "x": 371,
        "y": 142.25
      },
      {
        "name": "D51",
        "velxio": "51",
        "x": 371,
        "y": 152
      },
      {
        "name": "D53",
        "velxio": "53",
        "x": 371,
        "y": 161.5
      },
      {
        "name": "SCL",
        "velxio": "SCL",
        "x": 90,
        "y": 9
      },
      {
        "name": "SDA",
        "velxio": "SDA",
        "x": 100,
        "y": 9
      },
      {
        "name": "AREF",
        "velxio": "AREF",
        "x": 109,
        "y": 9
      },
      {
        "name": "GND_3",
        "velxio": "GND.1",
        "x": 119,
        "y": 9
      },
      {
        "name": "5V_2",
        "velxio": "5V.1",
        "x": 361,
        "y": 8
      },
      {
        "name": "5V_3",
        "velxio": "5V.2",
        "x": 371,
        "y": 8
      },
      {
        "name": "GND_4",
        "velxio": "GND.4",
        "x": 361,
        "y": 171.25
      },
      {
        "name": "GND_5",
        "velxio": "GND.5",
        "x": 371,
        "y": 171.25
      }
    ]
  },
  "esp32-c3": {
    "type": "esp32-c3",
    "art": "/third-party/velxio/esp32-c3.svg",
    "width": 127,
    "height": 215,
    "source": "Velxio frontend/src/components/velxio-components/Esp32Element.ts PINS_ESP32_C3",
    "pins": [
      {
        "name": "GND",
        "velxio": "GND.1",
        "x": 5,
        "y": 26
      },
      {
        "name": "3V3",
        "velxio": "3V3.1",
        "x": 5,
        "y": 39
      },
      {
        "name": "3V3_2",
        "velxio": "3V3.2",
        "x": 5,
        "y": 51
      },
      {
        "name": "GPIO2",
        "velxio": "2",
        "x": 5,
        "y": 64
      },
      {
        "name": "GPIO3",
        "velxio": "3",
        "x": 5,
        "y": 77
      },
      {
        "name": "GND_2",
        "velxio": "GND.2",
        "x": 5,
        "y": 89
      },
      {
        "name": "EN",
        "velxio": "RST",
        "x": 5,
        "y": 102
      },
      {
        "name": "GND_3",
        "velxio": "GND.3",
        "x": 5,
        "y": 115
      },
      {
        "name": "GPIO0",
        "velxio": "0",
        "x": 5,
        "y": 127
      },
      {
        "name": "GPIO1",
        "velxio": "1",
        "x": 5,
        "y": 140
      },
      {
        "name": "GPIO10",
        "velxio": "10",
        "x": 5,
        "y": 153
      },
      {
        "name": "GND_4",
        "velxio": "GND.4",
        "x": 5,
        "y": 166
      },
      {
        "name": "5V",
        "velxio": "5V.1",
        "x": 5,
        "y": 178
      },
      {
        "name": "5V_2",
        "velxio": "5V.2",
        "x": 5,
        "y": 191
      },
      {
        "name": "GND_5",
        "velxio": "GND.5",
        "x": 5,
        "y": 204
      },
      {
        "name": "GND_6",
        "velxio": "GND.10",
        "x": 121,
        "y": 26
      },
      {
        "name": "TX",
        "velxio": "TX",
        "x": 121,
        "y": 39
      },
      {
        "name": "RX",
        "velxio": "RX",
        "x": 121,
        "y": 51
      },
      {
        "name": "GND_7",
        "velxio": "GND.9",
        "x": 121,
        "y": 64
      },
      {
        "name": "GPIO9",
        "velxio": "9",
        "x": 121,
        "y": 77
      },
      {
        "name": "GPIO8",
        "velxio": "8",
        "x": 121,
        "y": 89
      },
      {
        "name": "GND_8",
        "velxio": "GND.8",
        "x": 121,
        "y": 102
      },
      {
        "name": "GPIO7",
        "velxio": "7",
        "x": 121,
        "y": 115
      },
      {
        "name": "GPIO6",
        "velxio": "6",
        "x": 121,
        "y": 127
      },
      {
        "name": "GPIO5",
        "velxio": "5",
        "x": 121,
        "y": 140
      },
      {
        "name": "GPIO4",
        "velxio": "4",
        "x": 121,
        "y": 153
      },
      {
        "name": "GND_9",
        "velxio": "GND.7",
        "x": 121,
        "y": 166
      },
      {
        "name": "GPIO18",
        "velxio": "18",
        "x": 121,
        "y": 178
      },
      {
        "name": "GPIO19",
        "velxio": "19",
        "x": 121,
        "y": 191
      },
      {
        "name": "GND_10",
        "velxio": "GND.6",
        "x": 121,
        "y": 204
      }
    ]
  },
  "stm32-blue-pill": {
    "type": "stm32-blue-pill",
    "art": "/third-party/velxio/stm32-bluepill.svg",
    "width": 114,
    "height": 271,
    "source": "Velxio frontend/src/components/velxio-components/Stm32BluePillElement.ts BLUEPILL_PINS",
    "pins": [
      {
        "name": "PB12",
        "velxio": "PB12",
        "x": 18,
        "y": 14
      },
      {
        "name": "PB13",
        "velxio": "PB13",
        "x": 18,
        "y": 27
      },
      {
        "name": "PB14",
        "velxio": "PB14",
        "x": 18,
        "y": 40
      },
      {
        "name": "PB15",
        "velxio": "PB15",
        "x": 18,
        "y": 53
      },
      {
        "name": "PA8",
        "velxio": "PA8",
        "x": 18,
        "y": 65
      },
      {
        "name": "PA9",
        "velxio": "PA9",
        "x": 18,
        "y": 78
      },
      {
        "name": "PA10",
        "velxio": "PA10",
        "x": 18,
        "y": 91
      },
      {
        "name": "PA11",
        "velxio": "PA11",
        "x": 18,
        "y": 103
      },
      {
        "name": "PA12",
        "velxio": "PA12",
        "x": 18,
        "y": 116
      },
      {
        "name": "PA15",
        "velxio": "PA15",
        "x": 18,
        "y": 129
      },
      {
        "name": "PB3",
        "velxio": "PB3",
        "x": 18,
        "y": 142
      },
      {
        "name": "PB4",
        "velxio": "PB4",
        "x": 18,
        "y": 154
      },
      {
        "name": "PB5",
        "velxio": "PB5",
        "x": 18,
        "y": 167
      },
      {
        "name": "PB6",
        "velxio": "PB6",
        "x": 18,
        "y": 180
      },
      {
        "name": "PB7",
        "velxio": "PB7",
        "x": 18,
        "y": 192
      },
      {
        "name": "PB8",
        "velxio": "PB8",
        "x": 18,
        "y": 205
      },
      {
        "name": "PB9",
        "velxio": "PB9",
        "x": 18,
        "y": 218
      },
      {
        "name": "5V",
        "velxio": "5V",
        "x": 18,
        "y": 230
      },
      {
        "name": "GND",
        "velxio": "GND",
        "x": 18,
        "y": 243
      },
      {
        "name": "3V3",
        "velxio": "3V3",
        "x": 18,
        "y": 256
      },
      {
        "name": "GND_2",
        "velxio": "GND",
        "x": 96,
        "y": 14
      },
      {
        "name": "GND_3",
        "velxio": "GND",
        "x": 96,
        "y": 27
      },
      {
        "name": "3V3_2",
        "velxio": "3V3",
        "x": 96,
        "y": 40
      },
      {
        "name": "NRST",
        "velxio": "NRST",
        "x": 96,
        "y": 53
      },
      {
        "name": "PB11",
        "velxio": "PB11",
        "x": 96,
        "y": 65
      },
      {
        "name": "PB10",
        "velxio": "PB10",
        "x": 96,
        "y": 78
      },
      {
        "name": "PB1",
        "velxio": "PB1",
        "x": 96,
        "y": 91
      },
      {
        "name": "PB0",
        "velxio": "PB0",
        "x": 96,
        "y": 103
      },
      {
        "name": "PA7",
        "velxio": "PA7",
        "x": 96,
        "y": 116
      },
      {
        "name": "PA6",
        "velxio": "PA6",
        "x": 96,
        "y": 129
      },
      {
        "name": "PA5",
        "velxio": "PA5",
        "x": 96,
        "y": 142
      },
      {
        "name": "PA4",
        "velxio": "PA4",
        "x": 96,
        "y": 154
      },
      {
        "name": "PA3",
        "velxio": "PA3",
        "x": 96,
        "y": 167
      },
      {
        "name": "PA2",
        "velxio": "PA2",
        "x": 96,
        "y": 180
      },
      {
        "name": "PA1",
        "velxio": "PA1",
        "x": 96,
        "y": 192
      },
      {
        "name": "PA0",
        "velxio": "PA0",
        "x": 96,
        "y": 205
      },
      {
        "name": "PC15",
        "velxio": "PC15",
        "x": 96,
        "y": 218
      },
      {
        "name": "PC14",
        "velxio": "PC14",
        "x": 96,
        "y": 230
      },
      {
        "name": "PC13",
        "velxio": "PC13",
        "x": 96,
        "y": 243
      },
      {
        "name": "VBAT",
        "velxio": "VBAT",
        "x": 96,
        "y": 256
      }
    ]
  },
  "stm32-black-pill": {
    "type": "stm32-black-pill",
    "art": "/third-party/velxio/stm32-blackpill.svg",
    "width": 103,
    "height": 266,
    "source": "Velxio frontend/src/components/velxio-components/Stm32BluePillElement.ts BLACKPILL_PINS",
    "pins": [
      {
        "name": "VBAT",
        "velxio": "VBAT",
        "x": 13,
        "y": 16
      },
      {
        "name": "PC13",
        "velxio": "PC13",
        "x": 13,
        "y": 28
      },
      {
        "name": "PC14",
        "velxio": "PC14",
        "x": 13,
        "y": 41
      },
      {
        "name": "PC15",
        "velxio": "PC15",
        "x": 13,
        "y": 54
      },
      {
        "name": "NRST",
        "velxio": "NRST",
        "x": 13,
        "y": 67
      },
      {
        "name": "PA0",
        "velxio": "PA0",
        "x": 13,
        "y": 79
      },
      {
        "name": "PA1",
        "velxio": "PA1",
        "x": 13,
        "y": 92
      },
      {
        "name": "PA2",
        "velxio": "PA2",
        "x": 13,
        "y": 105
      },
      {
        "name": "PA3",
        "velxio": "PA3",
        "x": 13,
        "y": 117
      },
      {
        "name": "PA4",
        "velxio": "PA4",
        "x": 13,
        "y": 130
      },
      {
        "name": "PA5",
        "velxio": "PA5",
        "x": 13,
        "y": 143
      },
      {
        "name": "PA6",
        "velxio": "PA6",
        "x": 13,
        "y": 155
      },
      {
        "name": "PA7",
        "velxio": "PA7",
        "x": 13,
        "y": 168
      },
      {
        "name": "PB0",
        "velxio": "PB0",
        "x": 13,
        "y": 181
      },
      {
        "name": "PB1",
        "velxio": "PB1",
        "x": 13,
        "y": 194
      },
      {
        "name": "PB2",
        "velxio": "PB2",
        "x": 13,
        "y": 206
      },
      {
        "name": "PB10",
        "velxio": "PB10",
        "x": 13,
        "y": 219
      },
      {
        "name": "3V3",
        "velxio": "3V3",
        "x": 13,
        "y": 232
      },
      {
        "name": "GND",
        "velxio": "GND",
        "x": 13,
        "y": 244
      },
      {
        "name": "5V",
        "velxio": "5V",
        "x": 13,
        "y": 257
      },
      {
        "name": "3V3_2",
        "velxio": "3V3",
        "x": 89,
        "y": 14
      },
      {
        "name": "GND_2",
        "velxio": "GND",
        "x": 89,
        "y": 27
      },
      {
        "name": "5V_2",
        "velxio": "5V",
        "x": 89,
        "y": 40
      },
      {
        "name": "PB9",
        "velxio": "PB9",
        "x": 89,
        "y": 53
      },
      {
        "name": "PB8",
        "velxio": "PB8",
        "x": 89,
        "y": 65
      },
      {
        "name": "PB7",
        "velxio": "PB7",
        "x": 89,
        "y": 78
      },
      {
        "name": "PB6",
        "velxio": "PB6",
        "x": 89,
        "y": 91
      },
      {
        "name": "PB5",
        "velxio": "PB5",
        "x": 89,
        "y": 103
      },
      {
        "name": "PB4",
        "velxio": "PB4",
        "x": 89,
        "y": 116
      },
      {
        "name": "PB3",
        "velxio": "PB3",
        "x": 89,
        "y": 129
      },
      {
        "name": "PA15",
        "velxio": "PA15",
        "x": 89,
        "y": 142
      },
      {
        "name": "PA12",
        "velxio": "PA12",
        "x": 89,
        "y": 154
      },
      {
        "name": "PA11",
        "velxio": "PA11",
        "x": 89,
        "y": 167
      },
      {
        "name": "PA10",
        "velxio": "PA10",
        "x": 89,
        "y": 180
      },
      {
        "name": "PA9",
        "velxio": "PA9",
        "x": 89,
        "y": 192
      },
      {
        "name": "PA8",
        "velxio": "PA8",
        "x": 89,
        "y": 205
      },
      {
        "name": "PB15",
        "velxio": "PB15",
        "x": 89,
        "y": 218
      },
      {
        "name": "PB14",
        "velxio": "PB14",
        "x": 89,
        "y": 230
      },
      {
        "name": "PB13",
        "velxio": "PB13",
        "x": 89,
        "y": 243
      },
      {
        "name": "PB12",
        "velxio": "PB12",
        "x": 89,
        "y": 256
      }
    ]
  },
  "raspberry-pi-pico": {
    "type": "raspberry-pi-pico",
    "art": "/third-party/velxio/pi-pico.svg",
    "width": 105,
    "height": 264,
    "source": "Velxio frontend/src/components/velxio-components/PiPicoWElement.ts PINS_PI_PICO_W (Pico W header = Pico header)",
    "pins": [
      {
        "name": "GP0",
        "velxio": "GP0",
        "x": 8,
        "y": 17
      },
      {
        "name": "GP1",
        "velxio": "GP1",
        "x": 8,
        "y": 30
      },
      {
        "name": "GND",
        "velxio": "GND.1",
        "x": 8,
        "y": 42
      },
      {
        "name": "GP2",
        "velxio": "GP2",
        "x": 8,
        "y": 55
      },
      {
        "name": "GP3",
        "velxio": "GP3",
        "x": 8,
        "y": 68
      },
      {
        "name": "GP4",
        "velxio": "GP4",
        "x": 8,
        "y": 81
      },
      {
        "name": "GP5",
        "velxio": "GP5",
        "x": 8,
        "y": 93
      },
      {
        "name": "GND_2",
        "velxio": "GND.2",
        "x": 8,
        "y": 106
      },
      {
        "name": "GP6",
        "velxio": "GP6",
        "x": 8,
        "y": 119
      },
      {
        "name": "GP7",
        "velxio": "GP7",
        "x": 8,
        "y": 131
      },
      {
        "name": "GP8",
        "velxio": "GP8",
        "x": 8,
        "y": 144
      },
      {
        "name": "GP9",
        "velxio": "GP9",
        "x": 8,
        "y": 157
      },
      {
        "name": "GND_3",
        "velxio": "GND.3",
        "x": 8,
        "y": 169
      },
      {
        "name": "GP10",
        "velxio": "GP10",
        "x": 8,
        "y": 182
      },
      {
        "name": "GP11",
        "velxio": "GP11",
        "x": 8,
        "y": 195
      },
      {
        "name": "GP12",
        "velxio": "GP12",
        "x": 8,
        "y": 207
      },
      {
        "name": "GP13",
        "velxio": "GP13",
        "x": 8,
        "y": 220
      },
      {
        "name": "GND_4",
        "velxio": "GND.4",
        "x": 8,
        "y": 233
      },
      {
        "name": "GP14",
        "velxio": "GP14",
        "x": 8,
        "y": 246
      },
      {
        "name": "GP15",
        "velxio": "GP15",
        "x": 8,
        "y": 258
      },
      {
        "name": "VBUS",
        "velxio": "VBUS",
        "x": 97,
        "y": 17
      },
      {
        "name": "VSYS",
        "velxio": "VSYS",
        "x": 97,
        "y": 30
      },
      {
        "name": "GND_5",
        "velxio": "GND.5",
        "x": 97,
        "y": 233
      },
      {
        "name": "3V3_EN",
        "velxio": "3V3_EN",
        "x": 97,
        "y": 55
      },
      {
        "name": "3V3_OUT",
        "velxio": "3V3",
        "x": 97,
        "y": 68
      },
      {
        "name": "ADC_VREF",
        "velxio": "ADC_VREF",
        "x": 97,
        "y": 81
      },
      {
        "name": "GP28",
        "velxio": "GP28",
        "x": 97,
        "y": 93
      },
      {
        "name": "GND_6",
        "velxio": "GND.6",
        "x": 97,
        "y": 169
      },
      {
        "name": "GP27",
        "velxio": "GP27",
        "x": 97,
        "y": 119
      },
      {
        "name": "GP26",
        "velxio": "GP26",
        "x": 97,
        "y": 131
      },
      {
        "name": "RUN",
        "velxio": "RUN",
        "x": 97,
        "y": 144
      },
      {
        "name": "GP22",
        "velxio": "GP22",
        "x": 97,
        "y": 157
      },
      {
        "name": "GND_7",
        "velxio": "GND.7",
        "x": 97,
        "y": 106
      },
      {
        "name": "GP21",
        "velxio": "GP21",
        "x": 97,
        "y": 182
      },
      {
        "name": "GP20",
        "velxio": "GP20",
        "x": 97,
        "y": 195
      },
      {
        "name": "GP19",
        "velxio": "GP19",
        "x": 97,
        "y": 207
      },
      {
        "name": "GP18",
        "velxio": "GP18",
        "x": 97,
        "y": 220
      },
      {
        "name": "GND_8",
        "velxio": "GND.8",
        "x": 97,
        "y": 42
      },
      {
        "name": "GP17",
        "velxio": "GP17",
        "x": 97,
        "y": 246
      },
      {
        "name": "GP16",
        "velxio": "GP16",
        "x": 97,
        "y": 258
      },
      {
        "name": "GP25",
        "velxio": "GP25",
        "x": 40,
        "y": 14
      }
    ]
  },
  "esp32-devkit": {
    "type": "esp32-devkit",
    "art": "/third-party/velxio/esp32-devkit-c-v4.svg",
    "width": 140,
    "height": 283,
    "source": "Velxio frontend/src/components/velxio-components/Esp32Element.ts PINS_ESP32_DEVKIT_C_V4",
    "pins": [
      {
        "name": "GND2",
        "velxio": "GND.2",
        "x": 133,
        "y": 38
      },
      {
        "name": "IO23",
        "velxio": "23",
        "x": 133,
        "y": 51
      },
      {
        "name": "IO22",
        "velxio": "22",
        "x": 133,
        "y": 64
      },
      {
        "name": "TXD0",
        "velxio": "TX",
        "x": 133,
        "y": 76
      },
      {
        "name": "RXD0",
        "velxio": "RX",
        "x": 133,
        "y": 89
      },
      {
        "name": "IO21",
        "velxio": "21",
        "x": 133,
        "y": 102
      },
      {
        "name": "GND3",
        "velxio": "GND.3",
        "x": 133,
        "y": 114
      },
      {
        "name": "IO19",
        "velxio": "19",
        "x": 133,
        "y": 127
      },
      {
        "name": "IO18",
        "velxio": "18",
        "x": 133,
        "y": 140
      },
      {
        "name": "IO5",
        "velxio": "5",
        "x": 133,
        "y": 152
      },
      {
        "name": "IO17",
        "velxio": "17",
        "x": 133,
        "y": 165
      },
      {
        "name": "IO16",
        "velxio": "16",
        "x": 133,
        "y": 178
      },
      {
        "name": "IO4",
        "velxio": "4",
        "x": 133,
        "y": 191
      },
      {
        "name": "IO0",
        "velxio": "0",
        "x": 133,
        "y": 203
      },
      {
        "name": "IO2",
        "velxio": "2",
        "x": 133,
        "y": 216
      },
      {
        "name": "IO15",
        "velxio": "15",
        "x": 133,
        "y": 229
      },
      {
        "name": "SD1",
        "velxio": "D1",
        "x": 133,
        "y": 241
      },
      {
        "name": "SD0",
        "velxio": "D0",
        "x": 133,
        "y": 254
      },
      {
        "name": "SCK",
        "velxio": "CLK",
        "x": 133,
        "y": 267
      },
      {
        "name": "3V3",
        "velxio": "3V3",
        "x": 6,
        "y": 38
      },
      {
        "name": "RST",
        "velxio": "EN",
        "x": 6,
        "y": 51
      },
      {
        "name": "SVP",
        "velxio": "VP",
        "x": 6,
        "y": 64
      },
      {
        "name": "SVN",
        "velxio": "VN",
        "x": 6,
        "y": 76
      },
      {
        "name": "IO34",
        "velxio": "34",
        "x": 6,
        "y": 89
      },
      {
        "name": "IO35",
        "velxio": "35",
        "x": 6,
        "y": 102
      },
      {
        "name": "IO32",
        "velxio": "32",
        "x": 6,
        "y": 114
      },
      {
        "name": "IO33",
        "velxio": "33",
        "x": 6,
        "y": 127
      },
      {
        "name": "IO25",
        "velxio": "25",
        "x": 6,
        "y": 140
      },
      {
        "name": "IO26",
        "velxio": "26",
        "x": 6,
        "y": 152
      },
      {
        "name": "IO27",
        "velxio": "27",
        "x": 6,
        "y": 165
      },
      {
        "name": "IO14",
        "velxio": "14",
        "x": 6,
        "y": 178
      },
      {
        "name": "IO12",
        "velxio": "12",
        "x": 6,
        "y": 191
      },
      {
        "name": "GND1",
        "velxio": "GND.1",
        "x": 6,
        "y": 203
      },
      {
        "name": "IO13",
        "velxio": "13",
        "x": 6,
        "y": 216
      },
      {
        "name": "SD2",
        "velxio": "D2",
        "x": 6,
        "y": 229
      },
      {
        "name": "SD3",
        "velxio": "D3",
        "x": 6,
        "y": 241
      },
      {
        "name": "CMD",
        "velxio": "CMD",
        "x": 6,
        "y": 254
      },
      {
        "name": "5V",
        "velxio": "5V",
        "x": 6,
        "y": 267
      }
    ]
  }
}
