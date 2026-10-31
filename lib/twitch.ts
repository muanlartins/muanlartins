import { useSyncExternalStore } from "react"

/**
 * Whether the Twitch channel is live right now, without a backend: the
 * site is static, and Twitch's API needs a secret. DecAPI, a free public
 * service, answers with the stream's uptime, or "<channel> is offline".
 * Every component reading it shares one check, repeated while the tab is
 * open. Unknown (undefined) until the first answer, and on errors.
 */

export const CHANNEL = "muanlartins"
export const TWITCH = `https://www.twitch.tv/${CHANNEL}`

const EVERY = 120_000

let live: boolean | undefined
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()

async function check() {
  try {
    const answer = await (await fetch(`https://decapi.me/twitch/uptime/${CHANNEL}`)).text()
    live = /\d+ (second|minute|hour|day)/.test(answer)
  } catch {
    live = undefined
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    check()
    timer = setInterval(() => document.visibilityState === "visible" && check(), EVERY)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useLive() {
  return useSyncExternalStore(subscribe, () => live, () => undefined)
}
