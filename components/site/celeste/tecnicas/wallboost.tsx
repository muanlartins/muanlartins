import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Figures, Quote, Text } from "@/components/site/celeste/tecnicas/parts"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import type { Demo, DemoStep } from "@/lib/celeste-demo"
import { footageOf } from "@/lib/celeste-demos"

/**
 * The wallboost, from the research of 2026-11-22: the wall boost timer in the installed game (1.4.0.0) and the takes
 * filmed on the laundry's wall in 3A. Frames count from the climb jump.
 */

const CLING: DemoStep = { from: -16, text: "Agarrada na parede" }
const CLIMB: DemoStep = { from: 0, text: "Pulo de escalada sem direção: 27,5 de stamina" }

const LATE: Demo = {
  id: "wallboost",
  alt: "Madeline dá um pulo de escalada e aperta pra fora da parede logo depois, com a stamina em cima da cabeça",
  choose: "Quando ela aperta pra fora",
  zero: 156,
  cover: { take: "11", at: 12 },
  moment: [-2, 14],
  window: [1, 11],
  gauge: { max: 110 },
  takes: [
    {
      id: "0",
      label: "No pulo",
      name: "Pra fora no frame do pulo",
      ok: true,
      press: 0,
      rival: "12",
      steps: [CLING, { from: 0, text: "Pra fora já no pulo: pulo de parede, grátis", tone: "window" }, { from: 39, text: "Agarrou de novo", tone: "window" }],
    },
    {
      id: "1",
      label: "1",
      name: "Pra fora 1 frame depois",
      ok: true,
      press: 1,
      rival: "12",
      steps: [CLING, CLIMB, { from: 1, text: "Pra fora no frame 1", tone: "window" }, { from: 2, text: "Os 27,5 voltaram", tone: "window" }, { from: 25, text: "Agarrou de novo", tone: "window" }],
    },
    {
      id: "11",
      label: "11",
      name: "Pra fora 11 frames depois",
      ok: true,
      press: 11,
      rival: "12",
      steps: [CLING, CLIMB, { from: 11, text: "Pra fora no frame 11", tone: "window" }, { from: 12, text: "Os 27,5 voltaram", tone: "window" }, { from: 35, text: "Agarrou de novo", tone: "window" }],
    },
    {
      id: "12",
      label: "12",
      name: "Pra fora 12 frames depois",
      ok: false,
      press: 12,
      rival: "11",
      steps: [CLING, CLIMB, { from: 12, text: "Pra fora no frame 12: tarde", tone: "fail" }, { from: 21, text: "Agarrou, com 27,5 a menos", tone: "fail" }],
    },
  ],
}

export function wallboost(): Technique {
  return {
    sections: [
      {
        id: "no-jogo",
        title: "No jogo",
        body: (
          <div className="space-y-6">
            <DemoPlayer demo={LATE} footage={footageOf(LATE)} />
            <Text>
              <p>Até 11 frames depois do pulo de escalada, apertar pra fora devolve a stamina e transforma o pulo num pulo de parede. No 12, a stamina gasta fica gasta.</p>
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
                Agarrada na parede, pular sem direção é um pulo de escalada, pra cima, e custa 27,5 de stamina. Pular pra fora é um pulo de parede, grátis. Os dois comandos são quase iguais, então o jogo dá uma segunda chance: depois de um pulo de escalada sem direção, apertar pra fora nos 11 frames seguintes devolve os 27,5 e joga ela pra fora a 130 px/s.
              </p>
              <p>
                A janela acaba no mesmo frame em que a subida em altura máxima acaba. E enquanto ela está aberta, o jogo conta a stamina como se o pulo não tivesse custado nada. Com a stamina baixa, o piscar vermelho de cansada só aparece quando já é tarde.
              </p>
            </Text>
            <Figures
              items={[
                { label: "Janela", value: "11 frames", note: "depois do pulo de escalada" },
                { label: "Devolve", value: "27,5", note: "um quarto do tanque de 110" },
                { label: "Pra fora", value: "130 px/s", note: "a velocidade do pulo de parede" },
                { label: "Só arma", value: "sem direção", note: "com direção no pulo, não vale" },
              ]}
            />
          </div>
        ),
      },
      {
        id: "nome",
        title: "O nome está no código",
        body: (
          <div className="space-y-6">
            <figure className="cut max-w-[38rem] space-y-3 bg-navy p-5 text-paper">
              <pre className="overflow-x-auto whitespace-pre-wrap text-[13px] leading-[1.6] text-klein-claro">
                <code lang="en">{"// If you climb jump and then do a sideways input within this timer, switch to wall jump"}</code>
              </pre>
              <figcaption className="text-[15px] leading-[1.6]">
                “Se você der um pulo de escalada e depois apertar pro lado dentro deste tempo, troca pra pulo de parede.” O comentário vem dos desenvolvedores, no código que eles publicaram em 2018, ao lado da variável <span lang="en">wallBoostTimer</span>.
              </figcaption>
            </figure>
            <Quote
              by="Maddy Thorson, em Celeste & Forgiveness (2020)"
              href="https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html"
              original="This final one is complicated but very important for Celeste."
            >
              Este último é complicado, mas muito importante pra Celeste.
            </Quote>
          </div>
        ),
      },
      {
        id: "sobrando",
        title: "137,5 de stamina num tanque de 110",
        body: (
          <Text>
            <p>
              No chão, o pulo de escalada é de graça, mas arma a janela do mesmo jeito. Apertar pra fora devolve 27,5 que ela nunca gastou, e a stamina chega a 137,5, o bastante pra cinco pulos de escalada em vez de quatro. Dura até ela pisar no chão de novo.
            </p>
          </Text>
        ),
      },
      {
        id: "medidor",
        title: "O medidor que o jogo não mostra",
        body: (
          <Text>
            <p>
              O código de Celeste tem um medidor de stamina pronto: uma barra em cima da cabeça da Madeline, verde, que fica vermelha abaixo de 20. Nada no jogo cria esse medidor. Quem quer ver a stamina usa um mod, ou o medidor das demonstrações desta página.
            </p>
          </Text>
        ),
      },
    ],
  }
}
