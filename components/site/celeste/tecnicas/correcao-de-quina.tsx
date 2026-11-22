import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Figures, Milestones, Quote, Text } from "@/components/site/celeste/tecnicas/parts"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import type { Demo, DemoTake } from "@/lib/celeste-demo"
import { footageOf } from "@/lib/celeste-demos"

/**
 * Corner correction, from the research of 2026-11-22: OnCollideH/OnCollideV in the installed game (1.4.0.0), the takes
 * filmed in 1A (room 2, the spot of the developer's own clips, and room 5z) and the changelog. Frames count from the
 * update her head meets the corner.
 */

function headTake(id: string, overlap: number, dash: boolean): DemoTake {
  const slips = overlap <= (dash ? 5 : 4)
  const start = dash ? { from: -7, text: "Dash reto pra cima" } : { from: -8, text: "Pulo reto pra cima" }
  return {
    id,
    label: dash ? `${overlap} px, dash` : `${overlap} px`,
    name: `${overlap} pixels da cabeça embaixo do bloco${dash ? ", num dash pra cima" : ""}`,
    ok: slips,
    rival: slips ? (dash ? "dash6" : "5") : dash ? "dash5" : "4",
    steps: [
      start,
      slips
        ? { from: 0, text: `Bateu ${overlap} px na quina: desliza pro lado`, tone: "window" }
        : { from: 0, text: `Bateu ${overlap} px na quina: é demais`, tone: "fail" },
    ],
  }
}

const HEAD: Demo = {
  id: "quina",
  alt: "Madeline pula reto embaixo da beirada de um bloco, com uma parte diferente da cabeça embaixo dele em cada tomada",
  choose: "Quanto da cabeça fica embaixo do bloco",
  zero: 129,
  cover: { take: "4", at: 1 },
  moment: [-3, 4],
  boxes: [],
  takes: [headTake("1", 1, false), headTake("3", 3, false), headTake("4", 4, false), headTake("5", 5, false), headTake("dash5", 5, true), headTake("dash6", 6, true)],
}

const LEDGE: Demo = {
  id: "quina-dash",
  alt: "Madeline cai ao lado de um degrau e dá dash pro lado: num frame ela sobe nele, no seguinte bate na parede",
  choose: "Quando ela dá o dash",
  zero: 160,
  cover: { take: "30", at: 0 },
  moment: [-9, 3],
  boxes: [],
  takes: [
    {
      id: "30",
      label: "4 px abaixo",
      name: "Dash com os pés 4 px abaixo do degrau",
      ok: true,
      press: -8,
      rival: "31",
      steps: [
        { from: -15, text: "Caindo do pulo" },
        { from: -8, text: "Dash pro lado, pés 4 px abaixo do degrau" },
        { from: 0, text: "Raspou na quina: subiu pro degrau", tone: "window" },
      ],
    },
    {
      id: "31",
      label: "5 px abaixo",
      name: "Dash com os pés 5 px abaixo do degrau, 1 frame depois",
      ok: false,
      press: -7,
      rival: "30",
      steps: [
        { from: -15, text: "Caindo do pulo" },
        { from: -7, text: "Dash pro lado 1 frame depois, pés 5 px abaixo" },
        { from: 1, text: "Bateu na parede", tone: "fail" },
        { from: 24, text: "De volta lá embaixo", tone: "fail" },
      ],
    },
  ],
}

const KILL: Demo = {
  id: "quina-mata",
  alt: "Madeline pula reto embaixo de uma parede coberta de espinhos: um pixel mais pra dentro ela só bate, um pixel mais pra fora a correção empurra ela pros espinhos",
  choose: "Onde ela pula",
  zero: 134,
  cover: { take: "208", at: 0 },
  moment: [-3, 3],
  takes: [
    {
      id: "207",
      label: "1 px pra dentro",
      ok: true,
      rival: "208",
      steps: [
        { from: -13, text: "Pulo reto, embaixo da parede de espinhos" },
        { from: 0, text: "Bateu a cabeça e ficou ali", tone: "window" },
        { from: 17, text: "De volta no chão", tone: "window" },
      ],
    },
    {
      id: "208",
      label: "1 px pra fora",
      ok: false,
      rival: "207",
      steps: [
        { from: -13, text: "Pulo reto, embaixo da parede de espinhos" },
        { from: 0, text: "A correção empurrou 4 px pros espinhos", tone: "fail" },
      ],
    },
  ],
}

