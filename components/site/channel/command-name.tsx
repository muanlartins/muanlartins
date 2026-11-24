import { CodeChip } from "@/components/site/docs"
import type { Command } from "@/lib/commands"
import { cn } from "@/lib/utils"

/**
 * A command as it's typed, each way a chip ("!sigma" ou "!sigma @alguém" when it takes more), with its other spellings
 * after it. `interactive` lights the chips when the row they're in is hovered (the stand's, which play the command).
 */
export function CommandName({ command, also, interactive = false }: { command: Command; also: string; interactive?: boolean }) {
  const shown = command.uso ?? command.comando
  const others = (command.apelidos ?? []).filter((a) => !shown.includes(a))
  // "!sigma ou !sigma @alguém" → chips side by side, with the "ou" between them.
  const parts = shown.split(/( ou )/)
  return (
    <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      {parts.map((part, i) =>
        i % 2 ? (
          <span key={i} className="text-[13px] text-muted">
            {part.trim()}
          </span>
        ) : (
          <CodeChip key={i} className={cn(interactive && "transition-colors group-hover:bg-klein group-hover:text-paper group-focus-visible:bg-klein group-focus-visible:text-paper")}>
            {part}
          </CodeChip>
        ),
      )}
      {others.length > 0 && (
        <span className="text-[13px] text-muted">
          {also} {others.join(", ")}
        </span>
      )}
    </span>
  )
}
