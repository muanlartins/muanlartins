// The 3D fan's schema: what can be changed, in one table (the editor, the validation, the code and the dice all read
// it), the presets and the dice. Ids (`k` and each option's first item) are stored in profiles and codes and never
// change; only the names shown do. Pure: no three.js, no DOM, so the same file runs in OBS's overlays, the site (its
// bundler imports it), the tests and the profile API, which validates every saved look with this very normalizar
// (infra/perfil/torcedor3d.mjs links it). The rest of the fan is beside it: boneco.js draws it, vestir.js dresses it
// (club, VAR, December) and antigo.js turns the 2D fan into one. package.json here only tells Node these .js files are
// ES modules; browsers ignore it. scripts/torcedor3d.test.mjs pins the codes.
const op = (k, nome, opcoes, padrao, extra = {}) => ({ k, nome, tipo: "op", opcoes, padrao: padrao ?? opcoes[0][0], ...extra })
const num = (k, nome, min, max, padrao, extra = {}) => ({ k, nome, tipo: "num", min, max, padrao, ...extra })
const cor = (k, nome, padrao, paleta = "geral", extra = {}) => ({ k, nome, tipo: "cor", padrao, paleta, ...extra })
const sim = (k, nome, extra = {}) => ({ k, nome, tipo: "sim", padrao: false, ...extra })

export const PALETAS = {
  geral: ["#f4f5f7", "#85a7ff", "#002fa7", "#001447", "#4dd4ff", "#3ddc97", "#1f8a4c", "#ffd23f", "#ff9f43", "#e03131", "#ff5c9a", "#8b5cf6", "#2b2f38"],
  pele: ["#ffe0c7", "#f6c9a4", "#e9b48a", "#d29a6c", "#b97a50", "#8f5a3c", "#6b402c", "#472a20", "#9fd8b0", "#85a7ff", "#c792ea", "#9aa3b5", "#f4e3c8", "#c8843f", "#2f9e6a", "#e03131"],
  cabelo: ["#17181d", "#33231d", "#5a3825", "#8a5a36", "#c08b5c", "#e8c37a", "#b5462b", "#9aa3b5", "#f4f5f7", "#85a7ff", "#002fa7", "#ff5c9a", "#3ddc97"],
}
// The swatches' names, for screen readers and the tooltip.
export const NOMES_COR = {
  "#f4f5f7": "Branco", "#85a7ff": "Azul claro", "#002fa7": "Azul Klein", "#001447": "Azul-marinho", "#4dd4ff": "Ciano", "#3ddc97": "Verde-água",
  "#1f8a4c": "Verde", "#ffd23f": "Amarelo", "#ff9f43": "Laranja", "#e03131": "Vermelho", "#ff5c9a": "Rosa", "#8b5cf6": "Roxo", "#2b2f38": "Grafite",
  "#ffe0c7": "Pele bem clara", "#f6c9a4": "Pele clara", "#e9b48a": "Pele média clara", "#d29a6c": "Pele média", "#b97a50": "Pele morena", "#8f5a3c": "Pele morena escura",
  "#6b402c": "Pele escura", "#472a20": "Pele bem escura", "#9fd8b0": "Verde-menta", "#c792ea": "Lilás", "#9aa3b5": "Cinza", "#f4e3c8": "Creme", "#c8843f": "Caramelo", "#2f9e6a": "Verde-dragão",
  "#17181d": "Preto", "#33231d": "Castanho-escuro", "#5a3825": "Castanho", "#8a5a36": "Castanho-claro", "#c08b5c": "Mel", "#e8c37a": "Loiro", "#b5462b": "Ruivo",
}

// `se`: the control only shows when it does something; `dica` says what brings it out (the search shows it).
const se = (teste, dica) => ({ se: teste, dica })
const tem = (k, dica) => se((a) => a[k] !== "nada", dica)
const soLivre = se((a) => a.olho === "livre", "aparece com o olho Ajustável")
const comCilios = se((a) => a.cilios || a.ciliosB, "aparece com cílios")
const comOrelha = tem("orelha", "aparece quando tem orelha")
const comNariz = tem("nariz", "aparece quando tem nariz")
const comSobr = tem("sobr", "aparece quando tem sobrancelha")
const comFocinho = se((a) => a.focinho > 0, "aparece quando o focinho sai do rosto")
const comDuas = se((a) => a.cab2, "aparece com “Duas cores”")
const comNumero = se((a) => a.numOn, "aparece com “Número na camisa”")
const comRabo = se((a) => a.atras === "rabo" || a.atras === "marias", "aparece com rabo de cavalo ou maria-chiquinha")
const comCauda = tem("cauda", "aparece com cauda")
const comChapeu = tem("chapeu", "aparece com chapéu")

