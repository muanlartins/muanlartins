import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Figures, Milestones, Quote, Second, Text } from "@/components/site/celeste/tecnicas/parts"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import type { Demo, DemoStep, DemoTake } from "@/lib/celeste-demo"
import { footageOf } from "@/lib/celeste-demos"

/**
 * The input buffer, from the research of 2026-11-22: Monocle's VirtualButton in the installed game (1.4.0.0), the
 * takes filmed in 1A and the sources quoted. Frames count from the first update she can jump on the pillar.
 */

const AIR: DemoStep = { from: -14, text: "No ar, indo pro pilar" }

function earlyTake(k: number): DemoTake {
  const pressed: DemoStep = { from: -k, text: k ? `Apertou o pulo ${k} ${k === 1 ? "frame" : "frames"} antes` : "Apertou no frame do pouso" }
  if (k === 5) {
    return {
      id: "5",
      label: "5",
      name: "Apertar 5 frames antes de poder pular",
      ok: false,
      press: -5,
      rival: "4",
      steps: [AIR, pressed, { from: 0, text: "Pousou: o aperto já tinha vencido", tone: "fail" }, { from: 13, text: "Saiu correndo do pilar", tone: "fail" }, { from: 29, text: "Caiu nos espinhos", tone: "fail" }],
    }
  }
  return {
    id: String(k),
    label: String(k),
    name: k ? `Apertar ${k} ${k === 1 ? "frame" : "frames"} antes de poder pular` : "Apertar no frame em que pode pular",
    ok: true,
    press: -k,
    rival: k === 4 ? "5" : "4",
    steps: [AIR, ...(k ? [pressed] : []), { from: 0, text: k ? "Pousou e já pulou" : "Apertou no pouso e pulou", tone: "window" }, { from: 32, text: "Agarrou a parede", tone: "window" }],
  }
}

const EARLY: Demo = {
  id: "buffer",
  alt: "Madeline aperta o pulo ainda no ar, antes de pousar no pilar, e pula assim que toca nele",
  choose: "Quantos frames antes de poder pular",
  zero: 198,
  cover: { take: "4", at: -3 },
  moment: [-7, 2],
  window: [-4, 0],
  takes: [5, 4, 3, 2, 1, 0].map(earlyTake),
}

const HOLD: Demo = {
  id: "buffer-segurar",
  alt: "Três vezes o mesmo aperto 4 frames antes do pouso, segurado por tempos diferentes",
  choose: "Por quanto tempo ela segura o botão",
  zero: 198,
  cover: { take: "5", at: 1 },
  moment: [-5, 4],
  window: [-4, 0],
  takes: [
    {
      id: "4",
      label: "4 frames",
      ok: false,
      press: -4,
      rival: "30",
      steps: [AIR, { from: -4, text: "Apertou 4 frames antes" }, { from: 0, text: "Soltou no frame do pouso: nada", tone: "fail" }, { from: 13, text: "Saiu correndo do pilar", tone: "fail" }, { from: 26, text: "Caiu nos espinhos", tone: "fail" }],
    },
    {
      id: "5",
      label: "5 frames",
      ok: false,
      press: -4,
      rival: "30",
      steps: [AIR, { from: -4, text: "Apertou 4 frames antes" }, { from: 0, text: "Pulou, mas soltou logo: um pulinho", tone: "fail" }, { from: 24, text: "Caiu nos espinhos", tone: "fail" }],
    },
    {
      id: "30",
      label: "30 frames",
      ok: true,
      press: -4,
      rival: "5",
      steps: [AIR, { from: -4, text: "Apertou 4 frames antes" }, { from: 0, text: "Pulou segurando: pulo inteiro", tone: "window" }, { from: 32, text: "Agarrou a parede", tone: "window" }],
    },
  ],
}

const CRYSTAL: Demo = {
  id: "buffer-cristal",
  alt: "Madeline cai num cristal sem dash e aperta o dash um frame antes de tocar nele ou no frame do toque",
  choose: "Quando ela aperta o dash",
  zero: 212,
  cover: { take: "toque", at: 2 },
  moment: [-3, 7],
  takes: [
    {
      id: "antes",
      label: "1 frame antes",
      ok: false,
      press: -1,
      rival: "toque",
      steps: [
        { from: -16, text: "Sem dash, caindo no cristal" },
        { from: -1, text: "Apertou o dash 1 frame antes de tocar" },
        { from: 0, text: "Pegou o cristal" },
        { from: 1, text: "Jogo congelado: frame {n}", tone: "fail" },
        { from: 4, text: "O aperto venceu durante o congelamento", tone: "fail" },
        { from: 23, text: "Caiu nos espinhos", tone: "fail" },
      ],
    },
    {
      id: "toque",
      label: "No toque",
      ok: true,
      press: 0,
      rival: "antes",
      steps: [
        { from: -16, text: "Sem dash, caindo no cristal" },
        { from: 0, text: "Apertou o dash no frame em que tocou" },
        { from: 1, text: "Jogo congelado: frame {n}", tone: "window" },
        { from: 4, text: "O dash sai", tone: "window" },
      ],
    },
  ],
}

