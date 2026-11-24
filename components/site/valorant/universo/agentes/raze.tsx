import { Beside, Facts, Milestones, Picture, Quote, Reading, SourceLine, Text, type Source } from "@/components/site/lore"
import type { Historia } from "@/components/site/valorant/universo/agentes/historia"
import { Bio, Habilidades, Vozes } from "@/components/site/valorant/universo/blocos"
import { CatalogoFalas } from "@/components/site/valorant/universo/catalogo-falas"
import { Conversas, Linhas } from "@/components/site/valorant/universo/falas"
import { fonte } from "@/content/valorant-universo/fontes"
import { agentes, daAgente, delaDele } from "@/lib/valorant-universo"

/**
 * Raze, the first agent page (2026-11-23), from the research in ~/.local/share/muanlartins/valorant-lore/raze/
 * (dossie.md, every fact with its source and tier; the UFRJ thesis read whole) and her lines from the game's files.
 * A fact only the fan wikis give is said as theirs; a reading of mine is sealed "minha".
 */

const de = (id: string, label: string): Source => ({ label, href: fonte(id).url })

export const raze: Historia = ({ agente, falas }) => {
  const linhas = (ids: string[], className?: string) => <Linhas agent={agente.id} falas={falas} ids={ids} className={className} />
  return {
    lede: "Tayane Alves, a Tatá, de Salvador: a agente brasileira do Valorant, que quase foi de outro país e na dublagem fala baiano.",
    fontes: [
      "jogo",
      "valorant-api",
      "riot-artigo-raze-ptbr",
      "riot-artigo-raze-en",
      "opovo-nottingham",
      "tcc-ufrj-mello-2023",
      "ovicast-marina-santana",
      "marina-santana-canal-youtube",
      "yt-bastidores",
      "yt-a-cor-da-cidade",
      "yt-o-que-for-bom",
      "yt-mixtape-live-raze",
      "olhar-digital-baianasystem",
      "ravassa-betka-highlights",
      "ravassa-lyerly-highlights",
      "ravassa-nottingham-highlights",
      "sportskeeda-ravassa",
      "tw-kingkut-breakdance",
      "tw-kingkut-breach-arms",
      "tw-512-post5",
      "tw-davidnotty-canonical",
      "tw-agents-of-romance",
      "tw-valorantbrasil-girias",
      "yt-warm-up",
      "yt-revelation",
      "yt-why-we-fight-back",
      "api-contracts",
      "api-cosmeticos",
      "kokido-post-x",
      "fandom-valorant-protocol",
      "fandom-range-lore",
      "fandom-wiki",
      "lore-wiki-raze",
      "lore-wiki-nanobomb",
      "dublagem-wiki",
    ],
    sections: [
      {
        id: "quem-e",
        title: "Quem é",
        body: (
          <div className="space-y-8">
            <Beside media={<Picture src={agente.retrato} alt="A Raze, de boné laranja, fones e o lança-granadas no ombro" width={991} height={900} />}>
              <Bio agente={agente} />
            </Beside>
            <Text>
              <p>
                O nome dela é Tayane Alves, Tatá pros amigos. A ficha da agente número 12 diz que ela é filha da cidade que ama, Salvador, onde pintava com grafite os terrenos que a Kingdom
                abandonava. Chegou junto com o beta fechado, em abril de 2020.
              </p>
            </Text>
            <Quote original="Tayane Alves. Tatá to friends. Daughter of her beloved city." by="O dossiê dela, espalhado em Ascent no patch 4.04" href={fonte("fandom-valorant-protocol").url}>
              Tayane Alves. Tatá pros amigos. Filha da cidade que ama.
            </Quote>
          </div>
        ),
      },
      {
        id: "salvador",
        title: "Por que Salvador",
        description: "A Raze quase nasceu de outro país, e foi a Riot Brasil que escolheu a cidade.",
        body: (
          <div className="space-y-8">
            <Reading seal="devs" title="O kit veio antes da nacionalidade">
              <p>
                Em 2025, o diretor criativo do Valorant, David Nottingham, contou que o kit da Raze estava pronto desde o começo, mas a identidade não combinava com ele. A
                reformulação incluiu “a mudança de nacionalidade e persona”. A decisão de fazê-la afro-brasileira levou a Salvador.
              </p>
              <SourceLine source={de("opovo-nottingham", "David Nottingham ao O POVO+ (2025)")} />
            </Reading>
            <Reading seal="devs" title="São Paulo, Rio ou Salvador?">
              <p>
                A pergunta foi feita ao escritório brasileiro da Riot. A resposta veio com o argumento: a primeira capital do país, o coração cultural, uma das cidades com mais negros fora
                da África, a terra do Carnaval. Gabriel dos Anjos, da Riot Brasil, resume a personalidade dela: “Nós, brasileiros, costumamos nos ver como chamativos, espertos,
                irreverentes e criativos.”
              </p>
              <SourceLine source={de("riot-artigo-raze-ptbr", "Riot Games, “Como os Rioters brasileiros ajudaram a criar Raze” (2022)")} />
            </Reading>
            <Reading seal="devs" title="Grafite, breaking e baile funk">
              <p>
                As inspirações citadas pela Riot são o grafite, as batalhas de B-boys e B-girls e a ligação delas com a capoeira, o baile funk e o hip hop brasileiro. No Discord de lore,
                Nottingham contou que ela fez parte de uma crew de breaking em Salvador.
              </p>
              <SourceLine source={[de("opovo-nottingham", "O POVO+ (2025)"), de("tw-kingkut-breakdance", "Riot KingKut no Discord de lore (2021)")]} />
            </Reading>
            <Reading seal="jogo" title="O que sobrou da Raze de antes">
              <p>
                Nos arquivos do jogo, ela continua se chamando Clay. Um dos sprays do contrato dela se chama Bombshell, nome que as wikis dizem ter aparecido em falas antigas,
                tiradas antes do lançamento.
              </p>
              <SourceLine source={[{ label: "Os arquivos do jogo" }, de("api-contracts", "O contrato “Equipamentos da Raze”"), de("fandom-wiki", "VALORANT Wiki")]} />
            </Reading>
          </div>
        ),
      },
      {
        id: "historia",
        title: "A história",
        description: "O que o jogo e a Riot contaram até a temporada de 2026.",
        body: (
          <div className="space-y-8">
            <Text>
              <p>
                Antes do Protocolo, a Raze tinha um passado fora da lei com o Breach. O dossiê dele lista “a viagem a Salvador” entre os crimes, e foi ela quem turbinou os braços
                mecânicos dele. Na sede, ela é a que quebra os aparelhos do Cypher e chama o Brimstone de chefinho.
              </p>
            </Text>
            <Milestones
              items={[
                { when: "2021", title: "A Cor da Cidade", children: "Ela é a protagonista do clipe do primeiro aniversário: conserta o Boom Bot na oficina e sai pra Split dizendo “É hora do reggae!”." },
                { when: "2022", title: "WARM UP", children: "Com a Killjoy, transforma um robô de limpeza no Max Bot e gruda uma Carga de Explosivos nas costas dele." },
                { when: "2022", title: "A ressaca de Berlim", children: "Depois de um show com a Killjoy e o Phoenix, acorda sozinha na ilha deserta do Breeze e pede resgate por uma antena de sucata: “Blame Phoenix!”." },
                { when: "2023", title: "REVELATION", children: "Aparece a Raze da Terra Ômega, num jantar em Seul com a Killjoy e a Jett de lá." },
                { when: "2023", title: "“My past isn't perfect, Chefinho”", children: "O Omen desconfia que ela anda roubando combustível. Num e-mail ao Brimstone, ela se defende: honestidade é a vibe dela." },
                { when: "2026", title: "WHY WE FIGHT BACK", children: "Está no complexo da Reyna, no México, quando a Legion ataca. Os agentes da Terra Alfa caem; só a Killjoy escapa." },
              ]}
            />
            <SourceLine source={[de("yt-a-cor-da-cidade", "A Cor da Cidade"), de("yt-warm-up", "WARM UP"), de("fandom-range-lore", "Os e-mails e recados do Range"), de("yt-revelation", "REVELATION"), de("yt-why-we-fight-back", "WHY WE FIGHT BACK"), de("tw-kingkut-breach-arms", "Os braços do Breach")]} />
            <Reading seal="fas" title="A Raze foi trocada em Berlim?">
              <p>Uma teoria dos fãs diz que a Raze que acordou no Breeze é a da Terra Ômega, trocada na noite do show. A Riot nunca confirmou nem negou.</p>
              <SourceLine source={de("lore-wiki-raze", "VALORANT Lore Wiki")} />
            </Reading>
          </div>
        ),
      },
      {
        id: "killjoy",
        title: "Raze e Killjoy",
        description: "O primeiro casal oficial do Valorant, depois de quase dois anos de pistas.",
        body: (
          <div className="space-y-8">
            <Milestones
              items={[
                { when: "01/04/2021", title: "Agents of Romance", children: "No 1º de abril, o Cypher diz que viu Raze e Killjoy fazendo piquenique na praia." },
                { when: "06/2021", title: "A namoradeira", children: "Em A Cor da Cidade, uma namoradeira com a cara da Killjoy aparece numa janela de Salvador." },
                { when: "11/12/2022", title: "O beijo", children: "Nas férias da equipe em Salvador, a Raze manda trazer da sede o gorro que a Killjoy perdeu. No último post, as duas se beijam numa festa. Nottingham responde: “Canonical”." },
                { when: "2024", title: "Moqueca", children: "Num recado do Range, a Raze desiste de tirar a Killjoy dos arquivos que ela estuda e decide fazer moqueca: “Killjoy loves moqueca!”." },
              ]}
            />
            <SourceLine source={[de("tw-agents-of-romance", "Agents of Romance"), de("lore-wiki-nanobomb", "VALORANT Lore Wiki, a namoradeira"), de("tw-512-post5", "O post do beijo"), de("tw-davidnotty-canonical", "David Nottingham"), de("fandom-range-lore", "Os recados do Range")]} />
            {linhas(["clay-match-startally-killjoy-01", "clay-e02-match-startconversation-claykilljoy-01", "killjoy-e02-match-startconversation-claykilljoy-01"])}
            <Reading seal="minha" title="Estraga-prazeres">
              <p>
                A ult dela, Showstopper, ganhou em português o nome Estraga-prazeres: quem arruína a diversão dos outros, o sentido de killjoy em inglês. Nenhuma fonte da Riot comenta,
                mas a ult da Raze leva, na dublagem, o nome da namorada.
              </p>
            </Reading>
          </div>
        ),
      },
      {
        id: "musica",
        title: "A Cor da Cidade",
        description: "Os clipes da Raze, gravados com Salvador e com a música da Bahia.",
        body: (
          <div className="space-y-8">
            <Reading seal="devs" title="O Canto da Cidade que nunca tinha sido licenciado">
              <p>
                Pro primeiro aniversário, a Riot Brasil quis um clássico da Bahia. A gravadora avisou que Daniela Mercury nunca tinha licenciado O Canto da Cidade, desde 1992. Quando
                ouviu quem era a Raze, “uma mulher forte, determinada e independente que foi criada nas ruas de Salvador”, ela liberou a música e pediu uma coisa: regravar ela mesma.
              </p>
              <SourceLine source={de("riot-artigo-raze-ptbr", "Riot Games (2022)")} />
            </Reading>
            <Facts
              items={[
                {
                  title: "Em português até na versão em inglês",
                  children: "No clipe, a Raze fala português, e o inglês vem só na legenda. O Boom Bot, que ela chama de Binho, virou Beebee, e “É hora do reggae!” virou “Time for the showdown!”.",
                  source: de("yt-a-cor-da-cidade", "A Cor da Cidade"),
                },
                {
                  title: "Briga de Rua 2 e o Rito Gomes",
                  children: "O fliperama da oficina homenageia o Street Fighter 2 pirata dos fliperamas de rodoviária. Na rua, o restaurante se chama Rito Gomes, um trocadilho com Riot Games.",
                  source: de("yt-bastidores", "A live de bastidores da Riot Brasil e da Lightfarm (2021)"),
                },
                {
                  title: "O Boitatá na fachada",
                  children: "O grafite da oficina, numa fachada que lembra o Pelourinho, foi escolhido por ser “uma lenda totalmente brasileira, indígena”.",
                  source: de("yt-bastidores", "A live de bastidores (2021)"),
                },
                {
                  title: "BaianaSystem dentro do jogo",
                  children: "Na mesma semana, o BaianaSystem fez um show no Valorant, publicado como Mixtape Live Raze. A faixa Saci, deles, já tinha sido a trilha do lançamento do jogo no Brasil.",
                  source: [de("yt-mixtape-live-raze", "Mixtape Live Raze"), de("olhar-digital-baianasystem", "Olhar Digital (2021)")],
                },
                {
                  title: "O que for bom! (2022)",
                  children: "O segundo clipe passeia pelas ruas de Salvador ao som de Banho de Folhas, de Luedji Luna. Nos créditos estão as comunidades do Candeal e do Solar do Unhão, baianas, percussionistas e um capoeirista.",
                  source: de("yt-o-que-for-bom", "O que for bom!"),
                },
              ]}
            />
          </div>
        ),
      },
      {
        id: "habilidades",
        title: "As habilidades",
        description: "O nome de cada uma no cliente brasileiro e no original, e como os arquivos do jogo as chamam.",
        body: (
          <Habilidades
            agente={agente}
            notas={{
              C: (
                <p className="text-muted">
                  Nos arquivos, Boomba. É a única habilidade dela com uma árvore de comportamento, o “cérebro” que faz o robô andar e perseguir sozinho. No clipe, ela o chama de Binho, e
                  um card do jogo se chama Diagrama: Bumbinho.
                </p>
              ),
              Q: <p className="text-muted">Nos arquivos, Satchel, uma mochila de explosivos. Os arquivos antigos que ficaram guardados nela se chamam C4.</p>,
              E: <p className="text-muted">Nos arquivos, ClusterGrenade, a granada de fragmentação.</p>,
              X: <p className="text-muted">Nos arquivos, RocketLauncher. Na pasta antiga da ult ainda há restos de um detonador.</p>,
            }}
          />
        ),
      },
      {
        id: "vozes",
        title: "As vozes",
        body: (
          <div className="space-y-8">
            <Vozes
              agente={agente}
              extra={{
                pt: (
                  <p>
                    Paulistana, filha de um baiano de Feira de Santana: o sotaque veio do pai, ajustado pra Salvador com uma consultora soteropolitana e o diretor Marcelo Campos. Fez o
                    teste sem saber que a personagem era baiana.
                  </p>
                ),
                en: (
                  <p>
                    Colombiana, de Cali. A fala mais famosa da Raze nasceu de um erro de leitura dela, e o “boom” fofo saiu sem querer entre um take e outro: a direção gostou e ficou.
                  </p>
                ),
              }}
            />
            <SourceLine source={[de("ovicast-marina-santana", "Marina Santana ao OVICAST (2022)"), de("sportskeeda-ravassa", "Carolina Ravassa à Sportskeeda (2021)"), de("ravassa-lyerly-highlights", "Carolina Ravassa e David Lyerly (2021)")]} />
            <Reading seal="devs" title="“Wait...”">
              <p>
                A fala estava escrita certa. Carolina Ravassa errou o ditado na gravação, e os roteiristas acharam que combinava: a Raze conta piada mal de propósito. O “Wait...” ficou no
                jogo. Na dublagem, ela diz o ditado certo e termina com “Não, pera” mesmo assim.
              </p>
              <SourceLine source={de("ravassa-betka-highlights", "Carolina Ravassa e o roteirista Zach Betka (2020)")} />
            </Reading>
            {linhas(["clay-matchstart03"])}
            <Text>
              <p>No Japão, ela tem a voz de Kokido Shiho, que confirmou o papel em 2021.</p>
            </Text>
            <SourceLine source={de("kokido-post-x", "O post de Kokido Shiho (2021)")} />
          </div>
        ),
      },
      {
        id: "baiana",
        title: "Baiana na dublagem",
        description: "Em inglês ela é brasileira. Em português, ela é de Salvador.",
        body: (
          <div className="space-y-8">
            <Text>
              <p>
                Em 2023, um trabalho de conclusão de curso da Faculdade de Letras da UFRJ estudou a localização da Raze. A conclusão: “em português brasileiro, a Raze é baiana, mais do que
                brasileira”. O exemplo que dá título ao trabalho é a ult. Em inglês, “Here comes the party!”. Na dublagem, “Chegou o reggae!”, e em Salvador reggae quer dizer festa.
              </p>
            </Text>
            <SourceLine source={de("tcc-ufrj-mello-2023", "Luis Gustavo Gonçalves de Mello, “Chegou o reggae” (UFRJ, 2023)")} />
            {linhas(["clay-abilityxequipallies03", "clay-matchstart05", "clay-roundstartally-sarge-01", "clay-matchstartally-wushu-01", "clay-roundstartgeneric03"])}
            <Text>
              <p>
                Barril é bom, barrear o baba é atrapalhar o esquema. Em 2020, o próprio VALORANT Brasil fez um vídeo explicando as gírias dela: “Bora tocá um rebu!”. O TCC não sabe dizer
                se as falas nasceram em inglês ou em português, e nota que nenhuma das versões apagou o sotaque, contra o costume da indústria americana.
              </p>
            </Text>
            <SourceLine source={[de("tcc-ufrj-mello-2023", "O TCC, p. 18–26"), de("tw-valorantbrasil-girias", "VALORANT Brasil (2020)")]} />
          </div>
        ),
      },
      {
        id: "portugues",
        title: "Português no original",
        description: "Mesmo em inglês, ela solta palavras em português. E os colegas tentam falar com ela também.",
        body: linhas([
          "clay-matchstart01",
          "clay-match-startattacker01",
          "clay-match-start-pitt-01",
          "clay-roundstartenemy-clay-01",
          "clay-match-startconversation-claysarge-01",
          "clay-kill04-alt",
          "breach-e02-roundstart-allycommend-clay-01",
        ]),
      },
      { id: "conversas", title: "As conversas", description: "O que ela troca com os colegas quando a partida começa com os dois no mesmo time.", body: <Conversas agent={agente.id} falas={falas} /> },
      {
        id: "curiosidades",
        title: "Curiosidades",
        body: (
          <Facts
            items={[
              { title: "Pistolinha", children: "A última recompensa do contrato dela é a skin Pistolinha Classic, com o nome em português até no cliente em inglês.", source: de("api-contracts", "O contrato da Raze") },
              {
                title: "Sorria, você está na Bahia",
                children: "O card Raze Days, com ela de água de coco numa ladeira de casario colorido, ganhou em português o slogan turístico da Bahia. O card Rising up virou Arrasadora: em inglês, to raze é arrasar.",
                source: de("api-cosmeticos", "Os cards do jogo, nos dois idiomas"),
              },
              { title: "Lillsyrran", children: "Quando a Raze inimiga cai, o Breach diz “Foi mal, lillsyrran”, nas duas línguas. Em sueco, a língua dele, lillsyrran é irmãzinha.", media: linhas(["breach-roundend-lastkill-clay-01"]) },
            ]}
          />
        ),
      },
      {
        id: "falas",
        title: "Todas as falas",
        description: "Cada fala dela no jogo, e as dos colegas sobre ela, na dublagem e no original. Transcritas a partir do áudio.",
        body: (
          <CatalogoFalas
            agent={agente.id}
            de={daAgente(agente)}
            dele={delaDele(agente)}
            falas={falas.map(({ id, quem, quando, com, pt, en }) => ({ id, quem, quando, com, pt, en }))}
            nomes={Object.fromEntries(agentes().map((each) => [each.id, each.nome]))}
          />
        ),
      },
    ],
  }
}
