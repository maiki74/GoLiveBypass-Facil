# GoLiveBypass Fácil

Instala o **Equicord + plugin GoLiveBypass 2.0.16** no Discord (Windows) com **um clique**, e desinstala com outro.

> [!IMPORTANT]
> ## ⚠️ O Windows vai pedir para executar o PowerShell como Administrador
> Quando o Discord abrir com o plugin, aparece a janela azul do Windows (**"Deseja permitir que este aplicativo faça alterações?"** → *Windows PowerShell*). **Clique em SIM.** Sem isso a VPN não liga e a live dos amigos fica carregando.
>
> **O que essa permissão faz** (é o próprio plugin GoLiveBypass pedindo, não um vírus):
> 1. **Só na primeira vez:** instala o **WireSock** (o programa de VPN WireGuard que o plugin usa, baixado do site oficial wiresock.net). Instalar programa e driver de rede no Windows sempre exige administrador.
> 2. **Quando liga a VPN:** cria/liga o serviço do Windows `wiresock-client-service` com o perfil do plugin. O túnel passa **só o tráfego do Discord** — navegador, jogos e o resto do PC continuam na sua internet normal. O serviço é de início **manual** (não sobe sozinho com o Windows).
> 3. **Raramente:** se a rede ficar com sobra de uma VPN antiga, limpa essas rotas e o cache de DNS para a internet voltar ao normal.
>
> **O que ela NÃO faz:** não mexe nos seus arquivos, não muda o antivírus/firewall e não fica rodando nada como admin depois.
>
> Quando aparece: na primeira vez e na **primeira abertura do Discord depois de ligar o PC**. Depois disso, fechar e abrir o Discord não pede de novo.
> Para tirar tudo (inclusive o WireSock): `Desinstalar.cmd`.

## Instalar
1. Em **[Releases](https://github.com/maiki74/GoLiveBypass-Facil/releases/latest)**, baixe o `GoLiveBypass-Facil-vX.zip` mais novo e extraia numa pasta nova.
2. Dê dois cliques em **`Instalar.cmd`** e escolha o seu Discord: **1** normal (Stable), **2** PTB, **3** Canary ou **4** todos. Espere (alguns minutos na primeira vez).
3. O Discord abre sozinho. No assistente do GoLiveBypass, faça o login da conta **ProtonVPN** (grátis serve).

Pronto. A VPN liga sozinha toda vez que o Discord abre — não precisa apertar "Ativar agora".

## Desinstalar
Dê dois cliques em **`Desinstalar.cmd`** e escolha de qual Discord remover. Ele:
- devolve o Discord como estava (sem mod, ou com o Equicord/Vencord que você já tinha);
- se nenhum outro Discord ainda usa o mod: desliga a VPN e remove o WireSock (pede permissão de administrador uma vez);
- apaga tudo do GoLiveBypass (inclusive o login Proton salvo).

## O Discord atualizou e o mod sumiu?
Rode o `Instalar.cmd` de novo (a segunda vez é bem mais rápida).

## O que muda em relação ao plugin original
Dois ajustes pequenos, aplicados por `scripts/patch.mjs` (marcados com `GLB-FACIL`):
1. **Liga a VPN sozinho ao abrir o Discord** (com uma trava de 3 min contra loop de reinício).
2. **Não desliga a VPN ao fechar o Discord** (Windows). Assim, ao abrir de novo, ele já usa a VPN sem reiniciar.
   Só na primeira abertura depois de ligar o PC o Discord reinicia uma vez sozinho.
   A VPN só afeta o Discord. Para desligar: painel do plugin → **Restaurar rede**, ou `Desinstalar.cmd`.

A atualização automática do plugin fica **desligada**, porque ela trocaria os arquivos e apagaria esses ajustes.

## Onde fica cada coisa
- Equicord + ferramentas (node, pnpm, git portátil): `%LOCALAPPDATA%\GoLiveBypassEquicord`
- Dados da VPN/login Proton: `%LOCALAPPDATA%\GoLiveBypass`

Tudo baixado é de fonte oficial e com versão fixa: Equicord (commit `5779462`), GoLiveBypass v2.0.16, Node 24.22.1, pnpm 12.18.0, MinGit 2.56.1. Os zips têm SHA-256 conferido.

## Créditos e licença
- [GoLiveBypass](https://github.com/bezumiya/GoLiveBypass) por bezumiya — GPL-3.0
- [Equicord](https://github.com/Equicord/Equicord) — GPL-3.0

Este repositório é só um instalador e também é GPL-3.0. Usar mods de cliente vai contra os Termos do Discord; use por sua conta.
