"use client"

import { RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/site/ui"
import { useProgress } from "@/lib/progress"
import { UI } from "@/lib/site"
import { ROADMAP } from "./labels"

/**
 * Wipes a roadmap's saved progress, the site's one pattern for destroying something: the first click asks ("Apagar
 * mesmo? Clica de novo"), a second within a few seconds clears it and says so ("Apagado.").
 */
export function ClearProgress({ roadmap }: { roadmap: string }) {
  const { progress, clear } = useProgress(roadmap)
  const [step, setStep] = useState<"idle" | "asking" | "cleared">("idle")

  useEffect(() => {
    if (step === "idle") return
    const timer = setTimeout(() => setStep("idle"), step === "asking" ? 4000 : 2500)
    return () => clearTimeout(timer)
  }, [step])

  if (step === "cleared") {
    return (
      <p role="status" className="text-[14px] font-medium text-muted">
        {ROADMAP.cleared}
      </p>
    )
  }
  if (Object.keys(progress).length === 0) return null

  return (
    <Button
      variant={step === "asking" ? "primary" : "secondary"}
      size="sm"
      icon={<RotateCcw aria-hidden className="h-4 w-4" />}
      onClick={() => {
        if (step === "asking") {
          clear()
          setStep("cleared")
        } else setStep("asking")
      }}
    >
      {step === "asking" ? UI.confirmClear : UI.clearProgress}
    </Button>
  )
}
