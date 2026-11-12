param([switch]$SkipInject, [string]$Root = "$env:LOCALAPPDATA\GoLiveBypassEquicord")
# Instalador 1-clique: Equicord (fonte) + GoLiveBypass 2.0.16 com patch de VPN automatica.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Versoes fixas (testadas juntas).
$EquicordCommit = '577946253e6b62be0740b0ad86969ebc6ffbb2e4'
$PluginUrl  = 'https://github.com/bezumiya/GoLiveBypass/releases/download/v2.0.16/goLiveBypass-vencord.zip'
$PluginSha  = '2eb518180f8a7a5a94c36a33f43f22f3eb7c292bef58063bfb3a81c45b4ce23e'
$NodeUrl    = 'https://nodejs.org/dist/v24.22.1/node-v24.22.1-win-x64.zip'
$NodeSha    = 'd2046d28c2c3dcd211ac5145c0bf30e2047ef9dfb306693c8c6e2eccd8b95fa5'
$PnpmUrl    = 'https://github.com/pnpm/pnpm/releases/download/v12.18.0/pnpm-win32-x64.zip'
$PnpmSha    = 'dfe2123affd2ed4be280ba7ab4678c0fae130b4936fabefa9b1675b60514ef7c'
$GitUrl     = 'https://github.com/git-for-windows/git/releases/download/v2.56.1.windows.1/MinGit-2.56.1-64-bit.zip'
$GitSha     = '4a92850b6e917da4fd010669b614b55dccf5b0ec333a534cc4be4700dfefdafd'

$Here  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Tools = Join-Path $Root 'tools'
$Src   = Join-Path $Root 'Equicord'
New-Item -ItemType Directory -Force $Tools | Out-Null

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Run($exe) {
    & $exe @args
    if ($LASTEXITCODE -ne 0) { throw "Falhou: $exe $args (codigo $LASTEXITCODE)" }
}
function Get-Zip($url, $sha, $dest) {
    $zip = Join-Path $env:TEMP ([IO.Path]::GetRandomFileName() + '.zip')
    Invoke-WebRequest $url -OutFile $zip -UseBasicParsing
    $got = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
    if ($got -ne $sha) { Remove-Item $zip; throw "SHA-256 nao confere para $url" }
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    Expand-Archive $zip $dest
    Remove-Item $zip
}

Step 'Ferramentas (git, node, pnpm)'
$git = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $git) {
    $git = Join-Path $Tools 'git\cmd\git.exe'
    if (-not (Test-Path $git)) { Get-Zip $GitUrl $GitSha (Join-Path $Tools 'git') }
    $env:PATH = (Split-Path $git) + ";$env:PATH"
}
$node = Join-Path $Tools 'node\node-v24.22.1-win-x64\node.exe'
if (-not (Test-Path $node)) { Get-Zip $NodeUrl $NodeSha (Join-Path $Tools 'node') }
$pnpm = Join-Path $Tools 'pnpm\pnpm.exe'
if (-not (Test-Path $pnpm)) { Get-Zip $PnpmUrl $PnpmSha (Join-Path $Tools 'pnpm') }
# O build chama "node" e "git" pelo PATH.
$env:PATH = (Split-Path $node) + ';' + (Split-Path $pnpm) + ";$env:PATH"

Step 'Baixando Equicord'
if (-not (Test-Path (Join-Path $Src '.git'))) {
    New-Item -ItemType Directory -Force $Src | Out-Null
    Run $git -C $Src init -q
    Run $git -C $Src remote add origin https://github.com/Equicord/Equicord
}
Run $git -C $Src fetch -q --depth 1 origin $EquicordCommit
Run $git -C $Src checkout -q -f FETCH_HEAD

Step 'Baixando GoLiveBypass 2.0.16 e aplicando patch'
$tmp = Join-Path $env:TEMP ('glb-' + [IO.Path]::GetRandomFileName())
Get-Zip $PluginUrl $PluginSha $tmp
$plugDir = Join-Path $Src 'src\userplugins\goLiveBypass'
if (Test-Path $plugDir) { Remove-Item -Recurse -Force $plugDir }
New-Item -ItemType Directory -Force (Split-Path $plugDir) | Out-Null
Move-Item (Join-Path $tmp 'goLiveBypass') $plugDir
Remove-Item -Recurse -Force $tmp
Run $node (Join-Path $Here 'patch.mjs') plugin $plugDir

Step 'Compilando (pode levar alguns minutos)'
Push-Location $Src
try {
    Run $pnpm install --frozen-lockfile
    Run $pnpm build
} finally { Pop-Location }
$patcher = Join-Path $Src 'dist\desktop\patcher.js'
if (-not (Test-Path $patcher)) { throw 'Build nao gerou dist\desktop\patcher.js' }

if ($SkipInject) { Write-Host "`nBuild OK (sem injetar)." -ForegroundColor Green; return }

Step 'Fechando o Discord'
Get-Process Discord, DiscordPTB, DiscordCanary -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

Step 'Instalando no Discord'
$require = 'require("' + ($patcher -replace '\\', '/') + '");'
$found = @()
foreach ($c in 'Discord', 'DiscordPTB', 'DiscordCanary') {
    $base = Join-Path $env:LOCALAPPDATA $c
    $app = Get-ChildItem $base -Directory -Filter 'app-*' -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -Last 1
    if (-not $app) { continue }
    $res = Join-Path $app.FullName 'resources'
    $asar = Join-Path $res 'app.asar'
    $orig = Join-Path $res '_app.asar'
    if (Test-Path $asar -PathType Leaf) {
        # Discord sem mod: guarda o original como _app.asar (padrao do Vencord/Equicord).
        if (Test-Path $orig) { Remove-Item -Force $asar } else { Move-Item $asar $orig }
        New-Item -ItemType Directory $asar | Out-Null
        Set-Content (Join-Path $res 'golive-was-vanilla') 'x'
    }
    $idx = Join-Path $asar 'index.js'
    $bak = Join-Path $asar 'index.js.golive-backup'
    if ((Test-Path $idx) -and -not (Test-Path $bak)) { Copy-Item $idx $bak }
    [IO.File]::WriteAllText($idx, $require)
    [IO.File]::WriteAllText((Join-Path $asar 'package.json'), '{"name":"discord","main":"index.js"}')
    $found += $c
}
if (-not $found) { throw 'Nenhum Discord encontrado em %LOCALAPPDATA%. Instale o Discord primeiro.' }

Step 'Ativando o plugin nas configuracoes do Equicord'
Run $node (Join-Path $Here 'patch.mjs') settings (Join-Path $env:APPDATA 'Equicord\settings\settings.json')

Step 'Abrindo o Discord'
foreach ($c in $found) {
    Start-Process (Join-Path $env:LOCALAPPDATA "$c\Update.exe") -ArgumentList '--processStart', "$c.exe"
}
Write-Host "`nPronto! Instalado em: $($found -join ', ')" -ForegroundColor Green
Write-Host 'Na primeira vez, faca o login Proton no assistente que abre dentro do Discord.'
