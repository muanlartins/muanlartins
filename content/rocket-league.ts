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
            { id: "turning", rank: "bronze", title: { pt: "Curvas e drift", en: "Turning and drifting" } },
            { id: "supersonic", rank: "bronze", title: { pt: "Supersônico", en: "Supersonic" } },
            { id: "walls", rank: "silver", title: { pt: "Paredes", en: "Walls" } },
            { id: "momentum", rank: "gold", title: { pt: "Mantendo a velocidade", en: "Keeping your speed" } },
          ],
        },
        {
          id: "jumps",
          name: { pt: "Pulos e flips", en: "Jumps and flips" },
          topics: [
            { id: "jump", rank: "bronze", title: { pt: "Pulo e pulo duplo", en: "Jump and double jump" } },
            { id: "flips", rank: "bronze", title: { pt: "Tipos de flip", en: "Types of flip" } },
            { id: "flip-cancel", rank: "silver", title: { pt: "Flip cancel", en: "Flip cancel" } },
            { id: "half-flip", rank: "gold", title: { pt: "Half flip", en: "Half flip" } },
          ],
        },
        {
          id: "recovery",
          name: { pt: "Aterrissagem e recuperação", en: "Landing and recovery" },
          topics: [
            { id: "landing", rank: "bronze", title: { pt: "Caindo sobre as rodas", en: "Landing on your wheels" } },
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
            { id: "shooting", rank: "bronze", title: { pt: "Chutando no gol", en: "Shooting at goal" } },
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
            { id: "pushing", rank: "bronze", title: { pt: "Conduzindo a bola", en: "Pushing the ball along" } },
            { id: "first-touch", rank: "silver", title: { pt: "Amortecendo a bola", en: "Cushioning the ball" } },
            { id: "hood-dribble", rank: "gold", title: { pt: "Carregando a bola no capô", en: "Carrying the ball on your hood" } },
          ],
        },
        {
          id: "kickoff",
          name: { pt: "Kickoff", en: "Kickoff" },
          topics: [
            { id: "kickoff", rank: "bronze", title: { pt: "Logística do kickoff", en: "Kickoff logistics" } },
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
            { id: "attack-defense", rank: "bronze", title: { pt: "Ataque e defesa", en: "Attack and defense" } },
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
