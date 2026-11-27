param([ValidateSet('Discord', 'DiscordPTB', 'DiscordCanary')][string]$Client)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$release = Invoke-RestMethod 'https://api.github.com/repos/maiki74/GoLiveBypass-Facil/releases/latest'
$assets = @($release.assets | Where-Object { $_.name -eq "GoLiveBypass-Facil-$($release.tag_name).zip" })
if ($assets.Count -ne 1 -or $assets[0].digest -notmatch '^sha256:[a-f0-9]{64}$') {
    throw 'O GitHub nao retornou o ZIP e seu SHA-256.'
}
$asset = $assets[0]

$tempRoot = (Get-Item -LiteralPath ([IO.Path]::GetTempPath())).FullName.TrimEnd('\')
$tempDir = Join-Path $tempRoot ('GoLiveBypass-' + [guid]::NewGuid())
$zip = Join-Path $tempDir $asset.name
$extracted = Join-Path $tempDir 'instalador'
New-Item -ItemType Directory -Path $tempDir | Out-Null
try {
    Write-Host "Baixando GoLiveBypass Facil $($release.tag_name)..."
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip -UseBasicParsing
    if ((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash -ne $asset.digest.Substring(7)) {
        throw 'O SHA-256 do download nao confere.'
    }
    Expand-Archive -LiteralPath $zip -DestinationPath $extracted
    $installer = Join-Path $extracted 'GoLiveBypass-Facil'
    if (-not (Test-Path -LiteralPath (Join-Path $installer 'Instalar.cmd'))) { $installer = $extracted }

    if ($Client) {
        $script = Join-Path $installer 'scripts\install.ps1'
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script -Clients $Client
    } else {
        & (Join-Path $installer 'Instalar.cmd')
    }
    if ($LASTEXITCODE -ne 0) { throw "O instalador falhou (codigo $LASTEXITCODE)." }
} finally {
    $created = Get-Item -LiteralPath $tempDir
    if ($created.FullName -eq $tempDir -and $created.Parent.FullName.TrimEnd('\') -eq $tempRoot -and !$created.LinkType) {
        Remove-Item -LiteralPath $created.FullName -Recurse -Force
    }
}