export function correcaoDeQuina(): Technique {
  return {
    sections: [
      {
        id: "no-jogo",
        title: "No jogo",
        body: (
          <div className="space-y-6">
            <DemoPlayer demo={HEAD} footage={footageOf(HEAD)} />
            <Text>
              <p>Se a cabeça bate a até 4 px da quina, o jogo desliza ela pro lado e o pulo segue como se nada tivesse acontecido. Com 5 px, ela bate. Num dash reto pra cima a folga vai a 5 px. Liga a hitbox pra ver a caixa que bate de verdade.</p>
            </Text>
          </div>
        ),
      },
      {
        id: "como-funciona",
        title: "Como funciona",
        body: (
          <div className="space-y-8">
            <Text>
              <p>
                O jogo anda com a Madeline um pixel de cada vez. No pixel em que a caixa dela encosta num bloco, ele testa se um pequeno desvio deixa ela livre e, se deixa, move ela e mantém a velocidade. Subindo, o desvio é pro lado. No dash pro lado, pra cima ou pra baixo de um degrau. No dash pra baixo, pra fora de uma beirada.
              </p>
              <p>O desvio só acontece pro lado em que ela já está indo. Ele ajuda a sair de baixo de um bloco, nunca puxa pra baixo de outro.</p>
            </Text>
            <Figures
              items={[
                { label: "Subindo", value: "4 px", note: "metade da largura dela" },
                { label: "Dash pra cima", value: "5 px", note: "desde a versão 1.2.3" },
                { label: "A caixa dela", value: "8 × 11", note: "o desenho tem 13 × 17" },
                { label: "Fora da caixa", value: "49%", note: "do desenho, o coque inteiro incluso" },
              ]}
            />
          </div>
        ),
      },
      {
        id: "degrau",
        title: "No dash pro lado, ela sobe no degrau",
        description: "Um dash que raspa a quina de um degrau com os pés até 4 px abaixo do topo põe ela em cima dele. Com 5 px, um frame depois, é parede.",
        body: <DemoPlayer demo={LEDGE} footage={footageOf(LEDGE)} />,
      },
      {
        id: "mata",
        title: "A correção que mata",
        description: "Até 2021, as correções do dash podiam jogar a Madeline em cima de espinhos. A versão 1.4 consertou as do dash. A do pulo segue sem olhar: um pixel pra fora e ela é empurrada pra dentro dos espinhos.",
        body: <DemoPlayer demo={KILL} footage={footageOf(KILL)} />,
      },
      {
        id: "historia",
        title: "Antes de Celeste",
        body: (
          <div className="space-y-8">
            <Milestones
              items={[
                { when: "1980", title: "Pac-Man", children: "Faz a curva antes da hora, cortando caminho em diagonal por alguns pixels. Os fantasmas não conseguem. No código desmontado, um comentário: “parece que é por isso que o Pac-Man faz as curvas rápido”." },
                { when: "1985", title: "Super Mario Bros.", children: "Com menos da metade do Mario embaixo do tijolo, ele não bate a cabeça: é empurrado pro lado, 1 pixel por frame, e segue subindo. E pés que pousam até 4 px abaixo do topo de um bloco sobem pra cima dele." },
                { when: "1989", title: "Prince of Persia", children: "Quem pousa perto demais da beirada é puxado de volta. No código, o limite tem uma anotação de ajuste: “era 2”." },
                { when: "2015", title: "Celeste Classic", children: "O Celeste original, feito em 4 dias, não tinha nada disso: bateu, parou." },
                { when: "2018", title: "Celeste", children: "4 px pra todo lado. Na versão 1.2.3, o dash pra cima ganha 5." },
                { when: "2021", title: "Celeste 1.4 e Celeste Classic 2", children: "As correções do dash passam a respeitar os espinhos. Celeste Classic 2, feito em 3 dias no mesmo ano, já nasce com correção que nunca empurra pra um espinho." },
              ]}
            />
            <Quote
              by="Maddy Thorson, em Celeste & Forgiveness (2020)"
              href="https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html"
              original="If you bonk your head on a corner, the game tries to wiggle you to the side around it."
            >
              Se você bate a cabeça numa quina, o jogo tenta te sacudir pro lado e contornar ela.
            </Quote>
            <Text>
              <p>Os GIFs que a Maddy usou pra mostrar essa correção foram gravados na mesma sala das demonstrações lá em cima, a segunda do capítulo 1.</p>
            </Text>
          </div>
        ),
      },
    ],
  }
}