// A group's third item: `dica` stands in for it while none of its controls applies; `acao` is a button that applies it.
export const ESQUEMA = [
  ["Cabeça", [
    ["Pele e formato", [
      cor("pele", "Cor da pele", "#e9b48a", "pele"),
      num("larg", "Largura", 0.78, 1.25, 1), num("alt", "Altura", 0.78, 1.25, 1),
      num("quadr", "Pontuda ↔ quadrada", -1, 1, 0), num("queixo", "Queixo fino ↔ largo", -1, 1, 0),
      num("bochecha", "Bochechas", -0.5, 1, 0), num("testa", "Testa estreita ↔ larga", -1, 1, 0),
      num("tam", "Tamanho da cabeça", 0.8, 1.2, 1),
    ]],
    ["Focinho", [
      num("focinho", "Sem focinho ↔ focinho longo", 0, 1, 0, { busca: "bicho cachorro animal" }),
      num("focinhoL", "Largura", 0.5, 1.5, 1, comFocinho), num("focinhoY", "Altura", -0.45, 0, -0.25, comFocinho),
    ]],
    ["Orelhas", [
      op("orelha", "Formato", [["redonda", "Redonda"], ["pontuda", "Pontuda"], ["elfa", "De elfo"], ["abano", "De abano"], ["animal", "De bicho"], ["caida", "Caída"], ["urso", "De urso"], ["nada", "Sem"]], "redonda", { foto: true }),
      num("orelhaT", "Tamanho", 0.6, 1.8, 1, comOrelha), num("orelhaY", "Altura", -0.4, 0.3, 0, comOrelha), num("orelhaR", "Inclinação", -0.8, 0.8, 0, comOrelha),
      sim("orelha2", "Cor diferente da pele", comOrelha),
      cor("orelhaC", "Cor das orelhas", "#8a5a36", "pele", se((a) => a.orelha !== "nada" && a.orelha2, "aparece com “Cor diferente da pele”")),
    ]],
    ["Chifres e antenas", [
      op("chifre", "Tipo", [["nada", "Sem"], ["dragao", "De dragão"], ["carneiro", "De carneiro"], ["touro", "De touro"], ["unicornio", "De unicórnio"], ["diabinho", "De diabinho"], ["antena", "Antenas"], ["galhada", "Galhada"]], "nada", { foto: "alto" }),
      cor("chifreC", "Cor", "#e8c37a", "geral", tem("chifre", "aparece com chifre ou antena")), num("chifreT", "Tamanho", 0.6, 1.5, 1, tem("chifre", "aparece com chifre ou antena")),
    ]],
    ["Pelo e escamas", [
      op("pelo", "Desenho", [["nada", "Sem"], ["focinho", "Focinho e peito"], ["mancha", "Mancha no olho"], ["manchas", "Manchas"], ["listras", "Listras"], ["escamas", "Escamas"]], "nada", { foto: true }),
      cor("peloC", "Cor", "#f4e3c8", "pele", tem("pelo", "aparece com pelo ou escamas")),
    ]],
  ]],
  ["Rosto", [
    ["Olhos", [
      op("olho", "Formato", [["oval", "Oval"], ["grande", "Grande"], ["amendoa", "Amendoado"], ["ponto", "Pontinho"], ["feliz", "Sorrindo"], ["sono", "Com sono"], ["losango", "Losango"], ["traco", "Traço"], ["estrela", "Estrela"], ["reptil", "De réptil"], ["livre", "Ajustável"]], "oval", { foto: true }),
      cor("olhoC", "Cor", "#33231d", "cabelo"), sim("olho2", "Um de cada cor"),
      cor("olhoC2", "Cor do outro olho", "#4dd4ff", "geral", se((a) => a.olho2, "aparece com “Um de cada cor”")),
      num("olhoT", "Tamanho", 0.5, 1.8, 1), num("olhoA", "Achatado ↔ esticado", 0.5, 1.6, 1), num("olhoX", "Distância entre eles", 0.22, 0.62, 0.38),
      num("olhoY", "Altura", -0.2, 0.25, 0.02), num("olhoR", "Inclinação", -0.6, 0.6, 0),
    ]],
    ["Olho ajustável", [
      num("olhoCima", "Pálpebra de cima: baixa ↔ alta", -1, 1, 0, soLivre), num("olhoBaixo", "Pálpebra de baixo: reta ↔ redonda", -1, 1, 0, soLivre),
      num("olhoCanto", "Canto de fora: caído ↔ puxado", -1, 1, 0, soLivre), num("irisT", "Tamanho da íris", 0.5, 1.4, 1, soLivre),
      op("pupila", "Pupila", [["redonda", "Redonda"], ["fenda", "Fenda"], ["estrela", "Estrela"], ["coracao", "Coração"], ["nada", "Sem"]], "redonda", { foto: "olhos", ...soLivre }),
      num("pupilaT", "Tamanho da pupila", 0.4, 1.6, 1, soLivre),
      num("irisDeg", "Degradê na íris", 0, 1, 0, soLivre), cor("irisC", "Cor do degradê", "#85a7ff", "geral", se((a) => a.olho === "livre" && a.irisDeg > 0, "aparece com degradê na íris")),
      num("brilho", "Brilhos", 0, 3, 2, { passo: 1, ...soLivre }), num("brilhoT", "Tamanho do brilho", 0.5, 1.8, 1, soLivre),
    ], { dica: "Escolhe o formato Ajustável em Olhos pra desenhar o olho do seu jeito: pálpebras, íris, pupila e brilho.", acao: ["Usar o olho ajustável", { olho: "livre" }] }],
    ["Cílios e delineado", [
      sim("cilios", "Cílios"), sim("ciliosB", "Cílios de baixo"),
      num("ciliosL", "Comprimento dos cílios", 0.5, 2, 1, comCilios), num("ciliosG", "Grossura dos cílios", 0.5, 2.2, 1, comCilios),
      num("delineado", "Delineado", 0, 1, 0, { busca: "maquiagem" }),
    ]],
    ["Sobrancelhas", [
      op("sobr", "Formato", [["arco", "Arco"], ["reta", "Reta"], ["grossa", "Grossa"], ["brava", "Brava"], ["cortada", "Com falha"], ["fina", "Fina"], ["angulo", "Com bico"], ["bolinha", "Bolinha"], ["preocupada", "Preocupada"], ["onda", "Ondulada"], ["peluda", "Peluda"], ["nada", "Sem"]], "arco", { foto: true }),
      cor("sobrC", "Cor", "#33231d", "cabelo", comSobr), num("sobrT", "Tamanho", 0.5, 1.6, 1, comSobr), num("sobrX", "Distância entre elas", 0.22, 0.62, 0.39, comSobr),
      num("sobrY", "Altura", 0.1, 0.5, 0.29, comSobr), num("sobrR", "Inclinação", -0.6, 0.6, 0, comSobr), num("sobrG", "Grossura", 0.4, 2, 1, comSobr),
    ]],
    ["Nariz", [
      op("nariz", "Formato", [["botao", "Botão"], ["bola", "Bolinha"], ["longo", "Comprido"], ["triangulo", "Triângulo"], ["narinas", "Só narinas"], ["nada", "Sem"]], "botao", { foto: true }),
      num("narizT", "Tamanho", 0.5, 2, 1, comNariz), num("narizY", "Altura", -0.45, 0.05, -0.16, comNariz),
      sim("narizCor", "Cor diferente da pele", comNariz), cor("narizC", "Cor do nariz", "#2b2f38", "geral", se((a) => a.nariz !== "nada" && a.narizCor, "aparece com “Cor diferente da pele”")),
    ]],
    ["Boca", [
      op("boca", "Formato", [["sorriso", "Sorriso"], ["aberta", "Aberta"], ["dentes", "Sorriso com dentes"], ["lado", "De lado"], ["reta", "Reta"], ["lingua", "Língua pra fora"], ["oh", "Surpresa"], ["gato", "De bicho"], ["presas", "Presas"], ["tres", "Fofa"], ["bico", "Biquinho"], ["dente", "Dentinho"], ["berro", "Berro"], ["assobio", "Assobio"], ["onda", "Ondulada"]], "sorriso", { foto: true }),
      cor("bocaC", "Cor", "#6b2530", "geral", { busca: "batom" }), num("bocaT", "Tamanho", 0.5, 1.8, 1), num("bocaA", "Fina ↔ grossa", 0.5, 1.6, 1),
      num("bocaY", "Altura", -0.68, -0.28, -0.45), num("bocaR", "Inclinação", -0.5, 0.5, 0),
    ]],
    ["Barba", [
      op("barba", "Tipo", [["nada", "Sem"], ["bigode", "Bigode"], ["cavanhaque", "Cavanhaque"], ["rala", "Rala"], ["cheia", "Cheia"], ["longa", "Longa"]], "nada", { foto: true }),
      cor("barbaC", "Cor", "#33231d", "cabelo", tem("barba", "aparece com barba")),
    ]],
    ["Marcas e pintura", [
      op("pint", "Pintura", [["nada", "Sem"], ["faixas", "Nas bochechas"], ["metade", "Meio rosto"], ["mascara", "Faixa nos olhos"], ["raio", "Raio"]], "nada", { foto: true, busca: "maquiagem" }),
      cor("pintC", "Cor da pintura", "#002fa7", "geral", tem("pint", "aparece com pintura")), cor("pintC2", "Segunda cor", "#f4f5f7", "geral", tem("pint", "aparece com pintura")),
      sim("sardas", "Sardas"), sim("corado", "Bochechas coradas"), sim("pinta", "Pinta"), sim("cicatriz", "Cicatriz"),
    ]],
  ]],
  ["Cabelo", [
    ["Corte", [
      op("topo", "Em cima", [["curto", "Curto"], ["careca", "Careca"], ["raspado", "Raspado"], ["volume", "Volumoso"], ["afro", "Black power"], ["cachos", "Cachos"], ["espetado", "Espetado"], ["moicano", "Moicano"], ["coque", "Coque"], ["coque2", "Coque duplo"]], "curto", { foto: true }),
      op("franja", "Franja", [["lado", "De lado"], ["nada", "Sem"], ["reta", "Reta"], ["cortina", "Cortina"], ["mechas", "Repicada"], ["bico", "Em bico"], ["topete", "Topete"]], "lado", { foto: true }),
      op("atras", "Atrás", [["nada", "Curto"], ["medio", "Chanel"], ["longo", "Longo"], ["ondas", "Ondulado"], ["rabo", "Rabo de cavalo"], ["marias", "Maria-chiquinha"], ["trancas", "Duas tranças"], ["tranca", "Trança de lado"], ["dreads", "Dreads"], ["meio", "Meio preso"]], "nada", { foto: true }),
      num("vol", "Volume", 0, 1.5, 0.5), num("franjaL", "Comprimento da franja", -1, 1, 0, tem("franja", "aparece com franja")), num("comp", "Comprimento atrás", 0.5, 1.5, 1),
      num("linha", "Entradas", 0, 1, 0, { busca: "calvo testa" }), sim("vira", "Trocar de lado"), sim("fio", "Fio em pé"),
    ]],
    ["Pontas e rabo", [
      num("espN", "Quantas pontas", 6, 32, 20, { passo: 1, ...se((a) => a.topo === "espetado", "aparece com o corte Espetado") }),
      num("espL", "Tamanho das pontas", 0.5, 1.8, 1, se((a) => a.topo === "espetado" || a.topo === "moicano", "aparece com Espetado ou Moicano")),
      num("raboY", "Altura do rabo", -1, 1, 0, comRabo), num("raboA", "Abertura do rabo", 0, 1, 0.4, comRabo),
    ], { dica: "Aparece com os cortes Espetado e Moicano em cima, ou Rabo de cavalo e Maria-chiquinha atrás." }],
    ["Cor", [
      cor("cabC", "Cor", "#33231d", "cabelo"), sim("cab2", "Duas cores", { busca: "degradê luzes mechas" }), cor("cabC2", "Cor das pontas", "#85a7ff", "cabelo", comDuas),
      num("gradP", "Onde muda", -1.2, 1.2, 0.1, comDuas), num("gradS", "Suavidade da troca", 0.02, 1.2, 0.4, comDuas),
    ]],
  ]],
  ["Corpo", [
    ["Porte", [
      num("corpoL", "Largura", 0.75, 1.3, 1), num("corpoA", "Altura", 0.8, 1.15, 1), num("ombro", "Ombros caídos ↔ quadrados", 1, 4.5, 2.2),
      num("fundo", "Espessura", 0.5, 0.9, 0.66), num("pescoco", "Pescoço fino ↔ grosso", 0.2, 0.46, 0.31), num("incl", "Inclinação da cabeça", -0.3, 0.3, 0),
      num("giro", "Corpo virado", -0.5, 0.5, 0),
    ]],
    ["Nas costas", [
      op("costas", "Tipo", [["nada", "Nada"], ["morcego", "Asas de dragão"], ["penas", "Asas de penas"], ["fada", "Asas de fada"], ["capa", "Capa"]], "nada", { foto: "inteiro" }),
      cor("costasC", "Cor", "#f4f5f7", "geral", tem("costas", "aparece com asas ou capa")), cor("costasC2", "Detalhe", "#85a7ff", "geral", tem("costas", "aparece com asas ou capa")),
      num("costasT", "Tamanho", 0.7, 1.3, 1, tem("costas", "aparece com asas ou capa")),
    ]],
    ["Cauda", [
      op("cauda", "Tipo", [["nada", "Sem"], ["lagarto", "De dragão"], ["peluda", "Peluda"], ["curta", "De cachorro"], ["fina", "De gato"], ["diabo", "De diabinho"]], "nada", { foto: "inteiro", busca: "rabo" }),
      num("caudaT", "Tamanho", 0.7, 1.3, 1, comCauda), sim("caudaCor", "Cor diferente da pele", comCauda),
      cor("caudaC", "Cor da cauda", "#8a5a36", "pele", se((a) => a.cauda !== "nada" && a.caudaCor, "aparece com “Cor diferente da pele”")),
      cor("caudaC2", "Ponta e espinhos", "#f4f5f7", "geral", comCauda),
    ]],
  ]],
  ["Roupa", [
    ["Camisa", [
      op("roupa", "Estampa", [["lisa", "Lisa"], ["listras", "Listras verticais"], ["listrado", "Listras horizontais"], ["faixa", "Faixa transversal"], ["peito", "Faixa no peito"], ["metade", "Meio a meio"], ["xadrez", "Xadrez"], ["malha", "Tela"], ["chevron", "Faixa em V"], ["degrade", "Degradê"], ["tricolor", "Tricolor"], ["manto", "Manto"], ["pele", "Sem camisa"], ["barriga", "Sem camisa, com barriga"]], "lisa", { foto: "corpo", busca: "camiseta time" }),
      cor("cor", "Cor principal", "#002fa7"), cor("detalhe", "Segunda cor", "#f4f5f7"), cor("terceira", "Terceira cor", "#85a7ff"),
      num("estT", "Tamanho da estampa", 0.5, 2, 1),
      op("gola", "Gola", [["redonda", "Redonda"], ["v", "Em V"], ["polo", "Polo"], ["capuz", "Capuz caído"], ["nada", "Sem"]], "redonda", { foto: "corpo" }),
      cor("golaC", "Cor da gola", "#f4f5f7"),
    ]],
    ["Número", [
      sim("numOn", "Número na camisa"), num("numero", "Número", 0, 99, 10, { passo: 1, ...comNumero }), cor("numC", "Cor do número", "#f4f5f7", "geral", comNumero),
      num("numT", "Tamanho", 0.5, 1.5, 1, comNumero), num("numY", "Altura", -0.5, 0.5, 0, comNumero),
    ]],
    // Layers in 3D over the shirt, one field per slot so the code stays flat.
    ["Por cima", [
      op("sobre", "Tipo", [["nada", "Nada"], ["jaqueta", "Jaqueta"], ["moletom", "Moletom aberto"], ["sobretudo", "Sobretudo"], ["colete", "Colete"], ["capinha", "Capinha"]], "nada", { foto: "corpo", busca: "casaco blusa" }),
      cor("sobreC", "Cor", "#2b2f38", "geral", tem("sobre", "aparece com uma peça por cima")), sim("sobreBo", "Borda colorida", tem("sobre", "aparece com uma peça por cima")),
      cor("sobreB", "Borda e botões", "#f4f5f7", "geral", tem("sobre", "aparece com uma peça por cima")),
    ]],
    ["Gola alta e capuz", [
      op("golaA", "Gola alta", [["nada", "Sem"], ["role", "Rolê"], ["levantada", "Levantada"]], "nada", { foto: "corpo" }),
      cor("golaAC", "Cor da gola", "#2b2f38", "geral", tem("golaA", "aparece com gola alta")), sim("golaABo", "Borda na gola", tem("golaA", "aparece com gola alta")),
      cor("golaAB", "Cor da borda", "#f4f5f7", "geral", se((a) => a.golaA !== "nada" && a.golaABo, "aparece com “Borda na gola”")),
      op("capuz", "Capuz", [["nada", "Sem"], ["abaixado", "Abaixado"], ["levantado", "Levantado"]], "nada", { foto: "alto" }),
      cor("capuzC", "Cor do capuz", "#2b2f38", "geral", tem("capuz", "aparece com capuz")), cor("capuzB", "Borda e cordão", "#f4f5f7", "geral", tem("capuz", "aparece com capuz")),
    ]],
    ["Ombreiras e cintura", [
      op("ombreira", "Ombreiras", [["nada", "Sem"], ["lisa", "Lisas"], ["franja", "Com franja"], ["armadura", "Armadura"]], "nada", { foto: "corpo" }),
      cor("ombreiraC", "Cor das ombreiras", "#002fa7", "geral", tem("ombreira", "aparece com ombreiras")), cor("ombreiraB", "Detalhe das ombreiras", "#ffd23f", "geral", tem("ombreira", "aparece com ombreiras")),
      op("cinto", "Cintura", [["nada", "Nada"], ["cinto", "Cinto"], ["faixa", "Faixa"]], "nada", { foto: "corpo" }),
      cor("cintoC", "Cor do cinto", "#5a3825", "geral", tem("cinto", "aparece com cinto ou faixa")), cor("cintoB", "Fivela e pontas", "#ffd23f", "geral", tem("cinto", "aparece com cinto ou faixa")),
    ]],
    ["Mangas", [
      op("manga", "Manga da camisa", [["curta", "Curta"], ["longa", "Comprida"], ["nada", "Sem manga"]], "curta", { busca: "regata" }),
      sim("punho", "Punho na cor da gola"),
    ]],
  ]],
  ["Acessórios", [
    ["Na cabeça", [
      op("chapeu", "Chapéu", [["nada", "Sem"], ["bone", "Boné"], ["boneTras", "Boné pra trás"], ["gorro", "Gorro"], ["bucket", "Bucket"], ["bandana", "Bandana"], ["coroa", "Coroa"], ["cartola", "Cartola"], ["festa", "De festa"], ["aureola", "Auréola"], ["mago", "De mago"], ["tiara", "Tiara"]], "nada", { foto: "alto", busca: "touca" }),
      cor("chapC", "Cor", "#002fa7", "geral", comChapeu), cor("chapC2", "Detalhe", "#f4f5f7", "geral", comChapeu), num("chapT", "Tamanho", 0.8, 1.3, 1, comChapeu),
      num("chapY", "Altura", -0.15, 0.3, 0, comChapeu), num("chapR", "Inclinação", -0.5, 0.5, 0, comChapeu),
    ]],
    ["No rosto", [
      op("oculos", "Óculos", [["nada", "Sem"], ["redondo", "Redondos"], ["quadrado", "Quadrados"], ["escuro", "Escuros"], ["visor", "Visor"], ["monoculo", "Monóculo"]], "nada", { foto: true }),
      cor("ocC", "Cor dos óculos", "#001447", "geral", tem("oculos", "aparece com óculos")), num("ocT", "Tamanho dos óculos", 0.7, 1.4, 1, tem("oculos", "aparece com óculos")),
      op("fone", "Nas orelhas", [["nada", "Nada"], ["fone", "Fone"], ["brinco", "Brincos de argola"]], "nada", { foto: true, busca: "headset" }),
      cor("foneC", "Cor do fone ou brinco", "#85a7ff", "geral", tem("fone", "aparece com fone ou brinco")),
    ]],
    ["No pescoço", [
      op("pesc", "Tipo", [["nada", "Nada"], ["cachecol", "Cachecol"], ["corrente", "Corrente"], ["gravata", "Gravata"], ["laco", "Laço"], ["apito", "Apito"], ["lenco", "Lenço"], ["coleira", "Coleira"]], "nada", { foto: "corpo", busca: "colar" }),
      cor("pescC", "Cor", "#002fa7", "geral", tem("pesc", "aparece com algo no pescoço")), cor("pescC2", "Detalhe", "#f4f5f7", "geral", tem("pesc", "aparece com algo no pescoço")),
    ]],
    ["Na arquibancada", [
      op("mao", "Na mão", [["nada", "Nada"], ["bandeira", "Bandeira"], ["corneta", "Corneta"], ["dedo", "Mão de espuma"], ["celular", "Celular"], ["cajado", "Cajado"], ["varinha", "Varinha"]], "nada", { foto: "corpo" }),
      cor("maoC", "Cor", "#002fa7", "geral", tem("mao", "aparece com algo na mão")), cor("maoC2", "Detalhe", "#8a5a36", "geral", tem("mao", "aparece com algo na mão")),
      // "bananeira" is the 2D fan's handstand (public/stream/torcedor.js), kept for whoever had it there.
      op("fes", "Comemoração no gol", [["pula", "Pula"], ["danca", "Dança"], ["gira", "Gira"], ["acena", "Acena"], ["palmas", "Palmas"], ["bananeira", "Bananeira"]], "pula", { busca: "festa gol" }),
    ]],
  ]],
]

