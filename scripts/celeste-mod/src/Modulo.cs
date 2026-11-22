// MuanlartinsLink: Celeste reported to the stream's overlays (README.md beside src/). An EverestModule that changes
// nothing in the game: every hook calls the game's own method first, unchanged, and only then looks at what happened;
// whatever goes wrong in the looking is caught and logged once, never thrown back into the game.
//
// Where the moments come from (names checked against the installed Celeste.dll and MMHOOK_Celeste.dll):
//   Everest's events   Level.OnEnter (capitulo_inicio), Level.OnComplete (capitulo_fim), Level.OnExit (saiu),
//                      Level.OnTransitionTo (sala), Level.OnLoadLevel and Level.OnAfterUpdate (the state, read every
//                      frame and sent when it changes), Player.OnDie (morte), Player.OnSpawn after a death
//                      (renasceu), Celeste.OnSceneTransition (menus, loading, the end screen)
//   On.Celeste hooks   Player.DashBegin + Player.CallDashEvents (dash: the dash starts in DashBegin, but its
//                      direction is only set when the game counts it, in CallDashEvents), Player.RefillDash and
//                      Player.UseRefill (recarga: landing and the like, the crystals), Player.StarFlyBegin and
//                      Player.StarFlyEnd (pena_inicio, pena_fim; pena_aviso when the game's own warning starts, at
//                      half a second left), Strawberry.CollectRoutine (morango, with the game's chain index),
//                      HeartGem.Collect (coracao), Cassette.CollectRoutine (fita), SaveData.Start (a file picked)
//   read each frame    Player.Speed, Player.Stamina, Player.Leader.Followers, Level.Wind and, every quarter second,
//                      the level's BadelineOldsite (what the filter moves with: `Extras`)
// All of them are taken off again in Unload.

using System;
using System.Buffers;
using System.Collections;
using System.Diagnostics;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.Xna.Framework;
using Monocle;

namespace Celeste.Mod.MuanlartinsLink {
    public class MuanlartinsLinkModule : EverestModule {
        public static MuanlartinsLinkModule Instance;
        private readonly Servidor servidor = new Servidor();
        private Relator relator;

        public MuanlartinsLinkModule() {
            Instance = this;
        }

        public override void Load() {
            relator = new Relator(servidor);
            relator.Ligar();
            servidor.Iniciar();
        }

        public override void Unload() {
            relator?.Desligar();
            servidor.Parar();
        }
    }

    /// <summary>Reads the game on its own thread and hands the messages to the server.</summary>
    public sealed class Relator {
        private const double ESTADO_MIN_MS = 100; // at most ~10 states a second
        private const double BATIDA_MS = 5000; // a state every 5 s in a level anyway (the clocks resync)
        private const double CORRENDO_MS = 250; // the chapter's clock counts as running this long after it moved
        private const double PROCURAR_MS = 250; // how often the level's entities are looked through for Badelines
        private const float CANSADO = 20f; // the game's own stamina threshold for her red flashing
        private const float PASSO_VELOCIDADE = 30f; // speed and wind are told in steps of this many pixels a second

        private static Relator eu;
        private readonly Servidor servidor;
        private readonly Stopwatch relogio = Stopwatch.StartNew();
        private readonly ArrayBufferWriter<byte> buffer = new ArrayBufferWriter<byte>(2048);
        private static readonly FieldInfo campoNoChao = typeof(Player).GetField("onGround", BindingFlags.Instance | BindingFlags.NonPublic);
        private static readonly FieldInfo campoBolhaVermelha = typeof(Player).GetField("boostRed", BindingFlags.Instance | BindingFlags.NonPublic);
        private static readonly FieldInfo campoPena = typeof(Player).GetField("starFlyTimer", BindingFlags.Instance | BindingFlags.NonPublic);

        private Chave ultimaChave;
        private bool temChave, pendente;
        private double estadoEm = -1e9;
        private long tempoAntes = -1;
        private double tempoMexeuEm = -1e9;
        private bool dashPendente, morreu, voando, avisouPena;
        private Scene cena;
        private Extras extras;
        private int perseguindo;
        private double procureiEm = -1e9;
        private readonly System.Collections.Generic.HashSet<string> falhas = new System.Collections.Generic.HashSet<string>();

        public Relator(Servidor servidor) {
            this.servidor = servidor;
        }

        private double Agora => relogio.Elapsed.TotalMilliseconds;

