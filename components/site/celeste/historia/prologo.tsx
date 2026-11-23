import Link from "next/link"
import { KEXP, commentary, inMusic, sonar } from "@/components/site/celeste/historia/fontes"
import { Dialogue, Facts, Reading } from "@/components/site/celeste/historia/parts"
import type { Story } from "@/components/site/celeste/historia/story"
import { Picture, Text } from "@/components/site/celeste/tecnicas/parts"
import { storyPicture } from "@/lib/celeste-demos"
import { celestePath } from "@/lib/celeste"

/**
 * The Prologue, from the research of 2026-11-23 (~/.local/share/muanlartins/celeste-lore/capitulo-0-1/prologo.md):
 * the lines are the game's own (CH0_INTRO, CH0_GRANNY, CH0_END, the official Brazilian translation beside the
 * English), the rooms are 0-Intro.bin's, the making-of is the developers' commentary stream.
 */

const still = (name: string) => storyPicture("prologo", name)

export function prologo(): Story {
  return {
    lede: "A estrada até a montanha: uma senhora que ri de tudo, uma ponte que desaba atrás da Madeline e a primeira aula de dash.",
    sections: [
      {
        id: "historia",
        title: "A história",
        body: (
          <div className="space-y-8">
            <Text>
              <p>O jogo abre com a Madeline sozinha numa estrada de terra, ao lado do carro, falando com ela mesma:</p>
            </Text>
            <Dialogue lines={[{ who: "Madeline, pensando", pt: "É agora, Madeline. Respira. Por que está tão nervosa?", en: "This is it, Madeline. Just breathe. Why are you so nervous?", n: "CH0_INTRO" }]} />
            <Text>
              <p>
                Logo depois, um pedaço da estrada desaba na frente dela. Na única casa do caminho mora uma senhora que a versão brasileira chama de Vovó (Granny, no original). A Madeline pergunta pela trilha, reclama da “entrada” que quase a matou e a Vovó ri da cara dela.
              </p>
            </Text>
            <Dialogue
              lines={[
                { who: "Madeline", pt: "Bom, se uma velha coroca como você consegue sobreviver aqui, acho que vou ficar bem.", en: "Well, if an old bat like you can survive out here, I think I'll be fine.", n: "CH0_GRANNY" },
                { who: "Vovó", pt: "Mas fique você sabendo, a Montanha Celeste é um lugar estranho.", en: "But you should know, Celeste Mountain is a strange place." },
                { who: "Vovó", pt: "Talvez você veja coisas.", en: "You might see things." },
                { who: "Vovó", pt: "Coisas que não está pronta para ver.", en: "Things you ain't ready to see." },
                { who: "Madeline", pt: "Você devia se tratar, dona.", en: "You should seek help, lady." },
              ]}
            />
            <Picture src={still("casa.webp")} alt="A Madeline chega na casa da Vovó, e a caixa de diálogo diz: Com licença, senhora." width={1280} height={720} pixel>
              A casa da Vovó, com a primeira fala da conversa no jogo em português.
            </Picture>
            <Text>
              <p>
                Depois vem a ponte, que desaba pedaço por pedaço enquanto ela corre. No fim, um pássaro para o tempo e ensina o dash, o movimento em que o jogo inteiro se apoia. O Prólogo fecha com uma linha só:
              </p>
            </Text>
            <Dialogue lines={[{ who: "Madeline, pensando", pt: "Você consegue.", en: "You can do this.", n: "CH0_END" }]} />
          </div>
        ),
      },
      {
        id: "o-que-quer-dizer",
        title: "O que quer dizer",
        body: (
          <div className="space-y-8">
            <Reading seal="jogo" title="A ansiedade vem antes do primeiro pulo">
              <p>A primeira frase do jogo é a Madeline tentando se acalmar, e a última do Prólogo é ela se dando força. Antes de qualquer obstáculo, o jogo já mostra com o que ela está lidando.</p>
            </Reading>
            <Reading seal="jogo" title="O aviso da Vovó">
              <p>
                Em “Talvez você veja coisas”, a câmera fecha no rosto dela e o retrato troca por dois desenhos assustadores que só aparecem nessa cena. O roteiro do jogo chama o momento de “zoom sinistro”. A Madeline responde mandando a velha se tratar.
              </p>
            </Reading>
            <Reading seal="fas" title="A ponte que cai atrás">
              <p>A leitura mais comum é a de que não tem volta: a ponte desaba atrás da Madeline e o único caminho é pra frente. Quem fez o jogo só falou dela como a aula do dash.</p>
            </Reading>
          </div>
        ),
      },
      {
        id: "como-foi-feito",
        title: "Como foi feito",
        body: (
          <Facts
            items={[
              {
                title: "A ponte veio antes do pássaro",
                children: <p>Em março de 2016, uns dois meses depois de o jogo começar, a ponte já existia e já dava pra dar dash. O pássaro que ensina o dash no fim dela só apareceu entre março e junho daquele ano.</p>,
                source: commentary("3:40"),
              },
              {
                title: "A parede que existia pra cansar",
                children: (
                  <p>
                    A primeira parede de escalar estava ali pra mostrar a stamina acabando, e nas primeiras versões ela acabava muito rápido. Quando acabava, a Madeline ficava presa no chão, piscando em vermelho, até recuperar o fôlego. Tiraram porque era chato.
                  </p>
                ),
                source: commentary("10:00"),
              },
              {
                title: "O aviso da Vovó entrou no fim",
                children: (
                  <p>
                    Com o jogo quase pronto, a Maddy Thorson acrescentou a fala em que a Vovó avisa sobre a montanha. A Amora Bettany, que desenhava os retratos, achou que a fala pedia um rosto novo e desenhou o close assustador sem perguntar pra ninguém.
                  </p>
                ),
                source: sonar("1:10:20"),
              },
              {
                title: "Os primeiros desenhos eram do programador",
                children: <p>Nas primeiras versões, a Madeline e a Vovó tinham os sprites do Noel Berry, um dos dois programadores. O Pedro Medeiros redesenhou tudo depois. O Noel conta que, sem os retratos e as vozes, o diálogo parecia sem vida.</p>,
                source: commentary("4:00"),
              },
              {
                title: "Feito na ordem",
                children: <p>O jogo foi feito capítulo por capítulo, na ordem em que a gente joga. O Prólogo de 2016 já era quase o de hoje, até nas falas.</p>,
                source: commentary("2:40"),
              },
            ]}
          />
        ),
      },
      {
        id: "segredos",
        title: "Segredos",
        body: (
          <Facts
            items={[
              {
                title: "Seis passarinhos em cima do começo",
                children: <p>Acima da sala em que a estrada desaba tem uma sala inteira escondida, com um morrinho e seis passarinhos. Não tem morango nem nada. Na live de comentário, os devs lembram de alguém nos testes querendo subir ali.</p>,
                media: <Picture src={still("passarinhos.webp")} alt="A sala escondida acima do começo do jogo, com seis passarinhos" width={1280} height={720} pixel />,
                source: commentary("9:00"),
              },
              {
                title: "O nome dela é o do seu save",
                children: <p>Toda vez que alguém diz “Madeline”, o jogo escreve o nome do arquivo de save. Quem batizou o save com o próprio nome lê, na primeira tela, “É agora,” seguido do próprio nome.</p>,
              },
              {
                title: "A tradução deixou a Madeline mais malcriada",
                children: (
                  <p>
                    “Old bat” virou “velha coroca” e “lady” virou “dona”. A tradução brasileira passou por uma revisão inteira da Amora Bettany, artista brasileira do jogo, que conto na <Link href={`${celestePath()}/o-jogo#mao-brasileira`} className="text-klein underline-offset-4 hover:underline">página sobre como Celeste foi feito</Link>.
                  </p>
                ),
              },
            ]}
          />
        ),
      },
      {
        id: "musica",
        title: "A música",
        description: "No álbum, a faixa é “Prologue”, de Lena Raine.",
        body: (
          <Facts
            items={[
              {
                title: "O piano é a neve",
                children: <p>O piano começa no caminho até a casa da Vovó. A Lena Raine conta que passou a usar linhas de piano como metáfora da neve caindo, e que isso virou o centro do som do jogo.</p>,
                source: { label: "Lena Raine à KEXP (2019)", href: KEXP },
              },
              {
                title: "Quando a ponte cai, o mundo fica em silêncio",
                children: <p>O desabamento tem uma peça só dele, que toca uma vez e não se repete. Ao mesmo tempo, o jogo desliga o som ambiente: o vento some e só sobra a música.</p>,
                source: inMusic,
              },
            ]}
          />
        ),
      },
    ],
  }
}
