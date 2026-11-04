import type { Fan, Torcedor } from "@/lib/profile"
import { cn } from "@/lib/utils"

/** A fan drawn by torcedor.js; `move` plays a celebration (torcedor.css). */
export function FanView({ T, fan, className, move }: { T: Torcedor; fan: Fan; className?: string; move?: string }) {
  return (
    <div
      className={cn("torcedor relative", move, className)}
      data-comemoracao={fan.comemoracao}
      style={{ ["--cor" as string]: fan.cor }}
    >
      <div className="pose absolute inset-0" dangerouslySetInnerHTML={{ __html: T.figura(fan) }} />
    </div>
  )
}
