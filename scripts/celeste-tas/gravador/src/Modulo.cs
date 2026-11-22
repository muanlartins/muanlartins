// Films one TAS in the isolated copy: per game update, the game's own pixels (320x180), the same update rendered
// without Madeline (so she can be cut out exactly) and one row of her state. No frame is lost or doubled whatever
// the machine does. Also the copy's guard: it refuses to run on Luan's saves, and Steam's
// achievements and stats are off for the whole session (CelesteTAS only blocks them while a TAS runs).
using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using Microsoft.Xna.Framework;
using Monocle;
using MonoMod.Utils;

namespace Celeste.Mod.MuanlartinsDemo;

public class Modulo : EverestModule {
    private static readonly MethodInfo RenderCore =
        typeof(Engine).GetMethod("RenderCore", BindingFlags.Instance | BindingFlags.NonPublic);

    // What's filmed of her, one column each: monta.py reads them by name.
    private static readonly string[] DELA = {
        "x", "y", "vx", "vy", "chao", "coyote", "estado", "altura", "stamina", "embaloX", "embaloY", "wallboost", "forcado"
    };

    private static string pasta;
    private static int desde, anterior, depois;
    private static bool rodou;
    private static byte[] imagem, pequena;
    private static FileStream quadros, fundo;
    private static StreamWriter linhas;
    private static readonly Stopwatch relogio = Stopwatch.StartNew();

    public override void Load() {
        string saves = Environment.GetEnvironmentVariable("EVEREST_SAVEPATH") ?? "";
        pasta = Environment.GetEnvironmentVariable("DEMO_SAIDA") ?? "";
        if (pasta == "" || !saves.StartsWith(Everest.PathGame, StringComparison.OrdinalIgnoreCase)
            || Everest.PathGame.Contains("steamapps", StringComparison.OrdinalIgnoreCase)) {
            Logger.Error("MuanlartinsDemo", "Not the isolated copy: leaving before anything runs");
            Environment.Exit(3);
        }
        desde = int.Parse(Environment.GetEnvironmentVariable("DEMO_DE") ?? "121", CultureInfo.InvariantCulture);

        On.Celeste.Achievements.Register += SemConquista;
        On.Celeste.Stats.Increment += SemEstatistica;
        On.Celeste.Stats.Store += SemGravar;
        On.Celeste.Celeste.Update += Atualizar;
        Logger.Info("MuanlartinsDemo", "Guard on: no achievements, no stats, saves in " + saves);
    }

    public override void Unload() {
        On.Celeste.Achievements.Register -= SemConquista;
        On.Celeste.Stats.Increment -= SemEstatistica;
        On.Celeste.Stats.Store -= SemGravar;
        On.Celeste.Celeste.Update -= Atualizar;
    }

    private static void SemConquista(On.Celeste.Achievements.orig_Register orig, Achievement conquista) { }
    private static void SemEstatistica(On.Celeste.Stats.orig_Increment orig, Stat stat, int quanto) { }
    private static void SemGravar(On.Celeste.Stats.orig_Store orig) { }

    private static void Atualizar(On.Celeste.Celeste.orig_Update orig, Celeste self, GameTime tempo) {
        orig(self, tempo);

        if (relogio.Elapsed.TotalSeconds > 120) {
            Fechar(self, "timeout");
            return;
        }
        if (TAS.Manager.Running) {
            rodou = true;
            int frame = TAS.Manager.Controller.CurrentFrameInTas;
            if (frame == anterior) return;
            int salto = frame - anterior;
            anterior = frame;
            if (frame >= desde && Engine.Scene is Level level) Filmar(level, frame, salto);
        } else if (rodou && ++depois > 5) {
            Fechar(self, $"end {anterior}/{TAS.Manager.Controller.Inputs.Count}");
        }
    }

