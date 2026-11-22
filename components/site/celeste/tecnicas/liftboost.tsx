import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Beside, Figures, Milestones, Picture, Quote, Text } from "@/components/site/celeste/tecnicas/parts"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import { BarList } from "@/components/site/ui"
import type { Demo, DemoStep } from "@/lib/celeste-demo"
import { footageOf } from "@/lib/celeste-demos"

/**
 * Liftboost, from the research of 2026-11-22 (the game's code, 1.4.0.0, and the takes filmed in 1A). Frames count
 * from N, the block's last move: presses on N+1 to N+10 get its whole speed, N+11 nothing.
 */

const riding: DemoStep[] = [
  { from: -18, text: "O bloco sobe com ela" },
  { from: 0, text: "O bloco chegou" },
  { from: 1, text: "Bloco parado: frame {n}", tone: "window" },
  { from: 11, text: "Bloco parado: frame {n}", tone: "fail" },
]

const until = (steps: DemoStep[], press: number) => steps.filter((step) => step.from < press)

const SHAFT: Demo = {
  id: "liftboost",
  alt: "Madeline sobe num bloco de trânsito por um poço de espinhos e pula quando ele para",
  choose: "Quando ela pula",
  zero: 166,
  cover: { take: "10", at: 10 },
  moment: [-3, 13],
  window: [1, 10],
  takes: [
    {
      id: "1",
      label: "1",
      name: "1 frame depois de o bloco parar",
      ok: true,
      press: 1,
      rival: "11",
      steps: [...until(riding, 1), { from: 1, text: "Pulou no frame 1, com embalo", tone: "window" }, { from: 29, text: "Alcançou a parede", tone: "window" }],
    },
    {
      id: "10",
      label: "10",
      name: "10 frames depois de o bloco parar",
      ok: true,
      press: 10,
      rival: "11",
      steps: [...until(riding, 10), { from: 10, text: "Pulou no frame 10, com embalo", tone: "window" }, { from: 38, text: "Alcançou a parede", tone: "window" }],
    },
    {
      id: "11",
      label: "11",
      name: "11 frames depois de o bloco parar",
      ok: false,
      press: 11,
      rival: "10",
      steps: [...until(riding, 11), { from: 11, text: "Pulou no frame 11, sem embalo", tone: "fail" }, { from: 49, text: "Voltou pro bloco", tone: "fail" }],
    },
  ],
}

const TRAP: Demo = {
  id: "liftboost-armadilha",
  alt: "No primeiro bloco de trânsito do jogo, um pulo parado leva Madeline pros espinhos e o do frame seguinte não",
  choose: "Quando ela pula",
  zero: 176,
  cover: { take: "10", at: 12 },
  moment: [8, 16],
  window: [1, 10],
  takes: [
    {
      id: "10",
      label: "10",
      name: "10 frames depois de o bloco parar",
      ok: false,
      press: 10,
      rival: "11",
      steps: [{ from: -36, text: "O bloco vai pra direita" }, { from: 0, text: "O bloco chegou" }, { from: 10, text: "Pulou parado no frame 10", tone: "fail" }, { from: 15, text: "O embalo levou ela pros espinhos", tone: "fail" }],
    },
    {
      id: "11",
      label: "11",
      name: "11 frames depois de o bloco parar",
      ok: true,
      press: 11,
      rival: "10",
      steps: [{ from: -36, text: "O bloco vai pra direita" }, { from: 0, text: "O bloco chegou" }, { from: 11, text: "Pulou parado no frame 11", tone: "window" }, { from: 47, text: "Um pulinho, de volta no bloco", tone: "window" }],
    },
  ],
}

