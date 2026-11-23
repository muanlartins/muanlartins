import Link from "next/link"
import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Figures, Milestones, Text } from "@/components/site/celeste/tecnicas/parts"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import type { Demo, DemoStep } from "@/lib/celeste-demo"
import { footageOf } from "@/lib/celeste-demos"
import { celestePath } from "@/lib/celeste"

/**
 * The screen-transition refill, from the research of 2026-11-23
 * (~/.local/share/muanlartins/celeste-tecnicas/etapa-2/transicao-de-tela.md: the developers' Player.cs of 2018 and
 * Celeste Classic's port) and the takes filmed in 1A, room 1 to 2, in 1.4.0.0. Frames count from the update the screen
 * stops: the scroll takes 40 frames, the dash comes back on 0 (the hair flashes), and after an up transition it's
 * locked: a press on 0 to 10 is lost (not buffered), on 11 it dashes.
 */

const UP: DemoStep[] = [
  { from: -55, text: "Dash pra cima: o cabelo fica azul" },
  { from: -41, text: "Saiu pela borda de cima: o dash vira um pulo" },
  { from: -40, text: "A tela troca: 40 frames sem controle" },
  { from: 0, text: "A tela parou: o dash voltou" },
]

const SHAFT: Demo = {
  id: "transicao",
  alt: "Madeline dá dash pra cima, passa pra tela de cima do capítulo 1 e aperta o dash de novo 10 ou 11 frames depois de a tela parar",
  choose: "Quando ela aperta o dash de novo",
  zero: 195,
  cover: { take: "11", at: 17 },
  moment: [-2, 14],
  window: [11, 33],
  takes: [
    {
      id: "10",
      label: "10",
      name: "Dash 10 frames depois de a tela parar",
      ok: false,
      press: 10,
      rival: "11",
      steps: [...UP, { from: 1, text: "Subindo de tela, o dash fica travado: frame {n}" }, { from: 10, text: "Dash no frame 10: travado, o aperto se perde", tone: "fail" }],
    },
    {
      id: "11",
      label: "11",
      name: "Dash 11 frames depois de a tela parar",
      ok: true,
      press: 11,
      rival: "10",
      steps: [...UP, { from: 1, text: "Subindo de tela, o dash fica travado: frame {n}" }, { from: 11, text: "Dash no frame 11: saiu", tone: "window" }],
    },
  ],
}

export function transicaoDeTela(): Technique {
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
                A Madeline gasta o dash pra subir, e o cabelo fica azul a troca de tela inteira. No frame em que a tela para, ele pisca branco e volta a ficar vermelho: o dash voltou, no ar. Só que, subindo, ele fica travado nos 11 primeiros frames. Apertado no frame 10, o dash não sai e o aperto se perde. No 11, sai.
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
                Quando a Madeline passa pra outra tela, o jogo devolve o dash e a stamina, cheios, esteja ela onde estiver. É a mesma recarga em qualquer borda, mas antes dela o jogo prepara a troca de um jeito pra cada lado. Por cima, o dash vira um pulo e a velocidade pro lado zera. Pelo código que os devs publicaram em 2018, pela lateral nada muda, e um dash continua andando na tela nova. Por baixo, o dash acaba.
              </p>
              <p>
                A troca leva 40 frames, dois terços de segundo, em que nada da Madeline anda, nem os contadores do jogo. Subindo, ainda tem a trava do dash, que começa a contar quando a tela para. Um aperto durante a trava não fica guardado como no <Link href={`${celestePath()}/buffer`} className="text-klein underline-offset-4 hover:underline">buffer de comandos</Link>: ele se perde.
              </p>
            </Text>
            <Figures
              items={[
                { label: "A troca", value: "40 frames", note: "dois terços de segundo sem controle" },
                { label: "A trava", value: "11 frames", note: "depois de subir de tela" },
                { label: "O dash", value: "cheio", note: "mesmo no meio do ar" },
              ]}
            />
          </div>
        ),
      },
      {
        id: "classic",
        title: "Herança do Celeste original",
        body: (
          <div className="space-y-6">
            <Text>
              <p>
                No Celeste Classic, o jogo de 4 dias que virou o Celeste, cada tela nova apagava tudo e criava uma Madeline nova, com o dash cheio. Ninguém precisou escrever uma regra de recarga: a Madeline velha simplesmente deixava de existir. No jogo de 2018 a Madeline é uma só, de tela em tela, então a recarga virou uma linha de código de propósito.
              </p>
            </Text>
            <Milestones
              items={[
                { when: "2015", title: "Celeste Classic", children: "Cada tela começa do zero, com uma Madeline nova." },
                { when: "2018", title: "Celeste", children: "A mesma Madeline atravessa as telas, e a troca devolve o dash e a stamina." },
              ]}
            />
          </div>
        ),
      },
      {
        id: "escondido",
        title: "Escondido",
        body: (
          <Text>
            <ul className="list-disc space-y-3 pl-5">
              <li>Subir pela borda de cima é um pulo de graça: o jogo põe a Madeline subindo, e por isso ela aparece pulando na tela de cima em vez de cair de volta.</li>
              <li>No código de 2018, a troca também zera o <Link href={`${celestePath()}/coyote-time`} className="text-klein underline-offset-4 hover:underline">coyote time</Link>: quem sai de uma beirada bem na borda da tela chega na tela nova sem os frames de folga.</li>
              <li>Os morangos que seguem a Madeline mudam de tela com ela, na mesma linha de código da recarga.</li>
              <li>No texto em que a Maddy Thorson lista os truques que deixam Celeste mais gentil, essa regra não aparece.</li>
            </ul>
          </Text>
        ),
      },
    ],
  }
}