    private static void Filmar(Level level, int frame, int salto) {
        var tela = Engine.Graphics.GraphicsDevice;
        int largura = tela.PresentationParameters.BackBufferWidth, altura = tela.PresentationParameters.BackBufferHeight;
        if (quadros == null) {
            Directory.CreateDirectory(pasta);
            quadros = new FileStream(Path.Combine(pasta, "quadros.rgba"), FileMode.Create, FileAccess.Write);
            fundo = new FileStream(Path.Combine(pasta, "fundo.rgba"), FileMode.Create, FileAccess.Write);
            linhas = new StreamWriter(Path.Combine(pasta, "quadros.tsv"));
            File.WriteAllText(Path.Combine(pasta, "tamanho.txt"), "320x180");
            imagem = new byte[largura * altura * 4];
            pequena = new byte[320 * 180 * 4];
            linhas.WriteLine("frame\tsalto\tsala\tteclas\tbufferPulo\tbufferDash\tcamX\tcamY\tmorta\t" + string.Join('\t', DELA));
        }
        Fotografar(quadros, largura, altura);

        var jogadora = level.Tracker.GetEntity<Player>();
        var corpo = level.Entities.FindFirst<PlayerDeadBody>();
        bool viaJogadora = jogadora?.Visible ?? false, viaCorpo = corpo?.Visible ?? false;
        if (jogadora != null) jogadora.Visible = false;
        if (corpo != null) corpo.Visible = false;
        Fotografar(fundo, largura, altura);
        if (jogadora != null) jogadora.Visible = viaJogadora;
        if (corpo != null) corpo.Visible = viaCorpo;

        var c = CultureInfo.InvariantCulture;
        string N(float valor) => valor.ToString("0.####", c);
        string[] dela = Enumerable.Repeat("", DELA.Length).ToArray();
        bool morta = jogadora == null || jogadora.Dead;
        if (jogadora != null) {
            var d = DynamicData.For(jogadora);
            dela = new[] {
                N(jogadora.ExactPosition.X), N(jogadora.ExactPosition.Y), N(jogadora.Speed.X), N(jogadora.Speed.Y),
                d.Get<bool>("onGround") ? "1" : "0", N(d.Get<float>("jumpGraceTimer")),
                jogadora.StateMachine.State.ToString(c), N(jogadora.Collider.Height), N(jogadora.Stamina),
                N(jogadora.LiftSpeed.X), N(jogadora.LiftSpeed.Y), N(d.Get<float>("wallBoostTimer")),
                N(d.Get<float>("forceMoveXTimer"))
            };
        }
        linhas.WriteLine(string.Join('\t', new[] {
            frame.ToString(c), salto.ToString(c), level.Session.Level, Teclas().ToString(c),
            N(DynamicData.For(Input.Jump).Get<float>("bufferCounter")),
            N(DynamicData.For(Input.Dash).Get<float>("bufferCounter")),
            level.Camera.X.ToString("0", c), level.Camera.Y.ToString("0", c), morta ? "1" : "0"
        }.Concat(dela)));
    }

    // What's held, as the bits of lib/celeste-demo.ts's KEY.
    private static int Teclas() =>
        (Input.MoveX.Value < 0 ? 1 : 0) | (Input.MoveX.Value > 0 ? 2 : 0) | (Input.MoveY.Value < 0 ? 4 : 0)
        | (Input.MoveY.Value > 0 ? 8 : 0) | (Input.Jump.Check ? 16 : 0)
        | (Input.Dash.Check || Input.CrouchDash.Check ? 32 : 0) | (Input.Grab.Check ? 64 : 0);

    // The window is a whole multiple of 320x180 (WindowScale), so one pixel of each block is the game's own pixel.
    private static void Fotografar(FileStream arquivo, int largura, int altura) {
        RenderCore.Invoke(Engine.Instance, null);
        Engine.Graphics.GraphicsDevice.GetBackBufferData(imagem);
        int bloco = largura / 320;
        for (int y = 0; y < 180; y++)
            for (int x = 0; x < 320; x++) {
                int para = (y * 320 + x) * 4;
                Array.Copy(imagem, (y * bloco * largura + x * bloco) * 4, pequena, para, 3);
                pequena[para + 3] = 255;
            }
        arquivo.Write(pequena, 0, pequena.Length);
    }

    private static void Fechar(Game jogo, string motivo) {
        quadros?.Dispose();
        fundo?.Dispose();
        linhas?.Dispose();
        quadros = null;
        linhas = null;
        Directory.CreateDirectory(pasta);
        File.WriteAllText(Path.Combine(pasta, "fim.txt"), motivo);
        jogo.Exit();
    }
}
