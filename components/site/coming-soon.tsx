/** The Klein frame that stands in for something not out yet. */
export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-md bg-klein">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark-small-clear.svg" alt="" className="h-14 w-14" />
      <p className="text-[13px] uppercase tracking-[0.08em] text-klein-claro">{label}</p>
    </div>
  )
}