const LET_GO: Demo = {
  id: "liftboost-soltar",
  alt: "Madeline agarrada na lateral de um bloco de trânsito solta a parede depois que ele para, sem pular",
  choose: "Quando ela solta",
  zero: 205,
  cover: { take: "10", at: 13 },
  moment: [8, 18],
  window: [1, 10],
  takes: [
    {
      id: "10",
      label: "10",
      name: "Solta 10 frames depois de o bloco parar",
      ok: true,
      press: 10,
      rival: "11",
      steps: [{ from: -33, text: "Agarrada no bloco" }, { from: 0, text: "O bloco chegou" }, { from: 10, text: "Soltou no frame 10, sem pular", tone: "window" }, { from: 13, text: "Sai voando com o embalo", tone: "window" }],
    },
    {
      id: "11",
      label: "11",
      name: "Solta 11 frames depois de o bloco parar",
      ok: false,
      press: 11,
      rival: "10",
      steps: [{ from: -33, text: "Agarrada no bloco" }, { from: 0, text: "O bloco chegou" }, { from: 11, text: "Soltou no frame 11, sem pular", tone: "fail" }, { from: 13, text: "Cai reto", tone: "fail" }],
    },
  ],
}

/** The three ropes of 1A, to scale: each trip lasts half a second, so the longer the rope, the faster the end. */
const ROPES = [
  { length: 48, speed: 151 },
  { length: 80, speed: 251 },
  { length: 136, speed: 427 },
]

