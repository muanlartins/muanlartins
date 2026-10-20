import { randomBytes } from "node:crypto"
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import type { ReceivedPix } from "./notification.ts"

/**
 * Donations and the payments that pay them, kept in one JSON file.
 *
 * A donation is what a viewer fills in: a nickname, a message, an amount. A
 * payment is a Pix the bank told us about. A payment pays the one donation
 * still waiting for that exact amount; when there is none, or more than one,
 * it waits in the unmatched queue until it's linked by hand.
 */

export type DonationStatus = "pending" | "paid" | "expired"

export interface Donation {
  id: string
  nickname: string
  message: string
  cents: number
  /** The viewer agreed to be listed on the site's donor wall. */
  wall: boolean
  /** Hidden from the wall, e.g. an offensive message. */
  hidden: boolean
  status: DonationStatus
  createdAt: string
  paidAt?: string
}

export interface Payment {
  id: string
  /** The payer's legal name, from the bank. Private: never shown on stream or on the wall. */
  payer: string
  cents: number
  receivedAt: string
  /** The donation it paid; unset while unmatched. */
  donationId?: string
  /** Shown as an anonymous alert instead of being linked to a donation. */
  anonymous?: boolean
  dismissed?: boolean
}

interface Data {
  donations: Donation[]
  payments: Payment[]
}

/** How long a donation waits for its Pix before it stops matching automatically. */
const PENDING_MS = 30 * 60 * 1000

export function newId() {
  return randomBytes(6).toString("hex").toUpperCase()
}

export class Store {
  private path: string
  private data: Data

  constructor(path: string) {
    this.path = path
    try {
      this.data = JSON.parse(readFileSync(path, "utf8"))
    } catch {
      this.data = { donations: [], payments: [] }
    }
  }

  private save() {
    mkdirSync(dirname(this.path), { recursive: true })
    writeFileSync(`${this.path}.tmp`, JSON.stringify(this.data, null, 2))
    renameSync(`${this.path}.tmp`, this.path)
  }

  private expire() {
    const cutoff = Date.now() - PENDING_MS
    for (const donation of this.data.donations) {
      if (donation.status === "pending" && Date.parse(donation.createdAt) < cutoff) donation.status = "expired"
    }
  }

  donation(id: string) {
    this.expire()
    return this.data.donations.find((donation) => donation.id === id)
  }

  createDonation(fields: Pick<Donation, "nickname" | "message" | "cents" | "wall">) {
    const donation: Donation = {
      id: newId(),
      ...fields,
      hidden: false,
      status: "pending",
      createdAt: new Date().toISOString(),
    }
    this.data.donations.push(donation)
    this.save()
    return donation
  }

  /** Records a Pix and returns the donation it paid, if exactly one was waiting for that amount. */
  receive(pix: ReceivedPix) {
    this.expire()
    const payment: Payment = { id: newId(), ...pix, receivedAt: new Date().toISOString() }
    const waiting = this.data.donations.filter((d) => d.status === "pending" && d.cents === pix.cents)
    const donation = waiting.length === 1 ? waiting[0] : undefined
    if (donation) this.pay(donation, payment)
    this.data.payments.push(payment)
    this.save()
    return { payment, donation }
  }

  private pay(donation: Donation, payment: Payment) {
    donation.status = "paid"
    donation.paidAt = payment.receivedAt
    payment.donationId = donation.id
  }

  /** Links an unmatched payment to a donation by hand. */
  link(paymentId: string, donationId: string) {
    const payment = this.data.payments.find((p) => p.id === paymentId && !p.donationId)
    const donation = this.data.donations.find((d) => d.id === donationId && d.status !== "paid")
    if (!payment || !donation) return
    this.pay(donation, payment)
    this.save()
    return { payment, donation }
  }

  /** Settles an unmatched payment without a donation: an anonymous alert, or none at all. */
  settle(paymentId: string, as: "anonymous" | "dismissed") {
    const payment = this.data.payments.find((p) => p.id === paymentId && !p.donationId)
    if (!payment) return
    payment[as] = true
    this.save()
    return payment
  }

  setHidden(donationId: string, hidden: boolean) {
    const donation = this.data.donations.find((d) => d.id === donationId)
    if (!donation) return
    donation.hidden = hidden
    this.save()
    return donation
  }

  /** Everything the studio page shows, newest first. */
  snapshot() {
    this.expire()
    return {
      unmatched: this.data.payments.filter((p) => !p.donationId && !p.anonymous && !p.dismissed).reverse(),
      donations: [...this.data.donations].reverse().slice(0, 100),
    }
  }

  /** The donor wall: paid donations whose donors opted in, without anything private. */
  wall() {
    return this.data.donations
      .filter((d) => d.status === "paid" && d.wall && !d.hidden)
      .map(({ nickname, message, cents, paidAt }) => ({ nickname, message, cents, paidAt }))
  }
}
