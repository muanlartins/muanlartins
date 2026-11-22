import { DemoPlayer } from "@/components/site/celeste/tecnicas/demo-player"
import { Figures, Milestones, Text } from "@/components/site/celeste/tecnicas/parts"
import type { Technique } from "@/components/site/celeste/tecnicas/technique"
import type { Demo, DemoStep } from "@/lib/celeste-demo"
import { footageOf } from "@/lib/celeste-demos"

/**
 * Directional spikes, from the research of 2026-11-22: Spikes.OnCollide in the installed game (1.4.0.0), the takes
 * filmed in 1A (rooms 5z and 10z) and the other games' code. Frames count from the update the outcomes part.
 */

const UP: DemoStep = { from: -13, text: "Pulo reto, colada nos espinhos" }

const WALL: Demo = {
  id: "espinhos",
  alt: "Madeline pula reto ao lado de uma parede de espinhos que apontam pra direita, apertando a direita em frames diferentes",
  choose: "O que ela faz dentro dos espinhos",
  zero: 134,
  cover: { take: "0", at: 0 },
  moment: [-3, 4],
  takes: [
    {
      id: "0",
      label: "Direita a tempo",
      ok: true,
      rival: "1",
      steps: [UP, { from: 0, text: "Dentro dos espinhos, indo pra direita: passa", tone: "window" }, { from: 5, text: "Saiu ilesa", tone: "window" }],
    },
    {
      id: "1",
      label: "1 frame tarde",
      ok: false,
      rival: "0",
      steps: [UP, { from: 0, text: "Mesmo pixel, velocidade zero: morre", tone: "fail" }],
    },
    {
      id: "2",
      label: "Sem apertar nada",
      ok: false,
      rival: "0",
      steps: [UP, { from: 0, text: "Parada no eixo dos espinhos: morre", tone: "fail" }],
    },
    {
      id: "3",
      label: "Só 1 frame",
      ok: false,
      rival: "0",
      steps: [UP, { from: 0, text: "Apertou a direita: passa", tone: "window" }, { from: 1, text: "Soltou, a velocidade voltou a zero: morre", tone: "fail" }],
    },
    {
      id: "4",
      label: "Dash pra fora",
      ok: false,
      rival: "0",
      steps: [UP, { from: 0, text: "Indo pra direita: passa", tone: "window" }, { from: 2, text: "O dash começa parado: morre", tone: "fail" }],
    },
  ],
}

const SPRING: Demo = {
  id: "espinhos-mola",
  alt: "A mola joga Madeline pra cima através de uma plataforma de espinhos, e na volta ela cai em cima deles",
  choose: "Na volta",
  zero: 229,
  cover: { take: "dash", at: -33 },
  moment: [-35, -28],
  takes: [
    {
      id: "sem",
      label: "Cai neles",
      ok: false,
      rival: "dash",
      steps: [
        { from: -44, text: "Pulo na mola" },
        { from: -40, text: "Subindo pelos espinhos: passa", tone: "window" },
        { from: -28, text: "Lá no alto" },
        { from: -10, text: "Caindo nos espinhos" },
        { from: 0, text: "Pousou neles: morre", tone: "fail" },
      ],
    },
    {
      id: "dash",
      label: "Dash no pouso",
      ok: true,
      press: 0,
      rival: "sem",
      steps: [
        { from: -44, text: "Pulo na mola" },
        { from: -40, text: "Subindo pelos espinhos: passa", tone: "window" },
        { from: -28, text: "Lá no alto" },
        { from: -10, text: "Caindo nos espinhos" },
        { from: 0, text: "Dash no frame do pouso: passa por cima", tone: "window" },
      ],
    },
    {
      id: "tarde",
      label: "Dash 1 frame tarde",
      ok: false,
      press: 1,
      rival: "dash",
      steps: [
        { from: -44, text: "Pulo na mola" },
        { from: -40, text: "Subindo pelos espinhos: passa", tone: "window" },
        { from: -28, text: "Lá no alto" },
        { from: -10, text: "Caindo nos espinhos" },
        { from: 0, text: "Pousou neles antes do dash: morre", tone: "fail" },
      ],
    },
  ],
}

