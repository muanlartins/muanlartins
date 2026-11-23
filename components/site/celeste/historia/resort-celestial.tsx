import { commentary, inMusic, lena, lenaBandcamp } from "@/components/site/celeste/historia/fontes"
import { Dialogue, Facts, Reading } from "@/components/site/celeste/historia/parts"
import type { Story } from "@/components/site/celeste/historia/story"
import { Figures, Picture, Text } from "@/components/site/celeste/tecnicas/parts"
import { storyPicture } from "@/lib/celeste-demos"

/**
 * Chapter 3, Celestial Resort, from the research of 2026-11-23
 * (~/.local/share/muanlartins/celeste-lore/capitulo-3/capitulo-3.md): the lines are the game's (CH3_*), the rooms,
 * entities and counts 3-CelestialResort.bin's, the class names Celeste.dll's, the making-of the developers'
 * commentary stream. The dark Madeline is "Parte de Mim" here, as the game names her (PART_OF_ME); the heart's, the
 * cassette's and Celeste Classic's sections wait for his save.
 */

const still = (name: string) => storyPicture("resort-celestial", name)
const PART = "Parte de Mim"

export function resortCelestial(): Story {
  return {
    lede: "Um hotel caindo aos pedaços, um gerente que não aceita ajuda e uma faxina que termina no telhado.",
    sections: [
      {
        id: "historia",
        title: "A história",
        body: (
          <div className="space-y-8">
            <Dialogue lines={[{ who: "O cartão-postal", pt: "Orgulhe-se da sua Contagem de Mortes! Morrendo e aprendendo, é isso aí!", en: "Be proud of your Death Count! The more you die, the more you're learning. Keep going!", n: "POSTCARD_AREA_3" }]} />
            <Text>
              <p>
                Depois de uma ponte quebrada, a Madeline acha a primeira chave do jogo e abre a porta de um hotel enorme e abandonado. Na recepção aparece o gerente, o Sr. Oshiro. A Madeline só quer uma saída pelos fundos, mas ele oferece a suíte presidencial no último andar, e ela aceita pensando em sair pelo telhado.
              </p>
            </Text>
            <Picture src={still("recepcao.webp")} alt="A recepção do hotel, com a montanha numa janela redonda" width={1280} height={720} pixel />
            <Dialogue
              lines={[
                { who: "Madeline", pt: "Você é... um fantasma?", en: "Are you... a ghost?", n: "CH3_OSHIRO_FRONT_DESK" },
                { who: "Oshiro", pt: "Um fantasma? Não seja boba.", en: "A ghost? Don't be silly." },
              ]}
            />
            <Text>
              <p>
                Ela consegue ouvir os pensamentos dele, e eles são quase sempre o Oshiro se xingando. No meio do hotel, um salão está entupido de entulho, e o Oshiro desmorona diante da bagunça. A Madeline se oferece pra ajudar: cada interruptor que ela aperta, na lavanderia, no depósito e na biblioteca, manda uma cor de entulho de volta pros armários.
              </p>
            </Text>
            <Dialogue
              lines={[
                { who: "Madeline", pt: "Respire, Sr. Oshiro. Respire. É só uma faxininha de domingo.", en: "Just breathe, Mr. Oshiro. Breathe. It's just a little spring cleaning.", n: "CH3_OSHIRO_CLUTTER0" },
                { who: "Oshiro, pensando", pt: "Como é que eu deixei meus problemas se amontoarem assim?", en: "How could I let my problems pile up like this?", n: "CH3_OSHIRO_CLUTTER1" },
                { who: "Oshiro, pensando", pt: "Ela sente pena de você, Oshiro. Você é patético.", en: "She pities you, Oshiro. You're pathetic.", n: "CH3_OSHIRO_CLUTTER1_B" },
              ]}
            />
            <Picture src={still("bagunca.webp")} alt="O salão da Grande Bagunça, entupido de entulho em três cores" width={1280} height={720} pixel />
            <Text>
              <p>
                Na lavanderia, o Theo também está hospedado e tenta fugir arrancando a grade de um duto. Ele acha o Oshiro um velho bizarro e chama a Madeline pra fugir junto. Ela fica.
              </p>
            </Text>
            <Dialogue
              lines={[
                { who: "Madeline", pt: "Ele só precisa dar uma limpada nessa bagunça. Eu quero ajudar.", en: "He just needs to clean up this mess. I want to help him.", n: "CH3_THEO_ESCAPING" },
                { who: "Theo", pt: "Cara, você é mais teimosa que a minha irmã. Achei que isso era impossível.", en: "Man, you're more stubborn than my sister. I thought that was impossible." },
                { who: "Madeline", pt: "E talvez essa seja a minha chance de fazer algo bom. Pra variar.", en: "And maybe I can actually do something good. For once.", n: "CH3_THEO_VENTS" },
              ]}
            />
            <Text>
              <p>
                Num canto do hotel dá pra ler o diário do Oshiro. A última anotação parece ser de décadas atrás: o hotel ia fechar, uma tal Charlotte organizou uma caminhada de despedida montanha acima com os funcionários, e ele pensou em ficar mais uma noite.
              </p>
            </Text>
            <Dialogue lines={[{ who: "O diário", pt: "Talvez eu fique uma última noite, para eu, e o hotel, nos despedirmos direito...", en: "Perhaps I'll stay one last night, so that the hotel and I can have a proper goodbye...", n: "CH3_DIARY" }]} />
            <Text>
              <p>
                Na suíte presidencial, o Oshiro implora pra Madeline ficar. Aí a outra Madeline, que o jogo chama de Parte de Mim (e todo mundo chama de Badeline), sai do espelho, humilha o hotel e abre um buraco no teto.
              </p>
            </Text>
            <Dialogue
              lines={[
                { who: PART, pt: "Madeline, querida, esquece esse fracassado.", en: "Madeline, sweetie, forget this loser.", n: "CH3_OSHIRO_SUITE" },
                { who: PART, pt: "O que seria de você sem mim?", en: "Where would you be without me?" },
              ]}
            />
            <Text>
              <p>No telhado, o Oshiro alcança as duas. A Parte de Mim diz que a Madeline só ajuda os outros pra alimentar o próprio ego, e fecha com a palavra que a voz interior do Oshiro vinha repetindo.</p>
            </Text>
            <Dialogue
              lines={[
                { who: PART, pt: "Vocês são patéticos.", en: "You're both pathetic.", n: "CH3_OSHIRO_START_CHASE" },
                { who: "Oshiro", pt: "Patéticos!?", en: "Pathetic!?" },
              ]}
            />
            <Text>
              <p>Ele se transforma e persegue a Madeline pelo telhado até derrubar tudo. Lá embaixo, já calmo, ele anuncia que vai fechar o hotel pra reformas, por causa do encanamento, da biblioteca e do buraco no teto da suíte. Dá as costas, para, e volta só pra dizer:</p>
            </Text>
            <Dialogue lines={[{ who: "Oshiro", pt: "Por favor, só me deixe em paz.", en: "Please, just leave me alone.", n: "CH3_ENDING" }]} />
          </div>
        ),
      },
      {
        id: "o-que-quer-dizer",
        title: "O que quer dizer",
        body: (
          <div className="space-y-8">
            <Reading seal="devs" title="A poeira é a ansiedade dele">
              <p>
                Na live de comentário, os devs dizem que as bolas de poeira representam a ansiedade do Oshiro, e que elas andarem em ciclos é a metáfora de tentar ajudar alguém ansioso: você tem que se encaixar no tempo do outro. No jogo, quando ele desmorona sozinho, a poeira sai de dentro dele.
              </p>
            </Reading>
            <Reading seal="jogo" title="A bagunça são os problemas">
              <p>O próprio Oshiro faz a ligação, pensando: “Como é que eu deixei meus problemas se amontoarem assim?”. E quanto mais a Madeline limpa, pior fica a conversa entre os dois.</p>
            </Reading>
            <Reading seal="fas" title="Um fantasma que não largou o hotel">
              <p>
                A leitura mais espalhada é a de que o Oshiro morreu e ficou preso ao hotel, negando que ele fechou. O capítulo nunca diz isso: ele responde “Não seja boba”, e o resto são pistas, como o diário de décadas atrás. No código do jogo, o Oshiro que persegue a Madeline no telhado se chama “friendlyGhost”, fantasma amigável.
              </p>
            </Reading>
            <Reading seal="fas" title="A Parte de Mim dele">
              <p>Os pensamentos do Oshiro falam com ele mesmo do jeito que a Parte de Mim fala com a Madeline. Muita gente lê o capítulo como duas pessoas com a mesma voz por dentro, lado a lado. Quem fez o jogo não disse isso.</p>
            </Reading>
            <Reading seal="jogo" title="Ajudar e ser ajudado">
              <p>A Madeline insiste em ajudar, contra o Theo e contra a própria pressa. O Oshiro não aceita: diz que os funcionários tinham tudo sob controle, se envergonha de precisar e, no fim, pede pra ficar sozinho.</p>
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
                { label: "Salas", value: "65", note: "o capítulo 2 tem 45" },
                { label: "Bolas de poeira", value: "1.983", note: "contando as que andam e giram" },
                { label: "Chaves", value: "5", note: "as primeiras do jogo" },
                { label: "Recargas de dash", value: "37", note: "no capítulo 1 são 13" },
              ]}
            />
            <Facts
              items={[
                {
                  title: "O Oshiro não existia",
                  children: (
                    <p>
                      O hotel ficou muito tempo sem história. O plano era um chefe no meio do resort, um espírito raivoso que guardava o hotel e que você enfrentaria várias vezes. Os devs contam que ficaram travados no capítulo até uma noite em que a Maddy Thorson e o Noel Berry sentaram e chegaram na ideia da faxina. Até lá, todo personagem era um retângulo vermelho, e a suíte ficou vazia de propósito, esperando o dono.
                    </p>
                  ),
                  source: commentary("41:23"),
                },
                {
                  title: "A poeira tomou o lugar de outra ideia",
                  children: (
                    <p>
                      Nas primeiras versões, os obstáculos do hotel só deixavam a Madeline passar se o cabelo dela estivesse azul, ou seja, sem dash. Ia ser a marca do capítulo, mas era rígido demais, com um jeito só de passar. Quando o Oshiro virou o centro do hotel, a poeira encaixou melhor. Depois trocaram até os espinhos por poeira, porque não fazia sentido ter espinho num hotel.
                    </p>
                  ),
                  source: commentary("30:58"),
                },
                {
                  title: "Antes, você escalava o Oshiro",
                  children: <p>Na primeira versão da perseguição, a Madeline se agarrava no Oshiro e usava o corpo dele pra atravessar as salas enquanto ele tentava machucá-la. Os devs acharam que funcionava como metáfora, mas nunca ficou divertido. Essas salas foram cortadas inteiras.</p>,
                  source: commentary("1:09:23"),
                },
                {
                  title: "O mapa é uma planta",
                  children: <p>Os nomes das salas seguem a planta do prédio: coluna e andar, com térreo, três andares, três subsolos e o telhado. O lobby é a coluna 0, térreo. A suíte fica no último andar, bem em cima da entrada.</p>,
                  source: { label: "No próprio jogo: o mapa do capítulo" },
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
                title: "A Charlotte aparece uma vez",
                children: <p>O nome dela está numa frase só do diário, e em nenhum outro lugar do jogo.</p>,
              },
              {
                title: "Erros que ficaram no código",
                children: <p>O Oshiro da Grande Bagunça se chama “NPC03_Oshiro_Cluttter”, com três T. O relógio de pêndulo é “granfather_clock” e a caldeira é “boilder”. E a suíte presidencial, no código, ainda é a “master suite” do nome de trabalho.</p>,
              },
              {
                title: "O Oshiro ensina tradução",
                children: <p>No arquivo de falas, um ponto faz o texto pausar. O exemplo que o jogo dá pros tradutores, na terceira linha do arquivo, é ele: “Mr. Oshiro” pausa, “Mr\. Oshiro” não.</p>,
              },
              {
                title: "Os feixes de luz",
                children: <p>O capítulo tem só dois feixes de luz, e os dois apontam pra alguma coisa fora do caminho. Um ilumina o canto do diário.</p>,
              },
            ]}
          />
        ),
      },
      {
        id: "musica",
        title: "A música",
        description: "No álbum, “Checking In” e o tema do Oshiro, “Spirit of Hospitality”, de Lena Raine.",
        body: (
          <div className="space-y-8">
            <Facts
              items={[
                {
                  title: "O primeiro capítulo com a cara da Lena",
                  children: <p>Quando a Lena Raine entrou no projeto, a música do Prólogo e dos dois primeiros capítulos já tinha sido começada pela Maddy. Ela conta que o hotel foi onde mais decidiu como a música reage a quem joga.</p>,
                  source: lenaBandcamp,
                },
                {
                  title: "Cada porta destrancada solta um instrumento",
                  children: <p>A música de explorar o hotel tem cinco trilhas: ambiente, baixo, melodia, percussão e uma chamada “oshiro”. Duas das cinco fechaduras fazem a música avançar quando você abre. Os devs dizem que nenhum capítulo faz isso do mesmo jeito.</p>,
                  source: commentary("1:58:45"),
                },
                {
                  title: "O Oshiro tem tema próprio",
                  children: <p>“Spirit of Hospitality” toca sempre que ele está em cena falando. O instrumento dele é um sintetizador que lembra um teremim.</p>,
                  source: lena,
                },
                {
                  title: "48 janelas quebradas",
                  children: <p>Espalhadas por 32 salas, cada uma com o próprio assobio de vento, umas grandes e outras pequenas. No porão, o som ambiente muda aos poucos conforme você desce.</p>,
                  source: inMusic,
                },
                {
                  title: "Uma faixa que sumiu",
                  children: <p>O código do jogo chama uma versão estendida da música da faxina, que não existe nos arquivos de som. Sobrou só o nome.</p>,
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
        needs: "3/heart",
        description: "Acima da lavanderia, atrás de um teto falso.",
        body: (
          <div className="space-y-6">
            <Text>
              <p>Na sala em que o Theo arranca a grade do duto, parte do teto é falsa, e o segundo feixe de luz do capítulo aponta bem pra ela. Lá em cima, o coração fica cercado de bolas de poeira que andam em trilhos.</p>
            </Text>
            <Dialogue lines={[{ who: "O poema do coração", pt: "Espalhados e perdidos", en: "Scattered and lost", n: "POEM_CR" }]} />
          </div>
        ),
      },
      {
        id: "fita",
        title: "A fita",
        needs: "3/cassette",
        description: "Num andar de cima, perto da entrada do hotel.",
        body: (
          <Text>
            <p>A fita fica num andar de cima, perto da entrada, numa sala com blocos que alternam no ritmo da música. Ela abre o lado B do capítulo.</p>
          </Text>
        ),
      },
      {
        id: "celeste-classic",
        title: "O Celeste original",
        needs: "steam/PICO8",
        description: "O jogo de quatro dias que deu origem a tudo, jogável dentro do hotel.",
        body: (
          <Text>
            <p>
              Na sala do memorando, entrada da lavanderia, uma parede falsa à direita esconde um fliperama. Ele liga o Celeste Classic, o primeiro Celeste, feito em quatro dias pro PICO-8. Depois de achar, ele fica no menu principal. Dentro do jogo ele foi refeito em C#, com música própria.
            </p>
          </Text>
        ),
      },
    ],
  }
}