// The free part: anything the lists don't have.
export const PECA = [
  op("f", "Forma", [["bola", "Bola"], ["cubo", "Cubo"], ["cone", "Cone"], ["tubo", "Cilindro"], ["anel", "Anel"], ["losango", "Losango"], ["gota", "Gota"], ["chifre", "Chifre"], ["placa", "Placa"], ["capsula", "Cápsula"]]),
  cor("c", "Cor", "#85a7ff"), num("x", "Esquerda ↔ direita", -1.6, 1.6, 0.6), num("y", "Altura", -2.8, 1.9, 0.9), num("z", "Atrás ↔ na frente", -1.3, 1.5, 0),
  num("sx", "Largura", 0.03, 1.2, 0.22), num("sy", "Comprimento", 0.03, 1.2, 0.35), num("sz", "Espessura", 0.03, 1.2, 0.22),
  num("rx", "Inclinar pra frente", -3.14, 3.14, 0), num("ry", "Girar", -3.14, 3.14, 0), num("rz", "Inclinar pro lado", -3.14, 3.14, -0.4),
  { ...sim("m", "Dos dois lados"), padrao: true },
  op("onde", "Presa em", [["auto", "Pela altura"], ["cabeca", "Cabeça"], ["corpo", "Corpo"], ["mao", "Mão"]]),
]
/** Where a free piece rides. "auto" is the first rule: the head above the chin, the body below it. */
export const ondeFica = (d) => (d.onde === "auto" ? (d.y > -1 ? "cabeca" : "corpo") : d.onde)
export const DESENHO = [
  op("f", "Forma", [["circulo", "Círculo"], ["quadrado", "Quadrado"], ["triangulo", "Triângulo"], ["losango", "Losango"], ["estrela", "Estrela"], ["coracao", "Coração"], ["traco", "Traço"], ["arco", "Arco"], ["lua", "Lua"]], "estrela"),
  op("em", "Onde", [["rosto", "Rosto"], ["camisa", "Camisa"]]),
  cor("c", "Cor", "#ffd23f"), num("x", "Esquerda ↔ direita", -1, 1, 0.42), num("y", "Altura", -0.95, 0.95, -0.2),
  num("t", "Tamanho", 0.03, 0.8, 0.16), num("a", "Achatado ↔ esticado", 0.3, 3, 1), num("r", "Girar", -3.14, 3.14, 0),
  sim("m", "Dos dois lados"),
]
export const PECAS_MAX = 12
export const DESENHOS_MAX = 16
// Free locks: each grows from a place on the head, lying on the hair while over it, then hanging.
export const MECHA = [
  num("a", "Posição ao redor da cabeça", -3.14, 3.14, 0.5), num("h", "Altura na cabeça", 0.05, 2.3, 0.6),
  num("l", "Comprimento", 0.1, 2.5, 0.8), num("d", "Direção", -3.14, 3.14, 0),
  num("s", "Afastada da cabeça", 0, 1, 0.1), num("k", "Curva", -1, 1, 0.3), num("e", "Grossura", 0.03, 0.4, 0.12),
  sim("p", "Cor própria"), cor("c", "Cor", "#ff5c9a", "cabelo", se((m) => m.p, "aparece com “Cor própria”")), sim("m", "Dos dois lados"),
]
export const MECHAS_MAX = 16

