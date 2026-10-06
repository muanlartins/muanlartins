import { timeline } from "@/lib/content"

/**
 * The career page
 */
export default timeline({
  title: { pt: "Carreira", en: "Career" },
  description: {
    pt: "A carreira de um engenheiro de software comunicativo.",
    en: "The career of a communicative software engineer.",
  },
  video: { pt: "YxR3phwtT88", en: "doSZq6yEq_0" },
  countFrom: "2001-05-30",
  labels: {
    age: { pt: "Idade", en: "Age" },
    year: { pt: "Data", en: "Date" },
  },
  milestones: [
    {
      date: "2019-03",
      events: [
        {
          text: [
            { type: "text", value: { pt: "Entrei em Ciência da Computação na ", en: "Started Computer Science at " } },
            { type: "link", value: "UFRJ", href: "https://ufrj.br" },
            { type: "text", value: "." },
          ],
        },
        {
          pt: "Passei três anos num grupo de estudos de programação competitiva e fiquei entre os 50 melhores em competições nacionais três vezes.",
          en: "Spent three years in a competitive programming study group, and placed in the top 50 of national contests three times.",
        },
        {
          pt: "Fui monitor de várias disciplinas, principalmente programação e criptografia.",
          en: "Tutored several courses, mostly programming and cryptography.",
        },
      ],
    },
    {
      date: "2021-09",
      events: [
        {
          text: [
            { type: "text", value: { pt: "Primeiro emprego: estagiário na ", en: "First job: intern at " } },
            { type: "link", value: "Parfin", href: "https://parfin.io" },
            {
              type: "text",
              value: {
                pt: ". Pesquisei problemas de web3 com estruturas de dados, algoritmos e estatística.",
                en: ". Researched web3 problems with data structures, algorithms and statistics.",
              },
            },
          ],
        },
        {
          pt: "Criei APIs em Node.js e .NET, e funcionalidades em Angular para o SaaS junto com vários times.",
          en: "Built APIs in Node.js and .NET, and Angular features for the SaaS alongside several teams.",
        },
        {
          pt: "Inventei uma solução white label para personalizar o SaaS de cada cliente, e automatizei as notícias do site com Gatsby e Strapi.",
          en: "Invented a white-label solution to customize the SaaS for each client, and automated the landing page news with Gatsby and Strapi.",
        },
      ],
    },
    {
      date: "2023",
      events: [
        {
          text: [
            { type: "text", value: { pt: "Criei o ", en: "Created " } },
            { type: "link", value: "Agora", href: "https://www.agoradebates.com" },
            {
              type: "text",
              value: {
                pt: ", uma ferramenta de gestão para a Sociedade de Debates da UFRJ.",
                en: ", a management tool for UFRJ's Debate Society.",
              },
            },
          ],
        },
      ],
    },
    {
      date: "2023-09",
      events: [
        {
          pt: "Formado com magna cum laude, média 9,1 de 10.",
          en: "Graduated magna cum laude, with a 9.1 out of 10 GPA.",
        },
        {
          text: [
            {
              type: "text",
              value: { pt: "Efetivado como engenheiro de software na Parfin, trabalhando no ", en: "Hired full-time as a software engineer at Parfin, working on " },
            },
            { type: "link", value: "Rayls", href: "https://rayls.com" },
            { type: "text", value: "." },
          ],
        },
      ],
    },
    {
      date: "2024", // TODO: the Rayls work spans Sep 2023 – Sep 2025; move it to a date you like
      events: [
        {
          pt: "Construí um explorador cross-chain sob medida para a arquitetura do Rayls e um playground para demos, ambos em Next.js.",
          en: "Built a cross-chain explorer tailored to Rayls' architecture and a playground for demos, both in Next.js.",
        },
        {
          pt: "Auditei e melhorei smart contracts em Solidity, incluindo um ERC-20 com zero-knowledge.",
          en: "Audited and improved Solidity smart contracts, including a zero-knowledge ERC-20.",
        },
        {
          pt: "Mentorei estagiários e ajudei clientes a integrar com o Rayls.",
          en: "Mentored interns and helped clients integrate with Rayls.",
        },
      ],
    },
    {
      date: "2025-09",
      events: [
        {
          text: [
            { type: "text", value: { pt: "Entrei na ", en: "Joined " } },
            { type: "link", value: "Zerion", href: "https://zerion.io" },
            {
              type: "text",
              value: {
                pt: " como Solutions Engineer: a ponte entre clientes e engenharia.",
                en: " as a Solutions Engineer: the bridge between customers and engineering.",
              },
            },
          ],
        },
        {
          pt: "Melhorei APIs públicas a partir do feedback de clientes e desenhei um fluxo de suporte com IA para clientes B2B e B2C.",
          en: "Improved public APIs based on customer feedback, and designed an AI-assisted support workflow for B2B and B2C customers.",
        },
      ],
    },
    // {
    //   date: "TODO", // when the master's started
    //   events: [
    //     {
    //       pt: "Comecei o mestrado na UFRJ.",
    //       en: "Started a master's degree at UFRJ.",
    //     },
    //   ],
    // },
  ],
})
