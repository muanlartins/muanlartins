import { timeline } from "@/lib/content"

/**
 * The home page: who Luan is, one moment at a time.
 */

export default timeline({
  title: { pt: "Luan Martins", en: "Luan Martins" },
  description: {
    pt: "A biografia de um curioso garoto curioso.",
    en: "The biography of a curious curious boy.",
  },
  video: { pt: "qqeUnZERdS0", en: "XybC7loUVQA" },
  countFrom: "2001-05-30", // TODO: your birth date, e.g. "2000-06-10", so the left column shows your age
  labels: {
    age: { pt: "Idade", en: "Age" },
    year: { pt: "Data", en: "Date" },
  },
  milestones: [
    {
      date: "2001-05-30",
      events: [
        {
          pt: "Quando tudo começou.",
          en: "When it all started.",
        },
      ],
      photos: [
        {
          src: "/moments/baby_sinclair.jpg",
          alt: { pt: "Baby da Silva Sauro", en: "Baby Sinclair" }
        }
      ]
    },
    {
      date: "2002",
      events: [
        {
          pt: "Bebê Tigrão faz um ano de idade.",
          en: "Baby Tigger is now one year old.",
        },
      ],
      photos: [
        {
          src: "/moments/baby_tigger.jpeg",
          alt: { pt: "Bebê Tigrão", en: "Baby Tigger" }
        }
      ]
    },
    {
      date: "2005",
      events: [
        {
          pt: "Pequeno executivo pronto para mais um dia de trabalho.",
          en: "Little executive ready for one more day of work.",
        },
      ],
      photos: [
        {
          src: "/moments/little_executive.jpeg",
          alt: { pt: "Pequeno executivo", en: "Little executive" }
        }
      ]
    },
    {
      date: "2012",
      events: [
        {
          pt: "Bom senso de humor sempre foi parte da nossa família.",
          en: "Good sense of humor was always a part of our family.",
        },
      ],
      photos: [
        {
          src: "/moments/pizza_full.jpeg",
          alt: { pt: "Pizza completa", en: "Full pizza" }
        },
        {
          src: "/moments/pizza_empty.jpeg",
          alt: { pt: "Pizza vazia", en: "Empty pizza" }
        }
      ]
    },
    {
      date: "2013",
      events: [
        {
          pt: "Xadrez foi um desafio cognitivo empolgante na minha adolescência. Graças à minha formidável estatura, eu fiquei conhecido como 'Montanha' no torneio interescolar que ganhei.",
          en: "Chess was an exciting cognitive challenge in my youth. Thanks to my formidable stature, I was known as 'Mountain' on the inter-school tournament I've won.",
        },
      ],
      photos: [
        {
          src: "/moments/chess_medal.jpeg",
          alt: { pt: "Medalha de Xadrez", en: "Chess Medal" }
        },
        {
          src: "/moments/chess_podium.jpeg",
          alt: { pt: "Pódio de Xadrez", en: "Chess Podium" }
        },
        {
          src: "/moments/chess_games.jpeg",
          alt: { pt: "Jogos de Xadrez", en: "Chess Games" }
        }
      ]
    },
  //   {
  //     date: "2026-10-05",
  //     events: [
  //       {
  //         pt: "TODO: o nascimento do muanlartins.",
  //         en: "TODO: the birth of muanlartins.",
  //       },
  //     ],
  //     photos: [
  //       {
  //         src: "/brand/mark-on-klein.svg",
  //         alt: { pt: "A marca muanlartins", en: "The muanlartins mark" },
  //       },
  //     ],
  //   },
  ],
})
