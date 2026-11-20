# Rocket League's Stats API on its TCP port (127.0.0.1:49123, Windows' own loopback, which WSL can't reach) relayed
# to stdout as it comes, for scripts/rocket_league.py: the game streams its JSON messages one after another, with
# nothing between them, and the script splits them. The Partidas dock uses the game's other port, the WebSocket
# (WebPort, 49124), so the two never take each other's place. "#aberto" and "#fechado" (each on a line of its own)
# say when the game's socket opens and closes; while the game is shut it tries again every 3 s, quietly.
$out = [Console]::OpenStandardOutput()
function Say([string]$text) {
  $bytes = [Text.Encoding]::ASCII.GetBytes("`n$text`n")
  $out.Write($bytes, 0, $bytes.Length)
  $out.Flush()
}
while ($true) {
  $client = New-Object System.Net.Sockets.TcpClient
  $open = $false
  try {
    $client.Connect('127.0.0.1', 49123)
    $open = $true
    Say '#aberto'
    $stream = $client.GetStream()
    $buffer = New-Object byte[] 65536
    while (($n = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
      $out.Write($buffer, 0, $n)
      $out.Flush()
    }
  } catch {
  } finally {
    $client.Close()
  }
  if ($open) { Say '#fechado' }
  Start-Sleep -Seconds 3
}
