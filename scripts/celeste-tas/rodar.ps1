# Runs one TAS in the isolated copy of Celeste and closes it (README.md). Never the Steam folder, never while OBS is open.
param([Parameter(Mandatory)][string]$Jogo, [Parameter(Mandatory)][string]$Tas, [Parameter(Mandatory)][string]$Saida)
$ErrorActionPreference = 'Stop'
$Jogo = (Resolve-Path $Jogo).Path
if ($Jogo -match 'steamapps') { throw 'This is Steam''s folder: use the copy.' }
if (-not (Test-Path (Join-Path $Jogo 'steam_appid.txt'))) { throw 'No steam_appid.txt in the copy: the game would relaunch through Steam.' }
if (-not (Test-Path (Join-Path $Jogo 'Mods\MuanlartinsDemo\MuanlartinsDemo.dll'))) { throw 'The guard mod is missing.' }
if (Get-Process obs64 -ErrorAction SilentlyContinue) { throw 'OBS is open: not now.' }
if (Get-Process Celeste -ErrorAction SilentlyContinue) { throw 'A Celeste is open: not now.' }
$exe = Join-Path $Jogo 'Celeste.exe'
$info = New-Object System.Diagnostics.ProcessStartInfo $exe
$info.UseShellExecute = $false
$info.WorkingDirectory = $Jogo
$info.Arguments = "--disable-splash --tas `"$Tas`""
$info.EnvironmentVariables['EVEREST_SAVEPATH'] = $Jogo
$info.EnvironmentVariables['DEMO_SAIDA'] = $Saida
$info.EnvironmentVariables['SteamAppId'] = '504230'
$inicio = Get-Date
$proc = [System.Diagnostics.Process]::Start($info)
$fim = $inicio.AddSeconds(150)
do {
    Start-Sleep -Milliseconds 250
    foreach ($p in @(Get-Process Celeste -ErrorAction SilentlyContinue)) {
        if ($p.Path -and $p.Path -ne $exe -and $p.StartTime -ge $inicio) {
            Stop-Process -Id $p.Id -Force
            throw "Steam relaunched the real game ($($p.Path)): killed it."
        }
    }
} until ($proc.HasExited -or (Get-Date) -gt $fim)
if (-not $proc.HasExited) { $proc.Kill(); throw 'Timed out: closed it.' }
# A closed game can stay in the process list for a moment; anything else that started meanwhile is closed.
$fim = (Get-Date).AddSeconds(15)
do {
    Start-Sleep -Milliseconds 500
    $abertos = @(Get-Process Celeste -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -ge $inicio })
} until ($abertos.Count -eq 0 -or (Get-Date) -gt $fim)
foreach ($p in $abertos) {
    Stop-Process -Id $p.Id -Force
    throw "A Celeste was left open (pid $($p.Id), launched $($proc.Id), $($p.Path)): killed it."
}
"exit {0} in {1:n1}s" -f $proc.ExitCode, ((Get-Date) - $inicio).TotalSeconds