export const CAMPOS = ESQUEMA.flatMap(([, grupos]) => grupos.flatMap(([, campos]) => campos))
const HEX6 = /^#[0-9a-f]{6}$/i

// Beyond the drawing, what the stand does with the fan, as the 2D fan has it (public/stream/torcedor.js): their team
// (a club of TIMES dresses the shirt, vestir.js; any other is just its name), the line they shout when they arrive
// and the stickers they throw on a goal and on a goal against. Not in ESQUEMA: they aren't controls on the model.
export const TIME_MAX = 24
export const FRASE_MAX = 30
export const STICKERS_MAX = 3
export const PADRAO_STICKERS = { gol: ["🎉"], contra: ["😭"] }
const EMOJI = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200d\ufe0f]*$/u
export const umEmoji = (e) => typeof e === "string" && e.length <= 16 && EMOJI.test(e)
const linha = (s, max) => Array.from(s.replace(/\s+/g, " ").trim()).slice(0, max).join("").trim()
function torcida(de) {
  const st = de.stickers && typeof de.stickers === "object" ? de.stickers : {}
  const lista = (quando) => (Array.isArray(st[quando]) ? st[quando].filter(umEmoji).slice(0, STICKERS_MAX) : [...PADRAO_STICKERS[quando]])
  return {
    time: typeof de.time === "string" ? linha(de.time, TIME_MAX) : "",
    frase: typeof de.frase === "string" ? linha(de.frase, FRASE_MAX) : "",
    stickers: { gol: lista("gol"), contra: lista("contra") },
  }
}
const mesmos = (x, y) => x.length === y.length && x.every((e, i) => e === y[i])