        // ---------- hooks ----------
        public void Ligar() {
            eu = this;
            Everest.Events.Level.OnEnter += AoEntrar;
            Everest.Events.Level.OnExit += AoSair;
            Everest.Events.Level.OnComplete += AoCompletar;
            Everest.Events.Level.OnTransitionTo += AoTrocarDeSala;
            Everest.Events.Level.OnLoadLevel += AoCarregarSala;
            Everest.Events.Level.OnAfterUpdate += AoAtualizar;
            Everest.Events.Player.OnDie += AoMorrer;
            Everest.Events.Player.OnSpawn += AoNascer;
            Everest.Events.Celeste.OnSceneTransition += AoTrocarDeCena;
            On.Celeste.Player.DashBegin += GanchoDashBegin;
            On.Celeste.Player.CallDashEvents += GanchoCallDashEvents;
            On.Celeste.Player.RefillDash += GanchoRefillDash;
            On.Celeste.Player.UseRefill += GanchoUseRefill;
            On.Celeste.Player.StarFlyBegin += GanchoStarFlyBegin;
            On.Celeste.Player.StarFlyEnd += GanchoStarFlyEnd;
            On.Celeste.Strawberry.CollectRoutine += GanchoMorango;
            On.Celeste.HeartGem.Collect += GanchoCoracao;
            On.Celeste.Cassette.CollectRoutine += GanchoFita;
            On.Celeste.SaveData.Start += GanchoArquivo;
            if (campoNoChao == null || campoPena == null || campoBolhaVermelha == null) Logger.Warn("MuanlartinsLink", "campos do Player não encontrados (onGround, starFlyTimer, boostRed): chão, aviso da pena ou cor da bolha ficam de fora");
        }

        public void Desligar() {
            Everest.Events.Level.OnEnter -= AoEntrar;
            Everest.Events.Level.OnExit -= AoSair;
            Everest.Events.Level.OnComplete -= AoCompletar;
            Everest.Events.Level.OnTransitionTo -= AoTrocarDeSala;
            Everest.Events.Level.OnLoadLevel -= AoCarregarSala;
            Everest.Events.Level.OnAfterUpdate -= AoAtualizar;
            Everest.Events.Player.OnDie -= AoMorrer;
            Everest.Events.Player.OnSpawn -= AoNascer;
            Everest.Events.Celeste.OnSceneTransition -= AoTrocarDeCena;
            On.Celeste.Player.DashBegin -= GanchoDashBegin;
            On.Celeste.Player.CallDashEvents -= GanchoCallDashEvents;
            On.Celeste.Player.RefillDash -= GanchoRefillDash;
            On.Celeste.Player.UseRefill -= GanchoUseRefill;
            On.Celeste.Player.StarFlyBegin -= GanchoStarFlyBegin;
            On.Celeste.Player.StarFlyEnd -= GanchoStarFlyEnd;
            On.Celeste.Strawberry.CollectRoutine -= GanchoMorango;
            On.Celeste.HeartGem.Collect -= GanchoCoracao;
            On.Celeste.Cassette.CollectRoutine -= GanchoFita;
            On.Celeste.SaveData.Start -= GanchoArquivo;
            if (eu == this) eu = null;
        }

        /// <summary>Runs the looking; a failure is logged once per place and never reaches the game.</summary>
        private void Seguro(string onde, Action acao) {
            try {
                acao();
            } catch (Exception e) {
                if (falhas.Add(onde)) Logger.Warn("MuanlartinsLink", $"{onde}: {e}");
            }
        }

        private static void GanchoDashBegin(On.Celeste.Player.orig_DashBegin orig, Player self) {
            orig(self);
            if (eu != null) eu.dashPendente = true;
        }

        private static void GanchoCallDashEvents(On.Celeste.Player.orig_CallDashEvents orig, Player self) {
            bool pendente = eu != null && eu.dashPendente;
            if (eu != null) eu.dashPendente = false;
            orig(self);
            if (pendente) eu.Seguro("dash", () => eu.Dash(self));
        }

        private static bool GanchoRefillDash(On.Celeste.Player.orig_RefillDash orig, Player self) {
            int antes = self.Dashes;
            bool r = orig(self);
            if (r && self.Dashes > antes && eu != null) eu.Seguro("recarga", () => eu.Recarga(self, NoChao(self) ? "chao" : "outro"));
            return r;
        }

        private static bool GanchoUseRefill(On.Celeste.Player.orig_UseRefill orig, Player self, bool twoDashes) {
            int antes = self.Dashes;
            bool r = orig(self, twoDashes);
            if (r && self.Dashes > antes && eu != null) eu.Seguro("recarga", () => eu.Recarga(self, "cristal"));
            return r;
        }

