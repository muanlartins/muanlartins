import { Clip } from "@/components/site/celeste/tecnicas/clip"
import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Beside, Figures, Milestones, Quote, Second, Text } from "@/components/site/celeste/tecnicas/parts"
import { PressTest } from "@/components/site/celeste/tecnicas/press-test"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import type { Demo, DemoStep, DemoTake } from "@/lib/celeste-demo"
import { footageOf, outsidePicture } from "@/lib/celeste-demos"

/**
 * Coyote time, from the research of 2026-11-22: the game's code (1.4.0.0), the takes filmed in 1A's first room, other
 * games' disassemblies (read, not run) and what the developers said. Frames count from her last update on the ground.
 */

const LANDS = [30, 31, 31, 32, 33, 33]

function ledgeTake(k: number): DemoTake {
  const steps: DemoStep[] = [
    { from: -18, text: "No chão" },
    { from: 1, text: "Fora do chão: frame {n}", tone: "window" },
    { from: 6, text: "Fora do chão: frame {n}", tone: "fail" },
  ]
  const off = steps.filter((step) => step.from < Math.max(k, 1))
  if (k === 6) {
    return {
      id: "6",
      label: "6",
      name: "Apertar no frame 6 fora do chão",
      ok: false,
      press: 6,
      rival: "5",
      steps: [...off, { from: 6, text: "Apertou no frame 6: tarde", tone: "fail" }, { from: 14, text: "Caiu nos espinhos", tone: "fail" }],
    }
  }
  return {
    id: String(k),
    label: String(k),
    name: k ? `Pular no frame ${k} fora do chão` : "Pular ainda no chão",
    ok: true,
    press: k,
    rival: "6",
    steps: [...(k ? off : [{ from: -18, text: "No chão" }]), { from: k, text: k ? `Pulou no frame ${k}` : "Pulou ainda no chão", tone: k ? "window" : undefined }, { from: LANDS[k], text: "Chegou no pilar", tone: "window" }],
  }
}

const LEDGE: Demo = {
  id: "coyote-time",
  alt: "Madeline corre pra fora da beirada da primeira sala e tenta pular o vão de espinhos",
  choose: "Frame do pulo",
  zero: 170,
  cover: { take: "5", at: 5 },
  moment: [-2, 8],
  window: [1, 5],
  gauge: { max: 0.1, during: [0, 6] },
  takes: [0, 1, 2, 3, 4, 5, 6].map(ledgeTake),
}

const CROUCH: Demo = {
  id: "coyote-agachada",
  alt: "Madeline sai da beirada agachada e só levanta quando o coyote time acaba",
  choose: "Como ela sai da beirada",
  zero: 171,
  cover: { take: "sim", at: 3 },
  moment: [-1, 8],
  window: [1, 5],
  gauge: { max: 0.1, during: [0, 6] },
  takes: [
    {
      id: "sim",
      label: "Agachada",
      ok: true,
      rival: "nao",
      steps: [
        { from: -13, text: "Correndo" },
        { from: -3, text: "Agachou" },
        { from: 1, text: "No ar e ainda abaixada: frame {n}", tone: "window" },
        { from: 6, text: "Frame 6: o coyote time acabou e ela levanta", tone: "fail" },
        { from: 14, text: "Caiu nos espinhos" },
      ],
    },
    {
      id: "nao",
      label: "Em pé",
      ok: false,
      rival: "sim",
      steps: [
        { from: -13, text: "Correndo" },
        { from: 0, text: "Saiu do chão em pé" },
        { from: 13, text: "Caiu nos espinhos" },
      ],
    },
  ],
}

const WALL: Demo = {
  id: "coyote-parede",
  alt: "Madeline sai da beirada, vira pra trás e pula: no frame 5 volta pra beirada, no 6 é chutada pra longe da parede",
  choose: "Frame do pulo",
  zero: 171,
  cover: { take: "5", at: 5 },
  moment: [0, 10],
  window: [1, 5],
  gauge: { max: 0.1, during: [0, 6] },
  takes: [
    {
      id: "5",
      label: "5",
      name: "Pular no frame 5 fora do chão",
      ok: true,
      press: 5,
      rival: "6",
      steps: [
        { from: -11, text: "Correndo pra beirada" },
        { from: 1, text: "Saiu do chão e virou pra trás: frame {n}", tone: "window" },
        { from: 5, text: "Frame 5: pulo do chão, de volta pra beirada", tone: "window" },
        { from: 57, text: "De volta na beirada", tone: "window" },
      ],
    },
    {
      id: "6",
      label: "6",
      name: "Pular no frame 6 fora do chão",
      ok: false,
      press: 6,
      rival: "5",
      steps: [
        { from: -11, text: "Correndo pra beirada" },
        { from: 1, text: "Saiu do chão e virou pra trás: frame {n}", tone: "window" },
        { from: 6, text: "Frame 6: vira pulo de parede, pra longe", tone: "fail" },
        { from: 49, text: "Caiu nos espinhos", tone: "fail" },
      ],
    },
  ],
}