function validar(campos, entrada) {
  const de = entrada && typeof entrada === "object" ? entrada : {}
  const o = {}
  for (const c of campos) {
    const v = de[c.k]
    let certo = false
    if (c.tipo === "op") certo = c.opcoes.some(([id]) => id === v)
    else if (c.tipo === "cor") certo = typeof v === "string" && HEX6.test(v)
    else if (c.tipo === "sim") certo = typeof v === "boolean"
    else certo = typeof v === "number" && Number.isFinite(v)
    if (!certo) o[c.k] = c.padrao
    else if (c.tipo === "num") o[c.k] = c.passo ? Math.round(Math.min(c.max, Math.max(c.min, v))) : Math.round(Math.min(c.max, Math.max(c.min, v)) * 1000) / 1000
    else o[c.k] = c.tipo === "cor" ? v.toLowerCase() : v
  }
  return o
}

export function normalizar(entrada) {
  const de = entrada && typeof entrada === "object" ? entrada : {}
  const a = validar(CAMPOS, de)
  a.pecas = (Array.isArray(de.pecas) ? de.pecas : []).slice(0, PECAS_MAX).map((p) => validar(PECA, p))
  a.desenhos = (Array.isArray(de.desenhos) ? de.desenhos : []).slice(0, DESENHOS_MAX).map((p) => validar(DESENHO, p))
  a.mechas = (Array.isArray(de.mechas) ? de.mechas : []).slice(0, MECHAS_MAX).map((p) => validar(MECHA, p))
  return Object.assign(a, torcida(de))
}