        private static void GanchoStarFlyBegin(On.Celeste.Player.orig_StarFlyBegin orig, Player self) {
            orig(self);
            if (eu == null) return;
            eu.voando = true;
            eu.avisouPena = false;
            eu.Seguro("pena", () => eu.Evento("pena_inicio", w => w.WriteNumber("duracao", 2)));
        }

        private static void GanchoStarFlyEnd(On.Celeste.Player.orig_StarFlyEnd orig, Player self) {
            orig(self);
            if (eu == null || !eu.voando) return;
            eu.voando = false;
            eu.Seguro("pena", () => eu.Evento("pena_fim", null));
        }

        private static IEnumerator GanchoMorango(On.Celeste.Strawberry.orig_CollectRoutine orig, Strawberry self, int collectIndex) {
            var r = orig(self, collectIndex);
            eu?.Seguro("morango", () => {
                eu.Evento("morango", w => {
                    w.WriteBoolean("dourado", self.Golden);
                    w.WriteBoolean("lua", self.Moon);
                    w.WriteBoolean("alado", self.Winged);
                    w.WriteNumber("indice", collectIndex);
                });
                eu.pendente = true;
            });
            return r;
        }

        private static void GanchoCoracao(On.Celeste.HeartGem.orig_Collect orig, HeartGem self, Player player) {
            orig(self, player);
            if (self.IsFake) return;
            eu?.Seguro("coracao", () => {
                eu.Evento("coracao", w => w.WriteBoolean("repetido", self.IsGhost));
                eu.pendente = true;
            });
        }

        private static IEnumerator GanchoFita(On.Celeste.Cassette.orig_CollectRoutine orig, Cassette self, Player player) {
            var r = orig(self, player);
            eu?.Seguro("fita", () => {
                eu.Evento("fita", w => w.WriteBoolean("repetida", self.IsGhost));
                eu.pendente = true;
            });
            return r;
        }

        private static void GanchoArquivo(On.Celeste.SaveData.orig_Start orig, SaveData data, int slot) {
            orig(data, slot);
            eu?.Seguro("arquivo", () => eu.MandarEstado());
        }

        private void AoEntrar(Session session, bool fromSaveData) {
            Seguro("entrar", () => {
                morreu = voando = false;
                Evento("capitulo_inicio", w => {
                    Capitulo(w, session);
                    w.WriteBoolean("continuando", fromSaveData);
                });
                pendente = true;
            });
        }

        private void AoCompletar(Level level) {
            Seguro("completar", () => {
                var s = level.Session;
                Evento("capitulo_fim", w => {
                    Capitulo(w, s);
                    w.WriteNumber("mortes", s.Deaths);
                    w.WriteNumber("tempo", s.Time / TimeSpan.TicksPerMillisecond);
                    w.WriteNumber("morangos", s.Strawberries.Count);
                });
                pendente = true;
            });
        }

        private void AoSair(Level level, LevelExit exit, LevelExit.Mode mode, Session session, HiresSnow snow) {
            Seguro("sair", () => {
                if (voando) Evento("pena_fim", null);
                voando = morreu = false;
                Evento("saiu", w => {
                    w.WriteString("modo", mode.ToString());
                    if (session != null) Capitulo(w, session);
                });
            });
        }

        private void AoTrocarDeSala(Level level, LevelData next, Vector2 direction) {
            Seguro("sala", () => {
                Evento("sala", w => {
                    w.WriteString("de", level.Session.Level);
                    w.WriteString("para", next.Name);
                    Direcao(w, direction);
                });
                pendente = true;
            });
        }

        private void AoCarregarSala(Level level, Player.IntroTypes intro, bool isFromLoader) {
            pendente = true;
        }

        private void AoMorrer(Player player) {
            Seguro("morte", () => {
                if (voando) Evento("pena_fim", null);
                voando = false;
                morreu = true;
                var s = (player.Scene as Level)?.Session;
                Evento("morte", w => {
                    if (s != null) {
                        w.WriteNumber("mortes", s.Deaths);
                        w.WriteString("sala", s.Level);
                    }
                });
                MandarEstado();
            });
        }

        private void AoNascer(Player player) {
            Seguro("renasceu", () => {
                if (morreu) Evento("renasceu", null);
                morreu = false;
                pendente = true;
            });
        }