export function buffer(): Technique {
  return {
    sections: [
      {
        id: "no-jogo",
        title: "No jogo",
        body: (
          <div className="space-y-6">
            <DemoPlayer demo={EARLY} footage={footageOf(EARLY)} />
            <Text>
              <p>De 4 frames antes até o próprio frame, sai o mesmo pulo, no frame em que ela toca o pilar. Com 5 frames de antecedência, o aperto vence no ar e ela pousa sem pular.</p>
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
                Cada aperto de pulo ou de dash fica valendo por 0,08 segundo. O jogo desconta um frame antes de olhar, então valem 4 frames antes do momento certo e o próprio momento. A regra fica no motor do jogo, no botão, e não na Madeline: qualquer pulo serve, do chão, de parede, de escalada.
              </p>
            </Text>
            <Figures
              items={[
                { label: "Pulo e dash", value: "4 frames", note: "antes, mais o próprio" },
                { label: "Em tempo", value: "67 ms", note: "de antecedência, no máximo" },
                { label: "Agarrar", value: "0", note: "segurado, não precisa" },
                { label: "Pausa", value: "5 frames", note: "antes, desde a versão 1.4" },
              ]}
            />
            <Quote
              by="Noel Berry, no Game Maker's Toolkit (2019)"
              href="https://www.youtube.com/watch?v=yorTG9at90g&t=626"
              original="It feels bad if you press jump the frame before you touch the ground and just touch the ground and there's nothing. It feels like the game messed up, like the game missed your input or something - it got eaten."
            >
              É ruim apertar pulo um frame antes de tocar no chão e não acontecer nada. Parece que o jogo errou, que ele perdeu o seu comando. Engoliu.
            </Quote>
          </div>
        ),
      },
      {
        id: "segurar",
        title: "Tem que continuar apertado",
        description: "Soltar o botão apaga o aperto guardado. A altura do pulo depende de quanto tempo você segura, e o jogo não quer inventar um pulo que você já largou.",
        body: <DemoPlayer demo={HOLD} footage={footageOf(HOLD)} />,
      },
      {
        id: "cristal",
        title: "O cristal come o buffer",
        description: "Pegar um cristal congela o jogo por 3 frames, e o aperto guardado continua vencendo durante o congelamento. Pra um dash logo depois do cristal, a janela de 5 frames vira 1.",
        body: <DemoPlayer demo={CRYSTAL} footage={footageOf(CRYSTAL)} />,
      },
      {
        id: "tamanho",
        title: "O tamanho de 4 frames",
        body: (
          <div className="space-y-6">
            <Second lit={[26, 30]} label="Um segundo de Celeste: 60 frames. O buffer cobre estes 5." />
            <Text>
              <p>Um toque comum de tecla dura uns 116 milésimos, quase 7 frames, então quem aperta e segura normal nem percebe a regra de continuar apertado.</p>
              <p>E a gente aperta antes sem perceber. Batendo junto com um ritmo, as pessoas costumam chegar dezenas de milésimos adiantadas e acham que estão no tempo. É esse adiantamento que o buffer pega.</p>
            </Text>
          </div>
        ),
      },
      {
        id: "historia",
        title: "De onde vem",
        body: (
          <div className="space-y-8">
            <Milestones
              items={[
                { when: "1981", title: "O teclado do IBM PC", children: "Guarda até 15 teclas apertadas antes de o programa pedir. É o buffer no sentido original: uma fila de espera." },
                { when: "1989", title: "Prince of Persia", children: "Lembra um aperto não usado mesmo depois de você soltar o botão, o contrário de Celeste." },
                {
                  when: "1991",
                  title: "Street Fighter II",
                  children: "O diretor quis que o Hadouken saísse mesmo com um botão apertado cedo demais. Dessa folga nasceram os cancelamentos, a base dos combos.",
                },
                { when: "1997", title: "Tekken 3", children: "Segundo o próprio diretor da série, só aqui o Tekken passou a ter buffer de comandos." },
                { when: "2015", title: "Celeste Classic", children: "O Celeste original guarda o pulo por 3 frames a 30 por segundo, 100 milésimos, sem precisar segurar. Dash não tem buffer." },
                { when: "2021", title: "Celeste 1.4", children: "A atualização ganha uma seção chamada “Pause Buffering”: os desenvolvedores deram 0,1 segundo de buffer pro botão de pausa, a técnica que os speedrunners já usavam." },
              ]}
            />
            <Quote
              by="Akira Nishitani, diretor de Street Fighter II, ao Denfaminicogamer (2017)"
              href="https://news.denfaminicogamer.jp/interview/171212"
            >
              Às vezes, na hora de fazer o comando do Hadouken e apertar soco, a pessoa aperta outro botão antes. Eu queria ignorar isso e soltar o Hadouken. Aí deu pra cancelar e a gente ficou “o que é isso?”. No fim, “é divertido”.
            </Quote>
          </div>
        ),
      },
    ],
  }
}
