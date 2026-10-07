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
  title: { pt: "Rocket League", en: "Rocket League" },
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
            { id: "inputs", rank: "unranked", title: { pt: "Inputs do jogo", en: "The game's inputs" } },
          ],
        },
        {
          id: "settings",
          name: { pt: "Configurações", en: "Settings" },
          topics: [
            { id: "camera", rank: "unranked", title: { pt: "Cam / Ball Cam", en: "Camera / Ball cam" } },
            { id: "deadzone", rank: "silver", title: { pt: "Deadzone e sensibilidade", en: "Deadzone and sensitivity" } },
          ],
        },
        {
          id: "driving",
          name: { pt: "Direção", en: "Driving" },
          topics: [
            { id: "throttle", rank: "unranked", title: { pt: "Acelerar, frear, ré e boost", en: "Throttle, brake, reverse and boost" } },
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
            { id: "contact", rank: "unranked", title: { pt: "Acertando a bola", en: "Hitting the ball" } },
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