        private void AoTrocarDeCena(Scene last, Scene next) {
            Seguro("cena", () => {
                cena = next;
                if (!(next is Level)) MandarEstado();
            });
        }

        // ---------- what happened ----------
        private void Dash(Player p) {
            Evento("dash", w => {
                // The game's y points down; ours points up.
                Direcao(w, p.DashDir);
                w.WriteNumber("restantes", p.Dashes);
                w.WriteNumber("max", p.MaxDashes);
            });
        }

        private void Recarga(Player p, string fonte) {
            Evento("recarga", w => {
                w.WriteNumber("dashes", p.Dashes);
                w.WriteNumber("max", p.MaxDashes);
                w.WriteString("fonte", fonte);
            });
        }

        private static bool NoChao(Player p) {
            try {
                return campoNoChao != null ? (bool) campoNoChao.GetValue(p) : p.OnGround(1);
            } catch {
                return false;
            }
        }

        // ---------- every frame in a level ----------
        private void AoAtualizar(Level level) {
            // Every frame: a plain try (no closure to allocate), the same once-only log as Seguro.
            try {
                cena = level;
                double agora = Agora;
                var s = level.Session;
                if (s.Time != tempoAntes) {
                    tempoAntes = s.Time;
                    tempoMexeuEm = agora;
                }
                var p = level.Tracker.GetEntity<Player>();
                if (p != null && p.StateMachine.State != Player.StDash) dashPendente = false;
                // The game's own warning that the feather is ending, from half a second left (StarFlyUpdate's 0.5).
                if (p != null && voando && p.StateMachine.State == Player.StStarFly && campoPena != null) {
                    float resta = (float) campoPena.GetValue(p);
                    if (resta < 0.5f && !avisouPena) {
                        avisouPena = true;
                        Evento("pena_aviso", w => w.WriteNumber("resta", Math.Round(resta, 2)));
                    } else if (resta >= 0.5f && avisouPena) {
                        // Another feather filled it again.
                        avisouPena = false;
                        Evento("pena_inicio", w => {
                            w.WriteNumber("duracao", Math.Round(resta, 2));
                            w.WriteBoolean("renovada", true);
                        });
                    }
                }
                extras = LerExtras(level, p, agora);
                var chave = new Chave(extras,

                    p?.Dashes ?? -1, p?.MaxDashes ?? -1, p != null && NoChao(p), p?.StateMachine.State ?? -1, p == null || p.Dead,
                    (int) level.CoreMode, s.Level, s.Deaths, s.Strawberries.Count, s.HeartGem, s.Cassette, s.GrabbedGolden,
                    agora - tempoMexeuEm < CORRENDO_MS, level.Paused, level.Completed);
                if (!temChave || !chave.Equals(ultimaChave)) pendente = true;
                if ((pendente && agora - estadoEm >= ESTADO_MIN_MS) || agora - estadoEm >= BATIDA_MS) {
                    ultimaChave = chave;
                    temChave = true;
                    MandarEstado();
                }
            } catch (Exception e) {
                if (falhas.Add("atualizar")) Logger.Warn("MuanlartinsLink", $"atualizar: {e}");
            }
        }

        /// <summary>What moves with her: quantized, so a state goes out only when it really changes.</summary>
        private readonly record struct Extras(int VelX, int VelY, int VentoX, int VentoY, bool Cansado, int Morangos,
            int Dourados, int Chaves, int Perseguindo);

        private static int Passo(float v) => (int) Math.Round(v / PASSO_VELOCIDADE) * (int) PASSO_VELOCIDADE;

        private Extras LerExtras(Level level, Player p, double agora) {
            if (agora - procureiEm >= PROCURAR_MS) {
                procureiEm = agora;
                perseguindo = 0;
                foreach (Entity e in level.Entities)
                    if (e is BadelineOldsite) perseguindo++;
            }
            int morangos = 0, dourados = 0, chaves = 0;
            if (p != null) {
                foreach (var f in p.Leader.Followers) {
                    if (f.Entity is Strawberry m) {
                        if (m.Golden) dourados++;
                        else morangos++;
                    } else if (f.Entity is Key) chaves++;
                }
            }
            // The game's y points down; ours points up.
            return new Extras(
                p == null ? 0 : Passo(p.Speed.X), p == null ? 0 : Passo(-p.Speed.Y),
                Passo(level.Wind.X), Passo(-level.Wind.Y),
                p != null && !p.Dead && p.Stamina <= CANSADO,
                morangos, dourados, chaves, perseguindo);
        }