export function espinhosDirecionais(): Technique {
  return {
    sections: [
      {
        id: "no-jogo",
        title: "No jogo",
        body: (
          <div className="space-y-6">
            <DemoPlayer demo={WALL} footage={footageOf(WALL)} />
            <Text>
              <p>Nas duas primeiras tomadas, ela está no mesmo pixel e no mesmo frame. A que passa andou 0,18 px pra direita. O espinho olha pra velocidade, e não pra posição.</p>
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
                Depois de mover a Madeline, o jogo confere os espinhos que ela toca. Cada um só olha a velocidade dela no eixo pra onde ele aponta: indo na direção da ponta, passa, por menor que seja a velocidade. Indo contra ou parada, morre. O zero mata porque pousar e bater em parede zeram a velocidade antes da conferência: sem isso, daria pra ficar em pé num chão de espinhos.
              </p>
            </Text>
            <Figures
              items={[
                { label: "A caixa", value: "3 px", note: "de 5 desenhados" },
                { label: "Os pés", value: "2 px", note: "fora da caixa que morre" },
                { label: "Velocidade 0", value: "morre", note: "em qualquer direção" },
                { label: "Dash", value: "começa em 0", note: "dentro de espinhos, morre" },
              ]}
            />
            <Text>
              <p>Somando os dois, os pés dela podem afundar 4 das 5 linhas desenhadas de um espinho sem morrer.</p>
            </Text>
          </div>
        ),
      },
      {
        id: "mola",
        title: "Subindo passa, descendo morre",
        description: "No capítulo 1, uma mola embaixo de uma plataforma de espinhos joga ela pra cima através deles. A volta pelo mesmo caminho é morte, a não ser por um dash no frame exato do pouso.",
        body: <DemoPlayer demo={SPRING} footage={footageOf(SPRING)} />,
      },
      {
        id: "classic",
        title: "A regra do jogo de 4 dias",
        body: (
          <Milestones
            items={[
              { when: "2015", title: "Celeste Classic", children: "O Celeste original, feito em 4 dias, já tem a regra igualzinha, desigualdade por desigualdade, com o zero matando." },
              { when: "2018", title: "Celeste", children: "A mesma regra, com a caixa de 3 px e os pés que não contam." },
              { when: "2021", title: "Celeste Classic 2", children: "As mesmas quatro comparações, numa tabela." },
              { when: "2024", title: "Celeste 64", children: "Em 3D, vira um cone: só passa quem vai a até 60° da ponta do espinho." },
            ]}
          />
        ),
      },
      {
        id: "outros",
        title: "Outros jogos, outras regras",
        body: (
          <Milestones
            items={[
              { when: "1989", title: "Prince of Persia", children: "O espinho fura quem passa correndo, pula em cima ou cai neles. Andando com cuidado, passa." },
              { when: "1991", title: "Sonic the Hedgehog", children: "Conta o lado do toque: o espinho em pé machuca quem pisa nele ou bate por baixo." },
              { when: "2008", title: "Spelunky", children: "Também olha a velocidade, só que pra queda: mata quem cai neles depois de mais de 4 frames caindo. Subindo ou andando, passa." },
              { when: "2010", title: "VVVVVV", children: "Sem direção nenhuma: a caixa que mata só é menor que o desenho." },
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
              <li>Encostada em qualquer espinho, mesmo sem perigo, ela não recupera o dash ao pisar no chão.</li>
              <li>As línguas de poeira do capítulo 3 seguem a mesma regra, e nem acordam se ela passa indo pra longe delas.</li>
              <li>Na versão 1.2.3, o super pulo de parede ganhou 5 px de alcance e passou a funcionar através de espinhos de 3 px. A versão seguinte já consertou.</li>
            </ul>
          </Text>
        ),
      },
    ],
  }
}