/** Only what differs from the default: what the profile would store. */
export function enxugar(a) {
  const so = (campos, de) => Object.fromEntries(campos.filter((c) => de[c.k] !== c.padrao).map((c) => [c.k, de[c.k]]))
  const o = so(CAMPOS, a)
  if (a.pecas.length) o.pecas = a.pecas.map((p) => so(PECA, p))
  if (a.desenhos.length) o.desenhos = a.desenhos.map((p) => so(DESENHO, p))
  if (a.mechas.length) o.mechas = a.mechas.map((p) => so(MECHA, p))
  if (a.time) o.time = a.time
  if (a.frase) o.frase = a.frase
  if (!mesmos(a.stickers.gol, PADRAO_STICKERS.gol) || !mesmos(a.stickers.contra, PADRAO_STICKERS.contra)) o.stickers = a.stickers
  return o
}
// The share code: base64url of the JSON's UTF-8 (a frase or a sticker isn't Latin-1, which btoa alone would refuse).
// A look without them is ASCII, whose UTF-8 is itself, so every code the prototype made reads and comes out the same.
export const CODIGO_MAX = 12000
export function codigo(a) {
  let bytes = ""
  for (const b of new TextEncoder().encode(JSON.stringify(enxugar(a)))) bytes += String.fromCharCode(b)
  return "T1:" + btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
export function lerCodigo(texto) {
  const t = String(texto).trim()
  if (!t.startsWith("T1:") || t.length > CODIGO_MAX) return null
  try {
    const bytes = Uint8Array.from(atob(t.slice(3).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))
    return normalizar(JSON.parse(new TextDecoder().decode(bytes)))
  } catch {
    return null
  }
}

// Presets: original archetypes of a stand, each made only with what the editor has.
export const MODELOS = [
  ["Organizada", { franja: "mechas", chapeu: "bone", pint: "faixas", boca: "aberta", mao: "bandeira", maoC: "#85a7ff", roupa: "faixa", numOn: true, numero: 12, numT: 0.8, numY: 0.1, sobre: "jaqueta", sobreC: "#001447", sobreBo: true, sobreB: "#85a7ff" }],
  ["Veterana", { pele: "#b97a50", topo: "coque", franja: "cortina", cabC: "#f4f5f7", oculos: "redondo", fone: "brinco", foneC: "#ffd23f", olho: "feliz", cor: "#8b5cf6", gola: "polo", sobrC: "#9aa3b5", vol: 0.8, fes: "palmas", golaA: "role", golaAC: "#f4f5f7" }],
  ["Gamer", { pele: "#f6c9a4", topo: "volume", franja: "mechas", cab2: true, cabC2: "#4dd4ff", gradP: 0.3, olho: "grande", olhoC: "#002fa7", fone: "fone", cor: "#001447", golaC: "#002fa7", roupa: "chevron", detalhe: "#4dd4ff", boca: "lado", mao: "celular", olho: "livre", irisDeg: 0.8, irisC: "#4dd4ff", brilho: 3, fio: true, sobre: "moletom", sobreC: "#001447", capuz: "abaixado", capuzC: "#002fa7", capuzB: "#4dd4ff" }],
  ["Black power", { pele: "#8f5a3c", topo: "afro", franja: "nada", cabC: "#17181d", vol: 1, boca: "dentes", roupa: "listras", cor: "#ffd23f", detalhe: "#1f8a4c", golaC: "#1f8a4c", fone: "brinco", foneC: "#ffd23f", fes: "danca", corado: true }],
  ["Punk", { pele: "#ffe0c7", topo: "moicano", franja: "nada", cabC: "#ff5c9a", vol: 1.2, sobr: "cortada", olho: "amendoa", cilios: true, boca: "lingua", pesc: "corrente", pescC: "#9aa3b5", cor: "#2b2f38", roupa: "xadrez", detalhe: "#e03131", gola: "v", cicatriz: true, fes: "gira", olho2: true, espL: 1.3 }],
  ["Tiozão", { pele: "#d29a6c", topo: "curto", franja: "nada", linha: 1, cabC: "#5a3825", barba: "bigode", barbaC: "#5a3825", bochecha: 0.7, queixo: 0.4, corpoL: 1.25, larg: 1.1, gola: "polo", cor: "#e03131", roupa: "peito", mao: "corneta", maoC: "#ffd23f", olho: "ponto", sobr: "grossa", boca: "aberta" }],
  ["Rainha", { pele: "#6b402c", topo: "volume", atras: "ondas", franja: "cortina", cabC: "#17181d", chapeu: "coroa", chapC: "#ffd23f", chapC2: "#4dd4ff", cilios: true, olho: "grande", bocaC: "#c0285a", cor: "#8b1e3f", gola: "v", golaC: "#ffd23f", pesc: "corrente", pescC: "#ffd23f", queixo: -0.4, fes: "acena", delineado: 0.7, ciliosL: 1.3, sobre: "capinha", sobreC: "#8b1e3f", sobreBo: true, sobreB: "#ffd23f" }],
  ["Barbudo", { pele: "#e9b48a", chapeu: "gorro", chapC: "#1f8a4c", chapC2: "#f4f5f7", barba: "longa", barbaC: "#b5462b", cabC: "#b5462b", sobrC: "#b5462b", olhoC: "#1f8a4c", corpoL: 1.15, ombro: 3.4, roupa: "xadrez", cor: "#1f8a4c", detalhe: "#001447", boca: "dentes", pint: "faixas", pintC: "#f4f5f7", pintC2: "#1f8a4c" }],
  ["Festeira", { pele: "#e9b48a", atras: "marias", franja: "reta", cabC: "#8a5a36", cab2: true, cabC2: "#ff5c9a", gradP: -0.3, chapeu: "festa", chapC: "#ff5c9a", chapC2: "#ffd23f", sardas: true, corado: true, olho: "livre", pupila: "estrela", olhoCima: 0.6, raboY: 0.4, olhoC: "#8b5cf6", boca: "aberta", roupa: "degrade", cor: "#ff5c9a", detalhe: "#ff9f43", pesc: "laco", pescC: "#ffd23f", corpoL: 0.88, fes: "pula" }],
  ["Robô", { pele: "#9aa3b5", quadr: 1, topo: "careca", franja: "nada", orelha: "nada", nariz: "nada", sobr: "nada", olho: "losango", olhoC: "#4dd4ff", boca: "reta", bocaC: "#001447", bocaA: 1.4, roupa: "malha", cor: "#001447", detalhe: "#85a7ff", gola: "nada", ombro: 1, pescoco: 0.22,
    pecas: [{ f: "tubo", c: "#001447", x: 0.98, y: 0, sx: 0.2, sy: 0.3, sz: 0.2, rz: 1.57 }, { f: "tubo", c: "#001447", x: 0, y: 1.2, sx: 0.07, sy: 0.6, sz: 0.07, rz: 0, m: false }, { f: "bola", c: "#e03131", x: 0, y: 1.55, sx: 0.28, sy: 0.28, sz: 0.28, rz: 0, m: false }],
    desenhos: [{ f: "quadrado", c: "#001447", x: 0.7, y: 0.55, t: 0.07, m: true }, { f: "losango", em: "camisa", c: "#4dd4ff", x: 0, y: 0, t: 0.32 }] }],
  ["De outro planeta", { pele: "#9fd8b0", topo: "careca", franja: "nada", testa: 0.9, queixo: -0.8, orelha: "pontuda", orelhaT: 1.3, olho: "amendoa", olhoT: 1.4, olhoR: 0.3, olhoC: "#8b5cf6", sobr: "nada", nariz: "nada", boca: "oh", bocaT: 0.6, cor: "#8b5cf6", roupa: "chevron", detalhe: "#3ddc97", gola: "capuz", golaC: "#001447",
    pecas: [{ f: "tubo", c: "#9fd8b0", x: 0.42, y: 1.12, sx: 0.07, sy: 0.6, sz: 0.07 }, { f: "bola", c: "#ffd23f", x: 0.56, y: 1.45, sx: 0.22, sy: 0.22, sz: 0.22 }] }],
  ["Elfa maga", {pele: "#f6c9a4", orelha: "elfa", orelhaT: 1.15, topo: "curto", franja: "lado", atras: "tranca", comp: 1.0, vol: 0.4, cabC: "#b5462b", olho: "amendoa", olhoC: "#8b5cf6", cilios: true, sobrC: "#8a3a22", boca: "sorriso", bocaC: "#c0285a", queixo: -0.3, roupa: "manto", cor: "#1f8a4c", detalhe: "#ffd23f", terceira: "#f4f5f7", gola: "nada", costas: "capa", costasC: "#001447", costasC2: "#ffd23f", chapeu: "mago", chapC: "#1f8a4c", chapC2: "#ffd23f", fone: "brinco", foneC: "#ffd23f", mao: "cajado", maoC: "#4dd4ff", maoC2: "#8a5a36", fes: "acena"}],
  ["Caramelo", {pele: "#c8843f", topo: "careca", franja: "nada", focinho: 0.75, focinhoL: 1.05, focinhoY: -0.28, pelo: "focinho", peloC: "#f4e3c8", orelha: "caida", orelhaT: 1.15, orelha2: true, orelhaC: "#8a5a36", nariz: "bola", narizT: 1.5, narizY: -0.13, narizCor: true, narizC: "#2b2f38", olho: "oval", olhoC: "#33231d", olhoY: 0.12, olhoX: 0.42, olhoT: 1.1, sobr: "arco", sobrC: "#8a5a36", sobrY: 0.38, boca: "lingua", bocaY: -0.42, bocaT: 0.9, bocaC: "#5b1e28", roupa: "pele", gola: "nada", pesc: "lenco", pescC: "#e03131", pescC2: "#f4f5f7", cauda: "curta", fes: "pula"}],
  ["Dragão", {pele: "#2f9e6a", topo: "careca", franja: "nada", focinho: 0.8, focinhoL: 1.15, focinhoY: -0.27, pelo: "escamas", peloC: "#24835a", quadr: 0.2, testa: 0.2, orelha: "nada", chifre: "dragao", chifreC: "#e8c37a", olho: "reptil", olhoC: "#ffd23f", olhoY: 0.12, olhoR: 0.2, sobr: "brava", sobrC: "#1f6b46", sobrY: 0.36, nariz: "narinas", narizY: -0.12, narizT: 1.3, boca: "presas", bocaY: -0.42, bocaC: "#14402c", roupa: "barriga", detalhe: "#e8c37a", gola: "nada", costas: "morcego", costasC: "#1f6b46", costasC2: "#e8c37a", cauda: "lagarto", caudaC2: "#e8c37a", fes: "gira", pecas: [{f: "placa", c: "#e8c37a", x: 0, y: 1.0, z: -0.05, sx: 0.22, sy: 0.3, sz: 0.06, rx: -0.3, rz: 0, m: false}, {f: "placa", c: "#e8c37a", x: 0, y: 0.7, z: -0.75, sx: 0.22, sy: 0.3, sz: 0.06, rx: -1.1, rz: 0, m: false}]}],
]

/** A fan by chance, from a seed, kept to choices that still read as someone. */
export function sortear(semente = Math.random() * 1e9) {
  let s = Math.floor(semente) >>> 0
  const r = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const um = (l) => l[Math.floor(r() * l.length)]
  const qual = (k) => um(CAMPOS.find((c) => c.k === k).opcoes)[0]
  const talvez = (p, k) => (r() < p ? qual(k) : CAMPOS.find((c) => c.k === k).padrao)
  const perto = (k, f = 0.35) => {
    const c = CAMPOS.find((x) => x.k === k)
    return c.padrao + (r() < 0.5 ? (c.min - c.padrao) : (c.max - c.padrao)) * r() * f
  }
  // A layer brings its colours only when it is worn, so the profile stays short.
  const veste = (k, p, cores) => {
    const v = talvez(p, k)
    return v === "nada" ? {} : { [k]: v, ...cores() }
  }
  const cabelo = um(PALETAS.cabelo.slice(0, r() < 0.8 ? 7 : 13))
  const camisa = um(PALETAS.geral)
  const detalhe = um(PALETAS.geral.filter((c) => c !== camisa))
  const topo = talvez(0.6, "topo")
  const atras = talvez(0.45, "atras")
  const chapeu = talvez(0.3, "chapeu")
  const manga = talvez(0.3, "manga")
  // The adjustable eye now and then, kept close to a plain eye.
  const olho = r() < 0.1 ? "livre" : r() < 0.7 ? um(CAMPOS.find((c) => c.k === "olho").opcoes.filter(([v]) => v !== "livre"))[0] : "oval"
  const olhoLivre = olho !== "livre" ? {} : {
    olhoCima: perto("olhoCima", 0.5), olhoBaixo: perto("olhoBaixo", 0.5), olhoCanto: perto("olhoCanto", 0.6), irisT: perto("irisT", 0.5),
    pupila: r() < 0.8 ? "redonda" : um(["fenda", "estrela", "coracao"]), brilho: um([1, 2, 2, 3]),
    ...(r() < 0.4 ? { irisDeg: 0.3 + r() * 0.5, irisC: um(["#4dd4ff", "#85a7ff", "#3ddc97", "#ffd23f", "#ff5c9a"]) } : {}),
  }
  // Hair sliders near the middle; the spikes' and the ponytail's only when the cut has them.
  const cabeloAjustes = {
    vol: r() * 1.2, franjaL: perto("franjaL", 0.6), comp: perto("comp", 0.6), linha: r() < 0.12 ? r() * 0.6 : 0, fio: r() < 0.08,
    ...(topo === "espetado" || topo === "moicano" ? { espN: perto("espN", 0.5), espL: perto("espL", 0.5) } : {}),
    ...(atras === "rabo" || atras === "marias" ? { raboY: perto("raboY", 0.7), raboA: perto("raboA", 0.6) } : {}),
  }
  // A raised hood only on a bare head.
  const capuz = veste("capuz", 0.1, () => ({ capuzC: camisa, capuzB: detalhe }))
  if (capuz.capuz === "levantado" && chapeu !== "nada") capuz.capuz = "abaixado"
  return normalizar({
    ...Object.fromEntries(["larg", "alt", "quadr", "queixo", "bochecha", "testa", "olhoT", "olhoX", "olhoY", "sobrT", "narizT", "bocaT", "corpoL", "ombro"].map((k) => [k, perto(k)])),
    pele: um(PALETAS.pele.slice(0, r() < 0.93 ? 8 : 12)), orelha: r() < 0.25 ? um(["pontuda", "elfa", "abano", "nada"]) : "redonda", olho, ...olhoLivre, olhoC: um(["#33231d", "#002fa7", "#1f8a4c", "#17181d", "#8a5a36"]),
    cilios: r() < 0.3, sobr: talvez(0.5, "sobr"), sobrC: cabelo, nariz: talvez(0.5, "nariz"), boca: talvez(0.7, "boca"), barba: talvez(0.2, "barba"), barbaC: cabelo,
    pint: talvez(0.18, "pint"), pintC: camisa, pintC2: detalhe, sardas: r() < 0.15, corado: r() < 0.15,
    topo, franja: talvez(0.75, "franja"), atras, ...cabeloAjustes, cabC: cabelo, cab2: r() < 0.15, cabC2: um(PALETAS.cabelo), vira: r() < 0.5,
    roupa: r() < 0.8 ? um(CAMPOS.find((c) => c.k === "roupa").opcoes.filter(([v]) => !["pele", "barriga"].includes(v)))[0] : "lisa", cor: camisa, detalhe, terceira: um(PALETAS.geral), gola: talvez(0.6, "gola"), golaC: detalhe, numOn: r() < 0.3, numero: Math.floor(r() * 100), numC: detalhe,
    chapeu, chapC: camisa, chapC2: detalhe, oculos: talvez(0.2, "oculos"), fone: talvez(0.15, "fone"), pesc: talvez(0.2, "pesc"), pescC: camisa, pescC2: detalhe,
    mao: talvez(0.3, "mao"), maoC: camisa, fes: um(["pula", "danca", "gira", "acena", "palmas"]),
    manga, punho: manga === "longa" && r() < 0.4,
    ...veste("sobre", 0.2, () => ({ sobreC: um(PALETAS.geral.filter((c) => c !== camisa)), sobreB: detalhe, sobreBo: r() < 0.5 })),
    ...capuz, ...veste("golaA", 0.08, () => ({ golaAC: detalhe, ...(r() < 0.4 ? { golaABo: true, golaAB: camisa } : {}) })),
    ...veste("ombreira", 0.05, () => ({ ombreiraC: camisa })), ...veste("cinto", 0.08, () => ({})),
  })
}
