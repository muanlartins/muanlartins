import { commentary, inMusic, lena, KEXP } from "@/components/site/celeste/historia/fontes"
import { Dialogue, Facts, Reading } from "@/components/site/celeste/historia/parts"
import type { Story } from "@/components/site/celeste/historia/story"
import { Figures, Picture, Quote, Text } from "@/components/site/celeste/tecnicas/parts"
import { storyPicture } from "@/lib/celeste-demos"

/**
 * Chapter 4, Golden Ridge, from the research of 2026-11-24
 * (~/.local/share/muanlartins/celeste-lore/capitulo-4/capitulo-4.md): the lines are the game's (CH4_*), the rooms,
 * entities and counts 4-GoldenRidge.bin's, the gates, the breathing exercise and the music's parameters Celeste.dll's IL
 * (Level.GotCollectables, RidgeGate, BreathingMinigame, CS04_Gondola), the making-of the developers' commentary stream,
 * the gondola's music Lena Raine's (Original Sound Version 2018, KEXP 2019). The dark Madeline is "Parte de Mim", as
 * the game names her; the heart's and the cassette's sections wait for his save.
 */

const still = (name: string) => storyPicture("cordilheira-dourada", name)
const code = { label: "No próprio jogo: o código e o mapa do capítulo" }
const kexp = { label: "Lena Raine à KEXP (2019)", href: KEXP }

