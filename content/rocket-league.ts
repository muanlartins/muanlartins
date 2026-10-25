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
            {
              id: "keyboard-or-controller",
              rank: "gold",
              title: { pt: "Teclado e mouse ou controle", en: "Keyboard and mouse or controller" },
              video: "LR_autfcOvI",
              text: `Eu troquei o controle pelo teclado e mouse por causa do half flip: no controle, eu simplesmente não conseguia fazê-lo direito. Pesquisei sobre zona morta, sobre a qualidade do controle e sobre a minha precisão no analógico, sem resolver.

O controle tem uma vantagem clara: o analógico usa os 360 graus, e dá para dosar o quanto você vira. No teclado, você fica preso a quatro direções e às diagonais entre elas, sem nada no meio. A pergunta é se essa precisão faz falta. Em jogos de direção, como o Trackmania, ela costuma fazer, e mesmo lá há quem configure teclas extras para calibrar a curva. No Rocket League, com o boost e os voos, não sei o quanto ela pesa; tem gente que faz até o speed flip no teclado.

No fim, é uma questão de conforto. Não acho que um dos dois tenha vantagem decisiva. A grande maioria joga no controle, e alguns jogadores de teclado se sentem limitados. Mas, para mecânicas como o half flip, eu tive mais controle no teclado e mouse do que no controle.`,
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
            {
              id: "deadzone",
              rank: "silver",
              title: { pt: "Deadzone e sensibilidade", en: "Deadzone and sensitivity" },
              video: "xh07eF7Y7tw",
              text: `A zona morta (deadzone) do controle é o quanto você precisa mover o analógico para o jogo considerar que ele se moveu numa direção. Um controle bom tem precisão fina sobre a direção e sobre o quanto você vira.

A sensibilidade da direção é outra coisa: quanto maior, menos você precisa virar o analógico para chegar à curva máxima das rodas. Ela não faz o carro virar mais nem dá vantagem; só muda o quanto do analógico você usa. Eu uso 1,8, no chão e no ar.

A zona morta que mais importa é a do desvio (dodge deadzone): o quanto o analógico precisa sair do centro para o segundo pulo virar um flip em vez de um pulo duplo. Para começar a voar, você pula, aponta o carro para cima puxando o analógico para trás e pula de novo, tudo muito rápido. Com essa zona morta baixa, o analógico ainda inclinado transforma o segundo pulo num flip para trás: o carro não sai do lugar e a bola passa por cima. Acontece com muita gente, e é frustrante.

A solução é aumentá-la. Eu uso 0,6; dependendo do controle, teste 0,6 ou 0,7. Isso não deixa você imune ao flip para trás, nem deveria, porque às vezes você quer dar um. O resto é prática, que vem com o voo, mais à frente.`,
            },
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
            {
              id: "walls",
              rank: "silver",
              title: { pt: "Paredes", en: "Walls" },
              video: "LwQXFN5BvZg",
              text: `Até aqui não havia motivo para ir à parede: quem começa a subir costuma ficar parado nela como uma aranha, sem saber o que fazer. No Prata, ela passa a fazer parte do jogo.

A arena é curva. Nos cantos, a parede faz um ângulo diferente dos 90° das paredes retas, e a junção com o chão e com o teto é arredondada, como uma rampa de skate: a bola sobe por ela, e você também.

Na parede, o objetivo não é sair voando. É conseguir chegar numa bola chutada forte para a lateral e defendê-la ali, porque muitas vezes esperar no chão não basta. O difícil é achar a altura da bola, que às vezes vem descolada da parede e pede um pulo, pequeno ou grande.

O jogo tem gravidade: parado na parede, o carro escorrega para baixo, mas acelerando ele não cai. O ângulo do bico ao pular também muda tudo. Subindo com o bico para cima, o pulo sai alto; com o bico para baixo, você sai de cabeça para baixo; de lado, já sai caindo. Em geral, deixe o bico um pouco para cima.

Para treinar, use o pacote Basic Wall Clears (70F1-3753-10A1-BA21), que achei no Prejump (prejump.com), um site com vários pacotes de treino para buscar. Ele é indicado para o Prata e trata de defesa na parede, e os três primeiros chutes são os que mais importam. A bola corre para a parede e você tem que tirá-la, sempre do centro do gol para fora. O quique na parede é imprevisível: acelere para pegar a bola colada na parede, ou pule. Use a ball cam e mantenha o bico um pouco para cima. Se precisar pular, um pulo simples, já se preparando para cair direito, no chão ou na parede: pulos e pulos duplos demais deixam você perdido no ar quando deveria estar voltando para a posição.

Um bom clear manda a bola para longe, o mais na lateral possível, e não para o meio, onde o atacante deles espera. Acertar a bola de baixo para cima a manda longe; de cima para baixo, ela fica fácil para o colega pegar, e aí é um passe, não uma defesa.

Por último, dá para esperar a bola na parede e bater nela logo que ela quica, aproveitando o impulso do quique para devolvê-la com força, para cima ou para o lado. É uma técnica avançada, que nem jogadores de Diamante fazem sempre, mas o pacote serve para praticar.`,
            },
            {
              id: "momentum",
              rank: "gold",
              title: { pt: "Mantendo a velocidade", en: "Keeping your speed" },
              video: "o-JWolu3iAM",
              text: `Manter a velocidade é um conceito que já apareceu em outros tópicos e fica cada vez mais importante conforme você entende melhor o jogo. Ele junta a recuperação e a movimentação.

Já vimos que, saindo da parede ou de uma jogada, o ideal é cair nas quatro rodas: assim o carro segue para a frente, e uma queda torta faz você demorar e perder toda a velocidade. Também vimos que o máximo é o supersônico, e que uma curva brusca joga essa velocidade fora, enquanto uma curva suave perde menos.

A ideia é parar de jogar a velocidade fora. Passou da bola e precisa voltar? Frear, virar e voltar custa caro. Na maioria das voltas, depois de bater na bola, faça uma curva aberta, pegue boost no caminho e mantenha o embalo. O difícil é o ir e voltar: chegar na jogada com velocidade e saber aproveitá-la na retomada.

O conceito também vale para os outros. Se um adversário acabou de passar por você e errou a bola, ele não volta num passe de mágica, e essa é a sua chance de ir para cima dela.

Não achei um pacote de treino bom para isso; é mais uma introdução ao que vem a seguir. O half flip é a mecânica que mais aproveita a ideia, e a shadow defense, no Platina, também faz bom uso dela.`,
            },
            {
              id: "shadow-defense",
              rank: "platinum",
              title: { pt: "Shadow defense", en: "Shadow defense" },
              video: "KnOiDnlEPpM",
              text: `A shadow defense é, para mim, o jeito de defender nos níveis mais avançados. É difícil, principalmente dependendo da bola, mas leva a sua defesa para outro patamar. Normalmente a gente defende de frente para a bola, saindo do gol para chutá-la contra o atacante. Funciona, mas dá muito espaço para ele driblar.

Na shadow defense, você acompanha a bola vindo do campo deles para o seu, virado para o seu próprio gol, e escolhe a hora de interceptar: tirar a bola para o lado, cavar e seguir com a jogada, ou entrar perto do gol e sair carregando a bola. Num duelo 1v1, mesmo numa partida 2v2 ou 3v3, você não quer ficar enfiado no gol: quer acompanhar o atacante, indo para a esquerda quando ele vai para a esquerda e para a direita quando ele vai para a direita.

O difícil é o ângulo. A bola vem das suas costas, e a setinha da bola não dá informação suficiente: use a ball cam e se acostume com ela vindo de trás. Se a bola vier muito alta, mande-a no travessão ou tire-a para o canto. Você vai bater com o bico no gol e chegar curto na bola muitas vezes; cuidado também para não tirá-la fraquinha, perto do gol.

Com a bola vindo rápida e alta, acompanhe-a pelo chão com boost antes de subir: no chão você acelera mais rápido do que voando, e saindo voando direto você não chega na bola. É o que vimos em manter a velocidade.

Para treinar, use o pacote Shadow Defense 101 (6726-51F1-6B0D-9540), do Prejump (prejump.com), com chutes de várias velocidades e alturas. O importante é ficar confortável interceptando a bola.`,
            },
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
            {
              id: "dont-jump",
              rank: "bronze",
              title: { pt: "Não pule sempre", en: "Don't always jump" },
              video: "A0j1jBHi-Ew",
              text: `No ar, você não consegue dar meia-volta. Um pulo e um flip para a frente na bola levam você muito além dela, e voltar demora. Um toque sutil, ou um pulo pequeno, deixa você pronto para voltar logo.

O boost permite algumas manobras no ar, mas a ideia vale: sair do chão é perder o controle do carro. E se você não cair sobre as quatro rodas, como em Caindo sobre as rodas, ainda perde tempo se ajeitando. No chão, você pode pegar a bola, fazer curva e frear; no ar, suas opções dependem do boost, e sem boost não sobra nenhuma.

Num kickoff de 1v1 dá para ver a diferença: com um flip na bola, o carro vai longe e o adversário chega nela antes; com um pulo simples, o carro já está pronto para voltar na bola e agir.`,
            },
            {
              id: "flip-cancel",
              rank: "silver",
              title: { pt: "Flip cancel", en: "Flip cancel" },
              video: "OaXwxHqUHjA",
              text: `O flip cancel, ou cancelar o flip, é o começo de várias outras mecânicas de flip. É simples o bastante para conhecer agora, e dá até para brincar com ele.

Logo depois de um flip para trás, vire o analógico para a frente: o carro, que já girava para trás, para no meio da cambalhota, de barriga para cima. O mesmo vale para o flip para a frente, com o analógico para trás; para os lados, não funciona. Tudo depende do timing: o ideal é cancelar imediatamente depois do segundo pulo. Atrasado, o carro gira demais, afunda o bico e o cancelamento não sai.

De barriga para cima, com boost, dá para andar de cabeça para baixo e bater na bola como num skate, com as direções invertidas: a tartaruguinha, que os profissionais adoram usar para humilhar alguém.

O uso de verdade vem nas mecânicas seguintes. No half flip, depois do cancelamento você gira o carro e sai andando na direção oposta. O speed flip tem outro cancelamento, que mantém a traseira do carro virada para trás para o boost empurrar durante o flip inteiro e ganhar velocidade.`,
            },
            {
              id: "half-flip",
              rank: "gold",
              title: { pt: "Half flip", en: "Half flip" },
              video: "aYQ9-d1bhGM",
              text: `O half flip é o jeito de virar o carro para o lado oposto sem perder a velocidade. Ele junta o que já vimos: um flip para trás, o flip cancel e o rolamento aéreo (air roll). É uma mecânica que pede precisão, e por isso eu troquei o controle pelo teclado e mouse: no teclado, a direção não tem as pequenas variações do analógico.

Comece com um flip para trás e repare na velocidade que o carro ganha. Logo depois, cancele o flip, empurrando o analógico para a frente. O tempo importa: no ponto certo, o carro para de barriga para cima, com o teto voltado para o chão; tarde demais, ele afunda o bico e completa a cambalhota; cedo demais, ele não chega a ficar de barriga para cima.

De barriga para cima, gire o carro no próprio eixo com o rolamento aéreo. Em Configurações › Controles, dá para pôr o rolamento para a direita e para a esquerda em botões próprios, e aí basta apertar um deles. Bem feito, o carro cai nas quatro rodas, já virado para o outro lado e com a velocidade que tinha. Compare com uma curva ou uma derrapada a partir da ré: você para e perde tudo. Dois flips para trás seguidos de um half flip chegam até o supersônico.

Para treinar, use o pacote Do a half flip! (05A4-631B-C3DB-A894), do Prejump (prejump.com). Os chutes começam de costas para a bola; de ré ou com uma curva normal, você não chega a tempo em vários deles, e os melhores para praticar são o terceiro e o quarto. A ideia não é dar um jeito de pegar a bola, é praticar o half flip. E lembre: o boost só empurra o carro para a frente, então quanto antes você estiver de frente, antes pode usá-lo.`,
            },
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
          ],
        },
        {
          id: "aerials",
          name: { pt: "Jogo aéreo", en: "Aerials" },
          topics: [
            {
              id: "low-aerial",
              rank: "silver",
              title: { pt: "Aéreo baixo", en: "Low aerials" },
              video: "aUh-jb0j6TQ",
              text: `O aéreo depende do boost: é ele que controla o carro no ar, e por isso é um recurso tão importante. No começo, basta um pulo simples e virar o carro com a traseira para baixo, apontando o boost para o chão. Acelerando assim, você já está voando.

O aéreo baixo vai até mais ou menos a altura do travessão. A vantagem é que nele ainda dá para usar o segundo pulo: o prazo, visto em Pulo e pulo duplo, acaba antes de você chegar lá no alto, mas num aéreo baixo ele ainda vale. Teste até que altura você consegue dar um flip na bola; é mais alto do que muita gente lembra.

Aperte o boost primeiro, antes mesmo de pular, para ele ficar ligado o voo inteiro. Deixando para apertar depois de apontar o carro, você começa a subir já caindo. E cuidado com a velocidade de saída, porque o carro mantém no ar a velocidade que tinha no chão. Rápido demais, a bola passa por cima da sua cabeça e você fica tentando voltar nela; nesse caso, é melhor descer e começar de novo. Freie antes de sair: metade do aéreo é o ponto de partida.

Na bola, bater com o bico dá força; com o capô, um toque direcionado; com as quatro rodas, o toque mais fraco que existe. Às vezes também é preciso dosar o boost, para não passar da bola e chegar nela na hora certa.

Para treinar, use os pacotes Aerial Class 1, 2 e 3 (7FD9-54FB-1CDB-E23F, 9343-1F3A-605A-EF63 e 6418-F477-6032-0C8E), do Prejump (prejump.com). Eles têm chutes de várias alturas, distâncias e dificuldades; no começo, fique nos primeiros chutes do primeiro pacote.`,
            },
            {
              id: "high-aerial",
              rank: "gold",
              title: { pt: "Aéreo alto", en: "High aerials" },
              video: "C8Tjtgk2bys",
              text: `No aéreo baixo, um pulo e um flip bastam. Com a bola perto do teto, a subida demora, e o prazo do segundo pulo acaba antes de você chegar lá. O aéreo alto é o mesmo voo, com mais boost: aponte o carro para cima e acelere até a altura da bola.

No ar, sem atrito, o carro mantém a velocidade que tinha quando saiu do chão. Vindo rápido para a frente e acelerando só para cima, você continua indo para a frente; vindo de ré, continua indo para trás, mesmo que pouco. Por isso, o começo do voo decide quase tudo. Se ele começou ruim, o problema não é o ajuste no meio do caminho, é a saída. Antes de voar, veja para onde a bola vai e onde você quer encontrá-la, e saia na direção desse ponto.

Como o segundo pulo não serve para um flip lá em cima, use-o para subir mais rápido: boost, pulo, carro apontado para cima e, logo em seguida, o segundo pulo, um empurrãozinho a mais que faz diferença.

Para treinar, use os pacotes Aerial Class 1, 2 e 3 (7FD9-54FB-1CDB-E23F, 9343-1F3A-605A-EF63 e 6418-F477-6032-0C8E), do Prejump (prejump.com); os chutes mais altos são os mais difíceis, e o terceiro pacote é bem puxado. No começo, você vai chegar atrasado ou passar da bola: dose o boost para chegar na hora certa. Depois, mire no gol: bata no lado da bola oposto ao de onde quer mandá-la, de cima para baixo para um chute para baixo, e com o bico para um toque forte. Com as rodas, o toque amortece a bola. Também não é preciso pegar a bola no ponto mais alto: esperar ela cair um pouco pode facilitar.

Força não é a preocupação agora; o que importa é acertar a bola com direção e intenção, e se acostumar a voar. Quanto melhor você lê a subida da bola, melhor o seu posicionamento, e isso se treina jogando partidas, não adivinhando no treino. Inclinar o carro para chutar melhor é uma camada a mais, para quando chegarmos aos ajustes finos do aéreo.`,
            },
            { id: "air-dribble", rank: "diamond", title: { pt: "Air dribble", en: "Air dribble" } },
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
            {
              id: "power-shot",
              rank: "silver",
              title: { pt: "Chute forte", en: "Power shots" },
              video: "FEQ2LAd1ino",
              text: `O chute forte (power shot) é o chute de gol aberto: sem ninguém para defender, você precisa acertar, e com força.

Tudo está na soma das velocidades. Dois carros na mesma direção, um a 20 e outro a 30 por hora, batem como se estivessem a 10; de frente, como se estivessem a 50. Com a bola é igual: se ela vem para a esquerda, bater nela da esquerda para a direita soma as duas velocidades e o chute sai forte, enquanto bater na mesma direção em que ela já vai tira a força.

Primeiro, acerte a bola em cheio, com consistência. Depois, mire: o quanto você abre o carro antes de chegar decide o ângulo, para o canto ou para o meio. Com o gol aberto, jogue seguro e mire mais no meio; com um defensor, mire no canto e chute forte, para ele não ter tempo de reagir. Quanto mais perto do supersônico na hora da pancada, melhor.

Bata com o bico, não com o capô, senão a bola amortece e sai devagar. Um pulinho no fim da pancada pega a bola no meio em vez de por baixo, e o flip ajuda a corrigir a direção e dá ainda mais força, mas a pancada no chão é a principal.

Com a bola quicando, espere ela começar a subir. Descendo, ela tem velocidade para baixo e o chute sai fraco; subindo, ela já ganha altura sozinha, e toda a sua força vai para a frente. Pule para pegar o meio da bola, sem chegar em cima dela. Com a bola vindo na sua direção, bata com a quina do carro, como numa trivela, e ela sai para o lado.

Para treinar, use o pacote Powershots (7028-5E10-88EF-E83E), do Prejump (prejump.com). A bola só entra se você acertar de primeira, e não é preciso fazer todos os chutes: dá para repetir o mesmo, ou espelhá-lo.

Os bons jogadores fazem esse básico com muita consistência, e é por isso que podem pensar nas coisas mais complicadas.`,
            },
            {
              id: "wall-shots",
              rank: "silver",
              title: { pt: "Chutes da parede", en: "Shots off the wall" },
              video: "6-5wW1KsJ4c",
              text: `Na parede, o campo gira 90°. Com o carro e a bola na parede da esquerda, o "para cima" da parede é a sua direita, se você pensar no chão; na parede da direita, é o contrário. É essa mistura das duas perspectivas, a da parede e a do chão, que confunde tanto.

Pela perspectiva da parede, vale o mesmo que no chão. Chegando por baixo da bola, ela sobe pela parede, ou seja, vai para a direita, e quanto mais embaixo você pegar, mais para lá ela vai. Pulando, você acerta o centro dela; pulando bem alto, acerta o topo, e ela vai para a esquerda. De baixo para cima, a bola sai alta e para longe da parede; de cima para baixo, ela desce para o chão.

No começo, o objetivo é só acertar a bola em cheio, com o capô. Com mais prática, chegue com bastante velocidade e dê um pulo bem no fim do contato, para ganhar potência sem perder a direção. Pulando antes, a bola vai para onde você não quer.

Quando a bola está descolada da parede, não tem jeito: é preciso pular. Prefira o pulo simples e, para cair, gire o carro 90° até as quatro rodas apontarem para o chão, como em Caindo sobre as rodas. Sair da parede assim também é um bom treino de voo, que vem a seguir.

Para treinar, use o pacote Wall Shots (9F6D-4387-4C57-2E4B), que achei no Prejump (prejump.com).`,
            },
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
            {
              id: "first-touch",
              rank: "silver",
              title: { pt: "Amortecendo a bola", en: "Cushioning the ball" },
              video: "gNxUPo9Vn_Q",
              text: `Amortecer a bola no capô é o começo da criatividade no jogo pelo chão. Nem sempre é preciso fazer um aéreo ou esperar a bola no ar: sem ninguém por perto, o que você quer é a posse, o domínio da bola.

O exercício é acelerar e frear acompanhando a velocidade da bola até ela pousar no capô. Freando cedo demais, ela quica para a frente; acelerado demais, ela fica para trás. Tire a ball cam e acompanhe a sombra da bola. Quando ela vem na sua direção, a ball cam pode ajudar, e dá para alternar entre as duas.

Onde a bola encosta no carro decide para onde ela vai: na traseira, ela cai para trás; no bico, vai para a frente com força; numa quina, para o lado. Com esse conforto, uma bola que vinha pelo ar vira uma bola no seu capô, e dali saem jogadas como o flick, mais à frente.

Não achei um pacote de treino específico para isso. Qualquer pacote de aéreo serve, como o Aerial Class 1 (7FD9-54FB-1CDB-E23F), do Prejump (prejump.com), porque o que importa é a bola chegando em velocidades e direções diferentes.`,
            },
            { id: "hood-dribble", rank: "diamond", title: { pt: "Carregando a bola no capô", en: "Carrying the ball on your hood" } },
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
            {
              id: "watching-players",
              rank: "silver",
              title: { pt: "Observando os jogadores", en: "Watching the players" },
              video: "cyA_8mvoGqc",
              text: `Este tópico é uma partida comentada ao vivo, para mostrar como o que você faz deve se adaptar ao que os outros estão fazendo. Quanto mais jogadores em campo, mais isso vale, e a regra geral é esperar a sua vez.

Antes de decidir, olhe para os carros, não só para a bola. Com um adversário vindo e o outro na defesa, há espaço para levar a bola ao ataque; se o seu colega já está na frente, o seu lugar é atrás dele, esperando onde a bola pode sobrar. Quando o ataque deles vem, é hora de recuar. E quando um adversário está longe, mas não tão longe, você tem uma abertura.

As decisões erradas também ensinam. Ir no defensor adversário em vez de ir na bola pode deixar o seu gol aberto, sem tempo de o colega voltar. Um challenge com o flip para o meio do campo, e não para fora, é o que faz a bola espirrar para dentro do seu próprio gol: parece azar, mas é mais culpa de quem disputou. Do outro lado, o último homem adversário que desafia uma bola que não ia pegar entrega o gol.

Jogar mais recuado, no erro dos outros, é um estilo; dá para jogar mais agressivo e jogar bem. O que não muda é ler para onde a jogada pode ir: um defensor apontado para o centro do campo só consegue tirar a bola para um lado, e quem fica nesse lado recebe praticamente um passe do adversário. E, sem comunicação, você nem sempre sabe o que o seu colega pretende; na dúvida, deixe a bola com quem está nela.`,
            },
            {
              id: "bounce-prediction",
              rank: "platinum",
              title: { pt: "Previsão de bounce", en: "Predicting bounces" },
              video: "eswE5M_wBis",
              text: `Para disputar a bola, você precisa saber onde ela vai estar. Ler o quique (bounce) é física básica: como na sinuca, a bola sai de uma superfície no mesmo ângulo em que chegou, fazendo um V. No Rocket League há ainda a gravidade: indo para o lado e para cima, a bola cai naturalmente. O treino mostra a trajetória tracejada, mas não se guie por ela; no jogo ela não existe, e é na sua cabeça que você tem que imaginar o caminho.

O primeiro nível de leitura é esperar a bola chegar ao chão e acertá-la, de preferência com a ball cam. O problema é o adversário: se você espera porque não sabe para onde a bola vai, ele pode chegar antes, subir e cortá-la, e o toque é dele. Por isso, um olho na bola e outro no adversário: a distância e a velocidade dele dizem se ele chega primeiro, e às vezes ele só finge que vai subir.

Quem chega primeiro disputa a bola. Esperar mais dá um toque melhor, com a bola no meio do campo e força para o gol, mas arrisca o adversário chegar antes; o jogo é o equilíbrio entre os dois. Sem ninguém disputando, receber a bola no carro e conduzi-la costuma valer mais do que um chute.

Na defesa, a leitura muda o lugar do toque. Um atacante vindo junto com a bola vai chutar na primeira brecha, então tire a bola antes dele, o mais perto possível da borda do gol, fechando o ângulo dele mesmo que o toque não saia perfeito.

Para treinar, use os pacotes Sidewall bounce reading (D51D-9918-4A84-609F), só com bolas pela lateral, e Bounce Reads (DF13-7661-D094-0BDF), com leituras mais complicadas, como quiques de defesa e no canto do gol, que é curvo; os dois estão no Prejump (prejump.com). Nas configurações de controles, lá embaixo, há um comando para sortear os chutes, que no teclado não vem configurado: com ele, o pacote alterna chutes aleatórios, e você não decora a sequência.`,
            },
          ],
        },
        {
          id: "positioning",
          name: { pt: "Posicionamento", en: "Positioning" },
          topics: [
            {
              id: "positions",
              rank: "bronze",
              title: { pt: "Entendendo as posições", en: "Understanding positions" },
              video: "20wfB43uHJI",
              text: `No 1v1, só existe você: atacante, meio-campo e zagueiro ao mesmo tempo. Depois do kickoff, com a bola no seu campo, você não pode ir buscar boost no campo do adversário: o seu gol fica aberto, e ele tem todo o tempo do mundo para levar a bola até lá, sem nem precisar chutar forte. Com a bola longe, dá para pegar boost; com ela perto do seu gol, o certo é voltar direto para defender ou tirá-la para o lado.

Com duas ou três pessoas no time, as posições se dividem. Todo mundo gosta de atacar, de ir atrás da bola, mas alguém precisa saber que é o responsável por proteger o gol: o último homem. Se a bola espirra, é ele quem tem de tirá-la, não quem a deixou espirrar.

Nada impede o defensor de avançar também, como um time de futebol que vai todo para o ataque, mas é um risco. Por isso vale saber quais são as posições e quando você está saindo da sua. Se quem atacou ficou sem boost depois da jogada, quem precisa pensar na defesa agora é o outro: pegar boost e se preparar para defender, ou jogar a bola para o canto, longe do gol. Essa troca é o assunto do próximo tópico, a rotação.

No 3v3, com mais carros, dá até para ter um goleiro fixo, que não é o ideal, enquanto os outros dois atacam juntos. Aí entra o passe: em vez de chutar, um toque para o lado deixa o colega na posição de chutar. Só lembre que, se todo mundo avançar e o adversário fizer uma boa defesa, a bola pode voltar direto para o seu gol.`,
            },
            {
              id: "push-and-retreat",
              rank: "silver",
              title: { pt: "Avanço e recuo", en: "Pushing up and falling back" },
              video: "GgKo3hmHelY",
              text: `Mais uma partida comentada, agora focada nos momentos de avançar para cima da bola e de recuar. Eu recuo mais do que avanço: prefiro perder uma chance de gol a fazer um ataque ruim e levar o contra-ataque. Contra jogadores bons, os dois lados têm razão, porque se você não faz o gol, eles fazem.

Avance quando a bola e o ataque são do seu time: depois de um kickoff ganho, quando o adversário erra, quando o colega dá um bom passe pelo meio. Recue quando você está sem boost, quando é o último homem e a bola pode espirrar, ou quando o adversário tem a bola e o boost. Recuar não é parar: dá para acompanhar o atacante de longe, na shadow defense, esperando o toque dele para disputar.

No ataque, jogar a bola para o meio, na direção do gol, cria chances: o colega pode completar, ou a defesa pode errar. Mas cada avanço abre espaço para o contra-ataque, e quando você está de frente para a bola, no caminho dela, é mais um atacante do que um defensor.

A rotação não para, mas a intenção precisa estar clara: girar o carro para trás mostra que você está voltando, e girar para a frente mostra que está indo. Mesmo voltando, dá para ajudar sem só se enfiar no gol: tirar um atacante do lance com um bump ou jogar a bola para fora.`,
            },
            {
              id: "covering",
              rank: "gold",
              title: { pt: "Compensando a posição do time", en: "Covering for your team" },
              video: "BQPnK-7p8fQ",
              text: `Mais uma partida comentada, agora sobre compensar a posição do time. Jogando com um amigo, vocês combinam quem faz o quê. Com um desconhecido, sem comunicação, você reage ao que ele faz: se ele vai no kickoff, você fica atrás; se ele vai na bola, você cobre o que ele deixou para trás; se ele não foi, a bola é sua.

A tendência das pessoas é gostar muito da bola. Por isso, na maioria das vezes, compensar é jogar mais recuado: esperar os rebotes, cuidar da defesa e atacar só nas janelas em que dá para ir e voltar a tempo. Se o colega é passivo, faça o contrário e seja você o agressivo. Isso é bem mais raro, e muita gente prefere jogar agressivo e aproveitar as janelas; é uma questão de estilo.

Leia com quem e contra quem você está jogando. Um colega que vai em toda bola não vai mudar em cinco minutos de partida, e você provavelmente nem cai com ele de novo, mas esses cinco minutos valem os seus pontos. Não adianta querer consertá-lo nem descontar a frustração: você controla o que você faz, não o que ele faz. A paciência compensa, e de vez em quando a bola sobra para você, na posição e no ângulo certos, justamente porque você esperou.

O que está nas suas mãos é aproveitar as janelas que aparecem, sem um ataque malfeito nem uma defesa ruim. Quando um gol entra, olhe primeiro para o seu erro, que é o único que você pode corrigir.`,
            },
          ],
        },
        {
          id: "rotation",
          name: { pt: "Rotação", en: "Rotation" },
          topics: [
            {
              id: "rotation",
              rank: "bronze",
              title: { pt: "Conceito de rotação", en: "What rotation is" },
              video: "VCKhqjZd_4E",
              text: `No futebol, cada jogador tem uma posição fixa: goleiro, zagueiro, volante, atacante. No Rocket League, não: você veste o chapéu da posição de que o jogo precisa naquele momento.

Depois do kickoff, quem foi na bola fica sem boost e fora de posição, na frente da bola, sem ter como atacar. Quem esperava atrás sabe o que fazer: pega boost e vai na bola, virando o primeiro homem. Quem foi no kickoff passa pelos pads, enche o boost e volta para defender como segundo homem. Os papéis se invertem, e quando a bola espirrar de novo, invertem outra vez. Esse vai e volta é a rotação.

Não existe regra fixa; depende de sentir onde está a bola e se vale chegar mais perto. Se um adversário vacilou e foi buscar boost longe, o time tem a chance de um 2 contra 1: o segundo homem pode subir para atrapalhar o defensor com um bump ou uma demolição, esperar um passe, ou ficar seguro, pronto para o rebote se a defesa espirrar a bola.

Faz parte da rotação deixar os outros jogarem. Quando os dois do mesmo time vão juntos na bola, sem saber quem é o primeiro e quem é o segundo, ela pode espirrar para o lado errado, e o adversário que teve paciência faz o gol. Esperar a sua vez de tocar na bola é o assunto do próximo tópico.`,
            },
            {
              id: "self-control",
              rank: "bronze",
              title: { pt: "Exercendo o autocontrole", en: "Holding back" },
              video: "fvESkRwYGQU",
              text: `Você não precisa ir na bola o tempo todo. Ela espirra muito, ainda mais nos níveis mais baixos, e isso vai de Bronze até Platina e Diamante. Quem está mais perto aproveita, mas se você está sempre colado na bola, ela sempre espirra para longe de você.

Quando todo mundo vai na bola ao mesmo tempo, o jogo vira uma bagunça: cada um só empurra a bola, e o gol sai para quem dá a sorte de um toque ir na direção certa.

Exercer o autocontrole é, quando você é o segundo homem, esperar a disputa acontecer, ver para onde a bola vai e só então ir nela, com tempo para fazer alguma coisa: chutar no gol, ou conduzir com calma até alguém se aproximar.

Isso pesa ainda mais jogando sozinho, com desconhecidos que vão todos atrás da bola. É chato esperar, porque todo mundo quer jogar e fazer gol, mas essas janelas aparecem de tempos em tempos, e é preciso estar pronto para aproveitá-las. Quem só corre atrás da bola como mais um nunca aprende a controlá-la, e perde essas oportunidades.`,
            },
            {
              id: "back-post",
              rank: "silver",
              title: { pt: "Voltando pelo segundo pau", en: "Rotating back post" },
              video: "a8SxTWoWzG8",
              text: `Quando um ataque passa por você e a bola corre pela lateral em direção ao seu campo, o caminho mais curto até ela é uma reta. Se não há tempo, é isso mesmo: vá direto e tente desviar a bola. Mas, com tempo, ir reto é um erro.

Chegando na bola pela frente, olhando para ela, você fica na mesma posição do atacante: o único toque que consegue dar é para onde o carro aponta, ou seja, na direção do seu próprio gol. Para defender de verdade, faça uma curva aberta por fora, pegando boost no caminho, e pare no segundo pau, a trave do lado oposto ao de onde vem a bola.

Fique ali virado para o jogo, não para o gol. O carro acelera fácil com o boost, mas dá ré com dificuldade: com a bola vindo para o seu canto, basta uma ré curta; com ela indo para o outro lado, você antecipa o chute e já sai com boost para defender. Isso só funciona se você estiver no segundo pau em relação à bola.

O resto é gato e rato: conforme a defesa melhora, o ataque também melhora, com chutes altos no canto ou a bola no capô para um flick, e quem defende escolhe entre disputar e recuar para ver o chute. Quando o seu ataque dá errado e a bola escorre pelo outro lado, é a mesma situação, espelhada: curva aberta, segundo pau e espera.`,
            },
          ],
        },
        {
          id: "boost",
          name: { pt: "Boost", en: "Boost" },
          topics: [
            {
              id: "boost-pads",
              rank: "bronze",
              title: { pt: "Onde pegar boost", en: "Where to get boost" },
              video: "QcbiAMvP7KM",
              text: `O boost é o recurso mais importante do jogo: é o que leva você até a bola e faz as jogadas. Com o tanque vazio, o carro não consegue acelerar, chutar forte nem desviar de ninguém.

Os boosts grandes, nos cantos e nas laterais do campo, dão 100 e voltam depois de um tempo. Depois do kickoff, quem gastou boost costuma ir buscar um deles. Mas o campo também tem vários pads pequenos, que dão 12 cada, e vale traçar o caminho até a bola passando por cima deles de propósito, em vez de desviar. Num caminho só, dá para pegar uns 36.

Você não precisa estar sempre de tanque cheio. Gastar 20 e atravessar o campo atrás de um boost grande é um erro: eles ficam nos cantos por uma razão, e ir até lá deixa o meio aberto.

O 1v1 mostra bem isso. Não é o modo mais jogado, porque tudo é responsabilidade sua e os gols frustram, mas ensina muito: com a bola no seu campo, ir buscar boost no canto dá o gol ao adversário, mesmo que ele só pegue um pad no caminho. Os grandes estão nos cantos de propósito, e os pequenos estão no meio para o empurrão de que você precisa para chegar na bola.`,
            },
          ],
        },
        {
          id: "challenges",
          name: { pt: "Disputas", en: "Challenges" },
          topics: [
            {
              id: "when-to-go",
              rank: "silver",
              title: { pt: "Quando fazer o challenge", en: "When to challenge" },
              video: "HmYt-PMX9NI",
              text: `Disputar a bola, o challenge, é decidir quando ir para cima dela contra um adversário. Se não há ninguém por perto, a bola é sua e você sempre pode ir. O problema são os outros jogadores, inclusive o seu colega, que também pode querer a bola.

A regra principal: quem está mais perto da bola tem o primeiro toque, e com ele o domínio da jogada. Use o nome em cima do carro do adversário para ter noção da distância. Se ele está bem mais perto e vê você vindo, tem tempo de sobra para chutar a bola por cima de você. Com a distância parecida, é um 50/50: os dois podem ganhar, e o resultado depende do ângulo, da força e de vários outros fatores.

Quando você é o mais perto, pode carregar a bola e, quando o adversário vier, desviá-la dele para ganhar a disputa. E não fique parado com medo numa bola que é claramente sua: com o adversário longe, chute no canto. A direção para onde ele aponta também conta: perto, mas de costas para a bola, ele precisa virar com um half flip ou esperar você se afastar dela, e às vezes dá para passar a bola por cima dele.

Quem não tem o primeiro toque não pode se arriscar a deixar a bola passar: se ela passa por você, quem está com ela conduz com tranquilidade, e você volta pelo segundo pau. Depois de cada disputa, pergunte se deveria ter ido; esse senso de distância vem com o jogo.`,
            },
          ],
        },
        {
          id: "defense",
          name: { pt: "Defesa", en: "Defense" },
          topics: [
            {
              id: "clearing",
              rank: "silver",
              title: { pt: "Tirando a bola", en: "Clearing the ball" },
              video: "lSWaqcThmzk",
              text: `Para treinar a defesa de dentro do gol, use o pacote Saves (2E23-ABD5-20C6-DBD4), do Prejump (prejump.com). O que mais importa não é salvar a bola de qualquer jeito, e sim para onde você a manda, como e com que recursos.

Uma defesa ruim deixa a bola fraca, rasteira e no meio, um contra-ataque fácil. Uma boa a manda longe, para onde você escolheu. Numa bola que chega forte e direto em você, há muita liberdade: angular o carro para mandá-la para o centro ou para um lado, pingá-la por cima com o capô, usar um flip para jogá-la no canto onde está o seu colega, esperar ela quicar, ou até dominá-la. Numa bola lenta, as opções diminuem; não saia acelerando, porque você passa da bola. Tenha calma e só então tire, ou venha de ré, pule para trás ou faça um half flip.

O que decide uma defesa é o ângulo, a posição e o boost. Com um aéreo baixo, você alcança o travessão. De frente para a bola, como um goleiro tradicional, dá para ir para os lados, mas não muito, e uma bola no canto pode ser impossível de pegar.

Lembre dos princípios: de dentro do gol para fora, e do centro para as laterais. Sempre que puder, desvie a bola para o lado, não para o meio do campo. E, vindo de fora, cuidado para não passar da bola: passou por baixo ou por cima dela, você não volta a tempo.`,
            },
          ],
        },
        {
          id: "attack",
          name: { pt: "Ataque", en: "Attack" },
          topics: [
            {
              id: "common-attack",
              rank: "bronze",
              title: { pt: "O ataque mais comum", en: "The most common attack" },
              video: "M_7GaoHF-Ww",
              text: `Um dos ataques mais comuns, que todo mundo usa no começo e por muito tempo, porque funciona: um atacante leva a bola pela lateral e passa pelo defensor, a curva do canto do campo devolve a bola para a frente do gol, e o colega que esperava ali completa.

É o momento que cria caráter na defesa: de dentro do gol, chute a bola para fora de novo. Começa uma disputa entre você e o atacante; se a bola passar por ele, quem esperava na frente do gol já não tem o que completar, e o seu time pode contra-atacar.

Esse lance também ensina a evitar gol contra. Na frente da bola, no caminho dela, o único toque que você consegue dar é para onde o carro aponta. Esperando a bola de frente, entre ela e o seu gol, ela pode bater no seu carro, você pode errar o flip, ou o atacante pode desviá-la em você, e é gol contra. Para defender, chegue na bola por trás, apontando para longe do seu gol; nunca o contrário.

O mesmo vale no ataque: se você foi parar perto do gol adversário e o seu colega vem chutar, saia da frente. Quem tem o melhor ângulo é quem está atrás da bola, não quem está do lado dela. A posição em relação à bola importa, e a distância também, que é o embalo para chutar forte.`,
            },
            {
              id: "rebounds",
              rank: "gold",
              title: { pt: "Rebotes", en: "Rebounds" },
              video: "krG2KOIY1WA",
              text: `O rebote é a bola que volta depois de um chute, da parede, da tabela ou do goleiro, como no futebol. Pegar o rebote é esperar essa segunda chance e colocar a bola no gol de novo. Ele está em Estratégia, e não em Mecânica, porque o que decide é ler onde a bola vai estar: é uma previsão de bounce mais um chute bem colocado.

O rebote aéreo, depois de um chute forte, é o mais difícil, e não é o primeiro a aprender. O mais comum é o rebote da parede.

Uma dica de mecânica: em vez do flip para a frente, use o flip na diagonal logo antes do contato. Mesmo errando o centro da bola, ele ajusta a trajetória do carro. Para mandar a bola para a esquerda, jogue o carro para a direita e toque nela pelo lado direito, como na sinuca. Você perde um pouco de força, mas a diagonal é bem melhor do que o flip lateral; só cuidado para acertar a bola com o capô, não com o bico. O flip não salva um pulo muito errado, e, com a mira já certa, pode estragá-la.

Para treinar, use o pacote Rebound Consistency (E744-D5FC-64A7-037F), do Prejump (prejump.com), com chutes na tabela e saindo da parede, uns mais longe, mais aéreos e mais laterais que outros.`,
            },
          ],
        },
        {
          id: "team",
          name: { pt: "Equipe", en: "Team" },
          topics: [
            {
              id: "quick-chat",
              rank: "bronze",
              title: { pt: "Aprendendo os quick chats", en: "Learning the quick chats" },
              video: "oZnp5biHSow",
              text: `Os quick chats (bate-papo rápido) são o jeito de falar com o time sem digitar, e vale aprender o que cada um diz e onde fica. Eles comunicam o que importa na partida: quem vai no kickoff, o que você está fazendo.

No controle, o direcional abre o bate-papo rápido, e cada direção é uma categoria. A da esquerda são os elogios, que também servem para provocar depois de uma defesa ruim. Para cima ficam os de jogo, como avisar que a bola é sua ou que você precisa de boost, ou seja, que está indo pegar boost em vez de ir na bola. Para a direita, reações sem importância; para baixo, desculpas, para quando você deixa passar um gol, e o colega educado responde que não tem problema.

Nas configurações, na parte do chat, dá para trocar a mensagem de cada opção e montar o que você quer comunicar. Isso ajuda principalmente jogando com desconhecidos; com um amigo em chamada de voz, no Discord, por exemplo, é irrelevante.`,
            },
          ],
        },
        {
          id: "demos",
          name: { pt: "Demolições", en: "Demolitions" },
          topics: [
            {
              id: "demos",
              rank: "silver",
              title: { pt: "Demolição e bump", en: "Demolitions and bumps" },
              video: "NAbbaWE4QzE",
              text: `Quando dois carros se encostam, um empurra o outro. Uma batida de bico no adversário é o bump: ele toma uma pancada e muitas vezes perde o controle do carro.

Quanto mais rápido você vai, mais forte é o bump. No supersônico, a batida vira uma demolição (demo): o outro carro é destruído e fica alguns segundos fora do jogo. Ser demolido irrita todo mundo, mas é uma mecânica do jogo, e um recurso importante.

Tirar um adversário do lance, mesmo por poucos segundos, decide jogadas. Num ataque deles, você não precisa ir na bola: sem atacante, não tem ataque. No ataque mais comum, com a bola vindo pela lateral para o meio, demolir o defensor deles deixa o gol aberto: sem defensor, não tem defesa. No 1v1, tirar o adversário costuma deixar o gol vazio.

A demolição é para quando você não tem nada mais importante para fazer na bola: use esse tempo livre para tirar o defensor e deixar o colega fazer o gol. Só não troque a defesa por uma demolição, nem o contrário.`,
            },
          ],
        },
      ],
    },
  ],
})
