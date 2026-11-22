import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Figures, Milestones, Text } from "@/components/site/celeste/tecnicas/parts"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import { BarList } from "@/components/site/ui"
import type { Demo } from "@/lib/celeste-demo"
import { footageOf } from "@/lib/celeste-demos"

/**
 * The neutral jump, from the research of 2026-11-22: Player.WallJump in the installed game (1.4.0.0) and the takes
 * filmed on the laundry's wall in 3A. Frames count from the first wall jump.
 */

const WALL: Demo = {
  id: "pulo-neutro",
  alt: "Madeline sobe a parede da lavanderia de quatro jeitos, com a stamina em cima da cabeça",
  choose: "Como ela sobe",
  zero: 148,
  cover: { take: "neutro", at: 4 },
  moment: [-2, 12],
  gauge: { max: 110 },
  takes: [
    {
      id: "neutro",
      label: "Pulo neutro",
      ok: true,
      press: 0,
      rival: "segurando",
      steps: [
        { from: -24, text: "Colada na parede" },
        { from: -20, text: "Pulo do chão" },
        { from: 0, text: "Pulo de parede sem direção", tone: "window" },
        { from: 26, text: "De novo, 25 px mais alto", tone: "window" },
        { from: 52, text: "E de novo", tone: "window" },
        { from: 78, text: "No teto, sem gastar stamina", tone: "window" },
      ],
    },
    {
      id: "segurando",
      label: "Segurando a direção",
      ok: false,
      press: 0,
      rival: "neutro",
      steps: [
        { from: -24, text: "Colada na parede" },
        { from: -20, text: "Pulo do chão" },
        { from: 0, text: "Pulo de parede segurando a direção", tone: "fail" },
        { from: 1, text: "Empurrada pra longe: frame {n} de 10", tone: "fail" },
        { from: 11, text: "Volta tarde e mais baixo", tone: "fail" },
        { from: 92, text: "De volta no chão", tone: "fail" },
      ],
    },
    {
      id: "escalando",
      label: "Escalando",
      ok: true,
      steps: [
        { from: -24, text: "Colada na parede" },
        { from: -20, text: "Escalando: a stamina desce o tempo todo" },
        { from: 88, text: "No teto, e a stamina segue descendo" },
      ],
    },
    {
      id: "escalada",
      label: "Pulos de escalada",
      ok: false,
      steps: [
        { from: -24, text: "Colada na parede" },
        { from: -20, text: "Pulo do chão" },
        { from: 1, text: "Pulo de escalada: 27,5 de stamina", tone: "fail" },
        { from: 23, text: "Outro: mais 27,5", tone: "fail" },
        { from: 44, text: "Outro: mais 27,5", tone: "fail" },
      ],
    },
  ],
}

export function puloNeutro(): Technique {
  return {
    sections: [
      {
        id: "no-jogo",
        title: "No jogo",
        body: (
          <div className="space-y-6">
            <DemoPlayer demo={WALL} footage={footageOf(WALL)} />
            <Text>
              <p>Sem direção no frame do pulo, cada pulo de parede sobe 25 px e a stamina fica parada. A mesma sequência, com a direção segurada só no frame do pulo, empurra ela pra longe e não sobe.</p>
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
                Todo pulo de parede é de graça e sai com a mesma velocidade. A diferença está num único teste do código: se você segura uma direção no frame do pulo, o jogo te empurra pra longe da parede por 10 frames, sem deixar voltar. Sem direção, nada te empurra, e você volta pra mesma parede a tempo de pular de novo, mais alto.
              </p>
            </Text>
            <Figures
              items={[
                { label: "Por pulo", value: "+25 px", note: "mais de 2 vezes a altura dela" },
                { label: "Ritmo", value: "26 frames", note: "o mais rápido possível" },
                { label: "Stamina", value: "0", note: "qualquer pulo de parede é grátis" },
                { label: "Empurrão", value: "10 frames", note: "só com direção no pulo" },
              ]}
            />
            <div className="space-y-3">
              <p className="eyebrow text-muted">Velocidade subindo uma parede</p>
              <BarList
                bars={[
                  { id: "escalar", label: "Escalando", value: 45, display: "45 px/s" },
                  { id: "neutro", label: "Pulos neutros", value: 57, display: "57 px/s" },
                ]}
              />
              <p className="text-[13px] text-muted">E escalando a stamina acaba em 2,4 segundos.</p>
            </div>
          </div>
        ),
      },
      {
        id: "volta",
        title: "Pra voltar, sem pressa",
        body: (
          <Text>
            <p>
              Depois do pulo, apertar a direção da parede em qualquer frame do 1 ao 13 dá exatamente o mesmo caminho, até no subpixel. Até o 12º, ela ainda está freando o impulso pra fora, e freia igual segurando a direção ou não. Pressa mesmo só pra soltar: a direção tem que estar solta no frame do pulo.
            </p>
          </Text>
        ),
      },
      {
        id: "dica",
        title: "A dica do capítulo 4",
        body: (
          <Text>
            <p>A única vez que o jogo toca no assunto é no postal de carregamento do capítulo 4, que em inglês diz:</p>
            <p lang="en" className="text-[17px] text-klein">“Jumping away from walls doesn&apos;t consume stamina!”</p>
            <p>A tradução em português diz “Pular das paredes não consome energia!”. Sem o “pra longe”, a frase vale pro pulo de parede, mas não pro pulo de escalada, que gasta.</p>
          </Text>
        ),
      },
      {
        id: "historia",
        title: "Subir uma parede pulando",
        body: (
          <Milestones
            items={[
              { when: "1988", title: "Ninja Gaiden", children: "O manual ensina: segura o pulo e alterna esquerda e direita pra subir a parede. O Ryu gruda e só sai pulando pra fora." },
              { when: "1993", title: "Mega Man X", children: "“Pra escalar uma parede: pule contra ela e aperte B várias vezes”, diz o manual." },
              { when: "1994", title: "Super Metroid", children: "O pulo de parede exige apertar pra longe da parede no mesmo instante do pulo. O pulo neutro de Celeste é o contrário: direção nenhuma." },
              { when: "2015", title: "Celeste Classic", children: "No Celeste original, o pulo de parede já nasce com um empurrão pra fora embutido na física. Uma busca por todas as combinações de botões não achou jeito de subir uma parede sozinha." },
              { when: "2018", title: "Celeste", children: "O nome veio dos jogadores: o vídeo mais antigo encontrado com “neutral jump” saiu 13 dias depois do lançamento, antes de os desenvolvedores publicarem o código da Madeline." },
            ]}
          />
        ),
      },
    ],
  }
}
