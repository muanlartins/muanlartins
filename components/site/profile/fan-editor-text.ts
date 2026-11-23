/**
 * The 3D fan editor's copy on /perfil, as the prototype's brand pass had it (brand/voz.md). Portuguese only: the profile
 * exists only on the Portuguese site, and the schema's own names (public/stream/torcedor3d/esquema.js) are Portuguese.
 * The team, arrival shout and stickers reuse content/profile.ts. Drafts for Luan.
 */
export const editor = {
  vista: "Seu torcedor",
  tela: "Seu torcedor em 3D. As setas giram. Escolhe uma peça livre pra mexer nela.",
  arrasta: "Arrasta pra girar",
  carregando: "Montando o seu torcedor…",
  semWebgl: "Este navegador não mostrou o 3D. Dá pra montar pelas abas e ver nas fotos.",
  desfazer: "Desfazer",
  refazer: "Refazer",
  painel: "Ajustes do torcedor",

  // The picked piece's bar over the 3D view.
  pecaEscolhida: "Peça escolhida",
  peca: (n: number) => `Peça ${n}`,
  pecas: (n: number) => `${n} peças`,
  mover: "Mover",
  girar: "Girar",
  esticar: "Esticar",
  encaixar: "Encaixar",
  encaixarDica: "Anda de 0,05 em 0,05 e gira de 15° em 15° (X)",
  duplicar: "Duplicar",
  copiar: "Copiar",
  copiarDica: "Copiar (Ctrl+C). Cola com Ctrl+V ou em “Colar peça”, na aba Livre",
  apagar: "Apagar",
  soltar: "Soltar a peça",

  pose: "Pose",
  poses: { parado: "Parado", cima: "Gol", aceno: "Aceno", palmas: "Palmas", triste: "Gol deles" },
  sortear: "Sortear um torcedor",

  // The T1 code.
  codigo: "Código do torcedor",
  codigoDica: "Copia pra guardar ou mandar, ou cola um e usa.",
  peso: "Quanto o torcedor ocupa salvo",
  pesoDe: (kb: string, max: string) => `${kb} de ${max} KB`,
  copiarCodigo: "Copiar",
  usarCodigo: "Usar código",
  copiarLink: "Copiar link",
  copiado: "Copiado.",
  selecionado: "Código selecionado. É só copiar.",
  naoAbriu: "Esse código não abriu. Confere se copiou ele inteiro, começando em T1:",
  pronto: "Pronto. Muda o que quiser.",
  linkCopiado: "Link copiado. Quem abrir vê este torcedor.",
  linkFalhou: "Não deu pra copiar o link aqui. Copia o código: ele abre o mesmo torcedor.",
  linkAbriu: "Torcedor aberto pelo link. Muda o que quiser e salva.",
  linkNaoAbriu: "O link não abriu um torcedor. Confere se ele veio inteiro.",

  // The search and the tabs.
  abas: "Partes do torcedor",
  buscaRotulo: "Procurar um ajuste em todas as abas",
  buscaExemplo: "Procurar: boné, sardas, franja…",
  limparBusca: "Limpar a busca",
  resultados: (n: number, q: string) => `${n} ${n === 1 ? "resultado" : "resultados"} pra “${q}”`,
  nada: (q: string) => `Nada com “${q}”. Tenta outra palavra, tipo boné, franja ou sardas.`,
  nadaCurto: (q: string) => `Nada com “${q}”`,
  outrasAbas: "Em outras abas",
  abrir: (aba: string) => `Abrir ${aba}`,

  modelosDica: "Começa de um modelo e muda o que quiser.",
  livreDica:
    "Monta aqui o que não tem nas listas: um escudo inventado, uma tatuagem, espinhos nas costas. Escolhe uma peça no torcedor pra mover, girar ou esticar ali mesmo. Com Shift, pega mais de uma.",
  outraCor: "Outra cor",

  // The free lists.
  listas: {
    pecas: { titulo: "Peças em 3D", nome: "peça", vazio: "Nenhuma peça ainda. Adiciona uma e mexe nela direto no torcedor." },
    desenhos: { titulo: "Desenhos", nome: "desenho", vazio: "Nenhum desenho ainda. Eles vão no rosto ou na camisa." },
    mechas: { titulo: "Mechas livres", nome: "mecha", vazio: "Nenhuma mecha livre ainda. Cada uma nasce de um ponto da cabeça e cai por cima do cabelo." },
  },
  adicionar: (nome: string) => `Adicionar ${nome}`,
  apagarItem: (nome: string) => `Apagar ${nome}`,
  colar: (n: number) => (n > 1 ? `Colar ${n} peças` : "Colar peça"),
  deMax: (n: number, max: number) => `${n} de ${max}`,

  // Searched for but not a control of the table.
  atalhos: [
    { nome: "Peças em 3D", aba: "Livre", dica: "Formas em 3D presas na cabeça, no corpo ou na mão.", palavras: "peca pecas 3d objeto escudo forma bola cubo cone espinho robo livre" },
    { nome: "Desenhos", aba: "Livre", dica: "Formas desenhadas no rosto ou na camisa.", palavras: "desenho desenhos tatuagem adesivo marca livre" },
    { nome: "Mechas livres", aba: "Cabelo", dica: "Mechas que você põe onde quiser na cabeça.", palavras: "mecha mechas livres fio cabelo" },
    { nome: "Galeria", aba: "Galeria", dica: "Os torcedores da torcida, pra usar o de quem você quiser.", palavras: "galeria torcida torcedores copiar outros" },
    { nome: "Modelos", aba: "Modelos", dica: "Torcedores prontos pra começar.", palavras: "modelo modelos pronto" },
  ],
  // The profile's own groups (team, arrival shout, stickers): which tab holds each and the words that find it.
  extras: {
    time: { aba: "Roupa", palavras: "time clube futebol camisa serie" },
    frase: { aba: "Acessórios", palavras: "frase grito chegada balao" },
    stickers: { aba: "Acessórios", palavras: "sticker stickers emoji figurinha gol" },
  },

  // The gallery: everyone's saved fans.
  galeria: {
    dica: "Os torcedores de quem já salvou o seu. Usa o de quem você quiser e muda o que quiser.",
    titulo: "Da torcida",
    carregando: "Carregando a galeria…",
    erro: "Não deu pra abrir a galeria.",
    vazio: "Nenhum torcedor na galeria ainda. O primeiro pode ser o seu.",
    usar: "Usar este",
    usarDe: (login: string) => `Usar este, o torcedor de ${login}`,
    seu: "O seu",
    usado: (login: string) => `Pronto, o torcedor de ${login} agora é o seu. Muda o que quiser.`,
    verMais: "Ver mais",
  },

  // The save bar's own line, beside content/profile.ts's.
  grandeDemais: "Esse torcedor ficou grande demais pra salvar. Tira umas peças, desenhos ou mechas.",
}