function Ropes() {
  return (
    <figure className="space-y-3">
      <svg viewBox="0 0 320 132" className="block w-full max-w-[38rem]" role="img" aria-label="Três trilhos de 48, 80 e 136 pixels, que terminam a 151, 251 e 427 pixels por segundo">
        {ROPES.map(({ length, speed }, index) => {
          const y = 20 + index * 44
          const w = length * 1.6
          return (
            <g key={length}>
              <line x1="8" y1={y} x2={8 + w} y2={y} className="stroke-klein" strokeWidth="2" strokeDasharray="4 3" />
              <circle cx="8" cy={y} r="3" className="fill-klein" />
              <rect x={8 + w - 10} y={y - 6} width="12" height="12" className="fill-klein" />
              <text x={8 + w + 10} y={y + 4} className="fill-ink text-[11px] font-medium">
                {length} px · {speed} px/s{speed > 250 ? ", o jogo corta em 250" : ""}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="text-[13px] text-muted">Os trilhos de 1A em escala. Velocidade final = comprimento × π.</figcaption>
    </figure>
  )
}

export function liftboost(): Technique {
  return {
    sections: [
      {
        id: "no-jogo",
        title: "No jogo",
        body: (
          <div className="space-y-6">
            <DemoPlayer demo={SHAFT} footage={footageOf(SHAFT)} />
            <Text>
              <p>
                Até o frame 10 com o bloco parado, o pulo leva a velocidade dele e alcança a parede lá em cima. No 11 é um pulo normal. Repara no bloco: ele treme por exatamente esses 10 frames, então o último frame de tremida é o último que vale.
              </p>
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
                Um bloco que se move carrega a Madeline, mas não mexe na velocidade dela. Ele deixa a própria velocidade guardada num canto separado, e o jogo soma essa velocidade quando ela pula, dá dash ou solta a parede. A memória dura 0,16 segundo depois do último empurrão, e usar não gasta.
              </p>
            </Text>
            <Figures
              items={[
                { label: "Guardado", value: "10 frames", note: "depois de o bloco parar" },
                { label: "Pra cima", value: "até 130", note: "px/s, mais que o pulo dela (105)" },
                { label: "Pro lado", value: "até 250", note: "px/s, mais que um dash (240)" },
                { label: "Pra baixo", value: "0", note: "bloco descendo nunca atrapalha" },
              ]}
            />
            <div className="space-y-3">
              <p className="eyebrow text-muted">Altura do pulo parado</p>
              <BarList
                bars={[
                  { id: "sem", label: "Sem embalo", value: 27, display: "27 px" },
                  { id: "com", label: "Com o máximo pra cima", value: 77, display: "77 px" },
                ]}
              />
              <p className="eyebrow pt-3 text-muted">Distância do pulo correndo</p>
              <BarList
                bars={[
                  { id: "sem", label: "Sem embalo", value: 62, display: "62 px" },
                  { id: "com", label: "Com o máximo pro lado", value: 193, display: "193 px" },
                ]}
              />
            </div>
          </div>
        ),
      },
      {
        id: "pi",
        title: "O π dos blocos de trânsito",
        body: (
          <div className="space-y-6">
            <Text>
              <p>
                Toda viagem de bloco de trânsito leva meio segundo, tenha o trilho o tamanho que tiver. Então quanto mais comprido o trilho, mais rápido o bloco chega no fim. E a conta fecha num número famoso: a velocidade final é o comprimento vezes π.
              </p>
            </Text>
            <Ropes />
          </div>
        ),
      },
      {
        id: "armadilha",
        title: "A armadilha do primeiro bloco",
        description: "No primeiro bloco de trânsito do jogo, um pulo parado logo depois de ele chegar vai direto pros espinhos. Um frame depois, é só um pulinho.",
        body: <DemoPlayer demo={TRAP} footage={footageOf(TRAP)} />,
      },
      {
        id: "sem-pular",
        title: "Voar sem pular",
        description: "Soltar a parede de um bloco que acabou de parar já usa o embalo, sem apertar pulo nenhum.",
        body: <DemoPlayer demo={LET_GO} footage={footageOf(LET_GO)} />,
      },
      {
        id: "fisica",
        title: "A física do navio",
        body: (
          <Beside
            media={
              <Picture
                src="/celeste/tecnicas/liftboost/galileu.webp"
                alt="Frontispício do Diálogo de Galileu, com três homens conversando e navios no porto ao fundo"
                width={640}
                height={885}
                credit="Stefano della Bella, 1632 · Metropolitan Museum of Art, domínio público"
                href="https://commons.wikimedia.org/wiki/File:Frontispiece_for_Dialogo_di_Galileo_Galilei_MET_DP818095.jpg"
              />
            }
          >
            <Text>
              <p>
                Em 1632, Galileu escreveu que quem pula dentro de um navio em movimento cai no mesmo lugar, porque o pulo leva a velocidade do navio junto. Somar a velocidade do bloco ao pulo é física de verdade.
              </p>
              <p>Celeste muda a física em três pontos, todos a favor de quem joga:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Na freada brusca, ela não é arremessada. De verdade, a 251 px/s, ela subiria 35 px sozinha.</li>
                <li>O bloco parado ainda paga o embalo por 10 frames.</li>
                <li>Bloco descendo não deixa o pulo mais baixo.</li>
              </ul>
            </Text>
          </Beside>
        ),
      },
      {
        id: "historia",
        title: "Nem o Celeste original tinha",
        body: (
          <div className="space-y-8">
            <Milestones
              items={[
                {
                  when: "1985",
                  title: "Super Mario Bros.",
                  children: "A plataforma move o Mario, mas zera a velocidade vertical dele a cada frame. O pulo sai sempre igual.",
                },
                {
                  when: "1996",
                  title: "Super Mario 64",
                  children: "O código tem uma função pra somar velocidade ao pulo. Ela devolve sempre zero.",
                },
                {
                  when: "2015",
                  title: "Celeste Classic",
                  children: "O Celeste original, feito em quatro dias pela mesma dupla, carrega a Madeline nas nuvens e não passa velocidade nenhuma.",
                },
                {
                  when: "2018",
                  title: "Celeste",
                  children: "O embalo entra, com limite, guardado por 10 frames e sem gastar. Até 2021, o pulo de parede só herdava de um dos lados: um sinal de menos que faltava no código.",
                },
                {
                  when: "2024",
                  title: "Celeste 64",
                  children: "Guarda por 0,1 segundo e gasta no primeiro uso.",
                },
              ]}
            />
            <Quote
              by="Maddy Thorson, em Celeste & Forgiveness (2020)"
              href="https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html"
              original="Jumping off a fast-moving platform adds that platform's momentum to your jump speed. Madeline “stores” this momentum and will still get a boosted jump for a few frames after the platform has stopped moving."
            >
              Pular de uma plataforma rápida soma o embalo dela à velocidade do pulo. A Madeline “guarda” esse embalo e ainda ganha o pulo turbinado por alguns frames depois que a plataforma parou.
            </Quote>
          </div>
        ),
      },
    ],
  }
}
