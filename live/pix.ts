/**
 * A static Pix QR code ("BR Code", the Central Bank's EMV payload) for a key
 * and a fixed amount. No payment provider involved: any bank app reads it and
 * pays the key directly. The txid travels with the payment and shows up in
 * the receiver's statement, which helps match a payment by hand.
 */

function field(id: string, value: string) {
  return id + String(value.length).padStart(2, "0") + value
}

/** BR Code text fields are plain ASCII: drop accents and anything else. */
function ascii(text: string, max: number) {
  return text
    .normalize("NFD")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, max)
}

/** CRC-16/CCITT-FALSE, the checksum that closes every BR Code. */
function crc16(payload: string) {
  let crc = 0xffff
  for (const byte of Buffer.from(payload, "utf8")) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

export interface PixRecipient {
  key: string
  name: string
  city: string
}

export function brCode(to: PixRecipient, cents: number, txid: string) {
  const payload =
    field("00", "01") +
    field("26", field("00", "br.gov.bcb.pix") + field("01", to.key)) +
    field("52", "0000") +
    field("53", "986") +
    field("54", (cents / 100).toFixed(2)) +
    field("58", "BR") +
    field("59", ascii(to.name, 25)) +
    field("60", ascii(to.city, 15)) +
    field("62", field("05", txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25))) +
    "6304"
  return payload + crc16(payload)
}
