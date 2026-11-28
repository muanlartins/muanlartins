# The keys and mouse buttons Luan is pressing, for the stream's keyboard-and-mouse overlay (public/stream/teclas.js,
# shown by jogo.html?teclas=1 in the game scenes; ErikMD's idea, 2026-11-20). Started at Windows login by
# "Teclas muanlartins.vbs" in Startup, hidden; it runs on Windows itself, since OBS's browser sources are there.
#
# It reads Windows' Raw Input (as NohBoard and the like do): what the keyboard and the mouse send, on a hidden
# window that gets it even while the game is in front, without touching the game. Nothing is written to disk, and
# it only answers on 127.0.0.1:8796, as server-sent events: one JSON line per change, the state at once to whoever
# connects, a ping every 15 s.
#
#   {"foco":true,"processo":"RocketLeague","teclas":["SHIFT","W"],"botoes":["L"],"rodaCima":3,"rodaBaixo":1,"movX":-1240,"movY":310}
#
# Privacy first: only the keys the overlay draws ever go out (MOSTRAR), and only while a game is the window in front
# ("foco"): Valorant or Rocket League, or any window covering its whole screen without a title bar (a game in Diversos)
# that isn't a browser, Discord, OBS, a launcher or the like. Anything else in front, and "teclas" and "botoes" are
# empty, so nothing typed outside a game ever leaves; leaving the game drops whatever was held, so no key sticks. Only
# the overlays may read it (the site's origin, or localhost for a demo; tools with no Origin, like curl.exe, too): any
# other page open in a browser gets a 403, so no website can listen in. The wheel counts its ticks up and down
# (rodaCima, rodaBaixo, which only grow) so the page sees each one. The mouse's movement (since 2026-11-28, for the
# channel's fan holding the mouse, teclas-torcedor.js) goes as running totals of its counts, movX and movY, summed
# only while a game is in front and sent at most 30 times a second (a gaming mouse reports 1000): how far it moved,
# never where the pointer is.
#
# A second copy finds the port taken and quits quietly. -Todos skips the game check, to try it from a terminal.
param([switch]$Todos)
Add-Type -ReferencedAssemblies System.Windows.Forms, System.Drawing -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace Muan {
  public static class Teclas {
    [StructLayout(LayoutKind.Sequential)]
    struct RAWINPUTDEVICE { public ushort UsagePage; public ushort Usage; public uint Flags; public IntPtr Target; }
    [StructLayout(LayoutKind.Sequential)]
    struct RAWINPUTHEADER { public uint Type; public uint Size; public IntPtr Device; public IntPtr WParam; }
    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int Left, Top, Right, Bottom; }

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool RegisterRawInputDevices(RAWINPUTDEVICE[] devices, uint count, uint size);
    [DllImport("user32.dll")]
    static extern uint GetRawInputData(IntPtr raw, uint command, byte[] data, ref uint size, uint headerSize);
    [DllImport("user32.dll")]
    static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
    [DllImport("user32.dll")]
    static extern bool GetWindowRect(IntPtr window, out RECT rect);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtr")]
    static extern IntPtr GetWindowLongPtr(IntPtr window, int index);
    [DllImport("user32.dll")]
    static extern bool SetProcessDPIAware();

    const int WM_INPUT = 0x00FF;
    const uint RID_INPUT = 0x10000003;
    const uint RIDEV_INPUTSINK = 0x100;
    const uint RIM_TYPEMOUSE = 0, RIM_TYPEKEYBOARD = 1;
    const int GWL_STYLE = -16;
    const long WS_CAPTION = 0x00C00000;

    static readonly HashSet<string> JOGOS = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "VALORANT-Win64-Shipping", "RocketLeague" };
    static readonly HashSet<string> NUNCA = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
      "brave", "chrome", "msedge", "firefox", "opera", "Discord", "obs64", "explorer", "Spotify", "Code", "WindowsTerminal",
      "powershell", "pwsh", "cmd", "conhost", "ApplicationFrameHost", "ShellExperienceHost", "SearchHost",
      "StartMenuExperienceHost", "LockApp", "Taskmgr", "claude",
      // The launchers, where passwords are typed (and Steam's Big Picture covers the screen)
      "steam", "steamwebhelper", "EpicGamesLauncher", "EpicWebHelper", "RiotClientServices", "RiotClientUx", "Riot Client",
      "Battle.net", "EADesktop", "GalaxyClient"
    };
    static readonly string[] BOTOES = { "L", "R", "M", "X1", "X2" };
    // The keys the overlay draws (TECLADOS in public/stream/teclas.js): only these ever go out, so not even what's
    // typed in a game's own chat is mirrored. A key added to a keyboard there goes here too.
    static readonly HashSet<string> MOSTRAR = new HashSet<string>(StringComparer.Ordinal) {
      "Q", "W", "E", "R", "A", "S", "D", "F", "X", "C", "SHIFT", "CTRL", "SPACE"
    };

    static bool todos;
    static int meuPid;
    static readonly SortedSet<string> teclas = new SortedSet<string>(StringComparer.Ordinal);
    static readonly bool[] botoes = new bool[5];
    static long rodaCima, rodaBaixo;
    static long movX, movY;
    static bool mexeu;
    static bool foco;
    static string processo = "";
    static IntPtr janelaAntes = IntPtr.Zero;
    static uint pidAntes;
    static string nomeAntes = "";
    static string estado = "";

    static readonly object trava = new object();
    static readonly List<NetworkStream> clientes = new List<NetworkStream>();
    static readonly BlockingCollection<string> fila = new BlockingCollection<string>();
    // Held here so the garbage collector never takes the window (and with it the raw input) or the clock.
    static Janela janela;
    static System.Windows.Forms.Timer relogio, passo;

    class Janela : NativeWindow {
      public Janela() {
        var p = new CreateParams();
        p.Parent = new IntPtr(-3); // HWND_MESSAGE: no window at all on screen
        CreateHandle(p);
      }
      protected override void WndProc(ref Message m) {
        if (m.Msg == WM_INPUT) Ler(m.LParam);
        base.WndProc(ref m);
      }
    }

    // Whether the window in front is a game, and which. Asked on every key or button and four times a second.
    static void OlharFrente(bool forcar) {
      IntPtr janela = GetForegroundWindow();
      if (!forcar && janela == janelaAntes) return;
      janelaAntes = janela;
      bool agora = false;
      string nome = "";
      if (janela != IntPtr.Zero) {
        uint pid;
        GetWindowThreadProcessId(janela, out pid);
        if (pid != pidAntes) {
          pidAntes = pid;
          try { nomeAntes = Process.GetProcessById((int)pid).ProcessName; } catch { nomeAntes = ""; }
        }
        nome = nomeAntes;
        if (todos) agora = true;
        else if ((int)pid == meuPid || nome == "") agora = false;
        else if (JOGOS.Contains(nome)) agora = true;
        else if (!NUNCA.Contains(nome)) agora = TelaInteira(janela);
      }
      if (agora != foco || nome != processo) {
        if (!agora) {
          teclas.Clear();
          for (int i = 0; i < botoes.Length; i++) botoes[i] = false;
        }
        foco = agora;
        processo = agora ? nome : "";
      }
    }

    // Covers its whole monitor without a title bar: borderless or exclusive fullscreen, as games run.
    static bool TelaInteira(IntPtr janela) {
      long estilo = GetWindowLongPtr(janela, GWL_STYLE).ToInt64();
      if ((estilo & WS_CAPTION) == WS_CAPTION) return false;
      RECT r;
      if (!GetWindowRect(janela, out r)) return false;
      var b = Screen.FromHandle(janela).Bounds;
      return r.Left <= b.Left && r.Top <= b.Top && r.Right >= b.Right && r.Bottom >= b.Bottom;
    }

    static readonly int CABECALHO = Marshal.SizeOf(typeof(RAWINPUTHEADER));
    // A RAWINPUT for a keyboard or a mouse fits in 48 bytes on 64-bit Windows: one call, no size query, since the
    // mouse's movement alone sends a thousand of these a second.
    static readonly byte[] buffer = new byte[128];

    static void Ler(IntPtr raw) {
      uint tamanho = (uint)buffer.Length;
      uint lidos = GetRawInputData(raw, RID_INPUT, buffer, ref tamanho, (uint)CABECALHO);
      if (lidos == 0 || lidos == uint.MaxValue) return;
      uint tipo = BitConverter.ToUInt32(buffer, 0);
      int h = CABECALHO;
      if (tipo == RIM_TYPEKEYBOARD) {
        ushort flags = BitConverter.ToUInt16(buffer, h + 2);
        ushort vk = BitConverter.ToUInt16(buffer, h + 6);
        if (vk == 0xFF || vk == 0) return; // a fake key, part of an escape sequence
        OlharFrente(false);
        if (!foco) return;
        string nome = Nome(vk);
        if (!MOSTRAR.Contains(nome)) return;
        if ((flags & 1) == 1) teclas.Remove(nome);
        else teclas.Add(nome);
        Mandar();
      } else if (tipo == RIM_TYPEMOUSE) {
        ushort flags = BitConverter.ToUInt16(buffer, h + 4);
        // Relative movement (not a tablet's or a remote desktop's absolute position), while a game is in front.
        if ((BitConverter.ToUInt16(buffer, h) & 1) == 0 && foco) {
          int dx = BitConverter.ToInt32(buffer, h + 12), dy = BitConverter.ToInt32(buffer, h + 16);
          if (dx != 0 || dy != 0) { movX += dx; movY += dy; mexeu = true; }
        }
        if (flags == 0) return; // movement only: the clock below sends it
        OlharFrente(false);
        if (!foco) return;
        for (int i = 0; i < 5; i++) {
          if ((flags & (1 << (2 * i))) != 0) botoes[i] = true;
          if ((flags & (2 << (2 * i))) != 0) botoes[i] = false;
        }
        if ((flags & 0x0400) != 0) {
          short delta = BitConverter.ToInt16(buffer, h + 6);
          long ticks = Math.Max(1, Math.Abs((int)delta) / 120);
          if (delta > 0) rodaCima += ticks;
          else if (delta < 0) rodaBaixo += ticks;
        }
        Mandar();
      }
    }

    static string Nome(ushort vk) {
      if (vk >= 0x41 && vk <= 0x5A) return ((char)vk).ToString();
      if (vk >= 0x30 && vk <= 0x39) return ((char)vk).ToString();
      if (vk >= 0x70 && vk <= 0x87) return "F" + (vk - 0x6F);
      switch (vk) {
        case 0x10: case 0xA0: case 0xA1: return "SHIFT";
        case 0x11: case 0xA2: case 0xA3: return "CTRL";
        case 0x12: case 0xA4: case 0xA5: return "ALT";
        case 0x20: return "SPACE";
        case 0x09: return "TAB";
        case 0x14: return "CAPS";
      }
      return "VK" + vk;
    }

    static string Json() {
      var s = new StringBuilder(128);
      s.Append("{\"foco\":").Append(foco ? "true" : "false");
      s.Append(",\"processo\":\"");
      foreach (char c in processo) {
        if (c == '"' || c == '\\') s.Append('\\').Append(c);
        else if (c >= ' ') s.Append(c);
      }
      s.Append("\",\"teclas\":[");
      bool primeira = true;
      foreach (var t in teclas) {
        if (!primeira) s.Append(',');
        s.Append('"').Append(t).Append('"');
        primeira = false;
      }
      s.Append("],\"botoes\":[");
      primeira = true;
      for (int i = 0; i < 5; i++) {
        if (!botoes[i]) continue;
        if (!primeira) s.Append(',');
        s.Append('"').Append(BOTOES[i]).Append('"');
        primeira = false;
      }
      s.Append("],\"rodaCima\":").Append(rodaCima).Append(",\"rodaBaixo\":").Append(rodaBaixo);
      s.Append(",\"movX\":").Append(movX).Append(",\"movY\":").Append(movY).Append('}');
      return s.ToString();
    }

    // Only a change in what's shown goes out.
    static void Mandar() {
      string agora = Json();
      if (agora == estado) return;
      lock (trava) estado = agora;
      fila.Add("data: " + agora + "\n\n");
    }

    static void Enviar() {
      foreach (var texto in fila.GetConsumingEnumerable()) {
        byte[] bytes = Encoding.UTF8.GetBytes(texto);
        lock (trava) {
          for (int i = clientes.Count - 1; i >= 0; i--) {
            try { clientes[i].Write(bytes, 0, bytes.Length); }
            catch { try { clientes[i].Close(); } catch { } clientes.RemoveAt(i); }
          }
        }
      }
    }

    // Who may read it: the overlays (the site's pages in OBS, or served on localhost for a demo) and tools with no
    // Origin at all (curl). Any other page open in a browser is turned away, so no website can listen in.
    static string Cors(string pedido) {
      var m = System.Text.RegularExpressions.Regex.Match(pedido, @"^Origin:\s*(\S+)", System.Text.RegularExpressions.RegexOptions.Multiline | System.Text.RegularExpressions.RegexOptions.IgnoreCase);
      if (!m.Success) return "";
      string origem = m.Groups[1].Value;
      bool aceita = origem == "https://muanlartins.com.br" || origem.StartsWith("http://localhost:", StringComparison.Ordinal)
        || origem.StartsWith("http://127.0.0.1:", StringComparison.Ordinal);
      return aceita ? "Access-Control-Allow-Origin: " + origem + "\r\nAccess-Control-Allow-Private-Network: true\r\nVary: Origin\r\n" : null;
    }

    static void Atender(TcpClient cliente) {
      try {
        cliente.NoDelay = true;
        var stream = cliente.GetStream();
        stream.ReadTimeout = 5000;
        stream.WriteTimeout = 2000;
        var pedido = new StringBuilder();
        var b = new byte[1024];
        while (pedido.Length < 8192 && pedido.ToString().IndexOf("\r\n\r\n", StringComparison.Ordinal) < 0) {
          int n = stream.Read(b, 0, b.Length);
          if (n <= 0) break;
          pedido.Append(Encoding.ASCII.GetString(b, 0, n));
        }
        string texto = pedido.ToString();
        string cors = Cors(texto);
        if (cors == null) {
          byte[] r = Encoding.ASCII.GetBytes("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
          stream.Write(r, 0, r.Length);
          cliente.Close();
          return;
        }
        if (texto.StartsWith("OPTIONS", StringComparison.Ordinal)) {
          byte[] r = Encoding.ASCII.GetBytes("HTTP/1.1 204 No Content\r\n" + cors + "Access-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
          stream.Write(r, 0, r.Length);
          cliente.Close();
          return;
        }
        if (!texto.StartsWith("GET", StringComparison.Ordinal)) { cliente.Close(); return; }
        lock (trava) {
          byte[] r = Encoding.UTF8.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache\r\n" + cors + "Connection: keep-alive\r\n\r\nretry: 2000\n\ndata: " + estado + "\n\n");
          stream.Write(r, 0, r.Length);
          clientes.Add(stream);
        }
      } catch {
        try { cliente.Close(); } catch { }
      }
    }

    public static void Rodar(int porta, bool semFiltro) {
      todos = semFiltro;
      meuPid = Process.GetCurrentProcess().Id;
      TcpListener ouvinte;
      try {
        ouvinte = new TcpListener(IPAddress.Loopback, porta);
        ouvinte.Start();
      } catch (SocketException) {
        return; // another copy has the port
      }
      SetProcessDPIAware();
      OlharFrente(true);
      estado = Json();

      new Thread(Enviar) { IsBackground = true }.Start();
      new Thread(() => {
        while (true) {
          TcpClient c;
          try { c = ouvinte.AcceptTcpClient(); } catch { return; }
          new Thread(() => Atender(c)) { IsBackground = true }.Start();
        }
      }) { IsBackground = true }.Start();
      new Thread(() => {
        while (true) { Thread.Sleep(15000); fila.Add(": ping\n\n"); }
      }) { IsBackground = true }.Start();

      janela = new Janela();
      var dispositivos = new RAWINPUTDEVICE[] {
        new RAWINPUTDEVICE { UsagePage = 1, Usage = 6, Flags = RIDEV_INPUTSINK, Target = janela.Handle },
        new RAWINPUTDEVICE { UsagePage = 1, Usage = 2, Flags = RIDEV_INPUTSINK, Target = janela.Handle },
      };
      if (!RegisterRawInputDevices(dispositivos, 2, (uint)Marshal.SizeOf(typeof(RAWINPUTDEVICE))))
        throw new InvalidOperationException("RegisterRawInputDevices: " + Marshal.GetLastWin32Error());

      relogio = new System.Windows.Forms.Timer { Interval = 250 };
      relogio.Tick += (s, e) => { OlharFrente(true); Mandar(); };
      relogio.Start();
      passo = new System.Windows.Forms.Timer { Interval = 33 };
      passo.Tick += (s, e) => { if (mexeu) { mexeu = false; Mandar(); } };
      passo.Start();
      Application.Run();
    }
  }
}
'@
[Muan.Teclas]::Rodar(8796, $Todos.IsPresent)
