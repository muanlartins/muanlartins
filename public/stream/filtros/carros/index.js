// His face as Rocket League's car, Pixar-style (filtros.html draws them: "the cars on the face"), with a
// demolition and a flip, painted from the dock.
const acoes = [
  ["demo", "", "Demolição"],
  ["flip", "", "Flip"],
]
export const filtros = [
  { id: "octane", nome: "Octane", jogo: "Rocket League", desenho: "carro", sons: "carro-", acoes, pintura: true, atalho: "8", teclas: { d: "demo", f: "flip" } },
  { id: "fennec", nome: "Fennec", jogo: "Rocket League", desenho: "carro", sons: "carro-", acoes, pintura: true, atalho: "9", teclas: { d: "demo", f: "flip" } },
]
