import type { L10n } from "@/lib/site"

/**
 * The notices the games' makers ask fan sites using their material to show, word for word, each language as the maker
 * publishes it (Luan, 2026-11-22: in Portuguese on the Portuguese site). Never translate or edit them: a new language
 * takes the maker's own text.
 */

/** Epic's Fan Content Policy, 1.10 (legal.epicgames.com/epicgames/fan-art-policy, `?lang=pt-BR` for Portuguese). */
export const EPIC_NOTICE = {
  pt: "Partes dos materiais utilizados são marcas registradas e/ou obras protegidas por direitos autorais da Epic Games, Inc. Todos os direitos reservados pela Epic. Este material não é oficial e não é endossado pela Epic.",
  en: "Portions of the materials used are trademarks and/or copyrighted works of Epic Games, Inc. All rights reserved by Epic. This material is not official and is not endorsed by Epic.",
} satisfies L10n

/** Riot's Legal Jibber Jabber, 6 (riotgames.com/en/legal, riotgames.com/pt-br/juridico). */
export const RIOT_NOTICE = {
  pt: "muanlartins foi criado seguindo a política do “Lenga-Lenga Jurídico” da Riot Games com recursos pertencentes à Riot Games. A Riot Games não endossa ou patrocina este projeto.",
  en: "muanlartins was created under Riot Games' \"Legal Jibber Jabber\" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project.",
} satisfies L10n