        private readonly record struct Chave(Extras Extras, int Dashes, int Max, bool Chao, int Estado, bool Morto, int Nucleo, string Sala,
            int Mortes, int Morangos, bool Coracao, bool Fita, bool Dourado, bool Correndo, bool Pausado, bool Completo);

        // ---------- the messages ----------
        private static readonly string[] ESTADOS = {
            "normal", "escalada", "dash", "nado", "bolha", "bolha-vermelha", "impacto", "lancado", "pegando", "bloco-sonho",
            "lancamento-cume", "cena", "intro", "intro", "intro", "intro", "tutorial", "congelado", "queda-reflexo", "pena",
            "queda-templo", "fita", "atraido", "intro", "passaro", "intro",
        };

        private string Escrever(string tipo, Action<Utf8JsonWriter> campos) {
            buffer.Clear();
            using (var w = new Utf8JsonWriter(buffer)) {
                w.WriteStartObject();
                w.WriteString("tipo", tipo);
                campos?.Invoke(w);
                w.WriteEndObject();
            }
            return Encoding.UTF8.GetString(buffer.WrittenSpan);
        }

        private void Evento(string tipo, Action<Utf8JsonWriter> campos) {
            servidor.Mandar(Escrever(tipo, campos));
        }

        private static void Direcao(Utf8JsonWriter w, Vector2 d) {
            w.WriteStartArray("direcao");
            w.WriteNumberValue(Math.Round(d.X, 3));
            w.WriteNumberValue(Math.Round(-d.Y, 3));
            w.WriteEndArray();
        }

        private static void Par(Utf8JsonWriter w, string nome, int x, int y) {
            w.WriteStartArray(nome);
            w.WriteNumberValue(x);
            w.WriteNumberValue(y);
            w.WriteEndArray();
        }

        private static string Lado(AreaMode m) => m == AreaMode.BSide ? "B" : m == AreaMode.CSide ? "C" : "A";

        /// <summary>The chapter's fields: its id, SID, name as the game shows it in the player's language, side, room.</summary>
        private static void Capitulo(Utf8JsonWriter w, Session s) {
            var area = AreaData.Get(s.Area);
            w.WriteNumber("id", s.Area.ID);
            w.WriteString("sid", s.Area.SID ?? area?.SID);
            w.WriteString("nome", NomeDe(area, s.Area.SID));
            w.WriteString("lado", Lado(s.Area.Mode));
            // The number the game shows (Capítulo 1…); -1 for the prologue, the epilogue and other interludes.
            w.WriteNumber("numero", s.Area.ChapterIndex);
            w.WriteString("sala", s.Level);
            w.WriteString("colecao", s.Area.LevelSet);
            w.WriteBoolean("interludio", area?.Interlude ?? false);
        }

        private static string NomeDe(AreaData area, string sid) {
            string chave = area?.Name;
            if (chave != null && Dialog.Has(chave)) return Dialog.Clean(chave);
            if (string.IsNullOrEmpty(sid)) return chave ?? "";
            int barra = sid.LastIndexOf('/');
            return barra >= 0 ? sid.Substring(barra + 1) : sid;
        }

        /// <summary>The whole state, sent now (and kept by the server for whoever connects next).</summary>
        public void MandarEstado() {
            estadoEm = Agora;
            pendente = false;
            servidor.Mandar(Escrever("estado", EscreverEstado), estado: true);
        }

