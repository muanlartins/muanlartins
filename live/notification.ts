/**
 * Reads a "Pix received" phone notification forwarded by the phone. Banks
 * word it differently; each pattern captures who paid, then how much.
 *
 *   Inter: "Fulano de Tal te enviou um Pix de R$ 0,01 creditado na sua conta final ***00000-0."
 */
const PATTERNS = [/(.+?) te enviou um Pix de R\$\s?([\d.]+,\d{2})/]

export interface ReceivedPix {
  payer: string
  cents: number
}

export function parsePix(text: string): ReceivedPix | undefined {
  for (const pattern of PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const [, payer, amount] = match
      return { payer: payer.trim(), cents: Number(amount.replace(/\./g, "").replace(",", "")) }
    }
  }
}
