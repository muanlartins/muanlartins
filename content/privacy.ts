import type { L10n } from "@/lib/site"

/**
 * The privacy policy at /privacidade (/privacy), a documentation page. Google's OAuth consent screen for the channel's
 * own YouTube tools links here, so keep the YouTube section true to what those tools do, and keep the rest true to
 * what the site, the APIs (infra/perfil, infra/sigma, infra/pix) and the live keep: when one of them starts keeping
 * something new, it goes here, with `updated`. Links in a paragraph are written as bare URLs. Legal text, so it says
 * "para" (brand/voz.md).
 */
export const privacy = {
  title: { pt: "Política de privacidade", en: "Privacy policy" },
  description: {
    pt: "O que este site, a live e as ferramentas do canal fazem com dados.",
    en: "What this site, the live and the channel's tools do with data.",
  },
  /** The day this policy last changed (YYYY-MM-DD). */
  updated: "2026-11-24",
  meta: {
    updated: { pt: "Atualizada em", en: "Updated" },
    covers: { pt: "Vale para", en: "Covers" },
  },
  summary: {
    title: { pt: "Em resumo", en: "In short" },
    points: [
      { pt: "Sem cookies próprios e sem ferramentas de análise.", en: "No cookies of its own and no analytics." },
      {
        pt: "Entrar com a Twitch é opcional e só informa ao site o seu nome de usuário e o número da sua conta.",
        en: "Signing in with Twitch is optional and only tells the site your username and account number.",
      },
      {
        pt: "Na live, quem está no chat é contado pelo nome de usuário da Twitch para os Σ, os pontos do site, e isso é público.",
        en: "On the live, whoever is in the chat is counted by their Twitch username for Σ, the site's points, and that's public.",
      },
      { pt: "Nada é vendido nem usado para anúncios.", en: "Nothing is sold or used for ads." },
    ],
  },
  sections: [
    {
      id: "site",
      title: { pt: "Este site", en: "This site" },
      paragraphs: [
        {
          pt: "Não tem cookies próprios nem ferramentas de análise.",
          en: "It has no cookies of its own and no analytics.",
        },
        {
          pt: "Algumas coisas ficam só neste navegador e nunca saem dele: o progresso que você marca nos fundamentos, a sensibilidade e o recorde no estande de tiro do Valorant, os rascunhos (do torcedor, do loadout dos sonhos, de um Pix enquanto você entra com a Twitch) e o acesso da Twitch, quando você entra. Para apagar, use “Apagar progresso” nos fundamentos, “Sair” no perfil, ou limpe os dados do site no navegador.",
          en: "Some things stay in this browser only and never leave it: the progress you mark on the fundamentals, your sensitivity and best score on Valorant's range, drafts (of your fan, your dream loadout, a Pix while you sign in with Twitch) and your Twitch access, when you sign in. To erase them, use “Clear progress” on the fundamentals, “Sign out” on the profile, or clear the site's data in your browser.",
        },
        {
          pt: "A hospedagem (Amazon Web Services) recebe dados técnicos de cada acesso, como o endereço IP, só para entregar as páginas.",
          en: "The hosting (Amazon Web Services) receives technical data from each visit, such as the IP address, only to deliver the pages.",
        },
      ],
    },
    {
      id: "twitch",
      title: { pt: "Entrar com a Twitch", en: "Signing in with Twitch" },
      paragraphs: [
        {
          pt: "Se você entra com a Twitch em https://muanlartins.com.br/perfil, a Twitch informa ao site só o seu nome de usuário e o seu número de conta. O site não pede acesso a mais nada: nem e-mail, nem seguidores, nem mensagens. O acesso fica só no seu navegador.",
          en: "If you sign in with Twitch at https://muanlartins.com.br/perfil, Twitch tells the site only your username and account number. The site asks for nothing else: no email, followers or messages. The access stays in your browser only.",
        },
        {
          pt: "O que você salva fica guardado na Amazon Web Services com o seu nome de usuário: o torcedor que você montou, o seu cartão (cores, “Sobre mim”, pronomes, banner e foto), a sua bolinha do duelo e o seu loadout dos sonhos do Valorant. Tudo isso é público: aparece com o seu nome na arquibancada da live, na sua página do site e para quem abrir o link do seu loadout.",
          en: "What you save is kept on Amazon Web Services with your username: the fan you built, your card (colors, “About me”, pronouns, banner and photo), your ball for the duel and your dream Valorant loadout. All of it is public: it shows with your name in the live's stand, on your page on the site and to anyone who opens your loadout's link.",
        },
        {
          pt: "Cada uma dessas coisas pode ser mudada ou apagada no seu perfil, no duelo ou no inventário. Para cortar o acesso, use “Sair” ou desconecte o app em https://www.twitch.tv/settings/connections",
          en: "Each of these can be changed or deleted on your profile, the duel or the inventory. To cut the access, use “Sign out” or disconnect the app at https://www.twitch.tv/settings/connections",
        },
      ],
    },
    {
      id: "live",
      title: { pt: "Na live: presença e Σ", en: "On the live: presence and Σ" },
      paragraphs: [
        {
          pt: "Quem está no chat durante a live, logado na Twitch, é contado pelo nome de usuário: os minutos e as lives assistidas, as lives seguidas e os Σ que isso dá, os duelos, as corridas e os gols dedicados. Não precisa entrar no site para isso.",
          en: "Whoever is in the chat during the live, logged in to Twitch, is counted by their username: minutes and lives watched, lives in a row and the Σ they earn, duels, races and goals dedicated to them. It doesn't take signing in on the site.",
        },
        {
          pt: "Isso é público: aparece na arquibancada e nos créditos da live, no mural, nos minijogos e numa página sua no site, em muanlartins.com.br/torcedor/ e o seu nome de usuário. Fica guardado na Amazon Web Services; para apagar, fale comigo (abaixo).",
          en: "It's public: it shows in the live's stand and credits, on the mural, in the minigames and on a page of yours on the site, at muanlartins.com.br/torcedor/ and your username. It's kept on Amazon Web Services; to delete it, reach me (below).",
        },
        {
          pt: "Os comandos do chat são respondidos pelo StreamElements, um bot que lê o chat da Twitch.",
          en: "The chat's commands are answered by StreamElements, a bot that reads Twitch's chat.",
        },
      ],
    },
    {
      id: "pix",
      title: { pt: "Pix na live", en: "Pix on the live" },
      paragraphs: [
        {
          pt: "O pagamento é um Pix comum, direto para a minha conta: o site não vê os seus dados bancários. Do aviso do banco, só o primeiro nome de quem pagou fica guardado, por três dias, e só quando o Pix chega sem uma reserva do site.",
          en: "The payment is an ordinary Pix, straight to my account: the site never sees your bank details. From the bank's notice, only the payer's first name is kept, for three days, and only when the Pix arrives without a reservation from the site.",
        },
        {
          pt: "Do formulário fica guardado o que você preencheu: o nome que escreveu (ou Anônimo), a mensagem, a voz, o valor e, se você entrou com a Twitch, o seu nome de usuário. O Pix aparece com esse nome e essa mensagem na live e no mural, que é público. Uma mensagem gravada com a sua voz fica só até tocar na live, no máximo dois dias; o texto dela, transcrito, fica como a mensagem. Para limitar abusos, o endereço IP de quem reserva um valor fica guardado por meia hora.",
          en: "From the form, what you filled in is kept: the name you wrote (or Anonymous), the message, the voice, the amount and, if you signed in with Twitch, your username. The Pix shows with that name and message on the live and on the mural, which is public. A message recorded in your voice is kept only until it plays on the live, two days at most; its text, transcribed, stays as the message. To limit abuse, the IP address of whoever reserves an amount is kept for half an hour.",
        },
        {
          pt: "Numa música, o estilo e o tema ou a letra vão para o Google (Gemini e Lyria), que revisa o texto, faz a música e marca o tempo de cada verso, sob a política do Google: https://policies.google.com/privacy. Depois de tocar na live, a música fica pública no mural.",
          en: "For a song, the style and the theme or lyrics go to Google (Gemini and Lyria), which checks the text, makes the song and times each line, under Google's policy: https://policies.google.com/privacy. Once it plays on the live, the song is public on the mural.",
        },
      ],
    },
    {
      id: "discord",
      title: { pt: "Discord", en: "Discord" },
      paragraphs: [
        {
          pt: "Se você conecta o Discord no perfil, o Discord informa ao site o seu número de conta e o seu nome de usuário, e o bot do canal coloca você no servidor com o seu rank Σ como cargo. Para desfazer, use “Desconectar” no perfil.",
          en: "If you connect Discord on your profile, Discord tells the site your account number and username, and the channel's bot puts you in the server with your Σ rank as a role. To undo it, use “Disconnect” on the profile.",
        },
      ],
    },
    {
      id: "lives",
      title: { pt: "Nas lives e nos vídeos", en: "In the lives and videos" },
      paragraphs: [
        {
          pt: "As lives ficam públicas no YouTube, e a página de cada live tem a transcrição do que eu falo, com os nomes como eu falei.",
          en: "The lives stay public on YouTube, and each live's page has a transcript of what I say, with names as I said them.",
        },
        {
          pt: "Nas partidas, só os meus números vão para o site: colegas de time aparecem pelo nome só se concordaram, e adversários nunca.",
          en: "In matches, only my own numbers go to the site: teammates show by name only if they agreed, and opponents never.",
        },
      ],
    },
    {
      id: "terceiros",
      title: { pt: "Conteúdo de outros serviços", en: "Content from other services" },
      paragraphs: [
        {
          pt: "A capa de cada vídeo vem do YouTube, e o player só carrega quando você clica para assistir. A partir daí vale a política do Google: https://policies.google.com/privacy",
          en: "Each video's cover comes from YouTube, and the player loads only when you click to play. From then on, Google's policy applies: https://policies.google.com/privacy",
        },
        {
          pt: "Enquanto o canal está ao vivo, a página das lives mostra o player da Twitch, sob a política da Twitch: https://www.twitch.tv/p/legal/privacy-notice/",
          en: "While the channel is live, the lives page shows Twitch's player, under Twitch's policy: https://www.twitch.tv/p/legal/privacy-notice/",
        },
        {
          pt: "Para saber se o canal está ao vivo, o navegador consulta o DecAPI (decapi.me) a cada dois minutos enquanto a página está aberta, e é dele também a foto da Twitch de quem não pôs uma no cartão. As imagens das skins do Valorant vêm do valorant-api.com.",
          en: "To know whether the channel is live, the browser asks DecAPI (decapi.me) every two minutes while the page is open, and it also brings the Twitch photo of whoever didn't put one on their card. Valorant's skin images come from valorant-api.com.",
        },
      ],
    },
    {
      id: "youtube",
      title: { pt: "Ferramentas do canal e APIs do YouTube", en: "The channel's tools and YouTube's APIs" },
      paragraphs: [
        {
          pt: "O app “muanlartins” é uma ferramenta própria, usada só por mim, que acessa a YouTube Data API para cuidar dos vídeos do meu canal: título, descrição, tags, thumbnails, playlists e legendas. Ela também lê os comentários dos meus vídeos, só para dar crédito no roadmap a quem deu uma ideia.",
          en: "The “muanlartins” app is a tool of my own, used only by me, that calls the YouTube Data API to manage my channel's videos: titles, descriptions, tags, thumbnails, playlists and captions. It also reads the comments on my videos, only to credit whoever had an idea on the roadmap.",
        },
        {
          pt: "Ela não vende nem compartilha nada, e as credenciais ficam só no computador do canal.",
          en: "It sells or shares nothing, and its credentials stay on the channel's computer.",
        },
        {
          pt: "Ela usa os Serviços de API do YouTube, sob os Termos de Serviço do YouTube (https://www.youtube.com/t/terms) e a Política de Privacidade do Google (https://policies.google.com/privacy). O acesso pode ser revogado a qualquer momento em https://myaccount.google.com/permissions",
          en: "It uses the YouTube API Services, under YouTube's Terms of Service (https://www.youtube.com/t/terms) and Google's Privacy Policy (https://policies.google.com/privacy). Access can be revoked at any time at https://myaccount.google.com/permissions",
        },
      ],
    },
    {
      id: "contato",
      title: { pt: "Contato", en: "Contact" },
      paragraphs: [
        {
          pt: "Dúvidas, ou para pedir que eu corrija ou apague algum dado seu (um Pix no mural, a sua presença nas lives): fale comigo por qualquer uma das redes no rodapé.",
          en: "Questions, or to ask me to correct or delete any of your data (a Pix on the mural, your presence in the lives): reach me through any of the profiles in the footer.",
        },
      ],
    },
  ] satisfies { id: string; title: L10n; paragraphs: L10n[] }[],
}
