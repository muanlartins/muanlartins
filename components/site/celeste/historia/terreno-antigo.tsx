import { commentary, inMusic, lena } from "@/components/site/celeste/historia/fontes"
import { Dialogue, Facts, Reading } from "@/components/site/celeste/historia/parts"
import type { Story } from "@/components/site/celeste/historia/story"
import { Figures, Picture, Quote, Text } from "@/components/site/celeste/tecnicas/parts"
import { storyPicture } from "@/lib/celeste-demos"

/**
 * Chapter 2, Old Site, from the research of 2026-11-23 (~/.local/share/muanlartins/celeste-lore/capitulo-2/capitulo-2.md):
 * the lines are the game's (CH2_*), the rooms 2-OldSite.bin's, the chaser's numbers BadelineOldsite's IL in the
 * installed Celeste.dll (1.55 s behind, 0.4 s more per copy; the wiki's "3 s" is wrong), the making-of the developers'
 * commentary stream. The dark Madeline is "Parte de Mim", as the game names her; the heart's and the cassette's
 * sections wait for his save.
 */

const still = (name: string) => storyPicture("terreno-antigo", name)
const PART = "Parte de Mim"
const code = { label: "No próprio jogo: o código e o mapa do capítulo" }

export function terrenoAntigo(): Story {
  return {
    lede: "Um capítulo sonhado: um espelho que quebra, a outra Madeline que sai dele e dois telefonemas no mesmo orelhão.",
    sections: [
      {
        id: "historia",
        title: "A história",
        body: (
          <div className="space-y-8">
            <Dialogue lines={[{ who: "O cartão-postal", pt: "Morangos vão impressionar seus amigos, mas é só isso, mesmo. Pegue só se quiser muito!", en: "Strawberries will impress your friends, but that's about it. Only collect them if you really want to!", n: "POSTCARD_AREA_2" }]} />
            <Text>
              <p>
                O capítulo começa no mesmo acampamento em que o 1 terminou, só que agora a fogueira está acesa. Nada avisa, mas a Madeline pegou no sono. Pelas ruínas, uns blocos cinza servem só de chão. Embaixo delas tem um espelho velho: o reflexo corre, o vidro quebra, uma figura escura foge, e os blocos acendem. A partir daí, a Madeline atravessa eles com o dash.
              </p>
              <p>No primeiro checkpoint, Intervenção, a figura está deitada no chão, fingindo de morta. É a outra Madeline, que o jogo chama de Parte de Mim (e todo mundo chama de Badeline).</p>
            </Text>
            <Dialogue
              lines={[
                { who: PART, pt: "Madeline, querida, espera um pouco.", en: "Madeline, darling, slow down.", n: "CH2_BADELINE_INTRO" },
                { who: "Madeline", pt: "Você... sou eu?", en: "Are you... me?" },
                { who: PART, pt: "Eu sou Parte de Você.", en: "I'm Part of You." },
                { who: "Madeline", pt: "Por que Parte de Mim teria essa aparência tão sinistra?", en: "Why would Part of Me look so creepy?" },
                { who: PART, pt: "Eu sou assim, tá? Aceita que dói menos.", en: "This is just what I look like, okay? Deal with it." },
                { who: PART, pt: "Você é muitas coisas, querida, mas alpinista não é uma delas.", en: "You are many things, darling, but you are not a mountain climber." },
                { who: PART, pt: "Você não faz ideia de onde está se metendo. Você não aguenta isso.", en: "You have no idea what you're getting into. You can't handle this." },
                { who: "Madeline", pt: "É exatamente por isso que preciso fazer.", en: "That is exactly why I need to do this." },
                { who: PART, pt: "Vamos pra casa... juntas.", en: "Let's go home... together." },
              ]}
            />
            <Picture src={still("nome.webp")} alt="A Parte de Mim no chão, ao lado de um esqueleto, e a caixa de diálogo: TAS, querida, espera um pouco." width={1280} height={720} pixel>
              A primeira fala dela no jogo. Nas filmagens deste site, o save se chama TAS, e é esse o nome que ela diz.
            </Picture>
            <Text>
              <p>A Madeline foge, e a Parte de Mim vem atrás. Logo são três, depois cinco. No fim da fuga, um orelhão toca, e quem atende do outro lado não fala com ela há meses.</p>
            </Text>
            <Dialogue
              lines={[
                { who: "No telefone", pt: "Madeline, você só me liga quando está em pânico no meio da noite.", en: "Madeline, you only call me when you're panicking in the middle of the night.", n: "CH2_DREAM_PHONECALL" },
                { who: "Madeline", pt: "...eu estou sonhando, né?", en: "...I'm dreaming, aren't I?" },
                { who: "No telefone", pt: "Madeline. É claro que você está sonhando. Faz meses que não falo com você.", en: "Madeline. Of course you're dreaming. I haven't spoken to you in months." },
                { who: PART, pt: "É hora de desistir e ir pra casa.", en: "It's time to give up and go home." },
              ]}
            />
            <Text>
              <p>
                O telefone vira um monstro e engole a Madeline. Ela acorda no acampamento, de manhã, com a fogueira apagada e fumegando. Do lado, o Theo acampou pra fotografar as ruínas. Ele tira uma selfie de surpresa com ela, e ela diz que não é fotogênica.
              </p>
            </Text>
            <Dialogue
              lines={[
                { who: "Theo", pt: "Madeline, não seja tão dura consigo mesma! Ninguém fica bem sem um filtro.", en: "Madeline, don't be so hard on yourself! No one looks good without a filter.", n: "CH2_THEO_B" },
                { who: "Madeline", pt: "Cansei de quebrar minhas promessas pra mim mesma.", en: "I'm done breaking promises to myself.", n: "CH2_THEO_D" },
              ]}
            />
            <Text>
              <p>No fim do capítulo tem outro orelhão, igual ao do sonho. Dessa vez é a Madeline quem liga, pra mãe.</p>
            </Text>
            <Dialogue
              lines={[
                { who: "Mãe", pt: "Madeline, que surpresa boa! Como está a viagem?", en: "Madeline, what a nice surprise! How's your trip?", n: "CH2_END_PHONECALL" },
                { who: "Madeline", pt: "Está tudo bem, só estou meio... confusa.", en: "It's okay, I'm just kind of... overwhelmed." },
                { who: "Mãe", pt: "Ah, não, você está tendo outro ataque de pânico? Concentre-se na respiração, querida, eu estou aqui.", en: "Oh no, are you having another panic attack? Focus on your breathing honey, I'm here." },
              ]}
            />
            <Text>
              <p>O capítulo acaba aí, no meio da ligação, sem a resposta dela.</p>
            </Text>
          </div>
        ),
      },
      {
        id: "o-que-quer-dizer",
        title: "O que quer dizer",
        body: (
          <div className="space-y-8">
            <Reading seal="jogo" title="Quase tudo é sonho">
              <p>Do acampamento até o primeiro orelhão, o jogo considera que a Madeline está sonhando. Ela mesma percebe ao telefone, e o checkpoint seguinte se chama Desperta.</p>
            </Reading>
            <Reading seal="jogo" title="O problema ganha nome">
              <p>É a mãe quem diz, na última fala do capítulo: “outro ataque de pânico”. Antes dela, ninguém no jogo tinha dito o nome. E ela diz “outro”.</p>
            </Reading>
            <Reading seal="devs" title="Primeiro a sensação, depois o enredo">
              <p>
                Sobre o jogo inteiro, os devs contam na live de comentário que a história virou o centro do jogo sem um roteiro fechado: eles sabiam como era a sensação, não o que acontecia. Ao Kotaku, em 2018, a Maddy Thorson disse que a ideia nunca foi representar doença mental em geral nem fazer um guia de como lidar com depressão.
              </p>
            </Reading>
            <Reading seal="fas" title="A Parte de Mim é a ansiedade">
              <p>
                A leitura mais comum. No capítulo, ela fala como quem cuida: é uma “observadora preocupada”, pede pra Madeline ser sensata, diz que ela não aguenta e chama pra voltar pra casa “juntas”. O jogo não usa a palavra.
              </p>
            </Reading>
            <Reading seal="minha" title="Dois telefonemas">
              <p>
                O mesmo orelhão aparece duas vezes. No sonho, ligam pra ela, a pessoa do outro lado não acredita nela, e o telefone vira monstro. Acordada, é ela quem liga, e a mãe acolhe. Eu leio como uma relação que machuca e outra que segura.
              </p>
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
                { label: "Salas", value: "45", note: "33 sonhadas, 12 acordada" },
                { label: "O atraso dela", value: "1,55 s", note: "e mais 0,4 s a cada cópia" },
                { label: "Cópias", value: "5", note: "de uma vez, numa sala da fuga" },
                { label: "Blocos acordada", value: "0", note: "eles só existem no sonho" },
              ]}
            />
            <Facts
              items={[
                {
                  title: "Ela não te persegue, ela te repete",
                  children: (
                    <p>
                      A Parte de Mim refaz os movimentos da Madeline com 1,55 segundo de atraso, até os sons. Cada cópia nova vem 0,4 segundo depois da anterior, com o cabelo um pouco mais claro. A wiki dos fãs diz três segundos de atraso e um entre as cópias. O código do jogo diz outra coisa.
                    </p>
                  ),
                  source: code,
                },
                {
                  title: "Depois da fuga, nada de espinho",
                  children: (
                    <p>
                      O trecho depois do sonho tinha espinhos. Nos testes, quem chegava ali estava esgotado e dizia que terminava o capítulo outro dia. Os devs tiraram os espinhos e acrescentaram uma sala pra respirar. No jogo de hoje, o caminho principal acordado não tem nenhum.
                    </p>
                  ),
                  source: commentary("58:20"),
                },
                {
                  title: "O atalho que os devs deixaram",
                  children: <p>Dá pra começar a cena do espelho e terminar dentro de um bloco de sonho, um atalho conhecido dos speedrunners. Os devs sabiam e deixaram, porque não atrapalha quem joga normal, deixa o speedrun mais divertido e “é meio legal”.</p>,
                  source: commentary("1:33:39"),
                },
                {
                  title: "O pulo pra fora do bloco veio depois",
                  children: <p>Sair de um bloco de sonho pulando funciona hoje, mas não existia no começo. Entrou quando a equipe começou a desenhar os lados B e queria mais uma técnica. O lado A não exige.</p>,
                  source: commentary("24:32"),
                },
                {
                  title: "O diálogo foi reescrito várias vezes",
                  children: <p>As falas de uma versão antiga já tinham a essência das de hoje. Depois entrou o editor Nick Suttner, que ajudou muito, e a equipe foi reescrevendo tudo.</p>,
                  source: commentary("59:41"),
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
                title: "O reflexo já era ela",
                children: <p>Antes do espelho quebrar, o reflexo que anda junto com a Madeline já é desenhado com o corpo e o cabelo roxo da Parte de Mim, e os passos dele usam o som dos passos dela.</p>,
                media: <Picture src={still("espelho.webp")} alt="A Madeline diante do espelho, com o reflexo de cabelo roxo" width={1280} height={720} pixel />,
                source: code,
              },
              {
                title: "O sonho começa e termina em lugares reais",
                children: <p>O chão do acampamento do sonho é idêntico, bloco por bloco, ao da última sala do capítulo 1, e é nele que ela acorda. O orelhão do sonho e o de verdade ficam em salas iguais. E os blocos de sonho só existem enquanto ela sonha.</p>,
                source: code,
              },
              {
                title: "Ela finge de morta ao lado de um esqueleto",
                children: <p>Quando a Madeline chega no checkpoint Intervenção, a Parte de Mim está deitada com a animação de “fingir de morta”, ao lado de uma panela e de um esqueleto. O desenho do esqueleto só aparece nessa sala, em todos os mapas do jogo.</p>,
                source: code,
              },
              {
                title: "Ela chama você pelo nome do save",
                children: <p>Toda vez que alguém diz “Madeline”, o jogo põe ali o nome do arquivo de save, como na imagem da primeira fala da Parte de Mim, lá em cima.</p>,
                source: code,
              },
              {
                title: "Quem está no telefone",
                children: <p>Ninguém diz quem atende o telefone no sonho. Só o arquivo de falas chama a pessoa de “EX”. O retrato dela é uma imagem parada, com chiado, que nem pisca. O da mãe pisca e mexe a boca.</p>,
                source: code,
              },
              {
                title: "Cinco conversas com o Theo",
                children: <p>Cada vez que a Madeline volta a falar com ele, sai uma conversa nova: as fotos, o filtro “Casual, mas refinada”, o avô fotógrafo, as promessas e o plano de dados que ela não tem. A primeira muda se ela conheceu ou não o Theo no capítulo 1.</p>,
              },
              {
                title: "A tradução tem gíria",
                children: <p>“Deal with it” virou “Aceita que dói menos”, “that’s crazy” virou “que da hora”, e o “let’s go home together” ficou “Vamos pra casa juntas”, com um feminino que amarra as duas e que o inglês não tem. Uma perde: “overwhelmed”, que é sobrecarregada, virou “confusa”.</p>,
              },
            ]}
          />
        ),
      },
      {
        id: "musica",
        title: "A música",
        description: "No álbum, “Resurrections” e “Awake”, de Lena Raine.",
        body: (
          <div className="space-y-8">
            <Facts
              items={[
                {
                  title: "Um sonho inteiro numa faixa",
                  children: <p>“Resurrections”, com quase dez minutos, junta quatro ou cinco trechos do capítulo, todos do sonho. Um deles, de uma cena, ficou no álbum porque emenda bem em “Awake”, a música de quando ela acorda.</p>,
                  source: lena,
                },
                {
                  title: "A música troca a cada cena",
                  children: <p>No capítulo 1, as trilhas ligam e desligam por sala. Aqui, cada cena troca a música inteira: o começo, o espelho, a chegada da Parte de Mim, a fuga, o telefone e o acordar.</p>,
                  source: inMusic,
                },
                {
                  title: "A fuga sabe onde está o telefone",
                  children: <p>Na fuga, o jogo mede quanto a Madeline já andou até o orelhão e abre a música conforme ela chega perto.</p>,
                  source: inMusic,
                },
              ]}
            />
            <Quote by="Lena Raine, ao Original Sound Version (2018)" href={lena.href} original="I wrote it literally as a minor inversion of Madeline's theme.">
              Eu escrevi literalmente como uma inversão em tom menor do tema da Madeline.
            </Quote>
            <Text>
              <p>É o tema da Parte de Mim: o da Madeline, de cabeça pra baixo e em menor.</p>
            </Text>
          </div>
        ),
      },
      {
        id: "coracao",
        title: "O coração",
        needs: "2/heart",
        description: "Trancado acordada, solto no sonho, com um poema que diz isso.",
        body: (
          <div className="space-y-6">
            <Text>
              <p>Numa sala escondida acima do acampamento, acordada, o coração fica preso entre paredes que não quebram. Na mesa ao lado tem um livro velho aberto num poema, que é a dica: no sonho, o coração está solto.</p>
            </Text>
            <Dialogue
              lines={[
                { who: "O poema do livro", pt: "Desperto, meu coração é uma fortaleza. Nos sonhos sou vulnerável.", en: "Awake, my heart is a fortress. In dreams I am vulnerable.", n: "CH2_POEM" },
                { who: "O poema do coração", pt: "Ressurreições", en: "Resurrections", n: "POEM_OS" },
              ]}
            />
          </div>
        ),
      },
      {
        id: "fita",
        title: "A fita",
        needs: "2/cassette",
        description: "Na descida embaixo das ruínas.",
        body: (
          <Text>
            <p>A fita fica numa das salas embaixo das ruínas, no caminho até o espelho, com blocos que alternam no ritmo da música. Ela abre o lado B do capítulo.</p>
          </Text>
        ),
      },
    ],
  }
}
