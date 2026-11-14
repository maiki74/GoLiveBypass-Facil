param([string]$Root = "$env:LOCALAPPDATA\GoLiveBypassEquicord",
      [string[]]$Clients = @('Discord', 'DiscordPTB', 'DiscordCanary'))
# Desinstalador 1-clique: devolve o Discord como estava, desliga a VPN e apaga tudo do GoLiveBypass.
$ErrorActionPreference = 'Stop'
function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }

Step 'Fechando o Discord'
Get-Process $Clients -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

Step 'Devolvendo o Discord ao original'
$found = @()
foreach ($c in $Clients) {
    $base = Join-Path $env:LOCALAPPDATA $c
    foreach ($app in Get-ChildItem $base -Directory -Filter 'app-*' -ErrorAction SilentlyContinue) {
        $res  = Join-Path $app.FullName 'resources'
        $asar = Join-Path $res 'app.asar'
        $idx  = Join-Path $asar 'index.js'
        $bak  = Join-Path $asar 'index.js.golive-backup'
        $flag = Join-Path $res 'golive-was-vanilla'
        if (-not (Test-Path $asar -PathType Container)) { continue }
        if (-not ((Test-Path $flag) -or (Test-Path $bak) -or ((Get-Content $idx -Raw -ErrorAction SilentlyContinue) -match 'GoLiveBypassEquicord'))) { continue }
        if ((Test-Path $bak) -and -not (Test-Path $flag)) {
            # Tinha outro mod (Equicord/Vencord do instalador): volta o index.js dele.
            Move-Item -Force $bak $idx
        } elseif (Test-Path (Join-Path $res '_app.asar')) {
            # Era Discord sem mod: volta o app.asar original.
            Remove-Item -Recurse -Force $asar
            Move-Item (Join-Path $res '_app.asar') $asar
            Remove-Item -Force $flag -ErrorAction SilentlyContinue
        }
        $found += $c
    }
}
$found = $found | Select-Object -Unique

# Outra versao do Discord ainda usa o mod? Entao a VPN e os arquivos ficam.
$rootFwd = $Root -replace '\\', '/'
$still = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Discord*\app-*\resources\app.asar\index.js') -ErrorAction SilentlyContinue |
    Where-Object { (Get-Content $_.FullName -Raw) -like "*$rootFwd*" }
if ($still) {
    Write-Host "`nOutra versao do Discord ainda usa o GoLiveBypass; mantendo VPN e arquivos." -ForegroundColor Yellow
} else {

Step 'Desligando a VPN do plugin e removendo o WireSock (pede permissao de administrador)'
$svc = (sc.exe qc wiresock-client-service 2>$null) -join "`n"
if ($svc -match 'GoLiveBypass') {
    $admin = @'
sc.exe stop wiresock-client-service | Out-Null
$roots = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
Get-ItemProperty $roots -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match '(?i)wire\s?sock' } | ForEach-Object {
    $cmd = if ($_.QuietUninstallString) { $_.QuietUninstallString } else { $_.UninstallString }
    if ($cmd -match '(?i)msiexec') { $cmd = ($cmd -replace '(?i)/I', '/X') + ' /quiet /norestart' }
    elseif (-not $_.QuietUninstallString) { $cmd = "$cmd /uninstall /quiet /norestart" }
    Start-Process cmd.exe -ArgumentList '/c', $cmd -Wait -WindowStyle Hidden
}
'@
    try {
        Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($admin))
    } catch { Write-Host 'Permissao negada: a VPN/WireSock nao foi removida.' -ForegroundColor Yellow }
} else { Write-Host 'VPN do plugin nao encontrada (ok).' }

Step 'Apagando arquivos'
foreach ($p in $Root, (Join-Path $env:LOCALAPPDATA 'GoLiveBypass')) {
    if (Test-Path $p) { Remove-Item -Recurse -Force $p }
}
$settings = Join-Path $env:APPDATA 'Equicord\settings\settings.json'
# As configuracoes do Equicord ficam como estao (o plugin some sozinho sem o build); so tira o backup.
Remove-Item -Force "$settings.golive-backup" -ErrorAction SilentlyContinue
}

Step 'Abrindo o Discord'
foreach ($c in $found) {
    Start-Process (Join-Path $env:LOCALAPPDATA "$c\Update.exe") -ArgumentList '--processStart', "$c.exe"
}
Write-Host "`nDesinstalado." -ForegroundColor Green
