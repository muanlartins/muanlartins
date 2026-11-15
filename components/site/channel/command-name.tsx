import type { Command } from "@/lib/commands"
import { cn } from "@/lib/utils"

/** A command as it's typed ("!sigma ou !sigma @alguém" when it takes more), with its other spellings after it. */
export function CommandName({ command, also, interactive = false }: { command: Command; also: string; interactive?: boolean }) {
  const shown = command.uso ?? command.comando
  const others = (command.apelidos ?? []).filter((a) => !shown.includes(a))
  return (
    <span className="shrink-0 sm:w-60">
      <code
        className={cn(
          "rounded bg-klein/[0.08] px-2 py-0.5 font-mono text-[15px] font-medium text-klein",
          interactive && "transition-colors group-hover:bg-klein group-hover:text-paper",
        )}
      >
        {shown}
      </code>
      {others.length > 0 && (
        <span className="ml-2 text-[12px] text-muted">
          {also} {others.join(", ")}
        </span>
      )}
    </span>
  )
}
