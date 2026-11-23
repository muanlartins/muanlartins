import { commentary, lena } from "@/components/site/celeste/historia/fontes"
import { Dialogue, Facts, Reading } from "@/components/site/celeste/historia/parts"
import type { Story } from "@/components/site/celeste/historia/story"
import { Picture, Text } from "@/components/site/celeste/tecnicas/parts"
import { storyPicture } from "@/lib/celeste-demos"

/**
 * Chapter 1, Forsaken City, from the research of 2026-11-23
 * (~/.local/share/muanlartins/celeste-lore/capitulo-0-1/capitulo-1.md): the lines are the game's (CH1_THEO_A–F,
 * MEMORIAL, CH1_END), the rooms, decals and music layers 1-ForsakenCity.bin's, the unused art the Gameplay atlas's,
 * the making-of the developers' commentary stream. The heart's section waits for his save to have it, the cassette's
 * too.
 */

const still = (name: string) => storyPicture("cidade-abandonada", name)

export function cidadeAbandonada(): Story {
  return {
    lede: "Uma cidade construída pra ninguém morar, o primeiro encontro com o Theo e um memorial pra quem não chegou ao topo.",
    sections: [
      {
        id: "historia",
        title: "A história",
        body: (
          <div className="space-y-8">
            <Text>
              <p>
                Antes de entrar, o jogo mostra um cartão-postal com o primeiro conselho dele: dá pra parar quando quiser, no menu de pausa, sem perder nada. Depois vem a cidade. Placa de obra na entrada, colunas de concreto quebradas, cartazes rasgados, semáforos no teto. Ela nunca foi terminada.
              </p>
              <p>No meio do caminho, numa sala que dá pra pular, tem uma fogueira acesa e um rapaz de Seattle tirando foto. É o Theo, e a conversa sai em pedaços, uma parte cada vez que a Madeline fala com ele.</p>
            </Text>
            <Dialogue
              lines={[
                { who: "Theo", pt: "E aí, companheira viajante!", en: "Ho there, fellow traveller!", n: "CH1_THEO_A" },
                { who: "Madeline", pt: "Não é uma subida muito fácil, né? Mas acho que era isso que eu estava procurando...", en: "Not the easiest climb, is it? But I guess that's what I was looking for..." },
                { who: "Theo", pt: "Do tipo loba solitária, tudo bem. Vou imaginar um passado sombrio pra você.", en: "Mysterious lone wolf type, I get it. I'll just imagine some dark backstory for you." },
                { who: "Madeline", pt: "Ei, desculpa. Meu nome é Madeline. Eu estou com a cabeça cheia.", en: "Hey, sorry. I'm Madeline. I've got a lot on my mind.", n: "CH1_THEO_B" },
              ]}
            />
            <Text>
              <p>Ele pergunta por que alguém abandonaria uma cidade inteira. Ela leu que uma megacorporação começou a obra e ninguém quis morar ali.</p>
            </Text>
            <Dialogue
              lines={[
                { who: "Theo", pt: "Aposto que é o governo encobrindo algo!", en: "My money's on a government cover-up.", n: "CH1_THEO_C" },
                { who: "Madeline", pt: "Que desperdício, construir tudo isso pra nada...", en: "What a waste, to build all of this for no reason..." },
              ]}
            />
            <Picture src={still("fogueira.webp")} alt="O Theo na fogueira, entre a barraca e um avião quebrado, e a Madeline chegando pela direita" width={1280} height={720} pixel />
            <Text>
              <p>
                O Theo se apresenta como fotógrafo “em desenvolvimento” e manda procurar o perfil dele no InstaPix. A Madeline conta que vai pro cume. Ele não liga pro topo, quer ver umas ruínas “reais oficiais de 1800” que ouviu dizer que ficam além da cidade, e se despede gritando “VIDA LOKA”.
              </p>
              <p>No alto da cidade, a primeira coisa que ela encontra é uma pedra com uma inscrição, ao lado de uma fogueira apagada:</p>
            </Text>
            <Dialogue lines={[{ who: "O memorial", pt: "Montanha Celeste. Este memorial é dedicado àqueles que pereceram na escalada.", en: "Celeste Mountain. This memorial dedicated to those who perished on the climb.", n: "MEMORIAL" }]} />
            <Picture src={still("memorial.webp")} alt="A Madeline diante do memorial, com a inscrição em português" width={1280} height={720} pixel />
            <Text>
              <p>Ela senta pra descansar, um passarinho pousa na cabeça dela e dorme ali. O capítulo termina assim:</p>
            </Text>
            <Dialogue
              lines={[
                { who: "Madeline", pt: "Ugh, estou exausta.", en: "Ugh, I'm exhausted.", n: "CH1_END" },
                { who: "Madeline", pt: "Acho que isso foi um erro.", en: "This might have been a mistake." },
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
            <Reading seal="devs" title="Sozinha numa cidade">
              <p>
                Na live de comentário, perguntaram por que a primeira fase é uma cidade velha e deserta. A resposta: a Madeline se sente isolada da sociedade e se isola dela também, e estar numa cidade e se sentir sozinha era o certo pra ela naquele momento da vida.
              </p>
            </Reading>
            <Reading seal="jogo" title="Tudo isso pra nada">
              <p>A cidade foi construída por uma empresa e ninguém quis morar nela. A Madeline chama de desperdício. Dos dois que passam por ali, só ela quer o topo: o Theo veio pelas ruínas.</p>
            </Reading>
            <Reading seal="minha" title="Os outdoors">
              <p>
                Os outdoors no fundo da cidade vendem corpo de praia, energético “de macho”, relógio que “é um símbolo” e “carro de verdade”. Numa cidade feita pra ninguém, sobrou a propaganda. Eu leio como a pressão de ser alguém, gritando pra uma cidade vazia. Não achei quem fez o jogo falando disso.
              </p>
            </Reading>
            <Reading seal="fas" title="A fogueira apagada">
              <p>A fogueira do Theo está acesa, e a do memorial está apagada. Muita gente lê o fim do capítulo como o primeiro aviso de que a montanha mata, e a Madeline chega nele sozinha e cansada.</p>
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
                title: "O semáforo veio de um enfeite",
                children: (
                  <p>
                    Os blocos que correm num trilho andavam sozinhos, num ciclo. A Maddy concluiu que tudo que demora tanto pra acontecer tem que ser começado pelo jogador, e eles passaram a partir só quando a Madeline pisa. A luz de semáforo veio depois: o Pedro Medeiros estava desenhando semáforos de cenário pra cidade, e a equipe gostou tanto que botou nos blocos.
                  </p>
                ),
                source: commentary("6:20"),
              },
              {
                title: "Testado até o fim",
                children: (
                  <p>
                    O capítulo 1 foi testado com jogadores até perto do lançamento. Os devs contam que, num jogo difícil, o instinto é deixar todas as janelas apertadas, e que com o tempo foram achando outros jeitos de dar dificuldade sem castigar tanto. Outra regra veio dos testes: onde não tem caminho, a borda da tela é parede, porque as pessoas tentavam ir pra onde tinha vazio.
                  </p>
                ),
                source: commentary("13:20"),
              },
              {
                title: "O Theo ia ser opcional o jogo todo",
                children: <p>Conforme a Madeline foi ficando mais sombria durante a criação, a equipe quis alguém alegre pra contrastar com ela, e com quem você conversa só se quiser. No capítulo 1 ele continua assim: dá pra terminar sem nunca ter visto o Theo.</p>,
                source: commentary("37:00"),
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
                title: "Os outdoors da cidade",
                children: <p>São seis, desenhados num verde apagado no fundo das salas escuras: “ARE YOU BEACH READY?”, “MAN UP! ENERGY DRINK”, “IT’S NOT JUST A WATCH, IT’S A SYMBOL”, “NOW THIS IS A REAL CAR”, “SALE SALE SALE” e um que diz “Bubbles”, com um mascote no meio das bolhas.</p>,
                media: <Picture src={still("outdoor.webp")} alt="Um dos outdoors no fundo da cidade" width={1280} height={720} pixel />,
                source: { label: "No próprio jogo: os desenhos big_sign, em seis salas do capítulo" },
              },
              {
                title: "Um café brasileiro",
                children: (
                  <p>
                    Uma das casas do fundo, na sala logo depois do checkpoint Travessia, se chama “brazilian_coffee_building” nos arquivos do jogo. Na terceira sala tem uma placa de estacionamento com um “E” num círculo vermelho, o padrão brasileiro. E a arte do jogo guarda uma placa de “Brazilian Coffee”, com uma caneca roxa, que nenhuma fase usa. Dois dos artistas de Celeste são brasileiros. Se é homenagem deles, ninguém disse.
                  </p>
                ),
                media: <Picture src={still("cafe.webp")} alt="A casa do café brasileiro, no fundo da cidade" width={1280} height={720} pixel />,
                source: { label: "No próprio jogo: os desenhos e o mapa do capítulo" },
              },
              {
                title: "A pizzaria que não entrou",
                children: <p>A arte da cidade tem peças que não aparecem em lugar nenhum: a placa e o prédio de uma pizzaria chamada Royal Pizza, um carro amarelo, uma estátua, uma poltrona, uma casa inacabada e uma placa que manda dar dash pra cima duas vezes.</p>,
              },
              {
                title: "O memorial está sem verbo",
                children: <p>Em inglês, a pedra diz “This memorial dedicated to those who perished on the climb”, sem o “is”. A tradução brasileira corrigiu: “Este memorial é dedicado àqueles que pereceram na escalada”.</p>,
              },
              {
                title: "Cada país grita uma coisa",
                children: <p>O “YOLO” do Theo foi trocado em quase todas as línguas. Aqui ele grita “VIDA LOKA”. Em italiano é “ANDIAMO”, em espanhol “YUJU”, e no japonês ele grita que a foto vai bombar.</p>,
              },
            ]}
          />
        ),
      },
      {
        id: "musica",
        title: "A música",
        description: "No álbum, a faixa do capítulo é “First Steps”, de Lena Raine.",
        body: (
          <Facts
            items={[
              {
                title: "O tema da Madeline começa aqui",
                children: <p>“First Steps” é a primeira vez que o tema da Madeline aparece, e a Lena Raine descreve essa versão como alegre, acima de tudo. No jogo, a faixa são três trilhas tocando juntas: piano, sintetizadores e percussão.</p>,
                source: lena,
              },
              {
                title: "A bateria some quando você sai do caminho",
                children: <p>Na maioria das salas fora do caminho principal, uma das três trilhas fica desligada. É de propósito: sem a percussão, os devs contam, você perde a sensação de que está avançando.</p>,
                source: commentary("1:58:20"),
              },
              {
                title: "O violão é do Theo",
                children: <p>Na fogueira dele, a música troca. Cada personagem tem um instrumento: a Madeline tem o piano, e o Theo, o violão.</p>,
                source: lena,
              },
            ]}
          />
        ),
      },
      {
        id: "coracao",
        title: "O coração",
        needs: "1/heart",
        description: "Uma senha em cores, escondida numa sala secreta do trecho Travessia.",
        body: (
          <div className="space-y-6">
            <Text>
              <p>
                O coração de cristal fica numa sala com uma antena parabólica e um computador. Um bando de passarinhos e a tela piscam a mesma sequência de cores, e cada cor é uma direção de dash: cima, esquerda, baixo e direita, cima e direita, esquerda, cima e esquerda. Acertando a sequência, os passarinhos se juntam e viram o coração.
              </p>
              <p>Cada coração vem com um poema de uma linha. O desse se chama “Máquinas sem sentido”, numa cidade que foi construída pra nada.</p>
            </Text>
            <Dialogue lines={[{ who: "O poema do coração", pt: "Máquinas sem sentido", en: "Pointless machines", n: "POEM_FC" }]} />
          </div>
        ),
      },
      {
        id: "fita",
        title: "A fita",
        needs: "1/cassette",
        description: "A fita do capítulo, que abre o lado B.",
        body: (
          <Text>
            <p>
              A fita fica numa sala ao lado, no trecho Abismo, com blocos que somem e aparecem no ritmo da música. Ela chegou tarde no desenvolvimento: antes, juntar notas musicais espalhadas é que formava a fita. A escolha de uma fita cassete, os devs explicam, era porque mixtape combinava com o clima do jogo.
            </p>
          </Text>
        ),
      },
    ],
  }
}
