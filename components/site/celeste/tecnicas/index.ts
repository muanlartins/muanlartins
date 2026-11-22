import { buffer } from "@/components/site/celeste/tecnicas/buffer"
import { correcaoDeQuina } from "@/components/site/celeste/tecnicas/correcao-de-quina"
import { coyoteTime } from "@/components/site/celeste/tecnicas/coyote-time"
import { espinhosDirecionais } from "@/components/site/celeste/tecnicas/espinhos-direcionais"
import { liftboost } from "@/components/site/celeste/tecnicas/liftboost"
import { puloNeutro } from "@/components/site/celeste/tecnicas/pulo-neutro"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import { wallboost } from "@/components/site/celeste/tecnicas/wallboost"

/** The fundamentals that have a catalogue page, by id (content/celeste.ts). */
export const TECHNIQUES: Record<string, () => Technique> = {
  "coyote-time": coyoteTime,
  buffer,
  "correcao-de-quina": correcaoDeQuina,
  liftboost,
  "espinhos-direcionais": espinhosDirecionais,
  "pulo-neutro": puloNeutro,
  wallboost,
}
