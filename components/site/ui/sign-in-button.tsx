import type { ComponentProps } from "react"
import { DiscordIcon, TwitchIcon } from "@/components/site/brand-icons"
import { Button, type ButtonSize } from "@/components/site/ui/button"

/**
 * Signing in with Twitch, connecting Discord (brand/interface.md, "Sign in with Twitch / Discord"): the primary button
 * with the platform's glyph, never the platform's colour, the same size everywhere.
 */
export function SignInButton({ platform, size, children, ...rest }: { platform: "twitch" | "discord"; size?: ButtonSize } & Omit<ComponentProps<"button">, "type">) {
  const Icon = platform === "twitch" ? TwitchIcon : DiscordIcon
  return (
    <Button size={size} icon={<Icon className="h-4 w-4" />} {...rest}>
      {children}
    </Button>
  )
}
