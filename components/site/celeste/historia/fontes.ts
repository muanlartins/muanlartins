import type { Source } from "@/components/site/celeste/historia/parts"

/**
 * The sources the story pages lean on most, each opened (or, for a video, its captions read) on 2026-11-23. `at`
 * points a video at a moment, written as the video shows it ("1:09:23").
 */

/** Maddy Thorson and Noel Berry play the game's old builds and comment, live (2018-06-07, 2h18). */
export const COMMENTARY = "https://www.youtube.com/watch?v=u-nSjhIgmXc"
/** Sonar #01: Amora Bettany and Pedro Medeiros in Portuguese, on Nautilus TV (2019-04-18). Automatic captions only. */
export const SONAR = "https://www.youtube.com/watch?v=JlR7IaH2CjY"
/** "A Celeste Art Postmortem", Pedro Medeiros at the Vancouver Game Dev Series (published 2023-07-30). */
export const ART_TALK = "https://www.youtube.com/watch?v=JXDiFWC1DS4"
/** Maddy Thorson's "Celeste & Forgiveness". */
export const FORGIVENESS = "https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html"

/** A video at a moment: "1:09:23" or "3:40". */
export function at(video: string, moment: string) {
  const seconds = moment.split(":").reduce((sum, part) => sum * 60 + Number(part), 0)
  return `${video}&t=${seconds}s`
}

export const commentary = (moment: string): Source => ({ label: `Maddy Thorson e Noel Berry, comentário ao vivo (2018), ${moment}`, href: at(COMMENTARY, moment) })
export const sonar = (moment: string): Source => ({ label: `Amora Bettany e Pedro Medeiros, entrevista ao Sonar (2019), ${moment}`, href: at(SONAR, moment) })
export const artTalk = (moment: string): Source => ({ label: `Pedro Medeiros, palestra sobre a arte de Celeste (2023), ${moment}`, href: at(ART_TALK, moment) })
export const inGame: Source = { label: "No próprio jogo: as falas e o mapa do capítulo" }

/** Lena Raine to Original Sound Version (2018-02-05): the instruments, the themes, the tracks. */
export const OSV = "https://www.originalsoundversion.com/interview-composer-lena-raine-talks-celeste-soundtrack-working-in-game-audio/"
/** "High Scores: Lena Raine's 'Celeste' Soundtrack", Bandcamp Daily (2018-02-23). */
export const BANDCAMP_DAILY = "https://daily.bandcamp.com/lena-raine-celeste-feature"
/** "Confronting Myself", Lena Raine to KEXP (2019-03-29). */
export const KEXP = "https://kexp.org/read/2019/3/29/confronting-myself-lena-raine-soundtracking-celeste-and-her-new-album-oneknowing"

export const lena: Source = { label: "Lena Raine ao Original Sound Version (2018)", href: OSV }
export const lenaBandcamp: Source = { label: "Lena Raine ao Bandcamp Daily (2018)", href: BANDCAMP_DAILY }
export const inMusic: Source = { label: "No próprio jogo: o mapa do capítulo e os bancos de som" }
/** "Road to the IGF: Matt Makes Games' Celeste", Game Developer (2018-03-07): Noel Berry and Lena Raine. */
export const GAME_DEVELOPER = "https://www.gamedeveloper.com/game-platforms/road-to-the-igf-matt-makes-games-i-celeste-i-"