export function cordilheiraDourada(): Story {
  return {
    lede: "Vento contra, a vovó de novo e um teleférico que para no meio do abismo.",
    sections: [
      {
        id: "historia",
        title: "A história",
        body: (
          <div className="space-y-8">
            <Dialogue lines={[{ who: "O cartão-postal", pt: "Dica de escalada! Está no aperto e ficando sem forças? Pular das paredes não consome energia!", en: "Climbing Tip! Low on energy in a pinch? Jumping away from walls doesn't consume stamina!", n: "POSTCARD_AREA_4" }]} />
            <Text>
              <p>
                Depois do hotel, a Madeline reencontra a vovó do Prólogo, agora na porta de um chalezinho, do lado de uma fonte de água quente. A vovó quer saber do Oshiro, ri da manhã de faxina da Madeline e dá uns conselhos que ninguém pediu.
              </p>
            </Text>
            <Picture src={still("chale.webp")} alt="A Madeline e a vovó na frente do chalé, e a caixa de diálogo: Ah, ótimo, você de novo." width={1280} height={720} pixel />
            <Dialogue
              lines={[
                { who: "Madeline", pt: "Ah, ótimo, você de novo.", en: "Oh great, you again.", n: "CH4_GRANNY_1" },
                { who: "Vovó", pt: "O Oshiro é uma alma perdida, bem.", en: "Oshiro is a lost soul, dear." },
                { who: "Vovó", pt: "Não faça dele o seu projeto.", en: "Don't make him your project." },
                { who: "Vovó", pt: "Na minha percepção, a Montanha não pode extrair nada que já não esteja em você.", en: "The way I see it, the Mountain can't bring out anything that isn't already in you." },
                { who: "Vovó", pt: "Às vezes, é difícil saber a diferença entre teimosia e determinação, não é?", en: "Sometimes it's hard to tell the difference between stubbornness and determination, isn't it?" },
                { who: "Vovó", pt: "Boa sorte e cuidado com o vento!", en: "Good luck, and mind the wind!" },
              ]}
            />
            <Text>
              <p>
                E o vento vem mesmo, logo na saída do chalé. Daí pra frente a subida é contra ele, com bandeiras mostrando pra que lado sopra, bolhas verdes, nuvens que quicam e blocos que andam pra onde a seta aponta. No meio da trilha fica o Templo, um vão de pedra cheio de passarinhos, com o primeiro bloco de seta do jogo.
              </p>
            </Text>
            <Picture src={still("templo.webp")} alt="O Templo: a Madeline no chão, o checkpoint e um bloco com uma seta pra cima" width={1280} height={720} pixel />
            <Text>
              <p>
                Na Face do Penhasco, o vento fica forte e começam a voar bolas de neve. A última sala é a estação de um teleférico velho. Quando a Madeline chega perto, o Theo cai lá de cima, de cara no chão.
              </p>
            </Text>
            <Dialogue
              lines={[
                { who: "Theo", pt: "C o n s e   g u i .", en: "N a i l e d   i t .", n: "CH4_GONDOLA" },
                { who: "Madeline", pt: "Eu não devia ter tentado ajudar ele.", en: "I shouldn't have tried to help him." },
                { who: "Theo", pt: "Odeio dizer eu avisei, mas...", en: "I hate to say I told you so, but..." },
              ]}
            />
            <Text>
              <p>
                No meio do abismo, o Theo inventa uma selfie. O teleférico para, a Parte de Mim aparece sentada no teto, a alavanca quebra na mão do Theo e uma escuridão com tentáculos sobe em volta da cabine.
              </p>
            </Text>
            <Picture src={still("parada.webp")} alt="O teleférico parado no meio da névoa, a Parte de Mim sentada no teto e a Madeline e o Theo lá dentro" width={1280} height={720} pixel />
            <Dialogue
              lines={[
                { who: "Madeline", pt: "Não consigo respirar.", en: "I can't breathe." },
                { who: "Theo", pt: "Você está tendo um ataque de pânico.", en: "You're having a panic attack." },
                { who: "Theo", pt: "Meu avô me ensinou um truque pra isso. Fecha os olhos.", en: "My grandpa taught me a trick for this. Close your eyes." },
              ]}
            />
            <Text>
              <p>Aí o jogo vira um exercício de respiração, e quem respira é você.</p>
            </Text>
            <Picture src={still("pena.webp")} alt="Uma pena dourada na frente da Madeline e do Theo, no escuro, e o texto: A sua respiração mantém a pena flutuando." width={1280} height={720} pixel />
            <Dialogue
              lines={[
                { who: "O exercício", pt: "Imagina uma pena flutuando na sua frente.", en: "Picture a feather floating in front of you.", n: "CH4_GONDOLA_FEATHER_1" },
                { who: "O exercício", pt: "É só respirar devagar e sempre, pra dentro e pra fora.", en: "Just breathe slow and steady, in and out.", n: "CH4_GONDOLA_FEATHER_5" },
              ]}
            />
            <Text>
              <p>Quando a Madeline se acalma, o teleférico volta a andar até a estação do outro lado. Ela agradece e pergunta como ele sabia que ia dar certo.</p>
            </Text>
            <Dialogue
              lines={[
                { who: "Theo", pt: "Ah, eu achei que a gente já era, na verdade.", en: "Oh, I totally thought we were done for.", n: "CH4_GONDOLA" },
                { who: "Theo", pt: "Mas olha só essa selfie!", en: "Look at this selfie though!" },
              ]}
            />
          </div>
        ),
      },
      {
        id: "o-que-quer-dizer",
        title: "O que quer dizer",
        body: (
          <div className="space-y-8">
            <Reading seal="jogo" title="A Montanha não inventa nada">
              <p>
                No Prólogo, a vovó avisou que a Montanha mostra coisas que a Madeline não está pronta pra ver. Aqui ela explica: a Montanha não tira nada que já não esteja na pessoa. Falando com ela de novo, ela fecha a ideia: “A Montanha mostra a você quem você é de verdade. Esteja você pronta ou não.”
              </p>
            </Reading>
            <Reading seal="jogo" title="Cada um no seu tempo">
              <p>
                Sobre o Oshiro, a vovó diz que ele precisa seguir em frente, “mas isso vai acontecer no tempo dele, não no seu”, e que a Madeline tentando se provar não ajuda. No capítulo 3 ela insistiu em ajudar contra todo mundo. No teleférico, já diz que não devia ter tentado.
              </p>
            </Reading>
            <Reading seal="jogo" title="Dessa vez, alguém do lado">
              <p>
                No capítulo 2, quem deu nome ao problema foi a mãe, pelo telefone. Aqui é o Theo, ali do lado, e ele já chega com um jeito de sair: o truque que aprendeu com o avô.
              </p>
            </Reading>
            <Reading seal="devs" title="Veio de um período ansioso">
              <p>
                Na live de comentário, alguém do chat pergunta qual foi a inspiração pra cena da crise de pânico. A resposta: “acho que eu estava passando por um período bem ansioso, e sinceramente foi daí que veio muito disso”.
              </p>
            </Reading>
            <Reading seal="jogo" title="Teimosia ou determinação">
              <p>A Madeline manda a vovó cair fora e segue pro topo. A vovó não discute: diz que é difícil saber a diferença entre teimosia e determinação, e que a Madeline lembra ela mesma quando era nova.</p>
            </Reading>
          </div>
        ),
      },
      {
        id: "como-foi-feito",
        title: "Como foi feito",
        body: (
          <div className="space-y-8">
            <Figures
              items={[
                { label: "Salas", value: "49", note: "o capítulo 3 tem 65" },
                { label: "Bolhas verdes", value: "59", note: "nenhuma nos capítulos antes" },
                { label: "Blocos de seta", value: "31", note: "o primeiro fica no Templo" },
                { label: "Bandeiras", value: "110", note: "todas seguindo o vento da sala" },
              ]}
            />
            <Facts
              items={[
                {
                  title: "Cinco novidades de uma vez",
                  children: <p>Vento, bolhas verdes, nuvens que quicam, blocos de seta e bolas de neve: nada disso aparece nos capítulos anteriores. As bandeiras leem o vento da sala e mostram pra que lado e com que força ele sopra.</p>,
                  source: code,
                },
                {
                  title: "Os portões não te trancam longe de um morango",
                  children: (
                    <p>
                      O Templo tem cinco portões de pedra, um em cada passagem pras trilhas em volta. Cada portão está ligado a um morango (um deles, a dois) das trilhas atrás dele, e o jogo só coloca o portão se você já pegou esse morango. Quando você volta ao Templo por uma dessas passagens, ele desliza e fecha atrás de você. Se o morango ainda está lá, a passagem fica aberta.
                    </p>
                  ),
                  source: code,
                },
                {
                  title: "Desenhado sem gráfico nenhum",
                  children: <p>Os devs contam que, no começo, o design das fases andou muito na frente do resto: os capítulos 4 e 5 foram desenhados sem gráfico nenhum. A música chegou depois e seguiu o que já dava pra jogar.</p>,
                  source: commentary("1:31:44"),
                },
                {
                  title: "A cena do teleférico mudou muito",
                  children: <p>Nas versões antigas, a cena do teleférico tinha metade do diálogo de hoje, e os devs dizem que ela passou por muitas mudanças até a versão final.</p>,
                  source: commentary("1:36:58"),
                },
                {
                  title: "30 segundos de calma",
                  children: (
                    <p>
                      No exercício, segurar o pulo, o dash ou pra cima enche o pulmão e a pena sobe. Soltar, ela desce. Pra terminar, a pena tem que somar 30 segundos dentro da caixa. Sair dela custa meio segundo, e a conta vai voltando devagar enquanto a pena está fora.
                    </p>
                  ),
                  source: code,
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "segredos",
        title: "Segredos",
        body: (
          <Facts
            items={[
              {
                title: "O chalé é feito de outros capítulos",
                children: <p>No mapa, o chalé da vovó é montado com desenhos de outros lugares: a porta e a mesa são do Terreno Antigo, e as tábuas, os canos, as caixas e a boia salva-vidas são do hotel.</p>,
                source: code,
              },
              {
                title: "A vovó avisa do vento",
                children: <p>A última fala dela é “cuidado com o vento!”. No mapa, o primeiro vento do capítulo liga logo depois do chalé, ainda na sala dela.</p>,
                source: code,
              },
              {
                title: "28 passarinhos numa sala",
                children: <p>O Templo tem 28 passarinhos, que voam quando a Madeline chega perto. O capítulo 3 inteiro tem 16.</p>,
                source: code,
              },
              {
                title: "Os tentáculos são mãos",
                children: <p>O roteiro da cena chama a escuridão do teleférico de tentáculos. Nos desenhos do jogo, ela se chama “gondolaHands”, mãos do teleférico, com as animações de agarrar e de puxar.</p>,
                source: code,
              },
              {
                title: "A tradução tem gíria",
                children: (
                  <p>
                    “A few crows short of a murder” (uns corvos a menos, porque “murder” é como se chama um bando de corvos em inglês) virou “uns parafusos a menos”. “Old bat” virou “velha coroca”, “Back off, lady” virou “Cai fora, dona” e o “slow and steady” do exercício virou “devagar e sempre”. Uma perde: o “Stay with me here” do Theo, que é “fica comigo”, virou “Faz o que eu digo”.
                  </p>
                ),
              },
              {
                title: "Dois templos",
                children: <p>O checkpoint “Shrine”, santuário, virou “Templo” na tradução. E o capítulo seguinte se chama Templo do Espelho.</p>,
              },
            ]}
          />
        ),
      },
      {
        id: "musica",
        title: "A música",
        description: "Pela descrição da própria Lena Raine, a crise do teleférico é “Anxiety”, no álbum.",
        body: (
          <div className="space-y-8">
            <Quote by="Lena Raine, ao Original Sound Version (2018)" href={lena.href} original="Madeline's theme is this small, tenuous piano line that then gets completely engulfed in synths.">
              O tema da Madeline é uma linha de piano pequena e frágil que depois é completamente engolida pelos sintetizadores.
            </Quote>
            <Facts
              items={[
                {
                  title: "A crise tem a música dela",
                  children: <p>A Lena conta que guardou o sintetizador grande, à moda dos anos 80, pra poucos momentos, e o teleférico é um deles. A música da cena, no jogo, tem duas partes: um piano e um sintetizador. Pra ela, o piano é quase um mantra em que a Madeline tenta se concentrar, até os sintetizadores crescerem por cima.</p>,
                  source: [lena, kexp],
                },
                {
                  title: "A música acalma junto com você",
                  children: <p>Durante o exercício, o jogo passa pra música, o tempo todo, quanto dos 30 segundos você já fez, num parâmetro chamado “calm”, calma. Quanto mais perto do fim, mais calma a música.</p>,
                  source: inMusic,
                },
                {
                  title: "O tema do Theo volta",
                  children: <p>Na última sala, o mapa desliga a música. Quem liga de novo é o Theo: a música dele, a da fogueira do capítulo 1, começa no instante em que ele grita lá de cima.</p>,
                  source: inMusic,
                },
                {
                  title: "O vento mexe na música",
                  children: <p>A música da subida tem quatro trilhas: dois baixos, uma principal e uma chamada “winds”, ventos. Nas salas com vento, o mapa pede outra mistura delas. Na Face do Penhasco, troca a música inteira por uma chamada “heavy winds”, ventos fortes.</p>,
                  source: inMusic,
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "coracao",
        title: "O coração",
        needs: "4/heart",
        description: "Numa das trilhas do Templo, atrás de uma parede que quebra com o dash.",
        body: (
          <div className="space-y-6">
            <Text>
              <p>
                A sala do coração tem o único bloco branco do jogo inteiro. Agachar em cima dele por três segundos faz ele ir pro fundo, e a Madeline cai através dele. Os devs dizem na live que é uma homenagem ao Super Mario Bros. 3, que inspirou muito o design do jogo.
              </p>
            </Text>
            <Dialogue lines={[{ who: "O poema do coração", pt: "Olho da tempestade", en: "Eye of the storm", n: "POEM_CS" }]} />
          </div>
        ),
      },
      {
        id: "fita",
        title: "A fita",
        needs: "4/cassette",
        description: "No primeiro trecho do capítulo, antes do Templo.",
        body: (
          <Text>
            <p>A fita fica no fundo de uma sala comprida com um binóculo na entrada, depois de blocos que alternam no ritmo da música. Ela abre o lado B do capítulo.</p>
          </Text>
        ),
      },
    ],
  }
}