/** The timer after each update off the ground: 0,1 s that the game takes away before it looks at the button. */
const TIMER = [0.1, 0.0833, 0.0667, 0.05, 0.0333, 0.0167, 0]

function Countdown() {
  return (
    <figure className="space-y-3">
      <ol className="grid grid-cols-7 gap-1">
        {TIMER.map((left, frame) => (
          <li key={frame} className={frame === 6 ? "bg-loss/10" : "bg-klein/[0.07]"}>
            <span aria-hidden className="block h-2 bg-klein/15">
              <span className={frame === 6 ? "block h-full" : "block h-full bg-klein"} style={{ width: `${left * 1000}%` }} />
            </span>
            <span className="block pt-2 text-center text-[15px] font-semibold tabular-nums text-ink">{frame}</span>
            <span className="block pb-2 text-center text-[12px] tabular-nums text-muted">{left.toFixed(left ? 4 : 0).replace(".", ",")} s</span>
          </li>
        ))}
      </ol>
      <figcaption className="text-[13px] text-muted">O relógio em cada frame fora do chão, já descontado. No 6 ele chega a zero.</figcaption>
    </figure>
  )
}

export function coyoteTime(): Technique {
  const coyote = outsidePicture("coiote.webp")
  const smb3 = outsidePicture("smb3.webp")
  const dk = outsidePicture("dk.webp")
  return {
    sections: [
      {
        id: "no-jogo",
        title: "No jogo",
        body: <DemoPlayer demo={LEDGE} footage={footageOf(LEDGE)} />,
      },
      {
        id: "como-funciona",
        title: "Como funciona",
        body: (
          <div className="space-y-8">
            <Text>
              <p>
                Enquanto ela está no chão, o jogo enche um relógio de 0,1 segundo. Fora do chão, ele desconta um frame e só depois olha se você apertou pulo. Por isso 0,1 segundo, que dariam 6 frames, viram 5: no sexto o relógio já zerou.
              </p>
            </Text>
            <Countdown />
            <Figures
              items={[
                { label: "Janela", value: "5 frames", note: "83 milésimos" },
                { label: "Correndo", value: "7,5 px", note: "andados dentro da janela" },
                { label: "Vão a mais", value: "6 px", note: "o pulo sai 2,5 px mais baixo" },
                { label: "Modo de ajuda a 50%", value: "11 frames", note: "o relógio anda no tempo do jogo" },
              ]}
            />
          </div>
        ),
      },
      {
        id: "rapido",
        title: "Mais rápido que piscar",
        body: (
          <div className="space-y-6">
            <Second lit={[28, 32]} label="Um segundo de Celeste: 60 frames. O coyote time são estes 5." />
            <PressTest
              window={83}
              label="Coyote time"
              bars={[
                { id: "piscar", label: "Olho fechado numa piscada", value: 110 },
                { id: "reagir", label: "Reagir ao que você vê", value: 213 },
              ]}
            />
            <Text>
              <p>Ver que ela caiu e só aí apertar já é tarde. O coyote time salva quem mirou na beirada e atrasou um tiquinho.</p>
            </Text>
          </div>
        ),
      },
      {
        id: "agachada",
        title: "Agachada, ela mostra o relógio",
        description: "Quem sai da beirada agachada fica abaixada exatamente durante os 5 frames, e levanta no frame em que o coyote time acaba.",
        body: <DemoPlayer demo={CROUCH} footage={footageOf(CROUCH)} />,
      },
      {
        id: "parede",
        title: "Mais forte que o pulo de parede",
        description: "Saindo da beirada e virando pra trás, a parede fica ao alcance. Até o frame 5 o jogo prefere o pulo do chão. No 6, o mesmo botão vira pulo de parede e joga ela pra longe.",
        body: <DemoPlayer demo={WALL} footage={footageOf(WALL)} />,
      },
      {
        id: "nome",
        title: "O nome veio de quem jogava",
        body: (
          <div className="space-y-8">
            <Beside
              media={coyote && <Clip still={outsidePicture("coiote-parado.webp")!} moving={coyote} alt="O Coiote corre pra fora do penhasco e fica parado no ar até olhar pra baixo" width={384} height={294} />}
            >
              <Text>
                <p>No desenho do Papa-Léguas, o Coiote corre pra fora do penhasco e fica no ar. Só cai quando olha pra baixo.</p>
                <p>
                  Em 1980, a revista Esquire publicou essa regra como a primeira das “Leis do Movimento nos Desenhos”: todo corpo suspenso no espaço continua no espaço até perceber a situação.
                </p>
                {coyote && <p className="text-[13px] text-muted">Papa-Léguas, Looney Tunes © Warner Bros.</p>}
              </Text>
            </Beside>
            <Quote
              by="Maddy Thorson, no Game Maker's Toolkit (2019)"
              href="https://www.youtube.com/watch?v=yorTG9at90g&t=1004"
              original="I think it was in the PICO-8 one, a player called it Coyote Time and we were like that's a good name."
            >
              Acho que foi no de PICO-8: um jogador chamou de coyote time e a gente achou um bom nome.
            </Quote>
            <Text>
              <p>
                Em 2018, quando Celeste saiu no Switch, a página da Nintendo do Japão explicou o coyote time com uma foto da primeira sala do jogo, no mesmo pulo da demonstração lá em cima.
              </p>
            </Text>
          </div>
        ),
      },
      {
        id: "historia",
        title: "Antes de Celeste",
        description: "No código de Donkey Kong (1981), Super Mario Bros. (1985), Mega Man (1987) e Super Mario World (1990), pisou fora, caiu. A folga aparece aos poucos.",
        body: (
          <Milestones
            items={[
              { when: "1986", title: "Metroid", children: "Sobra 1 frame pra pular depois da beirada. O jogo lê o botão antes de ligar a gravidade, uma questão de ordem no código." },
              {
                when: "1988",
                title: "Super Mario Bros. 3",
                children: "O relógio mais antigo encontrado: 4 frames saindo do besouro voador, até 15 em outras plataformas que se mexem. Na beirada comum, nenhum.",
                media: smb3 && <Clip still={outsidePicture("smb3-parado.webp")!} moving={smb3} alt="Mario sobe num besouro voador e pula dele" width={384} height={220} pixel />,
              },
              { when: "1989", title: "Prince of Persia", children: "Outro jeito de perdoar: quem pula atrasado é puxado até 8 pixels de volta pra beirada. No código, o comentário diz: “pulou tarde, vai errar a beirada, mas vamos deixar bonito”." },
              {
                when: "1994",
                title: "Donkey Kong Country",
                children: "Rolando pra fora da plataforma, dá pra pular no meio da queda, sem prazo. O Cranky Kong entrega no próprio jogo: “ouvi dizer que se você rolar pra fora de uma plataforma e apertar o pulo, dá um superpulo”.",
                media: dk && <Clip still={outsidePicture("dk-parado.webp")!} moving={dk} alt="Diddy Kong rola pra fora da palmeira e pula no ar" width={384} height={300} />,
              },
              { when: "2015", title: "Celeste Classic", children: "O Celeste original, de PICO-8, já tinha os 5 frames. Como o jogo roda a 30 por segundo, eles duram o dobro: 167 milésimos." },
              { when: "2024", title: "Celeste 64", children: "Leva o perdão além: o pulo atrasado sai da altura da beirada, como se ela nunca tivesse caído." },
            ]}
          />
        ),
      },
      {
        id: "escondido",
        title: "Escondido em Celeste",
        body: (
          <Text>
            <ul className="list-disc space-y-3 pl-5">
              <li>No capítulo 3, quando o Oshiro avança colado nela, o jogo fica mais lento e o coyote time chega a 11 frames.</li>
              <li>Os frames congelados não contam. Saindo de um bloco de sonho na horizontal, a janela vai até o 8º frame depois da saída.</li>
              <li>O super, que é um pulo no meio do dash, também vale no coyote time.</li>
            </ul>
            {(smb3 || dk) && <p className="pt-2 text-[13px] text-muted">Super Mario Bros. 3 e Donkey Kong Country © Nintendo (e Rare). Trechos dos vídeos de iMusTSHiNE e SilentWolf444.</p>}
          </Text>
        ),
      },
    ],
  }
}
