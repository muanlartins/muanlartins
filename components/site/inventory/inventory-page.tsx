import { InventoryBoard } from "@/components/site/inventory/inventory-board"
import { PageIntro } from "@/components/site/page-intro"
import { localize } from "@/lib/site"
import { subset } from "@/lib/valorant-catalog"
import { catalog } from "@/lib/valorant-catalog-file"
import { seed, skinIds } from "@/lib/valorant-inventory"

const T = localize({
  art: {
    pt: "As imagens e os vídeos das skins são da Riot Games, pelo valorant-api.com. O que tenho no jogo sai do próprio jogo, no meu PC.",
    en: "The skins' images and videos are Riot Games', through valorant-api.com. What I have in the game comes straight from the game, on my PC.",
  },
})

/**
 * Valorant's weapon skins (lib/valorant-inventory.ts): the collection Luan is building, what's on each weapon in the
 * game now, and anyone's dream loadout. The page is built with only the skins it shows first; the board brings the
 * whole catalogue and the profile API's answers in the browser.
 */
export function InventoryPage({ title, description, credits }: { title: string; description: string; credits: string }) {
  const start = seed()
  return (
    <>
      <PageIntro title={title} description={description} />
      <div className="mt-12">
        <InventoryBoard start={subset(catalog(), skinIds(start))} seed={start} />
      </div>
      <div className="mt-16 space-y-2 text-[12px] leading-[1.6] text-muted">
        <p>{T.art}</p>
        <p>{credits}</p>
      </div>
    </>
  )
}
