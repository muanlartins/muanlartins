import { InventoryBoard } from "@/components/site/inventory/inventory-board"
import { PageIntro } from "@/components/site/page-intro"
import { longDate } from "@/components/site/ranked/format"
import { dayOf } from "@/lib/ranked"
import { localize } from "@/lib/site"
import { inventory } from "@/lib/valorant-inventory"

const T = localize({
  art: {
    pt: "As imagens e os vídeos das skins são da Riot Games, pelo valorant-api.com. O inventário sai do próprio jogo, no meu PC.",
    en: "The skins' images and videos are Riot Games', through valorant-api.com. The inventory comes straight from the game, on my PC.",
  },
})

/**
 * Valorant's weapon skins (lib/valorant-inventory.ts): the collection Luan is building, weapon by weapon, filling in
 * as he gets each skin, and what's on each weapon in the game now.
 */
export function InventoryPage({ title, description, credits }: { title: string; description: string; credits: string }) {
  const { read, weapons } = inventory()
  return (
    <>
      <PageIntro title={title} description={description} />
      <div className="mt-12">
        <InventoryBoard weapons={weapons} read={read && longDate(dayOf(read))} />
      </div>
      <div className="mt-16 space-y-2 text-[12px] leading-[1.6] text-muted">
        <p>{T.art}</p>
        <p>{credits}</p>
      </div>
    </>
  )
}
