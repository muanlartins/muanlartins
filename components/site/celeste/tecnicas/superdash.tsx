import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Figures, Milestones, Text } from "@/components/site/celeste/tecnicas/parts"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import type { Demo, DemoStep } from "@/lib/celeste-demo"
import { footageOf } from "@/lib/celeste-demos"

/**
 * Superdash, from the research of 2026-11-23 (~/.local/share/muanlartins/celeste-tecnicas/etapa-2/superdash.md: the
 * developers' Player.cs of 2018) and the takes filmed in 3A's outside room (lvl_s2) in 1.4.0.0. Frames count from the
 * dash press: frozen 1–3, a jump on 4 to 14 is a super (260 px/s, 104 px of flight against a running jump's 55), on 15
 * an ordinary jump; the ground gives the dash back on 10, so a super on 4–9 leaves without it.
 */

const DASH: DemoStep[] = [
  { from: 0, text: "Dash pra direita" },
  { from: 1, text: "O dash congela o jogo: frame {n}" },
  { from: 4, text: "Correndo no dash" },
]

const until = (steps: DemoStep[], press: number) => steps.filter((step) => step.from < press)

const BRIDGE: Demo = {
  id: "superdash",
  alt: "Madeline dá dash pra direita numa ponte do capítulo 3 e pula durante o dash, comparada com um pulo correndo",
  choose: "Como ela pula",
  zero: 142,
  cover: { take: "10", at: 23 },
  moment: [0, 14],
  window: [4, 14],
  takes: [
    {
      id: "pulo",
      label: "Pulo correndo",
      ok: false,
      press: 10,
      rival: "10",
      steps: [{ from: 0, text: "Correndo, sem dash" }, { from: 10, text: "Pulo comum" }, { from: 46, text: "Pousou 55 px adiante", tone: "fail" }],
    },
    {
      id: "4",
      label: "4",
      name: "Pulo 4 frames depois do dash",
      ok: true,
      press: 4,
      rival: "10",
      steps: [...until(DASH, 4), { from: 4, text: "Pulo no frame 4: superdash", tone: "window" }, { from: 6, text: "Saiu sem o dash: o cabelo está azul", tone: "window" }, { from: 40, text: "Pousou 104 px adiante", tone: "window" }],
    },
    {
      id: "10",
      label: "10",
      name: "Pulo 10 frames depois do dash",
      ok: true,
      press: 10,
      rival: "pulo",
      steps: [...until(DASH, 10), { from: 10, text: "O chão devolveu o dash, e ela pulou: superdash", tone: "window" }, { from: 46, text: "Pousou 104 px adiante, com o dash", tone: "window" }],
    },
  ],
}

export function superdash(): Technique {
  return {
    sections: [
      {
        id: "no-jogo",
        title: "No jogo",
        body: (
          <div className="space-y-6">
            <DemoPlayer demo={BRIDGE} footage={footageOf(BRIDGE)} />
            <Text>
              <p>Correndo, o pulo leva a Madeline 55 px pra frente. Pulando no meio do dash, 104: quase o dobro, na mesma altura e no mesmo tempo no ar. E quem espera até o frame 10 pra pular sai com o dash de volta.</p>
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
                Durante um dash na horizontal, se a Madeline ainda está no chão e o pulo é apertado, o jogo troca o resto do dash por um pulo especial: pra frente, ela sai a 260 pixels por segundo, o dobro de um pulo correndo, com a mesma força pra cima.
              </p>
              <p>
                O dash começa congelando o jogo por 3 frames. Do frame 4 ao 14 depois do aperto, todo pulo vira superdash. No 15, o dash já acabou e sai um pulo comum, mais curto. Tem outra conta no meio: o chão só devolve o dash a partir do frame 10. Um superdash antes disso sai sem dash, com o cabelo azul. Do 10 em diante, sai com ele, pronto pra outro dash no ar.
              </p>
            </Text>
            <Figures
              items={[
                { label: "Pra frente", value: "260 px/s", note: "o pulo correndo sai a 130" },
                { label: "No ar", value: "104 px", note: "o pulo correndo vai 55" },
                { label: "A janela", value: "11 frames", note: "do 4º ao 14º depois do dash" },
                { label: "O dash de volta", value: "frame 10", note: "antes disso, sai sem" },
              ]}
            />
          </div>
        ),
      },
      {
        id: "nome",
        title: "O nome é dos criadores",
        body: (
          <Text>
            <p>
              No código que o Noel Berry publicou em 2018, a função que faz isso se chama SuperJump, e o som dela é “jump_super”. O hyperdash, que é o mesmo pulo saindo de um dash pra baixo na diagonal, nem tem função própria: é o mesmo SuperJump com a Madeline agachada, e o som dele se chama “superslide”. “Super” é nome de quem fez. “Hyper” é nome da comunidade.
            </p>
          </Text>
        ),
      },
      {
        id: "escondido",
        title: "Escondido no código",
        description: "No código que os devs publicaram em 2018, mais antigo que o jogo de hoje.",
        body: (
          <Text>
            <ul className="list-disc space-y-3 pl-5">
              <li>O superdash troca a velocidade, não soma. Quem chega nele mais rápido que 260 pixels por segundo sai mais devagar.</li>
              <li>O jogo não pergunta se ela está no chão: pergunta se ainda dá pra pular, o coyote time. Um dash que sai de uma beirada ainda vira superdash nos frames de coyote que sobram.</li>
              <li>No ar, segurar a direção freia a Madeline 2,5 vezes menos do que soltar. Largar o direcional no meio de um superdash joga fora boa parte da distância.</li>
            </ul>
          </Text>
        ),
      },
      {
        id: "historia",
        title: "De onde vem",
        body: (
          <Milestones
            items={[
              {
                when: "2015",
                title: "Celeste Classic",
                children: "No Celeste original, feito em 4 dias, não dá pra pular durante o dash: o pulo fica de fora. Logo depois do dash, a velocidade que sobra embarca no pulo, e ele vai um pouco mais longe. É o rascunho do superdash.",
              },
              { when: "2018", title: "Celeste", children: "O pulo durante o dash vira um golpe com velocidade própria, 260 pixels por segundo, e um nome no código." },
            ]}
          />
        ),
      },
    ],
  }
}
