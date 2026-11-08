/** Twitch's and YouTube's signs, simplified, for the links to the channel there (the icon set has no brands). */
export function TwitchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M4.5 2 3 5.5V20h4.5v2.5H10l2.5-2.5h3.5L21 15V2Zm14.5 12-3 3h-4l-2.5 2.5V17H6V4h13Z" fill="currentColor" />
      <path d="M11 7.5h2v5h-2zM15.5 7.5h2v5h-2z" fill="currentColor" />
    </svg>
  )
}

export function YouTubeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.8 4.7 12 4.7 12 4.7s-6.8 0-8.5.5a2.8 2.8 0 0 0-2 2C1 8.9 1 12 1 12s0 3.1.5 4.8a2.8 2.8 0 0 0 2 2c1.7.5 8.5.5 8.5.5s6.8 0 8.5-.5a2.8 2.8 0 0 0 2-2c.5-1.7.5-4.8.5-4.8s0-3.1-.5-4.8ZM9.8 15.1V8.9l5.7 3.1Z"
        fill="currentColor"
      />
    </svg>
  )
}
