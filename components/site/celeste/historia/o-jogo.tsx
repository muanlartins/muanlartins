import Link from "next/link"
import { FORGIVENESS, GAME_DEVELOPER, artTalk, commentary, lena, lenaBandcamp, sonar } from "@/components/site/celeste/historia/fontes"
import { Facts } from "@/components/site/celeste/historia/parts"
import type { Story } from "@/components/site/celeste/historia/story"
import { Figures, Milestones, Quote, Text } from "@/components/site/celeste/tecnicas/parts"
import { celestePath } from "@/lib/celeste"

/**
 * How Celeste was made, from the research of 2026-11-23 (~/.local/share/muanlartins/celeste-lore/criadores/ and
 * musica/): the credits as the original executable loads them, the developers' posts, talks and interviews. Nothing
 * of the story past the premise. Maddy Thorson by her name only, always: older articles that carry another name are
 * quoted as hers, with their year.
 */

const technique = (id: string, label: string) => (
  <Link href={`${celestePath()}/${id}`} className="text-klein underline-offset-4 hover:underline">
    {label}
  </Link>
)

export function oJogo(): Story {
  return {
    lede: "Quem fez Celeste, de onde ele veio e como foi feito, contado por quem fez. Sem spoiler da história.",
    meta: [
      { label: "Lançado", value: "25/01/2018" },
      { label: "Feito em", value: "2 anos" },
      { label: "Estúdio", value: "Maddy Makes Games" },
    ],
    sections: [
      {
        id: "de-onde-veio",
        title: "De onde veio",
        body: (
          <div className="space-y-8">
            <Text>
              <p>
                Em agosto de 2015, a Maddy Thorson e o Noel Berry fizeram um jogo de plataforma sobre subir uma montanha em quatro dias, pro PICO-8, um console de fantasia que só existe como programa de computador. O Noel tinha acabado de descobrir o PICO-8. Esse é o Celeste Classic, e ele já tinha o pulo, o dash e o cabelo que muda de cor.
              </p>
              <p>Em 2016 os dois resolveram transformar o protótipo num jogo completo. Viraram dois anos de trabalho, com quase a mesma equipe do TowerFall, o jogo anterior da Maddy. A física da Madeline é praticamente a mesma de lá.</p>
            </Text>
            <Figures
              items={[
                { label: "O primeiro", value: "4 dias", note: "no PICO-8, em 2015" },
                { label: "O completo", value: "2 anos", note: "de 2016 a 2018" },
                { label: "A tela", value: "320 × 180", note: "pixels, um quarto da tela do Switch" },
                { label: "Programadores", value: "2", note: "a Maddy e o Noel" },
              ]}
            />
            <Quote by="Noel Berry, ao Game Developer (2018)" href={GAME_DEVELOPER} original="We spent 4 days and made the original.">
              A gente passou 4 dias e fez o original.
            </Quote>
          </div>
        ),
      },
      {
        id: "quem-fez",
        title: "Quem fez",
        description: "Como os créditos do próprio jogo dividem o trabalho.",
        body: (
          <Facts
            items={[
              { title: "Maddy Thorson", children: <p>Direção, design, roteiro e a programação de como a Madeline se mexe. Fez a maior parte das salas. Antes de Celeste, fez o TowerFall.</p> },
              { title: "Noel Berry", children: <p>Cocriador, programação e arte. Fez o Celeste Classic com a Maddy e, depois do lançamento, publicou o código da Madeline pra quem quisesse estudar.</p> },
              { title: "Amora Bettany", children: <p>Arte de conceito e de alta resolução: os retratos que aparecem nos diálogos e as ilustrações. Também ajudou no roteiro e revisou a tradução brasileira.</p> },
              { title: "Pedro Medeiros", children: <p>Pixel art e interface: a Madeline em jogo, as animações, os cenários e os enfeites das salas.</p> },
              { title: "Lena Raine", children: <p>A trilha sonora inteira.</p> },
              { title: "Power Up Audio", children: <p>O som: Kevin Regamey, Jeff Tangsoc, Joey Godard e Cole Verderber.</p> },
              { title: "E mais", children: <p>Gabby DaRienzo fez a montanha em 3D do mapa, e Sven Bergström a luz dela. Heidy Motta cuidou das operações. No fim dos créditos tem até uma seção de gatos da produção, com onze nomes.</p> },
            ]}
          />
        ),
      },
      {
        id: "mao-brasileira",
        title: "A mão brasileira",
        description: "Dois dos artistas de Celeste são brasileiros e fizeram o jogo daqui.",
        body: (
          <Facts
            items={[
              {
                title: "Feito entre o Brasil e o Canadá",
                children: (
                  <p>
                    O Pedro Medeiros e a Amora Bettany, do estúdio MiniBoss, trabalharam do Brasil, com a Maddy e o Noel em Vancouver. No TowerFall, eles mandavam os desenhos e esperavam o programador acordar. No Celeste, tinham acesso direto ao código e botavam a arte no jogo eles mesmos. O Pedro conta que fez a Madeline piscar parada sem pedir permissão pra ninguém.
                  </p>
                ),
                source: sonar("47:20"),
              },
              {
                title: "A tradução brasileira quase saiu ruim",
                children: (
                  <p>
                    A empresa contratada pra traduzir o jogo entregou uma versão em português que a Amora achou muito ruim. Ela tirou uma semana do trabalho, revisou tudo com a ajuda de amigos e mandou as correções. Os créditos registram: “Additional Brazilian Portuguese: Amora B.”. Ela conta que pensou em dar sotaque regional aos personagens e desistiu, porque eles não são brasileiros.
                  </p>
                ),
                source: sonar("1:01:00"),
              },
              {
                title: "A Madeline não tem rosto de propósito",
                children: (
                  <p>
                    No conceito, a Madeline em pixel tinha rosto. Tiraram porque o jogo fala de saúde mental e a equipe queria que cada um se projetasse nela: em tão poucos pixels, o cérebro de quem joga completa o que falta. As expressões ficaram pros retratos dos diálogos.
                  </p>
                ),
                source: artTalk("6:40"),
              },
              {
                title: "320 × 180 por causa do Switch",
                children: <p>O Pedro escolheu a resolução do jogo dividindo a tela do Switch por quatro, pra ficar perfeita nele, e porque era o tamanho em que ele conseguia animar tudo a tempo.</p>,
                source: artTalk("26:00"),
              },
              {
                title: "O jogo pagou a mudança",
                children: <p>Em 2019, o Pedro, a Amora e a Heidy Motta se mudaram de São Paulo pra Vancouver pra trabalhar com a equipe. Na entrevista, a Amora conta que foi o dinheiro do Celeste que deixou eles saírem do país com calma, levando os três gatos.</p>,
                source: sonar("1:18:00"),
              },
              {
                title: "Tutorial de graça",
                children: <p>O Pedro ficou conhecido pelos tutoriais de pixel art que publica de graça. Ele explica que é porque, no Brasil, era difícil ter acesso a esse tipo de informação, e ele nunca achou um livro de pixel art.</p>,
                source: artTalk("24:40"),
              },
            ]}
          />
        ),
      },
      {
        id: "como-foi-feito",
        title: "Como foi feito",
        body: (
          <div className="space-y-8">
            <Quote by="Maddy Thorson, no blog da EXOK (2019)" href="https://exok.com/posts/2019-12-09-exok-projects/" original="Celeste was developed as a platformer first, and its story slowly formed around the sensations of playing it.">
              Celeste foi feito como jogo de plataforma primeiro, e a história foi se formando aos poucos em volta das sensações de jogar.
            </Quote>
            <Facts
              items={[
                {
                  title: "Toda sala começou como quadrados cinza",
                  children: (
                    <p>
                      As fases eram montadas num editor feito pra Celeste, e a Maddy desenhou a maior parte das salas. Os artistas recebiam a sala só com os blocos e transformavam em cenário. Os blocos se encaixam sozinhos, com umas 32 variações, porque eram salas demais pra desenhar à mão. Os enfeites, qualquer um da equipe podia carimbar.
                    </p>
                  ),
                  source: artTalk("18:40"),
                },
                {
                  title: "Três mundos que não se misturam",
                  children: <p>O jogo em pixel art, os retratos e a interface em alta resolução, e o mapa da montanha em 3D. A regra era nunca misturar um estilo com o outro. Por isso um coração de cristal é desenhado três vezes.</p>,
                  source: artTalk("11:40"),
                },
                {
                  title: "Na ordem em que a gente joga",
                  children: <p>Os capítulos foram feitos na ordem do jogo, e o primeiro foi testado com jogadores até perto do lançamento.</p>,
                  source: commentary("2:40"),
                },
                {
                  title: "A história de quem fez",
                  children: (
                    <p>
                      Em 2018, a Maddy contou ao Kotaku que ligou o tema do jogo à própria ansiedade e que não sabia como a história terminaria, porque ainda estava lidando com isso enquanto fazia o jogo. Também disse que levou um tempo pra entender que trabalhar demais pode ser uma forma de se machucar.
                    </p>
                  ),
                  source: { label: "Kotaku (2018)", href: "https://kotaku.com/celeste-taught-fans-and-its-own-creator-to-take-better-1825305692" },
                },
                {
                  title: "O código da Madeline é público",
                  children: (
                    <p>
                      Cinco semanas depois do lançamento, o Noel publicou o arquivo que controla a Madeline, como material de estudo. Quando criticaram o tamanho dele, os dois escreveram uma defesa: num jogo de plataforma, a ordem das coisas importa, e um arquivo só deixa ver essa ordem.
                    </p>
                  ),
                  source: { label: "O repositório do Noel Berry no GitHub", href: "https://github.com/NoelFB/Celeste" },
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "musica",
        title: "A música e o som",
        body: (
          <div className="space-y-8">
            <Facts
              items={[
                {
                  title: "A compositora veio do Bandcamp",
                  children: (
                    <p>
                      A Lena Raine, de Seattle, tinha passado seis anos na ArenaNet, de Guild Wars 2, e publicava música própria no Bandcamp como Kuraine. A Maddy chegou nela pela rede de amigos do mundo indie, e ela entrou no segundo semestre de 2016. A música do Prólogo e dos dois primeiros capítulos já tinha sido começada pela Maddy, que avisou: nada daquilo era uma direção a seguir.
                    </p>
                  ),
                  source: lenaBandcamp,
                },
                {
                  title: "Devagar de propósito",
                  children: <p>A Lena diz que a música acompanha quase um pra um o que a Madeline está sentindo, que deixou o andamento tranquilo em muitos lugares pra não aumentar o estresse de quem joga, e que tem sempre um piano macio pra onde voltar.</p>,
                  source: [{ label: "Lena Raine ao Game Developer (2018)", href: GAME_DEVELOPER }, lenaBandcamp],
                },
                {
                  title: "Um instrumento por personagem",
                  children: <p>Cada personagem tem o seu, e o da Madeline é o piano. O piano do jogo é um plugin chamado Felt Piano, que imita um piano com feltro abafando as cordas.</p>,
                  source: lena,
                },
                {
                  title: "As vozes são um sintetizador atuado",
                  children: (
                    <p>
                      Ninguém dublou Celeste. Kevin Regamey, da Power Up Audio, fez as vozes num sintetizador, imitando o formato das vogais, e “atuou” cada emoção lendo o roteiro e tocando num teclado. Cada expressão dos retratos chama a emoção certa: a Madeline tem onze. É uma evolução das vozes que ele tinha feito pro TowerFall.
                    </p>
                  ),
                  source: { label: "Kevin Regamey, no Twitter (2021)", href: "https://twitter.com/regameyk/status/1416483583053602816" },
                },
                {
                  title: "O projeto de som é público",
                  children: <p>Em maio de 2018, a Power Up Audio liberou o projeto inteiro de som e música do jogo pra quem quisesse estudar, com as anotações do Kevin explicando cada decisão.</p>,
                  source: { label: "Game Developer, 1º de maio de 2018" },
                },
                {
                  title: "Indicada, e premiada pelos colegas",
                  children: <p>A trilha saiu no Bandcamp no mesmo dia do jogo, com um álbum de remixes junto. Concorreu a melhor trilha no The Game Awards 2018 e perdeu pra Red Dead Redemption 2. No ano seguinte, os próprios desenvolvedores deram a Celeste o prêmio de melhor áudio no Game Developers Choice Awards.</p>,
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "ideias",
        title: "As ideias",
        body: (
          <div className="space-y-8">
            <Facts
              items={[
                {
                  title: "O jogo rouba a seu favor",
                  children: (
                    <p>
                      Num texto que começou como uma sequência de posts, a Maddy lista os truques que deixam Celeste mais justo do que parece, como o {technique("coyote-time", "coyote time")}, o {technique("buffer", "buffer de comandos")} e a {technique("correcao-de-quina", "correção de quina")}. Ela diz que eles não inventaram nenhum, e que todos alargam um pouquinho as janelas a favor de quem joga.
                    </p>
                  ),
                  source: { label: "Maddy Thorson, Celeste & Forgiveness", href: FORGIVENESS },
                },
                {
                  title: "O modo de ajuda já se chamou modo de trapaça",
                  children: (
                    <p>
                      Ele entrou tarde no jogo, chamado “Cheat Mode”, e trocaram o nome porque soava como julgamento. Em 2019, o texto que apresenta o modo mudou por causa da crítica de duas pessoas, entre elas o speedrunner halfcoordinated, que joga com uma mão só. Os dois estão nos agradecimentos dos créditos.
                    </p>
                  ),
                  source: { label: "VICE (2018 e 2019)", href: "https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility" },
                },
                {
                  title: "Em português, o modo de ajuda é ainda mais gentil",
                  children: <p>O inglês diz que o jogo foi feito pra ser desafiador e recompensador. A versão brasileira diz “desafiador, mas acessível”.</p>,
                  source: { label: "No próprio jogo: o texto do modo de ajuda" },
                },
                {
                  title: "Morango não vale nada",
                  children: <p>Os cartões-postais do começo dos capítulos avisam: morangos só servem pra impressionar os amigos, e quanto mais você morre, mais aprende. Mesmo assim, eu vou atrás de todos.</p>,
                  source: { label: "No próprio jogo: os cartões dos capítulos 2 e 3" },
                },
              ]}
            />
            <Quote by="Maddy Thorson, Celeste & Forgiveness" href={FORGIVENESS} original="I think that this is a big reason why Celeste can feel kind even though it's very difficult — it wants you to succeed.">
              Acho que esse é um dos grandes motivos de Celeste parecer gentil mesmo sendo muito difícil: ele quer que você consiga.
            </Quote>
          </div>
        ),
      },
      {
        id: "depois",
        title: "Depois",
        body: (
          <Milestones
            items={[
              { when: "2018", title: "O lançamento", children: "25 de janeiro, no PC, Switch e PS4. Cinco dias depois, os fãs já tinham criado o Everest, o carregador de mods que roda até hoje." },
              { when: "2018", title: "The Game Awards", children: "Melhor jogo independente e Games for Impact, o prêmio de jogo com impacto social. Concorreu a jogo do ano e perdeu pro God of War." },
              { when: "2019", title: "Um capítulo de graça e um estúdio novo", children: "Em setembro, um capítulo novo, sem custo. No mesmo mês, a equipe virou o Extremely OK Games, em Vancouver." },
              { when: "2021", title: "Celeste Classic 2", children: "Outro jogo de PICO-8, com outra protagonista, feito em três dias pro terceiro aniversário." },
              { when: "2024", title: "Celeste 64", children: "Um Celeste em 3D feito em mais ou menos uma semana pro sexto aniversário, com o código aberto." },
              { when: "2025", title: "O fim do Earthblade", children: "O jogo seguinte da equipe foi cancelado. Entre os motivos, a Maddy citou um desentendimento com o Pedro Medeiros sobre os direitos de Celeste. O Pedro seguiu num jogo próprio." },
            ]}
          />
        ),
      },
    ],
  }
}
