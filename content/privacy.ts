import type { L10n } from "@/lib/site"

/**
 * The privacy policy at /privacidade (/privacy). Google's OAuth consent
 * screen for the channel's own YouTube tools links here, so keep the
 * YouTube section true to what those tools do. Links in a paragraph are
 * written as bare URLs.
 */
export const privacy = {
  title: { pt: "Política de privacidade", en: "Privacy policy" },
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
          pt: "Não tem cookies próprios nem ferramentas de análise. O único login é opcional: entrar com a Twitch no perfil, para montar o seu torcedor da live (abaixo).",
          en: "It has no cookies of its own and no analytics. The only sign-in is optional: Twitch, on the profile page, to build your fan for the live (below).",
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
      title: { pt: "Perfil e a torcida da live", en: "Profile and the live's crowd" },
      paragraphs: [
        {
          pt: "Se você entra com a Twitch em https://muanlartins.com.br/perfil, a Twitch informa ao site só o seu nome de usuário e o seu número de conta. O site não pede acesso a mais nada: nem e-mail, nem seguidores, nem mensagens.",
          en: "If you sign in with Twitch at https://muanlartins.com/profile, Twitch tells the site only your username and account number. The site asks for nothing else: no email, followers or messages.",
        },
        {
          pt: "Fica guardado, na Amazon Web Services, o seu nome de usuário e o torcedor que você montou (cores, cabeça, roupa, acessório, comemoração, grito de chegada e stickers), para ele aparecer na arquibancada da live quando você está no chat. Quem vê a live vê o seu torcedor com o seu nome, como já vê o seu nome no chat.",
          en: "Stored, on Amazon Web Services, are your username and the fan you built (colors, head, outfit, accessory, celebration, arrival shout and stickers), so it can stand in the live's crowd while you're in the chat. Whoever watches the live sees your fan with your name, as they already see your name in the chat.",
        },
        {
          pt: "O acesso da Twitch fica só no seu navegador. Para apagar o seu torcedor, use “Apagar meu torcedor” no perfil; para cortar o acesso, use “Sair” ou desconecte o app em https://www.twitch.tv/settings/connections",
          en: "The Twitch access stays in your browser only. To delete your fan, use “Delete my fan” on the profile; to cut the access, use “Sign out” or disconnect the app at https://www.twitch.tv/settings/connections",
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
