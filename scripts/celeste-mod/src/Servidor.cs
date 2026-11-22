// The link's server: server-sent events on http://127.0.0.1:8797/eventos, from a TcpListener bound to loopback (an
// HttpListener would need a URL ACL on Windows). The game thread only hands it strings (Mandar): a lock-free queue and a
// signal, so it never waits on the network. One background thread accepts connections, a short-lived one per
// connection reads its request, and one sends the queue to every client. Nothing is kept or written to disk.
//
//   GET /eventos   text/event-stream: the latest `estado` at once, then every message, one JSON per `data:` line,
//                  and a comment every 15 s while nothing happens (so a dead connection shows)
//   GET /estado    the latest `estado` as plain JSON (for curl)
//   OPTIONS        a CORS preflight's answer
//
// Every answer carries Access-Control-Allow-Origin: * (OBS's browser sources and pages on localhost read it) and
// Access-Control-Allow-Private-Network (Chrome asks it of public pages reaching loopback). If the port is taken (a
// second game, or simular.py), it logs it and tries again every few seconds: the game never notices.

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace Celeste.Mod.MuanlartinsLink {
    public sealed class Servidor {
        public const int Porta = 8797;
        private const string Cors = "Access-Control-Allow-Origin: *\r\nAccess-Control-Allow-Private-Network: true\r\n";
        // A stuck client can't hold the queue up for long, and a burst can't grow it without end.
        private const int MaxFila = 4000;

        private readonly ConcurrentQueue<string> fila = new ConcurrentQueue<string>();
        private readonly AutoResetEvent sinal = new AutoResetEvent(false);
        private readonly List<NetworkStream> clientes = new List<NetworkStream>();
        private readonly object trava = new object();
        private volatile string ultimoEstado = "{\"tipo\":\"estado\",\"onde\":\"menu\"}";
        private volatile bool parar;
        private TcpListener ouvinte;
        private Thread aceitar, enviar;

        public int Clientes {
            get { lock (trava) return clientes.Count; }
        }

        public void Iniciar() {
            parar = false;
            aceitar = new Thread(Aceitar) { IsBackground = true, Name = "MuanlartinsLink aceitar" };
            enviar = new Thread(Enviar) { IsBackground = true, Name = "MuanlartinsLink enviar" };
            aceitar.Start();
            enviar.Start();
        }

        public void Parar() {
            parar = true;
            try { ouvinte?.Stop(); } catch { }
            sinal.Set();
            lock (trava) {
                foreach (var c in clientes) try { c.Close(); } catch { }
                clientes.Clear();
            }
        }

        /// <summary>From the game thread: queues a message (JSON) for every client; never blocks.</summary>
        public void Mandar(string json, bool estado = false) {
            if (estado) ultimoEstado = json;
            if (fila.Count < MaxFila) fila.Enqueue(json);
            sinal.Set();
        }

        private void Aceitar() {
            bool avisou = false;
            while (!parar) {
                try {
                    ouvinte = new TcpListener(IPAddress.Loopback, Porta);
                    ouvinte.Start();
                    Logger.Info("MuanlartinsLink", $"ouvindo em http://127.0.0.1:{Porta}/eventos");
                    avisou = false;
                    while (!parar) {
                        var c = ouvinte.AcceptTcpClient();
                        new Thread(() => Atender(c)) { IsBackground = true, Name = "MuanlartinsLink pedido" }.Start();
                    }
                } catch (Exception e) {
                    if (parar) break;
                    if (!avisou) Logger.Warn("MuanlartinsLink", $"porta {Porta} indisponível ({e.Message}); tentando de novo a cada 5 s");
                    avisou = true;
                    try { ouvinte?.Stop(); } catch { }
                    for (int i = 0; i < 50 && !parar; i++) Thread.Sleep(100);
                }
            }
        }

        private void Atender(TcpClient cliente) {
            try {
                cliente.NoDelay = true;
                var stream = cliente.GetStream();
                stream.ReadTimeout = 3000;
                stream.WriteTimeout = 2000;
                var pedido = new StringBuilder();
                var b = new byte[1024];
                while (pedido.Length < 8192 && pedido.ToString().IndexOf("\r\n\r\n", StringComparison.Ordinal) < 0) {
                    int n = stream.Read(b, 0, b.Length);
                    if (n <= 0) break;
                    pedido.Append(Encoding.ASCII.GetString(b, 0, n));
                }
                string texto = pedido.ToString();
                string linha = texto.Split('\n')[0].Trim();
                string[] partes = linha.Split(' ');
                string metodo = partes.Length > 0 ? partes[0] : "";
                string caminho = partes.Length > 1 ? partes[1].Split('?')[0] : "/";
                if (metodo == "OPTIONS") {
                    Responder(stream, "204 No Content", null, null);
                } else if (metodo == "GET" && caminho == "/eventos") {
                    byte[] cabeca = Encoding.UTF8.GetBytes(
                        "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream; charset=utf-8\r\nCache-Control: no-store\r\n" + Cors +
                        "Connection: keep-alive\r\n\r\nretry: 2000\n\ndata: " + ultimoEstado + "\n\n");
                    lock (trava) {
                        stream.Write(cabeca, 0, cabeca.Length);
                        clientes.Add(stream);
                    }
                    return;
                } else if (metodo == "GET" && (caminho == "/estado" || caminho == "/")) {
                    Responder(stream, "200 OK", "application/json; charset=utf-8", ultimoEstado);
                } else {
                    Responder(stream, "404 Not Found", "text/plain; charset=utf-8", "/eventos ou /estado");
                }
                cliente.Close();
            } catch {
                try { cliente.Close(); } catch { }
            }
        }

        private static void Responder(NetworkStream stream, string status, string tipo, string corpo) {
            byte[] dados = corpo == null ? Array.Empty<byte>() : Encoding.UTF8.GetBytes(corpo);
            string cabeca = "HTTP/1.1 " + status + "\r\n" + Cors + "Access-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\n" +
                (tipo != null ? "Content-Type: " + tipo + "\r\n" : "") + "Content-Length: " + dados.Length + "\r\nConnection: close\r\n\r\n";
            byte[] c = Encoding.ASCII.GetBytes(cabeca);
            stream.Write(c, 0, c.Length);
            if (dados.Length > 0) stream.Write(dados, 0, dados.Length);
        }

        private void Enviar() {
            var lote = new StringBuilder();
            while (!parar) {
                bool chegou = sinal.WaitOne(15000);
                if (parar) break;
                lote.Clear();
                while (fila.TryDequeue(out string json)) lote.Append("data: ").Append(json).Append("\n\n");
                if (lote.Length == 0) {
                    if (chegou) continue;
                    lote.Append(": ainda aqui\n\n");
                }
                byte[] bytes = Encoding.UTF8.GetBytes(lote.ToString());
                lock (trava) {
                    for (int i = clientes.Count - 1; i >= 0; i--) {
                        try {
                            clientes[i].Write(bytes, 0, bytes.Length);
                        } catch {
                            try { clientes[i].Close(); } catch { }
                            clientes.RemoveAt(i);
                        }
                    }
                }
            }
        }
    }
}