        private void EscreverEstado(Utf8JsonWriter w) {
            var scene = cena ?? Engine.Scene;
            Session s = null;
            Level level = scene as Level;
            string onde;
            if (level != null) {
                onde = "nivel";
                s = level.Session;
            } else if (scene is AreaComplete ac) {
                onde = "fim";
                s = ac.Session;
            } else if (scene is LevelLoader || scene is LevelExit || scene is GameLoader) {
                onde = "carregando";
            } else {
                onde = "menu";
            }
            w.WriteNumber("versao", 1);
            w.WriteString("onde", onde);
            var save = SaveData.Instance;

            if (s != null) {
                w.WriteStartObject("capitulo");
                Capitulo(w, s);
                w.WriteBoolean("dourado", s.GrabbedGolden);
                w.WriteEndObject();
            } else w.WriteNull("capitulo");

            var p = level?.Tracker.GetEntity<Player>();
            if (p != null) {
                int st = p.StateMachine.State;
                w.WriteStartObject("jogador");
                w.WriteNumber("dashes", p.Dashes);
                w.WriteNumber("max", p.MaxDashes);
                w.WriteBoolean("chao", NoChao(p));
                // Waiting in a booster is the same state for both: the red one's bubble is red from then on.
                bool vermelha = st == Player.StBoost && campoBolhaVermelha?.GetValue(p) is true;
                w.WriteString("estado", p.Dead ? "morto" : vermelha ? "bolha-vermelha" : st >= 0 && st < ESTADOS.Length ? ESTADOS[st] : $"estado-{st}");
                w.WriteBoolean("vivo", !p.Dead);
                Par(w, "velocidade", extras.VelX, extras.VelY);
                w.WriteBoolean("cansado", extras.Cansado);
                w.WriteStartObject("levando");
                w.WriteNumber("morangos", extras.Morangos);
                w.WriteNumber("dourados", extras.Dourados);
                w.WriteNumber("chaves", extras.Chaves);
                w.WriteEndObject();
                w.WriteEndObject();
            } else w.WriteNull("jogador");

            if (level != null) {
                Par(w, "vento", extras.VentoX, extras.VentoY);
                w.WriteNumber("perseguindo", extras.Perseguindo);
            }

            var nucleo = level?.CoreMode ?? Session.CoreModes.None;
            if (nucleo == Session.CoreModes.Hot) w.WriteString("nucleo", "quente");
            else if (nucleo == Session.CoreModes.Cold) w.WriteString("nucleo", "frio");
            else w.WriteNull("nucleo");

            AreaModeStats modo = null;
            AreaStats area = null;
            if (s != null && save != null) {
                // By id in Areas_Safe, as the game's own AddStrawberry does. Not Everest's GetAreaStatsFor: it looks in
                // LevelSetStats.Areas, which is empty for the game's own chapters (theirs are SaveData.Areas).
                var areas = save.Areas_Safe;
                if (s.Area.ID >= 0 && s.Area.ID < areas.Count) area = areas[s.Area.ID];
                int m = (int) s.Area.Mode;
                if (area != null && area.Modes != null && m < area.Modes.Length) modo = area.Modes[m];
            }
            var dados = s != null ? AreaData.Get(s.Area) : null;
            int totalCapitulo = 0;
            if (dados?.Mode != null && s != null && (int) s.Area.Mode < dados.Mode.Length && dados.Mode[(int) s.Area.Mode] != null)
                totalCapitulo = dados.Mode[(int) s.Area.Mode].TotalStrawberries;

            w.WriteStartObject("mortes");
            if (s != null) {
                w.WriteNumber("capitulo", s.Deaths);
                w.WriteNumber("sala", s.DeathsInCurrentLevel);
            }
            if (modo != null) w.WriteNumber("capitulo_sempre", modo.Deaths);
            if (save != null) w.WriteNumber("arquivo", save.TotalDeaths);
            w.WriteEndObject();

            w.WriteStartObject("morangos");
            if (s != null) {
                w.WriteNumber("capitulo", Math.Max(modo?.TotalStrawberries ?? 0, 0));
                w.WriteNumber("total", totalCapitulo);
                w.WriteNumber("sessao", s.Strawberries.Count);
            }
            if (save != null) {
                w.WriteNumber("arquivo", save.TotalStrawberries);
                w.WriteNumber("dourados", save.TotalGoldenStrawberries);
            }
            w.WriteEndObject();

            w.WriteStartObject("coracoes");
            if (s != null) w.WriteBoolean("capitulo", s.HeartGem || (modo?.HeartGem ?? false));
            if (save != null) w.WriteNumber("arquivo", save.TotalHeartGems);
            w.WriteEndObject();

            w.WriteStartObject("fitas");
            if (s != null) w.WriteBoolean("capitulo", s.Cassette || (area?.Cassette ?? false));
            if (save != null) w.WriteNumber("arquivo", save.TotalCassettes);
            w.WriteEndObject();

            // Milliseconds; `correndo` while the chapter's clock moves, so a page can tick it between states.
            w.WriteStartObject("tempo");
            if (s != null) w.WriteNumber("capitulo", s.Time / TimeSpan.TicksPerMillisecond);
            if (save != null) w.WriteNumber("arquivo", save.Time / TimeSpan.TicksPerMillisecond);
            w.WriteBoolean("correndo", level != null && Agora - tempoMexeuEm < CORRENDO_MS);
            w.WriteEndObject();

            w.WriteBoolean("pausado", level?.Paused ?? false);
        }
    }
}
