import type { L10n } from "@/lib/site"

/**
 * The privacy policy at /privacidade (/privacy). Google's OAuth consent
 * screen for the channel's own YouTube tools links here, so keep the
 * YouTube section true to what those tools do. Links in a paragraph are
 * written as bare URLs.
 */
export const privacy = {
  title: { pt: "Privacidade", en: "Privacy" },
  description: {
    pt: "O que este site e as ferramentas do canal fazem com dados. Resumindo: quase nada.",
    en: "What this site and the channel's tools do with data. In short: almost nothing.",
  },
  updated: { pt: "Atualizada em 4 de novembro de 2026.", en: "Updated November 4, 2026." },
  sections: [
    {
      title: { pt: "Este site", en: "This site" },
      paragraphs: [
        {
          pt: "Não tem login, cookies próprios nem ferramentas de análise, e não coleta dados pessoais.",
          en: "It has no login, no cookies of its own and no analytics, and it collects no personal data.",
        },
        {
          pt: "O progresso que você marca no roteiro fica salvo só neste navegador e nunca sai dele. Para apagar, use “Apagar progresso” ou limpe os dados do site.",
          en: "The progress you mark on the roadmap is saved in this browser only and never leaves it. To erase it, use “Clear progress” or clear the site's data.",
        },
        {
          pt: "A hospedagem (Amazon Web Services) recebe dados técnicos de cada acesso, como o endereço IP, só para entregar as páginas.",
          en: "The hosting (Amazon Web Services) receives technical data from each visit, such as the IP address, only to deliver the pages.",
        },
      ],
    },
    {
      title: { pt: "Conteúdo de outros serviços", en: "Content from other services" },
      paragraphs: [
        {
          pt: "Os vídeos vêm do YouTube e só carregam quando você clica para assistir. A partir daí vale a política do Google: https://policies.google.com/privacy",
          en: "Videos come from YouTube and load only when you click to play. From then on, Google's policy applies: https://policies.google.com/privacy",
        },
        {
          pt: "Enquanto o canal está ao vivo, a página das lives mostra o player da Twitch, sob a política da Twitch: https://www.twitch.tv/p/legal/privacy-notice/",
          en: "While the channel is live, the lives page shows Twitch's player, under Twitch's policy: https://www.twitch.tv/p/legal/privacy-notice/",
        },
        {
          pt: "Para saber se o canal está ao vivo, o navegador consulta o DecAPI (decapi.me) a cada dois minutos.",
          en: "To know whether the channel is live, the browser asks DecAPI (decapi.me) every two minutes.",
        },
      ],
    },
    {
      title: { pt: "Ferramentas do canal e APIs do YouTube", en: "The channel's tools and YouTube's APIs" },
      paragraphs: [
        {
          pt: "O app “muanlartins” é uma ferramenta própria, usada só por mim, que acessa a YouTube Data API para cuidar dos vídeos do meu canal: título, descrição, tags, thumbnails, playlists e legendas.",
          en: "The “muanlartins” app is a tool of my own, used only by me, that calls the YouTube Data API to manage my channel's videos: titles, descriptions, tags, thumbnails, playlists and captions.",
        },
        {
          pt: "Ela não acessa dados de outras pessoas, não vende nem compartilha nada, e as credenciais ficam só no computador do canal.",
          en: "It accesses no one else's data, sells or shares nothing, and its credentials stay on the channel's computer.",
        },
        {
          pt: "Ela usa os Serviços de API do YouTube, sob os Termos de Serviço do YouTube (https://www.youtube.com/t/terms) e a Política de Privacidade do Google (https://policies.google.com/privacy). O acesso pode ser revogado a qualquer momento em https://myaccount.google.com/permissions",
          en: "It uses the YouTube API Services, under YouTube's Terms of Service (https://www.youtube.com/t/terms) and Google's Privacy Policy (https://policies.google.com/privacy). Access can be revoked at any time at https://myaccount.google.com/permissions",
        },
      ],
    },
    {
      title: { pt: "Contato", en: "Contact" },
      paragraphs: [
        {
          pt: "Dúvidas sobre privacidade: fale comigo por qualquer uma das redes no rodapé.",
          en: "Privacy questions: reach me through any of the profiles in the footer.",
        },
      ],
    },
  ] satisfies { title: L10n; paragraphs: L10n[] }[],
}
