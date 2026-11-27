# GoLiveBypass Fácil

Instala o **Equicord + plugin GoLiveBypass 2.0.18** no Discord (Windows) com **um clique**, e desinstala com outro.

> [!IMPORTANT]
> ## ⚠️ Se o Windows pedir permissão para o PowerShell, clique em **Sim**
> É o plugin ligando a VPN. Ele instala o **WireSock** (só na 1ª vez) e liga o túnel **só do Discord**. Não mexe em mais nada.

## Instalar
1. Em **[Releases](https://github.com/maiki74/GoLiveBypass-Facil/releases/latest)**, baixe o `GoLiveBypass-Facil-vX.zip` mais novo e extraia numa pasta nova.
2. Dê dois cliques em **`Instalar.cmd`** e escolha o seu Discord: **1** normal (Stable), **2** PTB, **3** Canary ou **4** todos. Espere (alguns minutos na primeira vez).
3. O Discord abre sozinho. No assistente do GoLiveBypass, faça o login da conta **ProtonVPN** (grátis serve).

Pronto. A VPN liga sozinha toda vez que o Discord abre — não precisa apertar "Ativar agora".

## Instalar ou atualizar pelo PowerShell

Cole um dos comandos abaixo em uma janela normal do **PowerShell**. O comando baixa a versão mais recente do GitHub, confere o arquivo e inicia a instalação.

### Instalar pela primeira vez

O instalador abre o menu para escolher Discord normal, PTB, Canary ou todos. Faça login na ProtonVPN quando o assistente abrir.

```powershell
$glb = Join-Path $env:TEMP ('GoLiveBypass-' + [guid]::NewGuid() + '.ps1')
try { Invoke-WebRequest 'https://raw.githubusercontent.com/maiki74/GoLiveBypass-Facil/v1.0.6/scripts/baixar.ps1' -UseBasicParsing -OutFile $glb -ErrorAction Stop; powershell.exe -NoProfile -ExecutionPolicy Bypass -File $glb } finally { Remove-Item -LiteralPath $glb -ErrorAction SilentlyContinue }
```

### Atualizar ou reinstalar o plugin no Discord

Este comando atualiza o plugin no **Discord normal** e serve também para reaplicá-lo depois de uma atualização do Discord. O Discord fecha durante a instalação e abre de novo ao terminar. Para as outras edições, troque `-Client Discord` por `-Client DiscordPTB` ou `-Client DiscordCanary`.

```powershell
$glb = Join-Path $env:TEMP ('GoLiveBypass-' + [guid]::NewGuid() + '.ps1')
try { Invoke-WebRequest 'https://raw.githubusercontent.com/maiki74/GoLiveBypass-Facil/v1.0.6/scripts/baixar.ps1' -UseBasicParsing -OutFile $glb -ErrorAction Stop; powershell.exe -NoProfile -ExecutionPolicy Bypass -File $glb -Client Discord } finally { Remove-Item -LiteralPath $glb -ErrorAction SilentlyContinue }
```

## Desinstalar
Dê dois cliques em **`Desinstalar.cmd`** e escolha de qual Discord remover. Ele:
- devolve o Discord como estava (sem mod, ou com o Equicord/Vencord que você já tinha);
- se nenhum outro Discord ainda usa o mod: desliga a VPN e remove o WireSock (pede permissão de administrador uma vez);
- apaga tudo do GoLiveBypass (inclusive o login Proton salvo).

## O Discord atualizou e o mod sumiu?
Rode o comando de atualização acima ou abra o `Instalar.cmd` de novo.

## O que muda em relação ao plugin original
Dois ajustes pequenos, aplicados por `scripts/patch.mjs` (marcados com `GLB-FACIL`):
1. **Pede permissão do PowerShell a cada abertura do Discord** após configurar a conta Proton. Clique em **Sim** para iniciar ou reiniciar o túnel, inclusive se ele já estiver ligado. Para uma nova tentativa, saia do Discord pela bandeja do Windows e abra de novo.
2. **Reabre o Discord uma vez após ativar a VPN** para aplicar a rota. Essa reabertura automática usa o novo túnel e dispensa outra confirmação. A VPN só afeta o Discord. Para desligar, use **Restaurar rede** no painel do plugin ou rode `Desinstalar.cmd`.

A atualização automática do plugin fica **desligada**, porque ela trocaria os arquivos e apagaria esses ajustes.

## Onde fica cada coisa
- Equicord + ferramentas (node, pnpm, git portátil): `%LOCALAPPDATA%\GoLiveBypassEquicord`
- Dados da VPN/login Proton: `%LOCALAPPDATA%\GoLiveBypass`

Tudo baixado é de fonte oficial e com versão fixa: Equicord (commit `5779462`), GoLiveBypass v2.0.18, Node 24.22.1, pnpm 12.18.0, MinGit 2.56.1. Os zips têm SHA-256 conferido.

## Créditos e licença
- [GoLiveBypass](https://github.com/bezumiya/GoLiveBypass) por bezumiya — GPL-3.0
- [Equicord](https://github.com/Equicord/Equicord) — GPL-3.0

Este repositório é só um instalador e também é GPL-3.0. Usar mods de cliente vai contra os Termos do Discord; use por sua conta.
