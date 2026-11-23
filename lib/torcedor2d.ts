/**
 * The 2D fan's fields (torcedor.js's normalizar and padrao), from public/stream/torcedor3d/antigo.js: pure, no script to
 * load. The site draws fans in 3D (components/site/fan/torcedor-3d.tsx); what still reads the 2D fields is what wears
 * the fan's colours and shirt, the minigames' balls and marbles, as the live draws them.
 */
import * as A from "@/public/stream/torcedor3d/antigo.js"
import type { Choice, Fan } from "@/lib/profile"

/** A saved 2D fan over the one their login gives them, only what's valid kept. */
export const normalizar2D = A.normalizar2D as unknown as (escolha: Choice | Fan | null | undefined, login?: string) => Fan
/** The 2D fan everyone has before choosing, from their login. */
export const padrao2D = A.padrao2D as unknown as (login?: string) => Fan
