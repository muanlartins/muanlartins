import { BriefcaseBusiness, Gamepad2, Radio, User, type LucideIcon } from "lucide-react"
import type { Section } from "@/lib/site"

/** Each section's icon: in the header, and wherever the sections are offered again (the 404). */
export const SECTION_ICONS: Record<Section, LucideIcon> = { channel: Radio, content: Gamepad2, personal: User, professional: BriefcaseBusiness }
