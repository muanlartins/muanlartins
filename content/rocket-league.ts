import { rlr } from "@/content/rlr"
import { roadmap } from "@/lib/roadmap"

/**
 * Each topic sits under the pillar and concept it belongs to, with the rank
 * where it starts to matter; the page sorts it into that rank. One concept
 * can have a topic at every rank, each one level deeper. A rank with no
 * topics shows "coming soon".
 */
/** The in-game emblems of a rank's three divisions (public/ranks). */
const divisions = (rank: string) => [1, 2, 3].map((division) => `/ranks/${rank}-${division}.webp`)

export default roadmap({
  id: "rocket-league",
  title: { pt: "Fundamentos do Rocket League", en: "Rocket League Fundamentals" },
  description: {
    pt: "Um roteiro para evoluir no jogo.",
    en: "A roadmap for improving at the game.",
  },
  language: "pt",
  video: "DaY857Usc80",
  tools: [rlr],
  ranks: [
    {
      id: "unranked",
      name: { pt: "Unranked", en: "Unranked" },
      color: "#5f6675",
      icons: ["/ranks/unranked.webp"],
      paint: { color: "#4e535c", metal: false },
    },
    {
      id: "bronze",
      name: { pt: "Bronze", en: "Bronze" },
      color: "#a8683a",
      icons: divisions("bronze"),
      summary: { pt: "Primeiros passos", en: "TODO: what this rank is about." },
    },
    {
      id: "silver",
      name: { pt: "Prata", en: "Silver" },
      color: "#7d8799",
      icons: divisions("silver"),
      paint: { color: "#c9cdd4" },
    },
    { id: "gold", name: { pt: "Ouro", en: "Gold" }, color: "#c39a1c", icons: divisions("gold") },
    { id: "platinum", name: { pt: "Platina", en: "Platinum" }, color: "#3aa7b5", icons: divisions("platinum") },
    { id: "diamond", name: { pt: "Diamante", en: "Diamond" }, color: "#3d6fe0", icons: divisions("diamond") },
    { id: "champion", name: { pt: "Campeão", en: "Champion" }, color: "#8a4bd1", icons: divisions("champion") },
    {
      id: "grand-champion",
      name: { pt: "Grande Campeão", en: "Grand Champion" },
      color: "#c8304a",
      icons: divisions("grand-champion"),
    },
    {
      id: "supersonic-legend",
      name: { pt: "Lenda Supersônica", en: "Supersonic Legend" },
      color: "#4b4f5c",
      icons: ["/ranks/supersonic-legend.webp"],
    },
  ],
  pillars: [
    {
      id: "mechanics",
      name: { pt: "Mecânica", en: "Mechanics" },
      concepts: [
        {
          id: "controls",
          name: { pt: "Controles", en: "Controls" },
          topics: [
            {
              id: "inputs",
              rank: "unranked",
              title: { pt: "Inputs do jogo", en: "The game's inputs" },
              video: "CqVSrP8xpWY",
              text: `Todo comando pode ser testado no jogo livre (Treino › Jogo livre), e a lista completa fica em Configurações › Controles. Estes são os que importam agora.

Acelerar e frear. O freio também é a marcha ré. O impulso (boost) dá muito mais velocidade e força, e ganha da ré: segurando os dois, o carro vai para a frente.

Direção. O analógico esquerdo vira o carro para os lados. No ar, ele também inclina o carro para cima e para baixo.

Pulo. Segurar o botão dá um pulo mais alto; soltar rápido, um mais baixo. Depois de qualquer um deles dá para pular de novo, mas só por pouco mais de um segundo depois do primeiro pulo.

Drift. Uma derrapada para virar rápido. Não faz uma curva em U perfeita, então leva um tempo para se acostumar, e com impulso a curva fica ainda mais fechada. Com pouco espaço, também dá para pular, girar o carro 180° e seguir andando. Mais à frente vem o half flip, que faz isso melhor.

Câmera. O analógico direito olha em volta, e apertá-lo mostra a visão traseira, para andar de ré vendo o campo. Um botão alterna entre a câmera normal e a câmera da bola (ball cam), assunto do próximo tópico.

Rolamento aéreo (air roll). No ar, virar para os lados gira o carro como no chão. Segurando o botão do drift, ou o de rolamento aéreo se você configurou um, ele passa a rolar no próprio eixo. Serve para ajeitar o carro antes de bater na bola, com a quina, por exemplo, e para girar enquanto voa.`,
            },
          ],
        },
        {
          id: "settings",
          name: { pt: "Configurações", en: "Settings" },
          topics: [
            {
              id: "camera",
              rank: "unranked",
              title: { pt: "Cam / Ball Cam", en: "Camera / Ball cam" },
              video: "PNP61KM7qzQ",
              text: `A câmera normal e a câmera da bola (ball cam) servem para coisas diferentes, e vale se acostumar com as duas.

Sem a ball cam, a câmera fica atrás do carro, olhando para onde ele vai. Isso dá melhor noção de onde o carro está em relação à bola, e evita a tontura de ver tudo girar quando você passa perto dela. Também fica mais fácil acompanhar a sombra da bola, que mostra onde ela vai cair, e levar a bola no capô.

Com a ball cam, a câmera aponta sempre para a bola, e você nunca a perde de vista. Na parede, sem ela, a câmera fica torta e você se perde rápido. Defendendo de costas para a bola, só ela mostra onde a bola está.

Não é uma escolha estética: cada uma ajuda em umas jogadas e atrapalha em outras. O caminho é saber usar as duas e trocar conforme a situação.`,
            },
            { id: "deadzone", rank: "silver", title: { pt: "Deadzone e sensibilidade", en: "Deadzone and sensitivity" } },
          ],
        },
        {
          id: "driving",
          name: { pt: "Direção", en: "Driving" },
          topics: [
            {
              id: "turning",
              rank: "bronze",
              title: { pt: "Curvas e drift", en: "Turning and drifting" },
              video: "KKEysfqVmJc",
              text: `Virar só com a direção funciona, mas dar meia-volta assim demora, e o 180 é uma das coisas que você mais vai fazer no jogo.

A solução é o drift (Derrapar, ou power slide em inglês), em Configurações › Controles. Apertado sozinho, ele não faz nada; segurado durante uma curva, o carro derrapa e vira de uma vez. Dá para fazer o 180 completo, ou ficar girando no lugar.

Usar o impulso (boost) na derrapada ajuda a sair mais rápido na nova direção, e segurá-lo a derrapada inteira deixa a curva mais aberta.

Segurar o drift por muito tempo tem um preço: o carro demora a se estabilizar e perde a velocidade que tinha. Toques curtos no botão durante a curva a fecham sem tirar sua velocidade.

Mais adiante, com a bola junto do carro, essas curvas fechadas, com o freio, viram o drible do jogo: balançar a bola de um lado para o outro até passar pelo defensor. Por enquanto, o objetivo é ficar à vontade com o drift e virar mais rápido.`,
            },
            {
              id: "supersonic",
              rank: "bronze",
              title: { pt: "Supersônico", en: "Supersonic" },
              video: "70X-CuagXyU",
              text: `Segurando o impulso (boost) por tempo suficiente, aparece um rastro embaixo das rodas: é o supersônico, o sinal de que o carro chegou praticamente à velocidade máxima do jogo.

As duas formas principais de acelerar são o boost e os flips, o segundo pulo feito com uma direção, quase sempre para a frente. Com espaço, o flip acelera sem gastar boost, mas obriga o carro a dar a cambalhota. Para um ajuste fino de velocidade, use o boost.

O que tira você do supersônico são as curvas. Em linha reta, o rastro continua; numa curva forte, o pneu chia como num drift mais leve e o rastro some. Numa curva suave, quase nada se perde: quanto menos você vira, menos atrito, como em jogos de corrida tipo Trackmania.

Como é o limite, uma bola mais rápida que o supersônico não tem como ser alcançada. E, já nele, não é preciso gastar boost: toques curtos no botão bastam para mantê-lo.

O ideal é se mover pelo campo perto dessa velocidade, para estar presente em todo lugar, mas sem andar sem intenção. Posicionamento vem mais à frente, na parte de estratégia.`,
            },
            { id: "walls", rank: "silver", title: { pt: "Paredes", en: "Walls" } },
            { id: "momentum", rank: "gold", title: { pt: "Mantendo a velocidade", en: "Keeping your speed" } },
          ],
        },
        {
          id: "jumps",
          name: { pt: "Pulos e flips", en: "Jumps and flips" },
          topics: [
            {
              id: "jump",
              rank: "bronze",
              title: { pt: "Pulo e pulo duplo", en: "Jump and double jump" },
              video: "HGojw1M5xkc",
              text: `Como visto nos inputs, o pulo sobe mais quanto mais tempo você segura o botão, e depois dele dá para pular de novo no ar: o pulo duplo. Com uma direção no analógico, esse segundo pulo vira um flip, assunto do próximo tópico.

O segundo pulo tem prazo: cerca de 1,25 segundo depois de um pulo curto, e 1,45 segundo segurando o pulo até o alto. Ninguém conta segundos no jogo; o que importa é pegar a sensação. Pulando da parede, por exemplo, ele só sai se você não demorar.

Sem pular, não há prazo. Caindo do teto sem pular, ou jogado longe por uma trombada, o carro guarda um pulo no ar pelo tempo que precisar.

O segundo pulo é mais fraco, mas empurra o carro para onde o teto dele aponta. De cabeça para baixo, ele empurra para o chão: dá para descer do teto mais rápido.

Por último, encostar as quatro rodas em qualquer coisa conta como estar no chão e devolve o pulo. Na bola, isso se chama flip reset, e um barulho de câmera fotográfica avisa que deu certo. Os melhores jogadores usam esse pulo extra em jogadas difíceis no ar; por agora, basta saber que existe.`,
            },
            {
              id: "flips",
              rank: "bronze",
              title: { pt: "Tipos de flip", en: "Types of flip" },
              video: "h8Ex7C1UzfU",
              text: `O flip é o segundo pulo feito com uma direção: uma cambalhota para a frente, para trás, para os lados ou nas diagonais. Depois do impulso (boost), é provavelmente a mecânica mais usada do jogo.

Ele serve para se mover, ganhando velocidade, e para bater na bola: em vez de só pular nela, um flip perto dela dá mais força. Na diagonal, ele bate com a quina do carro; de lado, serve para um passe lateral.

Em volta do flip existe toda uma família de mecânicas. O half flip dá meia-volta mantendo a velocidade, bom quando você está de ré e rápido. O speed flip é um flip na diagonal que mantém a traseira do carro virada para trás, para o boost continuar empurrando: num flip comum com boost, o carro gira e o boost empurra para todo lado.

Há flips quase cosméticos e outros surpreendentemente fortes, como o musty flick, que bate na bola com o capô numa cambalhota invertida. Como no skate, cada manobra tem nome, e os jogadores combinam várias numa mesma jogada até o gol. Os flicks com a bola no capô são outro exemplo: um pulo para um lado e um flip na diagonal para o outro lançam a bola.

Por agora, basta saber o quanto essa mecânica é rica, e usá-la muito.`,
            },
            { id: "flip-cancel", rank: "silver", title: { pt: "Flip cancel", en: "Flip cancel" } },
            { id: "half-flip", rank: "gold", title: { pt: "Half flip", en: "Half flip" } },
          ],
        },
        {
          id: "recovery",
          name: { pt: "Aterrissagem e recuperação", en: "Landing and recovery" },
          topics: [
            {
              id: "landing",
              rank: "bronze",
              title: { pt: "Caindo sobre as rodas", en: "Landing on your wheels" },
              video: "zgCakk4rHNE",
              text: `Uma das coisas mais comuns no começo: subir na parede ou no teto e cair de cara no chão, torto, quicando, com aquele barulho de arranhão. Também acontece depois de um pulo mal feito ou de uma disputa, porque a bola é pesada e entorta o carro.

O jogo tem um conceito inteiro para isso, aterrissagem e recuperação. Quando você começar a voar, não vai poder cair torto depois de uma jogada e perder a velocidade, porque vai precisar voltar para defender. Por agora, a ideia é simples: caindo sobre as quatro rodas, o carro se estabiliza e mantém a velocidade e a direção que já tinha.

No ar, a direção ajusta o bico do carro para cima, para baixo e para os lados. Depois de bater na bola, basta abaixar um pouco o bico para cair nas quatro rodas, não só nas de trás ou nas da frente.

Caindo da parede de lado, é preciso girar o carro no próprio eixo, com o rolamento aéreo (air roll). Confira em Configurações › Controles em que botão ele está. Para treinar, saia da parede e gire para o lado contrário até cair reto; depois, saia do teto e gire 180° para seguir em frente. Sem ajuste, o carro cai torto, rodopia e perde a velocidade; com ajuste, segue no mesmo embalo.

Somado aos flips, cair bem é o que mantém o controle da sua velocidade, depois de um flip, da parede ou de qualquer coisa.`,
            },
            { id: "wall-recovery", rank: "silver", title: { pt: "Saindo da parede", en: "Coming off the wall" } },
            { id: "aerial-recovery", rank: "gold", title: { pt: "Recuperando depois do aéreo", en: "Recovering after an aerial" } },
          ],
        },
        {
          id: "aerials",
          name: { pt: "Jogo aéreo", en: "Aerials" },
          topics: [
            { id: "low-aerial", rank: "silver", title: { pt: "Aéreo baixo", en: "Low aerials" } },
            { id: "high-aerial", rank: "gold", title: { pt: "Aéreo alto", en: "High aerials" } },
            { id: "aerial-touch", rank: "gold", title: { pt: "Direcionando o toque no ar", en: "Aiming your touch in the air" } },
          ],
        },
        {
          id: "shooting",
          name: { pt: "Chute", en: "Shooting" },
          topics: [
            {
              id: "contact",
              rank: "unranked",
              title: { pt: "Acertando a bola", en: "Hitting the ball" },
              video: "AxYFpTHxbCI",
              text: `Para a física do jogo, seu carro é uma caixa, a caixa de colisão. O jogo livre pode mostrá-la (Mostrar caixa de colisão do veículo). O formato do carro é só aparência.

Como a caixa é baixa, ela costuma bater abaixo do centro da bola, e a bola sobe, como numa cavadinha. É assim que se põe a bola no capô: um toque e uma acelerada para ficar embaixo dela.

Para a bola ir reta, bata no centro dela, como um taco de sinuca. Dê um pulinho logo antes do toque: o momento e a altura do pulo mudam o efeito.

A direção vem do ângulo da batida. Antes de chutar, ponha o carro na linha entre a bola e o gol, do lado oposto ao gol. Chegando pelo lado errado, a bola vai parar no canto. Ninguém domina isso rápido; o que importa é bater com intenção.

Para treinar, além das partidas, o Treinamento personalizado tem pacotes em destaque, um para cada rank. O de Bronze tem chutes simples que só entram se você ajustar o carro com freio, aceleração e impulso e acertar a direção: acelerar demais sobe a bola, e o carro passa por ela. Depois, invente desafios: chutar de mais perto, chutar com drift, defender a mesma bola.`,
            },
            {
              id: "shooting",
              rank: "bronze",
              title: { pt: "Chutando no gol", en: "Shooting at goal" },
              video: "_1jLJt251M0",
              text: `Chutar no gol de qualquer lugar, a qualquer velocidade e em qualquer situação leva muito tempo. O começo é chutar com intenção.

Se a bola está devagar e ninguém está por perto, não bata nela de onde estiver: dê a volta, ponha o carro na linha entre a bola e o gol e chute com um pulinho logo antes do toque, como em Acertando a bola.

Agora, com o flip, o chute ganha força e direção. Um flip na diagonal manda a bola para os cantos de baixo; de frente, com o bico do carro, ela sai forte. O drift e o impulso ajudam a ajeitar a bola antes. O objetivo não é acertar tudo, e sim ficar à vontade para ajustar a bola e mandá-la para o gol, não para qualquer lugar.

Para praticar, o Treinamento personalizado tem, nos destaques, os pacotes da Psyonix, um para cada rank. No de Bronze, onde antes bastava um pulinho, use o flip, e pense em para onde quer mandar a bola. Os controles no canto superior esquerdo reiniciam e trocam o chute. Cinco minutos bastam; depois, vá jogar.

Os erros mais comuns são bater com a traseira do carro no fim do flip e fazer o flip para o lado errado. De lado, o chute sai bem mais fraco que de bico. Se estiver se sentindo corajoso, ajuste o carro no ar com o rolamento aéreo, como em Caindo sobre as rodas, para bater com a quina.`,
            },
            { id: "power-shot", rank: "silver", title: { pt: "Chute forte", en: "Power shots" } },
            { id: "aim", rank: "silver", title: { pt: "Mira: cantos e altura", en: "Aim: corners and height" } },
            { id: "wall-shots", rank: "gold", title: { pt: "Chutes da parede", en: "Shots off the wall" } },
            { id: "bouncing", rank: "gold", title: { pt: "Bola quicando", en: "Bouncing balls" } },
            { id: "crossing", rank: "gold", title: { pt: "Cruzamento", en: "Crossing" } },
          ],
        },
        {
          id: "ball-control",
          name: { pt: "Controle de bola", en: "Ball control" },
          topics: [
            {
              id: "pushing",
              rank: "bronze",
              title: { pt: "Conduzindo a bola", en: "Pushing the ball along" },
              video: "mDhbIHsv484",
              text: `Quem começa quer bater na bola com toda a força, e tudo bem: chutar na direção certa obriga o outro time a defender. Mas muitas vezes a melhor opção é conduzir a bola.

Como no futebol, mantenha a bola perto do pé. Com uma pancada forte, você gasta boost para alcançá-la; fraca demais, você fica lento e o adversário chega. Depende do que o outro time está fazendo.

Em geral, o carro fica um pouco de lado, por exemplo à esquerda da bola. Quando alguém vem, você corta para a direita e já se posiciona para cortar de volta. Como o instinto de todo mundo é ir reto na bola, um corte na hora certa deixa o defensor passar direto.

O segredo é saber a velocidade e a direção da bola e onde você está em relação a ela. À direita dela, você só consegue mandá-la para a esquerda, ou não fazer nada. Para mudar de lado, freie, saia de trás dela e passe para o outro lado.

Acelerar com boost, frear, passar à frente da bola, cortar, pular, dar um flip: é assim que se conduz. Levar a bola no capô vem depois e é difícil; por agora, o que vale é brincar com a bola.`,
            },
            { id: "first-touch", rank: "silver", title: { pt: "Amortecendo a bola", en: "Cushioning the ball" } },
            { id: "hood-dribble", rank: "gold", title: { pt: "Carregando a bola no capô", en: "Carrying the ball on your hood" } },
          ],
        },
        {
          id: "kickoff",
          name: { pt: "Kickoff", en: "Kickoff" },
          topics: [
            {
              id: "kickoff",
              rank: "bronze",
              title: { pt: "Logística do kickoff", en: "Kickoff logistics" },
              video: "WeE5CMc3zJs",
              text: `O kickoff é o pontapé inicial: a disputa pela bola no começo da partida e depois de cada gol. No jogo livre, reposicionar a bola recomeça numa das posições de kickoff, para treinar.

A tendência é chutar para a frente, e faz sentido: com a bola no campo deles, é bem mais difícil eles marcarem do que com ela perto do seu gol.

A logística é chegar com velocidade máxima: gaste o boost e faça um ou dois flips em direção à bola. Chegando atrasado, o adversário passa a bola por cima de você e ela para no seu gol. Esperar dentro do gol e deixar o outro fazer o que quiser com a bola também não é boa ideia, porque a posse de bola importa neste jogo. Em geral, você vai bater de frente com o adversário, a menos que ele use técnicas mais avançadas, como o speed flip.

Depois do primeiro toque, aconteça o que acontecer, pegue boost e volte para a sua área. Sai muito gol no kickoff, então fique atento a quem joga com você: se o seu colega vai na bola, venha atrás dele para cobrir.`,
            },
            { id: "speed-kickoff", rank: "silver", title: { pt: "Kickoff rápido", en: "Fast kickoffs" } },
            { id: "kickoff-intent", rank: "gold", title: { pt: "Kickoff com intenção", en: "Kickoffs with intent" } },
          ],
        },
      ],
    },
    {
      id: "strategy",
      name: { pt: "Estratégia", en: "Strategy" },
      concepts: [
        {
          id: "game-reading",
          name: { pt: "Leitura de jogo", en: "Reading the game" },
          topics: [
            {
              id: "attack-defense",
              rank: "bronze",
              title: { pt: "Ataque e defesa", en: "Attack and defense" },
              video: "tSig4cJOXiI",
              text: `Estratégia é a parte do jogo que a maioria ignora. Para mostrar, uso o tabuleiro do RLR (muanlartins.com.br/rlr), que eu fiz: ele lê os replays do jogo, recria a partida com a posição dos carros e da bola, e deixa mover as peças, como no tabuleiro de um general.

Como no futebol, existe posse de bola: ela está com alguém ou com ninguém. Para saber quem ataca e quem defende, olhe para onde os carros apontam. Com a bola no campo do azul, os azuis virados para a frente e os laranjas esperando para defender, o jogo está neutro: o azul vai chutar ou conduzir, e o laranja vai disputar.

Se a disputa espirra a bola para o canto, o jogo vira. O laranja que esperava para defender avança, outro vem na bola, e o azul tenta se recuperar: ataque do laranja, defesa do azul. Se o azul consegue tirar a bola por cima dos laranjas e o campo deles fica vazio, é a vez do ataque azul.

Todo mundo quer chutar a bola, mas é preciso saber se é hora de defender, perto do seu gol, ou de atacar. Uma regra ajuda: a bola traça uma linha no campo. Atrás dela, não dá para defender, só atacar; para defender, você precisa estar entre a bola e o seu gol. A posição dos carros também conta: com os azuis longe e os laranjas perto da bola, ela é do laranja, e o laranja ataca.`,
            },
            { id: "watching-players", rank: "silver", title: { pt: "Observando os jogadores", en: "Watching the players" } },
            { id: "bounce-prediction", rank: "gold", title: { pt: "Previsão básica de bounce", en: "Predicting bounces" } },
          ],
        },
        {
          id: "positioning",
          name: { pt: "Posicionamento", en: "Positioning" },
          topics: [
            { id: "positions", rank: "bronze", title: { pt: "Entendendo as posições", en: "Understanding positions" } },
            { id: "push-and-retreat", rank: "silver", title: { pt: "Avanço e recuo", en: "Pushing up and falling back" } },
            { id: "covering", rank: "gold", title: { pt: "Compensando a posição do time", en: "Covering for your team" } },
          ],
        },
        {
          id: "rotation",
          name: { pt: "Rotação", en: "Rotation" },
          topics: [
            { id: "rotation", rank: "bronze", title: { pt: "Conceito de rotação", en: "What rotation is" } },
            { id: "self-control", rank: "bronze", title: { pt: "Exercendo o auto-controle", en: "Holding back" } },
            { id: "back-post", rank: "silver", title: { pt: "Voltando pelo segundo pau", en: "Rotating back post" } },
            { id: "rotation-styles", rank: "gold", title: { pt: "Rotações agressivas e defensivas", en: "Aggressive and defensive rotations" } },
          ],
        },
        {
          id: "boost",
          name: { pt: "Boost", en: "Boost" },
          topics: [
            { id: "boost-pads", rank: "bronze", title: { pt: "Onde pegar boost", en: "Where to get boost" } },
            { id: "small-pads", rank: "silver", title: { pt: "Fazendo bom uso dos pads", en: "Making good use of the pads" } },
            { id: "big-boost", rank: "gold", title: { pt: "Auto-controle do grande boost", en: "Restraint with big boost" } },
          ],
        },
        {
          id: "challenges",
          name: { pt: "Disputas", en: "Challenges" },
          topics: [
            { id: "dont-jump", rank: "bronze", title: { pt: "Não pule sempre", en: "Don't always jump" } },
            { id: "when-to-go", rank: "silver", title: { pt: "Saber quando ir", en: "Knowing when to go" } },
            { id: "challenge-intent", rank: "gold", title: { pt: "Disputando com intenção", en: "Challenging with intent" } },
          ],
        },
        {
          id: "defense",
          name: { pt: "Defesa", en: "Defense" },
          topics: [
            { id: "own-goals", rank: "bronze", title: { pt: "Evitando gol contra", en: "Avoiding own goals" } },
            { id: "clearing", rank: "silver", title: { pt: "Tirando a bola", en: "Clearing the ball" } },
            { id: "saves", rank: "gold", title: { pt: "Defesas básicas", en: "Basic saves" } },
          ],
        },
        {
          id: "attack",
          name: { pt: "Ataque", en: "Attack" },
          topics: [
            { id: "choosing-attack", rank: "silver", title: { pt: "Escolhendo o ataque", en: "Choosing your attack" } },
            { id: "rebounds", rank: "gold", title: { pt: "Rebotes", en: "Rebounds" } },
          ],
        },
        {
          id: "team",
          name: { pt: "Equipe", en: "Team" },
          topics: [
            { id: "quick-chat", rank: "bronze", title: { pt: "Aprendendo os quick chats", en: "Learning the quick chats" } },
          ],
        },
        {
          id: "demos",
          name: { pt: "Demolições", en: "Demolitions" },
          topics: [
            { id: "demos", rank: "bronze", title: { pt: "Mecânica de demolição", en: "How demolitions work" } },
            { id: "bumps", rank: "silver", title: { pt: "Bumps", en: "Bumps" } },
            { id: "avoiding-demos", rank: "gold", title: { pt: "Evitando demolição", en: "Avoiding demos" } },
          ],
        },
      ],
    },
  ],
})
